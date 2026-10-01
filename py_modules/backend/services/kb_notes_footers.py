"""Title: The "not in my notes" footers on a finished reply

Purpose: After the model has answered, decide whether the reply gets one of the two short honesty
footers about the notes -- "not in my notes" (the search found nothing for a game whose notes are
covered) or "no close match" (a note came back, but it was a stretch) -- and append it.

Used for: Called by game_ai_request.py's run_game_ai_request, once per successful reply, right
after the safety notice and before the spoiler cover step.

Solves: The decision reads eight facts about the turn and was the biggest self-contained piece of
game_ai_request.py, which had reached its size limit. The wording of the footers and the rules
for each one stay in kb_not_in_notes_notice.py; this only asks it and appends the answer.

Does not: Write the footers' wording, search the notes, or touch a reply the model did not
finish. The tip-sheet line "No tip for this" was retired by the maintainer on 2026-09-27.
"""

from __future__ import annotations

from typing import Any

from backend.services.kb_not_in_notes_notice import (
    append_no_close_match_notice,
    append_not_in_notes_notice,
    should_show_no_close_match_notice_for_turn,
    should_show_not_in_notes_notice,
    tip_sheet_turn_came_back_empty,
)


def append_kb_notes_footers(
    response_text: str,
    *,
    ask_mode: str,
    kb_transparency: dict,
    kb_coverage_transparency: dict,
    text_resolved_title: str,
    question_for_kb_search: str,
    kb_attached_notes: list[dict[str, Any]],
) -> str:
    """``response_text`` with whichever of the two notes footers this turn earns appended.

    "Not in my notes" stays off a turn this specific: an Expert or Strategy ask about a game
    whose notes are covered, where this particular question read as troubleshooting and got
    routed to the tip sheet instead (kb_domain == "compat"), and nothing there matched either.
    The line would be true but misleading -- the search never looked in the notes this turn. Nor
    on a turn whose note or tip was found but cut for room (kb_notes, plan 74 lane 5): the notes
    did not come up empty there.
    """
    tip_sheet_came_back_empty = tip_sheet_turn_came_back_empty(
        kb_attached=bool(kb_transparency.get("kb_attached")),
        kb_domain=str(kb_transparency.get("kb_domain") or ""),
        kb_unavailable_reason=str(kb_transparency.get("kb_unavailable_reason") or ""),
        kb_notes=str(kb_transparency.get("kb_notes") or ""),
    )
    show_not_in_notes = should_show_not_in_notes_notice(
        ask_mode=ask_mode,
        kb_attached=bool(kb_transparency.get("kb_attached")),
        kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
        kb_notes=str(kb_transparency.get("kb_notes") or ""),
    ) and not tip_sheet_came_back_empty
    # The second line (D88). It fires on the case the first cannot reach: a note DID come back,
    # and it was a stretch. No tie-break is needed or written -- "Not in my notes" requires
    # nothing to have attached and this requires something to have, so the two are mutually
    # exclusive by construction.
    #
    # Plan 70 helper B, bug 1: `kb_attached_notes` carries each note's own card text alongside
    # its title, so a question that describes a note instead of naming it still counts as a real
    # match -- see should_show_no_close_match_notice_for_turn's own doc for the rest of this.
    show_no_close_match = should_show_no_close_match_notice_for_turn(
        ask_mode=ask_mode,
        kb_transparency=kb_transparency,
        kb_coverage_transparency=kb_coverage_transparency,
        text_resolved_title=text_resolved_title,
        question_for_kb_search=question_for_kb_search,
        kb_attached_notes=kb_attached_notes,
    )
    response_text = append_not_in_notes_notice(response_text, show_not_in_notes)
    return append_no_close_match_notice(response_text, show_no_close_match)
