"""Title: The notes and tips a person has ranked lower

Purpose: Remembers, in one small file beside the settings, which knowledge-base notes and shared
tips the person marked "wrong tip", "outdated" or "wrong edition" under an answer. One entry per
note or tip: how many times, why, and when. Reads it fast (cached until the file changes), adds
or takes back one mark, and says how many marks a note or tip holds.

Used for: The ranking rule in knowledge_base_service.py (a marked note comes behind unmarked
ones; a note with three marks is left out), the "Show details" tag for a lowered note
(kb_attached_notes.py), and the plugin method that records or undoes a mark (rag_corpus_rpc.py).

Solves: A note that was wrong for a question came back next time all the same, because nothing
remembered the thumbs-down. The numbers a note and a tip carry overlap (162 are in both lists), so
every entry is keyed by kind and number together, "note:123" or "tip:123".

Does not: Decide what a mark means for ranking -- `apply_demotes` below does, and only reorders or
drops cards. Send anything anywhere; the file stays on the device. Raise: a damaged file reads as
empty (logged once) and the next mark rewrites it cleanly; a write that fails answers not-ok.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

STORE_FILENAME = "rag_demote.json"
STORE_VERSION = 1
# Three marks and the note is left out of what a question can attach; one or two only move it
# behind every unmarked rival.
EXCLUDE_AT_DOWNS = 3
VALID_REASONS = frozenset({"wrong_tip", "outdated", "wrong_edition"})
VALID_KINDS = frozenset({"note", "tip"})
# A hand-edited file cannot make a count absurd.
_MAX_DOWNS = 99

_lock = threading.Lock()
# (path, mtime_ns, size) of the last read -> the parsed {(kind, id): downs} map.
_cache: dict[str, Any] = {"key": None, "downs": {}}
_warned_keys: set[tuple[str, int, int]] = set()


def _log() -> Any:
    try:
        import decky  # type: ignore[import-not-found]

        return decky.logger
    except Exception:  # noqa: BLE001 -- a missing or half-built decky never stops a question
        return logging.getLogger("bonsai.kb_demote")


def _settings_dir() -> str:
    try:
        import decky  # type: ignore[import-not-found]

        return str(decky.DECKY_PLUGIN_SETTINGS_DIR or "")
    except Exception:  # noqa: BLE001
        return ""


def store_path() -> str:
    folder = _settings_dir()
    return os.path.join(folder, STORE_FILENAME) if folder else ""


def forget_cache() -> None:
    """Drop what was read, so the next read goes to the file. Tests use it between cases."""
    with _lock:
        _cache["key"] = None
        _cache["downs"] = {}
        _warned_keys.clear()


def _entry_key(kind: str, section_id: int) -> str:
    return f"{kind}:{section_id}"


def _clean_downs(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int) or raw <= 0:
        return 0
    return min(raw, _MAX_DOWNS)


def _parse_entry_key(key: Any) -> Optional[tuple[str, int]]:
    if not isinstance(key, str) or ":" not in key:
        return None
    kind, _, number = key.partition(":")
    if kind not in VALID_KINDS or not number.isdigit():
        return None
    value = int(number)
    return (kind, value) if value > 0 else None


def _read_document(path: str) -> dict[str, Any]:
    """The file's content as a clean document, or an empty one when it is missing, damaged or
    from a version this build does not know. Logs a damaged file once per change of that file."""
    empty: dict[str, Any] = {"version": STORE_VERSION, "notes": {}}
    try:
        stat = os.stat(path)
    except OSError:
        return empty
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        data = None
    notes = data.get("notes") if isinstance(data, dict) else None
    if not isinstance(notes, dict) or (isinstance(data, dict) and data.get("version") != STORE_VERSION):
        warn_key = (path, stat.st_mtime_ns, stat.st_size)
        if warn_key not in _warned_keys:
            _warned_keys.add(warn_key)
            _log().warning("kb demote: %s is damaged or from another version; reading it as empty", STORE_FILENAME)
        return empty
    return {"version": STORE_VERSION, "notes": notes}


def _downs_map(path: str) -> dict[tuple[str, int], int]:
    """{(kind, id): downs} for every entry with at least one mark, cached by file time."""
    if not path:
        return {}
    try:
        stat = os.stat(path)
    except OSError:
        with _lock:
            _cache["key"] = None
            _cache["downs"] = {}
        return {}
    key = (path, stat.st_mtime_ns, stat.st_size)
    with _lock:
        if _cache["key"] == key:
            return _cache["downs"]
        document = _read_document(path)
        downs: dict[tuple[str, int], int] = {}
        for raw_key, entry in document["notes"].items():
            parsed = _parse_entry_key(raw_key)
            count = _clean_downs(entry.get("downs")) if isinstance(entry, dict) else 0
            if parsed is not None and count:
                downs[parsed] = count
        _cache["key"] = key
        _cache["downs"] = downs
        return downs


def downs_for(ids: Iterable[tuple[str, int]]) -> dict[tuple[str, int], int]:
    """The marks held for each of ``ids`` ((kind, number) pairs); ones with none are left out.
    An empty or missing store answers ``{}`` after one file-time check."""
    held = _downs_map(store_path())
    if not held:
        return {}
    return {pair: held[pair] for pair in ids if pair in held}


def has_any_downs() -> bool:
    return bool(_downs_map(store_path()))


def _write_document(path: str, document: dict[str, Any]) -> None:
    folder = os.path.dirname(path)
    os.makedirs(folder, exist_ok=True)
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        json.dump(document, fh, separators=(",", ":"))
    os.replace(tmp_path, path)


def record_demote(section_id: Any, kind: Any, reason: Any, undo: bool = False) -> dict[str, Any]:
    """Add one mark for a note or tip, or take the newest one back.

    Answers ``{ok, downs, excluded}``: the marks it holds now and whether that is enough to leave
    it out of answers. Anything unexpected answers ``{"ok": False, "error": ...}``; nothing is
    written then. Taking back a mark from an entry that holds none is a quiet ``downs: 0``.
    """
    if isinstance(section_id, bool) or not isinstance(section_id, int) or section_id <= 0:
        return {"ok": False, "error": "Invalid section_id."}
    if kind not in VALID_KINDS:
        return {"ok": False, "error": "Invalid kind."}
    if reason not in VALID_REASONS:
        return {"ok": False, "error": "Invalid reason."}
    path = store_path()
    if not path:
        return {"ok": False, "error": "No settings folder."}
    entry_key = _entry_key(kind, section_id)
    try:
        with _lock:
            document = _read_document(path)
            notes = document["notes"]
            entry = notes.get(entry_key) if isinstance(notes.get(entry_key), dict) else None
            reasons = [r for r in (entry or {}).get("reasons", []) if r in VALID_REASONS]
            downs = _clean_downs((entry or {}).get("downs"))
            if undo:
                if downs > 0:
                    downs -= 1
                    reasons = reasons[:downs]
            else:
                downs = min(downs + 1, _MAX_DOWNS)
                reasons = (reasons + [reason])[-downs:]
            if downs > 0:
                notes[entry_key] = {
                    "downs": downs,
                    "reasons": reasons,
                    "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
            else:
                notes.pop(entry_key, None)
            if undo and entry is None:
                return {"ok": True, "downs": 0, "excluded": False}
            _write_document(path, document)
            _cache["key"] = None
    except (OSError, ValueError, TypeError) as exc:
        return {"ok": False, "error": str(exc)}
    return {"ok": True, "downs": downs, "excluded": downs >= EXCLUDE_AT_DOWNS}
