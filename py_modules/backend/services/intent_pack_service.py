"""Offline search intent packs: load, sanitize, merge, and persist user/bundled alias packs."""

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
    """Load allowlisted navigation targets; keep in sync with src/data/settingsDatabase.ts."""
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
    """Read intent packs from disk; seed bundled defaults when missing."""
    try:
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
            store = ensure_bundled_intent_packs(raw)
            return sanitize_intent_pack_store(store)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        if logger is not None:
            logger.warning("load_intent_packs: failed to read %s: %s", path, exc)
    store = default_bundled_store()
    save_intent_packs(path, store, settings_dir=os.path.dirname(path), logger=logger)
    return store


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


def _term_owner_map(store: dict[str, Any]) -> dict[str, str]:
    """Map normalized alias/synonym term -> target path across all packs."""
    owners: dict[str, str] = {}
    for pack in store.get("packs") or []:
        if not isinstance(pack, dict):
            continue
        for entry in pack.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            target = entry.get("target")
            if not isinstance(target, str):
                continue
            for key in ("aliases", "synonyms"):
                for term in entry.get(key) or []:
                    if isinstance(term, str) and term not in owners:
                        owners[term] = target
    return owners


def _merge_entry_terms(
    existing: dict[str, Any],
    incoming: dict[str, Any],
    conflicts: list[dict[str, str]],
) -> dict[str, Any]:
    owners: dict[str, str] = {}
    for key in ("aliases", "synonyms"):
        for term in existing.get(key) or []:
            if isinstance(term, str):
                owners[term] = str(existing.get("target", ""))
    merged = {
        "target": existing["target"],
        "aliases": list(existing.get("aliases") or []),
        "synonyms": list(existing.get("synonyms") or []),
        "expansions": list(existing.get("expansions") or []),
    }
    for key in ("aliases", "synonyms", "expansions"):
        existing_terms = set(merged[key])
        for term in incoming.get(key) or []:
            if not isinstance(term, str) or term in existing_terms:
                continue
            if key in ("aliases", "synonyms"):
                owner = owners.get(term)
                if owner and owner != merged["target"]:
                    conflicts.append(
                        {
                            "term": term,
                            "existing_target": owner,
                            "incoming_target": incoming.get("target", ""),
                        }
                    )
                    continue
                owners[term] = merged["target"]
            merged[key].append(term)
            existing_terms.add(term)
    return merged


def _merge_pack_entries(
    existing_pack: dict[str, Any],
    incoming_pack: dict[str, Any],
    conflicts: list[dict[str, str]],
) -> tuple[dict[str, Any], int]:
    """Merge entries by target path."""
    by_target: dict[str, dict[str, Any]] = {}
    for entry in existing_pack.get("entries") or []:
        if isinstance(entry, dict) and isinstance(entry.get("target"), str):
            by_target[entry["target"]] = entry
    added = 0
    for entry in incoming_pack.get("entries") or []:
        if not isinstance(entry, dict) or not isinstance(entry.get("target"), str):
            continue
        target = entry["target"]
        if target in by_target:
            by_target[target] = _merge_entry_terms(by_target[target], entry, conflicts)
        else:
            by_target[target] = entry
            added += 1
    merged_pack = {
        **existing_pack,
        "label": incoming_pack.get("label") or existing_pack.get("label"),
        "updated_at": incoming_pack.get("updated_at") or existing_pack.get("updated_at"),
        "entries": list(by_target.values())[:MAX_ENTRIES_PER_PACK],
    }
    return merged_pack, added


def parse_import_payload(raw_json: str) -> tuple[dict[str, Any] | None, str | None]:
    """Parse clipboard/file JSON into a single pack object."""
    if not isinstance(raw_json, str):
        return None, "Expected JSON string"
    if len(raw_json.encode("utf-8")) > MAX_IMPORT_JSON_BYTES:
        return None, "Import payload too large"
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON: {exc}"
    if isinstance(parsed, dict) and isinstance(parsed.get("pack"), dict):
        parsed = parsed["pack"]
    if not isinstance(parsed, dict):
        return None, "Expected a pack object with id, label, and entries"
    return parsed, None


def _strip_global_term_conflicts(
    pack: dict[str, Any],
    store: dict[str, Any],
    conflicts: list[dict[str, str]],
) -> dict[str, Any]:
    """Remove alias/synonym terms that already map to a different target in store."""
    owners = _term_owner_map(store)
    entries_out: list[dict[str, Any]] = []
    for entry in pack.get("entries") or []:
        if not isinstance(entry, dict) or not isinstance(entry.get("target"), str):
            continue
        target = entry["target"]
        cleaned = {
            "target": target,
            "aliases": [],
            "synonyms": [],
            "expansions": list(entry.get("expansions") or []),
        }
        has_direct = False
        for key in ("aliases", "synonyms"):
            for term in entry.get(key) or []:
                if not isinstance(term, str):
                    continue
                owner = owners.get(term)
                if owner and owner != target:
                    conflicts.append(
                        {
                            "term": term,
                            "existing_target": owner,
                            "incoming_target": target,
                        }
                    )
                    continue
                cleaned[key].append(term)
                owners[term] = target
                has_direct = True
        expansions = entry.get("expansions") or []
        if expansions:
            cleaned["expansions"] = [t for t in expansions if isinstance(t, str)]
            if cleaned["expansions"]:
                has_direct = True
        if has_direct:
            entries_out.append(cleaned)
    if not entries_out:
        return pack
    return {**pack, "entries": entries_out}


