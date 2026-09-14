"""Title: Ollama Ask token budgets

Purpose: Per-mode visible ``num_predict`` caps, thinking budgets, and the session record of
which models reject ``think``.
Used for: ``post_ollama_chat`` request options, driven by the ``ask_think_effort`` setting.
Solves: Split visible vs thinking token budgets so enabling ``think`` cannot starve the
visible channel and return an empty reply.
Does not: Own soft-continue stitching, the retry that uses ``mark_model_without_thinking``
(``ollama_service``), or the Settings UI (``OllamaThinkingEffortRow``).
"""

from __future__ import annotations

from typing import Any, Optional, Union

# Visible reply budgets on the wire as ``options.num_predict`` when thinking is off.
# Keys MUST match ``VALID_ASK_MODES`` in backend/services/ask_payload.py, which is where
# the one definition lives (it was on the Plugin class until 2026-09-14). Nothing enforces
# that at import time, and a mismatch fails silently: ``normalize_ask_mode`` falls back to
# "speed", so the mode quietly runs on the Speed cap. This table shipped keyed "deep" --
# the mode's pre-2026-06-26 name -- so Expert ran on 800 instead of 1200 until 2026-08-15.
# Settings coerce legacy "deep" to "expert" on load (settings_service._sanitize_ask_mode),
# so "deep" never reaches here. Guarded by test_every_valid_ask_mode_has_its_own_cap and
# test_every_place_that_knows_the_ask_modes_agrees, which also covers model routing.
ASK_VISIBLE_NUM_PREDICT: dict[str, int] = {
    "speed": 800,
    "expert": 1200,
    "strategy": 1600,
}

# Reserved thinking-token budgets for effort control (Phase 1). While effort is ``off``,
# these are not added to ``num_predict`` and ``think`` stays false on the wire.
ASK_THINKING_BUDGET: dict[str, int] = {
    "off": 0,
    "low": 256,
    "medium": 512,
    "high": 1024,
}

ASK_MAX_SOFT_CONTINUES = 2

# Ephemeral stream-tail cue while a soft continue is in flight. Never persist in the
# final reply / history / copy path — strip before finalize.
SOFT_CONTINUE_CUE = "Continuing…"

SOFT_CONTINUE_USER_MESSAGE = (
    "Continue the answer from where you left off. Do not repeat text already written."
)

ThinkWire = Union[bool, str]


def normalize_ask_mode(ask_mode: Optional[str]) -> str:
    mode = str(ask_mode or "speed").strip().lower()
    if mode in ASK_VISIBLE_NUM_PREDICT:
        return mode
    return "speed"


def normalize_think_effort(think_effort: Optional[str]) -> str:
    effort = str(think_effort or "off").strip().lower()
    if effort in ASK_THINKING_BUDGET:
        return effort
    return "off"


def resolve_ask_token_budgets(
    ask_mode: Optional[str] = "speed",
    *,
    think_effort: Optional[str] = "off",
) -> dict[str, Any]:
    """Resolve wire ``num_predict`` / ``think`` plus the visible-vs-thinking token split.

    ``think_effort=\"off\"`` (the default) sends ``think: False`` with ``num_predict`` equal
    to the visible cap only. low/medium/high send ``think: True`` and add the reserved
    thinking budget on top, so reasoning cannot eat the visible reply's allowance.
    """
    mode = normalize_ask_mode(ask_mode)
    effort = normalize_think_effort(think_effort)
    visible = int(ASK_VISIBLE_NUM_PREDICT[mode])
    thinking = int(ASK_THINKING_BUDGET[effort])
    # Boolean on the wire for every level, not the effort name. Named levels
    # ("low"/"medium"/"high") are a gpt-oss-family feature; qwen3 and deepseek-r1 -- the
    # thinking models most likely on a Deck -- accept only a boolean and reject a string.
    # Effort is expressed through ``thinking_budget`` below, which buys reasoning headroom
    # in ``num_predict`` rather than asking Ollama for a depth it may not understand.
    # Supersedes the string mapping locked in planning doc 16; see decision D21.
    think_wire: ThinkWire = effort != "off"
    return {
        "ask_mode": mode,
        "think_effort": effort,
        "visible_num_predict": visible,
        "thinking_budget": thinking,
        "num_predict": visible + thinking,
        "think": think_wire,
        "max_continues": ASK_MAX_SOFT_CONTINUES,
    }


# Models observed rejecting ``think`` this plugin session. Process lifetime is exactly
# plugin-session lifetime, and the entry caches an immutable fact about a model, so a stale
# entry only means thinking stays off for it until the next reload. Global mutable state is
# a deliberate compromise to keep the wasted round trip to once per model instead of once
# per Ask -- tests that touch it MUST call reset_thinking_support_cache() in setUp.
_MODELS_WITHOUT_THINKING: set[str] = set()


def mark_model_without_thinking(model: str) -> None:
    """Remember that ``model`` rejected ``think`` so later Asks skip the failed attempt."""
    tag = str(model or "").strip()
    if tag:
        _MODELS_WITHOUT_THINKING.add(tag)


def model_supports_thinking(model: str) -> bool:
    """False only once a model has actually rejected thinking; unknown models are tried."""
    return str(model or "").strip() not in _MODELS_WITHOUT_THINKING


def reset_thinking_support_cache() -> None:
    """Test-only: clear the session cache so suites do not depend on execution order."""
    _MODELS_WITHOUT_THINKING.clear()


def strip_soft_continue_cue(text: str) -> str:
    """Remove a trailing ephemeral continue cue from streamed or final text."""
    raw = str(text or "")
    if not raw:
        return raw
    trimmed = raw.rstrip()
    if trimmed.endswith(SOFT_CONTINUE_CUE):
        return trimmed[: -len(SOFT_CONTINUE_CUE)].rstrip()
    return raw
