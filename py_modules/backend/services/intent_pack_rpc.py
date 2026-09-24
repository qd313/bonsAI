"""Title: The five settings-search-pack buttons the screen calls

Purpose: This is the code behind the Settings screen's manage-packs panel: list what
packs exist, turn one on or off, export one as JSON, import one from JSON, and remove
one. Every function here is a straight hand-off from a method of the same name on the
plugin class in main.py -- the class keeps the method so the screen's call still works,
and the method's body just calls the matching function here.

Used for: The five RPCs the manage-packs panel calls: get_intent_packs,
set_intent_pack_enabled, export_intent_pack, import_intent_pack, remove_intent_pack.

Solves: Keeps the manage-packs panel's own RPC bodies out of main.py, so that file does
not also have to hold the JSON-shape checking and the per-store lock alongside every
other screen the plugin serves.

Does not: Decide what a pack is or how it is stored on disk -- that is
`intent_pack_service.py`. This file only checks a request's shape, takes the lock, and
calls that service.
"""

import asyncio
from typing import Any

from backend.services.intent_pack_service import (
    export_pack,
    merge_import_pack,
    pack_summaries,
    parse_import_payload,
    remove_pack,
    set_pack_enabled,
)


async def get_intent_packs(self) -> dict:
    """Return intent pack summaries and full entries for unified search indexing."""
    store = self._load_intent_pack_store()
    return {
        "schema_version": store.get("schema_version"),
        "summaries": pack_summaries(store),
        "packs": store.get("packs") or [],
    }


async def set_intent_pack_enabled(self, pack_id: str = "", enabled: bool = True) -> dict:
    """Enable or disable a search intent pack."""
    if not hasattr(self, "_intent_pack_store_lock"):
        self._intent_pack_store_lock = asyncio.Lock()
    async with self._intent_pack_store_lock:
        store = self._load_intent_pack_store()
        result = set_pack_enabled(store, pack_id, enabled)
        if not result.get("ok"):
            return result
        saved = self._save_intent_pack_store(result["store"])
        return {
            "ok": True,
            "summaries": pack_summaries(saved),
            "packs": saved.get("packs") or [],
        }


async def export_intent_pack(self, pack_id: str = "") -> Any:
    """Export one intent pack as formatted JSON."""
    store = self._load_intent_pack_store()
    return export_pack(store, pack_id)


async def import_intent_pack(self, payload: Any = None) -> dict:
    """Dry-run or confirm-merge import of a single intent pack from JSON."""
    data = payload if isinstance(payload, dict) else {}
    raw_json = data.get("json")
    confirm = data.get("confirm") is True
    if not isinstance(raw_json, str) or not raw_json.strip():
        return {"ok": False, "error": "json string required"}
    incoming, parse_error = parse_import_payload(raw_json)
    if parse_error:
        return {"ok": False, "error": parse_error}
    if not hasattr(self, "_intent_pack_store_lock"):
        self._intent_pack_store_lock = asyncio.Lock()
    async with self._intent_pack_store_lock:
        store = self._load_intent_pack_store()
        result = merge_import_pack(store, incoming or {}, confirm=confirm)
        if not result.get("ok"):
            return result
        if confirm and isinstance(result.get("store"), dict):
            saved = self._save_intent_pack_store(result["store"])
            result["summaries"] = pack_summaries(saved)
            result["packs"] = saved.get("packs") or []
        return result


async def remove_intent_pack(self, pack_id: str = "") -> dict:
    """Remove a user/imported intent pack (bundled packs cannot be removed)."""
    if not hasattr(self, "_intent_pack_store_lock"):
        self._intent_pack_store_lock = asyncio.Lock()
    async with self._intent_pack_store_lock:
        store = self._load_intent_pack_store()
        result = remove_pack(store, pack_id)
        if not result.get("ok"):
            return result
        saved = self._save_intent_pack_store(result["store"])
        return {
            "ok": True,
            "summaries": pack_summaries(saved),
            "packs": saved.get("packs") or [],
        }
