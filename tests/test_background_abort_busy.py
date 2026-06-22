"""Abort must release the background Ask busy gate so users can submit again immediately."""

import asyncio
import sys
import types
import unittest
from unittest.mock import patch

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8
    _fcntl.flock = lambda *_a, **_k: False
    sys.modules["fcntl"] = _fcntl

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

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


if __name__ == "__main__":
    unittest.main()
