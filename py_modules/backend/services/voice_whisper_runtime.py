"""Title: Where the speech-to-text program lives, and two things both of its callers need

Purpose: Two different files turn recorded audio into text using the
whisper.cpp program: one runs it fresh for a few seconds at a time while you
are speaking (voice_transcription_service), the other runs it as one
long-lived background server that several recordings can share without
restarting it each time (voice_whisper_daemon). Both need the same handful of
things -- where the program and its model files are saved on disk, whether
the installed copy actually works on this Deck's processor, and two small
conversions between raw recorded sound and the text/audio shapes whisper
expects. This file holds those shared pieces once, so the two callers agree
with each other without needing to import one another directly.
Used for: voice_transcription_service, for capturing from the microphone, and
voice_whisper_daemon, for running the shared background server.
Solves: before this file existed, the two callers imported each other
directly for these shared pieces, and the background-server file had to hide
that behind imports written inside a function instead of at the top, just to
avoid the two files trying to load each other at the same time. Moving the
shared parts out to their own file removes the reason for that.
Does not: capture audio, run a decode, or start or stop the whisper program
itself -- this only says where things are and whether a copy can be trusted;
running it is left to the two files that use this one.

Gotchas:
 - The shared background server's real limit lives one level up, in
   voice_whisper_daemon, not here: if a recording asks for a speech model
   while the server is already running a different one, the server is
   stopped and restarted for the new model, and whichever recording was
   already using the old one is never told -- it just finds the server gone
   the next time it tries to use it. This is a known, already-reported gap;
   this file only supplies the pieces the server is built from, so it cannot
   fix that on its own.
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
