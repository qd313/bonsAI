"""Title: The "Suggest as a tip" plugin method is the only guard, so it is tested as one

Purpose: Prove the plugin method checks the Desktop permission before it reads anything else, refuses with the
         exact words the screen shows, takes the home folder only from the plugin's own setting, accepts five
         named arguments and nothing else, and hands back the writer's answer with a bare file name.
Used for: suggest_rag_corpus_tip in knowledge/rag_corpus_rpc.py (plan 100, lane J; the security read's asks).
Solves: Once the screen calls it, nothing else stands between a caller and a file write.
Does not: Test the writer's own rules (tests/test_kb_tip_suggestion_service.py does).
"""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

import decky  # noqa: E402
from main import Plugin  # noqa: E402

REFUSAL = "Filesystem writes are disabled. Enable them in the Permissions tab."
TIP_FOLDER = os.path.join("Desktop", "bonsAI_logs", "suggested-tips")


class SuggestTipRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)
        self.settings_path = os.path.join(self.tmp.name, "settings.json")
        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()
        self._before = (getattr(decky, "DECKY_PLUGIN_SETTINGS_DIR", None), getattr(decky, "DECKY_USER_HOME", None))
        decky.DECKY_PLUGIN_SETTINGS_DIR = self.tmp.name
        decky.DECKY_USER_HOME = self.home
        self.addCleanup(self._restore)

    def _restore(self) -> None:
        decky.DECKY_PLUGIN_SETTINGS_DIR = self._before[0]
        if self._before[1] is None:
            del decky.DECKY_USER_HOME
        else:
            decky.DECKY_USER_HOME = self._before[1]

    def _save(self, on: bool) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump({"capabilities": {"filesystem_write": on}}, f)

    def _written(self) -> list[str]:
        folder = os.path.join(self.home, TIP_FOLDER)
        return sorted(os.listdir(folder)) if os.path.isdir(folder) else []

    async def test_with_the_permission_off_it_refuses_with_the_exact_words_and_writes_nothing(self) -> None:
        self._save(False)
        out = await self.plugin.suggest_rag_corpus_tip("How?", "Dash.", "1", "Hollow Knight", "mechanic")
        self.assertEqual(out, {"ok": False, "file": "", "issue_url": "", "error": REFUSAL})
        self.assertFalse(os.path.exists(os.path.join(self.home, "Desktop")))

    async def test_the_permission_is_checked_before_home_or_any_argument_is_read(self) -> None:
        self._save(False)

        class Boom:
            def __str__(self) -> str:
                raise AssertionError("an argument was read before the permission check")

        with patch("backend.knowledge.rag_corpus_rpc.suggest_tip_sync") as writer:
            out = await self.plugin.suggest_rag_corpus_tip(Boom(), Boom(), Boom(), Boom(), Boom())
        self.assertFalse(out["ok"])
        writer.assert_not_called()

    async def test_the_refusal_is_logged_as_a_denied_capability_at_verbose_level(self) -> None:
        self._save(False)
        with patch.object(Plugin, "_maybe_app_log") as log:
            await self.plugin.suggest_rag_corpus_tip("q", "a", "1", "G", "mechanic")
        self.assertEqual(log.call_args.args[0], "capability.denied")
        self.assertEqual(log.call_args.kwargs.get("level"), "verbose")

    async def test_with_the_permission_on_it_writes_under_the_plugins_own_home_and_answers_a_bare_name(self) -> None:
        self._save(True)
        out = await self.plugin.suggest_rag_corpus_tip("How do I heal?", "Rest at a bench.", "367520", "Hollow Knight", "boss")
        self.assertTrue(out["ok"], out)
        self.assertEqual(sorted(out), ["error", "file", "issue_url", "ok"])
        self.assertEqual(os.path.basename(out["file"]), out["file"])
        self.assertTrue(out["file"].startswith("hollow-knight-"))
        self.assertEqual(self._written(), [out["file"]])
        self.assertTrue(out["issue_url"].startswith("https://github.com/qd313/bonsAI/issues/new?title="))

    async def test_a_sixth_argument_or_a_folder_or_time_the_client_sends_is_refused_not_used(self) -> None:
        self._save(True)
        elsewhere = os.path.join(self.tmp.name, "elsewhere")
        os.makedirs(elsewhere)
        with self.assertRaises(TypeError):
            await self.plugin.suggest_rag_corpus_tip("q", "a", "1", "G", "mechanic", elsewhere)
        for extra in ({"folder": elsewhere}, {"home": elsewhere}, {"now": "2000-01-01"}):
            with self.assertRaises(TypeError):
                await self.plugin.suggest_rag_corpus_tip("q", "a", "1", "G", "mechanic", **extra)
        self.assertEqual(os.listdir(elsewhere), [])
        self.assertEqual(self._written(), [])

    async def test_a_path_like_app_name_changes_nothing_about_where_the_file_goes(self) -> None:
        self._save(True)
        for name in ("..\\..\\..\\evil", "../../../etc/passwd", "C:\\Windows\\x", "/abs/path", "a\x00b"):
            out = await self.plugin.suggest_rag_corpus_tip("q", "a", "../../1", name, "mechanic")
            self.assertTrue(out["ok"], out)
            self.assertEqual(os.path.basename(out["file"]), out["file"])
        self.assertEqual(len(self._written()), 5)
        self.assertEqual(os.listdir(self.home), ["Desktop"])
        self.assertEqual(os.listdir(os.path.join(self.home, "Desktop")), ["bonsAI_logs"])
        self.assertEqual(os.listdir(os.path.join(self.home, "Desktop", "bonsAI_logs")), ["suggested-tips"])

    async def test_every_argument_is_coerced_to_text(self) -> None:
        self._save(True)
        out = await self.plugin.suggest_rag_corpus_tip(None, 12345, 367520, None, 7)
        self.assertTrue(out["ok"], out)


if __name__ == "__main__":
    unittest.main()
