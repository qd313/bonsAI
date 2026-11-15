"""Title: Facts about a turn's notes, worked out before the AI is asked

Purpose: Decide, before the model is called, whether the reply will end with one of the two
short honesty lines about the notes ("Not in my notes" or "No close match"), and hand the
answer to the prompt as a set of named facts (``turn_flags``). A set, not a yes-or-no, so the
next fact about a turn can join it without another argument threading through the ask path.

Used for: Called once per turn by game_ai_request.py's run_game_ai_request, just before it
asks the model; the result goes to ``ask_ollama`` as ``turn_flags`` and on to
``build_system_prompt``. The same facts also decide, behind a switch that lands off (plan 104,
lane H1), whether a marked turn's notes are kept from the AI (``notes_for_the_ai``).

Solves: The two lines are decided after the AI has written (kb_notes_footers.py), so the AI's
own instructions carried no sign of them: asked about a boss the notes do not have, it answered
as if it knew, and the back end's line was the only place the reply admitted it (plan 103,
lane R2). Everything the lines are decided from is already known before the call, so the same
two rules can run first. A genre card is attached when nothing matches, so "No close match"
carries most of these turns and this has to be true for it as much as for "Not in my notes".

Does not: Write either line, append anything to a reply, or search the notes. When it holds notes
back it changes what the AI is sent and what the screen lists, never the footer step's own facts:
"No close match" still shows on such a turn. It repeats the
footer step's own reading of the turn (kb_notes_footers.append_kb_notes_footers) with the same
functions, and a test pins the two to agree on every combination; it does not replace that
step, which still decides what the reply ends with.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Collection

from backend.knowledge.kb_not_in_notes_notice import (
    should_show_no_close_match_notice_for_turn,
    should_show_not_in_notes_notice,
    tip_sheet_turn_came_back_empty,
)
from backend.knowledge.knowledge_base_chips import stack_context_blocks
from backend.prompts import ollama_prompts
from backend.prompts.ollama_prompts import TURN_FLAG_NOTES_DO_NOT_COVER

# What Show details says in place of the notes on a turn whose notes were held back from the AI.
NOTES_HELD_BACK_REASON = "Notes held back: the ones found were about other things, so the AI was not given them."


def prompt_turn_flags(
    ask_mode: str,
    kb_transparency: dict,
    kb_coverage_transparency: dict,
    text_resolved_title: str,
    question_for_kb_search: str,
    kb_attached_notes: list[dict[str, Any]],
    courtesy_turn: bool = False,
) -> frozenset[str]:
    """The named facts about this turn for the prompt: ``TURN_FLAG_NOTES_DO_NOT_COVER`` when
    either honesty line will show on the finished reply, nothing otherwise.

    A thank-you or off-topic turn searched no notes, so it is never flagged (the footer step
    leaves such a reply untouched too).

    In Speed mode the footer never shows, so by default no Speed turn is flagged. With
    ``ollama_prompts.HONEST_UNKNOWN_IN_SPEED_ON`` set, a Speed turn is read by the Strategy rules
    (the footer step is not changed and still writes nothing in Speed).
    """
    if courtesy_turn:
        return frozenset()
    if ollama_prompts.HONEST_UNKNOWN_IN_SPEED_ON and (ask_mode or "").strip().lower() == "speed":
        ask_mode = "strategy"
    attached = bool(kb_transparency.get("kb_attached"))
    kb_notes = str(kb_transparency.get("kb_notes") or "")
    tip_sheet_came_back_empty = tip_sheet_turn_came_back_empty(
        kb_attached=attached,
        kb_domain=str(kb_transparency.get("kb_domain") or ""),
        kb_unavailable_reason=str(kb_transparency.get("kb_unavailable_reason") or ""),
        kb_notes=kb_notes,
    )
    not_in_notes = should_show_not_in_notes_notice(
        ask_mode=ask_mode,
        kb_attached=attached,
        kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
        kb_notes=kb_notes,
    ) and not tip_sheet_came_back_empty
    no_close_match = should_show_no_close_match_notice_for_turn(
        ask_mode=ask_mode,
        kb_transparency=kb_transparency,
        kb_coverage_transparency=kb_coverage_transparency,
        text_resolved_title=text_resolved_title,
        question_for_kb_search=question_for_kb_search,
        kb_attached_notes=kb_attached_notes,
    )
    return frozenset({TURN_FLAG_NOTES_DO_NOT_COVER}) if (not_in_notes or no_close_match) else frozenset()


def notes_held_back_from_ai(turn_flags: Collection[str]) -> bool:
    """True when this turn's notes are to be kept from the AI: the turn is marked "the notes do not cover
    this" and ``ollama_prompts.NOTES_LEFT_OUT_ON`` is on (plan 104 lane H1, version one)."""
    return bool(ollama_prompts.NOTES_LEFT_OUT_ON) and TURN_FLAG_NOTES_DO_NOT_COVER in turn_flags


@dataclass(frozen=True)
class NotesForTheAi:
    """What a turn sends the AI and what it shows the person, once it is known whether the notes are held back.

    ``context`` is the stacked text for the AI, ``transparency`` the notes facts for the screen and the saved
    record, ``attached_notes`` the list the screen draws. The footer step still reads the turn's original
    facts: its two lines are decided from what the search found, and "No close match" must still show.
    """

    context: str
    transparency: dict
    attached_notes: list
    held_back: bool


def notes_for_the_ai(
    turn_flags: Collection[str],
    *,
    proton_text: str,
    context: str,
    kb_transparency: dict,
    kb_attached_notes: list[dict[str, Any]],
) -> NotesForTheAi:
    """The turn's notes as the AI and the screen get them. Unchanged unless the turn is marked, the switch is
    on and a notes block really was attached; then the AI gets only the Proton text, the screen lists no notes
    and its notes chip says they were held back. Worked out after stacking, so the marking could read the
    stacked turn's own facts."""
    if not (notes_held_back_from_ai(turn_flags) and kb_transparency.get("kb_attached")):
        return NotesForTheAi(context, kb_transparency, kb_attached_notes, False)
    shown = {
        **kb_transparency,
        "kb_attached": False,
        "kb_trust_tier": "",
        "kb_sources": [],
        "kb_notes": "",
        "kb_unavailable_reason": NOTES_HELD_BACK_REASON,
    }
    return NotesForTheAi(
        stack_context_blocks(proton_text=proton_text, knowledge_text="").text, shown, [], True
    )
