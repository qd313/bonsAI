"""Title: "No close match" also shows when nothing the question says appears in the attached notes

Purpose: Pin the Deck-visible result for the wrong-subject control question: "in black mesa how do
I tame a horse" attaches three Black Mesa notes, none of which mentions a horse or taming, and the
meaning score of 0.6508 sits a hair over the 0.65 ceiling -- so the line did not show on the Deck
(workshop:test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json). It now shows.
Used for: kb_not_in_notes_notice.py `should_show_no_close_match_notice` and its turn wrapper.
Solves: docs/roadmap-kb.md Bugs, "Questions with no real answer in the notes still get notes
about the wrong subject" (the line half of it).
Does not: Change which notes attach, or the ceiling itself (0.65 stays; it was not retuned for one
question).
"""

import json
import unittest
from pathlib import Path

from backend.knowledge.kb_not_in_notes_notice import should_show_no_close_match_notice_for_turn

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

    def test_a_keyword_hit_does_not_hide_a_horse_no_note_mentions(self):
        # Same question and notes, but the keyword half did rank something. Until plan 98 lane L
        # the keyword hit was trusted and no line showed; the Deck's "buy a house" turn
        # (2026-10-24) was that exact shape. The question names a horse and no attached note
        # mentions one, so the line shows whatever the scores say.
        self.assertTrue(
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


# --- The thing the question names is in none of the attached notes (plan 98 lane L) ---------
#
# 2026-10-24 Deck readings (workshop:test-evidence/plan98-P98-NOTES-BLOCK-04-READING-1.json to
# -4.json). With Deep Rock Galactic: Survivor running, "How do I buy a house in this game"
# attached Gold, Nitra and Mining and showed no line: the keyword search matched "buy" to the
# notes' "Buys", and a keyword hit was trusted outright whenever the game was running. Built
# from the real notes the library attached and the scores the PC measured for them.

GAMES = {g["game_id"]: g["canonical_title"] for g in SEED["games"]}
CARDS = {(GAMES[s["game_id"]], s["name"]): s["card"] for s in SEED["sections"]}
DRG = "Deep Rock Galactic: Survivor"


def _named_turn(question, game, note_names, *, keyword, meaning, nogame=None, text_title=""):
    """One Strategy turn as the footer step sees it, the notes carrying their real game title."""
    return should_show_no_close_match_notice_for_turn(
        ask_mode="strategy",
        kb_transparency={
            "kb_attached": True,
            "kb_domain": "strategy",
            "kb_best_meaning": meaning,
            "kb_best_meaning_without_game_name": nogame,
            "kb_top_card_keyword_score": keyword,
            "kb_notes": f"text:{game.lower()}" if text_title else "app_id:2321470",
            "kb_sources": [{"title": f"{game} — {n}"} for n in note_names],
        },
        kb_coverage_transparency={"kb_coverage_status": "sections"},
        text_resolved_title=text_title,
        question_for_kb_search=question,
        kb_attached_notes=[
            {"name": n, "card": CARDS[(game, n)], "game_title": game} for n in note_names
        ],
    )


class TheDeckQuestionsGetTheLineTests(unittest.TestCase):
    def test_buy_a_house_with_the_game_running(self):
        # Measured 2026-10-24: keyword 3.58, meaning 0.603; the only shared word is "buy".
        self.assertTrue(
            _named_turn(
                "How do I buy a house in this game", DRG,
                ("Gold", "Nitra", "Mining and the run timer"), keyword=3.5785, meaning=0.603,
            )
        )

    def test_a_made_up_boss_called_zorblax(self):
        self.assertTrue(
            _named_turn(
                "Who is the final boss called Zorblax in this game", DRG,
                ("Glyphid Dreadnought", "Dreadnought Twins", "Exploder"),
                keyword=0.0, meaning=0.5832,
            )
        )

    def test_grimthak_shows_the_line_even_when_a_card_scores_on_keywords(self):
        # The flip between Deck nights: some nights a keyword hit ranked a card. The line no
        # longer depends on that, nor on the meaning score.
        for keyword, meaning in ((0.0, 0.5793), (2.5, 0.5793), (2.5, 0.80), (2.5, None)):
            with self.subTest(keyword=keyword, meaning=meaning):
                self.assertTrue(
                    _named_turn(
                        "How do I defeat the boss named Grimthak in this game", DRG,
                        ("Glyphid Dreadnought", "Dreadnought Twins", "Mactera"),
                        keyword=keyword, meaning=meaning,
                    )
                )

    def test_the_bone_hydra_typed_and_running(self):
        notes = ("Heat and the Pact of Punishment", "Theseus and Asterius", "Weapon choice")
        self.assertTrue(
            _named_turn(
                "In Hades, how do I beat the boss called the Bone Hydra", "Hades", notes,
                keyword=3.8309, meaning=0.6456, nogame=0.6313, text_title="Hades",
            )
        )
        # Hades running, as plan 47's device sentence asked it (keyword 3.83, meaning 0.637).
        self.assertTrue(
            _named_turn(
                "how do i beat the bone hydra in hades", "Hades", notes,
                keyword=3.8309, meaning=0.6368,
            )
        )


class EverydayEndingsDoNotHideTheNamedThingTests(unittest.TestCase):
    GRIMTHAK_NOTES = ("Glyphid Dreadnought", "Dreadnought Twins", "Mactera")

    def test_grimthak_with_each_ending_still_gets_the_line(self):
        # Measured 2026-10-24: "in this run" lifts the keyword score to 2.88 ("run" is in the
        # Mining note), and before this only "in this game" was cut, so nothing was named.
        for ending in (" in this run", " here", " right now", " in this level",
                       " in this mission", " please", " at the start", "?",
                       " in this run please", " here?"):
            with self.subTest(ending=ending):
                self.assertTrue(
                    _named_turn(
                        "How do I defeat the boss named Grimthak" + ending, DRG,
                        self.GRIMTHAK_NOTES, keyword=2.8786, meaning=0.70,
                    )
                )

    def test_a_three_word_name_and_an_ending_still_gets_the_line(self):
        # "qqqq zzzz wwww in this run" with Hades running: keyword 2.21 on "run".
        self.assertTrue(
            _named_turn(
                "qqqq zzzz wwww in this run please", "Hades",
                ("Mirror of Night", "Boons and duo boons"), keyword=2.2149, meaning=0.60,
            )
        )

    def test_a_right_note_with_an_ending_stays_quiet(self):
        for ending in (" first", " early on", " in this run please", " fast"):
            with self.subTest(ending=ending):
                self.assertFalse(
                    _named_turn(
                        "how do i beat the glyphid dreadnought" + ending, DRG,
                        ("Glyphid Dreadnought",), keyword=9.1, meaning=0.78,
                    )
                )

    def test_a_long_ending_that_is_not_on_the_list_is_left_to_the_scores(self):
        # "in co-op with my friends" is not cut, so the name is not at the end, nothing is named,
        # and the scores decide (keyword support, meaning over 0.65: no line). Known limit.
        self.assertFalse(
            _named_turn(
                "How do I defeat the boss named Grimthak in co-op with my friends", DRG,
                self.GRIMTHAK_NOTES, keyword=2.8786, meaning=0.70,
            )
        )


class RightNotesStayQuietTests(unittest.TestCase):
    def test_glyphid_dreadnought_with_the_game_running(self):
        self.assertFalse(
            _named_turn(
                "how do i beat the glyphid dreadnought", DRG,
                ("Glyphid Dreadnought", "Dreadnought Twins"), keyword=9.1, meaning=0.78,
            )
        )

    def test_a_typed_game_name_never_counts_as_the_subject(self):
        self.assertFalse(
            _named_turn(
                "how do i beat theseus and asterius in hades", "Hades",
                ("Theseus and Asterius", "Weapon choice"), keyword=12.0, meaning=0.74,
                nogame=0.70, text_title="Hades",
            )
        )

    def test_a_running_games_name_at_the_end_is_not_part_of_the_named_thing(self):
        # "deep rock galactic survivor" is the game; "nitra" is what is asked about.
        self.assertFalse(
            _named_turn(
                "how do i get the nitra in deep rock galactic survivor", DRG, ("Nitra",),
                keyword=6.0, meaning=0.71,
            )
        )

    def test_a_different_ending_of_the_same_word_still_counts(self):
        # "armored" asked, "armor" written: the keyword search folds these alike, so does this.
        self.assertFalse(
            _named_turn(
                "how do i kill the armored ones", DRG, ("Glyphid Dreadnought",),
                keyword=3.0, meaning=0.62,
            )
        )

    def test_a_question_that_describes_instead_of_naming_is_left_to_the_scores(self):
        # V2-BLIND-H10 in tests/fixtures/kb_eval_v2.json: its right note, Theseus and Asterius,
        # shares no word with it. Measured with Hades running: keyword 1.30, meaning 0.638.
        self.assertFalse(
            _named_turn(
                "there's a fight with a guy on a chariot and a huge minotaur at the same time, "
                "any tips", "Hades", ("Theseus and Asterius", "Weapon choice", "Stygian Blade"),
                keyword=1.298, meaning=0.6384,
            )
        )


if __name__ == "__main__":
    unittest.main()
