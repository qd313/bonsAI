"""Title: The activity-log call reaches its level check

Purpose: Prove the screen's "write one line to the activity log" call runs its log-level check without
         crashing, whatever level the log is set to.
Used for: Guarding the hand-off plan 65 made when it moved this call's body out of main.py into
          media_desktop_rpc.py.
Solves: The move changed `Plugin._desktop_app_log_level_allows(...)` into a call through the instance.
        That helper is written without `self`, so the instance call passed one argument too many and
        every activity-log line failed with a TypeError. The Deck check caught it on 2026-09-24, from
        the loader's log. No test called this path, so nothing else could.
Does not: Write any file. Both cases stop before the write: one at the level check, one at the
          file-writing permission.
"""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


class AppendAppLogRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_path = os.path.join(self.tmp.name, "settings.json")
        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.tmp.name

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    def _save(self, settings: dict) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump(settings, f)

    async def test_log_turned_off_skips_the_line(self) -> None:
        self._save({"desktop_app_log_level": "off"})
        out = await self.plugin.append_app_log({"level": "default", "category": "tab", "message": "opened"})
        self.assertEqual(out, {"success": True, "skipped": True})

    async def test_verbose_log_gets_past_the_level_check(self) -> None:
        # Past the level check, the next gate is the file-writing permission, which is off here, so the
        # call answers with that refusal instead of writing to the Desktop.
        self._save({"desktop_app_log_level": "verbose", "capabilities": {"filesystem_write": False}})
        out = await self.plugin.append_app_log({"level": "verbose", "category": "tab", "message": "opened"})
        self.assertFalse(out["success"])
        self.assertIn("Filesystem writes are disabled", out["error"])


if __name__ == "__main__":
    unittest.main()
