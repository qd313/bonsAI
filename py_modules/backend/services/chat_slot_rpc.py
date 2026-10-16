"""Title: List, open, start, delete and rename a saved chat

Purpose: Saved chats live in their own per-slot files on disk. This file is the five
calls the screen makes to manage that list from outside an open chat: see the recent
chats, open one, start a new empty one, delete one, and rename one. Each stays a method
of the same name on the plugin class in main.py; the method's body is now a one-line
hand-off to the function here. Every call that hands a full chat back to the screen also
carries plan 68's own `can_sum_up` flag, for the Session tab's *Sum up this chat* button.

Used for: list_chat_slots, list_chat_slot_questions, get_chat_slot, create_chat_slot,
delete_chat_slot, rename_chat_slot.

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

from backend.services.async_task_lifecycle import cancel_and_await
from backend.services.chat_slot_service import (
    MAX_CHAT_SLOTS,
    ChatLimitReached,
    create_slot as chat_create_slot,
    decline_title_offer as chat_decline_title_offer,
    delete_slot as chat_delete_slot,
    list_slot_summaries,
    load_slot as chat_load_slot,
    slot_to_rpc_payload,
    update_slot_label as chat_update_slot_label,
)
from backend.services.chat_sum_up_job import chat_can_sum_up

import decky

logger = decky.logger


def _payload_with_can_sum_up(slot: dict) -> dict:
    """``slot_to_rpc_payload`` plus plan 68 step 4's own greyed-out flag. Kept out of
    ``chat_slot_service.py`` itself: that file is imported *by* ``chat_summary_service.py``
    (for ``MAX_SUMMARY_TEXT_LEN``), so computing ``can_sum_up`` there would import back the
    other way and create a cycle. This file already sits above both, so it is the one place
    that can call into the summary service without one."""
    payload = slot_to_rpc_payload(slot)
    payload["can_sum_up"] = chat_can_sum_up(slot)
    return payload


async def list_chat_slots(self):
    """Return recent chat slot summaries (newest first)."""
    settings_dir = self._chat_slots_settings_dir()

    def _run() -> list:
        return list_slot_summaries(settings_dir, logger)

    async with self._chat_slots_store_lock:
        rows = await asyncio.to_thread(_run)
    return {"slots": rows}


async def list_chat_slot_questions(self):
    """Every saved chat with the questions the person typed in it, for the Search tab (plan 90).

    Read only: it loads each chat the way ``get_chat_slot`` does and never writes. Only the person's
    own turns (role "user") come back, oldest first, in the chat list's own order (newest chat first).
    ``text`` is the turn's ``display_text`` when it has one, else its ``text``. ``game_title`` is the
    turn's own ``app_name``; a question asked with no game running gets the chat's own game, worked out
    once per chat the way the Ask flow does it, or "" when neither gives one. A chat file that is gone
    or unreadable is left out rather than failing the list."""
    # Imported here, not at the top: the Ask flow's module is large, and this file is loaded by
    # every chat call. It is only needed once a question has no game of its own.
    from backend.services.game_ai_request import _chat_own_game_title

    settings_dir = self._chat_slots_settings_dir()

    def _read() -> list:
        slots = []
        for row in list_slot_summaries(settings_dir, logger):
            slot = chat_load_slot(settings_dir, str(row.get("id") or ""), logger)
            if slot is not None:
                slots.append(slot)
        return slots

    async with self._chat_slots_store_lock:
        slots = await asyncio.to_thread(_read)
    settings = None
    chats = []
    for slot in slots:
        own_game = None
        questions = []
        for turn in slot.get("turns") or []:
            if str(turn.get("role") or "") != "user":
                continue
            title = str(turn.get("app_name") or "").strip()
            if not title:
                if own_game is None:
                    if settings is None:
                        settings = await self.load_settings()
                    own_game = await asyncio.to_thread(_chat_own_game_title, settings, slot) or ""
                title = own_game
            questions.append(
                {
                    "turn_id": str(turn.get("id") or ""),
                    "text": str(turn.get("display_text") or "") or str(turn.get("text") or ""),
                    "created_at": int(turn.get("created_at") or 0),
                    "app_id": str(turn.get("app_id") or ""),
                    "game_title": title,
                }
            )
        chats.append(
            {
                "slot_id": str(slot.get("id") or ""),
                "label": str(slot.get("label") or ""),
                "updated_at": int(slot.get("updated_at") or 0),
                "questions": questions,
            }
        )
    return {"ok": True, "chats": chats}


async def get_chat_slot(self, slot_id: str = ""):
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
    return {"ok": True, "slot": _payload_with_can_sum_up(slot)}


async def create_chat_slot(self, payload: Any = None):
    """Create a new empty chat slot. At the limit nothing is made and nothing is deleted: the answer
    is ``{"ok": False, "error": "chat_limit", "limit": 10}``, and the screen's picker takes it from there."""
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
        try:
            slot = await asyncio.to_thread(_run)
        except ChatLimitReached:
            return {"ok": False, "error": "chat_limit", "limit": MAX_CHAT_SLOTS}
    return {"ok": True, "slot": _payload_with_can_sum_up(slot)}


