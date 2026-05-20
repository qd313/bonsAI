"""Unit tests for background Ask partial_response streaming state (main.Plugin)."""

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


class BackgroundPartialStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.plugin = Plugin()

    def test_stale_request_id_ignored(self) -> None:
        self.plugin._reset_partial_stream_snapshot(1)
        self.plugin._update_partial_response(1, "Hello", False)
        self.plugin._update_partial_response(2, "Stale", False)
        with self.plugin._partial_response_lock:
            self.assertEqual(self.plugin._partial_stream_snapshot["partial_response"], "Hello")

    def test_done_clears_streaming_flag(self) -> None:
        self.plugin._reset_partial_stream_snapshot(3)
        self.plugin._update_partial_response(3, "Partial", False)
        self.plugin._update_partial_response(3, "Final", True)
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertEqual(snap["partial_response"], "Final")
            self.assertFalse(snap["streaming"])

    def test_merge_partial_into_pending_status(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 7,
            "response": "Thinking...",
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "Growing reply", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertTrue(merged.get("streaming"))
        self.assertEqual(merged.get("partial_response"), "Growing reply")

    def test_merge_omits_partial_when_not_pending(self) -> None:
        self.plugin._background_state = {"status": "completed", "request_id": 7}
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "ignored", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertFalse(merged.get("streaming"))
        self.assertIsNone(merged.get("partial_response"))


if __name__ == "__main__":
    unittest.main()
