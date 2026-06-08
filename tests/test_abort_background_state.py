"""Unit tests for eager cancelled state on abort_background_game_ai."""

import asyncio
import sys
import types
import unittest


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


class AbortBackgroundStateTests(unittest.IsolatedAsyncioTestCase):
    async def test_abort_marks_pending_request_cancelled(self) -> None:
        plugin = Plugin()
        plugin._background_state = {
            "status": "pending",
            "request_id": 9,
            "response": "Thinking...",
        }
        plugin._reset_partial_stream_snapshot(9)
        plugin._update_partial_response(9, "Partial text", False)

        await plugin.abort_background_game_ai()

        self.assertEqual(plugin._background_state.get("status"), "cancelled")
        self.assertTrue(plugin._background_state.get("cancelled"))
        merged = plugin._merge_partial_into_background_status(dict(plugin._background_state))
        self.assertFalse(merged.get("streaming"))
        self.assertIsNone(merged.get("partial_response"))

    async def test_abort_no_op_when_not_pending(self) -> None:
        plugin = Plugin()
        plugin._background_state = {
            "status": "completed",
            "request_id": 3,
            "response": "Done.",
            "success": True,
        }

        await plugin.abort_background_game_ai()

        self.assertEqual(plugin._background_state.get("status"), "completed")


if __name__ == "__main__":
    unittest.main()
