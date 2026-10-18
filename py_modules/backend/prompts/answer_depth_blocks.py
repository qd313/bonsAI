"""Title: Answer depth and two-part questions

Purpose: Two short instruction blocks that shape how full an answer is. The Expert block asks for
the fuller answer (the specific names, numbers and step order, never shorter than a Speed
answer would be). The two-part block fires on any question that asks more than one thing and
tells the model to answer every part in order and to say so when it does not know one.

Used for: Called from ollama_prompts.build_system_prompt for every non-Strategy turn (the Expert
block) and for every turn in every mode (the two-part block), so the text lands in the system
prompt the model reads for each Ask.

Solves: On the Deck's own small model Expert answered no fuller than Speed (median 511 against
551 characters) and both modes dropped half of a two-part question (plan 96, row P96-F8-EXPERT).
Expert and Speed had the same prompt, so there was nothing to make Expert deeper.

Does not: Set the reply length cap (ollama_ask_budgets) or the Reply style slider's own blocks
(reply_style_blocks); the Expert block steps aside when the slider is on Terse or Caveman, which
ask for short answers on purpose. Does not judge whether the model answered every part.
"""

import re

# A second ask joined to the first with "and" ("... and what should I buy first", "... and why").
_AND_SECOND_ASK = re.compile(
    r"\band\s+(?:also\s+)?"
    r"(?:what|which|how|where|when|why|who|whom|whose|should|can|could|do|does|did|is|are|will|would)\b"
)
# A question mark that ends a sentence (not one inside a link).
_QUESTION_MARK = re.compile(r"\?(?=\s|$)")
# A bullet or numbered list line.
_LIST_LINE = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+\S", re.MULTILINE)

EXPERT_DEPTH_BLOCK = (
    "\n\nEXPERT ANSWER DEPTH: This is Expert mode, so give the fuller answer, not the quick one. "
    "Be concrete: name the specific things (boon, item, enemy and menu names, exact numbers, the order of "
    "steps) rather than general advice, and add a short reason why each one matters. Cover every point "
    "the question raises. This replaces \"concisely\" in the opening line; the REPLY STYLE setting still "
    "sets the outer length, but an Expert answer is never shorter than a quick answer to the same "
    "question would be. If a specific is not in your notes and you are not sure of it, say so instead of "
    "going vague.\n"
)

MULTI_PART_BLOCK = (
    "\n\nMORE THAN ONE QUESTION: The player asked more than one thing. Answer each part in turn, in the "
    "order asked, giving each its own sentence or two. If you do not know a part, say so plainly for "
    "that part; never skip it or answer around it.\n"
)

# Reply styles that ask for a short answer on purpose; the Expert depth block must not fight them.
_SHORT_STYLES = frozenset({"terse", "caveman", "short"})


def is_multi_part_question(question: object) -> bool:
    """True when the question asks two or more things: two question marks, a list, or an "and"
    that joins a second ask ("which weapon is best and what should I buy first")."""
    q = (question or "").lower() if isinstance(question, str) else ""
    if not q.strip():
        return False
    if len(_QUESTION_MARK.findall(q)) >= 2:
        return True
    if len(_LIST_LINE.findall(q)) >= 2:
        return True
    return bool(_AND_SECOND_ASK.search(q))


def build_answer_depth_blocks(question: str, *, ask_mode: str, reply_verbosity: object = "") -> str:
    """The Expert depth block (Expert only, and not on a short Reply style) followed by the
    two-part block (any mode, only when the question asks more than one thing)."""
    out = ""
    style = reply_verbosity.strip().lower() if isinstance(reply_verbosity, str) else ""
    if ask_mode == "expert" and style not in _SHORT_STYLES:
        out += EXPERT_DEPTH_BLOCK
    if is_multi_part_question(question):
        out += MULTI_PART_BLOCK
    return out
