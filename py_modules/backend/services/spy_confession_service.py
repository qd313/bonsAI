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
_SPY_LIES_OPEN_RE = re.compile(re.escape(SPY_LIES_TAG_OPEN), re.IGNORECASE)
# The closing tag with its ">" missing, which only counts at the very end of the reply (measured on
# the Deck 2026-09-30: the model wrote "</bonsai-spy-lies" and stopped). Mid-text it is not a closer.
_SPY_LIES_BRACKETLESS_CLOSE_RE = re.compile(
    re.escape(SPY_LIES_TAG_CLOSE[:-1]) + r"\s*\Z", re.IGNORECASE
)


def _drop_partial_closer(block: str) -> str:
    """Cut a closing tag that stops part-way through its name ("</bonsai-spy-l") off the end."""
    at = block.rfind("</")
    if at < 0:
        return block
    tail = block[at:].strip().lower()
    if SPY_LIES_TAG_CLOSE.startswith(tail):
        return block[:at]
    return block


def parse_spy_lies_tag(text: str) -> tuple[str, list[str]]:
    """Strip the confession tag out of ``text``; return the clean text and the lies.

    Mirrors ``parse_bonsai_spoiler_risk_tag`` in spoiler_risk_service.py for a closed tag. This
    reads a finished reply, so it also forgives the ways a small model ends the block badly
    (plan 77, SPY-REVEAL-01): a closing tag missing its ">" at the very end, a closing tag cut
    off part-way through its name, or no closing tag at all. In every one of those the block runs
    from the opening tag to the end of the reply, and none of it is left showing as raw markup.
    A reply with no opening tag is left exactly alone (nothing stripped, an empty lies list).

    A closed tag with no lines inside it (the model confessed to nothing) still counts as a
    tag: the text is stripped and an empty list comes back, so the caller can tell "the Spy
    was on and said he told no lies" apart from "the Spy was on and never confessed at all".
    """
    raw = text or ""
    match = _SPY_LIES_TAG_RE.search(raw)
    if match:
        block, before, after = match.group(1), raw[: match.start()], raw[match.end() :]
    else:
        opener = _SPY_LIES_OPEN_RE.search(raw)
        if not opener:
            return raw, []
        block, before, after = raw[opener.end() :], raw[: opener.start()], ""
        closer = _SPY_LIES_BRACKETLESS_CLOSE_RE.search(block)
        block = block[: closer.start()] if closer else _drop_partial_closer(block)
    lies = [line.strip() for line in block.splitlines() if line.strip()]
    return (before + after).strip(), lies
