"""Title: Small shared pieces for the plugin's three long-running downloads

Purpose: Setting up the AI engine, downloading the knowledge base, and installing the
voice engine can each take a while and run in the background while you keep using the
Deck. All three need the same two small things: a flag the screen can raise to say "stop
this", and a way of writing one log line per stage instead of flooding the log with the
same "still working" line over and over. This file is those two things, built once and
handed to whichever of the three is running.
Used for: Starting the AI engine's own setup (both the first install and the "starter
setup" path), and installing the voice engine. Downloading the knowledge base uses the
same stop flag but not the stage logger.
Solves: Without one shared version of this, each of the three downloads would need its
own stop flag and its own "did I already log this stage" bookkeeping, and a bug fixed in
one would still be sitting in the other two.
Does not: Do any of the actual install or download work -- each caller owns that; this
file only hands it a stop flag and something to log progress through.
"""

from __future__ import annotations

import asyncio
import threading
from typing import Any, Awaitable, Callable, Optional

LogFn = Callable[..., Awaitable[None]]


def new_asyncio_cancel_event() -> asyncio.Event:
    """Fresh ``asyncio.Event`` for cooperative cancellation (cleared)."""
    event = asyncio.Event()
    event.clear()
    return event


def new_threading_cancel_event() -> threading.Event:
    """Fresh ``threading.Event`` for thread-pool install jobs (cleared)."""
    event = threading.Event()
    event.clear()
    return event


def make_deduped_on_stage(
    log_fn: LogFn,
    *,
    log_event: str,
) -> Callable[[str, dict[str, Any]], Awaitable[None]]:
    """Return an ``on_stage`` callback that logs each distinct stage once."""
    last_logged_stage = {"value": ""}

    async def on_stage(stage: str, fields: dict[str, Any]) -> None:
        st = (stage or "").strip()
        if not st or st == last_logged_stage["value"]:
            return
        last_logged_stage["value"] = st
        await log_fn(log_event, f"stage={st}", fields=fields)

    return on_stage


def make_verbose_line_logger(
    log_fn: LogFn,
    loop: asyncio.AbstractEventLoop,
    *,
    log_event: str,
    max_len: int = 500,
) -> Callable[[str], None]:
    """Return a thread-safe ``on_verbose_line`` callback for subprocess output."""

    def on_verbose_line(line: str) -> None:
        msg = (line or "").strip()
        if not msg:
            return

        def _schedule() -> None:
            asyncio.create_task(log_fn(log_event, msg[:max_len], level="verbose"))

        loop.call_soon_threadsafe(_schedule)

    return on_verbose_line


def make_state_updating_on_stage(state: dict[str, Any]) -> Callable[[str, dict[str, Any]], None]:
    """Return ``on_stage`` that mutates install state (voice engine path)."""

    def on_stage(stage: str, fields: dict[str, Any]) -> None:
        state["stage"] = stage
        if fields.get("progress_pct") is not None:
            state["progress_pct"] = fields["progress_pct"]

    return on_stage


def make_local_ollama_setup_hooks(
    plugin: Any,
    loop: asyncio.AbstractEventLoop,
    *,
    stage_log_event: str = "local_setup.stage",
    line_log_event: str = "local_setup.line",
) -> tuple[Callable[[str, dict[str, Any]], Awaitable[None]], Callable[[str], None]]:
    """Deduped stage logger + verbose line logger for local Ollama setup jobs."""
    log_fn = plugin._maybe_app_log
    on_stage = make_deduped_on_stage(log_fn, log_event=stage_log_event)
    on_verbose_line = make_verbose_line_logger(log_fn, loop, log_event=line_log_event)
    return on_stage, on_verbose_line
