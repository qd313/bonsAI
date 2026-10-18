"""Title: Picking a model download back up after the plugin reloads

Purpose: A model download that was running when the plugin reloaded used to die with it (a
reload at 16% killed the pull; asking again resumed from the partial file). This keeps a small
note on disk while a download runs, and when the plugin loads again it starts the noted download
again by itself -- resuming from the partial file, exactly as asking again does.
Used for: ollama_local_setup_rpc.py (writes the note when a download starts, clears it when the
download ends any way other than the plugin going away, and starts the noted download again on
load) and main.py (marks the plugin as unloading, and asks for the resume on load).
Solves: A plugin reload silently dropping a download the person had started.
Does not: Run the download itself (ollama_local_setup_rpc.py's own start functions do, so the
screen's normal download status shows the restarted one), and never restarts a download the
person cancelled, one that finished or failed (their note is cleared), one that already came
back twice (a pull that keeps dying must not loop across reloads), or a note older than half
a day.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Optional

NOTE_FILENAME = "pull_in_flight.json"
# A download restarted this many times already is dropped instead of tried again: a pull that
# keeps being killed (or a plugin that keeps reloading) must not loop forever.
MAX_AUTOMATIC_RESTARTS = 2
MAX_NOTE_AGE_SECONDS = 12 * 3600

_unloading = False


def mark_unloading(value: bool = True) -> None:
    """Called first thing when the plugin unloads (and cleared when it loads), so the download's
    own cleanup can tell "the plugin is going away" from "the person cancelled"."""
    global _unloading
    _unloading = bool(value)


def is_unloading() -> bool:
    return _unloading


def note_path(settings_dir: str) -> str:
    return os.path.join(settings_dir, NOTE_FILENAME)


def write_note(settings_dir: str, *, profile: str, tags: list[str]) -> None:
    """Note a download that just started. A note for the same download that is already there
    (one this very restart came from) keeps its restart count, so the count can add up."""
    previous = read_note(settings_dir, now=None)
    same = previous is not None and previous["profile"] == profile and previous["tags"] == list(tags)
    note = {
        "profile": profile,
        "tags": list(tags),
        "started_at": previous["started_at"] if same and previous else time.time(),
        "restarts": previous["restarts"] if same and previous else 0,
    }
    _write(settings_dir, note)


def _write(settings_dir: str, note: dict[str, Any]) -> None:
    try:
        os.makedirs(settings_dir, exist_ok=True)
        tmp = note_path(settings_dir) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(note, fh)
        os.replace(tmp, note_path(settings_dir))
    except OSError:
        pass  # the note is a convenience; a download must never fail because it could not be saved


def read_note(settings_dir: str, *, now: Optional[float] = None) -> Optional[dict[str, Any]]:
    """The noted download, or None when there is none, it is unreadable, or it is too old."""
    try:
        with open(note_path(settings_dir), encoding="utf-8") as fh:
            raw = json.load(fh)
    except (OSError, ValueError):
        return None
    if not isinstance(raw, dict):
        return None
    profile = str(raw.get("profile") or "").strip()
    tags = raw.get("tags")
    if not profile or not isinstance(tags, list):
        return None
    tags = [str(t).strip() for t in tags if str(t).strip()]
    if profile == "custom" and not tags:
        return None
    try:
        started_at = float(raw.get("started_at") or 0)
        restarts = int(raw.get("restarts") or 0)
    except (TypeError, ValueError):
        return None
    if now is not None and now - started_at > MAX_NOTE_AGE_SECONDS:
        return None
    return {"profile": profile, "tags": tags, "started_at": started_at, "restarts": restarts}


def clear_note(settings_dir: str) -> None:
    try:
        os.remove(note_path(settings_dir))
    except OSError:
        pass


def clear_note_unless_unloading(settings_dir: str) -> None:
    """A download ended: forget it -- unless it ended only because the plugin is going away."""
    if not _unloading:
        clear_note(settings_dir)


async def resume_interrupted_download(
    plugin: Any, settings_dir: str, rpc: Any, *, delay_seconds: float = 3.0
) -> str:
    """On load: start again the download that was running when the plugin last went away.

    Returns what happened, for the log and the tests: "none", "expired", "gave_up", "refused",
    "started". The download goes through the same start functions the screen's buttons use, so
    its status is the screen's normal download status. ``rpc`` is ollama_local_setup_rpc, handed
    in by the caller because that module imports this one (importing it back would be a cycle).
    """
    import asyncio

    mark_unloading(False)
    note = read_note(settings_dir, now=time.time())
    if note is None:
        if not os.path.exists(note_path(settings_dir)):
            return "none"
        clear_note(settings_dir)  # unreadable or too old: never look at it again
        return "expired"
    if note["restarts"] >= MAX_AUTOMATIC_RESTARTS:
        clear_note(settings_dir)
        await plugin._maybe_app_log(
            "local_setup.resume", "gave up", fields={"profile": note["profile"], "restarts": note["restarts"]}
        )
        return "gave_up"
    if delay_seconds:
        await asyncio.sleep(delay_seconds)
    # Counted before the start, so a start that crashes the plugin again is still counted.
    _write(settings_dir, {**note, "restarts": note["restarts"] + 1})
    if note["profile"] == "custom":
        out = await rpc.pull_ollama_models(plugin, list(note["tags"]))
    else:
        out = await rpc.start_local_ollama_setup(plugin, {"profile": note["profile"]})
    accepted = bool(isinstance(out, dict) and out.get("accepted"))
    await plugin._maybe_app_log(
        "local_setup.resume",
        "download restarted" if accepted else "restart refused",
        fields={"profile": note["profile"], "accepted": accepted, "restarts": note["restarts"] + 1},
    )
    if not accepted:
        clear_note(settings_dir)
        return "refused"
    return "started"
