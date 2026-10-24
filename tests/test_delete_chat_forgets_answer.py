"""Title: Deleting a chat must also drop the stored answer that came from it

Purpose: Pins what the Deck shows after the last chat is deleted. The back end keeps the finished
answer it last gave (so a reopened panel can paint it back), and it used to keep it even when the
chat that answer belonged to was deleted. The panel then rebuilt, asked for the stored answer, and
drew it again with no chat open, under a blank question: the old answer with "..." above it.
Used for: `npm run test:py` and `verify.py --quick` (any change under py_modules or main.py).
Solves: Proves the stored answer is gone from the status the screen reads once its chat is deleted,
and that a delete of any OTHER chat leaves the answer alone.
Does not: Test the screen's own handling of a status (src/hooks tests do), or Clear cache (see
test_background_forget_on_clear.py).
"""

import asyncio
import shutil
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask.background_request_state import pending_background_state  # noqa: E402
from backend.chats.chat_slot_service import create_slot, load_slot  # noqa: E402
from main import Plugin  # noqa: E402


class DeleteChatForgetsItsAnswerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        self.patcher.start()
        self.plugin = Plugin()
        self.slot_id = create_slot(self.tmp, label="boss help")["id"]
        self.other_id = create_slot(self.tmp, label="other chat")["id"]

    async def asyncTearDown(self) -> None:
        self.patcher.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _finished_answer_of(self, slot_id: str | None) -> None:
        state = pending_background_state(
            request_id=4,
            question="how do I parry?",
            app_id="",
            app_context="none",
            started_at=0.0,
            chat_slot_id=slot_id,
        )
        state.update({"status": "completed", "success": True, "response": "Tap L1 as it swings."})
        self.plugin._background_state = state
        self.plugin._background_request_seq = 4

    async def test_the_answer_of_the_deleted_chat_is_gone_from_the_status_the_screen_reads(self) -> None:
        self._finished_answer_of(self.slot_id)
        before = await self.plugin.get_background_game_ai_status()
        self.assertEqual(before.get("response"), "Tap L1 as it swings.")

        result = await self.plugin.delete_chat_slot(self.slot_id)
        self.assertTrue(result.get("ok"))

        after = await self.plugin.get_background_game_ai_status()
        self.assertEqual(after.get("status"), "idle")
        self.assertEqual(after.get("response"), "")
        self.assertIsNone(after.get("chat_slot_id"))

    async def test_deleting_a_different_chat_leaves_the_answer_alone(self) -> None:
        self._finished_answer_of(self.slot_id)

        result = await self.plugin.delete_chat_slot(self.other_id)
        self.assertTrue(result.get("ok"))

        after = await self.plugin.get_background_game_ai_status()
        self.assertEqual(after.get("response"), "Tap L1 as it swings.")
        self.assertEqual(after.get("chat_slot_id"), self.slot_id)

    async def test_an_answer_asked_with_no_chat_is_not_touched_by_a_delete(self) -> None:
        self._finished_answer_of(None)

        await self.plugin.delete_chat_slot(self.slot_id)

        after = await self.plugin.get_background_game_ai_status()
        self.assertEqual(after.get("response"), "Tap L1 as it swings.")

    async def test_a_failed_delete_keeps_the_answer(self) -> None:
        self._finished_answer_of(self.slot_id)

        result = await self.plugin.delete_chat_slot("no-such-chat")
        self.assertFalse(result.get("ok"))

        after = await self.plugin.get_background_game_ai_status()
        self.assertEqual(after.get("response"), "Tap L1 as it swings.")

    async def test_an_answer_still_being_written_into_the_deleted_chat_is_stopped(self) -> None:
        """Deleting the chat an answer is still arriving in stops it, and writes nothing into the gone chat."""
        self.plugin._background_request_seq = 1
        self.plugin._background_state = pending_background_state(
            request_id=1, question="slow", app_id="", app_context="none", started_at=0.0, chat_slot_id=self.slot_id
        )
        self.plugin._chat_slot_by_request[1] = self.slot_id
        self.plugin._background_task = asyncio.create_task(asyncio.sleep(30))
        result = await self.plugin.delete_chat_slot(self.slot_id)

        self.assertTrue(result.get("ok"))
        self.assertIsNone(self.plugin._background_task)
        self.assertNotIn(1, self.plugin._chat_slot_by_request)
        status = await self.plugin.get_background_game_ai_status()
        self.assertEqual(status.get("status"), "idle")
        self.assertIsNone(load_slot(self.tmp, self.slot_id))


if __name__ == "__main__":
    unittest.main()
