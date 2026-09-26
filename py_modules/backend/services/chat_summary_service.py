"""Title: Summing a chat up before it outgrows its room

Purpose: A saved chat keeps its newest 200 questions and answers, but only a slice of that
fits in front of the next question -- the rest was simply left behind, silently, and a long
chat's follow-up could lose the very thing it was asking about. This file is what runs just
before an answer, in the moment the chat would otherwise outgrow the room its memory is
given: it decides whether a fresh summary is needed, and if so it asks the model itself,
thinking off, for a short plain-language summary of everything except the newest few turns.
Used for: called from ``ollama_ask_service.run_ask_ollama`` once a chat is known, and later
by the Session tab's own *Sum up this chat* button, which runs the exact same call on
demand instead of waiting for the next question.
Solves: without this, a chat someone kept using for an hour would quietly answer follow-ups
as if the last ten minutes were all that ever happened, with nothing on screen explaining
why. Measured on the Deck (docs/test-evidence/plan68-GATE-01.json): worst case with a game
running and a cold model, 39.6 seconds -- well inside the 120-second limit this file holds
the call to.
Does not: build the chat's own word-for-word memory that goes in front of an ordinary
question -- that is ``chat_memory_service.py``, which this file also calls to line up its
own request the same way. Does not save anything to disk; the caller does that, and only
once the call has actually returned (a Stop must save nothing).

How it works:
 1. ``plan_summary()`` decides, from the chat alone, whether today's ordinary memory would
    leave anything out once the chat's own summary already covers what it covers -- that is
    what "outgrown its room" means. If not, nothing else here runs.
 2. When it is needed, the newest turns are set aside to stay word for word (as many as fit
    in half the memory allowance, never fewer than the newest two questions and answers),
    and everything older than that is what the summary will cover.
 3. The turns to cover are capped to what the summarizer can read in one request
    (``SUMMARY_INPUT_CAP_TOKENS``) -- on a chat too long to read in one pass, the oldest part
    of what would have been covered is left for a later summary instead, and counted rather
    than silently dropped.
 4. ``write_chat_summary()`` builds the request -- the previous summary, if any, folded in
    ahead of what was said since -- and makes the one streamed call, the same one the answer
    itself uses, with thinking off and a hard overall time limit enforced by closing the
    connection out from under it if the model is still going at 120 seconds.
 5. The reply is cleaned (any fence or status tag stripped, capped at 2,000 characters) and
    handed back as a plain dict the caller saves. Nothing is saved here.
"""

from __future__ import annotations

import asyncio
import functools
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

import decky

from backend.services import chat_turn_recorder
from backend.services.chat_memory_service import (
    build_chat_memory,
    build_memory_lines,
    plan_and_build_chat_memory,
    turns_not_yet_summarized,
)
from backend.services.chat_slot_service import MAX_SUMMARY_TEXT_LEN
from backend.services.ollama_chat_stream import _stream_ollama_chat_once
from backend.services.ollama_stop_service import close_ollama_chat_response
from backend.services.ollama_window_fit import ollama_base_from_chat_url
from backend.services.reply_style_blocks import build_reply_language_block
from backend.services.token_accounting_service import estimate_tokens_from_chars

logger = decky.logger

# Measured on the Deck 2026-09-25 (docs/test-evidence/plan68-GATE-01.json): the worst run with a
# game running and a cold model start took 39.6 seconds. Plan 68 section 8 question 2's default:
# three times the worst measured, never under 60 -- 120 comfortably covers a slower Deck.
SUMMARY_TIME_LIMIT_SECONDS = 120

# How much the summarizer reads in one request (the previous summary plus the turns it covers).
# Measured: the 144-turn "wheatley fight" chat is about 8,650 tokens and still finished at 39.6
# seconds worst case. A bigger input risked pushing a cold start past a minute, so what does not
# fit is left for a later summary instead, and counted as unread rather than silently dropped.
SUMMARY_INPUT_CAP_TOKENS = 9000

# A summary that has nothing to build from yet (a brand new chat, or an allowance of zero) has no
# real room to grow into either -- this is only the fallback used before any real Ask has planned
# a memory for this model this session. See ``last_memory_allowance_tokens`` below.
DEFAULT_MEMORY_ALLOWANCE_TOKENS = 2000

