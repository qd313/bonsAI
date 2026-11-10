"""Plan 103, lane R2: three small changes to what the AI is told about the notes it was given.

1. A note about an enemy can carry a "Looks like:" line. The prompt keeps that line as a short
   bullet in the reply, the way it already does for Summary, Weak points, Uses and Phases.
2. A note of kind versus, coop, callout, survival or realism comes with one rule: do not volunteer
   a campaign finale's tactics or layout. Turns without such a note read exactly as before.
3. When the notes do not cover the question, the prompt can say so, so the AI says it in its own
   words. Lands switched off; the three candidate wordings sit behind constants.

The saved fingerprints (tests/fixtures/spoiler_default_tier_golden.json) are checked by
tests/test_spoiler_tier.py; the tests here check the same thing from the side of each change.
"""

import unittest

from backend.prompts.ollama_prompts import _KB_BLOCK_HEADER, build_system_prompt


def _build(early_context_suffix: str, ask_mode: str = "strategy") -> str:
    return build_system_prompt(
        "how do I beat the boss",
        "1145360",
        "Hades",
        [],
        [],
        lambda _a: "",
        lambda _p: {},
        ask_mode=ask_mode,
        early_context_suffix=early_context_suffix,
    )


def _block(card_header: str, card_body: str) -> str:
    return (
        f"{_KB_BLOCK_HEADER}\nDomain: strategy\n\n"
        f"[{card_header}] (trust: high)\n{card_body}\n"
        "--- end of knowledge base ---"
    )


_PLAIN_CARD = _block("Hades / boss: Megaera", "Some tactics text here.")
_LOOKS_LIKE_ONLY = _block("Hades / boss: Megaera", "Looks like: a tall winged woman in red armour.")
_LOOKS_LIKE_WITH_SUMMARY = _block(
    "Hades / boss: Megaera", "Summary: a fast duelist.\nLooks like: a tall winged woman in red armour."
)
_STRUCTURED_NO_LOOKS = _block("Hades / boss: Megaera", "Summary: a fast duelist.\nWeak points: her back.")


class LooksLikeLabelTests(unittest.TestCase):
    """Piece 1: "Looks like:" is one of the labels a note keeps as a bullet."""

    def test_a_card_with_only_a_looks_like_line_gets_the_labels_sentence(self):
        self.assertIn("STRUCTURED CARDS", _build(_LOOKS_LIKE_ONLY))

    def test_the_labels_sentence_names_looks_like_when_a_card_has_the_line(self):
        text = _build(_LOOKS_LIKE_WITH_SUMMARY)
        self.assertIn("(Summary / Weak points / Uses / Tips / Phases / Looks like)", text)

    def test_the_labels_sentence_is_unchanged_when_no_card_has_the_line(self):
        text = _build(_STRUCTURED_NO_LOOKS)
        self.assertIn("(Summary / Weak points / Uses / Tips / Phases).", text)
        self.assertNotIn("Looks like", text)

    def test_a_card_with_no_labels_still_gets_no_labels_sentence(self):
        self.assertNotIn("STRUCTURED CARDS", _build(_PLAIN_CARD))


if __name__ == "__main__":
    unittest.main()
