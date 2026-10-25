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

    def test_the_black_screen_tip_names_the_built_in_screen_beside_the_external_one(self):
        """A black screen tip that only talks about an external monitor misses the Deck's own.

        Only tip 152 carries the black-screen words. Tip 154 (set an external display to 1080p60)
        stays as it was: with "black screen" in it too, it out-ranked 152 for a black screen on
        the Deck's own display (row V2-W2-SYM-06), and its advice does not apply there.
        """
        card = BY_ID[152]["card"].lower()
        for phrase in ("black screen", "built-in screen"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, card)
        self.assertNotIn("black", BY_ID[154]["card"].lower())

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



class MeasuringScriptNamesTheRightTipTests(unittest.TestCase):
    """scripts/measure_kb_floor_holdout.py now says which tip the first answer carried.

    The level the Deck check looks at: a question's reply carries a tip, and the table says whether
    that tip is the right one. The helpers are tested on the text block the real card writer emits,
    not on a block the test makes up.
    """

    @classmethod
    def setUpClass(cls):
        from script_loader import load_script

        cls.script = load_script("measure_kb_floor_holdout")

    def _library_with(self, ids):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.execute(
            "CREATE TABLE compat_patterns (pattern_id INTEGER PRIMARY KEY, topic TEXT, card TEXT, "
            "source_url TEXT, source_license TEXT)"
        )
        for tip_id in ids:
            conn.execute(
                "INSERT INTO compat_patterns VALUES (?, ?, ?, ?, ?)",
                (tip_id, BY_ID[tip_id]["topic"], BY_ID[tip_id]["card"], "", "bonsAI-maintainer"),
            )
        return conn

    def test_the_tip_numbers_are_read_back_from_the_text_block_in_order(self):
        from backend.knowledge.knowledge_base_cards import _compat_row_to_card, _card_lines

        conn = self._library_with([125, 126, 76])
        cards = [_compat_row_to_card(r) for r in conn.execute("SELECT * FROM compat_patterns WHERE pattern_id IN (76, 125)")]
        cards.sort(key=lambda c: c.section_id, reverse=True)  # 125 first, then 76
        block = "\n".join(["--- start ---"] + [_card_lines(c, domain="compat") for c in cards] + ["\n--- End ---"])
        self.assertEqual(self.script.tip_ids_in_order(conn, block), [125, 76])
        self.assertEqual(self.script.tip_ids_in_order(conn, ""), [])

    def test_a_tip_whose_text_starts_another_is_not_mistaken_for_it(self):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE compat_patterns (pattern_id INTEGER PRIMARY KEY, topic TEXT, card TEXT)")
        conn.execute("INSERT INTO compat_patterns VALUES (1, 'audio', 'Check the output.')")
        conn.execute("INSERT INTO compat_patterns VALUES (2, 'audio', 'Check the output. Then the game.')")
        block = "--- start ---\n\n[Tip: audio] (trust: x)\nCheck the output. Then the game.\n\n--- End ---"
        self.assertEqual(self.script.tip_ids_in_order(conn, block), [2])

    def test_verdicts(self):
        v = self.script.tip_verdict
        self.assertEqual(v(125, 125), "right")
        self.assertEqual(v(125, 126), "wrong")
        self.assertEqual(v(125, None), "nothing")
        self.assertEqual(v("", None), "nothing (none fits)")
        self.assertEqual(v("", 120), "wrong (none fits)")
        self.assertEqual(v(None, 120), "wrong (none fits)")
        # Another tip from the same subject is counted apart, not as a plain miss.
        self.assertEqual(v(125, 126, "crash", "crash"), "right topic")
        self.assertEqual(v(125, 120, "crash", "network"), "wrong")

    def test_the_table_has_a_row_per_sentence_and_a_before_column(self):
        now = [
            {"id": "V2-W2-SYM-05", "query": "screen goes black when i open it", "first_tip_id": 152,
             "attached": ["display"], "expect_pattern_id": 152},
            {"id": "V2-W2-SYM-19", "query": "cant find my pc on the network", "first_tip_id": None,
             "attached": [], "expect_pattern_id": ""},
        ]
        before = [
            {"id": "V2-W2-SYM-05", "query": "screen goes black when i open it", "first_tip_id": None,
             "attached": [], "expect_pattern_id": 152},
            {"id": "V2-W2-SYM-19", "query": "cant find my pc on the network", "first_tip_id": None,
             "attached": [], "expect_pattern_id": ""},
        ]
        lines = self.script.blind_table_lines(now, before)
        text = "\n".join(lines)
        self.assertEqual(len(lines), 3)  # header and two sentences
        self.assertIn("152", lines[1])
        self.assertIn("right", lines[1])
        self.assertIn("nothing", lines[1])  # before: nothing
        self.assertIn("nothing (none fits)", lines[2])
        self.assertIn("before", lines[0])
        self.assertNotIn("before", "\n".join(self.script.blind_table_lines(now, None)))
        self.assertIn("screen goes black", text)

    def test_the_blind_summary_counts_the_right_tip_not_just_any_tip(self):
        rows = [
            {"first_tip_id": 125, "expect_pattern_id": 125, "attached": ["crash"]},
            {"first_tip_id": 126, "expect_pattern_id": 125, "attached": ["crash"]},
            {"first_tip_id": 120, "expect_pattern_id": "", "attached": ["network"]},
            {"first_tip_id": None, "expect_pattern_id": 76, "attached": []},
            {"first_tip_id": 142, "expect_pattern_id": 136, "expect_topic": "performance", "attached": ["performance"]},
        ]
        s = self.script.blind_summary(rows)
        self.assertEqual(
            s,
            {
                "total": 5,
                "reach_a_tip": 4,
                "name_a_right_tip": 4,
                "reach_the_right_tip": 1,
                "reach_the_right_topic_only": 1,
                "reach_a_wrong_tip": 2,
            },
        )


