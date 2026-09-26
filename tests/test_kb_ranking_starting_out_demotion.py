"""Tests for the measurement-only "demote a generic Starting-out note" switch in
`_fuse_cards_by_rrf` (plan 70, helper B, bug 2).

Kept in its own file rather than added to the already very large
tests/test_knowledge_base_service.py: this switch is self-contained, off by default, and has no
production caller yet (see the module comment above `DEMOTE_STARTING_OUT_NOTES` in
knowledge_base_service.py for why -- wave two wires it up once a real "kind" field replaces the
name-guessing this wave measures with).
"""

import unittest

from backend.services.knowledge_base_service import (
    DEMOTE_STARTING_OUT_NOTES,
    KnowledgeCard,
    _fuse_cards_by_rrf,
    _is_starting_out_card,
    _question_asks_how_to_start,
)


def _card(section_id: int, name: str) -> KnowledgeCard:
    return KnowledgeCard(
        section_id, 2, "Black Mesa", "mechanic", name, f"card {name}", "", "", None, None,
        "fallback_no_source",
    )


class SwitchDefaultsOffTests(unittest.TestCase):
    def test_the_switch_itself_defaults_off(self):
        # Guards the one fact every other test here assumes: importing this module changes
        # nothing a real caller sees until something turns the switch on by hand.
        self.assertFalse(DEMOTE_STARTING_OUT_NOTES)


class IsStartingOutCardTests(unittest.TestCase):
    def test_matches_the_plain_shape(self):
        self.assertTrue(_is_starting_out_card(_card(1, "Starting out in Black Mesa")))

    def test_matches_a_longer_subtitle(self):
        # data/kb/strategy_seed.json has at least one of these ("Starting out in DOOM Eternal:
        # the combat loop") -- the prefix check must not require an exact, whole-name match.
        self.assertTrue(
            _is_starting_out_card(_card(1, "Starting out in DOOM Eternal: the combat loop"))
        )

    def test_a_specific_note_does_not_match(self):
        self.assertFalse(_is_starting_out_card(_card(1, "Crossing the electrified waste pools")))
        self.assertFalse(_is_starting_out_card(_card(1, "Broken Vessel")))

    def test_case_and_edge_whitespace_do_not_matter(self):
        self.assertTrue(_is_starting_out_card(_card(1, "  STARTING OUT IN Black Mesa  ")))


class QuestionAsksHowToStartTests(unittest.TestCase):
    def test_the_four_named_phrases_all_count(self):
        for question in (
            "where do I start in this game?",
            "how do I get started",
            "any beginner tips for this?",
            "I'm new to this, what should I know?",
        ):
            self.assertTrue(_question_asks_how_to_start(question), question)

    def test_an_ordinary_question_does_not_count(self):
        self.assertFalse(
            _question_asks_how_to_start("how do i cross the electrified water")
        )


class DemotionOrderingTests(unittest.TestCase):
    """`_fuse_cards_by_rrf` itself, switch on vs off, question asking to start or not."""

    def _cards(self) -> list[KnowledgeCard]:
        # Real shape, echoing docs/test-evidence/plan64-BLACKMESA-WATER.json: the generic note
        # is the best keyword hit (it repeats the game's own name), the specific note that
        # actually answers the question is a weaker keyword match and is listed last.
        return [
            _card(1, "Starting out in Black Mesa"),
            _card(2, "The opening tram ride and where it leads"),
            _card(3, "Crossing the electrified waste pools"),
        ]

    def test_switch_off_leaves_the_generic_note_first(self):
        fused = _fuse_cards_by_rrf(self._cards(), [1.0, 0.0], {}, top_k=5)
        self.assertEqual(fused[0].name, "Starting out in Black Mesa")

    def test_switch_on_moves_only_the_literally_named_note_to_the_bottom(self):
        # Narrower than the real device evidence: BLACKMESA-WATER.json has TWO generic notes
        # ahead of the specific one ("Starting out in Black Mesa" AND "The opening tram ride and
        # where it leads"), and this switch -- exactly as the brief specifies it -- only demotes
        # a note whose name literally starts "Starting out in". "The opening tram ride..." is
        # also generic in spirit but keeps its natural rank; this switch alone would not fully
        # cure that evidenced case. See the report for this finding in full.
        cards = self._cards()
        try:
            import backend.services.knowledge_base_service as kb_service

            kb_service.DEMOTE_STARTING_OUT_NOTES = True
            fused = _fuse_cards_by_rrf(
                cards,
                [1.0, 0.0],
                {},
                top_k=5,
                question="how do i cross the electrified water",
            )
        finally:
            kb_service.DEMOTE_STARTING_OUT_NOTES = False
        self.assertEqual(
            [c.name for c in fused],
            [
                "The opening tram ride and where it leads",
                "Crossing the electrified waste pools",
                "Starting out in Black Mesa",
            ],
        )

    def test_switch_on_but_the_question_asks_how_to_start_changes_nothing(self):
        cards = self._cards()
        try:
            import backend.services.knowledge_base_service as kb_service

            kb_service.DEMOTE_STARTING_OUT_NOTES = True
            fused = _fuse_cards_by_rrf(
                cards, [1.0, 0.0], {}, top_k=5, question="how do i get started in black mesa"
            )
        finally:
            kb_service.DEMOTE_STARTING_OUT_NOTES = False
        self.assertEqual(fused[0].name, "Starting out in Black Mesa")

    def test_a_pool_with_no_generic_note_is_unaffected_by_the_switch(self):
        cards = [_card(3, "Crossing the electrified waste pools"), _card(4, "Houndeye")]
        try:
            import backend.services.knowledge_base_service as kb_service

            kb_service.DEMOTE_STARTING_OUT_NOTES = True
            fused = _fuse_cards_by_rrf(cards, [1.0, 0.0], {}, top_k=5, question="")
        finally:
            kb_service.DEMOTE_STARTING_OUT_NOTES = False
        self.assertEqual([c.name for c in fused], ["Crossing the electrified waste pools", "Houndeye"])


if __name__ == "__main__":
    unittest.main()
