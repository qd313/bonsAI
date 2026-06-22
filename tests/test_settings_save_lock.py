"""Concurrent save_settings RPCs must not lose merged fields (RMW race)."""

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
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from main import Plugin  # noqa: E402


class SettingsSaveLockTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_dir = self.tmp.name
        self.settings_path = os.path.join(self.settings_dir, "settings.json")
        os.makedirs(self.settings_dir, exist_ok=True)
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump({"ask_mode": "speed", "bonsai_token_streaming_enabled": False}, f)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    async def test_concurrent_saves_preserve_both_fields(self) -> None:
        gate_a = asyncio.Event()
        gate_b = asyncio.Event()
        original_load = self.plugin.load_settings

        async def staggered_load():
            result = await original_load()
            if not gate_a.is_set():
                gate_a.set()
                await gate_b.wait()
            return result

        with patch.object(self.plugin, "load_settings", side_effect=staggered_load):
            task_a = asyncio.create_task(
                self.plugin.save_settings({"bonsai_token_streaming_enabled": True})
            )
            await asyncio.wait_for(gate_a.wait(), timeout=2.0)
            task_b = asyncio.create_task(self.plugin.save_settings({"ask_mode": "strategy"}))
            gate_b.set()
            await asyncio.gather(task_a, task_b)

        with open(self.settings_path, encoding="utf-8") as f:
            saved = json.load(f)
        self.assertTrue(saved.get("bonsai_token_streaming_enabled"))
        self.assertEqual(saved.get("ask_mode"), "strategy")


if __name__ == "__main__":
    unittest.main()
