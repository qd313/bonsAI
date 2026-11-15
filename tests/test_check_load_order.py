"""Title: The load-order checker says only what LOOT's list says, in the agreed words

Purpose: Pin scripts/kb/check_load_order.py: a plugin that needs another which is not there, two
plugins marked as not working together that are both switched on, and a plugin told to load after
another that comes after it are each printed in plan 101's words under "LOOT's list of <date> says";
a rule whose condition the script does not read is counted, not guessed; a plugins file is read the
way the game writes it; and the output never calls anything safe or says mods work together.
Used for: check_load_order.py's check, evaluate_condition, parse_plugins and render, and its command
line over the shipped data/kb/load_order files.
Solves: A checker that words a finding as a fact about the person's game, or reads a silent list as
a clean bill of health, would mislead someone about their own mods.
Does not: Test how rules reach the library (test_build_rag_load_order.py) or the reader
(test_rag_corpus_load_order.py).
"""

from __future__ import annotations

import io
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from script_loader import load_script

checker = load_script("check_load_order")

HEADER = {"game": "skyrimse", "commit": "f" * 40, "commit_date": "2026-10-31"}


def _entry(name: str, **lists) -> dict:
    entry = {"name": name, "isPattern": any(c in name for c in ":\\*?|"), "after": [], "requires": [],
             "incompatible": [], "messages": []}
    entry.update(lists)
    return entry


def _run(entries, plugins_text, game="skyrimse"):
    return checker.check({"header": HEADER, "groups": [], "entries": entries}, plugins_text, game)


class WhatTheListSaysTests(unittest.TestCase):
    def test_a_missing_requirement_is_reported_in_the_agreed_words(self):
        report = _run([_entry("Addon.esp", requires=[{"name": "Base.esp"}])], "*Addon.esp\n")
        self.assertEqual(report["findings"], ["Addon.esp needs Base.esp, which I could not find."])

    def test_a_requirement_that_is_listed_but_switched_off_says_so(self):
        report = _run([_entry("Addon.esp", requires=[{"name": "Base.esp"}])], "*Addon.esp\nBase.esp\n")
        self.assertEqual(report["findings"], ["Addon.esp needs Base.esp, which is in your list but switched off."])

    def test_a_requirement_that_is_there_and_on_says_nothing(self):
        report = _run([_entry("Addon.esp", requires=[{"name": "base.ESP"}])], "*Base.esp\n*Addon.esp\n")
        self.assertEqual(report["findings"], [])

    def test_two_plugins_marked_as_not_working_together_and_both_on(self):
        entries = [_entry("A.esp", incompatible=[{"name": "B.esp"}]), _entry("B.esp", incompatible=[{"name": "A.esp"}])]
        report = _run(entries, "*A.esp\n*B.esp\n")
        self.assertEqual(report["findings"], ["A.esp and B.esp are marked as not working together and both are on."])

    def test_a_marked_plugin_that_is_switched_off_or_absent_is_not_reported(self):
        entries = [_entry("A.esp", incompatible=[{"name": "B.esp"}])]
        self.assertEqual(_run(entries, "*A.esp\nB.esp\n")["findings"], [])
        self.assertEqual(_run(entries, "*A.esp\n")["findings"], [])

    def test_a_plugin_that_loads_before_one_it_is_told_to_load_after(self):
        entries = [_entry("Patch.esp", after=[{"name": "Main.esp"}])]
        report = _run(entries, "*Patch.esp\n*Main.esp\n")
        self.assertEqual(report["findings"], ["Patch.esp is told to load after Main.esp but loads before it."])

    def test_a_plugin_in_the_right_place_or_whose_other_is_off_is_not_reported(self):
        entries = [_entry("Patch.esp", after=[{"name": "Main.esp"}])]
        self.assertEqual(_run(entries, "*Main.esp\n*Patch.esp\n")["findings"], [])
        self.assertEqual(_run(entries, "*Patch.esp\nMain.esp\n")["findings"], [])

    def test_a_pattern_entry_applies_to_every_plugin_it_fits(self):
        entries = [_entry("Bashed Patch.*\\.esp", after=[{"name": "Main.esp"}])]
        report = _run(entries, "*Bashed Patch, 0.esp\n*Main.esp\n")
        self.assertEqual(report["findings"], ["Bashed Patch, 0.esp is told to load after Main.esp but loads before it."])

    def test_an_item_that_names_a_pattern_is_met_by_any_plugin_that_fits(self):
        entries = [_entry("A.esp", requires=[{"name": "Lib (One|Two)\\.esp"}])]
        self.assertEqual(_run(entries, "*A.esp\n*Lib Two.esp\n")["findings"], [])
        self.assertEqual(
            _run(entries, "*A.esp\n")["findings"],
            ["A.esp needs a plugin matching Lib (One|Two)\\.esp, which I could not find."],
        )

    def test_a_game_master_the_file_leaves_out_is_not_reported_missing(self):
        report = _run([_entry("Addon.esp", requires=[{"name": "Dawnguard.esm"}])], "*Addon.esp\n")
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["plugin_count"], 1)

    def test_findings_come_in_load_order(self):
        entries = [_entry("B.esp", requires=[{"name": "Gone.esp"}]), _entry("A.esp", requires=[{"name": "Gone2.esp"}])]
        report = _run(entries, "*A.esp\n*B.esp\n")
        self.assertEqual([f.split(" ")[0] for f in report["findings"]], ["A.esp", "B.esp"])


