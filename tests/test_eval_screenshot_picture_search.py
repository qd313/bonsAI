"""Title: Picture-guess measurement tests (plan 103, lane P2, round 1)

Purpose: Pin the measurement scripts/kb/eval_screenshot_reading.py gained for lane P2: the loader reads the new
         labels (place, expected note, how sure), a guess is judged against a picture's labels (right, wrong,
         unsure, unchecked), the right note is found by its name among those attached, a run asks once per
         picture and model and searches twice per typed question (today's words, then with the guess), and the
         report states the landing rule's two halves in plain numbers.
Used for: scripts/kb/eval_screenshot_reading.py (--picture-search) and tests/fixtures/screenshot_eval_v1.json.
Solves: A reader that scored a wrong guess right, or a note found by a near name, would make a picture search that
        helps look better than it is, and the "on" decision rests on these numbers.
Does not: Start Ollama, open a picture or search a real library: the guess and the search are stand-ins.
"""

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))

LABELS_V1 = REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v1.json"
OTHERS = ["Hades", "Hollow Knight", "Deep Rock Galactic"]
QUESTIONS = ("What should I do here?", "How do I beat this?")


def _guess(game="", place="", enemy="", not_sure=0):
    words = " ".join(w for w in (game, place, enemy) if w)
    return SimpleNamespace(game=game, place=place, enemy=enemy, search_words=words, not_sure_lines=not_sure)


def _outcome(guess, status="written", seconds=2.0, raw="", model="m"):
    return SimpleNamespace(status=status, guess=guess, seconds=seconds, raw=raw, model=model)


class _ScriptCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_script("eval_screenshot_reading", register=True)

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_screenshot_reading", None)

    def pic(self, **overrides):
        base = dict(
            id="p1", file="p1.jpg", path="", game="Hades", game_aliases=["Hades 1"], scene="play", boss="Megaera",
            boss_aliases=["the Fury"], running_game_known=True, app_id="1145360", app_name="Hades", scene_words=[],
            place="Tartarus", place_aliases=["the Underworld"], expect_section="Megaera", expect_section_also=["Furies"],
            in_library=True, confidence={"game": "high", "place": "high", "boss": "high"},
        )
        base.update(overrides)
        return self.mod.Picture(**base)


