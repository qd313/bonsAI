"""Unit tests for background Ask partial_response streaming state (main.Plugin)."""

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
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "Growing reply", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertTrue(merged.get("streaming"))
        self.assertEqual(merged.get("partial_response"), "Growing reply")

    def test_thinking_only_delta_without_partial(self) -> None:
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 9,
            "response": "Thinking...",
            "started_at": 0.0,
        }
        self.plugin._reset_partial_stream_snapshot(9)
        self.plugin._update_partial_response(
            9,
            "Should not appear",
            False,
            "Checking Proton log",
            update_partial=False,
        )
        with self.plugin._partial_response_lock:
            snap = self.plugin._partial_stream_snapshot
            self.assertIsNone(snap.get("partial_response"))
            self.assertEqual(snap.get("thinking_summary"), "Checking Proton log")
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("thinking_summary"), "Checking Proton log")
        self.assertIsNone(merged.get("partial_response"))

    def test_merge_thinking_fallback_when_no_model_tag(self) -> None:
        import time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 8,
            "response": "Thinking...",
            "started_at": time.time() - 10,
        }
        self.plugin._reset_partial_stream_snapshot(8)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged.get("thinking_summary"), "Still working…")

    def test_publish_thinking_phase_key(self) -> None:
        self.plugin._reset_partial_stream_snapshot(11)
        self.plugin._publish_thinking_phase_key(11, "starting")
        merged = self.plugin._merge_partial_into_background_status(
            {"status": "pending", "request_id": 11, "response": "Thinking...", "started_at": 0.0}
        )
        self.assertEqual(merged.get("thinking_summary"), "Starting…")

    def test_publish_thinking_phase_key_woven(self) -> None:
        self.plugin._reset_partial_stream_snapshot(13)
        self.plugin._publish_thinking_phase_key(
            13,
            "proton_logs",
            app_name="Elden Ring",
            question="why crash on launch",
        )
        merged = self.plugin._merge_partial_into_background_status(
            {"status": "pending", "request_id": 13, "response": "Thinking...", "started_at": 0.0}
        )
        summary = merged.get("thinking_summary") or ""
        self.assertIn("crash", summary.lower())
        self.assertIn("Elden Ring", summary)

    def test_merge_uses_fallback_after_prep_without_sticky_connect(self) -> None:
        """Prep phases publish thinking; Ollama wait without publish uses elapsed fallback."""
        import time

        self.plugin._background_state = {
            "status": "pending",
            "request_id": 12,
            "response": "Thinking...",
            "started_at": time.time() - 3,
        }
        self.plugin._reset_partial_stream_snapshot(12)
        self.plugin._publish_thinking_phase_key(12, "building_context", app_name="Zelda")
        merged_early = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged_early.get("thinking_summary"), "Building context for Zelda…")
        with self.plugin._partial_response_lock:
            self.plugin._partial_stream_snapshot["thinking_summary"] = None
        merged_late = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertEqual(merged_late.get("thinking_summary"), "Generating…")

    def test_merge_omits_partial_when_not_pending(self) -> None:
        self.plugin._background_state = {"status": "completed", "request_id": 7}
        self.plugin._reset_partial_stream_snapshot(7)
        self.plugin._update_partial_response(7, "ignored", False)
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertFalse(merged.get("streaming"))
        self.assertIsNone(merged.get("partial_response"))


if __name__ == "__main__":
    unittest.main()
