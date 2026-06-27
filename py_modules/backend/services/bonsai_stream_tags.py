"""Extract model-emitted ``<bonsai-status>`` tags from streaming Ollama replies."""

from __future__ import annotations

import re
from typing import Literal, Optional, Tuple

from backend.services.ollama_prompts import (
    _user_asks_resolution_relevant_performance,
    question_matches_troubleshooting_log_context,
    user_asks_ollama_bonsai_host_or_latency,
    user_wants_power_or_performance_topic,
)
from refactor_helpers import is_current_tdp_read_intent

AskThinkingPhase = Literal[
    "starting",
    "proton_logs",
    "tdp_read",
    "screenshot_prep",
    "building_context",
    "connecting_model",
    "model_retry",
]

_PHASE_MAX_LEN = 240
_APP_NAME_MAX_LEN = 40
_SNIPPET_MAX_LEN = 56
_BUILDING_CONTEXT_MAX_SECONDS = 1.0
_SARCASM_RATE = 0.30

_THINKING_TONE = Literal["neutral", "witty", "deadpan"]

_BONSAI_STATUS_RE = re.compile(
    r"<bonsai-status>\s*(.*?)\s*</bonsai-status>",
    re.IGNORECASE | re.DOTALL,
)
_BONSAI_STATUS_OPEN = "<bonsai-status>"
_BONSAI_STATUS_CLOSE = "</bonsai-status>"


def _strip_incomplete_bonsai_status_open(raw: str) -> str:
    """Hide a still-streaming status tag from visible assistant text."""
    lower = raw.lower()
    open_idx = lower.find(_BONSAI_STATUS_OPEN)
    if open_idx < 0:
        return raw
    if _BONSAI_STATUS_CLOSE in lower[open_idx:]:
        return raw
    return raw[:open_idx].rstrip()


def extract_bonsai_status(text: str) -> Tuple[Optional[str], str]:
    """Return (status_summary, text_with_status_tags_removed)."""
    raw = text or ""
    match = _BONSAI_STATUS_RE.search(raw)
    if not match:
        return None, _strip_incomplete_bonsai_status_open(raw)
    summary = (match.group(1) or "").strip()
    stripped = _BONSAI_STATUS_RE.sub("", raw, count=1).lstrip()
    return (summary[:240] if summary else None), stripped


def _sanitize_app_name(app_name: str) -> str:
    """Truncate and strip control chars from game title for user-visible status lines."""
    raw = (app_name or "").strip()
    if not raw:
        return ""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", raw)
    if len(cleaned) > _APP_NAME_MAX_LEN:
        return cleaned[: _APP_NAME_MAX_LEN - 1].rstrip() + "…"
    return cleaned


def extract_question_snippet(question: str, max_len: int = _SNIPPET_MAX_LEN) -> str:
    """First meaningful clause from the user question for status-line weaving."""
    raw = re.sub(r"\s+", " ", (question or "").strip())
    if not raw:
        return ""
    for sep in (". ", "? ", "! ", "; ", " — ", " - "):
        if sep in raw:
            raw = raw.split(sep, 1)[0].strip()
            break
    if len(raw) > max_len:
        return raw[: max_len - 1].rstrip() + "…"
    return raw


