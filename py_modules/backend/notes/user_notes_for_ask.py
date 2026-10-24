"""Title: Putting your notes into one Ask question

Purpose: Before the knowledge-base search, an Ask question looks through the notes the person
asked bonsAI to remember and picks the ones that apply: the ones that are on and are for this
game or for every game. This file does that lookup for one question and hands back everything
the Ask flow needs from it: the block of words for the instruction sheet, the short list the
Show details record keeps, and how many matching notes were switched off. It also writes the one
plugin-log line and the app-log line saying how many notes went in.

Used for: ``run_game_ai_request`` in ``game_ai_request.py``, once per question.

Solves: Keeps the notes lookup, its logging and its never-fail guard out of
``game_ai_request.py``, which is at its size limit. A notes file that cannot be read, or a test
stand-in with no settings folder, simply means no notes: an Ask is never refused over notes.

Does not: Decide which notes apply (that is ``pick_notes_for_turn`` in ``user_notes_service.py``)
or splice the block into the instruction sheet (``build_system_prompt`` in ``ollama_prompts.py``).
"""

import asyncio
from typing import Any

import decky

from backend.notes.user_notes_service import (
    AskNotes,
    load_notes,
    pick_notes_for_turn,
)

logger = decky.logger


async def notes_for_ask(plugin: Any, app_id: str, game_title: str) -> AskNotes:
    """The notes that go into this question. ``game_title`` is the running game's name, or, with
    nothing running, the title the Ask flow worked out from the question or the chat."""
    try:
        settings_dir = plugin._chat_slots_settings_dir()
        notes = await asyncio.to_thread(load_notes, settings_dir, logger)
    except Exception:  # a notes problem must never cost the person their answer
        logger.exception("user_notes: could not read the notes for this question")
        return AskNotes()
    picked = pick_notes_for_turn(notes, app_id=app_id, game_title=game_title)
    logger.info(
        "user_notes=%d off=%d game=%r appid=%s",
        len(picked.attached),
        picked.off_count,
        game_title,
        app_id or "-",
    )
    if hasattr(plugin, "_maybe_app_log"):
        await plugin._maybe_app_log(
            "ask.user_notes",
            "your notes in this question",
            fields={"user_notes": len(picked.attached), "off": picked.off_count, "app_id": app_id},
        )
    return picked