class WhatItDoesNotReadTests(unittest.TestCase):
    def test_a_condition_made_of_active_not_and_or_is_read(self):
        active = ["A.esp", "B.esp"]
        cases = {
            'active("A.esp")': True, 'active("a.ESP")': True, 'active("C.esp")': False,
            'not active("C.esp")': True, 'active("A.esp") and active("C.esp")': False,
            'active("A.esp") or active("C.esp")': True,
            'not (active("C.esp") or active("D.esp")) and active("B.esp")': True,
            'active("[AB]\\.esp")': True,
        }
        for condition, expected in cases.items():
            with self.subTest(condition=condition):
                self.assertIs(checker.evaluate_condition(condition, active), expected)

    def test_a_condition_with_anything_else_is_unreadable(self):
        for condition in ('version("A.esp", >=, "1.0")', 'file("../x.exe")', 'checksum("A.esp", 1)',
                          'active("A.esp") and file("x")', 'active("A.esp"', "active(A.esp)", ""):
            with self.subTest(condition=condition):
                with self.assertRaises(checker._Unreadable):
                    checker.evaluate_condition(condition, ["A.esp"])

    def test_a_rule_whose_condition_is_false_is_skipped_and_not_counted(self):
        entries = [_entry("A.esp", requires=[{"name": "B.esp", "condition": 'active("Other.esp")'}])]
        report = _run(entries, "*A.esp\n")
        self.assertEqual((report["findings"], report["unchecked"]), ([], 0))

    def test_a_rule_whose_condition_is_true_is_applied(self):
        entries = [_entry("A.esp", requires=[{"name": "B.esp", "condition": 'not active("Other.esp")'}])]
        self.assertEqual(_run(entries, "*A.esp\n")["findings"], ["A.esp needs B.esp, which I could not find."])

    def test_unreadable_rules_are_counted_not_guessed(self):
        entries = [_entry(
            "A.esp",
            requires=[
                {"name": "B.esp", "condition": 'version("B.esp", >=, "2")'},  # a condition it does not read
                {"name": "../skse64_loader.exe"},  # a file the plugin list cannot show
                {"name": "C.esp", "constraint": "1.0"},  # a version constraint
            ],
            incompatible=[{"name": "D.esp", "condition": 'file("x.dll")'}],
        )]
        report = _run(entries, "*A.esp\n")
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["unchecked"], 4)

    def test_a_plugin_with_no_entry_is_counted_not_vouched_for(self):
        report = _run([_entry("A.esp", after=[{"name": "X.esp"}])], "*A.esp\n*Mine.esp\nOff.esp\n")
        self.assertEqual((report["plugin_count"], report["no_entry_count"]), (3, 1))


class PluginsFileTests(unittest.TestCase):
    def test_a_star_means_on_and_no_star_means_off_and_comments_are_skipped(self):
        plugins, notes = checker.parse_plugins("﻿# a comment\n*On.esp\nOff.esp\n\n*Also On.esl\n", "fallout4")
        listed = [(p["name"], p["active"]) for p in plugins if p["in_file"]]
        self.assertEqual(listed, [("On.esp", True), ("Off.esp", False), ("Also On.esl", True)])
        self.assertEqual(notes, [])

    def test_the_games_own_masters_come_first_unless_the_file_lists_them(self):
        plugins, _ = checker.parse_plugins("*Mod.esp\n*Dawnguard.esm\n", "skyrimse")
        names = [p["name"] for p in plugins]
        self.assertEqual(names[:4], ["Skyrim.esm", "Update.esm", "HearthFires.esm", "Dragonborn.esm"])
        self.assertEqual(names[4:], ["Mod.esp", "Dawnguard.esm"])

    def test_a_file_with_no_star_at_all_is_read_as_all_on_and_says_so(self):
        plugins, notes = checker.parse_plugins("A.esp\nB.esp\n", "fallout4")
        self.assertTrue(all(p["active"] for p in plugins))
        self.assertEqual(len(notes), 1)
        self.assertIn("No line has a star", notes[0])


