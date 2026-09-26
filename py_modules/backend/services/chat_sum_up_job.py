"""Title: The "Sum up this chat" button's own job

Purpose: The Session tab's *Sum up this chat* button runs the exact same summary an
ordinary question would trigger on its own once a chat has outgrown its room, but on
demand and with no question attached. This file is that job: the RPC body behind
``Plugin.sum_up_chat_slot``, and the background task it starts.
Used for: called once, from ``main.py``'s ``sum_up_chat_slot`` (a one-line hand-off), when
the person presses the button.
Solves: The button takes the same one-question-at-a-time slot an Ask does -- greyed out
while an answer is being written, stopped by the same Stop -- and must save no turn and
paint no answer when it finishes. Keeping that shape here, alongside ``chat_slot_rpc.py``'s
other chat-slot bodies, keeps ``main.py`` to the one-line hand-off every other RPC method
already gets.
Does not: Decide whether a chat has outgrown its room or write the summary itself -- both
are ``chat_summary_service.py``, which this file only calls. Does not know a Steam Deck's
address for a remote PC running Ollama: unlike an ordinary Ask, the button's own RPC call
carries no PcIp, because only the screen's own local storage remembers one (see
``_pick_model_and_window`` below). On a plugin set to talk to a remote PC rather than the
Deck's own runtime, this job still reaches for the Deck's own loopback address -- a real
gap, not something this file can fix on its own.
"""

from __future__ import annotations

import asyncio
import threading
import time
from typing import Any, Optional

import decky

from backend.ollama_urls import normalize_ollama_base
from backend.services import chat_turn_recorder
from backend.services.background_request_state import pending_background_state
from backend.services.chat_slot_service import load_slot as chat_load_slot
from backend.services.chat_summary_service import (
    SummaryPlan,
    last_memory_allowance_tokens,
    plan_summary,
    write_chat_summary,
)
from backend.services.local_ollama_setup_service import (
    is_loopback_ollama_host,
    list_installed_ollama_tags,
    probe_ollama_http_ok,
    recover_loopback_ollama_listening,
)
from backend.services.ollama_ask_extras import resolve_ask_model_routing
from backend.services.reply_language_service import resolve_effective_reply_language
from backend.services.settings_service import sanitize_ollama_keep_alive
from backend.services.token_accounting_service import choose_window_tokens, known_window_tokens

logger = decky.logger

# Drawn under the button (plan 68 section 6) when the call did not produce a summary --
# never appended to a saved answer, since there is no answer here to append it to.
SUM_UP_FAILURE_LINE = "Couldn't sum up the chat this time."


def chat_can_sum_up(chat: dict) -> bool:
    """Whether the button would do anything right now, for the chat's own screen payload
    (plan 68 step 4). Uses the model named in the chat's own previous summary, if it has
    one -- the best guess of which model would run it again -- else ``plan_summary``'s own
    "nothing planned yet" fallback allowance, the same one a chat with no summary at all
    gets. No network call: this rides on every chat-slot payload, so it has to stay cheap.
    """
    model_name = str((chat.get("summary") or {}).get("model") or "")
    allowance = last_memory_allowance_tokens(model_name)
    plan = plan_summary(chat, memory_allowance_tokens=allowance, model_name=model_name)
    return plan.needed


def _pick_model_and_window(settings: dict) -> tuple[str, int, str]:
    """The model this job would use, and the room it would ask for -- the same routing
    ``run_ask_ollama`` does for an ordinary text-only question (``resolve_ask_model_routing``,
    text only, no images -- routing does not otherwise depend on Speed vs Strategy), against
    the Deck's own loopback Ollama address (see this module's own doc comment on why: the
    button's RPC carries no PcIp, and nothing on the back end remembers one from an earlier
    Ask).
    """
    pc_ip = ""
    ollama_host, _, ollama_base = normalize_ollama_base(pc_ip)
    if is_loopback_ollama_host(ollama_host) and not probe_ollama_http_ok(ollama_base):
        recover_loopback_ollama_listening(logger.info)
    installed_tags = list_installed_ollama_tags(ollama_base)
    models_to_try, *_rest = resolve_ask_model_routing(
        requires_vision=False,
        settings=settings,
        installed_tags=installed_tags,
        preferred_model=None,
        attachment_warnings=[],
        attachment_errors=[],
        prepared_image_count=0,
    )
    model_name = models_to_try[0] if models_to_try else ""
    window_tokens = choose_window_tokens(ollama_base, model_name, logger=logger) if model_name else 0
    if window_tokens <= 0:
        window_tokens = known_window_tokens(ollama_base, model_name)
    return model_name, window_tokens, f"{ollama_base}/api/chat"


