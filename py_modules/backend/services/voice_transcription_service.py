"""Local voice capture + whisper.cpp interim speech-to-text for the Ask bar."""

from __future__ import annotations

import asyncio
import io
import math
import os
import re
import shutil
import struct
import subprocess
import tempfile
import threading
import time
import urllib.request
import wave
from collections import deque
from typing import Any, Callable, Optional

from backend.services.local_ollama_setup_service import _env_for_host_system_tools

SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2
BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH
ROLLING_BUFFER_MAX_SECONDS = 30
TRANSCRIBE_INTERVAL_S = 0.7
WINDOW_SECONDS = 5
SILENCE_RMS_THRESHOLD = 350.0
SILENCE_HOLD_SECONDS = 2.0
# Whisper tiny/base often hallucinate these on quiet/noise windows.
WHISPER_FILLER_WORDS = frozenset(
    {"you", "yes", "no", "ok", "okay", "uh", "um", "hmm", "yeah", "oh", "test"}
)
FILLER_MIN_RMS_MULTIPLIER = 2.5

VALID_VOICE_STT_MODELS = frozenset({"tiny.en", "base.en"})
DEFAULT_VOICE_STT_MODEL = "tiny.en"

VOICE_STT_MODEL_SPECS: dict[str, dict[str, str]] = {
    "tiny.en": {
        "filename": "ggml-tiny.en.bin",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
    },
    "base.en": {
        "filename": "ggml-base.en.bin",
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
    },
}

WHISPER_CPP_IMAGE = "ghcr.io/ggml-org/whisper.cpp:main"
WHISPER_CLI_IN_IMAGE = "/app/build/bin/whisper-cli"
WHISPER_LIBS_IN_IMAGE = (
    "/app/build/src/libwhisper.so.1",
    "/app/build/ggml/src/libggml.so.0",
    "/app/build/ggml/src/libggml-base.so.0",
    "/app/build/ggml/src/libggml-cpu.so.0",
)
WHISPER_REQUIRED_SONAMES = (
    "libwhisper.so.1",
    "libggml.so.0",
    "libggml-base.so.0",
    "libggml-cpu.so.0",
)


def sanitize_voice_stt_model(value: Any) -> str:
    if isinstance(value, str) and value.strip() in VALID_VOICE_STT_MODELS:
        return value.strip()
    return DEFAULT_VOICE_STT_MODEL


def new_voice_install_state() -> dict[str, Any]:
    return {
        "phase": "idle",
        "stage": "",
        "model_id": "",
        "done": True,
        "error": "",
        "accepted": False,
        "progress_pct": 0,
        "log_tail": [],
    }


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


def voice_models_dir(plugin_root: str, settings_dir: str) -> str:
    base = settings_dir or os.path.join(plugin_root, "data")
    return os.path.join(base, "voice_models")


def voice_bin_dir(plugin_root: str, settings_dir: str) -> str:
    base = settings_dir or os.path.join(plugin_root, "data")
    return os.path.join(base, "voice_bin")


def voice_whisper_cli_path(plugin_root: str, settings_dir: str) -> str:
    return os.path.join(voice_bin_dir(plugin_root, settings_dir), "whisper-cli")


def voice_model_path(plugin_root: str, settings_dir: str, model_id: str) -> str:
    spec = VOICE_STT_MODEL_SPECS.get(model_id, VOICE_STT_MODEL_SPECS[DEFAULT_VOICE_STT_MODEL])
    return os.path.join(voice_models_dir(plugin_root, settings_dir), spec["filename"])


def resolve_whisper_cli(plugin_root: str, settings_dir: str = "") -> Optional[str]:
    candidates = [
        voice_whisper_cli_path(plugin_root, settings_dir) if settings_dir else "",
        os.path.join(plugin_root, "bin", "whisper-cli"),
        os.path.join(plugin_root, "bin", "main"),
        shutil.which("whisper-cli"),
        shutil.which("whisper-cpp"),
        "/usr/bin/whisper-cli",
        "/usr/local/bin/whisper-cli",
    ]
    for cand in candidates:
        if not cand:
            continue
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    return None


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


def voice_whisper_runtime_env(plugin_root: str, settings_dir: str) -> dict[str, str]:
    env = dict(_env_for_host_system_tools())
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    if os.path.isdir(bin_dir):
        prev = env.get("LD_LIBRARY_PATH", "")
        env["LD_LIBRARY_PATH"] = bin_dir + (f":{prev}" if prev else "")
    return env


