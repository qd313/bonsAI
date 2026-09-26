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

import os
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


# Plan 70 helper K: two ways of finishing "a follow-up still names the wrong boss", both measured
# by scripts/eval_kb_answers.py against the fixture's follow-up pairs, three runs each, every
# reply read by hand. The maintainer picked finish 3 (send the previous question and a short
# answer along with the follow-up): it named the right boss more than five times as often as
# today's code and almost never made the model stop and ask "which boss do you mean?", the
# biggest problem with every other shape, including doing nothing. So `send_prev_qa_enabled()` is
# on by default -- the environment variable now only ever turns it *off* (set it to "0"), for a
# measuring run that wants the old, pre-pick behaviour back. Finish 2 (drop every attached note
# but the one asked about) was a real improvement over doing nothing but still asked "which boss?"
# about a third of the time, so it stays off unless explicitly turned on the opposite way (set the
# variable to "1"). A third candidate finish, "carry the remembered subject into the model's
# instructions", was never a new switch here: it already shipped unconditionally in plan 48 (D98,
# ollama_prompts.FOLLOWUP_SUBJECT_NOTE_TEMPLATE) whenever recall() finds a subject, so both
# defaults above sit on top of that, unchanged.
DROP_RUNNERUP_ENV = "BONSAI_KB_FOLLOWUP_DROP_RUNNERUP"
SEND_PREV_QA_ENV = "BONSAI_KB_FOLLOWUP_SEND_PREV_QA"


def drop_runnerup_notes_enabled() -> bool:
    """Finish 2: off unless ``BONSAI_KB_FOLLOWUP_DROP_RUNNERUP=1`` is set in the environment."""
    return os.environ.get(DROP_RUNNERUP_ENV, "").strip() == "1"


def send_prev_qa_enabled() -> bool:
    """Finish 3: the maintainer's pick, on by default. Set
    ``BONSAI_KB_FOLLOWUP_SEND_PREV_QA=0`` in the environment to turn it back off for a run that
    wants to measure without it; any other value, or leaving it unset, keeps it on."""
    return os.environ.get(SEND_PREV_QA_ENV, "").strip() != "0"


@dataclass
class _Memory:
    game_key: str = ""
    subject: str = ""
    # Finish 3 only (send_prev_qa_enabled()) -- blank on every other turn. Never written to disk
    # by seed()/snapshot(): a restart loses these two fields but keeps the remembered subject,
    # which is the existing, already-persisted contract plan 68 built (see snapshot()'s docstring
    # below) and this lane leaves untouched.
    prev_question: str = ""
    prev_answer: str = ""


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


# --- Finish 3: send the previous question and a trimmed answer with the follow-up -------------

_PREV_ANSWER_TRIM_CHARS = 320


def _trim_answer(answer: str) -> str:
    """A short, word-boundary-safe copy of a full reply for the previous-turn context block --
    never the full reply, which would compete with the newly attached note for a small model's
    attention instead of just reminding it what was already said."""
    text = re.sub(r"\s+", " ", (answer or "").strip())
    if len(text) <= _PREV_ANSWER_TRIM_CHARS:
        return text
    cut = text[:_PREV_ANSWER_TRIM_CHARS]
    last_space = cut.rfind(" ")
    if last_space > 0:
        cut = cut[:last_space]
    return cut.rstrip(",;: ") + "..."


def remember_previous_turn(
    *,
    app_id: str,
    app_name: str,
    text_resolved_title: str,
    chat_id: str = "",
    question: str,
    answer: str,
) -> None:
    """Finish 3 only: store this turn's own question and a trimmed copy of its answer, onto the
    record ``remember()`` already holds for this chat's game -- never starts a new record on its
    own, and does nothing on a game change (``mem.game_key`` must already match this turn's).

    Callers gate the whole call behind ``send_prev_qa_enabled()``; this function does not check
    the switch itself so a test can call it directly without setting the environment.
    """
    game_key = _normalize_game_key(
        app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    if not game_key:
        return
    q = re.sub(r"\s+", " ", (question or "").strip())
    a = _trim_answer(answer)
    with _lock:
        mem = _memories.get(_key(chat_id))
        if mem is None or mem.game_key != game_key:
            return
        mem.prev_question = q
        mem.prev_answer = a


def recall_previous_turn(
    *, app_id: str, app_name: str, text_resolved_title: str, chat_id: str = ""
) -> tuple[str, str]:
    """The previous turn's own question and trimmed answer for this chat's game, as
    ``(question, answer)`` -- or ``("", "")`` when there is none, the game has changed, or
    ``send_prev_qa_enabled()`` was off on the turn that would have stored them."""
    game_key = _normalize_game_key(
        app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
    )
    with _lock:
        mem = _memories.get(_key(chat_id))
        if mem is None or not game_key or game_key != mem.game_key:
            return "", ""
        return mem.prev_question, mem.prev_answer


_PREV_TURN_BLOCK_TEMPLATE = (
    "\nFOLLOW-UP CONTEXT (a system reminder, not something the user typed): the previous "
    'question in this chat was "{question}", and the answer given was: "{answer}". This new '
    "question carries on from that.\n"
)


def build_previous_turn_context_block(question: str, answer: str) -> str:
    """Finish 3's prompt text, or ``""`` when there is nothing to say (either half blank)."""
    q = (question or "").strip()
    a = (answer or "").strip()
    if not q or not a:
        return ""
    return _PREV_TURN_BLOCK_TEMPLATE.format(question=q, answer=a)


# --- Finish 2: drop the runner-up note when the remembered subject names one -------------------

# Matches knowledge_base_cards._BLOCK_SENTINEL exactly. Duplicated rather than imported for the
# same reason ollama_prompts.py duplicates the block header -- this module takes no dependency on
# the card-rendering internals, only on the text shape it produces.
_KB_BLOCK_SENTINEL = "--- End local knowledge base ---"
_CARD_HEADER_RE = re.compile(r"\[(?:[^\]/]+/\s*[^:\]]+|Tip)\s*:\s*([^\]]+)\]", re.IGNORECASE)
_CARD_SPLIT_RE = re.compile(r"(?=\n\[(?:[^\]/]+/\s*[^:\]]+|Tip)\s*:\s*[^\]]+\])")


def drop_runner_up_notes(kb_text: str, *, subject: str) -> str:
    """``kb_text`` with every attached card dropped except the one whose title names ``subject``.

    Unchanged when ``subject`` is blank, ``kb_text`` has no separable card headers, or no attached
    card's title names the subject at all -- attaching nothing is a worse failure than leaving a
    sibling note in place, which is exactly the cost the rejected "narrow_notes" shape (plan 48,
    D98) paid and scored worse for. Only ever called behind ``drop_runnerup_notes_enabled()``.
    """
    text = kb_text or ""
    subj = (subject or "").strip().lower()
    if not subj or not text:
        return text
    sentinel_idx = text.find(_KB_BLOCK_SENTINEL)
    if sentinel_idx == -1:
        return text
    body, tail = text[:sentinel_idx], text[sentinel_idx:]
    parts = _CARD_SPLIT_RE.split(body)
    if len(parts) < 2:
        return text
    header, cards = parts[0], parts[1:]
    kept: list[str] = []
    for card in cards:
        m = _CARD_HEADER_RE.search(card)
        name = m.group(1).strip().lower() if m else ""
        if name and (name == subj or subj in name or name in subj):
            kept.append(card)
    if not kept:
        return text
    return header + kept[0] + tail
