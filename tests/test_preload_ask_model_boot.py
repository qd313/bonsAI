"""Boot wiring for the Speed-mode VRAM preload (roadmap: developer switch first).

`backend.ask.ollama_service.preload_ask_model_sync` is covered on its own in
`test_ollama_preload.py`. This file covers only the glue in `main.Plugin`: the switch defaults
off and must change nothing when off, and scheduling the warm-up at boot must never make `_main`
wait on it -- a slow or unreachable Ollama host must not add time to plugin startup.
"""

import asyncio
import json
import os
import sys
import tempfile
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
    _decky.HOME = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.core.constants import DEFAULT_OLLAMA_PCIP  # noqa: E402
from backend.ollama.ollama_urls import normalize_ollama_base  # noqa: E402
from main import Plugin  # noqa: E402


class PreloadAskModelBootTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_dir = self.tmp.name
        self.settings_path = os.path.join(self.settings_dir, "settings.json")
        os.makedirs(self.settings_dir, exist_ok=True)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    def _write_settings(self, data: dict) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    async def test_switch_off_by_default_calls_nothing(self) -> None:
        """No settings file at all -- the shipped, fresh-install state."""
        with patch("main.preload_ask_model_sync") as mock_warm:
            await self.plugin._preload_ask_model_if_enabled()
        mock_warm.assert_not_called()

    async def test_switch_explicitly_off_calls_nothing(self) -> None:
        self._write_settings({"dev_preload_ask_model": False, "ollama_local_on_deck": True})
        with patch("main.preload_ask_model_sync") as mock_warm:
            await self.plugin._preload_ask_model_if_enabled()
        mock_warm.assert_not_called()

    async def test_switch_on_and_routed_to_this_deck_warms_the_loopback_host(self) -> None:
        self._write_settings({"dev_preload_ask_model": True, "ollama_local_on_deck": True})
        with patch("main.preload_ask_model_sync") as mock_warm:
            await self.plugin._preload_ask_model_if_enabled()
        _, _, expected_base = normalize_ollama_base(DEFAULT_OLLAMA_PCIP)
        mock_warm.assert_called_once()
        self.assertEqual(mock_warm.call_args.args[0], expected_base)

    async def test_switch_on_and_not_local_uses_the_first_named_host(self) -> None:
        self._write_settings(
            {
                "dev_preload_ask_model": True,
                "ollama_local_on_deck": False,
                "named_ollama_hosts": [{"label": "PC", "host": "192.168.1.50:11434"}],
            }
        )
        with patch("main.preload_ask_model_sync") as mock_warm:
            await self.plugin._preload_ask_model_if_enabled()
        _, _, expected_base = normalize_ollama_base("192.168.1.50:11434")
        mock_warm.assert_called_once()
        self.assertEqual(mock_warm.call_args.args[0], expected_base)

    async def test_switch_on_but_no_known_host_skips_quietly(self) -> None:
        self._write_settings({"dev_preload_ask_model": True, "ollama_local_on_deck": False})
        with patch("main.preload_ask_model_sync") as mock_warm:
            await self.plugin._preload_ask_model_if_enabled()
        mock_warm.assert_not_called()

    async def test_main_returns_without_waiting_on_a_slow_preload(self) -> None:
        """The one hard requirement: startup must never block on the warm-up.

        ``slow_preload`` never completes until ``release`` is set. If ``_main`` awaited it
        directly, this test would hang until the ``wait_for`` timeout and fail. Returning well
        inside the timeout proves ``_main`` only *schedules* the task rather than finishing it.
        """
        release = asyncio.Event()

        async def slow_preload() -> None:
            await release.wait()

        with patch.object(self.plugin, "_preload_ask_model_if_enabled", side_effect=slow_preload):
            await asyncio.wait_for(self.plugin._main(), timeout=1.0)
            release.set()
            await asyncio.sleep(0)


if __name__ == "__main__":
    unittest.main()
