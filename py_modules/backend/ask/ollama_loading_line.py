"""Title: The "loading the AI" line's timer

Purpose: Arm the one-shot timer that puts "Loading the AI. The first time takes a minute or two." on
    screen when a model call has stayed silent for a while, and build the arguments every thinking
    phase is published with, so the Ask path keeps one line for each instead of a nested lambda.
Used for: backend.ask.ollama_ask_service, once per model attempt (armed before the call, cancelled in
    its finally).
Solves: After a fresh install the model loads cold and the first word took 95 to 120 s with only
    "Still going..." lines (Deck, plan 94 block 4). Plan 96 F2 added the line; moving its timer here
    keeps the Ask service under the code-size guard it had just crossed (plan 96 landing).
Does not: Decide the wording (backend.answer.bonsai_stream_tags does) or when the first word
    arrived (the Ask path sets the event it is given).
"""
from __future__ import annotations

import asyncio
import threading
from typing import Any, Callable, Optional


def thinking_phase_args(settings: Any, app_name: Any, ask_mode: Any, display_question: Any, preset_id: Any) -> dict:
    """The keyword arguments every thinking phase of one Ask is published with."""
    return dict(
        app_name=app_name,
        ask_mode=ask_mode,
        question=display_question,
        character_enabled=bool(settings.get("ai_character_enabled")),
        character_preset_id=preset_id,
    )


def arm_loading_line(
    loop: asyncio.AbstractEventLoop,
    after_seconds: float,
    publish: Callable[..., Any],
    request_id: int,
    first_signal: threading.Event,
    phase_args: dict,
) -> Optional[asyncio.TimerHandle]:
    """Publish the "loading_model" phase after `after_seconds` of silence, unless a first word came.

    Returns the timer so the caller can cancel it when the model call ends either way.
    """

    def fire() -> None:
        if not first_signal.is_set():
            publish(request_id, "loading_model", **phase_args)

    return loop.call_later(after_seconds, fire)
