"""Title: The Ask's memory step: sum the chat up if it must, then carry what it covered

Purpose: One call for everything ``run_ask_ollama`` does with a chat before the answer: work out
the room the answer will really have, sum the chat up first when it has outgrown that room (plan
68), and append the summary and the newest turns word for word to what the AI is told.
Used for: ollama_ask_service.run_ask_ollama, once per question, after the model is chosen.
Solves: Keeps the Ask service to one call and its own job -- trying models in order -- and keeps
the order of these three steps in one readable place instead of spread across that function.
Does not: Decide whether a chat has outgrown its room or write the summary (that is
chat_summary_service.py), or build the memory block's text (chat_memory_service.py); it only runs
them in the right order and hands back what the caller needs.
"""
from __future__ import annotations

from typing import Any, Optional

import decky

from backend.services.chat_memory_service import apply_chat_memory_to_prompt
from backend.services.chat_summary_service import decide_and_write_chat_summary
from backend.services.token_accounting_service import choose_window_tokens, known_window_tokens

logger = decky.logger


async def add_chat_memory_to_prompt(
    plugin: Any,
    *,
    chat: Optional[dict],
    chat_turns: Optional[list],
    system_content: str,
    question: str,
    ask_mode: str,
    think_effort: str,
    ollama_base: str,
    model_name: str,
    url: str,
    keep_alive: str,
    reply_language: str,
    active_request_id: Any,
    app_name: str,
    character_enabled: bool,
    character_preset_id: Optional[str],
    attached_chars: int,
) -> tuple[str, str, bool]:
    """``run_ask_ollama``'s whole memory step, in the order it has to happen.

    1. The room: what the answer's own call will ask the server for (``choose_window_tokens``,
       decided once per server and model per session), or what is already known about it -- so
       the first question after a start plans against 16,384 on the Deck, not the 4,096 fallback.
    2. ``decide_and_write_chat_summary`` above: sums the chat up first when it has outgrown that
       room, and saves the summary only once the call has returned.
    3. ``apply_chat_memory_to_prompt``: the summary, then the newest turns word for word, at the
       END of what the AI is told (see that function's own doc comment for why the end).

    Returns ``(system_content, chat_summary_mark, stopped)``. ``stopped`` True means a Stop landed
    mid-summary; the prompt comes back unchanged and the caller must make no answer call.
    """
    window_tokens = choose_window_tokens(ollama_base, model_name, logger=logger)
    if window_tokens <= 0:
        window_tokens = known_window_tokens(ollama_base, model_name)
    turns, previous_summary, mark, stopped = await decide_and_write_chat_summary(
        plugin,
        chat=chat,
        chat_turns=chat_turns,
        system_content=system_content,
        question=question,
        ask_mode=ask_mode,
        room_tokens=window_tokens,
        think_effort=think_effort,
        model_name=model_name,
        url=url,
        keep_alive=keep_alive,
        reply_language=reply_language,
        active_request_id=active_request_id if isinstance(active_request_id, int) else None,
        app_name=app_name,
        character_enabled=character_enabled,
        character_preset_id=character_preset_id,
    )
    if stopped:
        return system_content, mark, True
    system_content = apply_chat_memory_to_prompt(
        system_content=system_content,
        question=question,
        chat_turns=turns,
        ask_mode=ask_mode,
        think_effort=think_effort,
        room_tokens=window_tokens,
        model_name=model_name,
        summary=previous_summary,
        attached_chars=attached_chars,
        logger=logger,
    )
    return system_content, mark, False
