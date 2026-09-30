"""Title: Follow-up menu example guard

Purpose: After a Strategy Guide answer the model may add a small menu asking "Where are you at
in this game?", with a few choices. The instructions that ask for the menu include a worked
example so the model knows the shape, and tell it never to reuse the example's words. Small
models sometimes copy the example anyway, which shows the player a menu about the wrong game.
This file spots a menu that still carries the example's wording and drops it, so the player sees
no menu instead of a wrong one.

Used for: `drop_branch_menu_copying_the_worked_example()` is called by game_ai_request.py after the
model's menu has been read. It is also importable through response_verify.py, where it used to
live.

Solves: The example's wording in the prompt (ollama_prompts.py, the bonsai-strategy-branches
worked example) keeps being copied into real answers; asking the model harder did not stop it.

Does not: Judge whether a menu that does not copy the example is a good one, and does not
rewrite a menu: a copied one is dropped whole, the same way the parser drops a broken block.
"""

from __future__ import annotations

import re
from typing import Any, Optional


# The strategy-branch prompt shows the model a worked example purely to demonstrate the JSON
# shape it must reply in, then tells it in as many words never to reuse that wording. It
# sometimes copies the example into a real answer anyway (seen under a Portal 2 and a Hades
# answer, and again -- after the example's wording below was changed to placeholders -- under
# a no-game turn that read "Where are you at in THIS GAME? A. <a place early in THIS game>
# B. <a place later in THIS game>", the prompt's own placeholder text copied verbatim; see
# ollama_prompts.py's bonsai-strategy-branches worked example and
# docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json). These are the example's exact words
# (old and current), kept lower-case for a case-insensitive match.
_WORKED_EXAMPLE_OPTION_LABELS_HL2 = {
    "just arrived at the train station",
    "fighting through ravenholm",
}
_WORKED_EXAMPLE_MARKERS_HL2 = ("ravenholm", "train station")
# The placeholder-wording set has no Half-Life 2-style exception: no real game is literally
# titled "This Game", so this phrase is always the leaked template, never a genuine answer.
_WORKED_EXAMPLE_OPTION_LABELS_PLACEHOLDER = {
    "a place early in this game",
    "a place later in this game",
}
_WORKED_EXAMPLE_MARKERS_PLACEHOLDER = ("this game",)
# The same placeholders with a real title swapped in: "<a place early in Deep Rock Galactic
# Survivor>" (Deck, 2026-09-25) -- the model filled in the title and kept the rest, which the
# exact-words check above cannot see. A bracketed phrase starting with a letter never belongs in a
# real menu, and neither does the example's own wording in front of any title.
_PLACEHOLDER_BRACKETS = re.compile(r"<[a-z][^<>]*>")
_PLACEHOLDER_LABEL_OPENINGS = ("a place early in ", "a place later in ")


def drop_branch_menu_copying_the_worked_example(
    branches: Optional[dict[str, Any]], app_name: str
) -> Optional[dict[str, Any]]:
    """Drop a follow-up menu whose question or choices are still the prompt's worked example.

    Mirrors the parser's own rule for a broken checklist (strategy_guide_parse.py: "a rejected
    block is simply dropped ... rather than shown") for a block that parsed fine but still
    carries the example's wording -- Ravenholm, the train station, Half-Life 2 when that is not
    the game actually being asked about, or the placeholder phrase "this game" that stands in
    for a real title (ollama_prompts.py: '"question":"Where are you at in <THIS GAME>?"').
    """
    if not branches:
        return branches
    options = branches.get("options")
    if not isinstance(options, list):
        return branches

    # Ravenholm, the train station and Half-Life 2 itself are all real, legitimate answers
    # when Half-Life 2 is actually the game being asked about -- only suspicious when it is not.
    is_half_life_2 = (app_name or "").strip().lower() == "half-life 2"

    def _copies_the_example(text: str) -> bool:
        low = (text or "").strip().lower()
        if not low:
            return False
        if low in _WORKED_EXAMPLE_OPTION_LABELS_PLACEHOLDER:
            return True
        if any(marker in low for marker in _WORKED_EXAMPLE_MARKERS_PLACEHOLDER):
            return True
        if _PLACEHOLDER_BRACKETS.search(low):
            return True
        if low.strip("<> ").startswith(_PLACEHOLDER_LABEL_OPENINGS):
            return True
        if is_half_life_2:
            return False
        if low in _WORKED_EXAMPLE_OPTION_LABELS_HL2:
            return True
        if any(marker in low for marker in _WORKED_EXAMPLE_MARKERS_HL2):
            return True
        if "half-life 2" in low:
            return True
        return False

    question = branches.get("question")
    if _copies_the_example(question if isinstance(question, str) else ""):
        return None
    for opt in options:
        if isinstance(opt, dict) and _copies_the_example(str(opt.get("label", ""))):
            return None
    return branches
