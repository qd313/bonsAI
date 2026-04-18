"""Extract Strategy Guide branch-picker payloads from model replies."""

from __future__ import annotations

import json
import re
from typing import Any

# Must match the prefix composed by the Deck plugin when the user picks a branch.
STRATEGY_FOLLOWUP_PREFIX = "[Strategy follow-up]"

_FENCE_OPEN = "```bonsai-strategy-branches"
_MAX_OPTIONS = 8
_MIN_OPTIONS = 2


def is_strategy_followup_question(question: str) -> bool:
    return (question or "").lstrip().startswith(STRATEGY_FOLLOWUP_PREFIX)


def extract_strategy_guide_branches(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Remove a single ```bonsai-strategy-branches ... ``` fence from raw_text and return
    (visible_text, payload) where payload is {"question": str, "options": [{"id","label"}, ...]} or None.
    On any parse/validation failure, returns (raw_text, None).
    """
    text = raw_text or ""
    if _FENCE_OPEN not in text:
        return text, None

    idx = text.find(_FENCE_OPEN)
    head = text[:idx]
    tail_from_fence = text[idx + len(_FENCE_OPEN) :]

    # Allow optional language tag or whitespace after fence name
    tail_from_fence = tail_from_fence.lstrip()
    if tail_from_fence.startswith("\n"):
        tail_from_fence = tail_from_fence[1:]

    close_idx = tail_from_fence.find("```")
    if close_idx < 0:
        return text, None

    json_blob = tail_from_fence[:close_idx].strip()
    after_close = tail_from_fence[close_idx + 3 :].lstrip("\n")

    try:
        data = json.loads(json_blob)
    except json.JSONDecodeError:
        return text, None

    if not isinstance(data, dict):
        return text, None

    q = data.get("question")
    opts = data.get("options")
    if not isinstance(q, str) or not q.strip():
        return text, None
    if not isinstance(opts, list):
        return text, None

    normalized: list[dict[str, str]] = []
    for i, o in enumerate(opts[:_MAX_OPTIONS]):
        if not isinstance(o, dict):
            continue
        oid = str(o.get("id", "") or "").strip()
        lab = str(o.get("label", "") or "").strip()
        if not lab:
            continue
        if not oid:
            oid = chr(ord("a") + i)
        normalized.append({"id": oid, "label": lab})

    if len(normalized) < _MIN_OPTIONS:
        return text, None

    head_stripped = head.rstrip()
    if after_close:
        visible = (head_stripped + "\n\n" + after_close).strip() if head_stripped else after_close.strip()
    else:
        visible = head_stripped.strip()

    # Collapse excessive blank lines left after stripping the fence
    visible = re.sub(r"\n{3,}", "\n\n", visible).strip()
    if not visible:
        visible = "Choose where you are stuck below."

    return visible, {"question": q.strip(), "options": normalized}
