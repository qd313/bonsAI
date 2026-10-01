"""A hidden-block mark written as the label between two sets of backticks, nothing between them
("```bonsai-spoiler```"), used as both the opening and the closing mark -- plan 78, found on the
Deck. The screen side is in src/utils/emptyLabelSpoilerMark.test.tsx; this is the back end: the
chat's memory and its summary, and the live coverer that fences named spoilers."""

import unittest

from backend.services.chat_memory_service import HIDDEN_NOTE_PLACEHOLDER, strip_fenced_blocks
from backend.services.response_verify import cover_named_spoilers
from backend.services.strategy_spoiler_policy import move_midline_fence_openers_to_line_start

F = "`" * 3
M = f"{F}bonsai-spoiler{F}"
BEFORE = "Right then, you wanna know the lot, not just some little skirmish."
SECRET = "Listen, the Soul Master is the real final boss; it is about how you play the game."
AFTER = "So yeah, just keep your head up. That's the gist of it, yeah?"
DECK = f"{BEFORE}\n\n{M}\n{SECRET}\n{M}\n\n{AFTER}"
ONE_BLOCK = f"{BEFORE}\n\n{F}bonsai-spoiler\n{SECRET}\n{F}\n\n{AFTER}"


class ChatMemoryHidesTheMarkedTextTests(unittest.TestCase):
    def _assert_hidden(self, answer, *, removed=1):
        cleaned, count = strip_fenced_blocks(answer)
        self.assertNotIn("final boss", cleaned)
        self.assertNotIn("bonsai-spoiler", cleaned)
        self.assertNotIn("`", cleaned)
        self.assertEqual(count, removed)
        return cleaned

    def test_the_decks_pair_of_marks_hides_the_sentence_between_them(self):
        cleaned = self._assert_hidden(DECK)
        self.assertIn("little skirmish", cleaned)
        self.assertIn("gist of it", cleaned)
        self.assertIn(HIDDEN_NOTE_PLACEHOLDER, cleaned)

    def test_only_the_first_mark_arrived_hides_everything_after_it(self):
        self._assert_hidden(f"{BEFORE}\n\n{M}\n{SECRET}")

    def test_the_mark_opens_and_an_ordinary_closer_closes(self):
        cleaned = self._assert_hidden(f"{BEFORE}\n\n{M}\n{SECRET}\n{F}\n\n{AFTER}")
        self.assertIn("gist of it", cleaned)

    def test_an_ordinary_opener_and_the_mark_as_the_closer(self):
        cleaned = self._assert_hidden(f"{BEFORE}\n\n{F}bonsai-spoiler\n{SECRET}\n{M}\n\n{AFTER}")
        self.assertIn("gist of it", cleaned)

    def test_two_pairs_leave_the_text_between_them(self):
        answer = f"{BEFORE}\n\n{M}\n{SECRET}\n{M}\n\nMiddle words stay.\n\n{M}\n{SECRET}\n{M}\n\n{AFTER}"
        cleaned = self._assert_hidden(answer, removed=2)
        self.assertIn("Middle words stay.", cleaned)
        self.assertIn("gist of it", cleaned)

    def test_a_mark_glued_to_the_end_of_a_sentence_is_still_a_mark(self):
        cleaned = self._assert_hidden(f"{BEFORE}{M}\n{SECRET}\n{M}\n{AFTER}")
        self.assertIn("little skirmish", cleaned)

    def test_an_ordinary_block_is_left_as_it_was(self):
        cleaned, count = strip_fenced_blocks(ONE_BLOCK)
        self.assertEqual(count, 1)
        self.assertNotIn("final boss", cleaned)


class LiveCovererReadsTheMarkAsABlockTests(unittest.TestCase):
    def test_the_mark_pair_becomes_one_ordinary_block(self):
        self.assertEqual(move_midline_fence_openers_to_line_start(DECK), ONE_BLOCK)

    def test_a_closing_mark_glued_to_a_sentence_gets_its_own_line(self):
        out = move_midline_fence_openers_to_line_start(f"{M}\nWords here.{M}\nMore.")
        self.assertEqual(out, f"{F}bonsai-spoiler\nWords here.\n{F}\nMore.")

    def test_a_sentence_naming_a_protected_thing_is_not_fenced_twice(self):
        out = cover_named_spoilers(DECK, ["Soul Master"])
        self.assertEqual(out, ONE_BLOCK)

    def test_mid_stream_the_open_block_is_held_back(self):
        out = cover_named_spoilers(f"{BEFORE}\n\n{M}\nListen, the Soul Mas", ["Soul Master"], hold_back_incomplete_trailing=True)
        self.assertNotIn("Soul", out)
        self.assertNotIn(M, out)

    def test_ordinary_blocks_and_plain_text_come_back_unchanged(self):
        for ok in (ONE_BLOCK, f"{F}python\nprint(1)\n{F}\n\nplain", "no fences at all"):
            self.assertEqual(move_midline_fence_openers_to_line_start(ok), ok)


if __name__ == "__main__":
    unittest.main()
