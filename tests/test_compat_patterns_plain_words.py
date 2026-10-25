"""
Title: Troubleshooting tips carry the plain words people type
Purpose: Pin that the tips written for the 24 blind problem sentences (rows V2-W2-SYM-01 to -24 of
         tests/fixtures/kb_eval_v2.json) say their problem in the words a person would type, not
         only in the jargon the tip was first written in.
Used for: data/kb/compat_patterns.json, plan 100 lane T. The word search reads each tip's topic,
          platforms and text, so a tip that never says "goes black" cannot be found by a person
          who types "the screen goes black".
Solves: Of the 24 sentences, 8 reached any tip and 6 of those reached the right one. The tips said
        "crash" where people say "closes on its own", "storage full" where they say "no space
        left", and "blank" where they say "black".
Does not: Test routing (tests/test_compat_topic_router.py) or ranking, and does not read the
          fixture. It checks the tip text only, no library build and no Ollama.
"""

import json
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TIPS = json.loads((REPO_ROOT / "data" / "kb" / "compat_patterns.json").read_text(encoding="utf-8"))
BY_ID = {int(t["pattern_id"]): t for t in TIPS}

# sentence row (the number after V2-W2-SYM-) -> (tip it should reach, plain words that tip must say).
# Every phrase is one a person typed in one of the 24 sentences, or the nearest everyday form of it.
# Tip 76 does not say "install" on purpose: with that word a storage tip becomes a plain keyword hit for
# "installs on the memory card", which test_topic_recall_reaches_tips_that_share_no_word_with_the_question
# (tests/test_knowledge_base_service.py) pins as not happening.
# Rows 03 and 04 ("wont even open", "nothing happens when I launch") belong to tip 126; that tip is
# pinned word for word by tests/test_knowledge_base_service.py, so it is not reworded here.
PLAIN_WORDS = {
    "01": (125, ("home screen", "quits")),
    "02": (125, ("shuts itself off", "home screen")),
    "05": (152, ("goes black", "black screen")),
    "06": (152, ("turns black", "screen")),
    "12": (165, ("tv speakers", "headphones")),
    "13": (76, ("storage full", "can't add a new game")),
    "14": (76, ("not enough space", "no space left")),
    "23": (166, ("tv", "menus")),
    "24": (166, ("television", "menus", "wrong spot")),
}


class PlainWordsInTipsTests(unittest.TestCase):
    def test_each_blind_sentence_finds_its_words_in_the_tip_it_should_reach(self):
        for row, (tip_id, phrases) in PLAIN_WORDS.items():
            card = BY_ID[tip_id]["card"].lower()
            for phrase in phrases:
                with self.subTest(row="V2-W2-SYM-" + row, tip=tip_id, phrase=phrase):
                    self.assertIn(phrase, card)

    def test_the_built_in_screen_is_named_beside_the_external_one(self):
        """A black screen tip that only talks about an external monitor misses the Deck's own."""
        for tip_id in (152, 154):
            card = BY_ID[tip_id]["card"].lower()
            with self.subTest(tip=tip_id):
                self.assertIn("black", card)
        self.assertIn("built-in", BY_ID[152]["card"].lower())

    def test_two_new_tips_are_marked_researched_unconfirmed_and_filed_after_the_last(self):
        self.assertEqual(max(BY_ID), 166)
        self.assertEqual(sorted(BY_ID)[-3:], [164, 165, 166])
        expected_topic = {165: "audio", 166: "display"}
        for tip_id, topic in expected_topic.items():
            tip = BY_ID[tip_id]
            with self.subTest(tip=tip_id):
                self.assertEqual(tip["topic"], topic)
                self.assertTrue(tip["card"].startswith("Researched, unconfirmed:"))
                self.assertEqual(tip["source_license"], "bonsAI-maintainer")
                self.assertEqual(tip["source_url"], "")
                self.assertEqual(tip["platforms"], ["deck"])
                self.assertNotIn("app_id", tip, "a shared tip, not one game's own")

    def test_every_reworded_tip_stays_short(self):
        for tip_id in (76, 125, 152, 154, 165, 166):
            with self.subTest(tip=tip_id):
                self.assertLessEqual(len(BY_ID[tip_id]["card"]), 200)

    def test_the_frame_tips_are_left_alone(self):
        """110 and 111 are about the Steam Frame, not the Deck finding its PC."""
        self.assertEqual(BY_ID[110]["topic"], "steam_frame")
        self.assertEqual(BY_ID[111]["topic"], "steam_frame")
        self.assertEqual(
            BY_ID[110]["card"],
            "Steam Frame with bonsAI: run bonsAI on a Steam Deck on the same home network. "
            "There is no bonsAI inside the headset.",
        )



FIXTURE = json.loads((REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json").read_text(encoding="utf-8"))
SYM_ROWS = {q["id"]: q for q in FIXTURE["queries"] if q["id"].startswith("V2-W2-SYM-")}
# No Deck tip answers "can't find my PC" yet (110 and 111 are Steam Frame tips).
ROWS_WITH_NO_TIP = {"V2-W2-SYM-19", "V2-W2-SYM-20"}


class BlindSentenceRowsNameTheirTipTests(unittest.TestCase):
    """The 24 rows used to record no right tip, so "reach a tip" could not say "the right one"."""

    def test_there_are_twenty_four_rows(self):
        self.assertEqual(sorted(SYM_ROWS), ["V2-W2-SYM-%02d" % n for n in range(1, 25)])

    def test_each_row_names_a_tip_that_exists_and_its_topic(self):
        for rid, row in SYM_ROWS.items():
            with self.subTest(row=rid):
                self.assertIn("expect_pattern_id", row)
                self.assertIn("expect_topic", row)
                if rid in ROWS_WITH_NO_TIP:
                    self.assertEqual(row["expect_pattern_id"], "")
                    self.assertEqual(row["expect_topic"], "")
                    continue
                self.assertIn(row["expect_pattern_id"], BY_ID)
                self.assertEqual(BY_ID[row["expect_pattern_id"]]["topic"], row["expect_topic"])

    def test_the_tv_rows_point_at_the_two_new_tips(self):
        self.assertEqual(SYM_ROWS["V2-W2-SYM-12"]["expect_pattern_id"], 165)
        self.assertEqual(SYM_ROWS["V2-W2-SYM-23"]["expect_pattern_id"], 166)
        self.assertEqual(SYM_ROWS["V2-W2-SYM-24"]["expect_pattern_id"], 166)

    def test_the_rows_that_have_a_plain_words_check_point_at_that_tip(self):
        for row, (tip_id, _phrases) in PLAIN_WORDS.items():
            with self.subTest(row=row):
                self.assertEqual(SYM_ROWS["V2-W2-SYM-" + row]["expect_pattern_id"], tip_id)

    def test_the_sentences_themselves_are_unchanged(self):
        """The rows were written blind; only the answer columns were added."""
        self.assertEqual(SYM_ROWS["V2-W2-SYM-05"]["query"], "screen goes black when i open it")
        self.assertEqual(SYM_ROWS["V2-W2-SYM-19"]["query"], "cant find my pc on the network")


if __name__ == "__main__":
    unittest.main()
