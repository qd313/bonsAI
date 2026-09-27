"""Title: Nothing downloads while the Internet downloads permission is off

Purpose: Pin the download permission end to end on the back end. It is a switch in the
Permissions tab, off on a fresh install and on an old settings file, forced off by the kids lock.
While it is off, every way bonsAI downloads something is refused before it reaches the internet:
installing or updating Ollama, pulling a model (including the meaning-search model), the voice
engine and its models, and the knowledge library. The two things that reached the internet on
their own when the models screen opened -- the recommended-models list from GitHub and the size
lookups at registry.ollama.ai -- stay offline too.
Used for: capabilities.py (the switch), ollama_local_setup_rpc.py, rag_corpus_rpc.py and
voice_rpc.py (the refusals).
Does not: Touch the network. Every call that would reach it is replaced with one that fails the
test if it runs.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

import main  # noqa: E402
from backend.services import capabilities  # noqa: E402
from backend.services import ollama_local_setup_rpc as setup_rpc  # noqa: E402
from backend.services import pull_model_catalog_service as catalog  # noqa: E402
from backend.services import rag_corpus_rpc  # noqa: E402

OFF = {"ollama_local_on_deck": True, "capabilities": {"microphone_access": True}}
ON = {
    "ollama_local_on_deck": True,
    "capabilities": {"microphone_access": True, "internet_downloads": True},
}


def _must_not_run(*_a, **_k):
    raise AssertionError("reached the internet while downloads were off")


class TheSwitchItself(unittest.TestCase):
    def tearDown(self) -> None:
        capabilities.set_kids_lock_active(False)

    def test_off_on_a_fresh_install(self) -> None:
        self.assertIn("internet_downloads", capabilities.CAPABILITY_KEYS)
        self.assertFalse(capabilities.sanitize_capabilities(None)["internet_downloads"])

    def test_off_on_a_settings_file_from_before_the_switches(self) -> None:
        self.assertFalse(capabilities.legacy_grandfather_capabilities()["internet_downloads"])

    def test_kids_lock_forces_it_off(self) -> None:
        settings = {"capabilities": {"internet_downloads": True}}
        self.assertTrue(capabilities.capability_enabled(settings, "internet_downloads"))
        capabilities.set_kids_lock_active(True)
        self.assertFalse(capabilities.capability_enabled(settings, "internet_downloads"))


class DownloadsRefusedWhileOff(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings(OFF)

    def assertRefused(self, out: dict) -> None:
        self.assertFalse(out.get("accepted"))
        self.assertEqual(out.get("error"), "downloads_off")

    async def test_ollama_install_and_update(self) -> None:
        with mock.patch.object(setup_rpc, "run_local_setup", side_effect=_must_not_run):
            for profile in ("tier1_essentials", "tier2_multimodal", "update_installed"):
                self.assertRefused(await self.plugin.start_local_ollama_setup({"profile": profile}))

    async def test_model_pull(self) -> None:
        with mock.patch(
            "backend.services.ollama_catalog_service.partition_pull_tags_by_registry",
            side_effect=_must_not_run,
        ), mock.patch.object(setup_rpc, "run_local_setup", side_effect=_must_not_run):
            self.assertRefused(await self.plugin.pull_ollama_models(["nomic-embed-text"]))

    async def test_knowledge_library_download_and_update(self) -> None:
        with mock.patch.object(rag_corpus_rpc, "run_rag_corpus_download", side_effect=_must_not_run), \
                mock.patch.object(rag_corpus_rpc, "fetch_remote_manifest", side_effect=_must_not_run):
            self.assertRefused(await self.plugin.start_rag_corpus_download({}))
            out = await self.plugin.update_rag_corpus()
            self.assertFalse(out.get("ok"))
            self.assertEqual(out.get("error"), "downloads_off")

    async def test_voice_engine(self) -> None:
        with mock.patch("backend.services.voice_rpc.install_whisper_cli", side_effect=_must_not_run), \
                mock.patch("backend.services.voice_rpc.download_voice_model", side_effect=_must_not_run):
            self.assertRefused(await self.plugin.install_voice_engine("tiny.en"))

    async def test_recommended_list_stays_offline(self) -> None:
        with mock.patch.object(catalog, "_fetch_remote_overlay", side_effect=_must_not_run), \
                mock.patch.object(catalog, "_read_cache", return_value=None):
            out = await self.plugin.fetch_pull_model_catalog({"force": True})
        self.assertEqual(out["source"], "bundled")
        self.assertEqual(out["error"], "downloads_off")

    async def test_size_lookups_stay_offline(self) -> None:
        with mock.patch.object(setup_rpc, "fetch_catalog_metadata", side_effect=_must_not_run), \
                mock.patch.object(setup_rpc, "list_installed_ollama_tag_sizes", return_value={"a:1": 5}):
            out = await self.plugin.fetch_ollama_catalog_metadata(["a:1", "b:2"])
        # The Deck's own Ollama still answers for what is installed; nothing else is asked.
        self.assertEqual(out["tags"], {"a:1": {"size_bytes": 5, "exists": True}})


class DownloadsAllowedWhileOn(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings(ON)

    async def test_model_pull_starts(self) -> None:
        async def fake_setup(**_kwargs) -> None:
            return None

        with mock.patch(
            "backend.services.ollama_catalog_service.partition_pull_tags_by_registry",
            return_value=(["mistral:7b"], []),
        ), mock.patch.object(setup_rpc, "run_local_setup", side_effect=fake_setup):
            out = await self.plugin.pull_ollama_models(["mistral:7b"])
            await self.plugin._local_ollama_setup_task
        self.assertTrue(out["accepted"])

    async def test_recommended_list_may_refresh(self) -> None:
        with mock.patch.object(catalog, "_fetch_remote_overlay", return_value=(None, "offline")), \
                mock.patch.object(catalog, "_read_cache", return_value=None):
            out = await self.plugin.fetch_pull_model_catalog({"force": True})
        self.assertEqual(out["error"], "offline")


if __name__ == "__main__":
    unittest.main()
