"""Title: Downloading the starter set's two speech models through the voice engine's own path

Purpose: The microphone reads from two speech models (tiny.en and base.en). The starter set downloads both
with the voice engine's own download (`download_voice_model`), one at a time, so one failing leaves the
other going ahead. A model already on disk at its pinned size is not downloaded again.

Used for: start_local_ollama_setup (ollama_local_setup_rpc.py), which hands `download_speech_models` to the
setup run for the starter set.

Solves: The speech models are not Ollama models, so Ollama's pull cannot fetch them; this reuses the path the
Settings "Install voice engine" button already uses instead of teaching Ollama's pull about them.

Does not: Check the microphone permission (downloading a file is not listening), build the voice engine
program, or write the sentences that report the run (starter_set_extras.py does).
"""

from __future__ import annotations

import threading
from typing import Any, Callable

from backend.voice import voice_model_download_service as voice_models
from backend.ollama.starter_set_extras import STARTER_SPEECH_MODELS, short_reason


def download_speech_models(
    plugin_root: str,
    settings_dir: str,
    log: Callable[[str], None],
    set_progress: Callable[[str], None],
    cancel_event: Any,
    *,
    models: tuple[str, ...] = STARTER_SPEECH_MODELS,
) -> dict[str, str]:
    """Download each speech model through the voice engine's own path (blocking).

    Returns {model: plain reason} for the ones that failed; a model already on disk at its pinned size is
    not downloaded again (download_voice_model returns at once). A failure never stops the next model. The
    caller checks cancelling between models; `cancel_event` also stops a download in progress.
    """
    failures: dict[str, str] = {}
    for model_id in models:
        if cancel_event.is_set():
            break
        if voice_models.model_file_complete(plugin_root, settings_dir, model_id):
            log(f"[bonsAI] Speech model {model_id} is already downloaded.")
            continue
        log(f"[bonsAI] Downloading speech model {model_id}…")
        state = voice_models.new_voice_install_state()

        def on_stage(name: str, fields: dict[str, Any], _model: str = model_id) -> None:
            pct = fields.get("progress_pct")
            if name == "downloading" and isinstance(pct, int):
                set_progress(f"Downloading speech model {_model}: {pct}%")

        try:
            voice_models.download_voice_model(
                plugin_root,
                settings_dir,
                model_id,
                state,
                cancel_event if isinstance(cancel_event, threading.Event) else _AsThreadingEvent(cancel_event),
                on_stage,
            )
            log(f"[bonsAI] Speech model {model_id} is ready.")
        except Exception as exc:
            failures[model_id] = short_reason(str(exc))
            log(f"[bonsAI] Speech model {model_id} did not download: {failures[model_id]}")
    set_progress("")
    return failures


class _AsThreadingEvent:
    """Lets the voice download read the setup run's cancel flag, which is an asyncio.Event."""

    def __init__(self, event: Any) -> None:
        self._event = event

    def is_set(self) -> bool:
        return bool(self._event.is_set())
