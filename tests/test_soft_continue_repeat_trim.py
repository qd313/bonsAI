"""A long answer cut by its length limit, then continued: text the model writes again is kept once.

Found 2026-10-08 on the Deck (plan 83, row P81-CONTINUE-ONE-MARK, evidence
docs/test-evidence/plan83-P81-CONTINUE-ONE-MARK.json): with the Strategy limit at 340, a guide was
continued twice and its saved text (4067 characters in 4 pieces) held the same paragraphs twice, the
third piece repeating a long stretch of the second word for word and the fourth repeating it again;
a second answer repeated one sentence at its one join, the sentence cut at the end of piece 1 and
started again at piece 2. (The evidence file describes the repeat but does not hold the text, so the
paragraphs below are written to the described shape. Both shapes the model could take are covered:
a restated tail, and a stretch restated from the middle.)

The answer tests run the real answer call (post_ollama_chat, fed a fake multi-piece stream), then
the real chat save, and read the saved answer back, which is what the Deck check looks at. The
trim function itself is also tested on its own, for the small rules.
"""

from __future__ import annotations

import shutil
import tempfile
import unittest
from unittest.mock import patch

import test_soft_continue_spoiler_join as hidden_block_join_tests

from backend.services.ollama_ask_budgets import reset_thinking_support_cache
from backend.services.soft_continue_repeat_trim import (
    MIN_REPEAT_CHARS,
    join_continued_piece,
    trim_repeated_start,
)

F = "`" * 3
OPEN = f"{F}bonsai-spoiler"

# A guide written the way the Deck's model writes one: short paragraphs, each a sentence or two.
P1 = "Hollow Knight has many areas, and each one has a boss. Here is the road in order."
P2 = "Forgotten Crossroads is the first real area. Its boss, the False Knight, hits hard but is slow."
P3 = "Greenpath is full of moss and acid pools. Its boss, Hornet, is quick, so keep your distance."
P4 = "City of Tears is rainy and tall. Its boss, the Soul Master, teleports around the arena."
P5 = "Crystal Peak is a climb through glowing mines. Its boss, the Crystal Guardian, rests on a bench."
P6 = "Deepnest is dark and full of spiders. Its boss, Nosk, copies the look of other creatures."
P7 = "Kingdom's Edge sits at the far side of the world. Its boss, Hive Knight, calls bees to help."
P8 = "Fog Canyon floats above acid. Its boss, the Uumuu, is a big jellyfish with a shocking attack."


def _paragraphs(*items: str) -> str:
    return "\n\n".join(items)


