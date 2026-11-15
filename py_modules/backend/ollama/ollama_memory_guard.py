"""Title: Is there room to load the Deck's own AI

Purpose: Before a question loads the AI on this Deck, read how much memory is free and how much
the AI needs, and say whether loading it would leave the game and the system too little. If so the
Ask answers with a plain warning and loads nothing; the player can press "Ask anyway" once.
On 2026-11-09 a picture question with God of War running loaded the 5.8 GB model into 3.5 GB of free
memory: free memory fell under 1 GB, both tries timed out at 181 s and the Deck had to be restarted
by hand (workshop:planning/assets/103-handover-D0a.md). Nothing in the plugin read free memory before.
Used for: ollama_ask_service.run_ask_ollama (every Ask, between the two "no model" refusals and the
chat's own summing-up, which is then covered), chat_sum_up_job (the Sum up this chat button, which
refuses with the ``low_memory`` status), and the one plugin method
``arm_ollama_ask_anyway`` in main.py, which the screen's "Ask anyway" row calls.
Solves: A model loaded into too little memory freezes the whole Deck, not just the plugin.
Does not: Check the AI when it runs on a PC (the Deck's memory does not matter then), block an answer
on a guess (anything it cannot read, Ollama silent or no ``/proc/meminfo``, means "do not warn"),
count the small meaning-search model the notes search loads before the Ask (about 0.3 GB), unload
anything, or pick a smaller model for the player.

How it works:
1. ``check_memory_for_model()`` reads ``MemAvailable`` from ``/proc/meminfo`` and asks Ollama
   (``probe_ollama_health``) what is installed and what is loaded. A model that is already loaded is
   never short. Otherwise it needs its loaded size if Ollama has reported one earlier this session
   (remembered whenever it is seen in ``/api/ps``), else its installed size times ``LOAD_SIZE_FACTOR``.
2. It is short when ``available - needed`` is under ``memory_limit_mb()``.
3. ``ask_memory_warning()`` is the Ask's one call. An armed "Ask anyway" (``arm_ask_anyway``, good for
   ``ASK_ANYWAY_SECONDS`` and used up by the next Ask) skips the check. Otherwise it writes the numbers
   into the turn's diagnostics and one log line, and when short returns the refusal's own shape.
4. The test switch: ``BONSAI_ASK_MEMORY_LIMIT_MB`` in the environment, or a file named
   ``ask_memory_limit_mb`` in the plugin's settings folder holding one number, replaces the limit. Off
   (absent) by default; a driver raises it to see the warning on a light game and deletes it after.
"""
from __future__ import annotations

import asyncio
import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Optional

from backend.ask.ollama_window_fit import ollama_base_from_chat_url
from backend.ollama.ollama_health_probe import probe_ollama_health
from backend.ollama.ollama_keep_alive_rule import ai_is_on_this_deck

try:  # the Decky host provides its own log; a plain test run falls back to the standard one
    import decky

    logger = decky.logger
except ImportError:  # pragma: no cover - only outside the Decky host
    import logging

    decky = None
    logger = logging.getLogger(__name__)

# How much free memory the Deck must still have AFTER the AI loads. A starting number, not a measured
# one: on 2026-11-09 the Deck froze with God of War running when free memory fell from 3,578 MB to 1,370
# and then 970 MB, and an idle Deck has about 12,000 MB free. 2,000 MB sits above the 970 that froze it
# and well under idle. Row P104-M-MEMORY reads the Deck itself; the session sets the final number.
MEMORY_LIMIT_MB = 2000
# Installed size to loaded size, measured on this PC's Ollama 0.40.16 (plan 104 lane G1) and on the Deck
# for the starter model: the Deck loaded gemma4:e2b-it-qat (4,336 MB installed) at about 5,800 MB, a factor
# of 1.34; plain models here ran 1.1 (4,096-token window) to 1.75 (32,768) of their installed size. This PC
# reads the starter model at only 0.4 (it does not count that model's CPU-side tables), so the Deck's own
# number is the one used. A size Ollama has really reported beats this factor.
LOAD_SIZE_FACTOR = 1.35
ASK_ANYWAY_SECONDS = 60.0
MEMORY_LIMIT_ENV = "BONSAI_ASK_MEMORY_LIMIT_MB"
MEMORY_LIMIT_FILE = "ask_memory_limit_mb"
# The screen's "Ask anyway" row finds the warning by this exact opening: the same words are kept in
# src/features/answer/transcript/lowMemoryNotice.ts and tests/test_ollama_memory_guard.py proves they match.
LOW_MEMORY_MESSAGE_START = "Not enough free memory to start the AI."
_PROBE_SECONDS = 3.0
_MAX_LIMIT_MB = 64000
_MIB = 1024 * 1024

