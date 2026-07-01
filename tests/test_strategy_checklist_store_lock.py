"""Concurrent strategy checklist session saves must not drop other game buckets."""

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


def _checklist_payload(app_id: str, title: str) -> dict:
    return {
        "app_id": app_id,
        "title": title,
        "items": [
            {"id": "1", "label": "Step one"},
            {"id": "2", "label": "Step two"},
        ],
        "checked_ids": ["1"],
    }


class StrategyChecklistStoreLockTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_dir = self.tmp.name
        os.makedirs(self.settings_dir, exist_ok=True)
        self.plugin = Plugin()

        patcher = patch.object(
            Plugin,
            "_strategy_checklist_session_path",
            return_value=os.path.join(self.settings_dir, "strategy_checklist_session.json"),
        )
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    async def test_concurrent_saves_preserve_both_game_buckets(self) -> None:
        await asyncio.gather(
            self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan")),
            self.plugin.save_strategy_checklist_session(_checklist_payload("730", "CS plan")),
        )

        path = os.path.join(self.settings_dir, "strategy_checklist_session.json")
        with open(path, encoding="utf-8") as f:
            saved = json.load(f)
        buckets = saved.get("by_app_id") or {}
        self.assertIn("570", buckets)
        self.assertIn("730", buckets)
        self.assertEqual(buckets["570"]["title"], "Dota plan")
        self.assertEqual(buckets["730"]["title"], "CS plan")


if __name__ == "__main__":
    unittest.main()