def whisper_binary_usable(plugin_root: str, settings_dir: str) -> Optional[str]:
    path = resolve_whisper_cli(plugin_root, settings_dir)
    if not path:
        return None
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    for lib in WHISPER_REQUIRED_SONAMES:
        lib_path = os.path.join(bin_dir, lib)
        if not os.path.isfile(lib_path) and not os.path.islink(lib_path):
            return None
    env = voice_whisper_runtime_env(plugin_root, settings_dir)
    try:
        proc = subprocess.run(
            [path, "-h"],
            capture_output=True,
            text=True,
            timeout=15,
            env=env,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0 and "usage:" not in out:
            return None
    except Exception:
        return None
    return path


def _pcm_rms(chunk: bytes) -> float:
    if len(chunk) < SAMPLE_WIDTH:
        return 0.0
    count = len(chunk) // SAMPLE_WIDTH
    if count <= 0:
        return 0.0
    samples = struct.unpack(f"<{count}h", chunk[: count * SAMPLE_WIDTH])
    if not samples:
        return 0.0
    mean_sq = sum(s * s for s in samples) / len(samples)
    return math.sqrt(mean_sq)


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
        return window_rms >= SILENCE_RMS_THRESHOLD * FILLER_MIN_RMS_MULTIPLIER
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


def _pcm_to_wav_bytes(pcm: bytes) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    return buf.getvalue()


def _parse_proc_environ(pid: int) -> dict[str, str]:
    try:
        with open(f"/proc/{pid}/environ", "rb") as f:
            blob = f.read()
    except OSError:
        return {}
    out: dict[str, str] = {}
    for part in blob.split(b"\0"):
        if b"=" not in part:
            continue
        key, val = part.split(b"=", 1)
        try:
            out[key.decode(errors="replace")] = val.decode(errors="replace")
        except Exception:
            continue
    return out


def _runtime_dir_usable(path: str) -> bool:
    if not path or not os.path.isdir(path):
        return False
    return any(
        os.path.exists(os.path.join(path, name))
        for name in ("pipewire-0", os.path.join("pulse", "native"))
    )


def _discover_session_runtime_dir() -> str:
    """PipeWire/Pulse live under the interactive session's XDG_RUNTIME_DIR (gamescope/Steam)."""
    uid = os.getuid()
    default = f"/run/user/{uid}"
    if _runtime_dir_usable(default):
        return default

    host_env = _env_for_host_system_tools()
    pids: list[int] = []
    for name in ("gamescope", "gamescope-wl", "steam", "plasmashell", "kwin_wayland"):
        try:
            out = subprocess.run(
                ["pgrep", "-x", name],
                capture_output=True,
                text=True,
                timeout=3,
                env=host_env,
            )
            if out.returncode != 0:
                continue
            for line in (out.stdout or "").splitlines():
                line = line.strip()
                if line.isdigit():
                    pids.append(int(line))
        except Exception:
            continue

    seen: set[str] = set()
    for pid in pids:
        rd = _parse_proc_environ(pid).get("XDG_RUNTIME_DIR", "")
        if rd and rd not in seen and _runtime_dir_usable(rd):
            return rd

    return default if os.path.isdir(default) else ""


def _env_for_audio_capture() -> dict[str, str]:
    """Child env with the Deck user's PipeWire/Pulse session sockets (plugin_loader often lacks these)."""
    env = dict(_env_for_host_system_tools())
    rd = _discover_session_runtime_dir()
    if rd:
        env["XDG_RUNTIME_DIR"] = rd
        pulse_sock = os.path.join(rd, "pulse", "native")
        if os.path.exists(pulse_sock):
            env["PULSE_SERVER"] = f"unix:{pulse_sock}"
    return env


def _resolve_pipewire_mic_target(env: Optional[dict[str, str]] = None) -> str:
    """Best-effort default PipeWire/Pulse capture source (Deck internal mic)."""
    capture_env = env or _env_for_audio_capture()
    try:
        proc = subprocess.run(
            ["pactl", "list", "sources", "short"],
            capture_output=True,
            text=True,
            timeout=5,
            env=capture_env,
        )
        if proc.returncode != 0:
            return ""
        fallback = ""
        for line in (proc.stdout or "").splitlines():
            parts = line.split()
            if len(parts) < 2:
                continue
            name = parts[1]
            if ".monitor" in name:
                continue
            if "Internal_Mic" in name:
                return name
            lower = name.lower()
            if "mic" in lower and "input" in lower:
                fallback = name
        return fallback
    except Exception:
        return ""


def _resolve_capture_command() -> tuple[list[str], str, dict[str, str]]:
    capture_env = _env_for_audio_capture()
    mic_target = _resolve_pipewire_mic_target(capture_env)
    if shutil.which("pw-record"):
        cmd = [
            "pw-record",
            "--rate",
            str(SAMPLE_RATE),
            "--channels",
            str(CHANNELS),
            "--format",
            "s16",
            "--raw",
            "-",
        ]
        if mic_target:
            cmd[1:1] = ["--target", mic_target]
        return cmd, "pipewire", capture_env
    for cmd, backend in (
        (
            ["parecord", f"--rate={SAMPLE_RATE}", "--channels=1", "--format=s16le", "--raw"]
            + (["--device=" + mic_target] if mic_target else []),
            "pulse",
        ),
        (["arecord", "-f", "S16_LE", "-r", str(SAMPLE_RATE), "-c", "1", "-t", "raw", "-q"], "alsa"),
    ):
        if shutil.which(cmd[0]):
            return cmd, backend, capture_env
    raise RuntimeError(
        "No audio capture tool found (tried pw-record, parecord, arecord). "
        "Install PipeWire or PulseAudio capture utilities."
    )


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
        if not text or text == "[BLANK_AUDIO]" or text.startswith("[BLANK"):
            continue
        parts.append(text)
    return " ".join(parts).strip()


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
                "2",
                "-nt",
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


def _append_log_tail(state: dict[str, Any], line: str, max_lines: int = 80) -> None:
    tail = list(state.get("log_tail") or [])
    msg = (line or "").strip()
    if msg:
        tail.append(msg[:240])
    state["log_tail"] = tail[-max_lines:]


def _download_model_file(
    url: str,
    tmp_path: str,
    cancel_event: threading.Event,
    on_progress: Optional[Callable[[int], None]] = None,
) -> None:
    """Download GGUF model; prefer curl on Linux (more reliable TLS on SteamOS)."""
    curl = shutil.which("curl")
    env = _env_for_host_system_tools()
    if curl:
        proc = subprocess.run(
            [curl, "-fL", "--retry", "3", "--retry-delay", "2", "-o", tmp_path, url],
            capture_output=True,
            text=True,
            timeout=900,
            env=env,
        )
        if proc.returncode == 0 and os.path.isfile(tmp_path) and os.path.getsize(tmp_path) > 1024:
            return
        err = (proc.stderr or proc.stdout or "curl download failed").strip()
        try:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass

    req = urllib.request.Request(url, headers={"User-Agent": "bonsAI/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        read = 0
        chunk_size = 256 * 1024
        with open(tmp_path, "wb") as out:
            while True:
                if cancel_event.is_set():
                    raise RuntimeError("Download cancelled.")
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out.write(chunk)
                read += len(chunk)
                if total > 0 and on_progress:
                    on_progress(min(99, int(read * 100 / total)))


def download_voice_model(
    plugin_root: str,
    settings_dir: str,
    model_id: str,
    state: dict[str, Any],
    cancel_event: threading.Event,
    on_stage: Optional[Callable[[str, dict[str, Any]], None]] = None,
) -> None:
    model_id = sanitize_voice_stt_model(model_id)
    spec = VOICE_STT_MODEL_SPECS[model_id]
    dest_dir = voice_models_dir(plugin_root, settings_dir)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, spec["filename"])
    tmp_path = dest_path + ".part"

    def stage(name: str, **fields: Any) -> None:
        state["stage"] = name
        if on_stage:
            on_stage(name, {"model_id": model_id, **fields})

    if os.path.isfile(dest_path) and os.path.getsize(dest_path) > 1024:
        state.update({"phase": "done", "done": True, "error": "", "progress_pct": 100, "model_id": model_id})
        stage("model_ready")
        return

    state.update({"phase": "running", "done": False, "error": "", "model_id": model_id, "progress_pct": 0})
    stage("download_start", url=spec["url"])

    try:
        def on_progress(pct: int) -> None:
            state["progress_pct"] = pct
            if pct % 10 == 0:
                stage("downloading", progress_pct=pct)

        _download_model_file(spec["url"], tmp_path, cancel_event, on_progress)
        os.replace(tmp_path, dest_path)
        state.update({"phase": "done", "done": True, "error": "", "progress_pct": 100})
        stage("model_ready")
        _append_log_tail(state, f"Model ready: {model_id}")
    except Exception as exc:
        try:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        state.update({"phase": "failed", "done": True, "error": str(exc)[:500]})
        stage("failed", error=str(exc)[:200])
        raise


def _extract_whisper_from_container(
    podman: str,
    env: dict[str, str],
    plugin_root: str,
    settings_dir: str,
) -> str:
    """Copy whisper-cli + shared libraries from podman image into voice_bin."""
    dest = voice_whisper_cli_path(plugin_root, settings_dir)
    bin_dir = voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir, exist_ok=True)

    create = subprocess.run(
        [podman, "create", "--entrypoint", "/usr/bin/true", WHISPER_CPP_IMAGE],
        capture_output=True,
        text=True,
        timeout=120,
        env=env,
    )
    cid = (create.stdout or "").strip()
    if create.returncode != 0 or not cid:
        raise RuntimeError((create.stderr or create.stdout or "podman create failed")[:500])
    try:
        cp_bin = subprocess.run(
            [podman, "cp", f"{cid}:{WHISPER_CLI_IN_IMAGE}", dest],
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )
        if cp_bin.returncode != 0:
            raise RuntimeError((cp_bin.stderr or cp_bin.stdout or "podman cp whisper-cli failed")[:500])
        os.chmod(dest, 0o755)
        for lib_src in WHISPER_LIBS_IN_IMAGE:
            lib_name = os.path.basename(lib_src)
            lib_dest = os.path.join(bin_dir, lib_name)
            cp_lib = subprocess.run(
                [podman, "cp", f"{cid}:{lib_src}", lib_dest],
                capture_output=True,
                text=True,
                timeout=120,
                env=env,
            )
            if cp_lib.returncode != 0:
                raise RuntimeError(
                    (cp_lib.stderr or cp_lib.stdout or f"podman cp {lib_name} failed")[:500]
                )
            os.chmod(lib_dest, 0o755)
        _link_versioned_sonames(bin_dir)
    finally:
        subprocess.run([podman, "rm", cid], capture_output=True, text=True, timeout=60, env=env)

    if not whisper_binary_usable(plugin_root, settings_dir):
        raise RuntimeError(
            "whisper-cli was extracted but failed to run (missing libraries). "
            "Try Install voice engine again or restart the plugin."
        )
    return dest


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

    if whisper_binary_usable(plugin_root, settings_dir):
        stage("binary_ready", path=dest)
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

    stage("binary_extract_start")
    dest = _extract_whisper_from_container(podman, env, plugin_root, settings_dir)

    stage("binary_ready", path=dest)


def engine_readiness(plugin_root: str, settings_dir: str, model_id: str) -> dict[str, Any]:
    model_id = sanitize_voice_stt_model(model_id)
    whisper_bin = whisper_binary_usable(plugin_root, settings_dir)
    model_path = voice_model_path(plugin_root, settings_dir, model_id)
    model_ready = os.path.isfile(model_path) and os.path.getsize(model_path) > 1024
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

    def status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._state)

    def _set_state(self, **fields: Any) -> None:
        with self._lock:
            self._state.update(fields)

    def _append_pcm(self, chunk: bytes) -> None:
        if not chunk:
            return
        rms = _pcm_rms(chunk)
        if rms >= SILENCE_RMS_THRESHOLD:
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
        self._pcm_buffer.clear()
        self._buffer_bytes = 0
        self._last_partial = ""
        self._finalized = ""
        self._last_voice_monotonic = time.monotonic()

        try:
            cmd, backend, capture_env = _resolve_capture_command()
            self._capture_backend = backend
            self._capture_proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=capture_env,
            )
        except Exception as exc:
            err = str(exc)[:500]
            self._set_state(status="error", recording=False, streaming=False, error=err)
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
            if len(pcm) < BYTES_PER_SECOND // 2:
                continue

            window_rms = _pcm_rms(pcm)
            if window_rms < SILENCE_RMS_THRESHOLD:
                continue

            try:
                text = _run_whisper_transcribe(whisper_bin, model_path, pcm, env)
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
        pcm = self._window_pcm(WINDOW_SECONDS)
        if pcm and len(pcm) >= BYTES_PER_SECOND // 4:
            window_rms = _pcm_rms(pcm)
            try:
                tail = _run_whisper_transcribe(whisper_bin, model_path, pcm, env).strip()
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
