"""Title: What the notes search found, recorded for one Ask turn

Purpose: Once the notes are stacked into the AI's context, write down what the turn's search did:
the facts the rest of the turn reads (``kb_transparency``), whether the notes survived the context
budget, and one line for the optional app-activity log. Nothing here searches or stacks.

Used for: Called once per turn by game_ai_request.py's run_game_ai_request, right after
``stack_context_blocks`` and before the attached-notes list is built from the notes text.

Solves: The block was the longest self-contained stretch of game_ai_request.py, which had reached
its size limit (plan 104, lane H1, which needed room there). Moved here as it was; no behaviour
changed.

Does not: Search the notes, stack the context, decide any footer, or write the always-on plugin-log
line that names the chosen notes (that stays in game_ai_request.py, where tests watch its logger).
"""

from __future__ import annotations

from typing import Any

from backend.answer.transparency_service import build_knowledge_base_transparency
from backend.knowledge.kb_attached_notes import _kb_search_log_fields


async def record_kb_turn_facts(
    plugin: Any,
    kb_result: Any,
    stacked: Any,
    *,
    kb_transparency: dict,
    kb_domain: str,
    app_name: str,
) -> tuple[dict, bool]:
    """``(kb_transparency, kb_survived)`` for this turn, after the notes met the context budget.

    Built *after* stacking, deliberately. Proton logs take budget first and can be capped at 96 KiB
    against a 100 KiB ceiling, so recording attached=True straight off the retrieval result let
    transparency claim the knowledge base was attached -- and cite its sources -- on turns where the
    block never reached the model at all. With no search result the transparency passed in is
    returned as it came and ``kb_survived`` is False.
    """
    if kb_result is None:
        return kb_transparency, False
    # A turn whose only attachment is a mod's load-order block (plan 104, lane L2) attached no note: the
    # block still goes to the AI, but the facts below, which the honesty lines and turn flags read, stay
    # what they were with nothing attached.
    notes_attached = kb_result.attached and not getattr(kb_result, "mod_block_only", False)
    kb_survived = notes_attached and stacked.knowledge_attached
    starved = notes_attached and not stacked.knowledge_attached
    kb_transparency = build_knowledge_base_transparency(
        attached=kb_survived,
        trust_tier=kb_result.trust_tier if kb_survived else "",
        sources=kb_result.sources if kb_survived else [],
        notes="dropped_by_context_budget" if starved else kb_result.notes,
        timing_ms=kb_result.timing_ms,
        unavailable_reason=kb_result.unavailable_reason,
        retrieval_method=kb_result.retrieval_method,
        kb_domain=kb_domain,
        best_meaning=kb_result.best_meaning,
        top_card_keyword_score=kb_result.top_card_keyword_score,
        best_meaning_without_game_name=kb_result.best_meaning_without_game_name,
    )
    # Off by default (Settings -> Advanced -> App activity logging to Desktop, level Verbose) -- this
    # line only lands in ~/Desktop/bonsAI_logs/bonsai-app-*.log once that is turned on and filesystem
    # writes are allowed. See _kb_search_log_fields for why it exists and what each field means.
    # `hasattr` guards the same way the `_publish_thinking_phase_key` calls in game_ai_request.py do,
    # since not every caller of that function (the test doubles in tests/test_game_ai_request*.py) is
    # the real Plugin.
    if hasattr(plugin, "_maybe_app_log"):
        await plugin._maybe_app_log(
            "ask.kb_search",
            "knowledge-base search",
            level="verbose",
            fields=_kb_search_log_fields(
                kb_result,
                kb_domain=kb_domain,
                app_name=app_name,
                kb_survived=kb_survived,
                starved=starved,
            ),
        )
    return kb_transparency, bool(kb_survived)
