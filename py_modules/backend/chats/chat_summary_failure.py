"""Title: Why a chat summary call did not finish

Purpose: A chat summary can fail in several different ways -- the model runner dies, the server
cannot be reached, the stream is cut off, the time limit runs out, the reply is empty. They all
ended in the same words on screen and the same log line, so a 68-second failure in a long chat
could not be told from any other. This file looks at what the streamed call handed back and
names the way it ended: one short code and one plain sentence of detail.
Used for: ``chat_summary_service.write_chat_summary`` (the log line and the outcome) and, through
the outcome's code, the warning line the player reads under the question.
Solves: "Couldn't sum up the chat this time" with nothing to say what to look at. The code is
what the screen's wording follows, the detail is what a person reading the log needs.
Does not: Call the model, retry anything, or decide whether a summary is needed. Does not read
the logs back. The code is a guess from the shape of the failure, never a promise of the cause;
the detail carries the server's own words so the guess can be checked.

How it works:
 1. A call that finished but left nothing to save is "empty", with how the model ended.
 2. A call that ran past its time limit is "timed_out".
 3. An HTTP error or an error the server streamed is "model_error" -- unless its own words say
    the chat did not fit the window, which is "no_room".
 4. No connection at all is "unreachable"; a stream that stopped early, or a connection that
    broke while it was being read, is "cut_off".
 5. Anything else is "unknown", with the reply's own text as the detail.
"""

from __future__ import annotations

import re
from typing import Any

REASON_TIMED_OUT = "timed_out"
REASON_NO_ROOM = "no_room"
REASON_UNREACHABLE = "unreachable"
REASON_CUT_OFF = "cut_off"
REASON_MODEL_ERROR = "model_error"
REASON_EMPTY = "empty"
REASON_UNKNOWN = "unknown"

# Every code the screen has a sentence for (the saved mark is "failed:<code>"). Anything else
# is shown with the plain, older line.
KNOWN_REASONS = (
    REASON_TIMED_OUT,
    REASON_NO_ROOM,
    REASON_UNREACHABLE,
    REASON_CUT_OFF,
    REASON_MODEL_ERROR,
    REASON_EMPTY,
)

# How long a detail may be in the log; a server's error body can be a whole page.
_DETAIL_CHARS = 240

# How Ollama words "this request does not fit the window": newer builds say "the input length
# exceeds the context length", older ones "prompt too long; exceeded max context length".
_NO_ROOM_RE = re.compile(
    r"context (?:length|window|size)|(?:prompt|input) (?:is )?too long|"
    r"exceed\w* (?:the )?(?:max\w* )?context",
    re.IGNORECASE,
)


def _one_line(text: Any, limit: int = _DETAIL_CHARS) -> str:
    return " ".join(str(text or "").split())[:limit]


def explain_failed_call(
    result: dict, *, reply_was_empty: bool = False, reply_chars: int = 0, kept_chars: int = 0
) -> tuple[str, str]:
    """``(reason code, one-line detail)`` for a streamed call that gave no summary to save.

    ``result`` is what ``_stream_ollama_chat_once`` returned. ``reply_was_empty`` is True when the
    call itself succeeded but nothing was left after the reply was cleaned; ``reply_chars`` and
    ``kept_chars`` are how much the model wrote and how much survived, for that line."""
    if reply_was_empty or result.get("success"):
        return REASON_EMPTY, (
            f"the AI finished (done_reason {result.get('done_reason')}, "
            f"{result.get('eval_count')} tokens) but no notes were left: it wrote "
            f"{reply_chars} characters, {kept_chars} after cleaning"
        )
    response = str(result.get("response") or "")
    body = _one_line(result.get("body"))
    if result.get("timed_out"):
        return REASON_TIMED_OUT, _one_line(response)
    status = result.get("status")
    if status is not None or body:
        reason = REASON_NO_ROOM if _NO_ROOM_RE.search(body) else REASON_MODEL_ERROR
        return reason, f"HTTP {status}: {body}" if status is not None else f"server error: {body}"
    lowered = response.lower()
    if "could not reach ollama" in lowered or "did not respond within" in lowered:
        return REASON_UNREACHABLE, _one_line(response)
    if "stream ended before completion" in lowered or "incomplete stream" in lowered:
        return REASON_CUT_OFF, _one_line(response)
    if "ollama request failed" in lowered:
        return REASON_CUT_OFF, (
            "the connection failed while the reply was being read "
            "(the unexpected-error line just above this one names it)"
        )
    return REASON_UNKNOWN, _one_line(response)
