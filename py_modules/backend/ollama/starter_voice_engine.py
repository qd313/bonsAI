"""Title: Building the voice engine as the last step of the starter set

Purpose: The microphone needs two things: the speech models (starter_speech_models.py downloads them) and
the voice engine, a small program that reads them. The engine is built on the Deck by the voice engine's own
install (`install_whisper_cli`): it pulls an image from ghcr.io with podman, then runs a container that
fetches compilers and compiles the program. This file runs that same install as the starter set's last
step, so after one press of "Install the starter set" the microphone works straight away.

Used for: start_local_ollama_setup (ollama_local_setup_rpc.py), which hands `build_voice_engine` to the setup
run for the starter set; starter_set_extras.py runs it after the speech models and words the result.

Solves: Before this, the starter set left the microphone half done: the models were there but the program
that reads them was not, until the person found Settings, Voice input, Install voice engine.

Does not: Check the microphone permission. Building a program is not listening, so the build goes ahead
with Voice input off (it calls `install_whisper_cli` directly, not the permission-gated install_voice_engine
RPC). It does not check the Internet downloads permission either: the starter set's start has already done.
A Cancel is heard before the step starts, and while the image pull or the build runs
(voice_stoppable_run.py ends the process and removes the build container). A failure is returned as a plain
reason, never raised, so the rest of the starter set still finishes.
"""

from __future__ import annotations

import subprocess
import threading
from typing import Any, Callable, Optional

from backend.ollama.starter_set_extras import short_reason
from backend.ollama.starter_speech_models import _AsThreadingEvent
from backend.voice.voice_transcription_service import install_whisper_cli

_STAGE_WORDS = {
    "binary_pull_start": "Downloading the voice engine's build image…",
    "binary_build_start": "Building the voice engine (this can take several minutes)…",
}


def plain_engine_reason(exc: BaseException) -> str:
    """One plain sentence for why the build failed, from the error the install raised."""
    if isinstance(exc, subprocess.TimeoutExpired):
        return "it took too long"
    text = str(exc)
    if "podman was not found" in text:
        return "podman is not installed on this Deck"
    return short_reason(text)


def build_voice_engine(
    plugin_root: str,
    settings_dir: str,
    log: Callable[[str], None],
    set_progress: Callable[[str], None],
    cancel_event: Any,
) -> str:
    """Build the voice engine the way Install voice engine does (blocking).

    Returns "" when the engine is ready (also when it already was: the install returns at once), or the plain
    reason it could not be built. Never raises.
    """
    if cancel_event.is_set():
        return "it was cancelled"
    log("[bonsAI] Building the voice engine…")
    state: dict[str, Any] = {}

    def on_stage(name: str, _fields: dict[str, Any]) -> None:
        if name in _STAGE_WORDS:
            set_progress(_STAGE_WORDS[name])

    reason: Optional[str] = None
    try:
        install_whisper_cli(
            plugin_root,
            settings_dir,
            state,
            cancel_event if isinstance(cancel_event, threading.Event) else _AsThreadingEvent(cancel_event),
            on_stage,
        )
        log("[bonsAI] The voice engine is ready.")
    except Exception as exc:  # a build that fails must not stop the rest of the starter set
        reason = plain_engine_reason(exc)
        log(f"[bonsAI] The voice engine did not build: {reason}")
    finally:
        set_progress("")
    return reason or ""
