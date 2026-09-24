"""Title: Finding and opening the microphone

Purpose: Before any audio can be recorded, this file works out two things a
background plugin process cannot simply assume: where the interactive
session's PipeWire/Pulse audio sockets live, and which capture command to run
against them (pw-record, parecord or arecord, whichever is installed). It also
measures how loud a chunk of recorded audio is, which the transcription loop
uses to decide whether a decode pass is worth running at all.

Used for: voice_transcription_service's `VoiceTranscriptionSession.start()`,
to choose and launch the microphone capture process, and its capture-reader
and transcribe loops, to gate on loudness. voice_read_aloud_service reuses
`env_for_audio_capture()` for playback rather than duplicating the same
session-socket discovery.

Solves: This runs as a background plugin process, not inside the normal
desktop session, so it cannot simply assume where the microphone's audio
socket lives -- `env_for_audio_capture()` and `_discover_session_runtime_dir()`
go find it, by reading `XDG_RUNTIME_DIR` off a running session process
(gamescope, Steam, plasma) when the default guess is not usable.

Does not: Decode or transcribe any audio, or decide when a recording should
start or stop -- this only opens the microphone and reports how loud what it
is hearing is; voice_transcription_service.VoiceTranscriptionSession does the
rest.
"""

from __future__ import annotations

import math
import os
import shutil
import struct
import subprocess
from typing import Optional

from backend.services.local_ollama_setup_service import _env_for_host_system_tools
from backend.services.voice_whisper_runtime import CHANNELS, SAMPLE_RATE, SAMPLE_WIDTH


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


def env_for_audio_capture() -> dict[str, str]:
    """Child env with the Deck user's PipeWire/Pulse session sockets (plugin_loader often lacks these).

    Public (renamed from ``_env_for_audio_capture`` 2026-09-12): the read-aloud service reuses this
    same session-socket discovery for playback rather than duplicating it — see
    voice_read_aloud_service.py.
    """
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
    capture_env = env or env_for_audio_capture()
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
    capture_env = env_for_audio_capture()
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