# Wording fixed in plan 68's step 0 desk test (docs/planning/68-chat-sums-itself-up.md Appendix A):
# an earlier draft that asked for "one fact per line" made the model list every question asked and
# ran into the 400-token cap (47 seconds). This wording reliably stops itself at 50-85 words. Do
# not change it without re-running the desk test.
SUMMARY_INSTRUCTION = (
    "You keep notes for a game helper. Sum up this conversation for the helper's own memory, in "
    "at most 10 short plain lines: the game or games, where the player is, what is done, what "
    "they are stuck on now, and anything the player asked for about how to answer. Group similar "
    "questions into one line. Newer topics matter more than older ones. Leave out the helper's "
    "own tone of voice. No headings, no bold. Where the text says a hidden note was here, do not "
    "guess what it was."
)

# The newest word-for-word tail is never shorter than this many turns (two questions and their
# answers), whatever the allowance says -- so a follow-up right after a summary still has
# something exact to read, not just prose about it.
MIN_KEPT_TURNS = 4

_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
_BONSAI_STATUS_TAG_RE = re.compile(r"</?bonsai-status[^>]*>", re.IGNORECASE)

# Remembered per model, from the most recent real Ask's own memory plan (plan_prompt_budget's
# memory_tokens). Process lifetime is exactly plugin-session lifetime -- a stale entry only means
# the button's "does the whole chat still fit" check uses last session's number for one moment
# before the next real Ask corrects it. Tests MUST call reset_last_memory_allowance() in setUp.
_LAST_MEMORY_ALLOWANCE_BY_MODEL: dict[str, int] = {}


def note_memory_allowance_tokens(model_name: str, allowance_tokens: int) -> None:
    """Remember how much room the most recent real Ask's memory was actually given.

    Called from the wiring in ``ollama_ask_service.run_ask_ollama`` after it has planned an
    ordinary question's memory. The *Sum up this chat* button (helper C) has no Ask of its own in
    flight when it needs to decide whether it should be greyed out, so it reads this instead of
    planning a fresh one.
    """
    model = str(model_name or "").strip()
    tokens = int(allowance_tokens or 0)
    if model and tokens > 0:
        _LAST_MEMORY_ALLOWANCE_BY_MODEL[model] = tokens


def last_memory_allowance_tokens(model_name: str) -> int:
    """The most recently seen real memory allowance for this model, or a fallback estimate."""
    return _LAST_MEMORY_ALLOWANCE_BY_MODEL.get(
        str(model_name or "").strip(), DEFAULT_MEMORY_ALLOWANCE_TOKENS
    )


def reset_last_memory_allowance() -> None:
    """Test-only: forget every remembered allowance so suites do not depend on run order."""
    _LAST_MEMORY_ALLOWANCE_BY_MODEL.clear()


@dataclass
class SummaryPlan:
    """Whether a chat has outgrown its room, and if so, what the next summary should cover.

    Pure: reads only the chat and the numbers handed in, touches no network and no disk. The
    button reuses this to decide its own greyed-out state before making any call.
    """

    needed: bool
    covered_turns: list
    kept_turns: list
    oldest_turns_unread: int
    previous: Optional[dict]


@dataclass
class SummaryOutcome:
    """What actually happened when a summary call was made."""

    status: str  # "written" | "failed" | "timed_out" | "stopped"
    summary: Optional[dict]
    seconds: float
    error: str


