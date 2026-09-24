"""Title: List, open, start, delete and rename a saved chat

Purpose: Saved chats live in their own per-slot files on disk. This file is the five
calls the screen makes to manage that list from outside an open chat: see the recent
chats, open one, start a new empty one, delete one, and rename one. Each stays a method
of the same name on the plugin class in main.py; the method's body is now a one-line
hand-off to the function here.

Used for: list_chat_slots, get_chat_slot, create_chat_slot, delete_chat_slot,
rename_chat_slot.

Solves: Keeps the chat-list panel's own RPC bodies -- reading and writing the store
under its lock, and shaping what goes back to the screen -- out of main.py. Recording a
turn *into* an already-open chat while a question is answered is a different job, done
from inside the Ask flow, and stays there.

Does not: Own the on-disk shape of a chat slot, or append a turn to one -- both are
`chat_slot_service.py`. This file only checks a request's shape, takes the store lock,
and calls that service.
"""

import asyncio
from typing import Any

from backend.services.chat_slot_service import (
    create_slot as chat_create_slot,
    delete_slot as chat_delete_slot,
    list_slot_summaries,
    load_slot as chat_load_slot,
    slot_to_rpc_payload,
    update_slot_label as chat_update_slot_label,
)

import decky

logger = decky.logger


async def list_chat_slots(self) -> dict:
    """Return recent chat slot summaries (newest first)."""
    settings_dir = self._chat_slots_settings_dir()

    def _run() -> list:
        return list_slot_summaries(settings_dir, logger)

    async with self._chat_slots_store_lock:
        rows = await asyncio.to_thread(_run)
    return {"slots": rows}


async def get_chat_slot(self, slot_id: str = "") -> dict:
    """Load one chat slot with full turn history."""
    sid = str(slot_id or "").strip()
    if not sid:
        return {"ok": False, "error": "Slot id required"}
    settings_dir = self._chat_slots_settings_dir()

    def _run():
        return chat_load_slot(settings_dir, sid, logger)

    async with self._chat_slots_store_lock:
        slot = await asyncio.to_thread(_run)
    if slot is None:
        return {"ok": False, "error": "Slot not found"}
    return {"ok": True, "slot": slot_to_rpc_payload(slot)}


async def create_chat_slot(self, payload: Any = None) -> dict:
    """Create a new empty chat slot."""
    body = payload if isinstance(payload, dict) else {}
    settings_dir = self._chat_slots_settings_dir()
    origin_app_id = str(body.get("origin_app_id") or body.get("originAppId") or "").strip()
    first_question = str(body.get("first_question") or body.get("firstQuestion") or "").strip()
    app_name = str(body.get("app_name") or body.get("appName") or "").strip()
    label = str(body.get("label") or "").strip()

    def _run():
        return chat_create_slot(
            settings_dir,
            label=label,
            origin_app_id=origin_app_id,
            first_question=first_question,
            app_name=app_name,
            logger=logger,
        )

    async with self._chat_slots_store_lock:
        slot = await asyncio.to_thread(_run)
    return {"ok": True, "slot": slot_to_rpc_payload(slot)}


async def delete_chat_slot(self, slot_id: str = "", payload: Any = None) -> dict:
    """Delete a chat slot from private store."""
    sid = str(slot_id or "").strip()
    if not sid and isinstance(payload, dict):
        sid = str(payload.get("slot_id") or payload.get("slotId") or payload.get("id") or "").strip()
    if not sid:
        return {"ok": False, "error": "Slot id required"}
    settings_dir = self._chat_slots_settings_dir()

    async with self._chat_slots_store_lock:
        removed = await asyncio.to_thread(chat_delete_slot, settings_dir, sid, logger)
    if not removed:
        return {"ok": False, "error": "Slot not found"}
    return {"ok": True}


async def rename_chat_slot(self, payload: Any = None) -> dict:
    """Rename a chat slot label."""
    if not isinstance(payload, dict):
        return {"ok": False, "error": "Invalid payload"}
    sid = str(payload.get("slot_id") or payload.get("slotId") or payload.get("id") or "").strip()
    label = str(payload.get("label") or "").strip()
    if not sid:
        return {"ok": False, "error": "Slot id required"}
    if not label:
        return {"ok": False, "error": "Label required"}
    settings_dir = self._chat_slots_settings_dir()

    def _run():
        return chat_update_slot_label(settings_dir, sid, label, logger)

    async with self._chat_slots_store_lock:
        saved = await asyncio.to_thread(_run)
    if saved is None:
        return {"ok": False, "error": "Slot not found"}
    return {"ok": True, "slot": slot_to_rpc_payload(saved)}
