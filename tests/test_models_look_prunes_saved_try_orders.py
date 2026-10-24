"""Title: A look at the models list drops removed models from the saved try orders

Purpose: Pin that when the AI models screen reads this Deck's own installed list (it calls
fetch_ollama_catalog_metadata right after the connection test) and the read succeeds with a
real list, a saved try-order entry for a model that is no longer installed is removed -- the
same cleanup "Remove from Deck" already does -- and that nothing is removed when the read
failed, when Ollama is not the Deck's own, or when the model is one the person is downloading.

Used for: main.py's fetch_ollama_catalog_metadata (the AI models screen, on open and refresh).

Solves: A model removed outside the plugin (`ollama rm` over SSH, plan 76 row
PULL-TRY-ORDER-01) stayed in the saved order for good: the try-order screen and the settings
file both named a model that was not there.

Does not: Run ollama. The list Ollama reports is faked; the settings file is a real temp file.
"""

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

REPO_ROOT = Path(__file__).resolve().parent.parent
for _path in (str(REPO_ROOT), str(REPO_ROOT / "py_modules")):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from backend_module_stubs import install_pwd_stub  # noqa: E402

install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

import main  # noqa: E402

RPC = main.ollama_local_setup_rpc


class ModelsLookPrunesSavedTryOrdersTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        # No registry traffic and no real Ollama in any of these tests.
        downloads = patch.object(RPC, "_internet_downloads_allowed", AsyncMock(return_value=False))
        downloads.start()
        self.addCleanup(downloads.stop)
        sizes = patch.object(RPC, "list_installed_ollama_tag_sizes", return_value={})
        sizes.start()
        self.addCleanup(sizes.stop)

    def _settings(self, **extra: object) -> dict:
        base = {
            "ollama_local_on_deck": True,
            "text_model_routing_order": ["gemma4:e2b-it-qat", "qwen2.5:1.5b"],
            "vision_model_routing_order": ["qwen2.5vl:3b", "gemma4:e2b-it-qat"],
            "desktop_app_log_level": "verbose",
        }
        base.update(extra)
        return base

    async def _look(self, installed: list[str]) -> None:
        """What the screen does on open: ask for the metadata while Ollama lists `installed`."""
        with patch.object(RPC, "list_installed_ollama_tags", return_value=list(installed)):
            await self.plugin.fetch_ollama_catalog_metadata(["gemma4:e2b-it-qat"])

    def _raw(self) -> bytes:
        with open(self.settings_path, "rb") as f:
            return f.read()

    async def test_a_model_removed_outside_the_plugin_leaves_both_saved_orders(self) -> None:
        self._write_settings(self._settings())

        await self._look(["gemma4:e2b-it-qat", "nomic-embed-text:latest"])

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["desktop_app_log_level"], "verbose")

    async def test_an_unreachable_ollama_leaves_the_saved_orders_exactly_as_they_were(self) -> None:
        self._write_settings(self._settings())
        before = self._raw()

        # list_installed_ollama_tags answers [] when it cannot reach Ollama; so does an empty
        # store, which is why an empty list never prunes anything.
        await self._look([])

        self.assertEqual(self._raw(), before)

    async def test_a_list_read_that_raises_leaves_the_saved_orders_alone(self) -> None:
        self._write_settings(self._settings())
        before = self._raw()

        with patch.object(RPC, "list_installed_ollama_tags", side_effect=OSError("connection refused")):
            await self.plugin.fetch_ollama_catalog_metadata(["gemma4:e2b-it-qat"])

        self.assertEqual(self._raw(), before)

    async def test_the_order_of_a_pc_on_the_network_is_left_alone(self) -> None:
        # Ollama is not the Deck's own: the saved order belongs to the PC's Ollama, which is
        # not what this call reads. Even a list that lacks every saved tag changes nothing.
        self._write_settings(self._settings(ollama_local_on_deck=False, ollama_ip="192.168.1.20"))
        before = self._raw()

        await self._look(["something-else:1b"])

        self.assertEqual(self._raw(), before)

    async def test_a_model_the_person_is_downloading_right_now_stays(self) -> None:
        self._write_settings(self._settings())
        self.plugin._local_ollama_setup_state = {
            "phase": "running",
            "done": False,
            "pull_tags": ["qwen2.5:1.5b"],
        }

        await self._look(["gemma4:e2b-it-qat"])

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

    async def test_a_tag_written_without_latest_matches_the_installed_latest(self) -> None:
        self._write_settings(self._settings(text_model_routing_order=["llama3", "gone:1b"]))

        await self._look(["llama3:latest", "gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["llama3"])

    async def test_nothing_missing_writes_nothing(self) -> None:
        self._write_settings(self._settings(vision_model_routing_order=["gemma4:e2b-it-qat"]))
        before = self._raw()

        await self._look(["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

        self.assertEqual(self._raw(), before)

    async def test_the_pruning_is_logged_once_with_what_and_why(self) -> None:
        self._write_settings(self._settings())
        lines: list[tuple] = []

        async def fake_log(event, message, **kw):  # noqa: ANN001
            lines.append((event, message, kw.get("fields")))

        with patch.object(self.plugin, "_maybe_app_log", side_effect=fake_log):
            await self._look(["gemma4:e2b-it-qat"])

        pruned = [x for x in lines if x[0] == "local_setup.routing_prune"]
        self.assertEqual(len(pruned), 1)
        self.assertIn("qwen2.5:1.5b", json.dumps(pruned[0][2]))
        self.assertIn("qwen2.5vl:3b", json.dumps(pruned[0][2]))
        self.assertIn("not installed", pruned[0][1])


if __name__ == "__main__":
    unittest.main()
