"""Clear cache must make the backend forget the last answer, and stop one still generating (D35)."""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


def _pending_state(request_id: int, question: str = "slow") -> dict:
    return {
        "status": "pending",
        "request_id": request_id,
        "question": question,
        "app_id": "",
        "app_context": "none",
        "success": None,
        "response": "Thinking...",
        "applied": None,
        "elapsed_seconds": 0,
        "error": None,
        "started_at": 0.0,
        "completed_at": None,
        "strategy_guide_branches": None,
        "model_policy_disclosure": None,
        "preset_carousel_inject": None,
        "partial_response": None,
        "streaming": False,
        "thinking_summary": None,
    }


class ForgetBackgroundAskTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()

    async def test_a_finished_answer_is_gone_from_the_status_the_ui_polls(self) -> None:
        """
        The bug the maintainer saw. ``get_background_game_ai_status`` runs on every frontend mount,
        so as long as the finished answer is still here, switching tabs after a clear repaints it.
        """
        state = _pending_state(3, "what is a bonsai")
        state.update({"status": "completed", "success": True, "response": "A small tree."})
        self.plugin._background_state = state
        self.plugin._background_request_seq = 3

        before = await self.plugin.get_background_game_ai_status()
        self.assertEqual(before.get("response"), "A small tree.")

        result = await self.plugin.forget_background_game_ai()
        self.assertTrue(result.get("ok"))
        # Nothing was generating, so nothing was stopped.
        self.assertFalse(result.get("stopped"))

        after = await self.plugin.get_background_game_ai_status()
        self.assertEqual(after.get("status"), "idle")
        self.assertEqual(after.get("response"), "")
        self.assertIsNone(after.get("request_id"))

    async def test_a_generation_still_running_is_stopped_not_left_to_finish(self) -> None:
        """
        The maintainer's call on D35's open sub-question: clearing mid-answer stops the answer.

        Cancelling the asyncio task is only half of it, so this asserts the Ollama-side abort was
        asked for too — that is the part that unblocks the urllib read on the worker thread.
        """
        self.plugin._background_request_seq = 1
        self.plugin._background_state = _pending_state(1)

        gate = asyncio.Event()

        async def slow_execute(*_args, **_kwargs):
            gate.set()
            await asyncio.sleep(30)
            return {"success": True, "response": "done"}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=slow_execute):
            self.plugin._background_task = asyncio.create_task(
                self.plugin._run_background_request(1, "slow", "127.0.0.1:11434", "", "")
            )
            await asyncio.wait_for(gate.wait(), timeout=2.0)

            result = await self.plugin.forget_background_game_ai()

        self.assertTrue(result.get("stopped"))
        self.assertIsNone(self.plugin._background_task)
        self.assertTrue(self.plugin._abort_current_ollama_chat.is_set())

        # Idle, *not* "cancelled": a cleared session shows nothing at all, not a cancellation bubble.
        status = await self.plugin.get_background_game_ai_status()
        self.assertEqual(status.get("status"), "idle")
        self.assertEqual(status.get("response"), "")

        # And the busy gate is released, so the next question can be asked straight away.
        with patch.object(Plugin, "_execute_game_ai_request", side_effect=slow_execute):
            started = await self.plugin.start_background_game_ai(
                {"question": "next", "PcIp": "127.0.0.1:11434", "appId": "", "appName": ""}
            )
        self.assertNotEqual(started.get("status"), "busy")
        await asyncio.sleep(0)
        if self.plugin._background_task is not None:
            self.plugin._background_task.cancel()
            try:
                await self.plugin._background_task
            except asyncio.CancelledError:
                pass

    async def test_forgetting_twice_is_harmless(self) -> None:
        """Clear cache is also called from Clear-all-plugin-data, which already forgets."""
        self.plugin._background_state = _pending_state(5)
        await self.plugin.forget_background_game_ai()
        second = await self.plugin.forget_background_game_ai()
        self.assertTrue(second.get("ok"))
        self.assertFalse(second.get("stopped"))
        self.assertEqual(self.plugin._background_state.get("status"), "idle")

    async def test_a_stale_partial_cannot_leak_back_into_the_idle_state(self) -> None:
        """
        A streaming snapshot outlives the forget. It must not be merged into the fresh state — that
        would be the same bug in a smaller hat, showing half an answer after a clear.
        """
        self.plugin._background_state = _pending_state(11)
        self.plugin._reset_partial_stream_snapshot(11)
        self.plugin._update_partial_response(11, "Half an answer", True)

        await self.plugin.forget_background_game_ai()

        status = await self.plugin.get_background_game_ai_status()
        self.assertIsNone(status.get("partial_response"))
        self.assertFalse(status.get("streaming"))


if __name__ == "__main__":
    unittest.main()
