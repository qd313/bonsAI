"""Title: What a chat remembers about itself

Purpose: Turns a saved chat into a short piece of text the AI can be shown
along with the next question, so it answers knowing what has already been
said. Until now a chat kept two hundred questions and answers on disk and
almost none of it ever reached the AI: a new question carried the subject of
a very recent Strategy or Expert answer and nothing else.
Used for: the block that goes in front of the next question, and later the
same text is what gets summed up when a chat outgrows the room it is given.
Solves: a person asking a follow-up had to repeat themselves, because the AI
had no idea what it had just told them. It also keeps that memory small on
purpose -- it is handed an allowance by the budget and never goes over it,
because reading the question is the slow part of every answer.
Does not: decide how big the allowance is (the budget does that), fetch the
chat from disk, or write the shorter summary that will eventually replace a
long memory. It takes turns and an allowance and gives back text.

How it works:
 1. Walks the chat backwards from the newest turn, because the most recent
    exchanges are the ones a follow-up is usually about.
 2. Keeps each question whole -- they are short, and they are the person's own
    words. Shortens each answer to its opening, which is where the substance
    of game advice sits.
 3. Stops as soon as one more turn would go over the allowance, and says how
    many were left behind rather than quietly dropping them.
 4. Strips every fenced block out of a remembered answer first. A spoiler the
    AI hid behind a fence must never come back as plain text in the next
    question -- that is the worst thing this feature could do. The machine-only
    blocks (the branch picker, the checklist) go the same way, because they are
    instructions to the screen and not part of a conversation.
 5. Puts what survived back in the order it happened, oldest first, so it
    reads as a conversation rather than a stack.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional

from backend.services.ollama_ask_budgets import resolve_ask_token_budgets
from backend.services.prompt_budget_service import BudgetPlan, plan_prompt_budget
from backend.services.token_accounting_service import (
    estimate_tokens_from_chars,
    smallest_known_window_tokens,
)

# Every block the plugin fences off with three backticks and a bonsai- name. A spoiler is the one
# that matters; the others are instructions for the screen rather than anything a person said.
_FENCED_BLOCK = re.compile(r"```bonsai-[a-z-]+\b.*?(?:```|\Z)", re.DOTALL | re.IGNORECASE)

# What is left where a hidden note was, so the conversation still reads sensibly and the AI is
# not told the thing the person chose not to see.
HIDDEN_NOTE_PLACEHOLDER = "(a hidden note was here)"

# How much of one remembered answer is kept. Enough for the substance of a piece of game advice,
# short enough that one long reply cannot use up a whole chat's allowance on its own.
MAX_REMEMBERED_ANSWER_CHARS = 400

# The same for a question. Questions are short; this only catches a pasted wall of text.
MAX_REMEMBERED_QUESTION_CHARS = 200

# The header is an instruction, not a label. Carrying the conversation was not enough on its own:
# run on the Deck 2026-09-21 with the turns plainly listed under "What this chat has already
# covered", the model still answered a follow-up with "please specify which game you are referring
# to" -- it could see the chat and did not know it was allowed to use it. Saying what the block is
# FOR is the part that makes it work.
MEMORY_HEADER = (
    "What this chat has already covered, oldest first. Use it to make sense of a follow-up that "
    "names nothing on its own: unless the person says otherwise, they are still asking about the "
    "same game and the same subject as the turns below."
)
MEMORY_TRUNCATED_NOTE = "(Earlier turns of this chat are not included here.)"

# What the block costs before a single word of the conversation is in it: the header, the note
# saying some was left behind, and the "You asked:" / "The answer was:" in front of every turn.
# Asked for on top of the turns themselves, because without it a short chat asks for less room
# than its own header needs and comes back empty with the room sitting unused.
MEMORY_BLOCK_OVERHEAD_CHARS = len(MEMORY_HEADER) + len(MEMORY_TRUNCATED_NOTE) + 4
MEMORY_PER_TURN_OVERHEAD_CHARS = 20


@dataclass
class ChatMemory:
    """The text to put in front of the next question, and what had to be left behind."""

    text: str
    turns_carried: int
    turns_left_out: int
    hidden_notes_removed: int
    tokens: int

    def as_dict(self) -> dict[str, Any]:
        return {
            "turns_carried": self.turns_carried,
            "turns_left_out": self.turns_left_out,
            "hidden_notes_removed": self.hidden_notes_removed,
            "tokens": self.tokens,
        }


def strip_fenced_blocks(text: str) -> tuple[str, int]:
    """Remove every ```bonsai-… fenced block, leaving a short note. Returns (text, how many)."""
    raw = str(text or "")
    if "```bonsai-" not in raw.lower():
        return raw, 0
    removed = 0

    def _replace(_match: "re.Match[str]") -> str:
        nonlocal removed
        removed += 1
        return HIDDEN_NOTE_PLACEHOLDER

    cleaned = _FENCED_BLOCK.sub(_replace, raw)
    # Collapse the blank lines the removal leaves behind.
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned, removed