class SavedAnswerAfterAContinuedAnswerRestatesTextTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_thinking_support_cache()
        self.settings_dir = tempfile.mkdtemp(prefix="p87b5-")
        self.addCleanup(shutil.rmtree, self.settings_dir, True)
        # Publish every partial parse, so the screen's updates are all seen.
        parse_gap = patch("backend.services.ollama_chat_stream.OLLAMA_DELTA_PARSE_INTERVAL_S", 0.0)
        parse_gap.start()
        self.addCleanup(parse_gap.stop)

    # The same real answer call, cover and chat save the hidden-block join tests use.
    _saved_answer = hidden_block_join_tests.SavedAnswerAfterACutInsideAHiddenBlockTests._saved_answer

    def _assert_each_once(self, saved: str, *items: str) -> None:
        for item in items:
            self.assertEqual(saved.count(item), 1, f"{item!r} x{saved.count(item)} in {saved!r}")

    # -- the shape on the Deck: a long stretch of the last piece, written again ------------------

    def test_a_long_stretch_of_the_last_piece_written_again_is_saved_once(self) -> None:
        # Piece 3 starts again at the middle of piece 2 and runs on through its end, then goes on.
        piece1 = _paragraphs(P1, P2)
        piece2 = "\n\n" + _paragraphs(P3, P4, P5)
        piece3 = _paragraphs(P4, P5, P6)
        saved, _ = self._saved_answer(piece1, piece2, piece3)
        self._assert_each_once(saved, P1, P2, P3, P4, P5, P6)
        self.assertEqual(saved, _paragraphs(P1, P2, P3, P4, P5, P6))

    def test_the_same_stretch_written_again_at_both_joins_is_saved_once(self) -> None:
        # Continued twice (the most the plugin allows), and each new piece writes again a stretch
        # that is already there: the second from the tail of the first, the third from the middle.
        piece1 = _paragraphs(P1, P2, P3)
        piece2 = _paragraphs(P2, P3, P4, P5)
        piece3 = _paragraphs(P3, P4, P5, P6, P7)
        saved, _ = self._saved_answer(piece1, piece2, piece3)
        self._assert_each_once(saved, P1, P2, P3, P4, P5, P6, P7)
        self.assertEqual(saved, _paragraphs(P1, P2, P3, P4, P5, P6, P7))

    def test_a_stretch_from_the_middle_that_stops_before_the_end_is_saved_once(self) -> None:
        # The restated stretch is not the tail: the model goes back to piece 2's middle, stops
        # after two paragraphs, and writes new ones.
        piece1 = _paragraphs(P1, P2)
        piece2 = "\n\n" + _paragraphs(P3, P4, P5)
        piece3 = _paragraphs(P3, P4, P6, P7)
        saved, _ = self._saved_answer(piece1, piece2, piece3)
        self._assert_each_once(saved, P3, P4)
        self.assertIn(P6, saved)
        self.assertIn(P7, saved)

    def test_the_same_restated_words_with_other_line_breaks_are_saved_once(self) -> None:
        piece1 = _paragraphs(P1, P2, P3)
        piece3 = P3.replace(". ", ".\n") + "\n\n\n" + P4
        saved, _ = self._saved_answer(piece1, piece3)
        self.assertEqual(saved.count("Greenpath is full of moss"), 1, saved)
        self.assertIn(P4, saved)

    # -- the other shape: a sentence cut at the join and started again ---------------------------

    def test_a_cut_sentence_started_again_is_saved_once(self) -> None:
        first = "Act One ends at the Warden. And finally, Act Three, the last act, opens in the Styx"
        full = "And finally, Act Three, the last act, opens in the Styx river with Charon."
        saved, _ = self._saved_answer(first, full)
        self.assertEqual(saved.count("And finally, Act Three"), 1, saved)
        self.assertEqual(saved, "Act One ends at the Warden. And finally, Act Three, the last act, opens in the Styx river with Charon.")

    def test_a_sentence_cut_inside_a_word_and_started_again_is_saved_once(self) -> None:
        saved, _ = self._saved_answer(
            "First comes the Warden fight. And finally, Act Thr",
            "And finally, Act Three begins in the Styx.",
        )
        self.assertEqual(saved, "First comes the Warden fight. And finally, Act Three begins in the Styx.")

    # -- nothing is trimmed from a clean join ---------------------------------------------------

    def test_a_clean_join_keeps_every_character(self) -> None:
        pieces = (_paragraphs(P1, P2), "\n\n" + _paragraphs(P3, P4), "\n\n" + _paragraphs(P5, P6))
        saved, _ = self._saved_answer(*pieces)
        self.assertEqual(saved, "".join(pieces).strip())

    def test_a_piece_that_starts_with_a_few_words_the_answer_already_used_is_kept(self) -> None:
        # Short common openings ("Its boss, the") are not a restatement.
        pieces = (_paragraphs(P1, P2) + "\n\n", "Its boss, the Soul Master, is fast. " + P5)
        saved, _ = self._saved_answer(*pieces)
        self.assertEqual(saved, "".join(pieces).strip())

    def test_a_clean_join_with_status_lines_keeps_every_character(self) -> None:
        saved, _ = self._saved_answer(
            "<bonsai-status>Writing the guide</bonsai-status>\n" + _paragraphs(P1, P2),
            "<bonsai-status>Continuing the guide</bonsai-status>\n\n\n" + _paragraphs(P3, P4),
        )
        self.assertEqual(saved, _paragraphs(P1, P2, P3, P4))

    # -- code blocks and hidden blocks ----------------------------------------------------------

    def test_a_repeat_inside_a_code_block_is_kept(self) -> None:
        code_line = "set_value(player, 'health', get_value(player, 'health') + 25)"
        first = f"Here is the script:\n\n{F}lua\n{code_line}\n"
        second = f"{code_line}\n{F}\n\nRun it once."
        saved, _ = self._saved_answer(first, second)
        self.assertEqual(saved.count(code_line), 2, saved)
        self.assertEqual(saved, first + second)

    def test_a_whole_code_block_written_again_is_kept(self) -> None:
        block = f"{F}lua\nset_value(player, 'health', get_value(player, 'health') + 25)\n{F}"
        first = f"Here is the script:\n\n{block}\n\n"
        second = f"{block}\n\nRun it once."
        saved, _ = self._saved_answer(first, second)
        self.assertEqual(saved.count("set_value(player"), 2, saved)

    def test_a_hidden_block_opened_again_and_its_words_restated_comes_out_once(self) -> None:
        words = "The twist is that the Warden is the one who set the whole trap in the first place"
        first = f"Here is the plot.\n\n{OPEN}\n{words}"
        second = f"{OPEN}\n{words}, and nobody knows why.\n{F}\n\nThat is all."
        saved, flushes = self._saved_answer(first, second)
        self.assertEqual(saved.count(OPEN), 1, saved)
        self.assertEqual(saved.count(F), 2, saved)
        self.assertEqual(saved.count("the Warden is the one"), 1, saved)
        self.assertIn("nobody knows why", saved)
        for text in flushes:
            self.assertLessEqual(text.count("the Warden is the one"), 1, text)

    # -- what the person sees while the answer arrives -------------------------------------------

    def test_no_screen_update_shows_the_restated_paragraphs_twice(self) -> None:
        piece1 = _paragraphs(P1, P2)
        piece2 = "\n\n" + _paragraphs(P3, P4)
        piece3 = _paragraphs(P3, P4, P5)
        _, flushes = self._saved_answer(piece1, piece2, piece3)
        self.assertTrue(flushes)
        for text in flushes:
            self.assertLessEqual(text.count("Greenpath is full of moss"), 1, text)
            self.assertLessEqual(text.count("City of Tears is rainy"), 1, text)

    def test_a_piece_that_is_nothing_but_a_restatement_adds_nothing(self) -> None:
        saved, _ = self._saved_answer(_paragraphs(P1, P2, P3), _paragraphs(P2, P3))
        self.assertEqual(saved, _paragraphs(P1, P2, P3))


