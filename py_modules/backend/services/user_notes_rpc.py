"""Title: List, save and remove your notes

Purpose: The three calls the screen makes to manage the notes bonsAI was asked to remember: see
them all, add or change one, and remove one. Each stays a method of the same name on the plugin
class in main.py; the method's body is a one-line hand-off to the function here. Every answer is
in the house shape: ``{"ok": true, ...}``, or ``{"ok": false, "error": "<plain words>", "code":
"<one word>"}`` for a refusal.

Used for: list_user_notes, save_user_note, delete_user_note.

Solves: Keeps these bodies -- taking the store lock, doing the file work off the event loop, and
turning a refusal into words a person can read -- out of main.py, which is at its size limit.

Does not: Own the file's shape or the rules for what a note may be -- that is
``user_notes_service.py``. It does not decide which notes an Ask reads either.
"""

import asyncio
from typing import Any

from backend.services.user_notes_service import (
    UserNoteError,
    delete_note,
    load_notes,
    save_note,
)

import decky

logger = decky.logger


def _refusal(exc: UserNoteError) -> dict[str, Any]:
    return {"ok": False, "error": str(exc), "code": exc.code}


async def list_user_notes(self):
    """Every note, newest first."""
    settings_dir = self._chat_slots_settings_dir()
    async with self._chat_slots_store_lock:
        notes = await asyncio.to_thread(load_notes, settings_dir, logger)
    return {"ok": True, "notes": notes}


async def save_user_note(self, payload: Any = None):
    """Add a note (empty ``id``) or change the keys sent for one that exists."""
    settings_dir = self._chat_slots_settings_dir()
    try:
        async with self._chat_slots_store_lock:
            note = await asyncio.to_thread(save_note, settings_dir, payload, logger)
    except UserNoteError as exc:
        return _refusal(exc)
    return {"ok": True, "note": note}


async def delete_user_note(self, note_id: str = ""):
    """Remove one note by id."""
    settings_dir = self._chat_slots_settings_dir()
    try:
        async with self._chat_slots_store_lock:
            await asyncio.to_thread(delete_note, settings_dir, note_id, logger)
    except UserNoteError as exc:
        return _refusal(exc)
    return {"ok": True}
