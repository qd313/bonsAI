"""get_reply_language_snapshot must await load_settings and return a usable snapshot.

Regression test. The RPC read ``self.load_settings()`` without awaiting it and then called
``.get()`` on the coroutine, so it raised ``AttributeError: 'coroutine' object has no attribute
'get'`` on **every** call, from the feature shipping until 2026-08-03.

Nothing caught it. The frontend hook swallows the failure and keeps its English default
(`useReplyLanguage.ts`), and `src/test-harness/fakeDeckyRpc.ts` stubs this RPC with a canned
object, so the TypeScript suite exercised the fake rather than the real backend. It was found by
driving the RPC surface directly against a deployed plugin.

Ask reply *content* was unaffected -- that reads `reply_language` from settings on the Ask path,
not from this snapshot. What broke was the plugin's own UI-string translation and the displayed
Steam client language, both of which silently fell back to English.
"""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

import main  # noqa: E402  (import side effects set up sys.path like the loader does)
from main import Plugin  # noqa: E402


class ReplyLanguageSnapshotRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings_path = os.path.join(self.tmp.name, "settings.json")
        with open(self.settings_path, "w", encoding="utf-8") as fh:
            json.dump({"reply_language": "english"}, fh)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.tmp.name

    async def test_returns_a_mapping_not_a_coroutine_error(self) -> None:
        """The original defect surfaced as AttributeError; assert a real payload comes back."""
        snapshot = await self.plugin.get_reply_language_snapshot()
        self.assertIsInstance(snapshot, dict)
        self.assertIn("effective", snapshot)
        self.assertIsInstance(snapshot["effective"], str)
        self.assertTrue(snapshot["effective"])

    async def test_honors_the_persisted_override(self) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as fh:
            json.dump({"reply_language": "english"}, fh)
        snapshot = await self.plugin.get_reply_language_snapshot()
        self.assertEqual(snapshot.get("effective"), "english")

    async def test_missing_settings_file_still_returns_a_snapshot(self) -> None:
        os.remove(self.settings_path)
        snapshot = await self.plugin.get_reply_language_snapshot()
        self.assertIsInstance(snapshot, dict)
        self.assertIn("effective", snapshot)


if __name__ == "__main__":
    unittest.main()