class HostileNameTests(unittest.TestCase):
    """A plugins.txt someone sends may carry terminal escape bytes in a name; none may reach the report."""

    ESCAPES = "\x1b[2J\x1b[1A\x07\x08\x9b31m‮ "

    def test_control_characters_are_removed_from_a_name(self):
        plugins, _ = checker.parse_plugins("*Ev" + self.ESCAPES + "il.esp\n", "fallout4")
        self.assertEqual([p["name"] for p in plugins if p["in_file"]], ["Ev[2J[1A31mil.esp"])

    def test_a_line_with_nothing_left_is_skipped(self):
        plugins, _ = checker.parse_plugins("*\x1b\x07\n*‮\n*Good.esp\n", "fallout4")
        self.assertEqual([p["name"] for p in plugins if p["in_file"]], ["Good.esp"])

    def test_a_name_carrying_an_escape_sequence_prints_without_it(self):
        entries = [_entry("Evil[2J[1A.esp", requires=[{"name": "Base.esp"}])]
        text = checker.render(_run(entries, "*Evil\x1b[2J\x1b[1A.esp\n*Other\x07.esp\n"))
        for bad in ("\x1b", "\x07", "\x9b", "‮"):
            self.assertNotIn(bad, text)
        self.assertIn("Evil[2J[1A.esp", text)
        self.assertEqual([c for c in text if ord(c) < 32 and c != "\n"], [])


class WordsAndLimitsTests(unittest.TestCase):
    def _text(self, entries, plugins):
        return checker.render(_run(entries, plugins))

    def test_the_findings_sit_under_the_lists_date_and_the_limits_are_named(self):
        text = self._text([_entry("A.esp", requires=[{"name": "B.esp"}])], "*A.esp\n")
        self.assertIn("LOOT's list of 2026-10-31 says:\n  - A.esp needs B.esp, which I could not find.", text)
        self.assertIn("Rules not checked: 0.", text)
        self.assertIn("Switched-on plugins with no entry in this list: 0.", text)
        self.assertIn("bonsAI has not checked your own game.", text)
        self.assertIn("Skyrim Special Edition: 1 plugin read", text)

    def test_an_empty_result_is_not_called_a_clean_bill_of_health(self):
        text = self._text([_entry("A.esp", requires=[{"name": "B.esp"}])], "*B.esp\n*A.esp\n").lower()
        self.assertIn(
            "loot's list has no rule among the ones checked that applies to your plugins. "
            "that does not mean they work together.",
            text,
        )
        text = text.replace("that does not mean they work together", "")
        for forbidden in ("safe", "no problems", "work together", "works together", "compatible", "all clear", "fine"):
            self.assertNotIn(forbidden, text)

    def test_the_output_never_says_safe_or_that_mods_work_together(self):
        entries = [_entry("A.esp", requires=[{"name": "B.esp"}], incompatible=[{"name": "C.esp"}],
                          after=[{"name": "D.esp"}])]
        text = self._text(entries, "*A.esp\n*C.esp\n*D.esp\n").lower()
        self.assertNotIn("safe", text)
        self.assertNotIn("work together", text.replace("not working together", ""))


class CommandLineTests(unittest.TestCase):
    def _run_cli(self, *args) -> str:
        out = io.StringIO()
        with redirect_stdout(out):
            self.assertEqual(checker.main(list(args)), 0)
        return out.getvalue()

    def test_the_shipped_skyrim_list_gives_all_three_kinds_on_a_sample_file(self):
        sample = "\n".join([
            "# sample, written for this test",
            "*ScriptFixesCompilation.esp",
            "*unofficial skyrim special edition patch.esp",
            "*Requiem.esp",
            "*Adamant.esp",
            "*I4IconAddon.esp",
            "*RaceMenuPlugin.esp",
            "RaceMenu.esp",
            "*MyOwnMod.esp",
            "",
        ])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "plugins.txt"
            path.write_text(sample, encoding="utf-8")
            text = self._run_cli("--game", "skyrimse", "--plugins", str(path))
        self.assertIn("LOOT's list of 2026-10-31 says:", text)
        self.assertIn("I4IconAddon.esp needs SkyUI_SE.esp, which I could not find.", text)
        self.assertIn("RaceMenuPlugin.esp needs RaceMenu.esp, which is in your list but switched off.", text)
        self.assertIn("Requiem.esp and Adamant.esp are marked as not working together and both are on.", text)
        self.assertIn(
            "ScriptFixesCompilation.esp is told to load after unofficial skyrim special edition patch.esp "
            "but loads before it.",
            text,
        )
        self.assertNotIn("safe", text.lower())

    def test_an_unknown_game_or_a_missing_file_stops_with_a_plain_reason(self):
        with self.assertRaises(SystemExit), redirect_stderr(io.StringIO()):
            checker.main(["--game", "starfield", "--plugins", "x.txt"])
        with self.assertRaises(SystemExit) as ctx:
            checker.main(["--game", "skyrimse", "--plugins", str(Path(tempfile.gettempdir()) / "no-such-plugins.txt")])
        self.assertIn("No plugins file", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
