"""A Stop pressed while the answer is inside a hidden (spoiler) block.

Found 2026-10-03 (plan 81 helper I, "found, not fixed"): the live cover holds a hidden block's
words back until the block closes, so a Stop leaves the answer ending on the bare opening mark
("```bonsai-spoiler"). Saved like that, the chat reopens with an empty code box or a stray mark.

These tests feed the real live cover's output into the answer being drafted, press the real Stop,
let the real chat save run, and read the saved turn back from the chat file.
"""

from __future__ import annotations

import shutil
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import chat_slot_service, chat_turn_recorder  # noqa: E402
from backend.services.background_request_state import new_background_state  # noqa: E402
from backend.services.response_verify import cover_named_spoilers  # noqa: E402
from backend.services.soft_continue_spoiler_join import end_cut_answer_cleanly  # noqa: E402
from main import Plugin  # noqa: E402

F = "`" * 3
OPEN = f"{F}bonsai-spoiler"
NAMES = ["Strider"]
INTRO = "Here is the road through the second chapter.\n\n"
HIDDEN_WORDS = "Save your ammo for the Strider and lure it onto the traps"


def _pending_state(request_id: int) -> dict:
    return {**new_background_state(), "status": "pending", "request_id": request_id, "streaming": True}


class StoppedAnswerCutInsideAHiddenBlockTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.mkdtemp(prefix="p81n3-")
        self.addCleanup(shutil.rmtree, self.tmp, True)
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin = Plugin()
        self.request_id = 11
        self.slot_id = chat_slot_service.create_slot(self.tmp, first_question="guide")["id"]
        self.plugin._background_state = _pending_state(self.request_id)
        self.plugin._chat_slot_by_request[self.request_id] = self.slot_id
        self.plugin._reset_partial_stream_snapshot(self.request_id)

    def _draft(self, written_so_far: str, *, cover_on: bool) -> None:
        """What the answer bubble holds: the words so far through the live cover (when one applies)."""
        shown = (
            cover_named_spoilers(written_so_far, NAMES, hold_back_incomplete_trailing=True)
            if cover_on
            else written_so_far
        )
        self.plugin._update_partial_response(self.request_id, shown, False)

    async def _stop_and_read_saved_answer(self) -> str:
        await self.plugin.abort_background_game_ai()
        turns = chat_slot_service.load_slot(self.tmp, self.slot_id)["turns"]
        return turns[-1]["text"]

    async def test_a_stop_inside_a_hidden_block_saves_no_bare_opening_mark(self) -> None:
        self._draft(f"{INTRO}{OPEN}\n{HIDDEN_WORDS}", cover_on=True)
        saved = await self._stop_and_read_saved_answer()
        self.assertNotIn("bonsai-spoiler", saved, saved)
        self.assertNotIn(F, saved, saved)
        self.assertNotIn("Strider", saved, saved)
        self.assertTrue(saved.startswith("Here is the road"), saved)

    async def test_the_clear_session_save_is_tidied_the_same_way(self) -> None:
        self._draft(f"{INTRO}{OPEN}\n{HIDDEN_WORDS}", cover_on=True)
        async with self.plugin._background_lock:
            stopped = chat_turn_recorder.take_answer_a_clear_will_stop(self.plugin)
        self.assertIsNotNone(stopped)
        self.assertNotIn("bonsai-spoiler", stopped["response_text"])
        self.assertNotIn(F, stopped["response_text"])

    async def test_a_stop_when_nothing_but_the_opening_mark_arrived_saves_the_stop_notice(self) -> None:
        self._draft(f"{OPEN}\n{HIDDEN_WORDS}", cover_on=True)
        saved = await self._stop_and_read_saved_answer()
        self.assertNotIn("bonsai-spoiler", saved, saved)
        self.assertNotIn(F, saved, saved)

    async def test_words_written_inside_an_uncovered_block_are_saved_inside_a_closed_one(self) -> None:
        # Spoilers allowed, so the live cover does not hold the block's words back: they are in the
        # draft. Closing the block keeps them inside its cover; they never become plain text.
        self._draft(f"{INTRO}{OPEN}\n{HIDDEN_WORDS}", cover_on=False)
        saved = await self._stop_and_read_saved_answer()
        self.assertEqual(saved.count(OPEN), 1, saved)
        self.assertEqual(saved.count(F), 2, saved)
        self.assertTrue(saved.rstrip().endswith(F), saved)
        self.assertLess(saved.index(OPEN), saved.index("Strider"), saved)

    async def test_a_stop_after_a_closed_block_and_ordinary_words_changes_nothing(self) -> None:
        text = f"{INTRO}{OPEN}\nA hidden tip.\n{F}\n\nThen some plain words, cut"
        self._draft(text, cover_on=False)
        saved = await self._stop_and_read_saved_answer()
        self.assertEqual(saved, text)


class EndCutAnswerCleanlyTests(unittest.TestCase):
    def test_an_opener_glued_to_the_last_word_with_nothing_after_it_is_dropped(self) -> None:
        self.assertEqual(end_cut_answer_cleanly(f"Plain words.{OPEN}"), "Plain words.")

    def test_words_on_the_openers_own_line_are_kept_and_the_block_closed(self) -> None:
        self.assertEqual(end_cut_answer_cleanly(f"Plain.\n{OPEN} lure it"), f"Plain.\n{OPEN} lure it\n{F}")

    def test_a_closed_block_and_an_answer_without_one_are_returned_as_they_are(self) -> None:
        closed = f"Plain.\n{OPEN}\nHidden.\n{F}\nMore."
        self.assertEqual(end_cut_answer_cleanly(closed), closed)
        self.assertEqual(end_cut_answer_cleanly("Just words"), "Just words")

    def test_an_ordinary_code_block_left_open_is_not_touched(self) -> None:
        self.assertEqual(end_cut_answer_cleanly(f"{F}text\nsample"), f"{F}text\nsample")


if __name__ == "__main__":
    unittest.main()
