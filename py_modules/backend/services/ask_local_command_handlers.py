"""Title: The Ask questions the Deck answers by itself

Purpose: A few typed phrases never go to the AI. Switching the input safety check on or off
by a magic phrase, the quick-launch shortcut steps, and the anti-cheat lookup
(``bonsai:vac-check``) are each answered right here with a fixed reply in the same shape
as an Ask answer. Each stays a method of the same name on the plugin class in main.py; the
method's body is now a one-line hand-off to the function here.

Used for: ``_try_handle_sanitizer_keyword_command``, ``_try_handle_shortcut_setup_command``
and ``_try_handle_vac_check_command``. Each returns an Ask-shaped dict when the question is
that command, or ``None`` when it is not.

Solves: Keeps the plain command answers out of main.py, which is at its size limit, and
gives later local commands one place to sit beside them.

Does not: Decide *whether* a question is one of these (the classifiers next door do), or
run the AI for anything else.
"""

from typing import Optional

from backend.services.capabilities import capability_enabled
from backend.services.input_sanitizer_service import (
    classify_sanitizer_command,
    confirmation_message_for_command,
)
from backend.services.shortcut_setup_commands import (
    classify_shortcut_setup_command,
    response_message_for_shortcut,
)
from backend.services.vac_check_commands import parse_vac_check_command, response_for_vac_check


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


async def try_handle_vac_check_command(self, question: str, app_id: str) -> Optional[dict]:
    """Steam Web API GetPlayerBans via ``bonsai:vac-check`` (no Ollama)."""
    parsed_arg = parse_vac_check_command(question)
    if parsed_arg is None:
        return None
    settings = await self.load_settings()
    ok = capability_enabled(settings, "steam_web_api")
    key = str(settings.get("steam_web_api_key") or "")
    response = response_for_vac_check(parsed_arg, api_key=key, capability_ok=ok)
    app_context = "active" if app_id else "none"
    return {
        "success": True,
        "response": response,
        "app_id": app_id,
        "app_context": app_context,
        "applied": None,
        "elapsed_seconds": 0.0,
    }