async def delete_chat_slot(self, slot_id: str = "", payload: Any = None):
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
    await _forget_answer_of_deleted_chat(self, sid)
    return {"ok": True}


async def _forget_answer_of_deleted_chat(self, sid: str) -> None:
    """Drop the stored answer when the chat it came from is deleted (any chat, not only the last).

    The back end keeps its last answer so a reopened panel can paint it back (``get_background_game_ai_status``
    runs on every mount). Deleting the last chat left that answer behind: the panel rebuilt as the Delete chat
    box closed, read it back with no chat open, and drew it under a blank question -- the old answer with "...".
    Only the chat's own answer goes; an answer asked with no chat, or in another chat, is left alone. One still
    arriving is stopped, and its chat-slot entry is dropped first so nothing is written into the gone chat."""
    async with self._background_lock:
        if str(self._background_state.get("chat_slot_id") or "") != sid:
            return
        task = self._background_task
        self._background_task = None
        was_running = task is not None and not task.done()
        for rid in [r for r, s in self._chat_slot_by_request.items() if s == sid]:
            self._chat_slot_by_request.pop(rid, None)
        self._background_state = self._new_background_state()
        self._background_request_seq += 1
    logger.info("delete_chat_slot: stored answer of the deleted chat dropped (stopped=%s)", was_running)
    if was_running:
        await self.abort_background_game_ai()
    await cancel_and_await(task)


async def rename_chat_slot(self, payload: Any = None):
    """Rename a chat slot label, or answer the summary card's title offer (plan 79).

    A plain rename is the person typing a title: the chat is marked as named by hand and is never
    offered another. ``from_title_offer`` is the same rename after a yes on the card's offer: the
    chat stays open to fresher suggestions. ``keep_title_offer`` is a no: the offer is closed and
    the title is left alone, so no label is needed."""
    if not isinstance(payload, dict):
        return {"ok": False, "error": "Invalid payload"}
    sid = str(payload.get("slot_id") or payload.get("slotId") or payload.get("id") or "").strip()
    label = str(payload.get("label") or "").strip()
    keep_offer = payload.get("keep_title_offer") is True
    if not sid:
        return {"ok": False, "error": "Slot id required"}
    if not label and not keep_offer:
        return {"ok": False, "error": "Label required"}
    settings_dir = self._chat_slots_settings_dir()

    def _run():
        if keep_offer:
            return chat_decline_title_offer(settings_dir, sid, logger)
        return chat_update_slot_label(
            settings_dir, sid, label, logger, by_hand=payload.get("from_title_offer") is not True
        )

    async with self._chat_slots_store_lock:
        saved = await asyncio.to_thread(_run)
    if saved is None:
        return {"ok": False, "error": "Slot not found"}
    return {"ok": True, "slot": _payload_with_can_sum_up(saved)}
