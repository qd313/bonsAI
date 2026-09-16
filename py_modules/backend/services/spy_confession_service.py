"""Title: The Spy's after-the-fact confession tag

Purpose: At the two heaviest accent settings the Spy character voice (ai_character_service.py)
is instructed to give advice that sounds right and is wrong, then end the reply with a short
closing block naming what it lied about. This file holds the exact shape of that closing block —
one constant the prompt text and the parser both read, so the two cannot drift apart — and the
function that pulls it back out of a finished reply: the clean text a person reads, plus the list
of lies for the Show details chip. It mirrors spoiler_risk_service.py's own model tag parsing,
one file over.
Used for: Called from game_ai_request.py once a Spy-voiced reply comes back at a lying accent
level, to strip the tag out of the text a person sees and hand the lies to the transparency
snapshot's Spy chip.
Solves: A closing-tag reveal only works if the text the model is told to write and the text the
parser looks for are the exact same string. Keeping that string in one place, imported by both
sides, is what stops the shape used in the prompt from silently drifting away from the shape the
parser expects — the exact failure a change note elsewhere in this repo describes shipping with
seven passing tests that all asserted a shape the prompt never actually produced.
Does not: Decide whether the Spy is in a lying mode, or write the prompt text that asks for the
tag — both of those stay in ai_character_service.py. This file only knows the tag's shape and how
to read it back out.
"""

from __future__ import annotations

import re

SPY_LIES_TAG_OPEN = "<bonsai-spy-lies>"
SPY_LIES_TAG_CLOSE = "</bonsai-spy-lies>"

_SPY_LIES_TAG_RE = re.compile(
    re.escape(SPY_LIES_TAG_OPEN) + r"(.*?)" + re.escape(SPY_LIES_TAG_CLOSE),
    re.IGNORECASE | re.DOTALL,
)


def parse_spy_lies_tag(text: str) -> tuple[str, list[str]]:
    """Strip a closed confession tag out of ``text``; return the clean text and the lies.

    Mirrors ``parse_bonsai_spoiler_risk_tag`` in spoiler_risk_service.py: an unclosed or
    missing tag is left exactly alone (nothing stripped, an empty lies list) rather than
    guessed at, the same way that function ignores an incomplete
    ``<bonsai-spoiler-risk>`` tag while it is still streaming in.

    A closed tag with no lines inside it (the model confessed to nothing) still counts as a
    tag: the text is stripped and an empty list comes back, so the caller can tell "the Spy
    was on and said he told no lies" apart from "the Spy was on and never confessed at all".
    """
    raw = text or ""
    match = _SPY_LIES_TAG_RE.search(raw)
    if not match:
        return raw, []
    lies = [line.strip() for line in match.group(1).splitlines() if line.strip()]
    clean = (raw[: match.start()] + raw[match.end() :]).strip()
    return clean, lies
