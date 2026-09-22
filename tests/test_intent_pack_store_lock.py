"""Concurrent intent pack mutations must not lose pack-list changes."""

import asyncio
import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import intent_pack_service as svc  # noqa: E402
from main import Plugin  # noqa: E402


class IntentPackStoreLockTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_dir = self.tmp.name
        self.pack_path = os.path.join(self.settings_dir, svc.INTENT_PACKS_FILENAME)
        os.makedirs(self.settings_dir, exist_ok=True)
        svc.save_intent_packs(self.pack_path, svc.default_bundled_store(), settings_dir=self.settings_dir)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_intent_packs_path", return_value=self.pack_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    async def test_concurrent_toggles_preserve_both_changes(self) -> None:
        import_json = json.dumps(
            {
                "id": "custom-lan",
                "label": "LAN",
                "entries": [
                    {
                        "target": "Settings > Downloads > Game File Transfer over Local Network",
                        "aliases": ["lan transfer"],
                    }
                ],
            }
        )
        await asyncio.gather(
            self.plugin.set_intent_pack_enabled("deck-basics", False),
            self.plugin.import_intent_pack({"json": import_json, "confirm": True}),
        )

        with open(self.pack_path, encoding="utf-8") as f:
            saved = json.load(f)
        by_id = {p["id"]: p for p in saved.get("packs") or []}
        self.assertFalse(by_id["deck-basics"]["enabled"])
        self.assertIn("custom-lan", by_id)


if __name__ == "__main__":
    unittest.main()
