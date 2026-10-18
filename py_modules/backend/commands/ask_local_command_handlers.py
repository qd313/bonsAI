"""Title: The Ask questions the Deck answers by itself

Purpose: A few typed phrases never go to the AI. Switching the input safety check on or off
by a magic phrase, the quick-launch shortcut steps and ``remember …`` (keep a note) are each
answered right here with a fixed reply in the same shape as an Ask answer. Each stays a method of the same name on the
plugin class in main.py; the method's body is now a one-line hand-off to the function here.

Used for: ``_try_handle_sanitizer_keyword_command``, ``_try_handle_shortcut_setup_command``
and ``_try_handle_note_command``. Each returns an Ask-shaped dict when the question is that command, or ``None`` when it is not.

Solves: Keeps the plain command answers out of main.py, which is at its size limit, and
gives later local commands one place to sit beside them.

Does not: Decide *whether* a question is one of these (the classifiers next door do), or
run the AI for anything else.
"""

from typing import Optional

import decky

from backend.services.chat_own_game_title import text_resolved_title_for_turn
from backend.services.chat_slot_service import load_slot as chat_load_slot
from backend.commands.input_sanitizer_service import (
    classify_sanitizer_command,
    confirmation_message_for_command,
)
from backend.commands.shortcut_setup_commands import (
    classify_shortcut_setup_command,
    response_message_for_shortcut,
)
from backend.services.knowledge_base_game_match import resolve_title_from_question
from backend.services.user_note_commands import parse_note_command
from backend.services.user_note_offer import note_offer_for_note_words

NOTE_OFFER_REPLY = "Keep this as a note?"
NOTE_EMPTY_REPLY = "Say what to remember after the word, like: remember no spoilers past the City of Tears."


async def try_handle_sanitizer_keyword_command(self, question: str, app_id: str) -> Optional[dict]:
    """Persist sanitizer on/off from magic phrases; return ask-shaped dict or ``None``."""
    cmd = classify_sanitizer_command(question)
    if cmd is None:
        return None
    new_disabled = cmd == "disable"
    await self.save_settings({"input_sanitizer_user_disabled": new_disabled})
    app_context = "active" if app_id else "none"
    return {
        "success": True,
        "response": confirmation_message_for_command(cmd),
        "app_id": app_id,
        "app_context": app_context,
        "applied": None,
        "elapsed_seconds": 0.0,
    }


async def try_handle_shortcut_setup_command(self, question: str, app_id: str) -> Optional[dict]:
    """Return fixed shortcut guidance (no Ollama) or ``None`` if not a shortcut keyword."""
    variant = classify_shortcut_setup_command(question)
    if variant is None:
        return None
    app_context = "active" if app_id else "none"
    # 0.6.0 (plan 72): the quick-launch chord is shelved; Developer tab only. No shortcut_setup, no button.
    if not (await self.load_settings()).get("show_developer_tab"):
        return {"success": True, "response": "That command isn't available in this version.", "app_id": app_id,
                "app_context": app_context, "applied": None, "elapsed_seconds": 0.0}
    response = response_message_for_shortcut(variant)
    return {
        "success": True,
        "response": response,
        "app_id": app_id,
        "app_context": app_context,
        "applied": None,
        "elapsed_seconds": 0.0,
        "shortcut_setup": variant,
    }


async def try_handle_note_command(
    self, question: str, app_id: str, app_name: str = "", chat_slot_id: str = ""
) -> Optional[dict]:
    """``remember …`` / ``note: …``: answer "Keep this as a note?" with the offer (no AI), or ``None``.

    The note's game is the running game; with nothing running, the title the words name or the
    chat's own game (the same rule the Ask flow uses for its notes). ``remember`` alone gets a plain
    reply and no offer."""
    words = parse_note_command(question)
    if words is None:
        return None
    resolved = ""
    if not app_id and not app_name:
        settings = await self.load_settings()
        chat: dict = {}
        if chat_slot_id:
            slot = chat_load_slot(self._chat_slots_settings_dir(), chat_slot_id, logger=decky.logger)
            chat = slot if isinstance(slot, dict) else {}
        resolved = text_resolved_title_for_turn(settings, words, chat, resolve_title_from_question, decky.logger)
    offer = note_offer_for_note_words(words, app_id=app_id, app_name=app_name, resolved_title=resolved)
    return {
        "success": True,
        "response": NOTE_OFFER_REPLY if offer else NOTE_EMPTY_REPLY,
        "app_id": app_id,
        "app_context": "active" if app_id else "none",
        "applied": None,
        "elapsed_seconds": 0.0,
        "note_offer": offer,
    }