async def sum_up_chat_slot(plugin: Any, slot_id: str = "") -> dict:
    """The body behind ``Plugin.sum_up_chat_slot`` -- see this module's own doc comment."""
    sid = str(slot_id or "").strip()
    if not sid:
        return {"accepted": False, "status": "invalid"}

    settings_dir = plugin._chat_slots_settings_dir()

    def _load() -> Optional[dict]:
        return chat_load_slot(settings_dir, sid, logger)

    chat = await asyncio.to_thread(_load)
    if chat is None:
        return {"accepted": False, "status": "invalid"}

    # Settings and model routing happen here, before the lock -- the same reason
    # start_background_game_ai loads its own settings before taking _background_lock: a
    # network round-trip while holding it would stall a concurrent Stop.
    settings = await plugin.load_settings()
    model_name, window_tokens, url = _pick_model_and_window(settings)
    allowance = last_memory_allowance_tokens(model_name)
    plan: SummaryPlan = plan_summary(chat, memory_allowance_tokens=allowance, model_name=model_name)
    keep_alive = sanitize_ollama_keep_alive(settings.get("ollama_keep_alive"))
    reply_language = resolve_effective_reply_language(settings.get("reply_language"))
    ask_mode = str(settings.get("ask_mode") or "speed")
    app_name = str(chat.get("origin_app_name") or "")
    app_id = str(chat.get("origin_app_id") or "")

    async with plugin._background_lock:
        if (
            plugin._background_state.get("status") == "pending"
            and plugin._background_task is not None
            and not plugin._background_task.done()
        ):
            state = dict(plugin._background_state)
            return {
                "accepted": False,
                "status": "busy",
                "request_id": state.get("request_id"),
            }

        if not plan.needed:
            return {"accepted": False, "status": "nothing_to_do"}

        plugin._background_request_seq += 1
        request_id = plugin._background_request_seq
        plugin._reset_partial_stream_snapshot(request_id)
        plugin._publish_thinking_phase_key(
            request_id, "summing_up", app_name=app_name, ask_mode=ask_mode, question=""
        )
        plugin._background_state = pending_background_state(
            request_id=request_id,
            question="",
            app_id=app_id,
            app_context="none",
            started_at=time.time(),
            chat_slot_id=sid,
            app_name=app_name,
            kind="sum_up",
        )
        # Deliberately NOT added to plugin._chat_slot_by_request: that map is what
        # abort_background_game_ai reads to decide whether a Stop should record a "Request
        # cancelled." turn, and this job saves no turn at all, cancelled or not.
        plugin._background_task = asyncio.create_task(
            _run_sum_up_job(
                plugin,
                request_id=request_id,
                slot_id=sid,
                chat=chat,
                plan=plan,
                model_name=model_name,
                url=url,
                keep_alive=keep_alive,
                reply_language=reply_language,
                window_tokens=window_tokens,
            )
        )
        return {"accepted": True, "status": "pending", "request_id": request_id}


async def _run_sum_up_job(
    plugin: Any,
    *,
    request_id: int,
    slot_id: str,
    chat: dict,
    plan: SummaryPlan,
    model_name: str,
    url: str,
    keep_alive: str,
    reply_language: str,
    window_tokens: int,
) -> None:
    """Run the summary call and publish its terminal state. Mirrors ``main._run_background_
    request``'s own shape: the same guard against overwriting a state a Stop already
    rewrote, and the same defensive ``CancelledError`` catch."""
    try:
        outcome = await write_chat_summary(
            plugin,
            chat=chat,
            plan=plan,
            model_name=model_name,
            url=url,
            keep_alive=keep_alive,
            window_tokens=window_tokens,
            reply_language=reply_language,
            request_id=request_id,
        )
    except asyncio.CancelledError:
        return
    bg_abort = getattr(plugin, "_abort_current_ollama_chat", None)
    if isinstance(bg_abort, threading.Event):
        bg_abort.clear()
    async with plugin._background_lock:
        active_request_id = plugin._background_state.get("request_id")
        if active_request_id != request_id:
            return
        if plugin._background_state.get("status") != "pending":
            # A Stop already rewrote this to "cancelled" -- leave it exactly as Stop left it.
            return
        if outcome.status == "written" and outcome.summary is not None:
            await chat_turn_recorder.save_chat_summary(plugin, slot_id, outcome.summary)
            plugin._background_state = {
                **plugin._background_state,
                "status": "completed",
                "success": True,
                "response": "",
                "elapsed_seconds": round(outcome.seconds, 2),
                "completed_at": time.time(),
                "partial_response": None,
                "streaming": False,
            }
        else:
            plugin._background_state = {
                **plugin._background_state,
                "status": "failed",
                "success": False,
                "response": SUM_UP_FAILURE_LINE,
                "error": SUM_UP_FAILURE_LINE,
                "elapsed_seconds": round(outcome.seconds, 2),
                "completed_at": time.time(),
                "partial_response": None,
                "streaming": False,
            }
        plugin._clear_partial_stream_snapshot()
