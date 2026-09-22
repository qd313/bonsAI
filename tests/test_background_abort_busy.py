"""Abort must release the background Ask busy gate so users can submit again immediately."""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


class AbortBusyGateTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()

    async def test_abort_cancels_task_and_allows_new_start(self) -> None:
        self.plugin._background_request_seq = 1
        request_id = 1
        self.plugin._background_state = {
            "status": "pending",
            "request_id": request_id,
            "question": "slow",
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

        gate = asyncio.Event()

        async def slow_execute(*_args, **_kwargs):
            gate.set()
            await asyncio.sleep(30)
            return {"success": True, "response": "done"}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=slow_execute):
            self.plugin._background_task = asyncio.create_task(
                self.plugin._run_background_request(
                    request_id,
                    "slow",
                    "127.0.0.1:11434",
                    "",
                    "",
                )
            )
            await asyncio.wait_for(gate.wait(), timeout=2.0)

            busy = await self.plugin.start_background_game_ai(
                {"question": "next", "PcIp": "127.0.0.1:11434", "appId": "", "appName": ""}
            )
            self.assertEqual(busy.get("status"), "busy")

            await self.plugin.abort_background_game_ai()
            self.assertEqual(self.plugin._background_state.get("status"), "cancelled")
            self.assertIsNone(self.plugin._background_task)

            started = await self.plugin.start_background_game_ai(
                {"question": "next", "PcIp": "127.0.0.1:11434", "appId": "", "appName": ""}
            )
            self.assertNotEqual(started.get("status"), "busy")
            self.assertEqual(started.get("status"), "pending")

            if self.plugin._background_task is not None:
                self.plugin._background_task.cancel()
                try:
                    await self.plugin._background_task
                except asyncio.CancelledError:
                    pass

    async def test_abort_preserves_partial_in_cancelled_response(self) -> None:
        request_id = 42
        self.plugin._background_state = {
            "status": "pending",
            "request_id": request_id,
            "question": "slow",
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
            "streaming": True,
            "thinking_summary": None,
        }
        self.plugin._reset_partial_stream_snapshot(request_id)
        self.plugin._update_partial_response(request_id, "Partial answer so far", False)

        await self.plugin.abort_background_game_ai()

        self.assertEqual(self.plugin._background_state.get("status"), "cancelled")
        self.assertEqual(self.plugin._background_state.get("response"), "Partial answer so far")

    async def test_executor_terminal_write_also_keeps_the_partial(self) -> None:
        """
        The other half of the Stop race.

        ``abort_background_game_ai`` and ``_run_background_request`` both write the cancelled
        terminal state under ``_background_lock``. When the executor wins, it used to write the
        transport message and drop the drafted text, so whether the user kept their answer depended
        on lock ordering.
        """
        request_id = 7
        self.plugin._background_request_seq = request_id
        self.plugin._background_state = {
            "status": "pending",
            "request_id": request_id,
            "question": "slow",
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
            "streaming": True,
            "thinking_summary": None,
        }
        self.plugin._reset_partial_stream_snapshot(request_id)
        self.plugin._update_partial_response(request_id, "Half an answer", False)

        async def _fake_execute(*_args, **_kwargs):
            return {
                "success": False,
                "response": "Request stopped (connection closed).",
                "cancelled": True,
            }

        with patch.object(Plugin, "_execute_game_ai_request", _fake_execute):
            await self.plugin._run_background_request(request_id, "slow", "1.2.3.4", "", "")

        self.assertEqual(self.plugin._background_state.get("status"), "cancelled")
        self.assertEqual(self.plugin._background_state.get("response"), "Half an answer")

    async def test_cancelled_text_falls_back_when_only_markup_debris_arrived(self) -> None:
        """Stop on the first frame must not show a stray bracket as the answer."""
        request_id = 9
        self.plugin._reset_partial_stream_snapshot(request_id)
        self.plugin._update_partial_response(request_id, "<", False)

        self.assertEqual(
            self.plugin._cancelled_response_text(request_id, "Request cancelled."),
            "Request cancelled.",
        )
        # A snapshot for a different request must never leak into this one.
        self.assertEqual(
            self.plugin._cancelled_response_text(request_id + 1, "Request cancelled."),
            "Request cancelled.",
        )


if __name__ == "__main__":
    unittest.main()
