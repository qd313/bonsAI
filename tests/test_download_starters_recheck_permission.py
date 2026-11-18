"""Plan 106, lane R2 (security review item 2): a download cannot start after the switch has gone off.

Each starter checked the Internet downloads permission, then waited (for a network check or for the start lock),
and only then started its task. Here the permission goes off during that wait, through the real settings file, and
the starter must refuse with the downloads-off answer and start nothing.
"""

import asyncio
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from plugin_settings_file_harness import PluginSettingsFileMixin

from backend.knowledge import rag_corpus_rpc  # noqa: E402
from backend.ollama import ollama_catalog_service, ollama_local_setup_rpc as setup_rpc  # noqa: E402
from backend.voice import voice_rpc  # noqa: E402

ALLOWED = {
    "ollama_local_on_deck": True,
    "capabilities": {"internet_downloads": True, "microphone_access": True, "filesystem_write": True},
}
NOW_OFF = {**ALLOWED, "capabilities": {**ALLOWED["capabilities"], "internet_downloads": False}}


class AStarterReChecksThePermissionBeforeItStarts(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings(ALLOWED)

    def _assert_refused(self, out: dict) -> None:
        self.assertEqual((out.get("accepted"), out.get("error")), (False, "downloads_off"), out)

    async def _off_while_waiting_for(self, lock: asyncio.Lock, start) -> dict:
        """Hold `lock`, begin `start()`, turn the permission off while it waits, then let it go."""
        await lock.acquire()
        pending = asyncio.create_task(start())
        await asyncio.sleep(0.05)
        self._write_settings(NOW_OFF)
        lock.release()
        return await asyncio.wait_for(pending, timeout=3)

    async def test_the_model_download_when_the_permission_goes_off_during_the_registry_check(self) -> None:
        def registry_check_during_which_the_switch_goes_off(tags):
            self._write_settings(NOW_OFF)
            return list(tags), []

        with patch.object(ollama_catalog_service, "partition_pull_tags_by_registry", registry_check_during_which_the_switch_goes_off), patch.object(
            setup_rpc, "run_local_setup", AsyncMock()
        ) as run:
            out = await self.plugin.pull_ollama_models(["gemma4:e2b-it-qat"])
        self._assert_refused(out)
        run.assert_not_called()
        self.assertIsNone(self.plugin._local_ollama_setup_task)

    async def test_the_setup_start_when_the_permission_goes_off_while_it_waits_for_the_lock(self) -> None:
        with patch.object(setup_rpc, "run_local_setup", AsyncMock()) as run:
            out = await self._off_while_waiting_for(
                self.plugin._local_ollama_setup_lock, lambda: self.plugin.start_local_ollama_setup({"profile": "tier1_essentials"})
            )
        self._assert_refused(out)
        run.assert_not_called()
        self.assertIsNone(self.plugin._local_ollama_setup_task)

    async def test_the_library_download_when_the_permission_goes_off_while_it_waits_for_the_lock(self) -> None:
        with tempfile.TemporaryDirectory() as d, patch.object(rag_corpus_rpc, "default_corpus_dir_internal", return_value=d), patch.object(
            rag_corpus_rpc, "run_rag_corpus_download", AsyncMock()
        ) as run:
            out = await self._off_while_waiting_for(
                self.plugin._rag_corpus_download_lock, lambda: self.plugin.start_rag_corpus_download({})
            )
        self._assert_refused(out)
        run.assert_not_called()
        self.assertIsNone(self.plugin._rag_corpus_download_task)

    async def test_the_voice_install_when_the_permission_goes_off_while_it_waits_for_the_lock(self) -> None:
        with patch.object(voice_rpc, "install_whisper_cli") as install:
            out = await self._off_while_waiting_for(
                self.plugin._voice_install_lock, lambda: self.plugin.install_voice_engine("tiny.en")
            )
        self._assert_refused(out)
        install.assert_not_called()
        self.assertIsNone(self.plugin._voice_install_task)

    async def test_with_the_permission_still_on_the_voice_install_and_library_still_start(self) -> None:
        with tempfile.TemporaryDirectory() as d, patch.object(rag_corpus_rpc, "default_corpus_dir_internal", return_value=d), patch.object(
            rag_corpus_rpc, "run_rag_corpus_download", AsyncMock()
        ), patch.object(voice_rpc, "install_whisper_cli"), patch.object(voice_rpc, "download_voice_model"):
            library = await self.plugin.start_rag_corpus_download({})
            voice = await self.plugin.install_voice_engine("tiny.en")
            await asyncio.sleep(0.05)
        self.assertTrue(library.get("accepted"), library)
        self.assertTrue(voice.get("accepted"), voice)


if __name__ == "__main__":
    unittest.main()
