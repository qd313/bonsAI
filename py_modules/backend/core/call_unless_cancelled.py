"""Title: Stop waiting for a slow lookup the moment Cancel is pressed

Purpose: Some steps of a download are one blocking call that cannot be interrupted (asking a site for
its file list, up to a minute per site). This runs such a call in its own thread and waits for
whichever comes first: its answer, or the Cancel flag. On Cancel it stops waiting at once and lets the
thread finish on its own; whatever that thread later returns or raises is thrown away and never logged.
Used for: the "looking up the newest library" step of the knowledge library download.
Solves: a Cancel that sat on "Stopping the download" for up to two minutes on a slow connection, because
nothing looked at the flag until the lookup came back.
Does not: stop the thread itself (a blocking network call cannot be stopped from outside), and is only
safe for a step that writes nothing, since the abandoned thread may still be running afterwards.
"""

from __future__ import annotations

import asyncio
import threading
from typing import Any, Callable


class CancelledWhileWaiting(RuntimeError):
    """The Cancel flag went up before the call answered."""

    def __init__(self) -> None:
        super().__init__("Cancelled.")


async def call_unless_cancelled(fn: Callable[[], Any], cancel_event: asyncio.Event) -> Any:
    loop = asyncio.get_running_loop()
    answer: asyncio.Future = loop.create_future()

    def deliver(setter: Callable[[Any], None], value: Any) -> None:
        # Once the waiter has given up the future is already done; a late answer or error is dropped
        # here, so no "exception was never retrieved" warning can come from it.
        if not answer.done():
            setter(value)

    def work() -> None:
        try:
            result = fn()
        except BaseException as exc:  # noqa: BLE001 - handed to the waiter, or dropped if abandoned
            outcome: tuple = (answer.set_exception, exc)
        else:
            outcome = (answer.set_result, result)
        try:
            loop.call_soon_threadsafe(deliver, *outcome)
        except RuntimeError:
            pass  # the loop is already closed; nobody is waiting

    # A daemon thread, so an abandoned lookup never holds up the plugin shutting down.
    threading.Thread(target=work, name="call-unless-cancelled", daemon=True).start()

    cancel_wait = asyncio.ensure_future(cancel_event.wait())
    try:
        await asyncio.wait({answer, cancel_wait}, return_when=asyncio.FIRST_COMPLETED)
        if cancel_event.is_set():
            raise CancelledWhileWaiting()
        return answer.result()
    finally:
        cancel_wait.cancel()
        if not answer.done():
            answer.cancel()
