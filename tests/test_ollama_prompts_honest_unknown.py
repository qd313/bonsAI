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
from pathlib import Path

from backend.prompts.ollama_prompts import FINALE_RULE_NOTE_KINDS, _KB_BLOCK_HEADER, build_system_prompt


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


_FINALE_SENTENCE = (
    "Do not volunteer a campaign finale's tactics or layout, and if the player asks about one before they are "
    "there, help with the problem at hand first and say the finale can wait."
)


def _versus_card(kind: str) -> str:
    return _block(f"Left 4 Dead 2 / {kind}: Made-up note", "A made-up note about this kind of play.")


class FinaleRuleTests(unittest.TestCase):
    """Piece 2: a versus-style note brings one rule about campaign finales; no other turn does."""

    def test_the_five_kinds_are_the_ones_the_brief_names(self):
        self.assertEqual(set(FINALE_RULE_NOTE_KINDS), {"versus", "coop", "callout", "survival", "realism"})

    def test_each_of_the_five_kinds_brings_the_rule(self):
        for kind in FINALE_RULE_NOTE_KINDS:
            for mode in ("strategy", "expert", "speed"):
                with self.subTest(kind=kind, mode=mode):
                    self.assertIn(_FINALE_SENTENCE, _build(_versus_card(kind), ask_mode=mode))

    def test_the_rule_appears_once_even_with_two_such_notes(self):
        two = _versus_card("versus") + _versus_card("coop")
        self.assertEqual(_build(two).count(_FINALE_SENTENCE), 1)

    def test_other_kinds_do_not_bring_the_rule(self):
        for kind in ("boss", "tip", "mechanic", "starting_out"):
            with self.subTest(kind=kind):
                self.assertNotIn(_FINALE_SENTENCE, _build(_versus_card(kind)))

    def test_no_notes_and_no_block_bring_no_rule(self):
        self.assertNotIn(_FINALE_SENTENCE, _build(""))
        self.assertNotIn(_FINALE_SENTENCE, _build(_PLAIN_CARD))

    def test_a_card_that_only_mentions_the_word_versus_does_not_bring_the_rule(self):
        card = _block("Hades / boss: Megaera", "Best in a / versus: style duel, they say.")
        self.assertNotIn(_FINALE_SENTENCE, _build(card))

    def test_the_prompt_differs_from_a_boss_note_turn_by_exactly_that_one_line(self):
        with_rule = _build(_versus_card("versus"))
        plain = _build(_versus_card("boss"))
        same_card = with_rule.replace("versus: Made-up", "boss: Made-up")
        self.assertEqual(same_card.replace("\nFINALE RULE: " + _FINALE_SENTENCE + "\n", ""), plain)

    def test_the_constitution_states_the_same_rule_in_plain_words(self):
        doc = (Path(__file__).parent.parent / "docs" / "planning" / "spoiler-constitution.md").read_text(
            encoding="utf-8"
        )
        flat = " ".join(doc.split())
        for words in ("campaign finale", "tactics or layout", "before they are there", "the finale can wait"):
            with self.subTest(words=words):
                self.assertIn(words, flat)


if __name__ == "__main__":
    unittest.main()