class TrimRepeatedStartRuleTests(unittest.TestCase):
    PREFIX = _paragraphs(P1, P2, P3)

    def test_nothing_before_the_first_piece(self) -> None:
        self.assertEqual(trim_repeated_start("", "anything at all here"), "anything at all here")
        self.assertEqual(trim_repeated_start(self.PREFIX, ""), "")

    def test_a_restatement_shorter_than_the_minimum_is_kept(self) -> None:
        short = "Greenpath is full of moss"
        self.assertLess(len(short), MIN_REPEAT_CHARS)
        piece = short + " and ruins and ferns that grow everywhere."
        self.assertEqual(trim_repeated_start(self.PREFIX + " ", piece), piece)

    def test_a_restatement_of_the_tail_is_dropped_and_the_rest_kept(self) -> None:
        piece = P3 + "\n\n" + P4
        self.assertEqual(trim_repeated_start(self.PREFIX, piece), "\n\n" + P4)

    def test_a_restatement_after_a_blank_line_ending_keeps_one_paragraph_break(self) -> None:
        got = trim_repeated_start(self.PREFIX + "\n\n", P3 + "\n\n" + P4)
        self.assertEqual(self.PREFIX + "\n\n" + got, _paragraphs(P1, P2, P3, P4))

    def test_a_restated_sentence_cut_off_in_the_middle_of_a_word(self) -> None:
        prefix = "Intro line.\n\nThe Soul Master teleports around the arena, so watch the flo"
        piece = "The Soul Master teleports around the arena, so watch the floor and the walls."
        self.assertEqual(trim_repeated_start(prefix, piece), "or and the walls.")

    def test_a_short_restart_of_the_cut_sentence_counts_when_it_starts_a_sentence(self) -> None:
        prefix = "Intro line.\n\nAnd finally, Act Thr"
        self.assertEqual(trim_repeated_start(prefix, "And finally, Act Three."), "ee.")

    def test_a_short_match_that_does_not_start_a_sentence_is_kept(self) -> None:
        prefix = "Intro line about the walls and the floor in the end of Act Thr"
        piece = "the end of Act Three."
        self.assertEqual(trim_repeated_start(prefix, piece), piece)

    def test_status_lines_at_the_start_of_the_piece_are_kept(self) -> None:
        piece = "<bonsai-status>Continuing the guide</bonsai-status>\n" + P3 + "\n\n" + P4
        got = trim_repeated_start(self.PREFIX, piece)
        self.assertEqual(got, "<bonsai-status>Continuing the guide</bonsai-status>\n\n" + P4)

    def test_a_cut_inside_an_ordinary_code_block_trims_nothing(self) -> None:
        prefix = f"Script:\n{F}lua\n{P3}"
        piece = P3 + "\nmore code"
        self.assertEqual(trim_repeated_start(prefix, piece), piece)

    def test_a_stretch_that_ends_mid_sentence_is_cut_back_to_a_sentence_end(self) -> None:
        # The model restated two sentences and then began a changed third one.
        prefix = _paragraphs(P1, P2, P3, P4)
        piece = "Greenpath is full of moss and acid pools. Its boss, Hornet, is quick, so keep your distance. " \
            "City of Tears is rainy and wet, with a new thought."
        got = trim_repeated_start(prefix, piece)
        self.assertEqual(got, " City of Tears is rainy and wet, with a new thought.")

    def test_while_streaming_the_start_is_held_back_until_it_is_known(self) -> None:
        # "Greenpath is" could still turn into the whole restated paragraph: show nothing yet.
        self.assertEqual(trim_repeated_start(self.PREFIX, "Greenpath is", final=False), "")
        # Once it differs it is shown whole.
        self.assertEqual(
            trim_repeated_start(self.PREFIX, "Greenpath is a lovely place", final=False),
            "Greenpath is a lovely place",
        )

    def test_a_middle_stretch_shorter_than_the_stretch_minimum_is_kept(self) -> None:
        # One sentence that happens to match an earlier line, then something different: kept.
        prefix = _paragraphs(P1, P2, P3, P4, P5)
        piece = "Its boss, the Soul Master, teleports around the arena. But it is easy with a good plan."
        self.assertEqual(trim_repeated_start(prefix, piece), piece)

    def test_while_streaming_the_shown_text_only_ever_grows(self) -> None:
        # Cut at each character, the live view must never show text and then take it back.
        cases = [
            (_paragraphs(P1, P2, P3), _paragraphs(P3, P4, P5)),
            (_paragraphs(P1, P2, P3), _paragraphs(P2, P3, P4)),
            (_paragraphs(P1, P2, P3, P4), _paragraphs(P2, P3, P6)),
            ("Act One ends. And finally, Act Thr", "And finally, Act Three begins in the Styx."),
            (_paragraphs(P1, P2) + "\n\n", _paragraphs(P2, P3)),
            (_paragraphs(P1, P2), _paragraphs(P3, P4)),
        ]
        for prefix, piece in cases:
            shown = ""
            for n in range(1, len(piece) + 1):
                now = trim_repeated_start(prefix, piece[:n], final=False)
                self.assertTrue(now.startswith(shown), f"{shown[-30:]!r} -> {now[-30:]!r} at {n} of {piece[:20]!r}")
                shown = now
            self.assertEqual(shown, trim_repeated_start(prefix, piece), piece[:30])

    def test_while_streaming_a_finished_clean_start_is_shown(self) -> None:
        self.assertEqual(trim_repeated_start(self.PREFIX, "Something brand new", final=False), "Something brand new")

    def test_join_runs_the_hidden_block_merge_first(self) -> None:
        prefix = f"Plot:\n\n{OPEN}\nThe twist is that the Warden set the whole trap in the first place"
        piece = f"{OPEN}\nThe twist is that the Warden set the whole trap in the first place, for fun.\n{F}"
        got = join_continued_piece(prefix, piece)
        self.assertEqual(prefix + got, f"Plot:\n\n{OPEN}\nThe twist is that the Warden set the whole trap in the first place, for fun.\n{F}")


if __name__ == "__main__":
    unittest.main()
