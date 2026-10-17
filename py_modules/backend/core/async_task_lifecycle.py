"""Title: Stopping a background task and waiting for it to actually be gone

Purpose: Cancel one background task -- an Ask that is still thinking, the AI engine still
installing, the voice engine still installing -- and wait until it has genuinely finished,
rather than just asking it to stop and moving on.
Used for: The handful of places the plugin's front-door file needs to be sure a background
task has stopped before it does anything else: unloading the plugin, clearing all plugin
data, and cancelling an Ask that is already in flight.
Solves: One correct version of "cancel it, then wait for it, then don't complain when the
cancel shows up as an error", instead of that logic being hand-written again at every one
of those call sites.
Does not: Keep track of which tasks exist, or reset whatever state a stopped task leaves
behind -- both of those stay the caller's job.
"""

import asyncio
from typing import Any, Optional


async def cancel_and_await(task: Optional[Any]) -> bool:
    """Cancel `task` and wait for it to finish. Returns True if a cancel was actually issued.

    Awaiting after cancelling is the part that is easy to get wrong and easy to skip: without it
    the coroutine may not have reached its `finally` blocks by the time the caller resets the
    state the task is still writing to. `CancelledError` from the awaited task is expected and
    swallowed — it means the cancel worked.

    A `None` or already-finished task is a no-op, so callers do not need to guard first.
    """
    if task is None or task.done():
        return False
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    return True
