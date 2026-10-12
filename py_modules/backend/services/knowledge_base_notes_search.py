"""Title: Finding a word in the knowledge library's notes, for the Search tab

Purpose: The Search tab lists the notes the offline knowledge library holds that
mention a word the person picked ("mantis" finds the Mantis Lords note), under the
heading "Game and help notes". This file does that lookup: a plain keyword pass over
the library's full-text index, up to twelve notes, each with its name, kind, game, a
short piece of text around the word, and the note's own words for the screen to show
when the person presses A on it.

Used for: `search_rag_corpus_notes()`, the plugin method of the same name in main.py
(through rag_corpus_rpc.py). `search_notes()` is the part that touches the database and
is what the tests call.

Solves: The screen needs one answer it can draw without a second trip: whether the
library is installed at all (the group is simply absent when it is not), and for each
note whether the person's own word is in its *name*. A note found only by its text may
be a boss the person never named, so the screen shows it under a neutral title until
they open it. `name_matches` is that flag, worked out by the same full-text index (so
"Mantis" and "mantises" fold alike), not by a second guess at stemming.

Does not: Rank by meaning, call the AI, or write anything. It reuses the Ask search's
word handling and its section query (knowledge_base_search.py) unchanged, and it opens
the library read-only the way the chip lookup does.
"""

from __future__ import annotations

import asyncio
import re
import sqlite3
from typing import Any

from backend.services.knowledge_base_cards import _get_connection, close_connection
from backend.services.knowledge_base_game_match import _resolve_game_id
from backend.services.knowledge_base_schema import resolve_corpus_db_path
from backend.services.knowledge_base_search import _fts_match_query, _search_sections

import decky

logger = decky.logger

MAX_NOTES = 12
SNIPPET_CHARS = 140
TEXT_CHARS = 4000
# Fetch a few more than we return so a note whose name holds the word is never cut by the
# keyword ranking's own order; the name matches are put first below.
_FETCH_NOTES = 24

NOT_INSTALLED_REASON = "The knowledge library is not installed."
UNKNOWN_GAME_REASON = "The knowledge library has no notes for that game."
FAILED_REASON = "The knowledge library could not be searched."

_last_fault = ""


def _answer(*, ok=True, installed=True, notes=None, reason="") -> dict[str, Any]:
    out: dict[str, Any] = {
        "ok": ok,
        "installed": installed,
        "notes": notes or [],
        "reason": reason,
    }
    if not ok:
        out["error"] = reason
        out["code"] = "search_failed"
    return out


def _snippet(text: str, tokens: list[str]) -> str:
    """About SNIPPET_CHARS characters of the note around the first place a word appears."""
    flat = re.sub(r"\s+", " ", text or "").strip()
    if not flat:
        return ""
    at = -1
    for tok in tokens:
        # The index stems words, so also try the word without a plural or -ing/-ed ending.
        forms = [tok] + [tok[: -len(end)] for end in ("es", "s", "ing", "ed") if tok.endswith(end) and len(tok) - len(end) >= 4]
        for form in forms:
            hit = re.search(re.escape(form), flat, re.IGNORECASE)
            if hit and (at < 0 or hit.start() < at):
                at = hit.start()
                break
    if len(flat) <= SNIPPET_CHARS:
        return flat
    start = max(0, at - SNIPPET_CHARS // 3) if at >= 0 else 0
    end = min(len(flat), start + SNIPPET_CHARS)
    start = max(0, end - SNIPPET_CHARS)
    piece = flat[start:end].strip()
    return ("…" if start > 0 else "") + piece + ("…" if end < len(flat) else "")


def _ids_with_word_in_name(conn: sqlite3.Connection, fts_q: str, ids: list[int]) -> set[int]:
    """The notes among ``ids`` whose *name* holds the word, as the full-text index folds it."""
    if not ids:
        return set()
    marks = ",".join("?" for _ in ids)
    rows = conn.execute(
        f"SELECT rowid FROM sections_fts WHERE sections_fts MATCH ? AND rowid IN ({marks})",
        (f"name : ({fts_q})", *ids),
    ).fetchall()
    return {int(r[0]) for r in rows}


def search_notes(settings: dict, word: str, game_title: str = "") -> dict[str, Any]:
    """Look the word up in the installed library; the shape is the Search tab's contract."""
    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return _answer(installed=False, reason=NOT_INSTALLED_REASON)
    word = str(word or "").strip()
    game_title = str(game_title or "").strip()
    fts_q = _fts_match_query(word)
    if not fts_q:
        return _answer()
    try:
        conn = _get_connection(db_path)
        game_id = None
        if game_title:
            game_id, _how = _resolve_game_id(
                conn, app_id="", app_name=game_title, shortcut_name=""
            )
            if game_id is None:
                return _answer(reason=UNKNOWN_GAME_REASON)
        cards = _search_sections(
            conn, game_id=game_id, query=word, top_k=_FETCH_NOTES, min_relevance=0.0
        )
        named = _ids_with_word_in_name(conn, fts_q, [c.section_id for c in cards])
    except sqlite3.Error:
        close_connection(db_path)
        raise
    tokens = re.findall(r'"([^"]+)"', fts_q)
    # Name matches first (the ranking inside each half is the keyword ranking's own).
    ordered = sorted(cards, key=lambda c: c.section_id not in named)[:MAX_NOTES]
    notes = [
        {
            "name": c.name,
            "kind": c.section_type,
            "game_title": c.game_title,
            "snippet": _snippet(c.card, tokens),
            "text": (c.card or "")[:TEXT_CHARS],
            "name_matches": c.section_id in named,
        }
        for c in ordered
    ]
    return _answer(notes=notes)


async def search_rag_corpus_notes(self, word: str = "", game_title: str = ""):
    """Notes in the installed knowledge library that mention ``word`` (Search tab)."""
    global _last_fault
    try:
        settings = await self.load_settings()
        out = await asyncio.to_thread(search_notes, settings, word, game_title)
    except Exception as exc:
        # Once per distinct fault: the screen asks again on every word the person picks.
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("search_rag_corpus_notes failed (%s)", fault)
        _last_fault = fault
        return _answer(ok=False, installed=True, reason=FAILED_REASON)
    _last_fault = ""
    return out
