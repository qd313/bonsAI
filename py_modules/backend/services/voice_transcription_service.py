"""Title: Turning your spoken question into text, live

Purpose: This is what happens between pressing the mic button and seeing
your words appear as you talk: it records your microphone, feeds short
slices of that recording to a local speech-to-text engine (whisper.cpp)
again and again as you keep talking, and stitches those overlapping slices
into one growing line of text. It is also what installs that engine in the
first place -- SteamOS ships without it, so this file builds it from source
inside a container the first time voice input is turned on, and downloads
the speech model that engine reads from.

Used for: The mic button on the Ask bar. main.py creates one
VoiceTranscriptionSession per recording and polls `status()` a few times a
second while you are talking; the Settings screen's "Install voice engine"
button drives `download_voice_model()` and `install_whisper_cli()`.

Solves: Whisper only ever sees a few seconds of audio at a time, not your
whole sentence, so a straightforward "decode and show" approach would repeat
or drop words at the seams between one pass and the next. This file also
copes with a Deck whose CPU does not support every instruction the built
whisper binary assumes, and with a background plugin process that cannot
simply "open the microphone" the way a normal desktop app can.

Does not: Talk to a cloud speech service, or listen for a wake word -- both
are out of scope today. When the always-on background engine from
voice_whisper_daemon is available, this file prefers it over spawning its
own whisper-cli process for every decode pass; see that file for how that
shared engine is started and stopped.

Split (2026-09-24): finding and opening the microphone moved to
voice_audio_capture_service.py, and downloading the speech model moved to
voice_model_download_service.py. Every name either took is still imported
back in here, so nothing outside this file had to change.

How it works:

How a few seconds of audio become one growing line of text:

    mic --(pw-record / parecord / arecord)--> rolling buffer, last 30s
                                                        |
                               every 0.4s: grab the newest 3s of it
                                                        |
                                                        v
                                 whisper decodes that slice alone
                                                        |
                        merge_sliding_window_transcript() stitches it onto
                        what came before, using the words the two slices
                        share in common so nothing doubles up or vanishes
                                                        |
                          2 seconds of silence? ---- no --> screen shows the
                                  |                          growing partial
                                 yes                              line
                                  |
                                  v
                    partial line is folded into the finalized transcript,
                    the partial clears, and listening continues

    stop(), or silence past the limit -----> `_flush_final()` decodes
    whatever audio is left over and appends it, so the last word spoken is
    never lost to a boundary that happened to fall between two decode passes

Installing the engine, the first time voice input is turned on:
 1. `download_voice_model()` fetches the chosen speech model file
    (VOICE_STT_MODEL_SPECS lists the choices) with a resumable download.
 2. `install_whisper_cli()` builds the actual whisper.cpp program from
    source inside a podman container, since SteamOS does not ship it and its
    read-only system cannot simply have a package installed onto it, then
    copies the finished binaries out to the plugin's own folder
    (`_finalize_voice_bin()`).
 3. `engine_readiness()` reports whether both pieces are in place before a
    recording is allowed to start, backed by
    `_voice_binary_ready_for_inference()`, which checks a real, short test
    decode (`_whisper_inference_ok()`) the first time that binary is used --
    catching a build that crashes on this particular Deck's CPU before it
    can crash mid-recording.

Gotchas:
 - The built whisper binary is compiled for a specific set of CPU
   instructions. `_whisper_inference_ok()` runs one real decode on a silent
   test file before the binary is ever trusted, and
   `_voice_bin_mark_cpu_safe()` remembers a pass so that check is not
   repeated on every single recording.
 - `status()` carries a comment recording a real bug: a past edit left its
   body unreachable behind another method's return, and every voice request
   failed with a missing-attribute error until it was restored. Worth
   reading if this method is ever touched again.
 - This runs as a background plugin process, not inside the normal desktop
   session, so it cannot simply assume where the microphone's audio socket
   lives -- `env_for_audio_capture()` and `_discover_session_runtime_dir()`
   go find it.
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import struct
import subprocess
import tempfile
import threading
import time
import wave
from collections import deque
from typing import Any, Callable, Optional

from backend.services.local_ollama_setup_service import _env_for_host_system_tools
from backend.services.voice_model_download_service import (
    DEFAULT_VOICE_STT_MODEL,
    VALID_VOICE_STT_MODELS,
    VOICE_STT_MODEL_SPECS,
    _append_log_tail,
    _download_model_file,
    download_voice_model,
    new_voice_install_state,
    sanitize_voice_stt_model,
    voice_model_path,
    voice_models_dir,
)
from backend.services.voice_audio_capture_service import (
    _discover_session_runtime_dir,
    _parse_proc_environ,
    _pcm_rms,
    _resolve_capture_command,
    _resolve_pipewire_mic_target,
    _runtime_dir_usable,
    env_for_audio_capture,
)
from backend.services.voice_whisper_runtime import (
    CHANNELS,
    SAMPLE_RATE,
    SAMPLE_WIDTH,
    WHISPER_THREADS,
    _pcm_to_wav_bytes,
    _sanitize_whisper_transcript,
    voice_bin_dir,
    voice_whisper_cli_path,
    voice_whisper_runtime_env,
    voice_whisper_server_path,
    whisper_binary_usable,
    whisper_server_binary_usable,
)
from backend.services.voice_whisper_daemon import get_whisper_engine

BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH
ROLLING_BUFFER_MAX_SECONDS = 30
# Tier 1 latency tuning (2026-07-07): see docs/voice-input-follow-up.md for tradeoffs and Tier 2 options.
TRANSCRIBE_INTERVAL_S = 0.4
WINDOW_SECONDS = 3
WHISPER_MIN_DECODE_PCM_BYTES = BYTES_PER_SECOND // 4  # 0.25 s before first decode pass
# Deck internal mic in Gaming Mode often peaks ~150–250 RMS; 350 blocked all whisper passes.
VOICE_RMS_THRESHOLD = 120.0
# Keep high bar for whisper filler hallucinations on noise (was SILENCE_RMS_THRESHOLD * 2.5).
FILLER_MIN_RMS = 875.0
SILENCE_HOLD_SECONDS = 2.0
# Whisper tiny/base often hallucinate these on quiet/noise windows.
WHISPER_FILLER_WORDS = frozenset(
    {"you", "yes", "no", "ok", "okay", "uh", "um", "hmm", "yeah", "oh", "test"}
)
# Bracket tags whisper.cpp may emit on noise/uncertainty (not user speech).
WHISPER_NON_SPEECH_TAGS = frozenset(
    {"BLANK_AUDIO", "INAUDIBLE", "MUSIC", "APPLAUSE", "SILENCE", "NOISE"}
)


def _is_whisper_non_speech_tag(text: str) -> bool:
    inner = (text or "").strip().strip("[]").upper()
    if not inner:
        return True
    if inner in WHISPER_NON_SPEECH_TAGS:
        return True
    return inner.startswith("BLANK")


# Do not float on :main — upstream image churn caused SIGILL on Deck when copying prebuilt binaries.
# Bump digest only after podman pull + CPU-safe compile + inference smoke on hardware. See docs/voice-input-follow-up.md.
WHISPER_CPP_IMAGE = (
    "ghcr.io/ggml-org/whisper.cpp"
    "@sha256:c0b535add76d7ff7613c70f32a7a4c794985f94238501e1b5b3b7f0eb56e9685"
)


def new_voice_transcription_state() -> dict[str, Any]:
    return {
        "status": "idle",
        "recording": False,
        "streaming": False,
        "partial_transcript": "",
        "finalized_transcript": "",
        "model_id": DEFAULT_VOICE_STT_MODEL,
        "model_ready": False,
        "binary_ready": False,
        "capture_backend": "",
        "error": None,
        "started_at": None,
        "stopped_at": None,
    }


def _link_versioned_sonames(bin_dir: str) -> None:
    """Create libfoo.so.N symlinks when podman cp resolved versioned sonames (e.g. .so.1.8.6)."""
    for name in os.listdir(bin_dir):
        if ".so." not in name:
            continue
        full = os.path.join(bin_dir, name)
        if not os.path.isfile(full):
            continue
        base, rest = name.split(".so.", 1)
        major = rest.split(".", 1)[0]
        link_name = f"{base}.so.{major}"
        link_path = os.path.join(bin_dir, link_name)
        if not os.path.exists(link_path):
            os.symlink(name, link_path)


WHISPER_CLI_INFERENCE_ARGS = ("-ng", "-nfa")
VOICE_BIN_CPU_SAFE_MARKER = ".bonsai_cpu_safe"


def _write_silence_wav(path: str, seconds: float = 0.5) -> None:
    frames = int(SAMPLE_RATE * seconds)
    pcm = struct.pack(f"<{frames}h", *([0] * frames))
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)


def _whisper_inference_ok(whisper_bin: str, env: dict[str, str], model_path: str) -> bool:
    """True when whisper-cli can finish one decode pass (catches SIGILL / broken ggml builds)."""
    if not whisper_bin or not os.path.isfile(model_path):
        return False
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name
        try:
            _write_silence_wav(wav_path)
            proc = subprocess.run(
                [
                    whisper_bin,
                    "-m",
                    model_path,
                    "-f",
                    wav_path,
                    "-l",
                    "en",
                    "-t",
                    str(WHISPER_THREADS),
                    "-nt",
                    *WHISPER_CLI_INFERENCE_ARGS,
                ],
                capture_output=True,
                text=True,
                timeout=60,
                env=env,
            )
            return proc.returncode == 0
        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass
    except Exception:
        return False


def _voice_bin_cpu_safe_marker(bin_dir: str) -> str:
    return os.path.join(bin_dir, VOICE_BIN_CPU_SAFE_MARKER)


def _voice_bin_mark_cpu_safe(bin_dir: str) -> None:
    try:
        with open(_voice_bin_cpu_safe_marker(bin_dir), "w", encoding="utf-8") as f:
            f.write("1\n")
    except OSError:
        pass


def _voice_bin_is_cpu_safe(plugin_root: str, settings_dir: str) -> bool:
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    return os.path.isfile(_voice_bin_cpu_safe_marker(bin_dir))


def _voice_binary_ready_for_inference(
    plugin_root: str,
    settings_dir: str,
    model_path: str = "",
) -> Optional[str]:
    path = whisper_binary_usable(plugin_root, settings_dir)
    if not path:
        return None
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    if model_path and os.path.isfile(model_path):
        if _voice_bin_is_cpu_safe(plugin_root, settings_dir):
            return path
        env = voice_whisper_runtime_env(plugin_root, settings_dir)
        if not _whisper_inference_ok(path, env, model_path):
            return None
        _voice_bin_mark_cpu_safe(bin_dir)
        return path
    if _voice_bin_is_cpu_safe(plugin_root, settings_dir):
        return path
    return None


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


def _voice_bin_keep_names() -> frozenset[str]:
    return frozenset(
        {
            "whisper-cli",
            "whisper-server",
            VOICE_BIN_CPU_SAFE_MARKER,
            "whisper-server.pid",
        }
    )


def _prune_voice_bin_non_libs(bin_dir: str, keep_paths: Optional[set[str]] = None) -> None:
    """Drop non-.so artifacts after bulk podman cp from image build dirs."""
    keep = set(keep_paths or ())
    keep_names = _voice_bin_keep_names()
    for name in os.listdir(bin_dir):
        path = os.path.join(bin_dir, name)
        if path in keep or name in keep_names or ".so" in name:
            continue
        try:
            if os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass


_WHISPER_CONTAINER_CMAKE = r"""
cmake -S /app -B /tmp/bonsai-whisper-build -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=OFF \
  -DGGML_AVX512=OFF -DGGML_AVX512_VBMI=OFF -DGGML_AVX512_VNNI=OFF -DGGML_AVX512_BF16=OFF \
  -DGGML_AVX2=ON -DGGML_AVX=ON -DGGML_FMA=ON -DGGML_F16C=ON \
  -DWHISPER_BUILD_TESTS=OFF -DBUILD_SHARED_LIBS=ON
