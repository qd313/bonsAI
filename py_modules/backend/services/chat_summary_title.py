"""Title: The fresher chat title the summary can offer

Purpose: A chat is named after its first question and then drifts: it can still be called
"wheatley fight" while its last forty questions are about Half-Life 2 weapons. The summary call
already reads the whole chat, so it is also asked, with one extra line at the end of its reply,
whether the chat's current name still fits. This file holds the wording of that ask, takes the
extra line back out of the reply, and checks the title it suggested.
Used for: ``chat_summary_service`` (the request it sends and the reply it reads). The same call
serves the *Sum up this chat* button and the summary a chat writes on its own before an answer.
Solves: A chat list full of names that no longer say what the chat is about, with no way to find
that out except reading every chat. Done in the call that already happens, so it costs a few
words of reply, not a second call.
Does not: Rename anything. The suggestion is stored with the summary and the person says yes
or no on the summary card; ``chat_slot_service`` and ``chat_slot_rpc`` do the renaming. Does not
ask at all for a title the person typed by hand -- that one is never second-guessed.

How it works:
 1. ``title_instruction()`` is the sentence added to the summary request, naming the current
    title and asking for a last line ``TITLE: KEEP`` or ``TITLE: <new name>``.
 2. ``split_title_line()`` takes that line out of the model's reply before the summary text is
    cleaned and saved, so the line can never show up in the notes. A reply with no such line is
    returned unchanged and offers nothing.
 3. ``clean_suggested_title()`` turns the line's words into a title the chat row can hold, or
    nothing: "KEEP", an empty line, the title the chat already has, or something too long to be
    a name all mean "no offer".
"""

from __future__ import annotations

import re
from typing import Optional

# The longest suggested title kept. The chat row is about 167 px wide; this is already past what
# it shows, but a plain name of a few words fits well inside it.
MAX_SUGGESTED_TITLE_CHARS = 48
MAX_SUGGESTED_TITLE_WORDS = 8

# Wording chosen in plan 79 helper H's desk test (docs/test-evidence/plan79-P79-H-TITLE-WORDING.json).
# Do not change it without re-running that test on the Deck's model.
TITLE_INSTRUCTION = (
    "This chat is currently called \"{title}\". After the notes, add one last line that starts with "
    "TITLE: . Is the name still about the same thing as the player's newest questions? If it is, "
    "write TITLE: KEEP . Only if the newest questions have moved to a different subject, write "
    "TITLE: and a new name of two to five plain words for the new subject, with no quotes. "
    "Example: name \"Zelda shrines\", newest questions about cooking meals: TITLE: Zelda cooking . "
    "Example: name \"Zelda shrines\", newest questions about shrine puzzles: TITLE: KEEP . "
    "Example: name \"Zelda shrines\", newest questions about where to find shrines: TITLE: KEEP ."
)

# How many of the player's newest questions are laid out for the title check, and how much of each.
NEWEST_QUESTIONS_SHOWN = 6
NEWEST_QUESTION_CHARS = 110

# "TITLE: x", "Title - x", "**Title:** x", "Suggested title: x", anywhere on its own line.
_TITLE_LINE_RE = re.compile(
    r"^[\s>*_#`\-]*(?:suggested\s+|new\s+)?title[\s*_`]*[:=\-–—][\s*_`]*(.*?)[\s*_`]*$",
    re.IGNORECASE,
)
_KEEP_RE = re.compile(r"^(?:keep|keep it|keep (?:the )?(?:name|title)|same|no change|none|n/?a)\b", re.IGNORECASE)
_EDGE_PUNCT = " \t\"'`“”‘’*_.,;:!?()[]{}<>"


def title_instruction(current_title: str) -> str:
    """The sentence added to the summary request for a chat whose title may be second-guessed."""
    # A title is the person's own words (or their first question): keep a quote out of the quoted slot.
    title = " ".join(str(current_title or "").replace('"', "'").split())
    return TITLE_INSTRUCTION.format(title=title)


def title_to_second_guess(chat: Optional[dict]) -> str:
    """The chat's current title if a summary may offer a fresher one, else "". A title the person
    typed (``label_by_hand``) is never second-guessed; a chat saved before the flag existed reads
    as not typed."""
    if not isinstance(chat, dict) or chat.get("label_by_hand") is True:
        return ""
    return " ".join(str(chat.get("label") or "").split())


def newest_questions_block(turns: list) -> str:
    """The player's newest questions, one short line each, for the title check.

    The summary reads the whole chat, and a small model weighs its first questions as much as its
    last; the title is judged on what the player asks about NOW, so those are set out on their own.
    Answers are left out: they are long and add nothing to what the chat is about."""
    asked = []
    for turn in turns:
        if not isinstance(turn, dict) or str(turn.get("role") or "").strip().lower() != "user":
            continue
        text = " ".join(str(turn.get("display_text") or turn.get("text") or "").split())
        if text:
            asked.append(text[:NEWEST_QUESTION_CHARS])
    if not asked:
        return ""
    return "The player's newest questions, oldest first:\n" + "\n".join(
        f"- {line}" for line in asked[-NEWEST_QUESTIONS_SHOWN:]
    )


def split_title_line(raw: str) -> tuple[str, Optional[str]]:
    """The reply without its title line, and that line's words (``None`` when it has none).

    Every line that looks like a title line is removed from the summary, not only the last one,
    so a model that repeats it cannot leave one behind. The words returned are the first such
    line's, unjudged -- ``clean_suggested_title`` decides whether they are an offer.
    """
    kept: list[str] = []
    found: Optional[str] = None
    for line in str(raw or "").splitlines():
        match = _TITLE_LINE_RE.match(line)
        if match is None:
            kept.append(line)
            continue
        if found is None:
            found = match.group(1)
    return "\n".join(kept).strip(), found


def _same_title(a: str, b: str) -> bool:
    """The two titles say the same thing: equal, or one is the other with words left out or added
    ("Dragon shouts" for "Skyrim dragon shouts"). The model words a fitting title a little
    differently now and then; that is a reword, not a new subject, and is not worth an offer."""

    def words(text: str) -> set:
        return set(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())

    wa, wb = words(a), words(b)
    return bool(wa) and bool(wb) and (wa <= wb or wb <= wa)


def clean_suggested_title(words: Optional[str], current_title: str) -> str:
    """A title worth offering, or "" for no offer."""
    if words is None:
        return ""
    text = " ".join(str(words).split()).strip(_EDGE_PUNCT)
    if not text or _KEEP_RE.match(text):
        return ""
    if len(text) > MAX_SUGGESTED_TITLE_CHARS or len(text.split()) > MAX_SUGGESTED_TITLE_WORDS:
        return ""
    if _same_title(text, current_title):
        return ""
    return text