def plan_summary(
    chat: dict, *, memory_allowance_tokens: int, model_name: str
) -> SummaryPlan:
    """Decide whether ``chat`` has outgrown its room, and if so, how the next summary should
    split its older turns from the newest word-for-word tail.

    "Outgrown its room" (plan 68 section 4): the turns a previous summary does not already cover
    would be left behind by today's ordinary memory. Reuses ``chat_memory_service.build_chat_memory``
    to answer that -- it is the exact same allowance-fitting walk an ordinary question's memory
    goes through, run here as a probe rather than to build a prompt.
    """
    turns = [t for t in (chat.get("turns") or []) if isinstance(t, dict)]
    # The question being asked right now is already the chat's newest turn (it is saved when the
    # Ask is accepted). It is neither summed up nor one of the kept turns -- the answer's own
    # memory drops it too -- so "the newest two questions and answers" means two finished ones.
    while turns and str(turns[-1].get("role") or "").strip().lower() == "user":
        turns.pop()
    previous = chat.get("summary") if isinstance(chat.get("summary"), dict) else None
    not_covered = turns_not_yet_summarized(turns, previous)

    allowance = max(0, int(memory_allowance_tokens or 0))
    probe = build_chat_memory(not_covered, allowance, model_name)
    if probe.turns_left_out <= 0:
        return SummaryPlan(
            needed=False,
            covered_turns=[],
            kept_turns=list(not_covered),
            oldest_turns_unread=0,
            previous=previous,
        )

    # The newest word-for-word tail: as many turns as fit in half the allowance, never fewer
    # than MIN_KEPT_TURNS. ``build_memory_lines`` walks from the newest backwards exactly the
    # way an ordinary memory does; its ``turns_scanned`` is how many of the newest turns that
    # walk reached before running out of half-allowance, whether or not each one produced a
    # line (a stopped answer sitting in the middle is still "reached", just not written out).
    half_allowance = allowance // 2
    _lines, _carried, _left, _hidden, _used, half_scanned = build_memory_lines(
        not_covered, half_allowance, model_name
    )
    kept_count = max(half_scanned, min(MIN_KEPT_TURNS, len(not_covered)))
    if kept_count:
        kept_turns = not_covered[len(not_covered) - kept_count :]
        covered_candidates = not_covered[: len(not_covered) - kept_count]
    else:
        kept_turns = []
        covered_candidates = list(not_covered)

    # The one-go reading cap: keep the newest of the covered turns that fit
    # SUMMARY_INPUT_CAP_TOKENS, and count the rest as newly unread rather than reading them
    # anyway and risking a summary call that runs long. The summary still covers through the
    # newest covered turn either way.
    _cap_lines, _cap_carried, _cap_left, _cap_hidden, _cap_used, cap_scanned = build_memory_lines(
        covered_candidates, SUMMARY_INPUT_CAP_TOKENS, model_name
    )
    if cap_scanned:
        covered_turns = covered_candidates[len(covered_candidates) - cap_scanned :]
    else:
        covered_turns = []
    newly_unread = len(covered_candidates) - cap_scanned

    return SummaryPlan(
        needed=True,
        covered_turns=covered_turns,
        kept_turns=kept_turns,
        oldest_turns_unread=newly_unread,
        previous=previous,
    )


def _summary_request_messages(
    plan: SummaryPlan, model_name: str, reply_language: str
) -> list[dict]:
    """The two messages sent to the model, built from the same line format the chat's ordinary
    memory uses (``chat_memory_service.build_memory_lines``) rather than a second formatter."""
    lines, *_rest = build_memory_lines(plan.covered_turns, 10**9, model_name)
    body = "\n".join(lines)
    previous_text = str((plan.previous or {}).get("text") or "").strip()
    if previous_text:
        user = (
            f"Notes from earlier in this chat:\n{previous_text}\n\n"
            f"What was said since, oldest first:\n{body}\n\nWrite the notes now."
        )
    else:
        user = f"The conversation so far, oldest first:\n{body}\n\nWrite the notes now."
    system = SUMMARY_INSTRUCTION + build_reply_language_block(reply_language)
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _clean_summary_text(raw: str) -> str:
    """Strip, drop any fence or status tag the model wrote, and cap at the length the chat file
    accepts. An empty result is the caller's cue to treat the call as failed."""
    text = str(raw or "")
    text = _FENCE_RE.sub("", text)
    text = _BONSAI_STATUS_TAG_RE.sub("", text)
    text = text.replace("```", "")
    return text.strip()[:MAX_SUMMARY_TEXT_LEN]