"""


def _run_whisper_container_build(
    podman: str,
    env: dict[str, str],
    bin_dir: str,
    build_script: str,
) -> None:
    run = subprocess.run(
        [
            podman,
            "run",
            "--rm",
            "--entrypoint",
            "bash",
            "-v",
            f"{bin_dir}:/out:Z",
            WHISPER_CPP_IMAGE,
            "-lc",
            build_script,
        ],
        capture_output=True,
        text=True,
        timeout=1800,
        env=env,
    )
    if run.returncode != 0:
        err = (run.stderr or run.stdout or "podman whisper build failed")[:500]
        raise RuntimeError(err)


def _finalize_voice_bin(plugin_root: str, settings_dir: str) -> None:
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    cli_path = voice_whisper_cli_path(plugin_root, settings_dir)
    server_path = voice_whisper_server_path(plugin_root, settings_dir)
    _link_versioned_sonames(bin_dir)
    _prune_voice_bin_non_libs(bin_dir, {cli_path, server_path})
    for name in os.listdir(bin_dir):
        path = os.path.join(bin_dir, name)
        if os.path.isfile(path):
            os.chmod(path, 0o755)


def _build_whisper_cli_in_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
) -> str:
    """Compile whisper-cli + whisper-server inside the podman image (AVX2-only ggml)."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)
    server_dest = voice_whisper_server_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)

    build_script = (
        r"""
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq g++ make
"""
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-cli whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-cli /out/
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
cp -a /tmp/bonsai-whisper-build/bin/lib*.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/src/libwhisper.so* /out/ 2>/dev/null || true
cp -a /tmp/bonsai-whisper-build/ggml/src/libggml*.so* /out/ 2>/dev/null || true
"""
    )

    _run_whisper_container_build(podman, env, bin_dir, build_script)

    if not os.path.isfile(dest):
        raise RuntimeError("whisper-cli build finished but binary is missing from voice_bin.")
    if not os.path.isfile(server_dest):
        raise RuntimeError("whisper-server build finished but binary is missing from voice_bin.")

    _finalize_voice_bin(plugin_root, settings_dir)

    if not whisper_binary_usable(plugin_root, settings_dir):
        raise RuntimeError(
            "whisper-cli was built but failed to run (missing libraries). "
            "Try Install voice engine again."
        )
    _voice_bin_mark_cpu_safe(bin_dir)
    return dest


def _build_whisper_server_in_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
) -> str:
    """Compile whisper-server only when whisper-cli is already CPU-safe in voice_bin."""
    server_dest = voice_whisper_server_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)

    build_script = (
        r"""
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq g++ make
"""
        + _WHISPER_CONTAINER_CMAKE
        + r"""
cmake --build /tmp/bonsai-whisper-build --target whisper-server -j4
cp /tmp/bonsai-whisper-build/bin/whisper-server /out/
"""
    )

    _run_whisper_container_build(podman, env, bin_dir, build_script)

    if not os.path.isfile(server_dest):
        raise RuntimeError("whisper-server build finished but binary is missing from voice_bin.")

    _finalize_voice_bin(plugin_root, settings_dir)
    return server_dest


def install_whisper_cli(
    plugin_root: str,
    settings_dir: str,
    state: dict[str, Any],
    cancel_event: threading.Event,
    on_stage: Optional[Callable[[str, dict[str, Any]], None]] = None,
) -> None:
    """Install whisper-cli into plugin data via podman (SteamOS) or skip if already present."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)

    def stage(name: str, **fields: Any) -> None:
        state["stage"] = name
        if on_stage:
            on_stage(name, fields)

    cli_ready = whisper_binary_usable(plugin_root, settings_dir)
    model_path = voice_model_path(plugin_root, settings_dir, DEFAULT_VOICE_STT_MODEL)
    ready_path = _voice_binary_ready_for_inference(plugin_root, settings_dir, model_path) if cli_ready else None
    server_ready = whisper_server_binary_usable(plugin_root, settings_dir) if cli_ready else None
    if ready_path and server_ready:
        stage("binary_ready", path=ready_path)
        return

    podman = shutil.which("podman")
    if not podman:
        raise RuntimeError(
            "whisper-cli is not installed and podman was not found. "
            "Use Settings → Voice input → Install voice engine, or place bin/whisper-cli in the plugin."
        )

    env = _env_for_host_system_tools()
    stage("binary_pull_start", image=WHISPER_CPP_IMAGE)
    pull = subprocess.run(
        [podman, "pull", WHISPER_CPP_IMAGE],
        capture_output=True,
        text=True,
        timeout=900,
        env=env,
    )
    if pull.returncode != 0:
        raise RuntimeError((pull.stderr or pull.stdout or "podman pull failed")[:500])
    if cancel_event.is_set():
        raise RuntimeError("Binary install cancelled.")

    if ready_path and not server_ready:
        stage("binary_build_start", target="whisper-server")
        _build_whisper_server_in_container(podman, env, plugin_root, settings_dir)
        stage("binary_ready", path=ready_path)
        return

    ready_path = _voice_binary_ready_for_inference(plugin_root, settings_dir, model_path)
    if ready_path and whisper_server_binary_usable(plugin_root, settings_dir):
        stage("binary_ready", path=ready_path)
        return

    stage("binary_build_start")
    dest = _build_whisper_cli_in_container(podman, env, plugin_root, settings_dir)

    model_path = voice_model_path(plugin_root, settings_dir, DEFAULT_VOICE_STT_MODEL)
    if os.path.isfile(model_path):
        env_rt = voice_whisper_runtime_env(plugin_root, settings_dir)
        if not _whisper_inference_ok(dest, env_rt, model_path):
            raise RuntimeError(
                "whisper-cli was built but failed an inference smoke test on this CPU. "
                "Try Install voice engine again after a plugin restart."
            )
        _voice_bin_mark_cpu_safe(voice_bin_dir(plugin_root, settings_dir))

    stage("binary_ready", path=dest)


def engine_readiness(plugin_root: str, settings_dir: str, model_id: str) -> dict[str, Any]:
    model_id = sanitize_voice_stt_model(model_id)
    model_path = voice_model_path(plugin_root, settings_dir, model_id)
    model_ready = os.path.isfile(model_path) and os.path.getsize(model_path) > 1024
    whisper_bin = _voice_binary_ready_for_inference(
        plugin_root,
        settings_dir,
        model_path if model_ready else "",
    )
    return {
        "model_id": model_id,
        "binary_ready": whisper_bin is not None,
        "binary_path": whisper_bin or "",
        "model_ready": model_ready,
        "model_path": model_path if model_ready else "",
        "ready": whisper_bin is not None and model_ready,
    }


class VoiceTranscriptionSession:
    """Background capture + rolling whisper decode; thread-safe status reads."""

    def __init__(
        self,
        plugin_root: str,
        settings_dir: str,
        model_id: str,
        logger: Any,
    ) -> None:
        self.plugin_root = plugin_root
        self.settings_dir = settings_dir
        self.model_id = sanitize_voice_stt_model(model_id)
        self.logger = logger
        self._lock = threading.Lock()
        self._state = new_voice_transcription_state()
        self._state["model_id"] = self.model_id
        self._stop_event = threading.Event()
        self._capture_proc: Optional[subprocess.Popen] = None
        self._reader_thread: Optional[threading.Thread] = None
        self._worker_thread: Optional[threading.Thread] = None
        self._pcm_buffer: deque[bytes] = deque()
        self._buffer_bytes = 0
        self._max_buffer_bytes = ROLLING_BUFFER_MAX_SECONDS * BYTES_PER_SECOND
        self._last_voice_monotonic = time.monotonic()
        self._last_partial = ""
        self._finalized = ""
        self._capture_backend = ""
        self._use_daemon = False

    def _transcribe_pcm(
        self,
        whisper_bin: str,
        model_path: str,
        env: dict[str, str],
        pcm: bytes,
    ) -> str:
        if self._use_daemon:
            text = get_whisper_engine().transcribe(pcm)
            if text:
                return text
        return _run_whisper_transcribe(whisper_bin, model_path, pcm, env)

    def status(self) -> dict[str, Any]:
        """Snapshot of the live session state for RPC polling.

        Restored 2026-08-03. ``742db60`` (Voice STT session daemon) replaced this method's
        signature line with ``_transcribe_pcm`` and never re-added it, leaving these two body
        lines stranded as unreachable code after that method's ``return``. ``start()``,
        ``stop()`` and both voice RPCs all call it, so voice raised
        ``AttributeError: 'VoiceTranscriptionSession' object has no attribute 'status'`` on
        every attempt from then until this fix.
        """
        with self._lock:
            return dict(self._state)

    def _set_state(self, **fields: Any) -> None:
        with self._lock:
            self._state.update(fields)

    def _append_pcm(self, chunk: bytes) -> None:
        if not chunk:
            return
        with self._lock:
            rms = _pcm_rms(chunk)
            if rms >= VOICE_RMS_THRESHOLD:
                self._last_voice_monotonic = time.monotonic()
            self._pcm_buffer.append(chunk)
            self._buffer_bytes += len(chunk)
            while self._buffer_bytes > self._max_buffer_bytes and self._pcm_buffer:
                dropped = self._pcm_buffer.popleft()
                self._buffer_bytes -= len(dropped)

    def _window_pcm(self, seconds: float) -> bytes:
        need = int(seconds * BYTES_PER_SECOND)
        if need <= 0:
            return b""
        with self._lock:
            chunks: list[bytes] = []
            total = 0
            for chunk in reversed(self._pcm_buffer):
                chunks.append(chunk)
                total += len(chunk)
                if total >= need:
                    break
            chunks.reverse()
            data = b"".join(chunks)
        return data[-need:] if len(data) > need else data

    def _drop_pcm_before(self, seconds: float) -> None:
        drop_bytes = int(seconds * BYTES_PER_SECOND)
        with self._lock:
            while drop_bytes > 0 and self._pcm_buffer:
                chunk = self._pcm_buffer.popleft()
                if len(chunk) <= drop_bytes:
                    drop_bytes -= len(chunk)
                    self._buffer_bytes -= len(chunk)
                else:
                    keep = chunk[drop_bytes:]
                    self._pcm_buffer.appendleft(keep)
                    self._buffer_bytes -= drop_bytes
                    drop_bytes = 0

    def start(self) -> dict[str, Any]:
        """Start one recording: check the engine is ready, open the
        microphone, and launch the two background threads that do the
        ongoing work.

        In: nothing beyond what was already given to `__init__()` -- the
        model to use, and where the plugin and its settings live.

        Out: `{"accepted": True}` once recording has actually begun, or
        `{"accepted": False, "error": ...}` when it could not. Whether the
        recording is using the shared background engine or a plain per-call
        one is decided here too (`self._use_daemon`), read by
        `_transcribe_pcm()` on every decode pass.

        What can go wrong, in the order this checks for it: the speech
        engine or model is not installed yet (`engine_readiness()` catches
        both); a recording is already running, in which case this simply
        returns the existing one rather than starting a second; or no
        microphone capture tool could be started at all
        (`_resolve_capture_command()` raises), in which case the shared
        engine that was just claimed is released again before returning, so
        a failed start does not leave it held forever.

        Once capture is underway, `_capture_reader_loop()` and
        `_transcribe_loop()` run on their own threads and this method
        returns immediately -- it does not wait for any words to appear.
        """
        ready = engine_readiness(self.plugin_root, self.settings_dir, self.model_id)
        if not ready["binary_ready"]:
            err = (
                "whisper-cli is not installed. Open Settings → Voice input and tap "
                "Install voice engine (downloads whisper-cli + model)."
            )
            self._set_state(status="error", recording=False, streaming=False, error=err)
            return {"accepted": False, "error": err}
        if not ready["model_ready"]:
            err = f"Voice model {self.model_id} is not downloaded yet."
            self._set_state(status="error", recording=False, streaming=False, error=err)
            return {"accepted": False, "error": err}

        if self._worker_thread and self._worker_thread.is_alive():
            return {"accepted": True, "status": self.status()}

        self._stop_event.clear()
        with self._lock:
            self._pcm_buffer.clear()
            self._buffer_bytes = 0
        self._last_partial = ""
        self._finalized = ""
        self._last_voice_monotonic = time.monotonic()

        model_path = voice_model_path(self.plugin_root, self.settings_dir, self.model_id)
        engine = get_whisper_engine()
        engine.acquire("mic", model_path, self.plugin_root, self.settings_dir)
        self._use_daemon = engine.daemon_available()

        try:
            cmd, backend, capture_env = _resolve_capture_command()
            self._capture_backend = backend
            self._capture_proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                env=capture_env,
            )
        except Exception as exc:
            err = str(exc)[:500]
            self._set_state(status="error", recording=False, streaming=False, error=err)
            get_whisper_engine().release("mic")
            return {"accepted": False, "error": err}

        self._set_state(
            status="recording",
            recording=True,
            streaming=True,
            partial_transcript="",
            finalized_transcript="",
            model_ready=True,
            binary_ready=True,
            capture_backend=self._capture_backend,
            error=None,
            started_at=time.time(),
            stopped_at=None,
        )

        self._reader_thread = threading.Thread(target=self._capture_reader_loop, name="bonsai-voice-capture", daemon=True)
        self._worker_thread = threading.Thread(target=self._transcribe_loop, name="bonsai-voice-stt", daemon=True)
        self._reader_thread.start()
        self._worker_thread.start()
        return {"accepted": True}

    def _capture_reader_loop(self) -> None:
        proc = self._capture_proc
        if proc is None or proc.stdout is None:
            return
        chunks_read = 0
        try:
            while not self._stop_event.is_set():
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                chunks_read += 1
                self._append_pcm(chunk)
        except Exception as exc:
            self.logger.warning("voice capture reader failed: %s", exc)
            self._set_state(error=str(exc)[:300])
        finally:
            stderr = ""
            if proc.stderr is not None:
                try:
                    stderr = (proc.stderr.read() or b"").decode("utf-8", errors="replace")[:300]
                except Exception:
                    pass
            if proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass
            if chunks_read == 0:
                msg = (stderr or "Microphone capture produced no audio.").strip()[:300]
                self._set_state(
                    status="error",
                    recording=False,
                    streaming=False,
                    error=f"Microphone capture failed: {msg}",
                )

    def _transcribe_loop(self) -> None:
        """The background thread that keeps turning recorded audio into
        text while a recording is running.

        In: nothing directly -- it reads the audio `_capture_reader_loop()`
        is appending to the shared buffer, roughly five times a second, and
        keeps running until `stop()` sets the stop flag.

        Out: nothing returned. Instead it repeatedly calls `_set_state()`
        so the plugin's own RPC can hand `status()` the latest partial and
        finalized text on every poll, and finishes by calling
        `_flush_final()` once, after the loop ends, to catch whatever last
        few words never made it through a full decode pass.

        What can go wrong: the speech engine or model files went missing
        after `start()` already checked them, in which case this ends the
        session in an error state immediately rather than looping forever;
        or one single decode pass raises, which is logged and skipped
        rather than ending the whole recording over one bad pass. A window
        that is too short, too quiet, or whose words whisper is not
        confident about is quietly skipped rather than shown, so a burst of
        room noise does not get typed out as a word.
        """
        whisper_bin = whisper_binary_usable(self.plugin_root, self.settings_dir)
        model_path = voice_model_path(self.plugin_root, self.settings_dir, self.model_id)
        env = voice_whisper_runtime_env(self.plugin_root, self.settings_dir)
        if not whisper_bin or not os.path.isfile(model_path):
            self._set_state(status="error", recording=False, streaming=False, error="Engine not ready.")
            return

        last_pass = 0.0
        while not self._stop_event.is_set():
            now = time.monotonic()
            if now - last_pass < TRANSCRIBE_INTERVAL_S:
                time.sleep(0.05)
                continue
            last_pass = now

            pcm = self._window_pcm(WINDOW_SECONDS)
            if len(pcm) < WHISPER_MIN_DECODE_PCM_BYTES:
                continue

            window_rms = _pcm_rms(pcm)
            if window_rms < VOICE_RMS_THRESHOLD:
                continue

            try:
                text = self._transcribe_pcm(whisper_bin, model_path, env, pcm)
            except Exception as exc:
                self.logger.warning("voice whisper pass failed: %s", exc)
                continue

            text = (text or "").strip()
            if not text:
                continue
            if not _whisper_decode_usable(text, window_rms):
                continue

            finalized, partial = merge_sliding_window_transcript(
                self._finalized,
                self._last_partial,
                text,
            )
            self._finalized = finalized
            self._last_partial = partial

            silence = (time.monotonic() - self._last_voice_monotonic) >= SILENCE_HOLD_SECONDS
            if silence and partial:
                self._finalized = _join_transcript_parts(self._finalized, partial)
                self._last_partial = ""
                self._drop_pcm_before(min(WINDOW_SECONDS, 4.0))
                self._set_state(
                    partial_transcript="",
                    finalized_transcript=self._finalized,
                    streaming=True,
                )
            else:
                self._set_state(
                    partial_transcript=self._last_partial,
                    finalized_transcript=self._finalized,
                    streaming=True,
                )

        self._flush_final(whisper_bin, model_path, env)

    def _flush_final(self, whisper_bin: str, model_path: str, env: dict[str, str]) -> None:
        with self._lock:
            if self._last_partial:
                self._finalized = _join_transcript_parts(self._finalized, self._last_partial)
                self._last_partial = ""

        if self._stop_event.is_set():
            self._set_state(
                status="stopped",
                recording=False,
                streaming=False,
                partial_transcript="",
                finalized_transcript=self._finalized,
                stopped_at=time.time(),
            )
            return

        pcm = self._window_pcm(WINDOW_SECONDS)
        if pcm and len(pcm) >= BYTES_PER_SECOND // 4:
            window_rms = _pcm_rms(pcm)
            try:
                tail = self._transcribe_pcm(whisper_bin, model_path, env, pcm).strip()
                if tail and _whisper_decode_usable(tail, window_rms):
                    finalized, partial = merge_sliding_window_transcript(
                        self._finalized,
                        self._last_partial,
                        tail,
                    )
                    self._finalized = _join_transcript_parts(finalized, partial)
                    self._last_partial = ""
                elif self._last_partial:
                    self._finalized = _join_transcript_parts(self._finalized, self._last_partial)
                    self._last_partial = ""
            except Exception as exc:
                self.logger.warning("voice final flush failed: %s", exc)
        elif self._last_partial:
            self._finalized = _join_transcript_parts(self._finalized, self._last_partial)
            self._last_partial = ""

        self._set_state(
            status="stopped",
            recording=False,
            streaming=False,
            partial_transcript="",
            finalized_transcript=self._finalized,
            stopped_at=time.time(),
        )

    def stop(self) -> dict[str, Any]:
        self._stop_event.set()
        self._set_state(recording=False, streaming=False)
        proc = self._capture_proc
        if proc is not None and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        for thread in (self._reader_thread, self._worker_thread):
            if thread is not None and thread.is_alive():
                thread.join(timeout=3.0)
        get_whisper_engine().release("mic")
        st = self.status()
        return {
            "stopped": True,
            "finalized_transcript": st.get("finalized_transcript") or "",
            "partial_transcript": "",
            "status": st.get("status") or "stopped",
        }

    def force_stop(self) -> None:
        """Immediate teardown when permission revoked."""
        self.stop()