_lock = threading.Lock()
_armed_at: Optional[float] = None
_loaded_mb: dict[str, int] = {}


@dataclass(frozen=True)
class MemoryVerdict:
    """What one check found. ``left_mb`` is what would be free once the model has loaded."""

    short: bool
    available_mb: int
    needed_mb: int
    left_mb: int
    limit_mb: int
    model: str
    loaded_already: bool
    need_from: str


def reset_for_tests() -> None:
    """Forget the armed mark and every remembered size."""
    global _armed_at
    with _lock:
        _armed_at = None
        _loaded_mb.clear()


def read_available_mb(path: str = "/proc/meminfo") -> Optional[int]:
    """``MemAvailable`` in MB, or None when the file is missing or has no such line."""
    try:
        with open(path, encoding="ascii", errors="replace") as handle:
            for line in handle:
                if line.startswith("MemAvailable:"):
                    return int(line.split()[1]) // 1024
    except (OSError, ValueError, IndexError):
        return None
    return None


def _override_from_file(settings_dir: str) -> str:
    try:
        with open(os.path.join(settings_dir, MEMORY_LIMIT_FILE), encoding="ascii") as handle:
            return handle.read(32)
    except (OSError, ValueError):
        return ""


def memory_limit_mb(settings_dir: Optional[str] = None) -> int:
    """The limit: ``MEMORY_LIMIT_MB`` unless the test switch holds a whole number from 1 to 64,000."""
    folder = settings_dir if settings_dir is not None else str(getattr(decky, "DECKY_PLUGIN_SETTINGS_DIR", "") or "")
    raw = os.environ.get(MEMORY_LIMIT_ENV, "").strip() or (_override_from_file(folder).strip() if folder else "")
    try:
        value = int(raw)
    except ValueError:
        return MEMORY_LIMIT_MB
    return value if 0 < value <= _MAX_LIMIT_MB else MEMORY_LIMIT_MB


def arm_ask_anyway(now: Optional[float] = None) -> None:
    """Mark the next Ask as "asked anyway". Lasts ``ASK_ANYWAY_SECONDS``; the next Ask uses it up."""
    global _armed_at
    with _lock:
        _armed_at = time.monotonic() if now is None else now


def consume_ask_anyway(now: Optional[float] = None) -> bool:
    """True once for each arming that is still fresh; the mark is gone afterwards either way."""
    global _armed_at
    with _lock:
        armed, _armed_at = _armed_at, None
    stamp = time.monotonic() if now is None else now
    return armed is not None and 0 <= stamp - armed <= ASK_ANYWAY_SECONDS


def _mb(size_bytes: Any) -> int:
    return int(size_bytes or 0) // _MIB


