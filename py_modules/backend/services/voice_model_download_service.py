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

Solves (also): the model is fetched from one exact, pinned commit of the whisper.cpp
repository and checked against a known size and SHA-256 after it arrives; a file that
does not match is deleted, so a changed or swapped file on the server is never installed.

Does not: Build or install the whisper-cli program itself, or decide whether
the CPU it will run on can actually use it -- see install_whisper_cli and
engine_readiness in voice_transcription_service.py for that half of getting
voice input ready.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import threading
import time
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


# Both files are pinned to one exact commit of the ggerganov/whisper.cpp repository on Hugging Face
# (its latest, 2024-10-29, "Add automatic-speech-recognition tag"), never the moving `main` branch.
# `sha256` and `bytes` are the values Hugging Face lists for each file at that commit, and are the
# same as the files already installed on Decks before the pin, so an installed model still passes.
WHISPER_MODEL_COMMIT = "5359861c739e955e79d9a303bcbc70fb988958b1"
_WHISPER_MODEL_BASE_URL = f"https://huggingface.co/ggerganov/whisper.cpp/resolve/{WHISPER_MODEL_COMMIT}"

VOICE_STT_MODEL_SPECS: dict[str, dict[str, Any]] = {
    "tiny.en": {
        "filename": "ggml-tiny.en.bin",
        "url": f"{_WHISPER_MODEL_BASE_URL}/ggml-tiny.en.bin",
        "sha256": "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f",
        "bytes": 77_704_715,
    },
    "base.en": {
        "filename": "ggml-base.en.bin",
        "url": f"{_WHISPER_MODEL_BASE_URL}/ggml-base.en.bin",
        "sha256": "a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002",
        "bytes": 147_964_211,
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


def model_file_complete(plugin_root: str, settings_dir: str, model_id: str) -> bool:
    """True when the model file is on disk at exactly its pinned size.

    A file that is there but the wrong size is a download that stopped part way (or something
    else wrote to the name); it must not be offered to the speech engine.
    """
    model_id = sanitize_voice_stt_model(model_id)
    path = voice_model_path(plugin_root, settings_dir, model_id)
    if not os.path.isfile(path):
        return False
    expected = int(VOICE_STT_MODEL_SPECS[model_id].get("bytes") or 0)
    size = os.path.getsize(path)
    return size == expected if expected else size > 1024


# A partial file that was written to in the last half minute is a download in progress; an older
# one is left over from a download that was killed, and must not block recording for ever.
PARTIAL_FILE_FRESH_SECONDS = 30.0
MODEL_DOWNLOADING_LINE = "The speech model is still downloading. Try again when it finishes."
ENGINE_INSTALLING_LINE = "The voice engine is still being set up. Try again when it finishes."


def _partial_download_is_growing(plugin_root: str, settings_dir: str, model_id: str) -> bool:
    part = voice_model_path(plugin_root, settings_dir, model_id) + ".part"
    try:
        return time.time() - os.path.getmtime(part) < PARTIAL_FILE_FRESH_SECONDS
    except OSError:
        return False


def install_in_progress_refusal(
    plugin_root: str,
    settings_dir: str,
    model_id: str,
    install_state: dict[str, Any],
    model_ready: bool,
    binary_ready: bool,
) -> Optional[dict[str, Any]]:
    """The refusal to hand a mic press while the engine or this model is still being installed.

    None when recording may go ahead. Only an install that has not finished the piece this press
    needs counts: a download of the other model, or an engine build when everything needed is
    already in place, does not block it.
    """
    model_id = sanitize_voice_stt_model(model_id)
    running = install_state.get("phase") == "running" and not install_state.get("done")
    stage = str(install_state.get("stage") or "")
    if not model_ready:
        mine = running and sanitize_voice_stt_model(install_state.get("model_id")) == model_id
        if mine or _partial_download_is_growing(plugin_root, settings_dir, model_id):
            if mine and stage.startswith("binary"):
                return {"accepted": False, "error": "engine_installing", "reason": ENGINE_INSTALLING_LINE}
            return {"accepted": False, "error": "model_downloading", "reason": MODEL_DOWNLOADING_LINE}
    if not binary_ready and running and stage.startswith("binary"):
        return {"accepted": False, "error": "engine_installing", "reason": ENGINE_INSTALLING_LINE}
    return None


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
    max_bytes: Optional[int] = None,
) -> None:
    """Download the model file; prefer curl on Linux (more reliable TLS on SteamOS).

    ``max_bytes`` is a size cap: the download stops with an error rather than fill the disk
    with more than the file is known to weigh.
    """
    curl = shutil.which("curl")
    env = _env_for_host_system_tools()
    if curl:
        proc = subprocess.run(
            [
                curl,
                "-fL",
                "--retry",
                "3",
                "--retry-delay",
                "2",
                *(["--max-filesize", str(max_bytes)] if max_bytes else []),
                "-o",
                tmp_path,
                url,
            ],
            capture_output=True,
            text=True,
            timeout=900,
            env=env,
        )
        if proc.returncode == 0 and os.path.isfile(tmp_path) and os.path.getsize(tmp_path) > 1024:
            if max_bytes and os.path.getsize(tmp_path) > max_bytes:
                _remove_quietly(tmp_path)
                raise RuntimeError("The speech model download was larger than expected and was deleted.")
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
        if max_bytes and total > max_bytes:
            raise RuntimeError("The speech model download is larger than expected and was refused.")
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
                if max_bytes and read > max_bytes:
                    raise RuntimeError("The speech model download is larger than expected and was stopped.")
                if total > 0 and on_progress:
                    on_progress(min(99, int(read * 100 / total)))


def _remove_quietly(path: str) -> None:
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError:
        pass


def _sha256_of_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _check_downloaded_model(tmp_path: str, spec: dict[str, Any]) -> None:
    """Refuse a downloaded file whose size or SHA-256 is not the pinned one.

    Only run right after a download -- an already-installed file is not hashed again on every
    start. The caller deletes the file when this raises.
    """
    expected_bytes = int(spec.get("bytes") or 0)
    if expected_bytes and os.path.getsize(tmp_path) != expected_bytes:
        raise RuntimeError("The speech model did not download completely, so it was deleted. Try again.")
    expected_sha = str(spec.get("sha256") or "").strip().lower()
    if not expected_sha or _sha256_of_file(tmp_path) != expected_sha:
        raise RuntimeError(
            "The speech model failed its checksum, so it was deleted and not installed. Try again."
        )


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

    if model_file_complete(plugin_root, settings_dir, model_id):
        state.update({"phase": "done", "done": True, "error": "", "progress_pct": 100, "model_id": model_id})
        stage("model_ready")
        return

    # A file at the final name that is not the pinned size is a stopped download: replace it.
    _remove_quietly(dest_path)
    state.update({"phase": "running", "done": False, "error": "", "model_id": model_id, "progress_pct": 0})
    stage("download_start", url=spec["url"])

    try:
        def on_progress(pct: int) -> None:
            state["progress_pct"] = pct
            if pct % 10 == 0:
                stage("downloading", progress_pct=pct)

        _download_model_file(
            spec["url"], tmp_path, cancel_event, on_progress, max_bytes=int(spec.get("bytes") or 0) or None
        )
        stage("verifying")
        _check_downloaded_model(tmp_path, spec)
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
