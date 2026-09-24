"""Title: Downloading the speech model voice input reads from

Purpose: Whisper.cpp cannot turn speech into text without a model file to
read, and SteamOS does not ship one. This file knows which models are
offered (tiny.en, base.en), where each one's file lives once downloaded, and
how to fetch it -- resumable, cancellable, and reporting progress as it goes
-- into the plugin's own data folder.

Used for: The Settings screen's "Install voice engine" button, through
`download_voice_model()`; voice_transcription_service reads the same model
path and spec table (`voice_model_path()`, `VOICE_STT_MODEL_SPECS`) to know
whether a model is ready before a recording is allowed to start.

Solves: A model file is 75-150 MB over a Deck's own connection, so a plain
one-shot download can be slow, can be cancelled mid-way by the person who
started it, and needs curl's more reliable TLS on SteamOS when it is
available rather than always falling back to Python's own downloader.

Does not: Build or install the whisper-cli program itself, or decide whether
the CPU it will run on can actually use it -- see install_whisper_cli and
engine_readiness in voice_transcription_service.py for that half of getting
voice input ready.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
import urllib.request
from typing import Any, Callable, Optional

from backend.services.local_ollama_setup_service import _env_for_host_system_tools
from backend.tls_ca_fallback import urlopen_with_ca_fallback

VALID_VOICE_STT_MODELS = frozenset({"tiny.en", "base.en"})
DEFAULT_VOICE_STT_MODEL = "tiny.en"


def sanitize_voice_stt_model(value: Any) -> str:
    if isinstance(value, str) and value.strip() in VALID_VOICE_STT_MODELS:
        return value.strip()
    return DEFAULT_VOICE_STT_MODEL


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


def voice_models_dir(plugin_root: str, settings_dir: str) -> str:
    base = settings_dir or os.path.join(plugin_root, "data")
    return os.path.join(base, "voice_models")


def voice_model_path(plugin_root: str, settings_dir: str, model_id: str) -> str:
    spec = VOICE_STT_MODEL_SPECS.get(model_id, VOICE_STT_MODEL_SPECS[DEFAULT_VOICE_STT_MODEL])
    return os.path.join(voice_models_dir(plugin_root, settings_dir), spec["filename"])


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
    with urlopen_with_ca_fallback(req, timeout=120) as resp:
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