async def write_chat_summary(
    plugin: Any,
    *,
    chat: dict,
    plan: SummaryPlan,
    model_name: str,
    url: str,
    keep_alive: str,
    window_tokens: int,
    reply_language: str,
    request_id: Optional[int],
) -> SummaryOutcome:
    """Make the one streamed call that sums up ``plan.covered_turns``. Saves nothing -- the
    caller saves the returned summary, and only once this has actually returned."""
    started = time.time()
    messages = _summary_request_messages(plan, model_name, reply_language)
    input_tokens = estimate_tokens_from_chars(
        sum(len(str(m.get("content") or "")) for m in messages), model_name
    )

    # The stop-flag trap (plan 68 section 1 / section 9): after a Stop the flag stays raised
    # until the next call lowers it. A summary that ran first without doing this would stop
    # itself the instant it started, every time the previous question had been stopped.
    abort_evt = getattr(plugin, "_abort_current_ollama_chat", None)
    if isinstance(abort_evt, threading.Event):
        abort_evt.clear()

    deadline_hit = threading.Event()

    def _cancel_requested() -> bool:
        if deadline_hit.is_set():
            return True
        check = getattr(plugin, "_abort_ollama_chat_check", None)
        return bool(check and check())

    def _on_opened(resp: Any) -> None:
        plugin._active_ollama_chat_http_response = resp
        ev = getattr(plugin, "_chat_resp_ready_evt", None)
        if isinstance(ev, threading.Event):
            ev.set()

    def _on_done() -> None:
        plugin._active_ollama_chat_http_response = None

    plugin._chat_resp_ready_evt = threading.Event()
    plugin._active_ollama_chat_pc_ip = ollama_base_from_chat_url(url)
    plugin._active_ollama_chat_model = str(model_name)

    def _on_deadline() -> None:
        deadline_hit.set()
        close_ollama_chat_response(
            getattr(plugin, "_active_ollama_chat_http_response", None), logger
        )

    timer = threading.Timer(SUMMARY_TIME_LIMIT_SECONDS, _on_deadline)
    timer.daemon = True
    timer.start()
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            functools.partial(
                _stream_ollama_chat_once,
                url,
                model_name,
                messages,
                SUMMARY_TIME_LIMIT_SECONDS,
                logger,
                {
                    "num_predict": 400,
                    "think": False,
                    "visible_num_predict": 400,
                    "thinking_budget": 0,
                },
                "speed",
                keep_alive,
                _cancel_requested,
                _on_opened,
                _on_done,
                None,  # on_delta: a live-text callback would show the summary as the answer
                requested_window_tokens=int(window_tokens or 0),
            ),
        )
    finally:
        timer.cancel()
        plugin._active_ollama_chat_pc_ip = None
        plugin._active_ollama_chat_model = None

    elapsed = time.time() - started
    covered_n = len(plan.covered_turns)

    if deadline_hit.is_set():
        logger.info(
            "chat_summary: timed_out in %.1f s — covered %d turns, %d unread, ~%d input "
            "tokens, model %s",
            elapsed,
            covered_n,
            plan.oldest_turns_unread,
            input_tokens,
            model_name,
        )
        return SummaryOutcome(
            status="timed_out", summary=None, seconds=elapsed, error="Summary timed out."
        )

    if result.get("cancelled"):
        logger.info(
            "chat_summary: stopped in %.1f s — covered %d turns, %d unread, ~%d input "
            "tokens, model %s",
            elapsed,
            covered_n,
            plan.oldest_turns_unread,
            input_tokens,
            model_name,
        )
        return SummaryOutcome(status="stopped", summary=None, seconds=elapsed, error="")

    cleaned = _clean_summary_text(result.get("visible_raw")) if result.get("success") else ""
    if not result.get("success") or not cleaned:
        if result.get("success"):
            error = "Model returned an empty summary."
        else:
            error = str(result.get("response") or "")
        logger.info(
            "chat_summary: failed in %.1f s — covered %d turns, %d unread, ~%d input "
            "tokens, model %s",
            elapsed,
            covered_n,
            plan.oldest_turns_unread,
            input_tokens,
            model_name,
        )
        return SummaryOutcome(status="failed", summary=None, seconds=elapsed, error=error)

    previous = plan.previous or {}
    covers_through_turn_id = str(plan.covered_turns[-1].get("id") or "") if plan.covered_turns else ""
    summary = {
        "text": cleaned,
        "covers_through_turn_id": covers_through_turn_id,
        "turns_covered": int(previous.get("turns_covered") or 0) + covered_n,
        "oldest_turns_unread": int(previous.get("oldest_turns_unread") or 0)
        + plan.oldest_turns_unread,
        "hidden_notes_left_out": int(previous.get("hidden_notes_left_out") or 0)
        + _hidden_notes_in(plan.covered_turns, model_name),
        "written_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "seconds": round(elapsed, 1),
        "model": str(model_name or ""),
    }
    logger.info(
        "chat_summary: written in %.1f s — covered %d turns, %d unread, ~%d input tokens, "
        "model %s",
        elapsed,
        covered_n,
        plan.oldest_turns_unread,
        input_tokens,
        model_name,
    )
    return SummaryOutcome(status="written", summary=summary, seconds=elapsed, error="")


