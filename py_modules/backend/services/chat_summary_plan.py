"""Title: Deciding whether a chat needs summing up, and what the summary covers

Purpose: Pure planning for ``chat_summary_service``: from a chat's turns and the memory room the
model is given, work out whether the chat has outgrown that room and, if so, which older turns
a summary should cover and which newest turns stay word for word.
Used for: ``chat_summary_service`` (before an answer and for the *Sum up this chat* button) and
``chat_sum_up_job`` (to grey the button). Both still import these names from
``chat_summary_service``, which re-exports them.
Solves: Keeps the decision separate from the model call, so it can be tested and reused without a
network, and keeps the call's file small enough to read.
Does not: Call the model, read the disk or save anything.

How it works:
 1. ``plan_summary()`` probes today's ordinary memory over the turns a previous summary does not
    already cover; nothing left out means no summary is needed.
 2. The newest turns that fit half the allowance (never fewer than ``MIN_KEPT_TURNS``) are set
    aside to stay word for word.
 3. Of the rest, the newest ``SUMMARY_INPUT_CAP_TOKENS`` worth are covered; older ones are counted
    as unread rather than silently dropped.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from backend.services.chat_memory_service import (
    build_chat_memory,
    build_memory_lines,
    turns_not_yet_summarized,
)

# How much the summarizer reads in one request (the previous summary plus the turns it covers).
# Measured: the 144-turn "wheatley fight" chat is about 8,650 tokens and still finished at 39.6
# seconds worst case. A bigger input risked pushing a cold start past a minute, so what does not
# fit is left for a later summary instead, and counted as unread rather than silently dropped.
SUMMARY_INPUT_CAP_TOKENS = 9000

# The newest word-for-word tail is never shorter than this many turns (two questions and their
# answers), whatever the allowance says -- so a follow-up right after a summary still has
# something exact to read, not just prose about it.
MIN_KEPT_TURNS = 4


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
