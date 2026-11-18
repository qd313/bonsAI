"""Title: Covering the whole answer to "how does the game end?"

Purpose: Some questions ask for the biggest story spoiler there is: how a game ends, who the true final
boss is, who dies, what the plot twist is. The answer's first sentence (Headline first: one short sentence
that carries the point) is then the spoiler itself, in plain view. This puts the WHOLE answer, first
sentence included, inside one ```bonsai-spoiler``` cover the person opens on purpose. The back end does
it, in every Ask mode, so the cover does not depend on the AI remembering a rule.
Used for: ollama_ask_service.py (every flush of a streaming answer, and the decision for the turn) and
game_ai_request.py (the finished answer before it is saved and returned).
Solves: Deck, plan 105 Headline-first check, question "How does Hollow Knight end?" (no game running,
Speed): the answer opened "The game ends after you defeat the final boss, who is the Hollow Knight itself
..." with nothing covering it. The maintainer's call, 2026-11-17: allow the ending question, but make sure
the whole response is spoilered.
Does not: change the Default spoiler paragraph or the Strategy Guide policy text, hide a sentence of any
other answer, or look at the model's words to decide (only at the question). It never covers an answer
when the person said spoilers are fine or chose Hide less.

How it works:
 1. ``question_asks_for_the_ending()`` reads the person's own question against a short named list of
    phrases (``ENDING_PHRASES``) plus one shape, "how does ... end". Matching is case-insensitive and on
    whole words, so "plot" alone never matches (Stardew has farm plots) and "end the day" never matches.
 2. ``ending_cover_applies()`` adds the two ways out: the existing consent reading
    (``user_consents_strategy_spoilers``, plus the Ask's own consent flag the caller passes in) and the
    Hide less spoiler tier.
 3. ``cover_whole_answer()`` writes the cover. While the answer streams, the fence is OPEN from the first
    word, which the screen draws as its "Spoiler hidden until complete" chip, so no word shows; when the
    answer is done the fence is closed and the screen draws the tap-to-open cover. A fence the model wrote
    itself is taken out first (a cover inside a cover would end the outer one early), and an ordinary
    code block inside is kept, drawn with tildes so it cannot end the cover either.

Gotchas:
 - A false match only costs the person one extra press to open the cover. The list is therefore plain and
   short, and errs towards covering. A missed ending question is the costly side.
 - "final boss" alone is NOT on the list: "how do I beat the final boss" is a strategy question. Only the
   asking-who forms ("who is the final boss") match.
 - The screen opens a cover by itself in three cases (consent, a game on the no-story list, a boss the
   person named in the question). Those rules are the screen's own and are left as they are.
"""

from __future__ import annotations

import re

from backend.answer.response_verify import (
    _fence_chunk_is_closed,
    _fence_opener,
    _split_fenced_segments,
)
from backend.spoilers.spoiler_title_profiles import TIER_PROFILE_OPEN
from backend.spoilers.strategy_spoiler_policy import (
    move_midline_fence_openers_to_line_start,
    partial_fence_tail_match,
    user_consents_strategy_spoilers,
)

# The phrases. Whole words, any run of spaces between the words, apostrophes of either kind. Each one
# is a way of asking how a story ends or for a big reveal. Not here on purpose: "plot" alone (a farm
# plot), "end the day", and "final boss" alone (see the header).
ENDING_PHRASES: tuple[str, ...] = (
    # "how does Hollow Knight end?" is the shape below; these are the others.
    "how it ends",
    "how it all ends",
    "how the game ends",
    "how the story ends",
    "what happens at the end",
    "what happens in the end",
    "what happens at the very end",
    # The ending itself.
    "the ending",
    "the endings",
    "an ending",
    "true ending",
    "real ending",
    "secret ending",
    "hidden ending",
    "good ending",
    "bad ending",
    "best ending",
    "worst ending",
    "happy ending",
    "alternate ending",
    "any ending",
    "which ending",
    # The last boss, asked as a who or a what (not "how do I beat it").
    "who is the final boss",
    "who is the last boss",
    "who is the true final boss",
    "who is the real final boss",
    "who was the final boss",
    "who's the final boss",
    "who's the last boss",
    # Deaths, betrayals, twists and reveals.
    "who dies",
    "who died",
    "who betrays",
    "who betrayed",
    "who survives",
    "plot twist",
    "plot twists",
    "story twist",
    "story reveal",
    "major reveal",
    "big reveal",
)

