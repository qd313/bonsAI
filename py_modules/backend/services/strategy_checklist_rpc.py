"""Title: The three RPCs behind the Strategy checklist's own memory

Purpose: A Strategy or Expert answer can come with a checklist, and the game remembers
which boxes you ticked the next time you ask about it. This file is the three calls the
screen makes for that: read the saved checklist for a game, save it after a tick, and
clear it. Each one stays a method of the same name on the plugin class in main.py; the
method's body is now a one-line hand-off to the function here.

Used for: get_strategy_checklist_session, save_strategy_checklist_session,
clear_strategy_checklist_session.

Solves: Keeps the checklist panel's own request/response shape checking out of main.py,
next to the store-lock pattern the other small per-feature stores in this plugin already
use.

Does not: Own the file the checklist is written to, or the merge rules for one entry --
`strategy_checklist_session_service.py` does both. This file only checks a request's
shape, takes the lock, and calls that service.
"""

import asyncio
from typing import Any

from backend.services.strategy_checklist_session_service import (
    clear_session_entry,
    get_session_entry,
    rpc_entry_to_store_payload,
    save_session_store,
    upsert_session_entry,
)

import decky

logger = decky.logger


async def get_strategy_checklist_session(self, app_id: str = "") -> Any:
    """Return persisted checklist for the given game AppID (or generic bucket when empty)."""
    store = self._load_strategy_checklist_store()
    entry = get_session_entry(store, app_id)
    if entry is None:
        return None
    return {
        "app_id": str(app_id or "").strip(),
        "app_name": entry.get("app_name", ""),
        "title": entry.get("title", ""),
        "items": entry.get("items") or [],
        "checked_ids": entry.get("checked_ids") or [],
        "updated_at": entry.get("updated_at"),
    }


async def save_strategy_checklist_session(self, payload: Any = None) -> dict:
    """Persist checklist + checked state for one game bucket."""
    if not isinstance(payload, dict):
        return {"ok": False, "error": "Invalid payload"}
    app_id = str(payload.get("app_id") or payload.get("appId") or "").strip()
    frag = rpc_entry_to_store_payload(payload)
    if frag is None:
        return {"ok": False, "error": "Invalid checklist payload"}
    if not hasattr(self, "_strategy_checklist_store_lock"):
        self._strategy_checklist_store_lock = asyncio.Lock()
    async with self._strategy_checklist_store_lock:
        store = self._load_strategy_checklist_store()
        merged = upsert_session_entry(
            store,
            app_id=app_id,
            app_name=str(payload.get("app_name") or payload.get("appName") or frag.get("app_name") or ""),
            title=frag["title"],
            items=frag["items"],
            checked_ids=frag.get("checked_ids"),
        )
        save_session_store(
            self._strategy_checklist_session_path(),
            merged,
            settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
            logger=logger,
        )
        entry = get_session_entry(merged, app_id)
        return {"ok": True, "entry": entry}


async def clear_strategy_checklist_session(self, app_id: str = "") -> dict:
    """Remove persisted checklist for one game or entire file when app_id omitted."""
    if not hasattr(self, "_strategy_checklist_store_lock"):
        self._strategy_checklist_store_lock = asyncio.Lock()
    async with self._strategy_checklist_store_lock:
        path = self._strategy_checklist_session_path()
        store = self._load_strategy_checklist_store()
        if str(app_id or "").strip():
            merged = clear_session_entry(store, app_id)
        else:
            merged = clear_session_entry(store, None)
        save_session_store(path, merged, settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR, logger=logger)
        return {"ok": True}
