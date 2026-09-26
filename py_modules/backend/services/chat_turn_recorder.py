"""Title: Save one question or one answer into an open chat

Purpose: While a question is being answered, the plugin needs to write what the user just
asked, and later what the model answered, into that chat's own saved file on disk. This
file is that writing step: it turns the raw pieces the Ask flow is holding (the question
text, any attached files, the finished reply, its transparency and reasoning) into the
turn shape the chat-slot store keeps, and appends it under the store's lock. It also
reads the two small fields a saved question can carry that are not the question text
itself: which chat it belongs to, and the shorter caption to show for it if the text sent
to the model was not what the user actually typed (a branch pick, for example).

Used for: called from inside `main.py`'s Ask flow, once a chat slot id is known, both when
a question is accepted and again once its answer (or its cancellation) is final.

Solves: Keeps this bookkeeping out of the Ask flow's own body, next to the chat-slot
service it already calls. Recording a turn *into* an already-open chat while a question is
answered is a different job from the five calls that list, open, start, delete and rename
a chat from outside one -- those stay in `chat_slot_rpc.py`.

Does not: Own the on-disk shape of a chat slot or the list/open/start/delete/rename calls
-- both are `chat_slot_service.py` and `chat_slot_rpc.py`. Does not decide *whether* a
question belongs to a chat; the caller has already resolved that before calling here.
"""

import asyncio
from typing import Any, Optional

from backend.services.chat_slot_service import (
    append_turn as chat_append_turn,
    ensure_slot as chat_ensure_slot,
    save_slot_subject as chat_save_slot_subject,
    save_slot_summary as chat_save_slot_summary,
)

import decky

logger = decky.logger


def parse_chat_slot_id(question: Any) -> str:
    if isinstance(question, dict):
        return str(question.get("chat_slot_id") or question.get("chatSlotId") or "").strip()
    return ""


def parse_chat_slot_display_question(question: Any) -> str:
    """What the user saw as their question when it differs from the composed prompt sent to
    the model (a branch pick shows "I'm at: …" but sends "[Strategy follow-up] I'm at: …").
    Persisted per turn so a reopened chat's header shows the friendly caption, not internal
    plumbing. "" means no separate display form."""
    if isinstance(question, dict):
        return str(
            question.get("display_question") or question.get("displayQuestion") or ""
        ).strip()
    return ""


async def record_user_turn(
    self,
    *,
    slot_id: str,
    question: str,
    request_id: int,
    attachments: list,
    app_id: str,
    app_name: str,
    display_question: str = "",
) -> None:
    sid = str(slot_id or "").strip()
    if not sid or not str(question or "").strip():
        return
    settings_dir = self._chat_slots_settings_dir()
    refs = [
        {
            "path": str(a.get("path", "") or ""),
            "name": str(a.get("name", "") or ""),
            "source": str(a.get("source", "unknown") or "unknown"),
        }
        for a in (attachments or [])
        if isinstance(a, dict) and str(a.get("path", "") or "").strip()
    ]

    def _run() -> None:
        chat_ensure_slot(
            settings_dir,
            sid,
            origin_app_id=app_id,
            first_question=question,
            app_name=app_name,
            logger=logger,
        )
        chat_append_turn(
            settings_dir,
            sid,
            role="user",
            text=question,
            request_id=request_id,
            attachment_refs=refs,
            app_id=app_id,
            app_name=app_name,
            display_text=display_question,
            logger=logger,
        )

    async with self._chat_slots_store_lock:
        await asyncio.to_thread(_run)


def reasoning_payload_for_chat_slot(result: dict) -> Optional[dict]:
    """Plan 57: the ``{text, seconds, tokens}`` shape a saved turn keeps, or ``None`` when the
    Ask's result carried no thinking (thinking Off, or a model that cannot think) -- absent,
    not an empty dict, so ``_normalize_turn`` leaves the ``reasoning`` key off the turn.
    """
    text = str(result.get("reasoning_text") or "")
    if not text:
        return None
    return {
        "text": text,
        "seconds": result.get("reasoning_seconds"),
        "tokens": int(result.get("reasoning_tokens") or 0),
    }


async def record_assistant_turn(
    self,
    *,
    slot_id: str,
    response_text: str,
    transparency: Optional[dict] = None,
    app_id: str = "",
    app_name: str = "",
    asked_entity: str = "",
    reasoning: Optional[dict] = None,
    chat_summary: str = "",
) -> None:
    sid = str(slot_id or "").strip()
    body = str(response_text or "").strip()
    if not sid or not body:
        return
    settings_dir = self._chat_slots_settings_dir()

    def _run() -> None:
        chat_append_turn(
            settings_dir,
            sid,
            role="assistant",
            text=body,
            transparency=transparency,
            app_id=app_id,
            app_name=app_name,
            asked_entity=asked_entity,
            reasoning=reasoning,
            chat_summary=chat_summary,
            logger=logger,
        )

    async with self._chat_slots_store_lock:
        await asyncio.to_thread(_run)


async def save_chat_summary(plugin, slot_id: str, summary: Optional[dict]) -> None:
    """Set a chat's own summary of its older turns (plan 68 step 2). A blank slot id does
    nothing -- there is no chat to attach the summary to, the same guard ``record_user_turn`` and
    ``record_assistant_turn`` both open with."""
    sid = str(slot_id or "").strip()
    if not sid:
        return
    settings_dir = plugin._chat_slots_settings_dir()

    def _run() -> None:
        chat_save_slot_summary(settings_dir, sid, summary, logger=logger)

    async with plugin._chat_slots_store_lock:
        await asyncio.to_thread(_run)


async def save_chat_subject(plugin, slot_id: str, subject: Optional[dict]) -> None:
    """Set a chat's own remembered follow-up subject (plan 68 step 2). Same blank-slot-id guard
    as ``save_chat_summary`` above."""
    sid = str(slot_id or "").strip()
    if not sid:
        return
    settings_dir = plugin._chat_slots_settings_dir()

    def _run() -> None:
        chat_save_slot_subject(settings_dir, sid, subject, logger=logger)

    async with plugin._chat_slots_store_lock:
        await asyncio.to_thread(_run)
