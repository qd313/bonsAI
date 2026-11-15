"""Title: A mod's load-order rule, read from the knowledge library

Purpose: The knowledge library can hold LOOT's load-order rules for Fallout 4 and Skyrim Special
Edition (what a plugin needs, what it must load after, what it is marked as not working with),
filed per game. This file reads one back: `rag_corpus_load_order_entry()` takes a game and a mod's
file name or plain name and returns that mod's rule, with the date of LOOT's list, or nothing.
`rag_corpus_load_order_game_key()` turns a game given as a key, a Steam id or a title into the key
the library files its rules under.

Used for: Nothing on the Deck calls it yet. The lane that attaches a rule to a typed question (and
scripts/kb/check_load_order.py's tests) will read through it.

Solves: One agreed way to find a rule: names compared without case, file ending, spaces or
underscores (the same key the builder filed them under), a pattern entry matched as a pattern over
the whole name, a plain entry found before any pattern. A library built before the table existed has
no `load_order_rules` table at all; the plugin never rewrites an installed library, so that case is
read as "no rule" and is never an error (docs/lessons-learned.md, section 2).

Does not: Search by meaning, rank, call the AI, check anyone's own load order or write anything. It
opens the library read-only through this thread's own connection (never one shared between threads,
the way every other library read has done since 2026-11-11) and never raises.
"""

from __future__ import annotations

import json
import re
import sqlite3
from typing import Any, Optional

from backend.knowledge.knowledge_base_cards import _get_connection, close_connection
from backend.knowledge.knowledge_base_schema import load_order_name_key, normalize_alias, resolve_corpus_db_path

import decky

logger = decky.logger

# The longest name worth looking up; anything longer is not a mod's file name, and a pattern is never run on it.
MAX_NAME_CHARS = 200
_PLUGIN_ENDINGS = (".esp", ".esm", ".esl")
# A name that already ends like a file (".esp", ".txt") is matched as given; a plain name gets each plugin ending tried.
_FILE_ENDING = re.compile(r"\.[A-Za-z]{2,4}$")

_GAME_KEYS = {
    "fallout4": "fallout4",
    "377160": "fallout4",
    "fallout 4": "fallout4",
    "fallout 4 game of the year edition": "fallout4",
    "skyrimse": "skyrimse",
    "489830": "skyrimse",
    "skyrim special edition": "skyrimse",
    "skyrim se": "skyrimse",
    "skyrim anniversary edition": "skyrimse",
    "the elder scrolls v skyrim special edition": "skyrimse",
}

_last_fault = ""


def rag_corpus_load_order_game_key(game: Any) -> Optional[str]:
    """The key the library files a game's rules under ("fallout4" or "skyrimse"), or None."""
    return _GAME_KEYS.get(normalize_alias(str(game or "")))


def _json_list(raw: Any) -> list[Any]:
    try:
        parsed = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def _pattern_matches(pattern: str, name: str) -> bool:
    """True when the whole of ``name`` (a plain name: with a plugin ending added) fits ``pattern``."""
    candidates = [name]
    if not _FILE_ENDING.search(name):
        candidates += [name + ending for ending in _PLUGIN_ENDINGS]
    try:
        compiled = re.compile(pattern, re.IGNORECASE)
    except re.error:
        return False
    return any(compiled.fullmatch(c) for c in candidates)


_COLUMNS = (
    "SELECT r.name, r.is_pattern, r.plugin_group, r.after, r.requires, r.incompatible, r.messages, "
    "s.game_key, s.commit_hash, s.commit_date "
    "FROM load_order_rules r JOIN load_order_sources s ON s.game_key = r.game_key "
)


def _entry_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "game": str(row["game_key"]),
        "name": str(row["name"]),
        "is_pattern": bool(row["is_pattern"]),
        "group": row["plugin_group"],
        "after": _json_list(row["after"]),
        "requires": _json_list(row["requires"]),
        "incompatible": _json_list(row["incompatible"]),
        "messages": _json_list(row["messages"]),
        "list_date": str(row["commit_date"]),
        "commit": str(row["commit_hash"]),
    }


def _find(db_path: str, game_key: str, name: str) -> Optional[dict[str, Any]]:
    conn = _get_connection(db_path)
    has_table = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'load_order_rules'"
    ).fetchone()
    if not has_table:
        return None
    row = conn.execute(
        _COLUMNS + "WHERE r.game_key = ? AND r.is_pattern = 0 AND r.name_key = ? ORDER BY r.rule_id LIMIT 1",
        (game_key, load_order_name_key(name)),
    ).fetchone()
    if row is not None:
        return _entry_dict(row)
    for pattern_row in conn.execute(
        _COLUMNS + "WHERE r.game_key = ? AND r.is_pattern = 1 ORDER BY r.rule_id", (game_key,)
    ):
        if _pattern_matches(str(pattern_row["name"]), name):
            return _entry_dict(pattern_row)
    return None


def rag_corpus_load_order_entry(settings: Any, game: Any, name: Any) -> Optional[dict[str, Any]]:
    """LOOT's rule for ``name`` in ``game``, or None.

    ``game`` is a key, a Steam id or a title; ``name`` is a plugin's file name or a mod's plain name.
    Returns None for no library, the library switched off, an older library with no such table, an
    unknown game, an empty or overlong name, a mod the list has no rule for, and a damaged file
    (logged once per distinct fault, the way the glossary does). Never raises.
    """
    global _last_fault
    game_key = rag_corpus_load_order_game_key(game)
    text = str(name or "").strip()
    if game_key is None or not text or len(text) > MAX_NAME_CHARS or not isinstance(settings, dict):
        return None
    db_path = resolve_corpus_db_path(settings)
    if not db_path or settings.get("use_local_knowledge_base") is not True:
        return None
    try:
        return _find(db_path, game_key, text)
    except sqlite3.Error as exc:
        close_connection(db_path)
        fault = f"{type(exc).__name__}: {exc}"
        if fault != _last_fault:
            logger.warning("load-order rule lookup failed (%s)", fault)
        _last_fault = fault
        return None