class LoaderTests(_ScriptCase):
    def test_the_v1_labels_load_with_place_expected_note_and_confidence(self):
        pictures = {p.id: p for p in self.mod.load_pictures(LABELS_V1, None)}
        levelup = pictures["p1-drg-levelup-1"]
        self.assertEqual(levelup.expect_section, "Upgrades and overclocks")
        self.assertEqual(levelup.place, "Elimination Sector 01")
        self.assertEqual(levelup.confidence["place"], "high")
        self.assertTrue(levelup.in_library)
        bottles = pictures["p1-oot-pause-items"]
        self.assertEqual(bottles.expect_section_also, ["Hookshot and Longshot"])
        self.assertEqual(bottles.confidence["place"], "low")

    def test_a_label_file_without_the_new_fields_still_loads_with_empty_defaults(self):
        pictures = self.mod.load_pictures(REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v0.json", None)
        self.assertTrue(pictures)
        self.assertEqual((pictures[0].place, pictures[0].expect_section, pictures[0].confidence), ("", "", {}))


class JudgeGuessTests(_ScriptCase):
    def judge(self, guess, **pic):
        return self.mod.judge_guess(guess, self.pic(**pic), OTHERS)

    def test_a_right_guess_is_right_on_all_three(self):
        v = self.judge(_guess("Hades", "Tartarus", "Megaera"))
        self.assertEqual((v.game, v.place, v.enemy, v.said_not_sure, v.confident_wrong), ("right", "right", "right", False, False))

    def test_names_and_aliases_count_and_a_longer_name_may_hold_the_label(self):
        v = self.judge(_guess("Hades 1", "somewhere in the Underworld", "the Fury Megaera"))
        self.assertEqual((v.game, v.place, v.enemy), ("right", "right", "right"))

    def test_a_wrong_thing_said_with_confidence_is_wrong_and_counts_against_the_guess(self):
        v = self.judge(_guess("Hollow Knight", "Greenpath", "Hornet"))
        self.assertEqual((v.game, v.place, v.enemy, v.confident_wrong), ("wrong", "wrong", "wrong", True))

    def test_a_game_that_names_two_games_is_wrong(self):
        self.assertEqual(self.judge(_guess("Hades or Hollow Knight")).game, "wrong")

    def test_not_sure_is_unsure_and_never_wrong(self):
        v = self.judge(_guess(not_sure=3))
        self.assertEqual((v.game, v.place, v.enemy, v.said_not_sure, v.confident_wrong), ("unsure", "unsure", "unsure", True, False))

    def test_a_place_or_enemy_the_labels_have_no_answer_for_is_unchecked_not_wrong(self):
        v = self.judge(_guess("Hades", "Tartarus", "a skeleton"), place="", place_aliases=[], boss="", boss_aliases=[])
        self.assertEqual((v.place, v.enemy, v.confident_wrong), ("unchecked", "unchecked", False))

    def test_a_label_the_labeller_marked_low_is_unchecked_too(self):
        v = self.judge(_guess("Hades", "Elysium", "Hades"), confidence={"place": "low", "boss": "low"})
        self.assertEqual((v.place, v.enemy, v.confident_wrong), ("unchecked", "unchecked", False))


class NoteFoundTests(_ScriptCase):
    def test_the_expected_note_or_an_also_note_by_its_exact_name_counts(self):
        pic = self.pic()
        self.assertTrue(self.mod.note_found(["Zagreus", "Megaera"], pic))
        self.assertTrue(self.mod.note_found(["furies"], pic))
        self.assertFalse(self.mod.note_found(["Megaera's Rage", "Tisiphone"], pic))
        self.assertFalse(self.mod.note_found([], pic))

    def test_a_picture_with_no_expected_note_is_never_found(self):
        self.assertFalse(self.mod.note_found(["Megaera"], self.pic(expect_section="", expect_section_also=[])))


class MeasureTests(_ScriptCase):
    def run_measure(self, pics, guesses, found_by_words, models=("small", "big"), samples=1):
        """``guesses``: model -> picture id -> outcome; ``found_by_words``: a function words -> attached names."""
        asked, searched = [], []

        def guess_fn(pic, path, model):
            asked.append((pic.id, model))
            return guesses[model][pic.id]

        def search_fn(pic, words):
            searched.append((pic.id, words))
            return found_by_words(pic, words)

        rows = self.mod.measure_picture_search(
            [(p, Path(f"{p.id}.jpg")) for p in pics], list(models), QUESTIONS, samples,
            guess_fn=guess_fn, search_fn=search_fn, others=OTHERS, join_fn=lambda q, g: f"{q} {g.search_words}".strip())
        return rows, asked, searched

    def test_one_guess_per_picture_model_and_try_and_two_searches_per_question_for_pictures_with_a_note(self):
        with_note = self.pic(id="a")
        without = self.pic(id="b", expect_section="", expect_section_also=[])
        guesses = {m: {"a": _outcome(_guess("Hades", enemy="Megaera")), "b": _outcome(_guess(not_sure=3))} for m in ("small", "big")}
        rows, asked, searched = self.run_measure(
            [with_note, without], guesses, lambda pic, words: ["Megaera"] if "Megaera" in words else [])
        self.assertEqual(len(asked), 4)  # 2 pictures x 2 models
        self.assertEqual(len(rows), 4)
        self.assertEqual(len([s for s in searched if s[0] == "b"]), 0)  # nothing to find, so nothing searched
        # today's search is made once per question, whatever the number of models: 2 questions; plus 2 per model with the guess
        self.assertEqual(len([s for s in searched if s[0] == "a"]), 2 + 2 * 2)
        row = next(r for r in rows if (r.picture_id, r.model) == ("a", "small"))
        self.assertEqual(row.found_today, {q: False for q in QUESTIONS})
        self.assertEqual(row.found_with, {q: True for q in QUESTIONS})
        self.assertEqual(row.words, "Hades Megaera")

    def test_tries_make_more_guesses_and_the_same_today_answer_is_not_searched_again(self):
        pic = self.pic(id="a")
        guesses = {"small": {"a": _outcome(_guess("Hades"))}}
        rows, asked, searched = self.run_measure([pic], guesses, lambda pic, words: [], models=("small",), samples=3)
        self.assertEqual(len(asked), 3)
        self.assertEqual([r.sample for r in rows], [1, 2, 3])
        self.assertEqual(len([s for s in searched if s[1] in QUESTIONS]), 2)

    def test_a_guess_that_failed_or_stopped_searches_with_nothing_added(self):
        pic = self.pic(id="a")
        for status in ("failed", "skipped", "stopped"):
            with self.subTest(status=status):
                guesses = {"small": {"a": _outcome(_guess(), status=status, seconds=60.0)}}
                rows, _, searched = self.run_measure([pic], guesses, lambda p, words: ["Megaera"], models=("small",))
                self.assertEqual(rows[0].status, status)
                self.assertEqual(rows[0].words, "")
                self.assertEqual(rows[0].found_with, rows[0].found_today)
                self.assertIsNone(rows[0].verdict) if status != "written" else None

    def test_every_picture_gets_its_guess_judged_even_without_a_note(self):
        pic = self.pic(id="b", expect_section="", expect_section_also=[])
        guesses = {"small": {"b": _outcome(_guess("Hollow Knight"))}}
        rows, _, _ = self.run_measure([pic], guesses, lambda p, w: [], models=("small",))
        self.assertEqual(rows[0].verdict.game, "wrong")
        self.assertEqual(rows[0].found_today, {})


class FiguresTests(_ScriptCase):
    def row(self, model, found_today, found_with, seconds=3.0, status="written", verdict=None, pid="a"):
        return self.mod.SearchRow(
            picture_id=pid, model=model, sample=1, status=status, seconds=seconds, raw="", words="w", verdict=verdict,
            expect="Megaera", found_today=dict(zip(QUESTIONS, found_today)), found_with=dict(zip(QUESTIONS, found_with)))

    def verdict(self, game="right", place="unsure", enemy="unsure", not_sure=False):
        return self.mod.GuessVerdict(game=game, place=place, enemy=enemy, said_not_sure=not_sure)

    def test_found_counts_are_per_model_and_per_typed_question(self):
        rows = [self.row("m", (False, False), (True, False)), self.row("m", (True, False), (True, True), pid="b"),
                self.row("other", (False, False), (False, False), pid="c")]
        f = self.mod.search_figures(rows, "m", QUESTIONS)
        self.assertEqual(f.with_note, 2)
        self.assertEqual(f.today, {QUESTIONS[0]: 1, QUESTIONS[1]: 0})
        self.assertEqual(f.with_guess, {QUESTIONS[0]: 2, QUESTIONS[1]: 1})

    def test_seconds_are_the_mean_median_and_longest_over_every_call_made(self):
        rows = [self.row("m", (False, False), (False, False), seconds=s, status=st)
                for s, st in ((2.0, "written"), (4.0, "written"), (60.0, "failed"))]
        f = self.mod.search_figures(rows, "m", QUESTIONS)
        self.assertEqual((f.calls, f.failed, f.median_s, f.max_s), (3, 1, 4.0, 60.0))
        self.assertEqual(f.mean_s, 22.0)

    def test_the_guess_table_counts_each_kind_of_result(self):
        rows = [self.row("m", (), (), verdict=self.verdict("right", "wrong", "unsure", True)),
                self.row("m", (), (), verdict=self.verdict("wrong", "unchecked", "unchecked")),
                self.row("m", (), (), status="failed")]
        f = self.mod.search_figures(rows, "m", QUESTIONS)
        self.assertEqual(f.game, {"right": 1, "wrong": 1, "unsure": 0, "unchecked": 0})
        self.assertEqual(f.place["wrong"], 1)
        self.assertEqual(f.place["unchecked"], 1)
        self.assertEqual((f.said_not_sure, f.confident_wrong, f.judged), (1, 2, 2))

    def test_the_landing_rule_needs_twice_as_often_and_under_ten_seconds(self):
        landing = self.mod.landing_verdict
        self.assertEqual(landing(1, 2, 4, 3.0)[:2], (True, True))
        self.assertEqual(landing(2, 3, 4, 3.0)[:2], (False, True))
        self.assertEqual(landing(1, 2, 4, 12.0)[:2], (True, False))
        self.assertEqual(landing(0, 0, 4, 3.0)[:2], (False, True))  # nothing found either way is not "twice as often"
        self.assertEqual(landing(0, 1, 4, 3.0)[:2], (True, True))  # from none to one is more than twice none
        self.assertEqual(landing(0, 0, 0, 3.0)[:2], (False, True))

    def test_the_report_names_both_halves_and_says_too_few_when_there_are_too_few(self):
        rows = [self.row("small", (False, False), (True, False), verdict=self.verdict())]
        report = self.mod.format_search_report({"models": ["small"], "pictures": 1, "samples": 1, "note": "n"}, rows, QUESTIONS)
        self.assertIn("small", report)
        self.assertIn("What should I do here?", report)
        self.assertIn("under ten seconds", report)
        self.assertIn("too few", report.lower())
        self.assertIn("0 of 1", report)  # today's search found the right note in none
        self.assertIn("1 of 1", report)  # with the guess, one

    def test_a_model_that_is_not_installed_is_named_in_the_report(self):
        report = self.mod.format_search_report(
            {"models": ["small"], "missing_models": ["qwen3.5:4b"], "pictures": 1, "samples": 1}, [], QUESTIONS)
        self.assertIn("qwen3.5:4b", report)
        self.assertIn("not installed", report.lower())

    def test_the_reports_file_name_carries_the_day_and_the_label(self):
        self.assertEqual(self.mod.search_report_name("2026-11-10", "p103-p2"), "picture-guess-search-2026-11-10-p103-p2.md")


class RowsFileTests(_ScriptCase):
    def test_every_row_is_saved_in_full_and_read_back_so_a_run_can_be_sliced_by_picture(self):
        verdict = self.mod.GuessVerdict(game="right", place="unsure", enemy="wrong", said_not_sure=True)
        long_reply = "Hollow Knight. " * 80  # the markdown report cuts a reply at 300 characters; the file must not
        rows = [
            self.mod.SearchRow(
                picture_id="a", model="m", sample=2, status="written", seconds=3.5, raw=long_reply, words="Hollow Knight",
                verdict=verdict, expect="False Knight", found_today={QUESTIONS[0]: False, QUESTIONS[1]: True},
                found_with={QUESTIONS[0]: True, QUESTIONS[1]: True}),
            self.mod.SearchRow(
                picture_id="b", model="m", sample=1, status="failed", seconds=60.0, raw="", words="", verdict=None,
                expect="", found_today={}, found_with={}),
        ]
        text = self.mod.search_rows_json(rows)
        self.assertIn(long_reply.strip(), text)
        back = self.mod.search_rows_from_json(text)
        self.assertEqual(back, rows)
        self.assertEqual(self.mod.search_figures(back, "m", QUESTIONS), self.mod.search_figures(rows, "m", QUESTIONS))

    def test_the_rows_file_sits_beside_the_report_with_the_same_name(self):
        self.assertEqual(
            self.mod.search_rows_name("2026-11-11", "p5-run1"), "picture-guess-search-2026-11-11-p5-run1.json")


class ParserTests(_ScriptCase):
    def test_the_flag_and_its_options_exist_with_the_decks_starter_model_and_qwen_by_default(self):
        args = self.mod.build_parser().parse_args(["--picture-search"])
        self.assertTrue(args.picture_search)
        self.assertEqual(args.search_models, "gemma4:e2b-it-qat,qwen3.5:4b")
        self.assertEqual(tuple(args.search_question), ())  # empty means the two built-in typed questions
        self.assertEqual(args.search_samples, 1)

    def test_the_old_measurement_is_still_what_runs_without_the_flag(self):
        self.assertFalse(self.mod.build_parser().parse_args([]).picture_search)


if __name__ == "__main__":
    unittest.main()