# "how does Hollow Knight end?": the game's name sits between, so up to five words are allowed there,
# and "end" must finish the question or the sentence ("how does the day end in Stardew" has more words
# after it, so it is not read as asking for the ending).
_HOW_DOES_END_RE = re.compile(
    r"(?<![a-z0-9])how\s+(?:does|did|will)\s+(?:[^\s?!.,;]+\s+){0,5}?ends?(?=\s*(?:[?!.,;]|$))"
)


def _phrase_pattern(phrase: str) -> str:
    return r"(?<![a-z0-9])" + r"\s+".join(re.escape(w) for w in phrase.split()) + r"(?![a-z0-9])"


_PHRASES_RE = re.compile("|".join(_phrase_pattern(p) for p in ENDING_PHRASES))


def question_asks_for_the_ending(question: str) -> bool:
    """True when the question asks how a story ends or for a major story reveal.

    A false match only costs the person one extra press to open the cover.
    """
    low = (question or "").lower().replace("’", "'").replace("‘", "'")
    if not low.strip():
        return False
    return bool(_PHRASES_RE.search(low) or _HOW_DOES_END_RE.search(low))


def ending_cover_applies(question: str, *, consent: bool, title_profile: str = "") -> bool:
    """True when this turn's whole answer goes inside one cover.

    ``consent`` is the Ask's own consent (the strategy consent the caller already worked out); the
    person's words in ``question`` are read too, the same way Strategy Guide reads them. Hide less
    (the open tier) also turns it off: the person asked for no covers at all.
    """
    if consent or title_profile == TIER_PROFILE_OPEN:
        return False
    if user_consents_strategy_spoilers(question):
        return False
    return question_asks_for_the_ending(question)


def _inner_fence_lines(chunk: str, opener_info: str) -> list[str]:
    """The lines of one fence the model wrote, as they sit inside the cover: a spoiler fence
    loses its marks, any other fence keeps its words and swaps backtick marks for tildes."""
    lines = chunk.split("\n")
    closed = _fence_chunk_is_closed(chunk)
    body = lines[1:-1] if closed else lines[1:]
    if opener_info.lower().startswith("bonsai-spoiler"):
        glued = opener_info[len("bonsai-spoiler"):].strip()
        return ([glued] if glued else []) + body
    # An ordinary code block: tildes cannot end the cover's backtick fence. Quote marks and indent
    # are not kept on its opener (the cover is drawn from plain lines).
    out = ["~~~" + opener_info.split(" ", 1)[0] if opener_info else "~~~"] + body
    if closed:
        out.append("~~~")
    return out


def cover_whole_answer(text: str, *, done: bool) -> str:
    """Put ``text`` (the whole answer so far) inside one ```bonsai-spoiler``` cover.

    ``done`` False is a stream still arriving: the cover is left open (the screen draws a chip, no
    word shows) and a half-typed fence mark at the very end is held back. ``done`` True closes it. An
    empty or blank answer comes back as it is. Running it twice gives the same text.
    """
    if not (text or "").strip():
        return text
    parts: list[str] = []
    for kind, chunk in _split_fenced_segments(move_midline_fence_openers_to_line_start(text)):
        opener = _fence_opener(chunk.split("\n", 1)[0]) if kind == "fence" else None
        if opener is None:
            parts.append(chunk)
        elif opener[0] == "`" or opener[2].lower().startswith("bonsai-spoiler"):
            parts.append("\n".join(_inner_fence_lines(chunk, opener[2])))
        else:
            parts.append(chunk)
    body = "".join(parts)
    if not done:
        tail = partial_fence_tail_match(body)
        if tail:
            body = body[: tail.start()]
    body = (body.rstrip() if done else body).strip("\n")
    if not body.strip():
        return text
    return f"```bonsai-spoiler\n{body}\n```" if done else f"```bonsai-spoiler\n{body}"
