"""Concurrent save_settings RPC must not lose merged fields (read-modify-write race)."""

import asyncio
import json
import os
import sys
import tempfile
import types
import unittest
from unittest.mock import AsyncMock, patch

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
    _decky.DECKY_PLUGIN_RUNTIME_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "py_modules"))

from main import Plugin  # noqa: E402


class SettingsSaveLockTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_save_settings_preserves_both_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings_path = os.path.join(tmp, "settings.json")
            with open(settings_path, "w", encoding="utf-8") as fh:
                json.dump({"ask_mode": "speed", "voice_stt_model": "tiny.en"}, fh)

            plugin = Plugin()
            gate_a = asyncio.Event()
            gate_b = asyncio.Event()

            original_load = Plugin.load_settings

            async def staggered_load(self):
                data = await original_load(self)
                if not gate_a.is_set():
                    gate_a.set()
                    await gate_b.wait()
                return data

            with (
                patch.object(Plugin, "_settings_path", return_value=settings_path),
                patch.object(Plugin, "load_settings", staggered_load),
                patch.object(Plugin, "_maybe_app_log", new_callable=AsyncMock),
            ):
                task_a = asyncio.create_task(plugin.save_settings({"ask_mode": "deep"}))
                await asyncio.wait_for(gate_a.wait(), timeout=2.0)
                task_b = asyncio.create_task(plugin.save_settings({"voice_stt_model": "base.en"}))
                gate_b.set()
                await asyncio.gather(task_a, task_b)

            with open(settings_path, encoding="utf-8") as fh:
                saved = json.load(fh)

            self.assertEqual(saved.get("ask_mode"), "deep")
            self.assertEqual(saved.get("voice_stt_model"), "base.en")


if __name__ == "__main__":
    unittest.main()
