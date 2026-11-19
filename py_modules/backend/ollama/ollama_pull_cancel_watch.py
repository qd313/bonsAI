"""Title: Ending a model download the moment Cancel is pressed

Purpose: `ollama pull` prints nothing while it looks a model up or while the connection stalls, so a loop
that reads its output only learns about a Cancel when the next line arrives. This file runs a small watcher
beside the download that looks at the Cancel flag about five times a second and ends the program when it is
set, whether or not the program is printing.

Used for: run_ollama_pull in local_ollama_setup_service.py.

Solves: The Cancel button on a model download sitting on "Stopping" for as long as Ollama stayed quiet.

Does not: Decide what a cancelled download returns (the caller does), delete what Ollama already fetched
(ollama_cancelled_pull_cleanup.py does that, once the run's status says "cancelled"), or touch a program
that has already finished.

How it works: used as `with CancelWatch(proc, cancelled) as watch:`. The watcher thread wakes every
POLL_SECONDS; if the program has ended it quits, if Cancel is set it asks the program to stop, waits one
second, then kills it, and records that it did (`watch.fired`). Leaving the `with` stops the watcher and
waits for it, so it never outlives the call.
"""

from __future__ import annotations

import subprocess
import threading
from typing import Callable

POLL_SECONDS = 0.2
KILL_AFTER_SECONDS = 1.0


class CancelWatch:
    def __init__(self, proc: "subprocess.Popen[str]", cancelled: Callable[[], bool]) -> None:
        self._proc = proc
        self._cancelled = cancelled
        self._done = threading.Event()
        self._thread = threading.Thread(target=self._run, name="ollama-pull-cancel-watch", daemon=True)
        self.fired = False

    def __enter__(self) -> "CancelWatch":
        self._thread.start()
        return self

    def __exit__(self, *_exc: object) -> None:
        self._done.set()
        self._thread.join(KILL_AFTER_SECONDS + 5)

    def _run(self) -> None:
        while not self._done.wait(POLL_SECONDS):
            if self._proc.poll() is not None:
                return
            if self._cancelled():
                self.fired = True
                self._end()
                return

    def _end(self) -> None:
        try:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=KILL_AFTER_SECONDS)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        except OSError:
            pass