def _hidden_notes_in(turns: list, model_name: str) -> int:
    """How many fenced blocks the covered turns actually had, read the same way the summary
    request itself reads them -- so ``hidden_notes_left_out`` counts what was truly stripped out
    of what the model was shown, not a second, possibly different count."""
    _lines, _carried, _left, hidden_removed, _used, _scanned = build_memory_lines(
        turns, 10**9, model_name
    )
    return hidden_removed


async def decide_and_write_chat_summary(
    plugin: Any,
    *,
    chat: Optional[dict],
    chat_turns: Optional[list],
    system_content: str,
    question: str,
    ask_mode: str,
    think_effort: str,
    room_tokens: int,
    model_name: str,
    url: str,
    keep_alive: str,
    reply_language: str,
    active_request_id: Optional[int],
    app_name: str,
    character_enabled: bool,
    character_preset_id: Optional[str],
) -> tuple[list, Optional[dict], str, bool]:
    """Everything ``run_ask_ollama`` needs to know about the chat's own summary before it builds
    the question's memory, in one call -- so that file only has to make this call and act on
    what it returns, rather than carry the whole decide-and-write sequence itself.

    Returns ``(chat_turns_effective, summary_to_carry, chat_summary_mark, stopped)``:
    ``chat_turns_effective`` is ``chat["turns"]`` when a chat was given, else ``chat_turns``
    unchanged, so the caller's own memory step reads the same turns this one just planned
    against. ``stopped`` True means a Stop landed mid-summary -- the caller must return the
    cancelled shape at once and make no answer call this turn.
    """
    chat_dict = chat if isinstance(chat, dict) else {}
    turns = chat_dict.get("turns") if chat_dict else chat_turns
    if not isinstance(turns, list):
        turns = chat_turns if isinstance(chat_turns, list) else []
    previous = chat_dict.get("summary") if isinstance(chat_dict.get("summary"), dict) else None
    chat_id = str(chat_dict.get("id") or "").strip()
    if not chat_id or not turns:
        return turns, previous, "", False

    probe_plan, _probe_memory = plan_and_build_chat_memory(
        system_content=system_content,
        question=question,
        chat_turns=turns,
        ask_mode=ask_mode,
        think_effort=think_effort,
        room_tokens=room_tokens,
        model_name=model_name,
        summary=previous,
    )
    note_memory_allowance_tokens(model_name, probe_plan.memory_tokens)
    plan = plan_summary(
        {"turns": turns, "summary": previous},
        memory_allowance_tokens=probe_plan.memory_tokens,
        model_name=model_name,
    )
    if not plan.needed:
        return turns, previous, "", False

    if isinstance(active_request_id, int):
        plugin._publish_thinking_phase_key(
            active_request_id,
            "summing_up",
            app_name=app_name,
            ask_mode=ask_mode,
            question=question,
            character_enabled=character_enabled,
            character_preset_id=character_preset_id,
        )
    outcome = await write_chat_summary(
        plugin,
        chat=chat_dict,
        plan=plan,
        model_name=model_name,
        url=url,
        keep_alive=keep_alive,
        window_tokens=room_tokens,
        reply_language=reply_language,
        request_id=active_request_id,
    )
    if outcome.status == "stopped":
        return turns, previous, "", True
    if outcome.status == "written" and outcome.summary is not None:
        # Saved only now that the call has actually returned -- a Stop above already left the
        # chat untouched, and nothing before this point could have saved early.
        await chat_turn_recorder.save_chat_summary(plugin, chat_id, outcome.summary)
        return turns, outcome.summary, "written", False
    logger.warning(
        "ask_ollama: chat summary %s -- answering with today's memory instead (%s)",
        outcome.status,
        outcome.error or "empty summary",
    )
    return turns, previous, "failed", False
