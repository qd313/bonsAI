"""Title: Making settings search understand more words than the exact label

Purpose: When you use the search box to find a setting, this is what lets a
search for a word like "mic" find the Voice settings even though the setting
itself is only labeled "Voice". It stores small lists of extra words --
other names, related words, and phrases that expand into a search term --
that each point at a specific place in the settings, both the lists the
plugin ships with and ones kept on this install. It
never talks to the AI or the internet; it is a local list to match words
against.

Used for: The settings-search feature. main.py calls the load and save
functions here; the
screen itself does the actual word matching against these lists at search
time (src/features/search-tab/intentPackSearch.ts).

Solves: Keeping these lists safe to load even if hand-edited or imported from
somewhere untrusted: a bad or oversized file cannot crash the plugin, an
unknown target cannot be pointed at, and importing a pack that already
shares some of the same words does something sensible rather than silently
overwriting one setting's word with another's.

Does not: Search anything itself, or touch the AI -- the screen does the
actual matching, reading the packs this file supplies.

How it works:
 1. Every list ("pack") is a JSON object mapping which words point at which
    settings target, kept in intent_packs.json. `load_intent_packs()` reads
    it, or creates it from the packs the plugin ships with
    (`default_bundled_store()`) the first time there is no file yet.
 2. Every pack passes through `sanitize_intent_pack_store()` before it is
    trusted: a target has to be one of the allowed navigation targets
    (`load_valid_search_targets()`, kept in step with the same list the
    screen uses), and every entry, pack, and store is capped in size so a
    corrupted or unfriendly file cannot blow up the search index.
 3. `ensure_bundled_intent_packs()` re-adds a built-in pack if it is ever
    missing, without touching any pack the person has added or edited
    themselves.
 4. `save_intent_packs()` writes the cleaned-up store to a temporary file and
    only swaps it into place once the write has finished, the same
    crash-safe pattern used elsewhere in the plugin.

Gotchas:
 - `BUNDLED_PACK_IDS` lists the packs the plugin ships with.
 - A saved file that has grown past the size limit is not read at all.
   `load_intent_packs()` falls back to the packs the plugin ships with,
   kept only in memory, rather than trying to parse an oversized file -- but
   it leaves the oversized file itself untouched on disk.
"""

from __future__ import annotations

import json
import os
import re
from datetime import date
from pathlib import Path
from typing import Any

INTENT_PACKS_FILENAME = "intent_packs.json"
SCHEMA_VERSION = 1
MAX_PACKS = 32
MAX_ENTRIES_PER_PACK = 200
MAX_TERMS_PER_ENTRY = 24
MAX_TERM_LEN = 64
MAX_LABEL_LEN = 80
MIN_QUERY_LEN = 2
PACK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
VALID_SOURCES = frozenset({"bundled", "imported", "user"})
BUNDLED_PACK_IDS = frozenset({"deck-basics"})
MAX_IMPORT_JSON_BYTES = 512_000

_valid_targets_cache: frozenset[str] | None = None


def _plugin_root() -> Path:
    """Plugin install root (main.py directory)."""
    return Path(__file__).resolve().parents[3]


def intent_packs_path(settings_dir: str) -> str:
    return os.path.join(settings_dir, INTENT_PACKS_FILENAME)


def load_valid_search_targets() -> frozenset[str]:
    """Load allowlisted navigation targets; keep in sync with src/features/search-tab/settingsDatabase.ts."""
    global _valid_targets_cache
    if _valid_targets_cache is not None:
        return _valid_targets_cache
    candidates = [
        _plugin_root() / "data" / "settings-search-targets.json",
    ]
    for path in candidates:
        try:
            if path.is_file():
                raw = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(raw, list):
                    targets = frozenset(str(t).strip() for t in raw if isinstance(t, str) and t.strip())
                    if targets:
                        _valid_targets_cache = targets
                        return _valid_targets_cache
        except (OSError, json.JSONDecodeError, ValueError):
            continue
    _valid_targets_cache = frozenset()
    return _valid_targets_cache


def _empty_store() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "packs": []}


def _normalize_term(term: str) -> str:
    return term.strip().lower()[:MAX_TERM_LEN]


