"""Extract Strategy Guide branch-picker payloads from model replies."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import unquote

# Must match the prefix composed by the Deck plugin when the user picks a branch.
STRATEGY_FOLLOWUP_PREFIX = "[Strategy follow-up]"

_FENCE_OPEN = "```bonsai-strategy-branches"
# Some models emit this tag with parenthesized JSON (often URL-encoded) instead of a markdown fence.
_BRACKET_TAG_RE = re.compile(r"\[bonsai-strategy-branches\]\s*\(", re.IGNORECASE)
_MAX_OPTIONS = 8
_MIN_OPTIONS = 2


def is_strategy_followup_question(question: str) -> bool:
    return (question or "").lstrip().startswith(STRATEGY_FOLLOWUP_PREFIX)


def _parse_strategy_json_blob(json_blob: str) -> dict[str, Any] | None:
    """Parse JSON inside the strategy fence; tolerate minor model formatting drift."""
    blob = (json_blob or "").strip()
    if not blob:
        return None
    # Strip accidental outer markdown fences some models emit inside the block
    if blob.startswith("```"):
        inner = blob[3:].lstrip()
        if inner.lower().startswith("json"):
            inner = inner[4:].lstrip()
        close = inner.rfind("```")
        if close != -1:
            inner = inner[:close].strip()
        blob = inner or blob
    try:
        data = json.loads(blob)
    except json.JSONDecodeError:
        # Trailing commas: remove ,\s*} and ,\s*]
        relaxed = re.sub(r",\s*}", "}", blob)
        relaxed = re.sub(r",\s*]", "]", relaxed)
        if relaxed != blob:
            try:
                data = json.loads(relaxed)
            except json.JSONDecodeError:
                return None
        else:
            return None
    return data if isinstance(data, dict) else None


def _normalize_branch_payload(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if data is None:
        return None
    q = data.get("question")
    opts = data.get("options")
    if not isinstance(q, str) or not q.strip():
        return None
    if not isinstance(opts, list):
        return None

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
        return None
    return {"question": q.strip(), "options": normalized}


def _extract_fence(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """Markdown ```bonsai-strategy-branches ... ``` form."""
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

    data = _parse_strategy_json_blob(json_blob)
    payload = _normalize_branch_payload(data)
    if payload is None:
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

    return visible, payload


def _extract_bracket_paren(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Alternate model output: [bonsai-strategy-branches] ({...}) or URL-encoded JSON in parens.
    Tries each ')' end position from the right until JSON decodes and validates.
    """
    text = raw_text or ""
    m = _BRACKET_TAG_RE.search(text)
    if not m:
        return text, None

    idx = m.start()
    head = text[:idx]
    paren_open = m.end() - 1
    if paren_open < 0 or paren_open >= len(text) or text[paren_open] != "(":
        return text, None

    after_open = text[paren_open + 1 :]
    close_positions = [i for i, ch in enumerate(after_open) if ch == ")"]
    if not close_positions:
        return text, None

    for end in reversed(close_positions):
        inner = after_open[:end].strip()
        if not inner:
            continue
        blob = unquote(inner)
        data = _parse_strategy_json_blob(blob)
        if data is None:
            data = _parse_strategy_json_blob(inner)
        payload = _normalize_branch_payload(data)
        if payload is None:
            continue

        tail = after_open[end + 1 :].lstrip()
        head_stripped = head.rstrip()
        if tail:
            visible = (head_stripped + "\n\n" + tail).strip() if head_stripped else tail.strip()
        else:
            visible = head_stripped.strip()

        visible = re.sub(r"\n{3,}", "\n\n", visible).strip()
        if not visible:
            visible = "Choose where you are stuck below."
        return visible, payload

    return text, None


def extract_strategy_guide_branches(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Remove a strategy branch marker from raw_text and return
    (visible_text, payload) where payload is {"question": str, "options": [{"id","label"}, ...]} or None.

    Supported shapes:
    - ```bonsai-strategy-branches ... ``` (canonical)
    - [bonsai-strategy-branches] (JSON or %XX URL-encoded JSON)

    On any parse/validation failure for both shapes, returns (text_with_fence_or_tag_still_present, None)
    for the fence path only; if fence absent, bracket failure returns original text.
    """
    text = raw_text or ""
    vis, payload = _extract_fence(text)
    if payload is not None:
        return vis, payload
    return _extract_bracket_paren(text)
