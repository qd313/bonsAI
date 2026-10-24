#!/usr/bin/env python3
"""Title: Keep awake

Purpose: Stop this Windows PC going to sleep while a long session runs, for a set number of hours,
    then let it sleep normally again. Holds the same request a video player or the Claude Code
    desktop app holds (SetThreadExecutionState, "the system is needed"); the screen may still turn
    off. Changes no Windows setting, so there is nothing to put back: ending the program (Ctrl+C,
    closing its window, or the time running out) drops the request.

Used for: `python scripts/keep_awake.py --hours 8`, started in the background at the start of any
    long or unattended session run from the VS Code extension (the desktop app keeps the PC awake by
    itself while a session runs). AGENTS.md, 'Long sessions', says when.

Solves: On 2026-09-27 (plan 70) the PC slept around 01:05 during an overnight session; a Deck check
    froze for almost four hours and looked like the Deck tools had hung. Earlier sessions each wrote
    a one-off keep-awake into their own scratch folder, so the next session had to remember to write
    it again.

Does not: Keep the Steam Deck awake (the Deck tools' own hold does that), wake a PC that is already
    asleep, or do anything on a system other than Windows -- there it says so and exits.
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timedelta
from typing import Callable

ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
MIN_HOURS = 0.1
MAX_HOURS = 24.0


def clamp_hours(hours: float) -> float:
    return max(MIN_HOURS, min(MAX_HOURS, float(hours)))


def hold(
    hours: float,
    *,
    set_state: Callable[[int], int],
    sleep: Callable[[float], None] = time.sleep,
    now: Callable[[], float] = time.monotonic,
    step_seconds: float = 60.0,
) -> bool:
    """Hold the request for ``hours``, then release it. False when Windows refused the hold.

    Sleeps in short steps so Ctrl+C lands promptly; the release runs however the wait ends.
    """
    if set_state(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) == 0:
        return False
    try:
        end = now() + clamp_hours(hours) * 3600
        while True:
            left = end - now()
            if left <= 0:
                break
            sleep(min(step_seconds, left))
    finally:
        set_state(ES_CONTINUOUS)
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Keep this Windows PC awake for a set time.")
    parser.add_argument(
        "--hours", type=float, default=8.0, help=f"how long ({MIN_HOURS} to {MAX_HOURS}, default 8)"
    )
    args = parser.parse_args(argv)
    if sys.platform != "win32":
        print("keep_awake: this only works on Windows; nothing to do here.")
        return 0
    import ctypes

    set_state = ctypes.windll.kernel32.SetThreadExecutionState
    set_state.restype = ctypes.c_uint32
    hours = clamp_hours(args.hours)
    until = (datetime.now() + timedelta(hours=hours)).strftime("%H:%M")
    print(f"keep_awake: holding this PC awake until about {until} (Ctrl+C to stop sooner).", flush=True)
    try:
        ok = hold(hours, set_state=lambda flags: set_state(ctypes.c_uint32(flags)))
    except KeyboardInterrupt:
        print("keep_awake: stopped; the PC can sleep normally again.")
        return 0
    if not ok:
        print("keep_awake: Windows refused the request; the PC can still sleep.")
        return 1
    print("keep_awake: time is up; the PC can sleep normally again.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
