"""Title: Screenshot reading eval tests

Purpose: Pin the parts of scripts/kb/eval_screenshot_reading.py that need no live AI: the labels file
         loader, finding a picture on disk, the reply reader (right game, right area, right boss, "said it
         did not know", a reply naming two games), the per-hundred figures and the report text.
Used for: scripts/kb/eval_screenshot_reading.py and tests/fixtures/screenshot_eval_v0.json.
Solves: A reader that marks a wrong answer right would make every figure of the measurement look better than
        the AI is, and nothing else in the repo would notice.
Does not: Start Ollama, open a picture or touch the Deck.
"""

import asyncio
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

    def test_not_knowing_the_boss_is_not_not_knowing_the_game(self):
        # Seen in the first real run: every title-screen reply said it could not name a boss, and each one
        # was marked "did not know" even though it had just named the game.
        v = self.read("This is Deep Rock Galactic: Survivor. I cannot identify any specific boss or enemy on screen.")
        self.assertFalse(v.said_unknown)
        self.assertTrue(v.game)

    def test_cannot_name_the_game_with_certainty_is_did_not_know(self):
        v = self.read("The image shows a rocky place. I cannot definitively name the game with confidence. "
                      "Regarding bosses, I cannot name any.")
        self.assertTrue(v.said_unknown)

    def test_not_being_sure_of_the_scene_is_not_not_knowing_the_game(self):
        v = self.read("This is Deep Rock Galactic: Survivor. I cannot tell whether this is a title screen.")
        self.assertFalse(v.said_unknown)

    def test_a_bare_i_dont_know_is_did_not_know(self):
        self.assertTrue(self.read("I don't know.").said_unknown)

    def test_a_reply_naming_two_games_is_not_a_right_game(self):
        v = self.read("It could be Deep Rock Galactic: Survivor, or maybe Vampire Survivors, on the title screen.")
        self.assertFalse(v.game)
        self.assertEqual(v.other_games, ["Vampire Survivors"])

    def test_the_base_game_name_alone_is_a_different_game(self):
        v = self.read("This is Deep Rock Galactic, on the title screen.")
        self.assertFalse(v.game)
        self.assertEqual(v.other_games, ["Deep Rock Galactic"])

    def test_the_short_form_of_the_right_game_after_its_full_name_is_not_a_second_game(self):
        # Seen in the first real run: "the title Deep Rock Galactic Survivor ... likely the game Deep Rock Galactic".
        v = self.read("The title says Deep Rock Galactic Survivor, so this is likely Deep Rock Galactic. Title screen.")
        self.assertTrue(v.game)
        self.assertEqual(v.other_games, [])

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

    def test_a_menu_picture_accepts_the_menu_by_its_buttons_but_not_a_pause_menu(self):
        # Seen in the first real run: replies on the main menu named its PLAY / UPGRADES buttons and its
        # user interface without ever saying "main menu".
        ok = self.read("Deep Rock Galactic: Survivor. I can see the game's user interface with PLAY buttons.",
                       scene="menu")
        self.assertTrue(ok.area)
        paused = self.read("Deep Rock Galactic: Survivor, on the pause menu.", scene="menu")
        self.assertFalse(paused.area)

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

    def test_every_picture_carries_the_librarys_own_app_id_unless_marked_as_not_in_the_library(self):
        seed = json.loads((REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8"))
        ids = {g["canonical_title"]: str(g["app_id"] or "") for g in seed["games"]}
        rows = json.loads(LABELS.read_text(encoding="utf-8"))["pictures"]
        by_id = {p.id: p for p in self.mod.load_pictures(LABELS, None)}
        for row in rows:
            pic = by_id[row["id"]]
            if row.get("in_library") is False:
                self.assertNotIn(pic.game, ids, pic.id)  # marked as not held, so it must really be absent
                self.assertTrue(pic.app_id, pic.id)  # and still carry its Steam id
            else:
                self.assertEqual(pic.app_id, ids.get(pic.game), pic.id)

    def test_no_two_pictures_share_a_file(self):
        files = [p.file for p in self.mod.load_pictures(LABELS, None)]
        self.assertEqual(len(files), len(set(files)))

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


class _FakePlugin:
    """Just the two hooks the real ask path calls on the plugin that this eval watches."""

    def __init__(self):
        self.partial_calls = []

    def _update_partial_response(self, request_id, text, done, thinking_summary=None, **kwargs):
        self.partial_calls.append((request_id, text, done))


class ScreenshotAskTests(_ScriptCase):
    def _fake_ask(self, calls, reply="This is the title screen of Deep Rock Galactic: Survivor.", success=True,
                  stream=True, answered_by="gemma4:e2b-it-qat"):
        async def fake(plugin, question, pc_ip, app_id="", app_name="", attachments=None, ask_mode="speed",
                       spoiler_consent=False, token_stream_request_id=None, **kwargs):
            calls.append(dict(question=question, app_id=app_id, app_name=app_name, attachments=attachments,
                              ask_mode=ask_mode, rid=token_stream_request_id))
            # Well clear of 0.05: the first-word time is rounded to 0.1 s, and Windows' timer can wake a sleep a few
            # milliseconds early, so 0.05 sometimes measured 0.049 and rounded to 0.0 (failed twice on 2026-10-25).
            await asyncio.sleep(0.15)
            if stream and success:
                plugin._update_partial_response(token_stream_request_id, reply, False)
            await asyncio.sleep(0.3)
            if hasattr(plugin, "_persist_input_transparency"):
                await plugin._persist_input_transparency({"ask_diagnostics": {"model_succeeded": answered_by}})
            return {"success": success, "response": reply if success else "The AI is not set up."}
        return fake

    def _ask(self, arm, pic=None, **fake_kwargs):
        calls = []
        pic = pic or _pic(self.mod)
        plugin = _FakePlugin()
        run = asyncio.run(self.mod.ask_picture(
            plugin, pic, Path("C:/pics/a.png"), arm, question="Q?", ollama_base="http://x", sample=2,
            model="gemma4:e2b-it-qat", other_games=OTHERS, run_game_ai_request=self._fake_ask(calls, **fake_kwargs),
        ))
        return run, calls, plugin

    def test_the_picture_goes_with_the_question_and_the_game_only_in_the_known_way_of_asking(self):
        _, known_calls, _ = self._ask("known")
        _, unknown_calls, _ = self._ask("unknown")
        k, u = known_calls[0], unknown_calls[0]
        self.assertEqual(k["attachments"][0]["path"], str(Path("C:/pics/a.png")))
        self.assertEqual((k["app_id"], k["app_name"]), ("2321470", "Deep Rock Galactic: Survivor"))
        self.assertEqual(u["attachments"][0]["path"], k["attachments"][0]["path"])
        self.assertEqual((u["app_id"], u["app_name"]), ("", ""))
        self.assertEqual(k["question"], "Q?")
        self.assertIsInstance(k["rid"], int)  # streaming on, so the first word can be timed

    def test_the_first_word_time_is_when_the_first_answer_text_arrived(self):
        run, _, plugin = self._ask("known")
        self.assertIsNotNone(run.first_word_s)
        self.assertLess(run.first_word_s, run.total_s)
        self.assertGreater(run.first_word_s, 0.0)
        self.assertEqual(plugin.partial_calls[0][1], run.reply)  # the real hook still got the text

    def test_a_reply_that_never_streamed_has_no_first_word_time(self):
        run, _, _ = self._ask("known", stream=False)
        self.assertIsNone(run.first_word_s)

    def test_the_reply_is_read_and_the_answering_model_is_recorded(self):
        run, _, _ = self._ask("known", answered_by="llava:7b")
        self.assertTrue(run.verdict.game)
        self.assertTrue(run.verdict.area)
        self.assertEqual(run.model, "llava:7b")
        self.assertEqual((run.arm, run.sample, run.picture_id), ("known", 2, "p1"))

    def test_a_failed_ask_is_a_run_with_no_reply_and_nothing_right(self):
        run, _, _ = self._ask("known", success=False)
        self.assertFalse(run.success)
        self.assertFalse(run.verdict.game)
        self.assertEqual(run.reply, "")

    def test_the_hook_on_the_plugin_is_put_back_after_the_ask(self):
        calls = []
        plugin = _FakePlugin()
        before = plugin._update_partial_response
        asyncio.run(self.mod.ask_picture(
            plugin, _pic(self.mod), Path("a.png"), "known", question="Q?", ollama_base="http://x", sample=1,
            model="m", other_games=OTHERS, run_game_ai_request=self._fake_ask(calls)))
        self.assertEqual(plugin._update_partial_response, before)

    def test_the_settings_let_the_picture_through_and_send_it_to_the_chosen_model(self):
        s = self.mod.picture_settings({"text_model_routing_order": ["x"], "capabilities": {}}, "gemma4:e4b-it-qat")
        self.assertIs(s["capabilities"]["media_library_access"], True)
        self.assertEqual(s["vision_model_routing_order"], ["gemma4:e4b-it-qat"])
        self.assertEqual(s["text_model_routing_order"], ["gemma4:e4b-it-qat"])

    def test_the_report_warns_when_another_model_answered(self):
        run, _, _ = self._ask("known", answered_by="llava:7b")
        text = self.mod.format_report({"model": "gemma4:e2b-it-qat", "samples": 1, "pictures": 1}, [run])
        self.assertIn("answered by another model", text)
        self.assertIn("llava:7b", text)

    def test_the_other_games_list_holds_the_library_titles_and_the_labelled_games(self):
        pics = self.mod.load_pictures(LABELS, None)
        names = self.mod.other_game_names(pics)
        self.assertIn("Deep Rock Galactic", names)  # the part before the colon, so the base game counts as another game
        self.assertIn("Hades", names)  # a title from the library
        self.assertIn("Vampire Survivors", names)  # a look-alike added by hand


if __name__ == "__main__":
    unittest.main()
