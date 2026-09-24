"""Title: Turning one whisper decode pass into growing, readable text

Purpose: Every 0.4 seconds while you are speaking, whisper decodes the last
few seconds of audio on its own, with no memory of the passes before it.
This file runs that one decode (`_run_whisper_transcribe`), cleans up what
whisper-cli printed (`_parse_whisper_stdout`), throws out passes that are
just noise or a stray "um" (`_whisper_decode_usable`), and stitches each new
pass onto what came before without repeating or dropping words
(`merge_sliding_window_transcript`).

Used for: voice_transcription_service.VoiceTranscriptionSession's transcribe
loop, on every decode pass and on the final flush when a recording stops.

Solves: Whisper only ever sees the newest slice of audio, not your whole
sentence, so a straightforward "decode and show" approach would repeat or
drop words at the seams between one pass and the next.
`merge_sliding_window_transcript()` finds the words two overlapping slices
share in common and commits only the new ones. Whisper's small models also
hallucinate short filler words ("you", "yes", "test") on quiet or noisy
audio; `_whisper_decode_usable()` and `_is_isolated_filler_partial()` hold
those back unless the audio was actually loud enough to be real speech.

Does not: Record any audio, or decide when a recording starts or stops --
see voice_audio_capture_service.py and
voice_transcription_service.VoiceTranscriptionSession for that.
"""

from __future__ import annotations

import re
import subprocess
import tempfile

from backend.services.voice_whisper_runtime import (
    WHISPER_THREADS,
    _pcm_to_wav_bytes,
    _sanitize_whisper_transcript,
)

# Keep high bar for whisper filler hallucinations on noise (was SILENCE_RMS_THRESHOLD * 2.5).
FILLER_MIN_RMS = 875.0
# Whisper tiny/base often hallucinate these on quiet/noise windows.
WHISPER_FILLER_WORDS = frozenset(
    {"you", "yes", "no", "ok", "okay", "uh", "um", "hmm", "yeah", "oh", "test"}
)
# Bracket tags whisper.cpp may emit on noise/uncertainty (not user speech).
WHISPER_NON_SPEECH_TAGS = frozenset(
    {"BLANK_AUDIO", "INAUDIBLE", "MUSIC", "APPLAUSE", "SILENCE", "NOISE"}
)
WHISPER_CLI_INFERENCE_ARGS = ("-ng", "-nfa")


def _is_whisper_non_speech_tag(text: str) -> bool:
    inner = (text or "").strip().strip("[]").upper()
    if not inner:
        return True
    if inner in WHISPER_NON_SPEECH_TAGS:
        return True
    return inner.startswith("BLANK")


def _normalize_whisper_word(word: str) -> str:
    return (word or "").strip().lower().strip(".,!?;:\"'()[]")


def _is_whisper_filler_only(text: str) -> bool:
    words = [_normalize_whisper_word(w) for w in (text or "").split() if w.strip()]
    if not words or len(words) > 2:
        return False
    return all(w in WHISPER_FILLER_WORDS for w in words)


def _whisper_decode_usable(text: str, window_rms: float) -> bool:
    if not (text or "").strip():
        return False
    if _is_whisper_filler_only(text):
        return window_rms >= FILLER_MIN_RMS
    return True


def _is_isolated_filler_partial(text: str) -> bool:
    words = [_normalize_whisper_word(w) for w in (text or "").split() if w.strip()]
    return len(words) == 1 and words[0] in WHISPER_FILLER_WORDS


def _is_stale_word_fragment(fragment: str, continuation: str) -> bool:
    """True when a lone prior token is a whisper prefix of the next decode (Test → Testing)."""
    frag_words = _word_list(fragment)
    cont_words = _word_list(continuation)
    if len(frag_words) != 1 or not cont_words:
        return False
    frag_norm = _normalize_merge_word(frag_words[0])
    first_norm = _normalize_merge_word(cont_words[0])
    if not frag_norm or not first_norm or len(frag_norm) < 3:
        return False
    return first_norm.startswith(frag_norm) and len(first_norm) > len(frag_norm)


_WHISPER_TS_LINE = re.compile(
    r"^\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*-->\s*\d{2}:\d{2}:\d{2}(?:\.\d+)?\]\s*(.*)$",
    re.IGNORECASE,
)


