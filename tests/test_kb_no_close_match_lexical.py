"""Title: "No close match" also shows when nothing the question says appears in the attached notes

Purpose: Pin the Deck-visible result for the wrong-subject control question: "in black mesa how do
I tame a horse" attaches three Black Mesa notes, none of which mentions a horse or taming, and the
meaning score of 0.6508 sits a hair over the 0.65 ceiling -- so the line did not show on the Deck
(docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json). It now shows.
Used for: kb_not_in_notes_notice.py `should_show_no_close_match_notice` and its turn wrapper.
Solves: docs/roadmap-kb.md Bugs, "Questions with no real answer in the notes still get notes
about the wrong subject" (the line half of it).
Does not: Change which notes attach, or the ceiling itself (0.65 stays; it was not retuned for one
question).
"""

import json
import unittest
from pathlib import Path

from backend.services.kb_not_in_notes_notice import should_show_no_close_match_notice_for_turn

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8")
)
BLACK_MESA_NOTES = {s["name"]: s["card"] for s in SEED["sections"] if s["game_id"] == 14}


def _turn(question, note_names, *, meaning, nogame=None, keyword=0.0, text_title="", notes="text:black mesa"):
    return should_show_no_close_match_notice_for_turn(
        ask_mode="strategy",
        kb_transparency={
            "kb_attached": True,
            "kb_domain": "strategy",
            "kb_best_meaning": meaning,
            "kb_best_meaning_without_game_name": nogame,
            "kb_top_card_keyword_score": keyword,
            "kb_notes": notes,
            "kb_sources": [{"title": f"Black Mesa — {n}"} for n in note_names],
        },
        kb_coverage_transparency={"kb_coverage_status": "sections"},
        text_resolved_title=text_title,
        question_for_kb_search=question,
        kb_attached_notes=[{"title": n, "card": BLACK_MESA_NOTES[n]} for n in note_names],
    )


HORSE_NOTES = ("Starting out in Black Mesa", "The opening tram ride and where it leads", "Houndeye")


class HorseQuestionTests(unittest.TestCase):
    def test_the_exact_deck_run_shows_the_line_on_the_edge_of_the_ceiling(self):
        # The numbers the PC measured for this question with the current library: the score with
        # the game's name taken out was 0.6508, over the 0.65 ceiling by 0.0008.
        self.assertTrue(
            _turn(
                "in black mesa how do I tame a horse",
                HORSE_NOTES,
                meaning=0.69,
                nogame=0.6508,
                text_title="Black Mesa",
            )
        )

    def test_a_word_match_the_keyword_search_made_is_not_second_guessed(self):
        # Same question and notes, but the keyword half did rank something: this rule is only for
        # notes that nothing but the meaning score ever supported, so the old ceiling decides.
        self.assertFalse(
            _turn(
                "in black mesa how do I tame a horse",
                HORSE_NOTES,
                meaning=0.69,
                nogame=0.6508,
                keyword=2.4,
                text_title="Black Mesa",
            )
        )


class RealQuestionsStayQuietTests(unittest.TestCase):
    def test_a_boss_found_by_meaning_only_shows_no_line_when_the_note_names_it(self):
        self.assertFalse(
            _turn("black mesa how do i beat the gonarch", ("Gonarch",), meaning=0.72, text_title="Black Mesa")
        )

    def test_a_paraphrase_that_shares_a_word_with_the_note_text_shows_no_line(self):
        # "water" and "electrified" are in the water note's text; the question never names the
        # note's title ("Crossing the electrified waste pools") at all.
        self.assertFalse(
            _turn(
                "black mesa how do i get across the electrified water",
                ("Crossing the electrified waste pools",),
                meaning=0.68,
                text_title="Black Mesa",
            )
        )

    def test_a_keyword_hit_on_a_real_word_shows_no_line(self):
        self.assertFalse(
            _turn(
                "black mesa how do i recharge my suit",
                ("Recharging the HEV suit",),
                meaning=0.70,
                keyword=9.0,
                text_title="Black Mesa",
            )
        )


class NothingToCheckAgainstTests(unittest.TestCase):
    def test_a_turn_with_no_attached_note_text_keeps_the_old_rule(self):
        # An older save or a caller with no notes to read: the meaning ceiling decides alone.
        shown_over = should_show_no_close_match_notice_for_turn(
            ask_mode="strategy",
            kb_transparency={
                "kb_attached": True,
                "kb_domain": "strategy",
                "kb_best_meaning": 0.70,
                "kb_top_card_keyword_score": 0.0,
                "kb_notes": "app_id:362890",
            },
            kb_coverage_transparency={"kb_coverage_status": "sections"},
            text_resolved_title="",
            question_for_kb_search="how do I tame a horse",
            kb_attached_notes=[],
        )
        self.assertFalse(shown_over)


if __name__ == "__main__":
    unittest.main()
