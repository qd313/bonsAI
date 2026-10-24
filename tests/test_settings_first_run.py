"""Title: The back end tells the screen when the plugin starts with no settings file

Purpose: A Decky uninstall and reinstall removes the plugin's settings folder, but Steam's own browser
storage keeps the screen's "already seen" flags, so a reinstalled plugin showed no first-run notices.
The back end now notes at start whether settings.json existed, and get_settings_first_run answers
{"first_run": true} when it did not.

Used for: py_modules/backend/settings/settings_service.py and main.py (_main, get_settings_first_run).

Solves: the screen has no other way to tell a wiped Deck from a Deck whose person simply saw the notices.

Does not: test the screen clearing its flags (src/features/plugin-shell tests do) or Clear all data.
"""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from plugin_settings_file_harness import PluginSettingsFileMixin

import main
from backend.ollama import ollama_pull_resume_service as resume


class SettingsFirstRunTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()

    async def _start(self) -> None:
        """Run the real startup hook, minus the two background jobs that need an AI host."""
        with patch.object(resume, "resume_interrupted_download", AsyncMock(return_value="none")), patch.object(
            self.plugin, "_schedule_preload_ask_model"
        ):
            await self.plugin._main()
            await asyncio.sleep(0)

    async def test_no_settings_file_at_start_reports_a_first_run(self) -> None:
        await self._start()
        self.assertEqual(await self.plugin.get_settings_first_run(), {"first_run": True})

    async def test_a_settings_file_at_start_reports_no_first_run(self) -> None:
        self._write_settings({"ask_mode": "speed"})
        await self._start()
        self.assertEqual(await self.plugin.get_settings_first_run(), {"first_run": False})

    async def test_the_first_save_turns_it_off(self) -> None:
        await self._start()
        await self.plugin.save_settings({"ask_mode": "strategy"})
        self.assertEqual(await self.plugin.get_settings_first_run(), {"first_run": False})

    async def test_it_is_reported_once_per_start_so_a_popup_remount_does_not_clear_flags_again(self) -> None:
        await self._start()
        self.assertTrue((await self.plugin.get_settings_first_run())["first_run"])
        self.assertFalse((await self.plugin.get_settings_first_run())["first_run"])

    async def test_a_start_after_the_file_is_gone_reports_a_first_run_again(self) -> None:
        self._write_settings({"ask_mode": "speed"})
        await self._start()
        import os

        os.remove(self.settings_path)
        self.plugin = main.Plugin()
        await self._start()
        self.assertTrue((await self.plugin.get_settings_first_run())["first_run"])

    async def test_load_settings_result_does_not_change_shape(self) -> None:
        await self._start()
        self.assertNotIn("first_run", await self.plugin.load_settings())


if __name__ == "__main__":
    unittest.main()
