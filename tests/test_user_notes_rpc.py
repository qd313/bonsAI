"""Plan 92 lane N1: the three note calls the screen makes, through the real plugin class, and the
"Clear all plugin data" wipe taking the notes file with everything else."""

import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services.plugin_data_reset import reset_plugin_disk_and_defaults  # noqa: E402
from backend.services.settings_service import load_settings, save_settings  # noqa: E402
from backend.services.user_notes_service import load_notes, notes_path, save_note  # noqa: E402
from main import Plugin  # noqa: E402
from test_plugin_data_reset import _Logger, _sanitize  # noqa: E402


class UserNoteCallTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", staticmethod(lambda: self.dir))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin = Plugin()

    async def test_save_list_edit_delete_through_the_plugin_methods(self):
        self.assertEqual(await self.plugin.list_user_notes(), {"ok": True, "notes": []})

        saved = await self.plugin.save_user_note(
            {"id": "", "text": "Steel Soul run", "app_id": "367520", "game_title": "Hollow Knight"}
        )
        self.assertTrue(saved["ok"])
        note = saved["note"]
        self.assertEqual(
            set(note), {"id", "text", "app_id", "game_title", "on", "created_at", "source_turn_id"}
        )
        self.assertTrue(note["id"].startswith("n-"))
        self.assertTrue(note["on"])

        listed = await self.plugin.list_user_notes()
        self.assertEqual(listed, {"ok": True, "notes": [note]})

        edited = await self.plugin.save_user_note({"id": note["id"], "on": False})
        self.assertEqual(edited, {"ok": True, "note": {**note, "on": False}})

        self.assertEqual(await self.plugin.delete_user_note(note["id"]), {"ok": True})
        self.assertEqual(await self.plugin.list_user_notes(), {"ok": True, "notes": []})

    async def test_refusals_come_back_in_the_house_shape_with_plain_words(self):
        empty = await self.plugin.save_user_note({"id": "", "text": ""})
        self.assertEqual(empty, {"ok": False, "error": "A note needs some words.", "code": "empty"})
        too_long = await self.plugin.save_user_note({"text": "x" * 201})
        self.assertEqual(too_long["code"], "too_long")
        self.assertEqual(too_long["error"], "A note can be up to 200 characters.")
        self.assertEqual((await self.plugin.save_user_note())["code"], "invalid")
        gone = await self.plugin.delete_user_note("n-missing")
        self.assertEqual(gone, {"ok": False, "error": "That note is gone.", "code": "not_found"})
        self.assertEqual((await self.plugin.save_user_note({"id": "n-nope", "on": True}))["code"], "not_found")

    async def test_the_41st_note_is_refused_through_the_plugin_method(self):
        for i in range(40):
            self.assertTrue((await self.plugin.save_user_note({"text": f"note {i}"}))["ok"])
        refused = await self.plugin.save_user_note({"text": "one too many"})
        self.assertEqual(
            refused, {"ok": False, "error": "That's one note too many. Remove one first.", "code": "too_many"}
        )
        self.assertEqual(len((await self.plugin.list_user_notes())["notes"]), 40)

    async def test_two_saves_at_once_both_land(self):
        a, b = await asyncio.gather(
            self.plugin.save_user_note({"text": "first"}), self.plugin.save_user_note({"text": "second"})
        )
        self.assertTrue(a["ok"] and b["ok"])
        self.assertEqual(len((await self.plugin.list_user_notes())["notes"]), 2)


class ClearAllPluginDataTests(unittest.TestCase):
    def test_the_wipe_takes_the_notes_file_with_the_rest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            settings_dir = root / "settings"
            settings_dir.mkdir()
            runtime_dir, log_dir = root / "runtime", root / "logs"
            runtime_dir.mkdir()
            log_dir.mkdir()
            save_note(str(settings_dir), {"text": "Steel Soul run"})
            self.assertTrue(os.path.exists(notes_path(str(settings_dir))))

            reset_plugin_disk_and_defaults(
                settings_path=str(settings_dir / "settings.json"),
                settings_dir=str(settings_dir),
                runtime_dir=str(runtime_dir),
                log_dir=str(log_dir),
                sanitize_func=_sanitize,
                load_settings=lambda p, s, lg: load_settings(p, s, lg),
                save_settings=save_settings,
                logger=_Logger(),
            )

            self.assertFalse(os.path.exists(notes_path(str(settings_dir))))
            self.assertEqual(load_notes(str(settings_dir)), [])


if __name__ == "__main__":
    unittest.main()
