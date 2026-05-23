"""Extract model-emitted ``<bonsai-status>`` tags from streaming Ollama replies."""

from __future__ import annotations

import re
from typing import Optional, Tuple

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
