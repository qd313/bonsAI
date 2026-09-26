"""Title: Knowledge-base follow-up memory

Purpose: Remember the named subject of the last Strategy/Expert question, per chat, so a bare
follow-up question's search words can carry it forward within that chat.
Used for: game_ai_request's retrieval search-words assembly only, on Strategy and Expert turns.
Solves: The knowledge-base search sees only the words of the question just typed. Ask about a
boss, then ask "what about her second phase" and the search gets those five words and nothing
else -- there is no argument that could carry the boss's name from the turn before. A bare
follow-up already lands on something sensible when a game has few notes of the kind the question
names ("phase" pulls boss cards into the pool), but loses to a sibling note when the game has
several -- measured on Deep Rock Galactic: Survivor, where "what about its second phase" attaches
the wrong boss first. Adding the remembered name to the search words fixes the ranking, not the
recall: it was already finding the right note's kind, just not ordering it first. Plan 68 step 2:
one record per chat (keyed by chat id, "" for an Ask with no chat) rather than one record for the
whole process, so two chats about two different games never bleed into each other, and `seed()`
lets a chat get its own subject back after a restart from what was last saved into its own file.
Does not: Touch the question the model is shown or the person sees -- only ever feeds the search
words. Touch Speed mode. Decide whether a question names its own subject -- callers pass that in,
typically via extract_strategy_asked_entity in ollama_prompts.py, the same detector the
spoiler-consent check already uses. Write a chat's subject to disk itself -- the caller does that
with `snapshot()`'s result (see chat_turn_recorder.save_chat_subject); this module only ever
reads a saved subject back in, once per chat per process, via `seed()`.
"""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from typing import Optional

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


# One record per chat id ("" is the fallback entry for an Ask with no chat -- see the module
# docstring). A key's presence means a non-blank subject is remembered for it; recall() and
# forget() both remove the key rather than leaving a blanked-out record behind, so `seed()`'s
# "no record yet" check stays a plain membership test.
_memories: dict[str, _Memory] = {}


def _key(chat_id: str) -> str:
    return str(chat_id or "")


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


def recall(
    *, app_id: str, app_name: str, text_resolved_title: str, chat_id: str = ""
) -> str:
    """The remembered subject for this chat's game, or "" when there is none or the game has
    changed.

    A game change clears this chat's memory as a side effect of asking: the stored subject
    belonged to whatever game was last asked about in this chat, and is not carried to a
    different one -- a different chat's own memory is a different dict key and is untouched.
    """
    game_key = _normalize_game_key(
        app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    key = _key(chat_id)
    with _lock:
        mem = _memories.get(key)
        if mem is None:
            return ""
        if not game_key or game_key != mem.game_key:
            _memories.pop(key, None)
            return ""
        return mem.subject


def remember(
    *, app_id: str, app_name: str, text_resolved_title: str, subject: str, chat_id: str = ""
) -> None:
    """Store this turn's named subject against its game, for this chat. A blank subject stores
    nothing.

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
        _memories[_key(chat_id)] = _Memory(game_key=game_key, subject=clean_subject)


def forget(chat_id: Optional[str] = None) -> None:
    """Clear a remembered subject -- the library is off, or the question was troubleshooting.

    ``chat_id=None`` (the default -- calling ``forget()`` with no argument) keeps today's
    meaning: forget every chat's memory, plus the no-chat entry. Passing a chat id, including
    ``""`` for the no-chat entry, forgets only that one chat's memory and leaves every other
    chat's remembered subject alone.
    """
    with _lock:
        if chat_id is None:
            _memories.clear()
            return
        _memories.pop(_key(chat_id), None)


def seed(chat_id: str, subject_dict: Optional[dict]) -> None:
    """Load a chat's remembered subject back from its saved file, but only when this process has
    no live record for that chat yet.

    Called once per chat, right after the chat is loaded for a request, from the ``subject``
    field the chat file itself carries (plan 68 step 2's ``chat_slot_service`` contract:
    ``{"game_key", "subject"}`` or ``None``). A restart loses every in-memory record, so without
    this a chat's remembered subject would need re-asking after every plugin restart. Never
    overwrites a record this process already built by asking -- that live record is always newer
    than whatever was last written to disk.
    """
    key = _key(chat_id)
    with _lock:
        if key in _memories:
            return
        if not isinstance(subject_dict, dict):
            return
        game_key = str(subject_dict.get("game_key") or "").strip()
        subject = str(subject_dict.get("subject") or "").strip()
        if not game_key or not subject:
            return
        _memories[key] = _Memory(game_key=game_key, subject=subject)


def snapshot(chat_id: str) -> Optional[dict]:
    """This chat's remembered subject as ``{"game_key", "subject"}``, for saving into its chat
    file -- or ``None`` when nothing is remembered for it, which callers save as the chat's
    ``subject`` becoming ``None`` (forgotten) rather than an empty dict.
    """
    with _lock:
        mem = _memories.get(_key(chat_id))
        if mem is None:
            return None
        return {"game_key": mem.game_key, "subject": mem.subject}


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
