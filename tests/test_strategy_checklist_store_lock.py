"""Concurrent strategy checklist session saves must not drop other game buckets."""

import asyncio
import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


def _checklist_payload(app_id: str, title: str, **extra) -> dict:
    return {
        "app_id": app_id,
        "title": title,
        "items": [
            {"id": "1", "label": "Step one"},
            {"id": "2", "label": "Step two"},
            {"id": "3", "label": "Step three"},
        ],
        "checked_ids": ["1"],
        **extra,
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

    async def test_clearing_with_no_game_leaves_the_lists_kept_for_games(self) -> None:
        """Leaving Strategy mode with no game running used to empty the whole file (plan 96, F4)."""
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        await self.plugin.save_strategy_checklist_session(_checklist_payload("", "No game plan"))

        await self.plugin.clear_strategy_checklist_session("")

        path = os.path.join(self.settings_dir, "strategy_checklist_session.json")
        with open(path, encoding="utf-8") as f:
            buckets = json.load(f).get("by_app_id") or {}
        self.assertIn("570", buckets)
        self.assertEqual(buckets["570"]["checked_ids"], ["1"])
        self.assertNotIn("__none__", buckets)

    async def test_clearing_one_game_leaves_the_no_game_list(self) -> None:
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        await self.plugin.save_strategy_checklist_session(_checklist_payload("", "No game plan"))

        await self.plugin.clear_strategy_checklist_session("570")

        path = os.path.join(self.settings_dir, "strategy_checklist_session.json")
        with open(path, encoding="utf-8") as f:
            buckets = json.load(f).get("by_app_id") or {}
        self.assertNotIn("570", buckets)
        self.assertEqual(buckets["__none__"]["title"], "No game plan")

    async def test_save_then_load_returns_the_ticks_and_the_revealed_step(self) -> None:
        """The route's hand-uncovered steps travel with the ticks (plan 100, lane R)."""
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Route", revealed=["3"]))
        path = os.path.join(self.settings_dir, "strategy_checklist_session.json")
        with open(path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["by_app_id"]["570"]["revealed"], ["3"])
        loaded = await self.plugin.get_strategy_checklist_session("570")
        self.assertEqual(loaded["checked_ids"], ["1"])
        self.assertEqual(loaded["revealed"], ["3"])

    async def test_a_save_without_revealed_loads_as_none_revealed(self) -> None:
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Route"))
        loaded = await self.plugin.get_strategy_checklist_session("570")
        self.assertEqual(loaded["revealed"], [])

    async def test_clear_takes_the_revealed_step_with_the_ticks(self) -> None:
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Route", revealed=["3"]))
        await self.plugin.clear_strategy_checklist_session("570")
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("570"))


if __name__ == "__main__":
    unittest.main()
