"""Title: Screenshot reading eval tests

Purpose: Pin the parts of scripts/kb/eval_screenshot_reading.py that need no live AI: the labels file
         loader, finding a picture on disk, the reply reader (right game, right area, right boss, "said it
         did not know", a reply naming two games), the per-hundred figures and the report text.
Used for: scripts/kb/eval_screenshot_reading.py and tests/fixtures/screenshot_eval_v0.json.
Solves: A reader that marks a wrong answer right would make every figure of the measurement look better than
        the AI is, and nothing else in the repo would notice.
Does not: Start Ollama, open a picture or touch the Deck.
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))

LABELS = REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v0.json"
OTHERS = ["Hades", "Vampire Survivors", "Deep Rock Galactic", "Hollow Knight"]


def _pic(mod, **overrides):
    base = dict(
        id="p1",
        file="p1.png",
        path="",
        game="Deep Rock Galactic: Survivor",
        game_aliases=["Deep Rock Galactic Survivor", "DRG Survivor"],
        scene="title",
        boss="",
        boss_aliases=[],
        running_game_known=True,
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        scene_words=[],
    )
    base.update(overrides)
    return mod.Picture(**base)


class _ScriptCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_script("eval_screenshot_reading", register=True)

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("eval_screenshot_reading", None)


class ScreenshotReplyReaderTests(_ScriptCase):
    def read(self, reply, **pic_overrides):
        return self.mod.read_reply(reply, _pic(self.mod, **pic_overrides), OTHERS)

    def test_a_right_game_and_scene_is_marked_right(self):
        v = self.read("This is the title screen of Deep Rock Galactic: Survivor. No boss is visible.")
        self.assertTrue(v.game)
        self.assertTrue(v.area)
        self.assertIsNone(v.boss)  # no boss labelled: not counted either way
        self.assertFalse(v.said_unknown)
        self.assertEqual(v.other_games, [])

    def test_a_wrong_game_is_marked_wrong_and_named(self):
        v = self.read("This looks like Hades, on the title screen.")
        self.assertFalse(v.game)
        self.assertEqual(v.other_games, ["Hades"])

    def test_a_not_sure_reply_is_its_own_result_and_not_a_right_game(self):
        v = self.read("I'm not sure which game this is, but it looks like a title screen.")
        self.assertTrue(v.said_unknown)
        self.assertFalse(v.game)
        self.assertTrue(v.area)

    def test_a_reply_naming_two_games_is_not_a_right_game(self):
        v = self.read("It could be Deep Rock Galactic: Survivor, or maybe Vampire Survivors, on the title screen.")
        self.assertFalse(v.game)
        self.assertEqual(v.other_games, ["Vampire Survivors"])

    def test_the_base_game_name_alone_is_a_different_game(self):
        v = self.read("This is Deep Rock Galactic, on the title screen.")
        self.assertFalse(v.game)
        self.assertEqual(v.other_games, ["Deep Rock Galactic"])

    def test_an_alias_and_punctuation_still_count(self):
        v = self.read("**DRG Survivor** - the title screen.")
        self.assertTrue(v.game)

    def test_the_wrong_scene_is_not_the_right_area(self):
        v = self.read("This is the main menu of Deep Rock Galactic: Survivor.")
        self.assertTrue(v.game)
        self.assertFalse(v.area)

    def test_a_menu_picture_needs_menu_words(self):
        v = self.read("The main menu of Deep Rock Galactic: Survivor.", scene="menu")
        self.assertTrue(v.area)

    def test_scene_words_on_the_picture_replace_the_default_list(self):
        v = self.read("A gloomy cavern.", scene="other", scene_words=["cavern"])
        self.assertTrue(v.area)
        v = self.read("A gloomy cavern.", scene="other")
        self.assertIsNone(v.area)  # a scene with no words to look for is not scored

    def test_a_right_boss_needs_the_boss_or_an_alias(self):
        kw = dict(boss="Glyphid Dreadnought", boss_aliases=["Dreadnought"])
        self.assertTrue(self.read("A Dreadnought is charging you.", **kw).boss)
        self.assertFalse(self.read("A big bug is charging you.", **kw).boss)

    def test_an_empty_reply_is_wrong_everywhere_and_not_unknown(self):
        v = self.read("", boss="Glyphid Dreadnought")
        self.assertFalse(v.game)
        self.assertFalse(v.area)
        self.assertFalse(v.boss)
        self.assertFalse(v.said_unknown)

    def test_a_word_inside_a_longer_word_is_not_a_game(self):
        v = self.read("This is the title screen. Hadestown is a musical.")
        self.assertEqual(v.other_games, [])  # "Hades" inside "Hadestown" is not the game


class ScreenshotFiguresTests(_ScriptCase):
    def _run(self, arm, game, area, boss, unknown, first=None, success=True):
        v = self.mod.Verdict(game=game, area=area, boss=boss, said_unknown=unknown, other_games=[])
        return self.mod.Run(
            picture_id="p", arm=arm, sample=1, model="m", reply="r", verdict=v,
            first_word_s=first, total_s=1.0, success=success, error="",
        )

    def test_figures_are_out_of_a_hundred_per_arm(self):
        runs = [
            self._run("known", True, True, None, False, 2.0),
            self._run("known", True, False, None, False, 4.0),
            self._run("known", False, False, None, True, None),
            self._run("known", True, True, None, False, 3.0),
            self._run("unknown", False, True, None, True, 5.0),
        ]
        f = self.mod.summarize(runs)
        known = f["known"]
        self.assertEqual(known.n, 4)
        self.assertEqual(known.game, 75)
        self.assertEqual(known.area, 50)
        self.assertEqual(known.said_unknown, 25)
        self.assertEqual(known.first_word_s, 3.0)  # only replies that had a first word
        self.assertEqual(f["unknown"].game, 0)
        self.assertEqual(f["unknown"].said_unknown, 100)

    def test_boss_figure_counts_only_pictures_with_a_boss(self):
        runs = [
            self._run("known", True, True, True, False),
            self._run("known", True, True, False, False),
            self._run("known", True, True, None, False),
        ]
        known = self.mod.summarize(runs)["known"]
        self.assertEqual(known.boss_n, 2)
        self.assertEqual(known.boss, 50)

    def test_a_boss_figure_with_no_boss_pictures_is_none_not_zero(self):
        known = self.mod.summarize([self._run("known", True, True, None, False)])["known"]
        self.assertIsNone(known.boss)

    def test_a_failed_ask_counts_as_wrong_not_as_missing(self):
        runs = [self._run("known", False, False, False, False, success=False)]
        known = self.mod.summarize(runs)["known"]
        self.assertEqual(known.n, 1)
        self.assertEqual(known.failed, 1)
        self.assertEqual(known.game, 0)

    def test_the_report_names_the_model_and_the_four_figures(self):
        runs = [self._run("known", True, True, None, False, 2.5)]
        text = self.mod.format_report({"model": "gemma4:e2b-it-qat", "samples": 1, "pictures": 1}, runs)
        self.assertIn("gemma4:e2b-it-qat", text)
        self.assertIn("named the game", text)
        self.assertIn("named the area", text)
        self.assertIn("named the boss", text)
        self.assertIn("said it did not know", text)
        self.assertIn("2.5", text)


class ScreenshotLabelsTests(_ScriptCase):
    def test_the_shipped_labels_file_loads(self):
        pics = self.mod.load_pictures(LABELS, None)
        self.assertGreaterEqual(len(pics), 3)
        self.assertEqual(len({p.id for p in pics}), len(pics))
        for p in pics:
            self.assertIn(p.scene, self.mod.SCENES)
            self.assertTrue(p.game)
            if p.running_game_known:
                self.assertTrue(p.app_id, p.id)

    def test_only_picks_pictures_by_id_and_an_unknown_id_stops_the_run(self):
        first = self.mod.load_pictures(LABELS, None)[0]
        self.assertEqual([p.id for p in self.mod.load_pictures(LABELS, {first.id})], [first.id])
        with self.assertRaises(SystemExit):
            self.mod.load_pictures(LABELS, {"no-such-picture"})

    def test_a_scene_outside_the_list_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "labels.json"
            bad.write_text(json.dumps({"pictures": [{"id": "x", "file": "x.png", "game": "G", "scene": "cutscene"}]}))
            with self.assertRaises(SystemExit):
                self.mod.load_pictures(bad, None)

    def test_a_known_game_picture_without_an_app_id_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "labels.json"
            bad.write_text(json.dumps({"pictures": [
                {"id": "x", "file": "x.png", "game": "G", "scene": "title", "running_game_known": True}]}))
            with self.assertRaises(SystemExit):
                self.mod.load_pictures(bad, None)

    def test_an_absolute_path_wins_and_a_name_is_looked_for_in_each_root(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            (Path(b) / "shot.png").write_bytes(b"x")
            by_name = _pic(self.mod, file="shot.png")
            self.assertEqual(self.mod.resolve_picture(by_name, [Path(a), Path(b)]), Path(b) / "shot.png")
            self.assertIsNone(self.mod.resolve_picture(by_name, [Path(a)]))
            absolute = _pic(self.mod, file="elsewhere.png", path=str(Path(b) / "shot.png"))
            self.assertEqual(self.mod.resolve_picture(absolute, [Path(a)]), Path(b) / "shot.png")


if __name__ == "__main__":
    unittest.main()
