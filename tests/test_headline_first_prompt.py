"""Headline first: every answer opens with one short sentence that carries the point (plan 105, lane P1).

What a person sees: the answer's first sentence tells them the main thing to do or know, in plain words,
so the reply-ready popup over a game (which shows only the first words) is useful by itself. Nothing new
is drawn; only the words the AI is asked to write change. These tests pin the one sentence the AI is told,
where it sits, that it is on every stop of the Reply style slider and in every Ask mode, that the switch
turns it off completely, and that the Default spoiler wording and every other line stay as they were.
"""

import itertools
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.prompts import reply_style_blocks  # noqa: E402
from backend.notes.user_notes_service import save_note  # noqa: E402
from backend.prompts.reply_style_blocks import (  # noqa: E402
    HEADLINE_FIRST_LINE,
    OPENING_NOTE_PHRASES,
    notes_ask_about_the_opening,
)
from spoiler_default_tier_matrix import build_prompt, prompt_cases, sha  # noqa: E402
from test_user_notes_in_ask import _FakePlugin, _ask  # noqa: E402

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
    def test_it_ships_switched_on_as_the_house_style(self):
        # Plan 105: on the answer test it made more first sentences stand alone, but it cost facts kept and let a
        # little of an ending out on story questions; the maintainer chose it as the house style on 2026-11-17,
        # with no setting for it.
        self.assertTrue(reply_style_blocks.HEADLINE_FIRST_ON)
        self.assertIn("HEADLINE FIRST", _prompt("balanced", "speed"))

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


NOTE_FOR_EVERY_GAME = "Give me the full answer, no summary line first"
HEADING = (
    "The person asked bonsAI to remember these. Treat them as true for this chat and never "
    "contradict them:"
)


def _notes(*texts):
    return "\n".join([HEADING, *(f"- {t}" for t in texts)])


class YourNotesDecideTheOpening(unittest.TestCase):
    """Plan 106, lane H1: a person who keeps a note about how answers open gets that, not the house opening.

    On the answer test, asking the AI to choose between the note and this sentence did not work (the note won only
    about one answer in five), and with no sentence at all no answer opened with a one-line summary. So the code
    chooses: when a note picked for the turn asks about how an answer opens or is shaped, the sentence is left out of
    that turn's instruction sheet. Every other turn is exactly as before.
    """

    def _sheet(self, stop, mode, notes):
        return build_prompt(reply_verbosity=stop, ask_mode=mode, user_notes_block=notes)

    def test_the_note_that_asks_for_no_summary_line_removes_the_sentence(self):
        with _switch(True):
            for stop, mode in itertools.product(STOPS, MODES):
                with self.subTest(stop=stop, mode=mode):
                    p = self._sheet(stop, mode, _notes(NOTE_FOR_EVERY_GAME))
                    self.assertNotIn("HEADLINE FIRST", p)
                    self.assertIn(f"- {NOTE_FOR_EVERY_GAME}", p)

    def test_a_note_about_something_else_keeps_it(self):
        with _switch(True):
            for stop, mode in itertools.product(STOPS, MODES):
                with self.subTest(stop=stop, mode=mode):
                    p = self._sheet(stop, mode, _notes("I play on hard mode", "Call me Sam"))
                    self.assertEqual(p.count(HEADLINE_FIRST_LINE), 1)

    def test_no_notes_keeps_it(self):
        with _switch(True):
            for stop, mode in itertools.product(STOPS, MODES):
                with self.subTest(stop=stop, mode=mode):
                    self.assertEqual(self._sheet(stop, mode, "").count(HEADLINE_FIRST_LINE), 1)

    def test_upper_case_and_extra_spaces_still_match(self):
        for text in ("NO  SUMMARY please", "Always   give   the FULL\tANSWER", "tl;dr is not for me", "No TLDR", "Skip the headline"):
            with self.subTest(text=text):
                self.assertTrue(notes_ask_about_the_opening(_notes(text)), text)

    def test_every_phrase_on_the_list_matches_and_only_as_whole_words(self):
        for phrase in OPENING_NOTE_PHRASES:
            with self.subTest(phrase=phrase):
                self.assertTrue(notes_ask_about_the_opening(_notes(f"please, {phrase}, thanks")))
        for text in ("I like summaries", "headlines are fine", "tldrs", "the answerer", "my summarizer app"):
            with self.subTest(text=text):
                self.assertFalse(notes_ask_about_the_opening(_notes(text)), text)

    def test_the_heading_alone_never_counts_and_a_word_in_it_is_not_a_note(self):
        self.assertFalse(notes_ask_about_the_opening(HEADING))
        self.assertFalse(notes_ask_about_the_opening(""))

    def test_with_the_sentence_out_the_sheet_is_exactly_the_switched_off_one(self):
        notes = _notes(NOTE_FOR_EVERY_GAME)
        for stop, mode in itertools.product(STOPS, MODES):
            with self.subTest(stop=stop, mode=mode):
                with _switch(False):
                    off = self._sheet(stop, mode, notes)
                with _switch(True):
                    on = self._sheet(stop, mode, notes)
                self.assertEqual(on, off)

    def test_a_whole_question_with_the_every_game_note_is_asked_without_the_sentence(self):
        # The nearest test to the Deck check: the instruction sheet the AI is really handed for a question asked
        # with a saved note (what the answer then looks like needs the model; the answer test on the PC measures it).
        with tempfile.TemporaryDirectory() as tmp:
            save_note(tmp, {"text": NOTE_FOR_EVERY_GAME}, now_seconds=1_760_000_000.0)
            plugin = _FakePlugin(tmp)
            _ask(plugin, app_id="620", app_name="Portal 2")
            sheet = plugin.sheets[0]
        self.assertIn(f"- {NOTE_FOR_EVERY_GAME}", sheet)
        self.assertNotIn("HEADLINE FIRST", sheet)

    def test_a_note_switched_off_or_for_another_game_leaves_the_sentence_in(self):
        with tempfile.TemporaryDirectory() as tmp:
            off = save_note(tmp, {"text": NOTE_FOR_EVERY_GAME}, now_seconds=1_760_000_000.0)
            save_note(tmp, {"id": off["id"], "on": False})
            save_note(tmp, {"text": "no summary please", "app_id": "1145360", "game_title": "Hades"},
                      now_seconds=1_760_000_010.0)
            plugin = _FakePlugin(tmp)
            _ask(plugin, app_id="620", app_name="Portal 2")
            sheet = plugin.sheets[0]
        self.assertNotIn("no summary please", sheet)
        self.assertNotIn(NOTE_FOR_EVERY_GAME, sheet)
        self.assertEqual(sheet.count(HEADLINE_FIRST_LINE), 1)


if __name__ == "__main__":
    unittest.main()
