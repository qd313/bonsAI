"""Title: The running game's tap-to-define words, read from the knowledge library

Purpose: Some games have jargon the AI uses without explaining ("kiting" and "overclock" in
Deep Rock Galactic: Survivor). The knowledge library keeps a short peek and a full definition for
each such word, filed under its game. This file reads them back: `glossary_for_game()` is the one
reader, and `get_rag_corpus_glossary()` is the screen's call that wraps it.

Used for: `get_rag_corpus_glossary()`, the plugin method of the same name in main.py (through
rag_corpus_rpc.py), which the answer screen asks once per game; and the ask path in
ollama_ask_service, which reads the same words to tell the AI they are tap-to-define.

Solves: One agreed answer for both users: whether the library is installed and switched on, the
game's name as the library spells it, and the words. A library built before this table existed has
no `glossary_terms` table at all; the plugin never rewrites an installed library, so that case is
read as "no words" and is never an error (docs/lessons-learned.md, section 2).

Does not: Search, rank, call the AI or write anything. It opens the library read-only the way the
chip and notes lookups do, and it never raises out of the screen's call.
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
from typing import Any

from backend.knowledge.knowledge_base_cards import _get_connection, close_connection
from backend.knowledge.knowledge_base_game_match import _resolve_game_id
from backend.knowledge.knowledge_base_schema import resolve_corpus_db_path

import decky

logger = decky.logger

NOT_INSTALLED_REASON = "The knowledge library is not installed."
FAILED_REASON = "The knowledge library's glossary could not be read."

_last_fault = ""


def _answer(*, ok=True, installed=True, game_title="", terms=None, reason="") -> dict[str, Any]:
    out: dict[str, Any] = {
        "ok": ok,
        "installed": installed,
        "game_title": game_title,
        "terms": terms or [],
        "reason": reason,
    }
    if not ok:
        out["error"] = reason
        out["code"] = "glossary_failed"
    return out


def _alt_forms(raw: Any) -> list[str]:
    """The stored JSON list of other spellings; anything unreadable counts as none."""
    try:
        parsed = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    if not isinstance(parsed, list):
        return []
    return [str(a) for a in parsed if isinstance(a, str) and a.strip()]


def glossary_for_game(settings: dict, app_id: str = "", app_name: str = "") -> dict[str, Any]:
    """The words for the game, found by app id first and then by name.

    No library, the library switch off, an unknown game, a library built before the glossary
    existed (no table), or a game with no words: all answer ``terms: []`` without an error. Only a
    real fault (a damaged file) raises ``sqlite3.Error`` for the caller to log.
    """
    db_path = resolve_corpus_db_path(settings)
    if not db_path or settings.get("use_local_knowledge_base") is not True:
        return _answer(installed=False, reason=NOT_INSTALLED_REASON)
    try:
        conn = _get_connection(db_path)
        game_id, _how = _resolve_game_id(
            conn, app_id=str(app_id or ""), app_name=str(app_name or ""), shortcut_name=""
        )
        if game_id is None:
            return _answer()
        has_table = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'glossary_terms'"
        ).fetchone()
        if not has_table:
            return _answer()
        rows = conn.execute(
            "SELECT term_key, term, alt_forms, peek, full_text FROM glossary_terms "
            "WHERE game_id = ? ORDER BY term_id",
            (game_id,),
        ).fetchall()
        title_row = conn.execute(
            "SELECT canonical_title FROM games WHERE game_id = ?", (game_id,)
        ).fetchone()
    except sqlite3.Error:
        close_connection(db_path)
        raise
    if not rows:
        return _answer()
    terms = [
        {
            "id": str(r["term_key"]),
            "term": str(r["term"]),
            "alt_forms": _alt_forms(r["alt_forms"]),
            "peek": str(r["peek"]),
            "full": str(r["full_text"]),
        }
        for r in rows
    ]
    return _answer(game_title=str(title_row["canonical_title"] if title_row else ""), terms=terms)


def glossary_for_prompt(settings: dict, app_id: str = "", app_name: str = "") -> tuple[str, list[str]]:
    """The game's title and word spellings for the AI's instructions; ("", []) on any trouble.

    A word list is a nicety: a damaged library must never stop an answer, so a fault is logged
    once per distinct fault and read as "no words".
    """
    global _last_fault
    try:
        out = glossary_for_game(settings, app_id, app_name)
    except Exception as exc:
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("glossary for the AI's instructions failed (%s)", fault)
        _last_fault = fault
        return "", []
    return str(out.get("game_title") or ""), [str(t["term"]) for t in out["terms"]]


async def get_rag_corpus_glossary(self, app_id: str = ""):
    """The tap-to-define words the knowledge library holds for this game (answer screen)."""
    global _last_fault
    try:
        settings = await self.load_settings()
        out = await asyncio.to_thread(glossary_for_game, settings, app_id)
    except Exception as exc:
        # Once per distinct fault: the screen asks again after a failure.
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("get_rag_corpus_glossary failed (%s)", fault)
        _last_fault = fault
        return _answer(ok=False, installed=True, reason=FAILED_REASON)
    _last_fault = ""
    return out