def _shorten(text: str, limit: int) -> str:
    """Keep the opening of a piece of text, ending on a whole word."""
    raw = " ".join(str(text or "").split())
    if len(raw) <= limit:
        return raw
    cut = raw[:limit].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut + "…"


def build_chat_memory(
    turns: Optional[list],
    allowance_tokens: int,
    model_name: str = "",
) -> ChatMemory:
    """Build the memory block for a chat, fitting whatever allowance the budget gave it."""
    allowance = max(0, int(allowance_tokens or 0))
    rows = [t for t in (turns or []) if isinstance(t, dict)]
    if allowance <= 0 or not rows:
        return ChatMemory("", 0, len(rows), 0, 0)

    # Both the header and the "earlier turns are missing" note are paid for before a single turn
    # is considered. The note is only printed when something really was left behind, but its cost
    # is reserved either way: adding it afterwards pushed the block past its allowance by a few
    # tokens, and next to a cliff the safe direction is to use slightly less than allowed.
    header_cost = estimate_tokens_from_chars(len(MEMORY_HEADER) + 1, model_name)
    note_cost = estimate_tokens_from_chars(len(MEMORY_TRUNCATED_NOTE) + 1, model_name)
    lines: list[str] = []
    used = header_cost + note_cost
    carried = 0
    hidden_removed = 0

    for turn in reversed(rows):
        role = str(turn.get("role") or "").strip().lower()
        text = str(turn.get("text") or "")
        if role == "user":
            # What the person saw themselves typing, when that differs from what was sent.
            shown = str(turn.get("display_text") or "").strip() or text
            body = _shorten(shown, MAX_REMEMBERED_QUESTION_CHARS)
            line = f"- You asked: {body}"
        elif role == "assistant":
            cleaned, removed = strip_fenced_blocks(text)
            body = _shorten(cleaned, MAX_REMEMBERED_ANSWER_CHARS)
            if not body:
                continue
            line = f"  The answer was: {body}"
        else:
            continue

        cost = estimate_tokens_from_chars(len(line) + 1, model_name)
        if used + cost > allowance:
            break
        lines.append(line)
        used += cost
        carried += 1
        if role == "assistant":
            hidden_removed += removed

    if not lines:
        return ChatMemory("", 0, len(rows), 0, 0)

    lines.reverse()
    left_out = len(rows) - carried
    parts = [MEMORY_HEADER, *lines]
    if left_out > 0:
        parts.append(MEMORY_TRUNCATED_NOTE)
    else:
        used -= note_cost  # nothing was left behind, so that reservation goes back
    return ChatMemory(
        text="\n".join(parts),
        turns_carried=carried,
        turns_left_out=left_out,
        hidden_notes_removed=hidden_removed,
        tokens=used,
    )