def check_memory_for_model(ollama_base: str, model: str) -> Optional[MemoryVerdict]:
    """Would loading ``model`` leave the Deck under the limit? None means "cannot tell": never warn.

    Blocking (a few small reads); the Ask calls it through a thread. The AI on a PC is not checked."""
    if not model or not ai_is_on_this_deck(ollama_base):
        return None
    available = read_available_mb()
    if available is None:
        return None
    try:
        health = probe_ollama_health(ollama_base, time.time() + _PROBE_SECONDS)
    except Exception:
        return None
    loaded = {str(row.get("name")): _mb(row.get("size_bytes")) for row in health.get("ps_loaded") or []}
    with _lock:
        _loaded_mb.update({name: mb for name, mb in loaded.items() if mb > 0})
        remembered = _loaded_mb.get(model)
    limit = memory_limit_mb()
    if model in loaded:
        return MemoryVerdict(False, available, loaded[model], available, limit, model, True, "already loaded")
    if remembered:
        needed, source = remembered, "loaded size seen earlier"
    else:
        installed = _mb((health.get("model_sizes") or {}).get(model))
        if installed <= 0:
            return None
        needed, source = round(installed * LOAD_SIZE_FACTOR), f"installed size x {LOAD_SIZE_FACTOR}"
    left = available - needed
    return MemoryVerdict(left < limit, available, needed, left, limit, model, False, source)


def low_memory_message(verdict: MemoryVerdict) -> str:
    """The warning, in plain words: what is free, what the AI needs, what helps, and the risk."""
    outcome = (
        "loading it would use more than is free"
        if verdict.left_mb <= 0
        else f"loading it would leave only about {verdict.left_mb:,} MB"
    )
    return (
        f"{LOW_MEMORY_MESSAGE_START} The Deck has about {verdict.available_mb:,} MB free and the AI needs "
        f"about {verdict.needed_mb:,} MB, so {outcome} (bonsAI keeps at least {verdict.limit_mb:,} MB back). "
        "To make room, close the game, pick a smaller model on the Ollama tab, or use the AI on a PC. "
        "Asking anyway may freeze the Deck."
    )


def _diagnostics(verdict: MemoryVerdict) -> dict[str, Any]:
    return {
        "model": verdict.model, "available_mb": verdict.available_mb, "needed_mb": verdict.needed_mb,
        "left_mb": verdict.left_mb, "limit_mb": verdict.limit_mb, "loaded_already": verdict.loaded_already,
        "need_from": verdict.need_from, "short": verdict.short,
    }


def _log_line(doing: str, verdict: MemoryVerdict) -> str:
    return (
        f"ask_memory [{doing}]: {verdict.model} free={verdict.available_mb} MB need={verdict.needed_mb} MB "
        f"({verdict.need_from}) left={verdict.left_mb} MB limit={verdict.limit_mb} MB "
        f"-> {'SHORT' if verdict.short else 'ok'}"
    )


async def ask_memory_warning(
    ollama_base: str, model: str, ask_diagnostics: dict[str, Any], reply_extras: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """The Ask's one call: the refusal to return when loading ``model`` would be short, else None.

    ``ollama_base`` is the server the Ask talks to (``normalize_ollama_base``'s third value).
    ``reply_extras`` are the fields every refusal carries; the refusal is the same shape the "AI is not set
    up" one uses."""
    if consume_ask_anyway():
        ask_diagnostics["memory_check"] = {"asked_anyway": True, "model": model}
        logger.info("ask_memory [ask]: asked anyway, check skipped for %s", model)
        return None
    verdict = await asyncio.to_thread(check_memory_for_model, ollama_base, model)
    if verdict is None:
        return None
    ask_diagnostics["memory_check"] = _diagnostics(verdict)
    logger.info(_log_line("ask", verdict))
    if not verdict.short:
        return None
    return {
        "success": False, "response": low_memory_message(verdict), "model_policy_disclosure": None, **reply_extras,
    }


async def memory_short_for_sum_up(chat_url: str, model: str) -> bool:
    """True when the Sum up this chat button would load ``model`` into too little memory (one log line).

    ``chat_url`` is the job's ``.../api/chat`` address. Unlike an Ask there is no "anyway": the button
    refuses with the ``low_memory`` status and the screen says so. Never uses up an armed "Ask anyway"."""
    verdict = await asyncio.to_thread(check_memory_for_model, ollama_base_from_chat_url(chat_url), model)
    if verdict is None:
        return False
    logger.info(_log_line("chat sum-up", verdict))
    return verdict.short
