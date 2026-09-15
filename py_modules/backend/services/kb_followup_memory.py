"""Title: Knowledge-base follow-up memory

Purpose: Remember the named subject of the last Strategy/Expert question, per plugin process, so
a bare follow-up question's search words can carry it forward.
Used for: game_ai_request's retrieval search-words assembly only, on Strategy and Expert turns.
Solves: The knowledge-base search sees only the words of the question just typed. Ask about a
boss, then ask "what about her second phase" and the search gets those five words and nothing
else -- there is no argument that could carry the boss's name from the turn before. A bare
follow-up already lands on something sensible when a game has few notes of the kind the question
names ("phase" pulls boss cards into the pool), but loses to a sibling note when the game has
several -- measured on Deep Rock Galactic: Survivor, where "what about its second phase" attaches
the wrong boss first. Adding the remembered name to the search words fixes the ranking, not the
recall: it was already finding the right note's kind, just not ordering it first.
Does not: Touch the question the model is shown or the person sees -- only ever feeds the search
words. Touch Speed mode. Remember anything once the plugin restarts -- this lives in memory only,
for as long as the plugin keeps running. Decide whether a question names its own subject --
callers pass that in, typically via extract_strategy_asked_entity in ollama_prompts.py, the same
detector the spoiler-consent check already uses.
"""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass

# Phrasing that reads as "carrying on from the last thing", not naming anything new.
_FOLLOWUP_START_PHRASES = (
    "what about",
    "how about",
    "and the",
    "and its",
)

# Pronouns that lean on something said before rather than naming a subject.
_FOLLOWUP_LEAN_WORDS = frozenset({"it", "its", "it's", "that", "him", "her", "them"})

# "Short": long enough to ask something, short enough that it is plainly riding on the turn
# before rather than spelling out a new question.
_FOLLOWUP_MAX_WORDS = 8

_lock = threading.Lock()


@dataclass
class _Memory:
    game_key: str = ""
    subject: str = ""


_memory = _Memory()


def _normalize_game_key(*, app_id: str, app_name: str, text_resolved_title: str) -> str:
    """One string identifying the game a Strategy/Expert question was about, or "" for none.

    AppID first (Steam's own identity), then the running game's name, then a title the question
    named with nothing running (D19's text-resolved title) -- the same precedence
    retrieve_knowledge_context's own game resolution uses.
    """
    aid = str(app_id or "").strip()
    if aid:
        return f"appid:{aid}"
    aname = str(app_name or "").strip().lower()
    if aname:
        return f"name:{aname}"
    title = str(text_resolved_title or "").strip().lower()
    if title:
        return f"title:{title}"
    return ""


def looks_like_followup(question: str) -> bool:
    """True when the question reads as riding on the previous turn rather than naming its own.

    Short; starts with "what about" / "how about" / "and the" / "and its"; or leans on a bare
    pronoun ("it", "its", "that", "him", "her", "them"). This is a phrasing check only -- callers
    combine it with whether the question also names nothing of its own (see the module docstring).
    """
    text = re.sub(r"\s+", " ", (question or "").strip().lower())
    if not text:
        return False
    if any(text.startswith(prefix) for prefix in _FOLLOWUP_START_PHRASES):
        return True
    words = [w.strip("?.!,;:\"'") for w in text.split()]
    if len(words) <= _FOLLOWUP_MAX_WORDS and any(w in _FOLLOWUP_LEAN_WORDS for w in words):
        return True
    return False


def recall(*, app_id: str, app_name: str, text_resolved_title: str) -> str:
    """The remembered subject for this game, or "" when there is none or the game has changed.

    A game change clears the memory as a side effect of asking: the stored subject belonged to
    whatever game was last asked about, and is not carried to a different one.
    """
    game_key = _normalize_game_key(
        app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    with _lock:
        if not game_key or game_key != _memory.game_key:
            if _memory.game_key and game_key != _memory.game_key:
                _memory.game_key = ""
                _memory.subject = ""
            return ""
        return _memory.subject


def remember(*, app_id: str, app_name: str, text_resolved_title: str, subject: str) -> None:
    """Store this turn's named subject against its game. A blank subject stores nothing.

    Call only for a Strategy or Expert question about a game -- never for a troubleshooting
    question and never in Speed mode; callers gate that before reaching here.
    """
    clean_subject = str(subject or "").strip()
    if not clean_subject:
        return
    game_key = _normalize_game_key(
        app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    if not game_key:
        return
    with _lock:
        _memory.game_key = game_key
        _memory.subject = clean_subject


def forget() -> None:
    """Clear the remembered subject -- the library is off, or the question was troubleshooting."""
    with _lock:
        _memory.game_key = ""
        _memory.subject = ""


def augment_search_words(question_for_retrieval: str, *, remembered_subject: str) -> str:
    """Add the remembered subject to the search words when this reads as a bare follow-up.

    Returns ``question_for_retrieval`` unchanged when there is nothing remembered or the
    question does not look like a follow-up. Never touches anything but the string that is
    handed to the search -- the caller must not pass this result to the model or the person.
    """
    subject = str(remembered_subject or "").strip()
    if not subject:
        return question_for_retrieval
    if not looks_like_followup(question_for_retrieval):
        return question_for_retrieval
    return f"{question_for_retrieval} {subject}"
