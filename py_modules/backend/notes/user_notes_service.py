"""Title: The notes you asked bonsAI to remember

Purpose: Your own notes ("I'm doing a Steel Soul run", "no spoilers past the City of Tears")
live in one small file, user_notes.json, in the plugin's settings folder, beside the saved
chats. This file reads that file, adds a note, changes one, removes one, and refuses anything
that would not fit: a text that is empty or over 200 characters, or a 41st note. Nothing is ever
cut or dropped to make room; the person gets a plain sentence and decides.

Used for: The three note calls the screen makes (list_user_notes, save_user_note,
delete_user_note), whose bodies are in user_notes_rpc.py.

Solves: Gives notes one place to be stored crash-safely (a temporary file, then a replace, the
way chats are), so a power cut mid-save leaves the old notes whole. A missing or unreadable file
reads as no notes at all, and the next save writes a good one.

Also here: the rule for which notes one Ask question reads (``pick_notes_for_turn``): the ones
that are on and are for the question's game or for every game, newest first, at most 8 notes and
1,000 characters. ``user_notes_for_ask.py`` runs it for a question; ``build_system_prompt`` puts
the block it returns into the instruction sheet.

Does not: Put notes into the instruction sheet, or offer a note after a question.

A note, as the screen and the back end both see it: ``id`` ("n-" and the milliseconds since
1970 when it was made), ``text`` (1 to 200 characters, trimmed), ``app_id`` ("" or the Steam
app id as digits), ``game_title`` ("" or a display name; an empty ``app_id`` and ``game_title``
together mean every game), ``on`` (true or false), ``created_at`` (ISO 8601 UTC, to the second)
and ``source_turn_id`` ("" or the chat turn it came from).
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

USER_NOTES_FILE = "user_notes.json"
SCHEMA_VERSION = 1
MAX_USER_NOTES = 40
MAX_NOTE_TEXT_LEN = 200
MAX_GAME_TITLE_LEN = 120
MAX_TURN_ID_LEN = 80

# The words a person reads when a save is refused, by the one-word code the screen branches on.
ERROR_WORDS = {
    "too_many": "That's one note too many. Remove one first.",
    "too_long": "A note can be up to 200 characters.",
    "empty": "A note needs some words.",
    "not_found": "That note is gone.",
    "invalid": "That note could not be saved.",
}


class UserNoteError(Exception):
    """A refused save or delete. ``code`` is one of ERROR_WORDS' keys; ``str()`` is the plain words."""

    def __init__(self, code: str) -> None:
        super().__init__(ERROR_WORDS[code])
        self.code = code


def notes_path(settings_dir: str) -> str:
    return os.path.join(settings_dir, USER_NOTES_FILE)


def _id_millis(note_id: str) -> int:
    digits = str(note_id).rpartition("-")[2]
    return int(digits) if digits.isdigit() else 0


