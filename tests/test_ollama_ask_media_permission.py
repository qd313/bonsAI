"""Title: A direct ask_ollama call never reads a picture with the screenshot permission off

Purpose: ask_ollama is a public plugin method, so the screen can call it directly and skip the
normal Ask path's own permission check. The 0.6.0 security review found it would then read the
named picture files and send them to the AI with media library access off (or the parental lock
on). This pins the refusal inside run_ask_ollama itself.
Used for: ollama_ask_service.run_ask_ollama.
Does not: talk to Ollama or read any file -- every such call is a mock that must stay uncalled.
"""

from __future__ import annotations

import unittest
from unittest.mock import patch

from test_ollama_ask_service import _FakePlugin  # also installs the decky and pwd stand-ins

from backend.services import capabilities
from backend.services.ollama_ask_service import run_ask_ollama

SHOT = [{"path": "/home/deck/shot.png", "name": "shot.png"}]


class MediaPermissionTests(unittest.IsolatedAsyncioTestCase):
    async def _ask(self, plugin: _FakePlugin):
        with (
            patch("backend.services.screenshot_media.prepare_attachment_images") as prep,
            patch("backend.services.ollama_ask_service.post_ollama_chat") as post,
            patch("backend.services.ollama_ask_service.list_installed_ollama_tags", return_value=["qwen2.5:3b"]),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
        ):
            prep.return_value = ([], [], [])
            post.return_value = {"success": True, "status": 200, "model": "qwen2.5:3b", "response": "ok"}
            out = await run_ask_ollama(plugin, "what is this", "127.0.0.1:11434", "", "", attachments=SHOT)
        return out, prep, post

    async def test_permission_off_reads_no_file_and_sends_nothing(self) -> None:
        plugin = _FakePlugin()
        plugin._settings["capabilities"] = {"media_library_access": False}
        out, prep, post = await self._ask(plugin)
        self.assertFalse(out.get("success"))
        self.assertIn("media library access", str(out.get("response")))
        prep.assert_not_called()
        post.assert_not_called()

    async def test_parental_lock_reads_no_file_even_with_permission_on(self) -> None:
        plugin = _FakePlugin()
        plugin._settings["capabilities"] = {"media_library_access": True}
        capabilities.set_kids_lock_active(True)
        self.addCleanup(capabilities.set_kids_lock_active, False)
        out, prep, post = await self._ask(plugin)
        self.assertFalse(out.get("success"))
        prep.assert_not_called()
        post.assert_not_called()

    async def test_permission_on_still_sends_the_picture(self) -> None:
        plugin = _FakePlugin()
        plugin._settings["capabilities"] = {"media_library_access": True}
        out, prep, post = await self._ask(plugin)
        prep.assert_called_once()
        post.assert_called()


if __name__ == "__main__":
    unittest.main()
