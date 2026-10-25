"""Title: Suggesting a good answer as a tip for the knowledge library

Purpose: Turns an answer a person liked into a proposed library note and saves it as a small file on
their Desktop, with a link to send it in. The file is one section row in the library's own shape
(the five fields a note needs), so whoever reads it can paste it into the notes with little editing.
The text starts "Suggested by a player on <date>:" and names no source, because nothing here was
copied from a page.

Used for: the `suggest_rag_corpus_tip` plugin method in knowledge/rag_corpus_rpc.py, behind the "Suggest as a tip"
button under a finished answer. That method checks the Desktop permission first; this file does not.

Solves: A good answer could not be turned into a proposed note. Now one press writes it down and
shows where to send it, with no network call from the Deck (the Deck has no browser in the panel,
so the link is shown as text).

Does not: Check the Desktop permission (the plugin method does), send anything anywhere, pick the
library's own section number or game number (the maintainer assigns both, so both are 0 here), or
judge whether the tip is true.

How it works:
 1. `build_tip_record()` cleans the answer (control characters out, at most 700 characters), takes
    a name of under 60 characters from the question, and returns the five-field row.
 2. `suggest_tip_sync()` makes the file name from the game's name and the UTC date and time and
    nothing else, so neither the question nor the answer can ever become part of a path.
 3. The folder is `Desktop/bonsAI_logs/suggested-tips`, the same notes folder the Desktop writer
    uses. Its real path is checked to be inside that folder before and after links are followed,
    and the file is created with "x" so a second tip in the same second never overwrites the first.
 4. The record goes out through the JSON writer, never pasted together as text.
 5. The link is the fixed new-issue address plus a URL-encoded title and nothing from the answer.

Gotchas:
 - A hostile game name is cut down to letters, digits and dashes (at most 40) before it touches a
   path; a name with no usable letters becomes "game".
 - The question does reach the issue title and the card, as the player's own words. It never
   reaches a file name.
 - The error on a failed write never carries the real path (the shared Desktop writer's rule).
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from backend.notes.desktop_note_service import (
    _desktop_write_failure_result,
    _is_path_under,
    resolve_bonsai_logs_dir,
)

TIP_FOLDER_NAME = "suggested-tips"
ISSUE_NEW_URL = "https://github.com/qd313/bonsAI/issues/new"
VALID_KINDS = frozenset({"mechanic", "boss", "item", "area", "enemy"})
DEFAULT_KIND = "mechanic"
MAX_CARD_CHARS = 700
MAX_NAME_CHARS = 59
MAX_FILE_GAME_CHARS = 40
# Anything past this is never read: a stray huge answer must not make the clean-up slow.
_MAX_ANSWER_READ = 8000
_MAX_QUESTION_READ = 600
_MAX_GAME_READ = 200
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_ENTRY_ATTEMPTS = 20


def _clean_text(raw: Any, limit: int) -> str:
    """Plain text with control characters out and runs of blank lines squeezed; newlines kept."""
    text = "" if raw is None else str(raw)[:limit]
    text = _CONTROL_RE.sub("", text.replace("\r\n", "\n").replace("\r", "\n"))
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _one_line(raw: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", _clean_text(raw, limit)).strip()


def _cut(text: str, limit: int) -> str:
    """At most `limit` characters, ending on a word when there is one near the end."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    space = cut.rfind(" ")
    if space >= limit * 0.6:
        cut = cut[:space]
    return cut.rstrip(" ,;:-") + "…"


def _tip_name(question: str, game_name: str) -> str:
    name = _cut(_one_line(question, _MAX_QUESTION_READ), MAX_NAME_CHARS)
    if name:
        return name
    return f"{game_name} tip" if game_name else "Suggested tip"


def build_tip_record(
    question: str,
    answer: str,
    app_id: str,
    app_name: str,
    kind: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """The five-field section row for this answer. Raises ValueError for an empty answer."""
    body = _clean_text(answer, _MAX_ANSWER_READ)
    if not body:
        raise ValueError("There is no answer text to suggest.")
    when = (now or datetime.now(timezone.utc)).strftime("%Y-%m-%d")
    game = _one_line(app_name, _MAX_GAME_READ)
    steam_id = str(app_id or "").strip()
    game_line = ""
    if game:
        game_line = f"Game: {game}" + (f" (Steam app {steam_id})" if steam_id.isdigit() else "")
    elif steam_id.isdigit():
        game_line = f"Game: Steam app {steam_id}"
    head = f"Suggested by a player on {when}:\n" + (game_line + "\n" if game_line else "")
    card = head + _cut(body, max(MAX_CARD_CHARS - len(head), 0))
    section_type = kind if kind in VALID_KINDS else DEFAULT_KIND
    return {
        "section_id": 0,
        "game_id": 0,
        "section_type": section_type,
        "name": _tip_name(question, game),
        "card": card[:MAX_CARD_CHARS],
    }


def _game_slug(app_name: str) -> str:
    """Letters, digits and dashes, lower-cased, at most 40 characters; "game" when nothing is left."""
    slug = re.sub(r"[^a-z0-9]+", "-", str(app_name or "").lower()[:_MAX_GAME_READ]).strip("-")
    return slug[:MAX_FILE_GAME_CHARS].strip("-") or "game"


def _issue_url(name: str) -> str:
    return f"{ISSUE_NEW_URL}?title={quote('Suggested tip: ' + name, safe='')}"


def _failure(error: str) -> dict[str, Any]:
    return {"ok": False, "file": "", "issue_url": "", "error": error}


def _write_unique(tip_dir_real: str, stem: str, payload: str) -> str:
    """Create `<stem>.json` (or `<stem>-2.json`, ...) inside the folder, never overwriting. Returns its name."""
    for attempt in range(1, _ENTRY_ATTEMPTS + 1):
        name = f"{stem}.json" if attempt == 1 else f"{stem}-{attempt}.json"
        target = os.path.normpath(os.path.join(tip_dir_real, name))
        if not _is_path_under(tip_dir_real, target):
            raise ValueError("Resolved path escapes the notes directory.")
        try:
            with open(target, "x", encoding="utf-8") as f:
                f.write(payload)
        except FileExistsError:
            continue
        return name
    raise OSError("Could not find a free file name.")


def suggest_tip_sync(
    home: str,
    question: str,
    answer: str,
    app_id: str,
    app_name: str,
    kind: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Write the suggestion file. Answers {ok, file, issue_url, error}; never raises."""
    try:
        moment = now or datetime.now(timezone.utc)
        record = build_tip_record(question, answer, app_id, app_name, kind, moment)
        logs_real = os.path.realpath(resolve_bonsai_logs_dir(home))
        os.makedirs(logs_real, exist_ok=True)
        tip_dir = os.path.normpath(os.path.join(logs_real, TIP_FOLDER_NAME))
        if not _is_path_under(logs_real, tip_dir):
            raise ValueError("Resolved path escapes the notes directory.")
        os.makedirs(tip_dir, exist_ok=True)
        tip_dir_real = os.path.realpath(tip_dir)
        if not _is_path_under(logs_real, tip_dir_real):
            raise ValueError("Resolved path escapes the notes directory.")
        stem = f"{_game_slug(app_name)}-{moment.strftime('%Y%m%d-%H%M%S')}"
        name = _write_unique(tip_dir_real, stem, json.dumps(record, ensure_ascii=False, indent=2) + "\n")
        return {"ok": True, "file": name, "issue_url": _issue_url(record["name"]), "error": ""}
    except (OSError, ValueError) as exc:
        failed = _desktop_write_failure_result(exc)
        return _failure(str(failed.get("error") or "Could not save the tip."))