def _newest_first(notes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(notes, key=lambda n: (str(n["created_at"]), _id_millis(n["id"])), reverse=True)


def _clean_stored_note(raw: Any) -> Optional[dict[str, Any]]:
    """One note read back from disk, made safe. ``None`` when it is not a usable note."""
    if not isinstance(raw, dict):
        return None
    note_id = str(raw.get("id") or "").strip()
    text = str(raw.get("text") or "").strip()
    if not note_id or not text:
        return None
    app_id = str(raw.get("app_id") or "").strip()
    return {
        "id": note_id,
        "text": text[:MAX_NOTE_TEXT_LEN],
        "app_id": app_id if app_id.isdigit() else "",
        "game_title": str(raw.get("game_title") or "").strip()[:MAX_GAME_TITLE_LEN],
        "on": raw.get("on") is not False,
        "created_at": str(raw.get("created_at") or ""),
        "source_turn_id": str(raw.get("source_turn_id") or "").strip()[:MAX_TURN_ID_LEN],
    }


def load_notes(settings_dir: str, logger: Any = None) -> list[dict[str, Any]]:
    """Every saved note, newest first. A missing, unreadable or odd file is no notes."""
    path = notes_path(settings_dir)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        return []
    except (OSError, ValueError):
        if logger is not None:
            logger.warning("user_notes: %s could not be read; treating it as no notes", path)
        return []
    rows = data.get("notes") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return []
    seen: set[str] = set()
    notes: list[dict[str, Any]] = []
    for raw in rows:
        note = _clean_stored_note(raw)
        if note is not None and note["id"] not in seen:
            seen.add(note["id"])
            notes.append(note)
    return _newest_first(notes)[:MAX_USER_NOTES]


def _write_notes(settings_dir: str, notes: list[dict[str, Any]], logger: Any = None) -> None:
    """Write the whole file crash-safe: a temporary file, flushed to disk, then a replace."""
    path = notes_path(settings_dir)
    tmp = f"{path}.tmp"
    try:
        os.makedirs(settings_dir, exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump({"version": SCHEMA_VERSION, "notes": notes}, fh, indent=2, sort_keys=True)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except OSError as exc:
        if logger is not None:
            logger.exception("user_notes: could not write %s", path)
        raise UserNoteError("invalid") from exc


def _checked_text(value: Any) -> str:
    if not isinstance(value, str):
        raise UserNoteError("invalid")
    text = value.strip()
    if not text:
        raise UserNoteError("empty")
    if len(text) > MAX_NOTE_TEXT_LEN:
        raise UserNoteError("too_long")
    return text


def _checked_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """The note fields present in ``payload``, each checked. Absent keys stay absent."""
    out: dict[str, Any] = {}
    if "text" in payload:
        out["text"] = _checked_text(payload["text"])
    if "app_id" in payload:
        app_id = payload["app_id"]
        if not isinstance(app_id, (str, int)) or isinstance(app_id, bool):
            raise UserNoteError("invalid")
        app_id = str(app_id).strip()
        if app_id and not app_id.isdigit():
            raise UserNoteError("invalid")
        out["app_id"] = app_id
    if "game_title" in payload:
        if not isinstance(payload["game_title"], str):
            raise UserNoteError("invalid")
        out["game_title"] = payload["game_title"].strip()[:MAX_GAME_TITLE_LEN]
    if "on" in payload:
        if not isinstance(payload["on"], bool):
            raise UserNoteError("invalid")
        out["on"] = payload["on"]
    if "source_turn_id" in payload:
        if not isinstance(payload["source_turn_id"], str):
            raise UserNoteError("invalid")
        out["source_turn_id"] = payload["source_turn_id"].strip()[:MAX_TURN_ID_LEN]
    return out


def _fresh_id(taken: set[str], now_ms: int) -> str:
    """``n-<ms>``; one millisecond later if two notes were made in the same one."""
    while f"n-{now_ms}" in taken:
        now_ms += 1
    return f"n-{now_ms}"


def save_note(
    settings_dir: str, payload: Any, logger: Any = None, now_seconds: Optional[float] = None
) -> dict[str, Any]:
    """Add a note (empty ``id``) or change the keys sent for an existing one. Returns the note.

    Raises ``UserNoteError`` with one of ERROR_WORDS' codes and writes nothing when refused.
    """
    if not isinstance(payload, dict):
        raise UserNoteError("invalid")
    raw_id = payload.get("id") or ""
    if not isinstance(raw_id, str):
        raise UserNoteError("invalid")
    note_id = raw_id.strip()
    fields = _checked_fields(payload)
    notes = load_notes(settings_dir, logger)
    if note_id:
        note = next((n for n in notes if n["id"] == note_id), None)
        if note is None:
            raise UserNoteError("not_found")
        note.update(fields)
    else:
        if "text" not in fields:
            raise UserNoteError("empty")
        if len(notes) >= MAX_USER_NOTES:
            raise UserNoteError("too_many")
        moment = time.time() if now_seconds is None else now_seconds
        note = {
            "id": _fresh_id({n["id"] for n in notes}, int(moment * 1000)),
            "text": fields["text"],
            "app_id": fields.get("app_id", ""),
            "game_title": fields.get("game_title", ""),
            "on": fields.get("on", True),
            "created_at": datetime.fromtimestamp(int(moment), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_turn_id": fields.get("source_turn_id", ""),
        }
        notes.append(note)
    _write_notes(settings_dir, notes, logger)
    return dict(note)


def delete_note(settings_dir: str, note_id: Any, logger: Any = None) -> None:
    """Remove one note. ``UserNoteError("not_found")`` when there is no such note."""
    wanted = str(note_id or "").strip()
    notes = load_notes(settings_dir, logger)
    kept = [n for n in notes if n["id"] != wanted]
    if not wanted or len(kept) == len(notes):
        raise UserNoteError("not_found")
    _write_notes(settings_dir, kept, logger)


# --- What an Ask question reads ------------------------------------------------------------

MAX_NOTES_PER_ASK = 8
MAX_NOTES_CHARS_PER_ASK = 1000
NOTES_BLOCK_HEADING = (
    "The person asked bonsAI to remember these. Treat them as true for this chat and never "
    "contradict them:"
)


@dataclass
class AskNotes:
    """The notes picked for one question: the block for the instruction sheet, the short list the
    Show details record keeps (``id``, ``text``, ``game_title`` for each), and how many notes
    matched the question's game but were switched off."""

    block: str = ""
    attached: list[dict[str, str]] = field(default_factory=list)
    off_count: int = 0

    def record(self) -> dict[str, Any]:
        """The two fields the Show details record always carries."""
        return {"user_notes_attached": list(self.attached), "user_notes_off_count": self.off_count}


def _one_line(text: str) -> str:
    return " ".join(str(text).split())


def _note_applies(note: dict[str, Any], app_id: str, title: str) -> bool:
    """Is this note for the turn's game, or for every game?

    Same Steam app id when both sides have one; otherwise (the turn has no app id, or the note
    was kept under a title only) the same game title, compared without case.
    """
    note_id, note_title = note["app_id"], note["game_title"].casefold()
    if not note_id and not note_title:
        return True
    if note_id and app_id:
        return note_id == app_id
    return bool(title) and note_title == title


def pick_notes_for_turn(notes: list[dict[str, Any]], *, app_id: str, game_title: str) -> AskNotes:
    """The notes an Ask question reads: those that are on and apply, newest first, at most 8
    notes and 1,000 characters of note text in all (a note that would pass the character cap
    ends the list; an older, shorter one never jumps ahead of it).

    ``app_id`` and ``game_title`` are the turn's own: the running game's id and name, or, with
    nothing running, no id and the title the Ask flow worked out from the question's words or the
    chat's own game. Switched-off notes that apply are only counted (``off_count``).
    """
    turn_id = str(app_id or "").strip()
    turn_title = str(game_title or "").strip().casefold()
    applying = [n for n in _newest_first(notes) if _note_applies(n, turn_id, turn_title)]
    chosen: list[dict[str, str]] = []
    used = 0
    for note in applying:
        if not note["on"]:
            continue
        text = _one_line(note["text"])
        if len(chosen) >= MAX_NOTES_PER_ASK or used + len(text) > MAX_NOTES_CHARS_PER_ASK:
            break
        used += len(text)
        chosen.append({"id": note["id"], "text": text, "game_title": note["game_title"]})
    block = "\n".join([NOTES_BLOCK_HEADING, *(f"- {n['text']}" for n in chosen)]) if chosen else ""
    return AskNotes(block=block, attached=chosen, off_count=sum(1 for n in applying if not n["on"]))
