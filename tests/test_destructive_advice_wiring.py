"""Tests that run_game_ai_request actually appends the destructive advice safety notice
to the reply the user (and transparency) sees -- not just that the guard module works in
isolation. See tests/test_destructive_advice_guard.py for the check's own unit tests.
"""

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

from backend.ask.game_ai_request import run_game_ai_request


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        self.persisted_snapshots: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        self.persisted_snapshots.append(payload)


def _run(plugin: _FakePlugin, question: str = "How do I fix this crash?"):
    return asyncio.run(
        run_game_ai_request(
            plugin,
            question,
            "127.0.0.1:11434",
        )
    )


class DestructiveAdviceWiringTests(unittest.TestCase):
    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
        }

    def test_dangerous_reply_gets_the_safety_notice_appended(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Just delete your compatdata folder and relaunch the game.",
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertTrue(result.get("success"))
        self.assertIn("bonsAI safety check", result.get("response", ""))
        self.assertIn(
            "delete your compatdata folder", result.get("response", "")
        )
        # The notice also has to reach the transparency snapshot that Show Details reads --
        # not just the RPC return value -- since both are built from the same response_text.
        self.assertEqual(len(plugin.persisted_snapshots), 1)
        self.assertIn(
            "bonsAI safety check", plugin.persisted_snapshots[0].get("final_response", "")
        )

    def test_safe_reply_is_untouched(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Try lowering the TDP to 8 watts and see if the crash still happens.",
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertEqual(
            result.get("response"),
            "Try lowering the TDP to 8 watts and see if the crash still happens.",
        )
        self.assertNotIn("bonsAI safety check", result.get("response", ""))

    def test_dangerous_reply_with_backup_step_is_not_flagged(self):
        plugin = _FakePlugin(self._base_settings())
        original = (
            "Back up your save data first, then delete the compatdata folder and relaunch."
        )
        plugin._ollama_result = {
            "success": True,
            "response": original,
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertEqual(result.get("response"), original)

    def test_failed_ollama_call_is_not_checked(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": False,
            "response": "delete your compatdata folder to try again",
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertFalse(result.get("success"))
        self.assertNotIn("bonsAI safety check", result.get("response", ""))


if __name__ == "__main__":
    unittest.main()
