"""Plan 104 (row P104-M9-TRAILING-PHRASE): a question that ends in a comma and a request ("..., give me the full
attack pattern") is still read for the thing it names, so "No close match" can show.

Found by lane H1: "What is the best way to beat the boss Quillgrave in Hollow Knight, give me the full attack
pattern" (Quillgrave is made up) was never marked as uncovered. The check that finds the thing a question
names (``_question_subject_words`` in kb_not_in_notes_notice.py) wants the name at the very end of the
question, and the trailing request hid it. Only a fixed list of short endings ("in this run", "please") was
cut, and ", give me ..." is not one of them: the request is open ended.

The cases use the questions of tests/fixtures/kb_answer_eval.json (the Quillgrave and Terraria rows) and the
Deep Rock Galactic notes the other lexical tests use. The turn wrapper is the one the footer step calls.
"""

import json
import re
import unittest
from pathlib import Path

from test_kb_no_close_match_lexical import DRG, _named_turn

from backend.knowledge.kb_not_in_notes_notice import _question_subject_words

_FIXTURE = json.loads(
    (Path(__file__).resolve().parent / "fixtures" / "kb_answer_eval.json").read_text(encoding="utf-8")
)
_QUESTIONS = {case["id"]: case["question"] for case in _FIXTURE["cases"]}
_QUILLGRAVE = _QUESTIONS["A-UNKNOWN-03"]  # "..., give me the full attack pattern"
_EYE_OF_CTHULHU = _QUESTIONS["A-UNKNOWN-07"]  # "..., give me the full run-down"
_HK = "Hollow Knight"
_HK_NOTES = ("False Knight", "Hornet in Greenpath", "Mantis Lords", "Soul Master", "Watcher Knights")
_GRIMTHAK = "How do I defeat the boss named Grimthak"
_GRIMTHAK_NOTES = ("Glyphid Dreadnought", "Dreadnought Twins", "Mactera")


class TheFixtureQuestionsNameTheirThingTests(unittest.TestCase):
    def test_the_fixture_questions_really_end_in_a_comma_and_a_request(self):
        # Guards the cases below: if the fixture changes, these tests must be looked at again.
        self.assertTrue(_QUILLGRAVE.endswith(", give me the full attack pattern"))
        self.assertTrue(_EYE_OF_CTHULHU.endswith(", give me the full run-down"))

    def test_quillgrave_is_the_thing_asked_about(self):
        self.assertEqual(_question_subject_words(_QUILLGRAVE, _HK), {"quillgrave"})

    def test_the_eye_of_cthulhu_is_the_thing_asked_about(self):
        self.assertEqual(_question_subject_words(_EYE_OF_CTHULHU, "Terraria"), {"eye", "cthulhu"})

    def test_a_made_up_boss_with_a_trailing_request_gets_the_line_with_the_game_typed(self):
        # The turn H1 measured: some Hollow Knight notes attached, none names Quillgrave.
        for keyword, meaning in ((0.0, 0.62), (2.5, 0.62), (2.5, 0.80), (2.5, None)):
            with self.subTest(keyword=keyword, meaning=meaning):
                self.assertTrue(
                    _named_turn(_QUILLGRAVE, _HK, _HK_NOTES, keyword=keyword, meaning=meaning, text_title=_HK)
                )


class AnyRequestAfterACommaIsCutTests(unittest.TestCase):
    REQUESTS = (
        ", give me the full attack pattern",
        ", give me everything you know",
        ", tell me all about it",
        ", please tell me how it works",
        ", explain it step by step",
        ", describe the fight",
        ", walk me through it",
        ", show me the weak points",
        ", what is the best strategy",
        ", what's the best way",
        ", what are its attacks",
    )

    def test_each_request_leaves_the_named_boss_findable(self):
        for request in self.REQUESTS:
            with self.subTest(request=request):
                self.assertEqual(_question_subject_words(_GRIMTHAK + request, DRG), {"grimthak"})
                self.assertTrue(
                    _named_turn(_GRIMTHAK + request, DRG, _GRIMTHAK_NOTES, keyword=2.88, meaning=0.70)
                )

    def test_the_request_may_be_followed_by_a_usual_ending(self):
        self.assertEqual(_question_subject_words(_GRIMTHAK + " in this run, give me tips here", DRG), {"grimthak"})

    def test_a_right_note_with_a_trailing_request_stays_quiet(self):
        for request in (", give me the full attack pattern", ", tell me everything about it"):
            with self.subTest(request=request):
                self.assertFalse(
                    _named_turn(
                        "how do i beat the glyphid dreadnought" + request, DRG,
                        ("Glyphid Dreadnought",), keyword=9.1, meaning=0.78,
                    )
                )


class WordsThatNameTheThingAreNotCutTests(unittest.TestCase):
    def test_a_name_that_only_the_request_carries_is_still_found(self):
        # The first part names nothing; the request does, at the end, as it always could.
        self.assertEqual(
            _question_subject_words("how do I get past him, give me the weak points of the boss named Zorblax", DRG),
            {"zorblax"},
        )

    def test_a_name_in_the_first_part_wins_when_the_request_names_nothing_findable(self):
        self.assertEqual(
            _question_subject_words("how do I beat the boss named Zorblax, tell me about its attacks", DRG),
            {"zorblax"},
        )

    def test_a_second_question_that_does_not_start_as_a_request_is_not_cut(self):
        # ", and how do I refill it" and ", is there a limit" are second questions: not touched.
        self.assertEqual(
            _question_subject_words("how does health work in Super Mario 64, and how do I refill it", "Super Mario 64"),
            set(),
        )

    def test_a_descriptive_question_with_no_request_is_left_to_the_scores(self):
        self.assertEqual(
            _question_subject_words(
                "there's a fight with a guy on a chariot and a huge minotaur at the same time, any tips", "Hades"
            ),
            set(),
        )

    def test_no_fixture_question_without_a_comma_request_is_affected_by_the_cut(self):
        pattern = re.compile(r",\s*(?:please\s+)?(?:(?:give|tell|show|walk)\s+(?:me|us)\b|explain\b|describe\b|list\b|what(?:'s|\s+is|\s+are)\b)", re.I)
        cut = [c["question"] for c in _FIXTURE["cases"] if pattern.search(c["question"])]
        # Only the two made-up/uncovered rows of this wave use the shape today.
        self.assertEqual(sorted(cut), sorted([_QUILLGRAVE, _EYE_OF_CTHULHU]))


if __name__ == "__main__":
    unittest.main()