def _parse_whisper_stdout(stdout: str) -> str:
    """Extract spoken text from whisper-cli stdout (with or without -nt)."""
    if not stdout:
        return ""
    parts: list[str] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line or line.lower().startswith("whisper"):
            continue
        match = _WHISPER_TS_LINE.match(line)
        if match:
            text = (match.group(1) or "").strip()
        elif line.startswith("[") and "]" in line:
            text = line.split("]", 1)[1].strip()
        else:
            text = line
        if not text or _is_whisper_non_speech_tag(text) or text.startswith("[BLANK"):
            continue
        parts.append(text)
    return _sanitize_whisper_transcript(" ".join(parts).strip())


def _run_whisper_transcribe(
    whisper_bin: str,
    model_path: str,
    pcm: bytes,
    env: dict[str, str],
) -> str:
    if not pcm:
        return ""
    wav_bytes = _pcm_to_wav_bytes(pcm)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        tmp.write(wav_bytes)
        tmp.flush()
        proc = subprocess.run(
            [
                whisper_bin,
                "-m",
                model_path,
                "-f",
                tmp.name,
                "-l",
                "en",
                "-t",
                str(WHISPER_THREADS),
                "-nt",
                *WHISPER_CLI_INFERENCE_ARGS,
            ],
            capture_output=True,
            text=True,
            timeout=45,
            env=env,
        )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(err or f"whisper-cli exited {proc.returncode}")
    text = (proc.stdout or "").strip()
    return _parse_whisper_stdout(text)


def _normalize_merge_word(word: str) -> str:
    return re.sub(r"[^a-z0-9']+", "", (word or "").lower())


def _word_list(text: str) -> list[str]:
    return [w for w in (text or "").split() if w.strip()]


def _suffix_prefix_word_overlap(left_text: str, right_text: str) -> int:
    left = [_normalize_merge_word(w) for w in _word_list(left_text)]
    right = [_normalize_merge_word(w) for w in _word_list(right_text)]
    if not left or not right:
        return 0
    for size in range(min(len(left), len(right)), 0, -1):
        if left[-size:] == right[:size]:
            return size
    return 0


def _join_transcript_parts(left: str, right: str) -> str:
    left = (left or "").strip()
    right = (right or "").strip()
    if not left:
        return right
    if not right:
        return left
    return f"{left} {right}"


def merge_sliding_window_transcript(
    finalized: str,
    previous_partial: str,
    window_text: str,
) -> tuple[str, str]:
    """Accumulate rolling-window whisper decodes without dropping earlier words.

    Each pass transcribes only the latest audio window, so ``window_text`` often
    overlaps the tail of ``previous_partial``. Commit non-overlapping words to
    ``finalized`` and keep the live tail in ``partial``.
    """
    finalized = (finalized or "").strip()
    previous_partial = (previous_partial or "").strip()
    window_text = (window_text or "").strip()

    if not window_text:
        return finalized, previous_partial
    if not previous_partial:
        if not finalized:
            return finalized, window_text
        if _is_stale_word_fragment(finalized, window_text):
            return "", window_text
        overlap = _suffix_prefix_word_overlap(finalized, window_text)
        if overlap > 0:
            win_words = _word_list(window_text)
            remainder = " ".join(win_words[overlap:])
            return finalized, remainder
        return finalized, window_text

    if window_text.startswith(previous_partial):
        return finalized, window_text
    if previous_partial.startswith(window_text):
        return finalized, previous_partial

    prev_words = _word_list(previous_partial)
    new_words = _word_list(window_text)
    prev_norm = [_normalize_merge_word(w) for w in prev_words]
    new_norm = [_normalize_merge_word(w) for w in new_words]
    best_overlap = 0
    for size in range(min(len(prev_norm), len(new_norm)), 0, -1):
        if prev_norm[-size:] == new_norm[:size]:
            best_overlap = size
            break

    if best_overlap > 0:
        commit_words = prev_words[:-best_overlap] if best_overlap < len(prev_words) else []
        if commit_words:
            finalized = _join_transcript_parts(finalized, " ".join(commit_words))
        return finalized, window_text

    if _is_isolated_filler_partial(previous_partial) and not window_text.lower().startswith(
        previous_partial.lower()
    ):
        return finalized, window_text

    if _is_stale_word_fragment(previous_partial, window_text):
        return finalized, window_text

    finalized = _join_transcript_parts(finalized, previous_partial)
    return finalized, window_text
