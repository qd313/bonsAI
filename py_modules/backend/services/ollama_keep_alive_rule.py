"""Title: How long the Deck's own AI stays in memory after a request

Purpose: One place that decides the ``keep_alive`` every request to Ollama carries. Normally that is
the person's own "Unload delay" setting. While a game is running AND the AI runs on this Deck, it is
cut to about a minute, so the AI's memory (about 5.8 GB with the Deck's model) goes back to the game
soon after an answer instead of five minutes later (plan 89, the maintainer's call 8; the freeze of
2026-10-03, docs/audit/plan81-freeze-after-answer.md).
Used for: ollama_ask_service (the answer), chat_sum_up_job (the chat sum-up), knowledge_base_service
(the search-by-meaning lookups); the memory step and the chat summary inside an Ask take the value the
Ask worked out. game_ai_request.py tells this file whether a game is running at the start of each Ask.
Solves: Ollama keeps a model for the ``keep_alive`` of the LAST request that touched it. A shortened
answer request followed by a sum-up or a lookup that carried the long setting would put the long hold
straight back, so every request that can load the AI goes through the one rule below.
How it works: 1. ``note_game_running()`` is called once per Ask with "was a game running when the
person asked" (the screen sends the running game's id; blank means none). It is kept here, because the
sum-up job and the other follow-ups run after the Ask returns and read it from here.
2. ``effective_keep_alive()`` takes the setting and the address Ollama is reached at. Game running and
the address is this Deck (loopback): the answer is one minute, unless the setting is already shorter
(or zero, which unloads at once), which is kept: the rule only ever shortens. Anything else: the
setting, unchanged.
3. It writes one back-end log line saying which value was used and why; the Deck check reads it.
Does not: touch the setting itself or the Unload delay slider, unload anything by hand (Stop does
that), or know about games on a PC: with the AI on a PC the Deck's game does not matter.
"""
from __future__ import annotations

from typing import Any

from backend.ollama_connectivity import is_loopback_ollama_host
from backend.ollama_urls import OllamaAddressRefused, normalize_ollama_base
from backend.services.settings_service import sanitize_ollama_keep_alive

try:  # the Decky host provides its own log; a plain test run falls back to the standard one
    import decky

    logger = decky.logger
except ImportError:  # pragma: no cover - only outside the Decky host
    import logging

    logger = logging.getLogger(__name__)

GAME_RUNNING_KEEP_ALIVE = "1m"

_state = {"game_running": False}


def note_game_running(running: bool) -> None:
    """Remember whether a game was running when the latest Ask was made."""
    _state["game_running"] = bool(running)


def game_running() -> bool:
    return bool(_state["game_running"])


def _seconds(token: str) -> int:
    """``"30s"`` -> 30, ``"5m"`` -> 300, ``"0s"`` -> 0. Tokens are already checked by the setting."""
    unit = token[-1:]
    try:
        n = int(token[:-1])
    except ValueError:
        return 10**9  # unreadable: treat as long, so the game rule applies
    return n * {"s": 1, "m": 60, "h": 3600}.get(unit, 60)


def ai_is_on_this_deck(address: str) -> bool:
    """True when ``address`` (a typed Ollama address or a full request URL) is this Deck."""
    try:
        host, _, _ = normalize_ollama_base(address)
    except OllamaAddressRefused:
        return False
    return is_loopback_ollama_host(host)


def effective_keep_alive(setting_value: Any, address: str, *, source: str = "ask", log: bool = True) -> str:
    """The ``keep_alive`` to send: the setting, or one minute while a game runs and the AI is on
    this Deck. ``source`` names the request in the log line; ``log=False`` keeps a minor caller
    quiet (the lookups run twice per Ask)."""
    setting = sanitize_ollama_keep_alive(setting_value)
    running = game_running()
    on_deck = ai_is_on_this_deck(address)
    if running and on_deck:
        if _seconds(setting) <= _seconds(GAME_RUNNING_KEEP_ALIVE):
            used, why = setting, "setting (already a minute or less; game running, AI on this Deck)"
        else:
            used, why = GAME_RUNNING_KEEP_ALIVE, f"game running, AI on this Deck (setting {setting})"
    elif running:
        used, why = setting, "setting (game running, but the AI is on a PC)"
    else:
        used, why = setting, "setting"
    if log:
        logger.info("keep_alive %s: %s [%s]", used, why, source)
    return used
