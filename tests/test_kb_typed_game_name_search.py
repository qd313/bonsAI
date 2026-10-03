"""Title: Typing the game's own name no longer floats its generic notes to the top

Purpose: Pin the Deck-visible result of taking the resolved game's name out of the word search:
"black mesa how do i get across the electrified water" attaches the water note first, not
"Starting out in Black Mesa" and the opening tram ride; "in black mesa how do I tame a horse"
no longer matches three notes on the words "black mesa" alone.
Used for: knowledge_base_search.py `_question_without_typed_game_name`, used by `_search_sections`.
Solves: docs/roadmap-kb.md Bugs, "Black Mesa's electrified-water question names two unrelated
early-game notes" and the Black Mesa horse half of "Questions with no real answer in the notes
still get notes about the wrong subject" (docs/test-evidence/plan64-BLACKMESA-WATER.json,
plan70-NO-CLOSE-MATCH-HK-02.json).
Does not: Cover meaning search (no vectors are built here) or the "no close match" line.
"""

import re
import sqlite3
import tempfile
import unittest

from backend.services.knowledge_base_service import (
    close_connection,
    resolve_corpus_db_path,
    resolve_title_from_question,
    retrieve_knowledge_context,
)
from kb_keyword_corpus_support import BALDURS_GATE_3, BLACK_MESA, HOLLOW_KNIGHT, build_keyword_corpus

_HEADER_RE = re.compile(r"^\[.*: (.*?)\].*\(trust: [^)]+\)\s*$", re.M)

WATER = "black mesa how do i get across the electrified water"
HORSE = "in black mesa how do I tame a horse"


class _CorpusCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.settings = build_keyword_corpus(cls._tmp)
        cls.conn = sqlite3.connect(resolve_corpus_db_path(cls.settings))
        cls.conn.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def attached(self, question: str, app_id: str = ""):
        title = "" if app_id else resolve_title_from_question(self.settings, question)
        result = retrieve_knowledge_context(
            self.settings,
            ask_mode="strategy",
            question=question,
            app_id=app_id,
            app_name="",
            text_resolved_title=title,
            domain="strategy",
            pc_ip="",
        )
        return [m.group(1) for m in _HEADER_RE.finditer(result.text_block or "")], result


class WaterQuestionTests(_CorpusCase):
    def test_the_water_note_is_first_when_the_game_name_is_typed(self):
        names, _ = self.attached(WATER)
        self.assertEqual(names[0], "Crossing the electrified waste pools")

    def test_neither_generic_early_game_note_is_attached(self):
        names, _ = self.attached(WATER)
        self.assertNotIn("Starting out in Black Mesa", names)
        self.assertNotIn("The opening tram ride and where it leads", names)

    def test_the_same_question_with_the_game_running_is_unchanged(self):
        names, _ = self.attached("how do i get across the electrified water", app_id="362890")
        self.assertEqual(names[0], "Crossing the electrified waste pools")


class HorseQuestionTests(_CorpusCase):
    def test_no_generic_note_attaches_on_the_game_name_alone(self):
        names, _ = self.attached(HORSE)
        self.assertNotIn("Starting out in Black Mesa", names)
        self.assertNotIn("The opening tram ride and where it leads", names)
        self.assertNotIn("Recharging the HEV suit", names)

    def test_no_note_carries_a_keyword_score_from_the_game_name_alone(self):
        _, result = self.attached(HORSE)
        self.assertEqual(result.top_card_keyword_score, 0.0)


class NameStrippingTests(_CorpusCase):
    def strip(self, game_id: int, question: str) -> str:
        from backend.services.knowledge_base_search import _question_without_typed_game_name

        return _question_without_typed_game_name(self.conn, game_id, question)

    def test_the_canonical_title_is_taken_out_wherever_it_sits(self):
        self.assertEqual(self.strip(BLACK_MESA, "in Black Mesa how do I tame a horse"), "in how do I tame a horse")
        self.assertEqual(self.strip(BLACK_MESA, "how do I tame a horse in black mesa"), "how do I tame a horse in")

    def test_an_alias_is_taken_out_too(self):
        self.assertEqual(self.strip(HOLLOW_KNIGHT, "hk how do i get double jump"), "how do i get double jump")

    def test_an_apostrophe_in_the_title_still_matches(self):
        self.assertEqual(self.strip(BALDURS_GATE_3, "baldur's gate 3 best first class"), "best first class")

    def test_a_question_without_the_name_is_returned_untouched(self):
        self.assertEqual(self.strip(BLACK_MESA, "how do i beat the gonarch"), "how do i beat the gonarch")

    def test_a_question_that_is_only_the_name_is_returned_untouched(self):
        self.assertEqual(self.strip(BLACK_MESA, "black mesa"), "black mesa")

    def test_another_games_name_is_left_alone(self):
        self.assertEqual(
            self.strip(BLACK_MESA, "is hollow knight harder than black mesa"),
            "is hollow knight harder than",
        )


class SpecificQuestionsStillWorkTests(_CorpusCase):
    def test_a_boss_asked_by_name_with_the_game_typed(self):
        names, _ = self.attached("black mesa how do i beat the gonarch")
        self.assertEqual(names[0], "Gonarch")

    def test_a_where_do_i_start_question_still_gets_the_starting_note(self):
        names, _ = self.attached("black mesa where do i start")
        self.assertIn("Starting out in Black Mesa", names)

    def test_a_just_got_the_game_question_keeps_the_starting_note_first(self):
        # The one place the generic note is the right answer: the name stays in the words, or
        # the specific notes that merely repeat it would outrank the note about starting out.
        names, _ = self.attached("just got hollow knight, where do I even start")
        self.assertEqual(names[0], "Starting out in Hollow Knight")


if __name__ == "__main__":
    unittest.main()
