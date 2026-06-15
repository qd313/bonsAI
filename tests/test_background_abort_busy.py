"""Regression: Stop must release the background Ask slot immediately."""

import asyncio
import sys
import types
import unittest

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8

    def _noop_flock(*_a, **_k):
        return False

    _fcntl.flock = _noop_flock
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


class BackgroundAbortBusyTests(unittest.IsolatedAsyncioTestCase):
    async def test_abort_clears_busy_gate_and_marks_cancelled(self) -> None:
        plugin = Plugin()
        plugin._background_request_seq = 1
        plugin._background_state = {
            "status": "pending",
            "request_id": 1,
            "question": "test",
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

        async def slow_work() -> None:
            await asyncio.sleep(60)

        plugin._background_task = asyncio.create_task(slow_work())

        result = await plugin.abort_background_game_ai()

        self.assertTrue(result.get("ok"))
        self.assertIsNone(plugin._background_task)
        self.assertEqual(plugin._background_state.get("status"), "cancelled")
        self.assertTrue(plugin._background_state.get("cancelled"))
        self.assertEqual(plugin._background_state.get("response"), "Request cancelled.")

    async def test_run_background_request_does_not_overwrite_prior_abort(self) -> None:
        plugin = Plugin()
        plugin._background_state = {
            "status": "cancelled",
            "request_id": 2,
            "question": "test",
            "response": "Request cancelled.",
            "cancelled": True,
        }

        async def fake_execute(*_args, **_kwargs):
            return {
                "success": True,
                "response": "Should not win",
                "cancelled": False,
                "elapsed_seconds": 1.0,
            }

        plugin._execute_game_ai_request = fake_execute  # type: ignore[method-assign]
        await plugin._run_background_request(2, "test", "127.0.0.1", "", "")

        self.assertEqual(plugin._background_state.get("status"), "cancelled")
        self.assertEqual(plugin._background_state.get("response"), "Request cancelled.")


if __name__ == "__main__":
    unittest.main()