def plan_and_build_chat_memory(
    *,
    system_content: str,
    question: str,
    chat_turns: Optional[list],
    ask_mode: str,
    think_effort: str,
    base_http: str,
    model_name: str = "",
) -> tuple[BudgetPlan, ChatMemory]:
    """Work out how much of the chat may be carried, then carry that much.

    Everything except the memory is already fixed by the time this runs -- the rules, the game's
    cards and the question are all in ``system_content`` and cannot be made smaller from here. So
    they are handed to the budget as one block that cannot be negotiated, and the only thing being
    decided is how much of the conversation fits in front of the question after them.

    Governing the game's cards by the same budget means deciding their size BEFORE they are looked
    up and formatted, which happens a layer further out. That is the next piece of this work; what
    is here already stops the memory from being the thing that pushes a question over.
    """
    budgets = resolve_ask_token_budgets(ask_mode, think_effort=think_effort)
    rows = [t for t in (chat_turns or []) if isinstance(t, dict)]
    # The question being asked right now is already in the chat: it is written to disk when the
    # Ask is accepted, before the answer starts. Left in, it would be read back to the model as
    # "You asked: ..." immediately before the very same question -- wasted room and a strange
    # thing to read. A chat always ends on an answer, so any trailing question is the live one.
    while rows and str(rows[-1].get("role") or "").strip().lower() == "user":
        rows.pop()
    wanted_chars = sum(
        min(len(str(t.get("text") or "")), MAX_REMEMBERED_ANSWER_CHARS)
        + MEMORY_PER_TURN_OVERHEAD_CHARS
        for t in rows
    )
    memory_wanted = (
        estimate_tokens_from_chars(wanted_chars + MEMORY_BLOCK_OVERHEAD_CHARS, model_name)
        if rows
        else 0
    )
    plan = plan_prompt_budget(
        room_tokens=smallest_known_window_tokens(base_http),
        rules_tokens=estimate_tokens_from_chars(len(str(system_content or "")), model_name),
        question_tokens=estimate_tokens_from_chars(len(str(question or "")), model_name),
        answer_wanted=int(budgets.get("visible_num_predict") or 0),
        thinking_wanted=int(budgets.get("thinking_budget") or 0),
        cards_wanted=0,
        memory_wanted=memory_wanted,
    )
    return plan, build_chat_memory(rows, plan.memory_tokens, model_name)


def apply_chat_memory_to_prompt(
    *,
    system_content: str,
    question: str,
    chat_turns: Optional[list],
    ask_mode: str,
    think_effort: str,
    base_http: str,
    attached_chars: int,
    logger: Any,
    model_name: str = "",
) -> str:
    """Plan the chat-memory budget, build the memory block, append it, and log the outcome.

    Wraps ``plan_and_build_chat_memory()`` for ``run_ask_ollama()``. The memory block is placed
    at the END of what the AI is told, after the rules and after the game's cards, on purpose:
    the server skips re-reading any part of the front of a question that has not changed since
    last time, and this block changes on every turn. Anything that changes every turn has to sit
    behind everything that does not, or it spoils that saving for all of it (measured on the Deck
    2026-09-20: 15.3 seconds to the first word with the front rewritten each turn, 1.1 and 0.8
    seconds with it left alone).

    ``attached_chars`` and ``logger`` are passed in rather than looked up here, so this stays a
    plain function of its arguments -- the caller already has both close at hand.
    """
    budget_plan, memory = plan_and_build_chat_memory(
        system_content=system_content,
        question=question,
        chat_turns=chat_turns,
        ask_mode=ask_mode,
        think_effort=think_effort,
        base_http=base_http,
        model_name=model_name,
    )
    if memory.text:
        system_content = system_content + "\n\n" + memory.text
    logger.info(
        "ask_ollama: budget room=%d rules+cards=%d (attached %d chars) memory=%d thinking=%d answer=%d "
        "(~%.1fs to the first word) carried=%d turns, left behind=%d, hidden notes removed=%d%s",
        budget_plan.room_tokens,
        budget_plan.rules_tokens,
        attached_chars,
        memory.tokens,
        budget_plan.thinking_tokens,
        budget_plan.answer_tokens,
        budget_plan.seconds_to_first_word,
        memory.turns_carried,
        memory.turns_left_out,
        memory.hidden_notes_removed,
        ("; left out: " + ", ".join(budget_plan.left_out)) if budget_plan.left_out else "",
    )
    return system_content