class BlindSentencesReachTheRightTipTests(unittest.TestCase):
    """The Deck's level: the sentence typed, the first tip the reply carries.

    Builds the real library from the repo's data (as the service tests do) and asks each blind
    sentence the way the Ask does with nothing running and a quick answer: it must carry the tip the
    fixture names. Skips where the library cannot be built (no embedding model on this machine).

    This is the check that caught two ranking slips the wording tests could not: a longer storage
    tip lost "storage full cant install anything else" to the cloud-save tip, and a black-screen
    line added to the external-display tip beat the built-in-screen tip for row 06.
    """

    # Rows that reached the right tip at the end of plan 100 lane T, plus the four that already did.
    # The rest (03, 04, 07, 08, 09, 10, 16, 18, 19, 20, 22) reach another tip on the right subject,
    # or none, and are left to the table the measuring script prints.
    MUST_REACH_THE_RIGHT_TIP = ("01", "02", "05", "06", "11", "12", "13", "14", "15", "17", "21", "23", "24")

    @classmethod
    def setUpClass(cls):
        from corpus_build_support import run_seed_build_or_skip
        from script_loader import load_script

        cls.script = load_script("measure_kb_floor_holdout")
        cls.out_dir = REPO_ROOT / "build" / "knowledge-base-plainwords-test"
        cls.out_dir.mkdir(parents=True, exist_ok=True)
        run_seed_build_or_skip(REPO_ROOT, cls.out_dir)
        cls.settings = {
            "use_local_knowledge_base": True,
            "rag_hybrid_retrieval_enabled": True,
            "rag_corpus_path": str(cls.out_dir),
        }

    def test_each_sentence_carries_the_tip_the_fixture_names(self):
        from backend.knowledge import knowledge_base_service as kb

        conn = kb._get_connection(kb.resolve_corpus_db_path(self.settings))
        try:
            for number in self.MUST_REACH_THE_RIGHT_TIP:
                row = SYM_ROWS["V2-W2-SYM-" + number]
                with self.subTest(row=row["id"], sentence=row["query"]):
                    ids: list = []
                    self.script.attached(
                        self.settings, row["query"], mode="speed", app_id="", app_name="",
                        pc_ip="", conn=conn, ids_out=ids,
                    )
                    self.assertTrue(ids, "no tip attached")
                    self.assertEqual(ids[0], row["expect_pattern_id"])
        finally:
            kb.close_connection(kb.resolve_corpus_db_path(self.settings))

    def test_a_boss_question_attaches_no_tip(self):
        for question in ("how do I beat the boss", "what should I build first", "thank you very much"):
            with self.subTest(question=question):
                names, _domain = self.script.attached(
                    self.settings, question, mode="speed", app_id="", app_name="", pc_ip="",
                )
                self.assertEqual(names, [])


if __name__ == "__main__":
    unittest.main()
