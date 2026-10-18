"""Title: Which game does this chat belong to?

Purpose: Works out which game an Ask question is about when nothing is running. First the
title the question's own words name; failing that, the chat's own game, found by looking back
through the chat's last turns for a game name and falling back to the game the chat was started
in (unless the question names some other well-known game the library has nothing on).

Used for: The Ask flow (``game_ai_request.py``), which hands it the resolver it uses for the
question's own words, so the same lookup is used in both places.

Solves: Keeps this small, self-contained rule out of ``game_ai_request.py``, which is at its
size limit. ``game_ai_request.py`` keeps the old name ``_chat_own_game_title`` pointing here.

Does not: Look the title up by itself. The caller passes the lookup in, so a test can swap it
without a real knowledge base on disk.
"""

from typing import Any, Callable

from backend.knowledge.kb_other_game_named import other_game_besides

CHAT_OWN_GAME_LOOKBACK_TURNS = 12


def chat_own_game_title(settings: dict, chat: dict, resolve_title: Callable[[dict, str], str]) -> str:
    """The chat's own game, for the case D19 itself cannot resolve: nothing running and the
    question naming nothing either (plan 68 step 2, the first memory-check failure from plan
    68's own § 1 -- fixed here per its § 8 question 1 default). A running game and a title the
    question names both still win over this; the caller only reaches here once both are absent.

    Walks the chat's own turns newest first, at most the newest 12, for the first of: a turn's
    own ``app_name`` (resolved against the corpus the same way D19 resolves the question itself,
    or used as written when it does not resolve to anything), or a user turn's own text resolved
    the same way. The chat's ``origin_app_name`` is the last resort. "" when none of that turns
    up anything -- today's behaviour, unchanged.
    """
    turns = chat.get("turns")
    if isinstance(turns, list) and turns:
        for turn in reversed(turns[-CHAT_OWN_GAME_LOOKBACK_TURNS:]):
            if not isinstance(turn, dict):
                continue
            turn_app_name = str(turn.get("app_name") or "").strip()
            if turn_app_name:
                return resolve_title(settings, turn_app_name) or turn_app_name
            if str(turn.get("role") or "") == "user":
                resolved = resolve_title(settings, str(turn.get("text") or ""))
                if resolved:
                    return resolved
    return str(chat.get("origin_app_name") or "").strip()


def text_resolved_title_for_turn(
    settings: dict, title_text: str, chat: dict, resolve_title: Callable[[dict, str], str], log: Any
) -> str:
    """D19 (plus plan 68 step 2): with nothing running and Steam giving no name, the game this
    question is about -- the title its own words name, else the chat's own game. "" when neither.
    The caller only asks once it knows no game is running. ``log`` is the caller's logger."""
    resolved = resolve_title(settings, title_text)
    if resolved:
        return resolved
    # Plan 68 step 2: with no game running and the question naming nothing, the knowledge-base
    # search used to get no game at all. Falls back to the chat's own game.
    chat_own_title = chat_own_game_title(settings, chat, resolve_title)
    # A question naming some other well-known game the library has nothing on is not a bare
    # follow-up: attach no game's notes rather than the chat's own.
    other_game = other_game_besides(title_text, chat_own_title)
    if other_game:
        log.info(
            "kb: question names a game the library does not know (%s) -- "
            "not using the chat's own game %s",
            other_game,
            chat_own_title,
        )
        return ""
    if chat_own_title:
        log.info("kb: no game running or named -- using the chat's own game %s", chat_own_title)
    return chat_own_title
