"""Title: Turning one whisper read into text a person can use

Purpose: The speech engine reads a stretch of recorded audio and prints text. This file runs
that read when the engine has to be started as a program (`_run_whisper_transcribe`), cleans up
what whisper-cli printed (`_parse_whisper_stdout`), and throws out reads that are just noise or
a stray "um" (`_whisper_decode_usable`).

Used for: voice_transcription_service.VoiceTranscriptionSession, on every live read while someone
is speaking and on the one final read of the whole recording when they stop.

Solves: Whisper's small models hallucinate short filler words ("you", "yes", "test") on quiet or
noisy audio; `_whisper_decode_usable()` holds those back unless the speech was actually loud
enough to be real. (Until plan 88 this file also stitched many short overlapping reads together
by matching the words they shared. Reads now replace each other whole and the final read covers
the whole recording, so none of that matching is needed.)

Does not: Record any audio, or decide when a recording starts or stops -- see
voice_audio_capture_service.py and voice_transcription_service.VoiceTranscriptionSession for that.
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


def _join_transcript_parts(left: str, right: str) -> str:
    left = (left or "").strip()
    right = (right or "").strip()
    if not left:
        return right
    if not right:
        return left
    return f"{left} {right}"