def _stable_bucket(request_id: int, elapsed_seconds: float = 0.0, period: float = 4.0) -> int:
    rid = max(0, int(request_id or 0))
    bucket = int(max(0.0, elapsed_seconds) // max(1.0, period))
    return (rid * 2654435761 + bucket * 97) & 0x7FFFFFFF


def sarcasm_roll(request_id: int, *, enabled: bool) -> bool:
    """~30% sarcasm when character roleplay is on."""
    if not enabled:
        return False
    return (_stable_bucket(request_id) % 100) < int(_SARCASM_RATE * 100)


def _pick_template(templates: list[str], request_id: int, elapsed_seconds: float = 0.0) -> str:
    if not templates:
        return "Working on your question…"
    idx = _stable_bucket(request_id, elapsed_seconds) % len(templates)
    return templates[idx]


def compose_thinking_blurb(
    question: str,
    *,
    app_name: str = "",
    attachment_count: int = 0,
    ask_mode: str = "speed",
    request_id: int = 0,
    character_enabled: bool = False,
    character_preset_id: Optional[str] = None,
    elapsed_seconds: float = 0.0,
) -> str:
    """Instant, question-woven pending status (Tier A composer — no extra model call)."""
    from backend.services.ai_character_service import thinking_status_tone_for_preset

    snippet = extract_question_snippet(question)
    game = _sanitize_app_name(app_name)
    quote = f'"{snippet}"' if snippet else "your question"
    game_bit = f" in {game}" if game else ""
    has_shot = int(attachment_count or 0) > 0

    tone: _THINKING_TONE = "neutral"
    sarcastic = False
    if character_enabled:
        tone = thinking_status_tone_for_preset(character_preset_id)
        sarcastic = sarcasm_roll(request_id, enabled=True)

    if question_matches_troubleshooting_log_context(question) or user_asks_ollama_bonsai_host_or_latency(question):
        pool = [
            f"Digging into {quote}{game_bit}…",
            f"Checking logs and context for {quote}…",
        ]
    elif is_current_tdp_read_intent(question) or user_wants_power_or_performance_topic(question):
        pool = [
            f"Pulling power context for {quote}…",
            f"Checking TDP and performance angles on {quote}…",
        ]
    elif _user_asks_resolution_relevant_performance(question):
        pool = [
            f"Thinking about resolution and FPS for {quote}…",
            f"Sizing up graphics settings around {quote}…",
        ]
    elif ask_mode == "strategy":
        pool = [
            f"Mapping a strategy take on {quote}{game_bit}…",
            f"Scouting the puzzle without spoiling {quote}…",
        ]
    elif has_shot:
        pool = [
            f"Reviewing your screenshot alongside {quote}…",
            f"Pairing the capture with {quote}{game_bit}…",
        ]
    else:
        pool = [
            f"Looking at {quote}{game_bit}…",
            f"Getting context for {quote}…",
            f"On it — {quote}{game_bit}…",
        ]

    if character_enabled and sarcastic and tone in ("witty", "deadpan"):
        if tone == "deadpan":
            pool = [f"Fine. {t}" for t in pool] + [f"Sure. {quote}. Working{game_bit}."]
        else:
            pool = pool + [
                f"Oh joy — {quote}{game_bit}. One sec.",
                f"Another crisis: {quote}. Give me a moment{game_bit}.",
            ]

    text = _pick_template(pool, request_id, elapsed_seconds)
    return text[:_PHASE_MAX_LEN]


def _thinking_weave_bits(question: str, app_name: str) -> tuple[str, str, str]:
    """Return (quote, game_bit, game_clause) for woven status lines."""
    snippet = extract_question_snippet(question)
    game = _sanitize_app_name(app_name)
    quote = f'"{snippet}"' if snippet else "your question"
    game_bit = f" in {game}" if game else ""
    game_clause = f" for {game}" if game else ""
    return quote, game_bit, game_clause


def _apply_character_phase_variants(
    pool: list[str],
    *,
    quote: str,
    game_bit: str,
    request_id: int,
    character_enabled: bool,
    character_preset_id: Optional[str],
    elapsed_seconds: float,
) -> str:
    """Pick a template and optionally append witty/deadpan variants."""
    from backend.services.ai_character_service import thinking_status_tone_for_preset

    tone: _THINKING_TONE = "neutral"
    sarcastic = False
    if character_enabled:
        tone = thinking_status_tone_for_preset(character_preset_id)
        sarcastic = sarcasm_roll(request_id, enabled=True)
    if character_enabled and sarcastic and tone in ("witty", "deadpan"):
        if tone == "deadpan":
            pool = [f"Fine. {t}" for t in pool] + [f"Sure. {quote}. Working{game_bit}."]
        else:
            pool = pool + [
                f"Oh joy — {quote}{game_bit}. One sec.",
                f"Another crisis: {quote}. Give me a moment{game_bit}.",
            ]
    return _pick_template(pool, request_id, elapsed_seconds)


def format_thinking_phase(
    phase: AskThinkingPhase,
    *,
    app_name: str = "",
    attachment_count: int = 0,
    ask_mode: str = "speed",
    elapsed_seconds: float = 0.0,
    question: str = "",
    request_id: int = 0,
    character_enabled: bool = False,
    character_preset_id: Optional[str] = None,
) -> str:
    """Build a deterministic, context-aware status line for pending Ask phases."""
    woven_q = (question or "").strip()
    if woven_q:
        if phase == "starting":
            return compose_thinking_blurb(
                woven_q,
                app_name=app_name,
                attachment_count=attachment_count,
                ask_mode=ask_mode,
                request_id=request_id,
                character_enabled=character_enabled,
                character_preset_id=character_preset_id,
                elapsed_seconds=elapsed_seconds,
            )
        quote, game_bit, game_clause = _thinking_weave_bits(woven_q, app_name)
        if phase == "building_context" and elapsed_seconds > _BUILDING_CONTEXT_MAX_SECONDS:
            pool = [f"Still working on {quote}{game_bit}…", f"Still preparing {quote}…"]
            text = _apply_character_phase_variants(
                pool,
                quote=quote,
                game_bit=game_bit,
                request_id=request_id,
                character_enabled=character_enabled,
                character_preset_id=character_preset_id,
                elapsed_seconds=elapsed_seconds,
            )
            return text[:_PHASE_MAX_LEN]
        if phase == "proton_logs":
            pool = [
                f"Checking logs for {quote}{game_bit}…",
                f"Reading Proton logs for {quote}{game_bit}…",
            ]
        elif phase == "tdp_read":
            pool = [
                f"Pulling power context for {quote}…",
                f"Checking TDP for {quote}{game_bit}…",
            ]
        elif phase == "screenshot_prep":
            n = max(0, int(attachment_count or 0))
            if n <= 1:
                pool = [
                    f"Preparing screenshot for {quote}{game_bit}…",
                    f"Pairing the capture with {quote}{game_bit}…",
                ]
            else:
                pool = [
                    f"Preparing {n} screenshots for {quote}…",
                    f"Pairing {n} captures with {quote}{game_bit}…",
                ]
        elif phase == "building_context":
            pool = [
                f"Getting context for {quote}{game_bit}…",
                f"Building context for {quote}…",
            ]
        elif phase == "connecting_model":
            pool = [f"Connecting for {quote}{game_bit}…", f"Connecting to model for {quote}…"]
        elif phase == "model_retry":
            pool = [
                f"Trying another model for {quote}…",
                f"Switching models for {quote}{game_bit}…",
            ]
        else:
            pool = [f"Working on {quote}{game_bit}…"]
        text = _apply_character_phase_variants(
            pool,
            quote=quote,
            game_bit=game_bit,
            request_id=request_id,
            character_enabled=character_enabled,
            character_preset_id=character_preset_id,
            elapsed_seconds=elapsed_seconds,
        )
        return text[:_PHASE_MAX_LEN]

    if phase == "building_context" and elapsed_seconds > _BUILDING_CONTEXT_MAX_SECONDS:
        return "Still preparing…"[:_PHASE_MAX_LEN]
    game = _sanitize_app_name(app_name)
    game_clause = f" for {game}" if game else ""

    if phase == "starting":
        text = "Starting…"
    elif phase == "proton_logs":
        text = f"Reading Proton logs{game_clause}…" if game else "Reading Proton logs…"
    elif phase == "tdp_read":
        text = "Checking current power limits…"
    elif phase == "screenshot_prep":
        n = max(0, int(attachment_count or 0))
        if n <= 1:
            text = "Preparing screenshot…"
        else:
            text = f"Preparing {n} screenshots…"
    elif phase == "building_context":
        text = f"Building context{game_clause}…" if game else "Building context…"
    elif phase == "connecting_model":
        text = "Connecting to model…"
    elif phase == "model_retry":
        text = "Trying another model…"
    else:
        text = "Working…"

    return text[:_PHASE_MAX_LEN]


def deterministic_thinking_phase_fallback(
    *,
    streaming: bool,
    has_partial: bool,
    elapsed_seconds: float,
) -> str:
    """Phase label when the model did not emit ``<bonsai-status>``."""
    if streaming and has_partial:
        return "Drafting reply…"
    if elapsed_seconds >= 8:
        return "Still working…"
    if elapsed_seconds >= 2:
        return "Generating…"
    return "Connecting…"
