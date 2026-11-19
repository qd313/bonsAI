"""Title: Giving the disk space back when a model download is cancelled

Purpose: A cancelled `ollama pull` leaves what it had fetched in the models folder: `sha256-<digest>-partial`
files (and `-partial-N` pieces) and any layer that had already finished, as a whole file no installed model
uses. This file notes which files the blobs folder holds just before a model's download starts and, when that
download ends as cancelled, deletes every file that was not there before, so the space is free again and a
later download of that model starts from zero.

Used for: run_local_setup in local_ollama_setup_service.py (it wraps each model download and cleans up at the
end of a run that was cancelled by a person).

Solves: A cancelled download taking disk space for good on a Deck with little to spare.

Does not: Delete anything that was in the blobs folder before the download began, anything outside the blobs
folder, anything that is not a `sha256-` file, or anything after a download that finished or failed without a
Cancel (a finished model is whole and working). Does nothing when the folder cannot be read. Does not run when
the plugin is unloading or the run's task was cancelled (a reload carries the download on from its part).

How it works: `PullLeftovers.wrap()` returns the download function with a note taken before each call; the note
is dropped again unless that call ended because of the Cancel. After the run's status already says "cancelled",
`clean_up()` deletes the new files, then keeps looking for a short while: the Ollama server may write for a
moment after the download program is ended, so it deletes again whatever reappears and returns once nothing
new has shown up for SETTLE_SECONDS (or MAX_SECONDS have passed). It never raises.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Callable, Optional

SETTLE_SECONDS = 1.5
POLL_SECONDS = 0.25
MAX_SECONDS = 6.0
_BLOB_PREFIX = "sha256-"


def models_folder() -> Path:
    """The models folder the run logs: OLLAMA_MODELS if set, else ~/.ollama/models."""
    return Path(os.environ.get("OLLAMA_MODELS") or str(Path.home() / ".ollama" / "models"))


def _blob_names(blobs: Path) -> Optional[set[str]]:
    """Names of the `sha256-` files directly inside `blobs`; None when the folder cannot be read."""
    try:
        return {e.name for e in os.scandir(blobs) if e.name.startswith(_BLOB_PREFIX) and e.is_file(follow_symlinks=False)}
    except OSError:
        return None


def remove_new_blobs(blobs: Path, before: set[str]) -> None:
    """Delete every blob not in `before`, again and again until none has appeared for SETTLE_SECONDS."""
    try:
        end = time.monotonic() + MAX_SECONDS
        quiet_since: Optional[float] = None
        while time.monotonic() < end:
            names = _blob_names(blobs)
            if names is None:
                return
            fresh = names - before
            now = time.monotonic()
            if fresh:
                quiet_since = None
                for name in fresh:
                    try:
                        (blobs / name).unlink()
                    except OSError:
                        pass
            elif quiet_since is None:
                quiet_since = now
            elif now - quiet_since >= SETTLE_SECONDS:
                return
            time.sleep(POLL_SECONDS)
    except Exception:
        return


class PullLeftovers:
    def __init__(self) -> None:
        self._blobs: Optional[Path] = None
        self._before: Optional[set[str]] = None

    def wrap(
        self, pull: Callable[[str], tuple[bool, str]], cancelled: Callable[[], bool]
    ) -> Callable[[str], tuple[bool, str]]:
        """`pull` with the folder noted before each call; the note stays only if that call ended cancelled."""

        def run(tag: str) -> tuple[bool, str]:
            self._blobs = models_folder() / "blobs"
            self._before = _blob_names(self._blobs)
            ok, err = pull(tag)
            if ok or not cancelled():
                self._before = None
            return ok, err

        return run

    def clean_up(self) -> None:
        """Delete what the cancelled download left. Call it only after the status says "cancelled"."""
        blobs, before = self._blobs, self._before
        self._before = None
        if blobs is not None and before is not None:
            remove_new_blobs(blobs, before)
