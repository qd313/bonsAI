"""Regression: token streaming partials must only wire from the active background request."""

import inspect
import sys
import types
import unittest

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8

    def _noop_lock(*_a, **_k):
        return False

    _fcntl.flock = _noop_lock
    sys.modules["fcntl"] = _fcntl

class TokenStreamRequestIdWiringTests(unittest.TestCase):
    def test_run_game_ai_request_accepts_token_stream_request_id(self) -> None:
        from backend.services.game_ai_request import run_game_ai_request

        params = inspect.signature(run_game_ai_request).parameters
        self.assertIn("token_stream_request_id", params)
        self.assertIs(params["token_stream_request_id"].default, None)

    def test_plugin_ask_ollama_accepts_token_stream_request_id(self) -> None:
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

        from main import Plugin

        sig = inspect.signature(Plugin.ask_ollama)
        self.assertIn("token_stream_request_id", sig.parameters)
        self.assertIs(sig.parameters["token_stream_request_id"].default, None)


if __name__ == "__main__":
    unittest.main()
