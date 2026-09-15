"""Title: Reading branch pickers and checklists out of an answer

Purpose: When you ask a strategy question, the AI can end its answer with a
special block asking which part you are stuck on, or a checklist tracking
steps for a longer strategy. This file finds that block inside whatever text
the model sends back, however messily it is formatted, turns it into the
clean shape the screen can draw as buttons or checkboxes, and strips it back
out of the text you actually read so you never see the raw block.

Used for: Every reply where the model was asked for a strategy follow-up --
questions the Deck itself marks with the STRATEGY_FOLLOWUP_PREFIX text -- and
the text shown on screen while an answer is still streaming in.

Solves: Real model output is messy. The block can come back in the exact
shape asked for, or fenced with the wrong language tag, or missing its
closing fence entirely, or URL-encoded inside brackets, or cut off mid-write
with unclosed braces. This file tries each shape in turn, and can repair JSON
a model has truncated. It also hides an unfinished block from the streaming
text while an answer is still arriving, since a half-written block is not
something anyone should have to read.

Does not: Talk to the AI, or remember checklist progress between messages --
that lives in strategy_checklist_session_service.

How it works:

Branch picker, through `extract_strategy_guide_branches()`:
 1. `_extract_fence()` looks first for the exact fence the model is asked
    for, opened with the text `bonsai-strategy-branches`.
 2. If that is not there, `_extract_jsonish_branch_fence()` tries a plain
    `json`-tagged fence instead -- something models reach for more often than
    the exact name asked for.
 3. If neither fence shape is there, `_extract_bracket_paren()` tries the
    alternate [bonsai-strategy-branches] (...) shape, including JSON that has
    been URL-encoded.
 4. Whichever shape is found, its JSON body goes through
    `_parse_strategy_json_blob()`, which tolerates a wrong language tag and
    trailing commas, and calls `_repair_truncated_json()` to close off braces
    and quotes a model cut off mid-write.
 5. `_normalize_branch_payload()` then checks the result actually has a real
    question and at least two real options, throwing the whole block away
    rather than showing something broken -- including a question or option
    that is still just the worked example's placeholder dots
    (`_is_ellipsis_placeholder()`).

Checklist, through `extract_strategy_checklist()` calling
`_extract_checklist_fence()`: a single fixed fence shape, parsed the same
way, checked by `_normalize_checklist_payload()` for a title and at least two
items.

While an answer is still streaming in, `hide_incomplete_strategy_branch_fence()`
and `hide_incomplete_strategy_checklist_fence()` cut an in-progress block out
of the visible text, so a half-written fence or a raw block of JSON never
flashes on screen before the final parse replaces it with the real picker or
checklist.

Gotchas:
 - `hide_incomplete_strategy_checklist_fence()` keeps whatever text follows
   the fence's closing marker, while the branch version throws it away -- that
   is not an inconsistency. The checklist is asked for after the coaching
   text in the prompt, so anything after it is more of that text, not a
   leftover piece of the block; a branch picker is asked for last, so
   anything after it is model drift worth dropping.
 - A rejected block is simply dropped, exact wording included, rather than
   shown as-is. That is deliberate: the comment inside
   `hide_incomplete_strategy_checklist_fence()` records a real case where a
   broken checklist left the player looking at raw JSON that was also, in the
   UI, a dead button.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import unquote

# Must match the prefix composed by the Deck plugin when the user picks a branch.
STRATEGY_FOLLOWUP_PREFIX = "[Strategy follow-up]"

_FENCE_OPEN = "```bonsai-strategy-branches"
_FENCE_OPEN_RE = re.compile(r"```\s*bonsai-strategy-branches\b[^\n]*\n?", re.IGNORECASE)
_CHECKLIST_FENCE_OPEN = "```bonsai-strategy-checklist"
# Models often emit ```json for the branch payload instead of the canonical fence name.
_JSON_FENCE_OPEN_RE = re.compile(r"```(?:json|JSON)?\s*\n", re.MULTILINE)
# Some models emit this tag with parenthesized JSON (often URL-encoded) instead of a markdown fence.
_BRACKET_TAG_RE = re.compile(r"\[bonsai-strategy-branches\]\s*\(", re.IGNORECASE)
_MAX_OPTIONS = 8
_MIN_OPTIONS = 2
_MAX_CHECKLIST_ITEMS = 12
_MIN_CHECKLIST_ITEMS = 2


def hide_incomplete_strategy_branch_fence(text: str) -> str:
    """Hide strategy-branch fence bodies from streaming visible text (picker comes from final extract)."""
    raw = text or ""
    m = _FENCE_OPEN_RE.search(raw)
    if m:
        # Hide even after the closing ``` — final extract owns the branch UI.
        return raw[: m.start()].rstrip()
    # Also hide ```json that looks like a branch payload mid-stream (closed or open).
    for jm in reversed(list(_JSON_FENCE_OPEN_RE.finditer(raw))):
        open_line_start = raw.rfind("\n", 0, jm.start()) + 1
        open_line = raw[open_line_start : jm.end()]
        if "bonsai-strategy" in open_line.lower():
            continue
        tail = raw[jm.end() :]
        peek = tail.lstrip()[:80].lower()
        if '"question"' in peek or '"options"' in peek:
            return raw[: jm.start()].rstrip()
    return raw


def hide_incomplete_strategy_checklist_fence(text: str) -> str:
    """
    Drop a checklist fence the parser refused, so raw JSON never reaches the answer bubble.

    The branch path has had `hide_incomplete_strategy_branch_fence` since the picker shipped;
    the checklist path had no twin, so a rejected fence stayed in the visible text. Measured on
    device 2026-08-28: a one-item checklist fails `_normalize_checklist_payload`'s two-item floor,
    `_extract_checklist_fence` returns the text untouched, and the user reads
    `{"title":"General Deck Performance Tip","items":[...]}` inside the reply -- where it is also
    its own D-pad stop that does nothing on A.

    Unlike the branch helper this keeps whatever follows the closing fence: the prompt asks for the
    checklist *after* the coaching prose, so a tail is model drift rather than payload, and dropping
    it would lose real text.
    """
    raw = text or ""
    idx = raw.find(_CHECKLIST_FENCE_OPEN)
    if idx < 0:
        return raw
    head = raw[:idx].rstrip()
    tail_from_fence = raw[idx + len(_CHECKLIST_FENCE_OPEN) :]
    close_idx = tail_from_fence.find("```")
    # No closing fence: the rest is an unfinished payload, so there is nothing to keep.
    tail = tail_from_fence[close_idx + 3 :].strip() if close_idx >= 0 else ""
    joined = (head + "\n\n" + tail).strip() if (head and tail) else (head or tail)
    return re.sub(r"\n{3,}", "\n\n", joined).strip()


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
    for candidate in (blob, _repair_truncated_json(blob)):
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            # Trailing commas: remove ,\s*} and ,\s*]
            relaxed = re.sub(r",\s*}", "}", candidate)
            relaxed = re.sub(r",\s*]", "]", relaxed)
            if relaxed == candidate:
                continue
            try:
                data = json.loads(relaxed)
            except json.JSONDecodeError:
                continue
        if isinstance(data, dict):
            return data
    return None


def _repair_truncated_json(blob: str) -> str:
    """Close unclosed braces/brackets/strings when the model cuts off mid-JSON."""
    s = (blob or "").rstrip()
    if not s:
        return s
    in_string = False
    escape = False
    stack: list[str] = []
    for ch in s:
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            stack.append("}")
        elif ch == "[":
            stack.append("]")
        elif ch in "}]" and stack and stack[-1] == ch:
            stack.pop()
    if in_string:
        s += '"'
    while stack:
        s += stack.pop()
    return s


# Placeholder text the model sometimes copies straight out of the prompt's worked example instead
# of filling it in. Seen on the Deck 2026-09-04 and again 2026-09-05: the picker asked
# "Where are you at in … ?" with the game's name replaced by three dots. The prompt example was
# rewritten the same day so there is nothing left to copy; this is the belt to that pair of braces,
# because a picker whose question has a hole where the game's name belongs tells the player nothing.
_ELLIPSIS_CHARS = ("…", "...")

# Matches an ellipsis standing on its own as a word -- whitespace on both sides -- which is what a
# copied placeholder looks like. Deliberately NOT a plain "contains an ellipsis" test: a real
# question may legitimately trail off ("So, where are you...?"), and dropping that picker would be
# worse than showing it. The hole always has a space either side because it stands in for a word.
_STANDALONE_ELLIPSIS = re.compile(r"\s(?:…|\.\.\.)\s")


def _is_ellipsis_placeholder(text: str) -> bool:
    """True when the text is a bare ellipsis, or still has one standing in for a missing word."""
    stripped = (text or "").strip()
    if not stripped:
        return True
    if stripped in _ELLIPSIS_CHARS:
        return True
    return bool(_STANDALONE_ELLIPSIS.search(stripped))


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
    # Same shape as the floor check above: an unusable block is dropped rather than shown. A
    # question that still carries the example's ellipsis, or any option label that does, means the
    # model echoed the template instead of answering, and the player would be asked to choose
    # between two sets of dots.
    if _is_ellipsis_placeholder(q) or any(_is_ellipsis_placeholder(o["label"]) for o in normalized):
        return None
    return {"question": q.strip(), "options": normalized}


def _coerce_branch_payload_from_blob(json_blob: str) -> dict[str, Any] | None:
    """Parse fence body into a branch payload; tolerate leading language tags / prose before JSON."""
    blob = (json_blob or "").strip()
    if not blob:
        return None
    # Drop a leading language tag line (e.g. "json") left inside the fence body.
    if "\n" in blob:
        first, rest = blob.split("\n", 1)
        if first.strip().lower() in {"json", "javascript", "js"} and rest.strip().startswith("{"):
            blob = rest.strip()
    data = _parse_strategy_json_blob(blob)
    payload = _normalize_branch_payload(data)
    if payload is not None:
        return payload
    # Last resort: first `{` … last `}` (unclosed fence or trailing prose).
    start = blob.find("{")
    end = blob.rfind("}")
    if start >= 0 and end > start:
        data = _parse_strategy_json_blob(blob[start : end + 1])
        return _normalize_branch_payload(data)
    return None


def _extract_fence(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """Markdown ```bonsai-strategy-branches ... ``` form (case-insensitive; closing fence optional)."""
    text = raw_text or ""
    m = _FENCE_OPEN_RE.search(text)
    if m:
        head = text[: m.start()]
        tail_from_fence = text[m.end() :]
    elif _FENCE_OPEN in text:
        idx = text.find(_FENCE_OPEN)
        head = text[:idx]
        tail_from_fence = text[idx + len(_FENCE_OPEN) :].lstrip()
        if tail_from_fence.startswith("\n"):
            tail_from_fence = tail_from_fence[1:]
    else:
        return text, None

    close_idx = tail_from_fence.find("```")
    if close_idx >= 0:
        json_blob = tail_from_fence[:close_idx].strip()
        after_close = tail_from_fence[close_idx + 3 :].lstrip("\n")
    else:
        # Model omitted closing fence — still try to recover the JSON object.
        json_blob = tail_from_fence.strip()
        after_close = ""

    payload = _coerce_branch_payload_from_blob(json_blob)
    if payload is None:
        return text, None

    head_stripped = head.rstrip()
    if after_close:
        visible = (head_stripped + "\n\n" + after_close).strip() if head_stripped else after_close.strip()
    else:
        visible = head_stripped.strip()

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


def _extract_jsonish_branch_fence(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """Accept trailing ```json / bare ``` fences whose body is a valid strategy branch payload.

    Models frequently ignore the required ```bonsai-strategy-branches opener and emit ```json instead.
    Only strips a fence when JSON normalizes to a branch payload (won't steal TDP ```json blocks).
    """
    text = raw_text or ""
    # Prefer the last matching fence (branch picker must be at end of reply).
    matches = list(_JSON_FENCE_OPEN_RE.finditer(text))
    for m in reversed(matches):
        # Skip canonical bonsai-* fences (handled elsewhere).
        open_line_start = text.rfind("\n", 0, m.start()) + 1
        open_line = text[open_line_start : m.end()]
        if "bonsai-strategy" in open_line.lower():
            continue
        head = text[: m.start()]
        tail = text[m.end() :]
        close_idx = tail.find("```")
        if close_idx >= 0:
            json_blob = tail[:close_idx].strip()
            after_close = tail[close_idx + 3 :].lstrip("\n")
        else:
            json_blob = tail.strip()
            after_close = ""
        payload = _coerce_branch_payload_from_blob(json_blob)
        if payload is None:
            continue
        head_stripped = head.rstrip()
        if after_close:
            visible = (head_stripped + "\n\n" + after_close).strip() if head_stripped else after_close.strip()
        else:
            visible = head_stripped.strip()
        visible = re.sub(r"\n{3,}", "\n\n", visible).strip()
        if not visible:
            visible = "Choose where you are stuck below."
        return visible, payload
    return text, None


def _normalize_checklist_payload(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if data is None:
        return None
    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        return None
    items_raw = data.get("items")
    if not isinstance(items_raw, list):
        return None

    normalized: list[dict[str, str]] = []
    for i, o in enumerate(items_raw[:_MAX_CHECKLIST_ITEMS]):
        if not isinstance(o, dict):
            continue
        oid = str(o.get("id", "") or "").strip()
        lab = str(o.get("label", "") or "").strip()
        if not lab:
            continue
        if not oid:
            oid = str(i + 1)
        normalized.append({"id": oid, "label": lab})

    if len(normalized) < _MIN_CHECKLIST_ITEMS:
        return None
    return {"title": title.strip(), "items": normalized}


def _extract_checklist_fence(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """Markdown ```bonsai-strategy-checklist ... ``` form."""
    text = raw_text or ""
    if _CHECKLIST_FENCE_OPEN not in text:
        return text, None

    idx = text.find(_CHECKLIST_FENCE_OPEN)
    head = text[:idx]
    tail_from_fence = text[idx + len(_CHECKLIST_FENCE_OPEN) :]
    tail_from_fence = tail_from_fence.lstrip()
    if tail_from_fence.startswith("\n"):
        tail_from_fence = tail_from_fence[1:]

    close_idx = tail_from_fence.find("```")
    if close_idx < 0:
        return text, None

    json_blob = tail_from_fence[:close_idx].strip()
    after_close = tail_from_fence[close_idx + 3 :].lstrip("\n")

    data = _parse_strategy_json_blob(json_blob)
    payload = _normalize_checklist_payload(data)
    if payload is None:
        return text, None

    head_stripped = head.rstrip()
    if after_close:
        visible = (head_stripped + "\n\n" + after_close).strip() if head_stripped else after_close.strip()
    else:
        visible = head_stripped.strip()

    visible = re.sub(r"\n{3,}", "\n\n", visible).strip()
    return visible, payload


def extract_strategy_checklist(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Remove a strategy checklist marker from raw_text and return
    (visible_text, payload) where payload is {"title": str, "items": [{"id","label"}, ...]} or None.
    """
    return _extract_checklist_fence(raw_text or "")


def format_strategy_checklist_state_block(state: dict[str, Any] | None) -> str:
    """Compact plugin-owned checklist progress for strategy follow-up system prompts."""
    if not isinstance(state, dict):
        return ""
    title = str(state.get("title", "") or "").strip()
    items = state.get("items")
    checked = state.get("checked_ids")
    if not title or not isinstance(items, list) or not items:
        return ""
    checked_set = {str(x).strip() for x in checked} if isinstance(checked, list) else set()
    done_labels: list[str] = []
    pending_labels: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        iid = str(item.get("id", "") or "").strip()
        lab = str(item.get("label", "") or "").strip()
        if not lab:
            continue
        if iid and iid in checked_set:
            done_labels.append(lab)
        else:
            pending_labels.append(lab)
    if not done_labels and not pending_labels:
        return ""
    lines = [
        "\n\nPLUGIN CHECKLIST STATE (user-tracked in the Deck UI — honor this; do not mark steps done unless listed under done):\n",
        f"title={title}\n",
    ]
    if done_labels:
        lines.append("done: " + "; ".join(done_labels) + "\n")
    if pending_labels:
        lines.append("pending: " + "; ".join(pending_labels) + "\n")
    lines.append(
        "Revise the ```bonsai-strategy-checklist fence on this reply: drop completed steps, add next steps if stuck, "
        "never mark items done the user did not complete.\n"
    )
    return "".join(lines)


def extract_strategy_guide_branches(raw_text: str) -> tuple[str, dict[str, Any] | None]:
    """
    Remove a strategy branch marker from raw_text and return
    (visible_text, payload) where payload is {"question": str, "options": [{"id","label"}, ...]} or None.

    Supported shapes:
    - ```bonsai-strategy-branches ... ``` (canonical)
    - ```json / bare ``` fences with a valid branch JSON body (common model drift)
    - [bonsai-strategy-branches] (JSON or %XX URL-encoded JSON)

    On any parse/validation failure for both shapes, returns (text_with_fence_or_tag_still_present, None)
    for the fence path only; if fence absent, bracket failure returns original text.
    """
    text = raw_text or ""
    vis, payload = _extract_fence(text)
    if payload is not None:
        return vis, payload
    vis, payload = _extract_jsonish_branch_fence(text)
    if payload is not None:
        return vis, payload
    return _extract_bracket_paren(text)