def _sanitize_terms(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        norm = _normalize_term(item)
        if len(norm) < MIN_QUERY_LEN or norm in seen:
            continue
        seen.add(norm)
        out.append(norm)
        if len(out) >= MAX_TERMS_PER_ENTRY:
            break
    return out


def _sanitize_entry(raw: Any, valid_targets: frozenset[str]) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    target = raw.get("target")
    if not isinstance(target, str):
        return None
    target = target.strip()
    if target not in valid_targets:
        return None
    aliases = _sanitize_terms(raw.get("aliases"))
    synonyms = _sanitize_terms(raw.get("synonyms"))
    expansions = _sanitize_terms(raw.get("expansions"))
    if not aliases and not synonyms and not expansions:
        return None
    return {
        "target": target,
        "aliases": aliases,
        "synonyms": synonyms,
        "expansions": expansions,
    }


def _sanitize_pack(raw: Any, valid_targets: frozenset[str]) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    pack_id = raw.get("id")
    if not isinstance(pack_id, str) or not PACK_ID_RE.match(pack_id.strip()):
        return None
    pack_id = pack_id.strip()
    label = raw.get("label")
    if not isinstance(label, str) or not label.strip():
        label = pack_id
    label = label.strip()[:MAX_LABEL_LEN]
    source = raw.get("source")
    if not isinstance(source, str) or source.strip() not in VALID_SOURCES:
        source = "imported"
    else:
        source = source.strip()
    enabled = raw.get("enabled") is not False
    updated_at = raw.get("updated_at")
    if not isinstance(updated_at, str) or not updated_at.strip():
        updated_at = str(date.today())
    else:
        updated_at = updated_at.strip()[:32]
    entries_out: list[dict[str, Any]] = []
    for item in raw.get("entries") if isinstance(raw.get("entries"), list) else []:
        entry = _sanitize_entry(item, valid_targets)
        if entry:
            entries_out.append(entry)
        if len(entries_out) >= MAX_ENTRIES_PER_PACK:
            break
    if not entries_out:
        return None
    return {
        "id": pack_id,
        "label": label,
        "enabled": enabled,
        "source": source,
        "updated_at": updated_at,
        "entries": entries_out,
    }


def sanitize_intent_pack_store(raw: Any) -> dict[str, Any]:
    """Normalize full store payload."""
    if not isinstance(raw, dict):
        return _empty_store()
    valid_targets = load_valid_search_targets()
    packs_out: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for item in raw.get("packs") if isinstance(raw.get("packs"), list) else []:
        pack = _sanitize_pack(item, valid_targets)
        if not pack or pack["id"] in seen_ids:
            continue
        seen_ids.add(pack["id"])
        packs_out.append(pack)
        if len(packs_out) >= MAX_PACKS:
            break
    try:
        version = int(raw.get("schema_version") or SCHEMA_VERSION)
    except (TypeError, ValueError):
        version = SCHEMA_VERSION
    return {"schema_version": version, "packs": packs_out}


def load_bundled_pack_file(pack_id: str) -> dict[str, Any] | None:
    """Read a bundled pack JSON from data/intent-packs/."""
    path = _plugin_root() / "data" / "intent-packs" / f"{pack_id}.json"
    try:
        if not path.is_file():
            return None
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return None
        if "id" not in raw:
            raw = {**raw, "id": pack_id}
        valid = load_valid_search_targets()
        return _sanitize_pack(raw, valid)
    except (OSError, json.JSONDecodeError, ValueError):
        return None


def default_bundled_store() -> dict[str, Any]:
    """Store containing shipped bundled packs only."""
    packs: list[dict[str, Any]] = []
    for pack_id in sorted(BUNDLED_PACK_IDS):
        pack = load_bundled_pack_file(pack_id)
        if pack:
            packs.append({**pack, "source": "bundled", "enabled": True})
    return {"schema_version": SCHEMA_VERSION, "packs": packs}


def ensure_bundled_intent_packs(store: dict[str, Any]) -> dict[str, Any]:
    """Add missing bundled pack ids without clobbering user edits."""
    sanitized = sanitize_intent_pack_store(store)
    existing = {p["id"]: p for p in sanitized.get("packs") or []}
    changed = False
    for pack_id in BUNDLED_PACK_IDS:
        if pack_id in existing:
            continue
        bundled = load_bundled_pack_file(pack_id)
        if bundled:
            existing[pack_id] = {**bundled, "source": "bundled", "enabled": True}
            changed = True
    if not changed:
        return sanitized
    packs = list(existing.values())
    packs.sort(key=lambda p: (0 if p.get("source") == "bundled" else 1, p.get("id", "")))
    return {"schema_version": SCHEMA_VERSION, "packs": packs[:MAX_PACKS]}


def load_intent_packs(path: str, logger: Any = None) -> dict[str, Any]:
    """Read intent packs from disk; seed bundled defaults only when the file is missing."""
    if not os.path.isfile(path):
        store = default_bundled_store()
        save_intent_packs(path, store, settings_dir=os.path.dirname(path), logger=logger)
        return store
    try:
        size = os.path.getsize(path)
        if size > MAX_IMPORT_JSON_BYTES:
            if logger is not None:
                logger.warning(
                    "load_intent_packs: %s exceeds %d bytes (%d); using bundled defaults in memory (file preserved)",
                    path,
                    MAX_IMPORT_JSON_BYTES,
                    size,
                )
            return ensure_bundled_intent_packs(default_bundled_store())
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        store = ensure_bundled_intent_packs(raw)
        return sanitize_intent_pack_store(store)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        if logger is not None:
            logger.warning(
                "load_intent_packs: failed to read %s: %s; using bundled defaults in memory (file preserved)",
                path,
                exc,
            )
        return ensure_bundled_intent_packs(default_bundled_store())


def save_intent_packs(
    path: str,
    store: dict[str, Any],
    *,
    settings_dir: str,
    logger: Any = None,
) -> dict[str, Any]:
    """Atomic write of sanitized intent pack store."""
    sanitized = sanitize_intent_pack_store(store)
    try:
        os.makedirs(settings_dir, exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
        return sanitized
    except OSError as exc:
        if logger is not None:
            logger.exception("save_intent_packs: failed to write %s", path)
        raise RuntimeError(f"Failed to save intent packs: {exc}") from exc


def pack_summaries(store: dict[str, Any]) -> list[dict[str, Any]]:
    """Lightweight list for Settings UI."""
    out: list[dict[str, Any]] = []
    for pack in store.get("packs") or []:
        if not isinstance(pack, dict):
            continue
        entries = pack.get("entries") if isinstance(pack.get("entries"), list) else []
        out.append(
            {
                "id": pack.get("id", ""),
                "label": pack.get("label", ""),
                "enabled": pack.get("enabled") is not False,
                "source": pack.get("source", "imported"),
                "entry_count": len(entries),
                "updated_at": pack.get("updated_at"),
            }
        )
    return out


def reset_intent_packs_file(path: str, settings_dir: str, logger: Any = None) -> dict[str, Any]:
    """Delete store and re-seed bundled defaults (clear_plugin_data)."""
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    store = default_bundled_store()
    return save_intent_packs(path, store, settings_dir=settings_dir, logger=logger)
