"""Title: Whisper runtime basics

Purpose: Where the whisper files live, whether the binaries run, and the two small
         audio/text helpers both whisper callers need.
Used for: voice_transcription_service (mic capture) and voice_whisper_daemon (server mode).
Solves: One leaf both of them can import, so neither has to import the other. Before this
        existed the two files imported each other and the daemon hid it with function-level
        imports.
Does not: Capture audio, run inference, or own any process lifecycle -- see the two callers.
"""

from __future__ import annotations

import io
import os
import re
import shutil
import subprocess
import wave
from typing import Optional

from backend.services.local_ollama_setup_service import _env_for_host_system_tools


SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2
WHISPER_THREADS = 4
WHISPER_REQUIRED_SONAMES = (
    "libwhisper.so.1",
    "libggml.so.0",
    "libggml-base.so.0",
    "libggml-cpu.so.0",
)


def _sanitize_whisper_transcript(text: str) -> str:
    """Drop subtitle-style junk (>>, [INAUDIBLE]) from whisper-cli stdout."""
    if not (text or "").strip():
        return ""
    out = text.strip()
    out = re.sub(r"^>+\s*", "", out)
    out = re.sub(r"\[(?:INAUDIBLE|BLANK_AUDIO|MUSIC|APPLAUSE|SILENCE|NOISE)[^\]]*\]", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def _pcm_to_wav_bytes(pcm: bytes) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    return buf.getvalue()


def voice_bin_dir(plugin_root: str, settings_dir: str) -> str:
    base = settings_dir or os.path.join(plugin_root, "data")
    return os.path.join(base, "voice_bin")


def voice_whisper_cli_path(plugin_root: str, settings_dir: str) -> str:
    return os.path.join(voice_bin_dir(plugin_root, settings_dir), "whisper-cli")


def voice_whisper_server_path(plugin_root: str, settings_dir: str) -> str:
    return os.path.join(voice_bin_dir(plugin_root, settings_dir), "whisper-server")


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


def whisper_server_binary_usable(plugin_root: str, settings_dir: str) -> Optional[str]:
    path = voice_whisper_server_path(plugin_root, settings_dir)
    if not os.path.isfile(path) or not os.access(path, os.X_OK):
        return None
    if not whisper_binary_usable(plugin_root, settings_dir):
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
