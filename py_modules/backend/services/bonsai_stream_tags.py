"""Extract model-emitted ``<bonsai-status>`` tags from streaming Ollama replies."""

from __future__ import annotations

import re
from typing import Literal, Optional, Tuple

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


def format_thinking_phase(
    phase: AskThinkingPhase,
    *,
    app_name: str = "",
    attachment_count: int = 0,
    ask_mode: str = "speed",
) -> str:
    """Build a deterministic, context-aware status line for pending Ask phases."""
    _ = ask_mode  # reserved for future mode-specific copy
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
