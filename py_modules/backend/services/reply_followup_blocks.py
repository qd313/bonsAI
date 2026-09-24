"""Title: Handling the "refine this reply" chips

Purpose: After an answer, the player can tap a chip -- bad information, too long, too short,
misidentified game, or an unfenced spoiler -- and ask a follow-up refining it. This file reads
that request off the Ask RPC payload, and writes the block that pastes the previous question
and answer ahead of the player's new message so the model knows what is being refined.

Used for: sanitize_reply_followup is called from ask_payload.py while a new Ask request is
being read. build_reply_followup_context_block is called from game_ai_request.py once a
sanitized follow-up is confirmed, to build the text spliced in before the refinement message.

Solves: Keeps the shape of a reply-follow-up chip payload, and the one constant (how much of
the previous answer to keep) tuned against the Deck's token window, in one place next to each
other rather than split across the RPC-reading code and the prompt-building code.

Does not: Decide the spoiler policy or topic instructions for the refinement turn itself --
build_system_prompt handles that the same way as any other turn; this file only supplies the
extra context block spliced in ahead of the user's message.
"""

from typing import Any, Optional


_REPLY_FOLLOWUP_CHIP_LABELS = {
    "bad_information": "Bad information",
    "too_long": "Too long",
    "too_short": "Too short",
    "misidentified_game": "Misidentified game/problem",
    "unfenced_spoiler": "Unfenced spoiler",
}


def sanitize_reply_followup(raw: Any) -> Optional[dict]:
    """Normalize optional reply-follow-up payload from the Ask RPC dict."""
    if not isinstance(raw, dict):
        return None
    chip_id = str(raw.get("chip_id", "") or "").strip().lower()
    if chip_id not in _REPLY_FOLLOWUP_CHIP_LABELS:
        return None
    parent_question = str(raw.get("parent_question", "") or "").strip()
    parent_answer = str(raw.get("parent_answer", "") or "").strip()
    if not parent_question or not parent_answer:
        return None
    preferred_model = str(raw.get("preferred_model", "") or "").strip() or None
    return {
        "chip_id": chip_id,
        "parent_question": parent_question,
        "parent_answer": parent_answer,
        "preferred_model": preferred_model,
    }


# Decision D46 (2026-09-01): the parent answer is pasted into the follow-up message, and a
# Strategy reply can run to 1,600 tokens on its own. Against the Deck's 4,096-token window that
# paste plus the system prompt plus the new reply budget did not fit, and Ollama drops the start
# of the prompt silently. 1,500 characters (~400 tokens) keeps the orientation and the first
# tactics, which is what a refinement chip refers back to.
REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS = 1500
_REPLY_FOLLOWUP_TRIM_MARK = " […earlier answer trimmed to fit the model's window]"


def build_reply_followup_context_block(chip_id: str, parent_question: str, parent_answer: str) -> str:
    """Inject prior turn Q+A before the user's refinement message."""
    label = _REPLY_FOLLOWUP_CHIP_LABELS.get(chip_id, "Follow-up")
    pq = (parent_question or "").strip()
    pa = (parent_answer or "").strip()
    if len(pa) > REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS:
        pa = pa[:REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS].rstrip() + _REPLY_FOLLOWUP_TRIM_MARK
    return (
        "REPLY FOLLOW-UP CONTEXT\n"
        f"The user is refining their previous Ask ({label}).\n"
        f"Previous question:\n{pq}\n\n"
        f"Previous answer:\n{pa}\n\n"
        "Address the refinement request in the user's new message below.\n"
        "---\n"
    )
