"""Title: Deciding when a question is worth offering as a note

Purpose: When a person asks "I'm doing a Steel Soul run, how do I beat the mantis lords", the
first half is something about them that Ask could keep in mind from then on. This file is the word
rule that notices that. It looks at the question's own words, with no trip to the AI, and either
finds one clause worth keeping (kept in the first person, as typed) or says "nothing here". It
also works out which game the note would be for, and builds the small offer the screen turns into
a card under the answer: ``{"text", "app_id", "game_title"}``.

Used for: ``game_ai_request.py`` (every question that goes to the AI) and
``ask_local_command_handlers.py`` (the typed ``remember …`` / ``note: …`` command, whose words
after the prefix are the note).

Solves: Keeps the rule in one pure place, so the twenty phrases it must and must not catch are one
test file, and the Ask flow only has to call one function. The rule is a plain word match by the
maintainer's call (plan 90, D129): it will miss some phrasings and offer on some odd ones, and the
card is only an offer -- nothing is saved until the person presses Keep.

Does not: Save anything, read the notes file, or call the AI. It never looks at the answer.

The phrases it listens for (plan 90 § 2a): "I'm / I am doing, playing or on … run (playthrough,
challenge, mode, difficulty)", "I'm playing on …", "I prefer …", "I don't want / like …", "no
spoilers …", "don't spoil …", and "I use / have … mapped to …". A phrase that is itself a question
("should I prefer …", "when I'm on a run …") is skipped.
"""

from __future__ import annotations

import re
from typing import Any, Optional

# The most a note may hold; the notes file refuses anything longer (user_notes_service.py).
NOTE_TEXT_LIMIT = 200

_RUN_WORDS = r"(?:run|runs|playthrough|playthroughs|challenge|mode|difficulty)"
_ME = r"\bi(?:'m| am)\s+(?:currently |now |just |still |also )?"
_TRIGGERS = [
    # "I'm doing / playing / on a Steel Soul run" (a run, playthrough, challenge, mode or difficulty).
    _ME + r"(?:doing|playing|on|starting|attempting|going for|running)\s+(?:an? |my |the |this |another )?"
    r"(?:[\w'+\-]+\s+){0,5}?" + _RUN_WORDS + r"\b",
    # "I'm playing on …" (hard mode, Steam Deck, a controller).
    _ME + r"playing (?:it )?on\b",
    # "I prefer …", "I'd prefer …", "I would prefer …".
    r"\bi(?:'d| would)?\s+(?:really |always |usually |generally )?prefer\b",
    # "I don't want …", "I don't like …".
    r"\bi\s+(?:really |just )?(?:do not|don't|dont)\s+(?:really |actually )?(?:want|like)\b",
    # "no spoilers …", "don't spoil …".
    r"\bno\s+spoilers?\b",
    r"\b(?:do not|don't|dont|never)\s+spoil\b",
    # "I use / have … mapped to …".
    r"\bi\s+(?:use|have|got|keep)\b[^.?!;\n]{0,60}?\bmapped\s+(?:to|on)\b",
]
_TRIGGER_RES = [re.compile(t, re.IGNORECASE) for t in _TRIGGERS]

# The word right before a phrase that turns it into a question or a condition, not a statement.
_QUESTION_LEADS = frozenset(
    {"should", "do", "does", "did", "can", "could", "would", "will", "if", "whether", "when", "why", "what", "which", "who"}
)
_SENTENCE_END = re.compile(r"[.?!;\n]")
_CLAUSE_END = re.compile(
    r",\s+(?:how|what|where|when|why|which|who|can|could|should|would|do|does|did|is|are|so|and|but|or|please|any|help)\b"
    r"|\s+(?:and|but|so)\s+(?:how|what|where|when|why|which|who|can|could|should|please|i need|i want|need|want|any|tell|help)\b"
    r"|\s[-–—]\s",
    re.IGNORECASE,
)
_FIRST_PERSON_I = re.compile(r"^i(?=['’\s]|$)")


def _same_length_plain(text: str) -> str:
    """The text with curly apostrophes made straight, so every position still lines up."""
    return text.replace("’", "'").replace("‘", "'")


def _is_question_or_condition(plain: str, start: int) -> bool:
    """Is the phrase at ``start`` the end of a question ("should I prefer …") or a condition?"""
    cut = 0
    for match in _SENTENCE_END.finditer(plain, 0, start):
        cut = match.end()
    words = re.findall(r"[\w']+", plain[cut:start])
    return bool(words) and words[-1].lower() in _QUESTION_LEADS


def _tidy(clause: str) -> Optional[str]:
    """A clause as a note: capital first letter, a full stop, cut at the limit. None if it has no words."""
    text = " ".join(clause.split()).strip(" \t,;:.!?-–—\"")
    if not any(ch.isalnum() for ch in text):
        return None
    text = _FIRST_PERSON_I.sub("I", text)
    text = text[0].upper() + text[1:]
    if len(text) >= NOTE_TEXT_LIMIT:
        return text[:NOTE_TEXT_LIMIT].rstrip()
    return text + "."


def offer_text_from_question(question: str) -> Optional[str]:
    """The clause of ``question`` worth keeping as a note, or None when the question says nothing to keep."""
    raw = (question or "").strip()
    if not raw:
        return None
    plain = _same_length_plain(raw)
    best: Optional[int] = None
    for pattern in _TRIGGER_RES:
        for match in pattern.finditer(plain):
            if _is_question_or_condition(plain, match.start()):
                continue
            if best is None or match.start() < best:
                best = match.start()
            break
    if best is None:
        return None
    rest = plain[best:]
    end = len(rest)
    sentence_end = _SENTENCE_END.search(rest)
    if sentence_end:
        end = sentence_end.start()
    clause_end = _CLAUSE_END.search(rest, 0, end)
    if clause_end:
        end = clause_end.start()
    return _tidy(raw[best : best + end])


def _offer(text: str, app_id: str, app_name: str, resolved_title: str) -> dict[str, Any]:
    """The offer for ``text``: the running game's id and name; with nothing running, the title the
    question names (or the chat's own game); else every game (both fields empty)."""
    running_id = str(app_id or "").strip()
    if not running_id.isdigit():
        running_id = ""
    name = str(app_name or "").strip()
    if running_id or name:
        return {"text": text, "app_id": running_id, "game_title": name}
    return {"text": text, "app_id": "", "game_title": str(resolved_title or "").strip()}


def note_offer_for_question(
    question: str, *, app_id: str, app_name: str, resolved_title: str
) -> Optional[dict[str, Any]]:
    """The offer for a question that goes to the AI, or None when the word rule finds nothing."""
    text = offer_text_from_question(question)
    return None if text is None else _offer(text, app_id, app_name, resolved_title)


def note_offer_for_note_words(
    words: str, *, app_id: str, app_name: str, resolved_title: str
) -> Optional[dict[str, Any]]:
    """The offer for the words typed after ``remember`` / ``note:``, or None when there are none."""
    text = _tidy(words or "")
    return None if text is None else _offer(text, app_id, app_name, resolved_title)
