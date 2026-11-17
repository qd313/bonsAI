"""Headline first: every answer opens with one short sentence that carries the point (plan 105, lane P1).

What a person sees: the answer's first sentence tells them the main thing to do or know, in plain words,
so the reply-ready popup over a game (which shows only the first words) is useful by itself. Nothing new
is drawn; only the words the AI is asked to write change. These tests pin the one sentence the AI is told,
where it sits, that it is on every stop of the Reply style slider and in every Ask mode, that the switch
turns it off completely, and that the Default spoiler wording and every other line stay as they were.
"""

import itertools
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.prompts import reply_style_blocks  # noqa: E402
from backend.prompts.reply_style_blocks import HEADLINE_FIRST_LINE  # noqa: E402
from spoiler_default_tier_matrix import build_prompt, prompt_cases, sha  # noqa: E402

GOLDEN = json.loads(
    (Path(__file__).parent / "fixtures" / "spoiler_default_tier_golden.json").read_text(encoding="utf-8")
)
CLAUSE_PARAGRAPH = f"\n\n{HEADLINE_FIRST_LINE}\n"
STOPS = ("balanced", "caveman", "detailed", "terse")
MODES = ("speed", "strategy", "expert")
STYLE_HEADINGS = {"caveman": "CAVEMAN REPLY STYLE", "detailed": "DETAILED REPLY STYLE", "terse": "TERSE REPLY MODE"}


def _switch(on):
    return patch.object(reply_style_blocks, "HEADLINE_FIRST_ON", on)


def _prompt(stop, mode, question="how do i beat megaera"):
    return build_prompt(reply_verbosity=stop, ask_mode=mode, question=question)


class TheSentenceTheAiIsTold(unittest.TestCase):
    def test_it_asks_for_one_short_sentence_that_stands_alone_and_gives_nothing_away(self):
        line = HEADLINE_FIRST_LINE
        self.assertIn("one short sentence", line)
        self.assertIn("main thing to do or know", line)
        self.assertIn("all they read", line)
        self.assertIn("keeping every detail from the notes", line)
        self.assertIn("no spoiler, late boss or ending", line)
        self.assertEqual(line.count("."), 1, "a clause is one sentence")
        self.assertNotIn("bold", line.lower(), "plain text, nothing drawn differently")


class WhereItGoes(unittest.TestCase):
    def test_switched_on_it_is_in_every_stop_and_every_ask_mode_exactly_once(self):
        with _switch(True):
            for stop, mode in itertools.product(STOPS, MODES):
                with self.subTest(stop=stop, mode=mode):
                    self.assertEqual(_prompt(stop, mode).count(HEADLINE_FIRST_LINE), 1)

    def test_it_comes_before_the_reply_style_block_so_a_menu_stays_the_last_thing_asked_for(self):
        with _switch(True):
            for stop, heading in STYLE_HEADINGS.items():
                for mode in MODES:
                    with self.subTest(stop=stop, mode=mode):
                        p = _prompt(stop, mode)
                        self.assertLess(p.index(HEADLINE_FIRST_LINE), p.index(heading))

    def test_it_is_also_on_a_follow_up_turn(self):
        with _switch(True):
            p = _prompt("terse", "strategy", question="[Strategy follow-up] I'm at: Weak points.\nEarlier I asked: x")
            self.assertEqual(p.count(HEADLINE_FIRST_LINE), 1)


class TheSwitch(unittest.TestCase):
    def test_it_lands_switched_off_until_the_maintainer_decides(self):
        # Plan 105: on the answer test it made more first sentences stand alone, but it cost facts kept and let a
        # little of an ending out on story questions, so the call is the maintainer's (numbers in the commit message).
        self.assertFalse(reply_style_blocks.HEADLINE_FIRST_ON)
        self.assertNotIn("HEADLINE FIRST", _prompt("balanced", "speed"))

    def test_switched_off_the_clause_is_nowhere(self):
        with _switch(False):
            for stop, mode in itertools.product(STOPS, MODES):
                with self.subTest(stop=stop, mode=mode):
                    self.assertNotIn("HEADLINE FIRST", _prompt(stop, mode))

    def test_switched_on_the_clause_is_the_only_difference(self):
        for stop, mode in itertools.product(STOPS, MODES):
            with self.subTest(stop=stop, mode=mode):
                with _switch(False):
                    off = _prompt(stop, mode)
                with _switch(True):
                    on = _prompt(stop, mode)
                self.assertEqual(on.replace(CLAUSE_PARAGRAPH, "", 1), off)
                self.assertGreater(len(on), len(off))

    def test_the_block_is_empty_when_off_and_one_paragraph_when_on(self):
        with _switch(False):
            self.assertEqual(reply_style_blocks.build_headline_first_block(), "")
        with _switch(True):
            block = reply_style_blocks.build_headline_first_block()
            self.assertTrue(block.startswith("\n\n"))
            self.assertIn(HEADLINE_FIRST_LINE, block)


class NothingElseMoves(unittest.TestCase):
    def test_taking_the_clause_out_leaves_every_saved_whole_prompt_as_it_was_on_the_tip(self):
        # The saved fingerprints hold the Default spoiler wording byte for byte; the clause is the only addition.
        with _switch(True):
            for name, kw in prompt_cases():
                with self.subTest(case=name):
                    p = build_prompt(**kw).replace(CLAUSE_PARAGRAPH, "", 1)
                    self.assertEqual(sha(p), GOLDEN["prompt_sha256"][name])


if __name__ == "__main__":
    unittest.main()