def merge_import_pack(
    store: dict[str, Any],
    incoming_raw: dict[str, Any],
    *,
    confirm: bool = False,
) -> dict[str, Any]:
    """
    Dry-run or apply import merge.

    Returns dict with ok, store (if confirm), pack preview, conflicts, stats, error.
    """
    valid_targets = load_valid_search_targets()
    incoming = _sanitize_pack(incoming_raw, valid_targets)
    if not incoming:
        return {"ok": False, "error": "No valid entries after validation (check targets and terms)"}
    incoming = {**incoming, "source": "imported"}
    base = sanitize_intent_pack_store(store)
    conflicts: list[dict[str, str]] = []
    stats = {"added_entries": 0, "merged_entries": 0, "conflicts": 0}
    pack_id = incoming["id"]
    existing_idx = next(
        (i for i, p in enumerate(base.get("packs") or []) if isinstance(p, dict) and p.get("id") == pack_id),
        None,
    )
    if existing_idx is None:
        incoming = _strip_global_term_conflicts(incoming, base, conflicts)
        if not incoming.get("entries"):
            return {"ok": False, "error": "No valid entries after conflict resolution"}
        stats["added_entries"] = len(incoming.get("entries") or [])
        preview_store = {
            **base,
            "packs": list(base.get("packs") or []) + [incoming],
        }
    else:
        existing_pack = base["packs"][existing_idx]
        merged_pack, added = _merge_pack_entries(existing_pack, incoming, conflicts)
        existing_targets = {
            e.get("target") for e in existing_pack.get("entries") or [] if isinstance(e, dict)
        }
        for entry in incoming.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            target = entry.get("target")
            if isinstance(target, str) and target in existing_targets:
                stats["merged_entries"] += 1
        stats["added_entries"] = added
        packs = list(base.get("packs") or [])
        packs[existing_idx] = merged_pack
        preview_store = {**base, "packs": packs}
    stats["conflicts"] = len(conflicts)
    preview_pack = next(
        (p for p in preview_store.get("packs") or [] if isinstance(p, dict) and p.get("id") == pack_id),
        incoming,
    )
    result: dict[str, Any] = {
        "ok": True,
        "pack": preview_pack,
        "conflicts": conflicts,
        "stats": stats,
        "dry_run": not confirm,
    }
    if confirm:
        result["store"] = sanitize_intent_pack_store(preview_store)
    return result


def export_pack(store: dict[str, Any], pack_id: str) -> dict[str, Any]:
    """Export a single pack as JSON string."""
    if not isinstance(pack_id, str) or not pack_id.strip():
        return {"ok": False, "error": "pack_id required"}
    pack_id = pack_id.strip()
    for pack in store.get("packs") or []:
        if isinstance(pack, dict) and pack.get("id") == pack_id:
            exportable = {
                "id": pack.get("id"),
                "label": pack.get("label"),
                "enabled": pack.get("enabled"),
                "source": pack.get("source"),
                "updated_at": pack.get("updated_at"),
                "entries": pack.get("entries"),
            }
            return {"ok": True, "json": json.dumps(exportable, indent=2, ensure_ascii=False)}
    return {"ok": False, "error": f"Pack not found: {pack_id}"}


def set_pack_enabled(store: dict[str, Any], pack_id: str, enabled: bool) -> dict[str, Any]:
    """Toggle pack enabled flag."""
    if not isinstance(pack_id, str) or not pack_id.strip():
        return {"ok": False, "error": "pack_id required"}
    pack_id = pack_id.strip()
    base = sanitize_intent_pack_store(store)
    found = False
    packs: list[dict[str, Any]] = []
    for pack in base.get("packs") or []:
        if not isinstance(pack, dict):
            continue
        if pack.get("id") == pack_id:
            pack = {**pack, "enabled": bool(enabled)}
            found = True
        packs.append(pack)
    if not found:
        return {"ok": False, "error": f"Pack not found: {pack_id}"}
    return {"ok": True, "store": {**base, "packs": packs}}


def remove_pack(store: dict[str, Any], pack_id: str) -> dict[str, Any]:
    """Remove imported/user pack; bundled packs cannot be removed."""
    if not isinstance(pack_id, str) or not pack_id.strip():
        return {"ok": False, "error": "pack_id required"}
    pack_id = pack_id.strip()
    if pack_id in BUNDLED_PACK_IDS:
        return {"ok": False, "error": "Bundled packs cannot be removed (disable instead)"}
    base = sanitize_intent_pack_store(store)
    packs = [p for p in base.get("packs") or [] if isinstance(p, dict) and p.get("id") != pack_id]
    if len(packs) == len(base.get("packs") or []):
        return {"ok": False, "error": f"Pack not found: {pack_id}"}
    return {"ok": True, "store": {**base, "packs": packs}}


def reset_intent_packs_file(path: str, settings_dir: str, logger: Any = None) -> dict[str, Any]:
    """Delete store and re-seed bundled defaults (clear_plugin_data)."""
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    store = default_bundled_store()
    return save_intent_packs(path, store, settings_dir=settings_dir, logger=logger)
