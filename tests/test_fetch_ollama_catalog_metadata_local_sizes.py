"""Title: An installed model's size comes from this Deck's own Ollama first

Purpose: Pin that fetch_ollama_catalog_metadata (the "Installed N * X GB" header and the
"remove this model" confirm box's own size line) asks this Deck's own /api/tags for a tag that
is already installed, and only asks registry.ollama.ai for a tag that is not.

Used for: main.py's fetch_ollama_catalog_metadata, called from the AI models screen on mount and
on refresh.

Solves: nomic-embed-text (the meaning-search model plan 70's own knowledge base installs, outside
the curated catalog) showed "?" for its size, and the header undercounted the installed total, on
the Deck (docs/test-evidence/plan70-ROUTING-MERGE-SIZE-01.json). The only size lookup asked
registry.ollama.ai for every requested tag, installed or not, and the registry does not answer
for this one -- so it fell through to no size at all, even though Ollama's own /api/tags already
reports it (274 MB). The registry is still the right place to ask "how big would this be if I
pulled it" for a tag not yet on this Deck; it should never be asked about one that already is.

Does not: Run ollama or reach the real registry. Both are faked.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# So this file also runs on its own on Windows (matches scripts/run_python_tests.py, which puts
# the repo root and py_modules on sys.path the same way Decky Loader does), not only after
# unittest discover has already loaded another file that put them there first.
REPO_ROOT = Path(__file__).resolve().parent.parent
for _path in (str(REPO_ROOT), str(REPO_ROOT / "py_modules")):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from backend_module_stubs import install_pwd_stub  # noqa: E402

install_pwd_stub()  # so this file also runs on its own on Windows, not only after another installs it

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

import main  # noqa: E402


class FetchOllamaCatalogMetadataLocalSizesTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        gate = patch.object(
            main.ollama_local_setup_rpc,
            "_require_local_ollama_on_deck",
            AsyncMock(return_value=(True, None)),
        )
        gate.start()
        self.addCleanup(gate.stop)
        # Asking the registry is a download; these tests are about which tags it is asked for.
        downloads = patch.object(
            main.ollama_local_setup_rpc,
            "_internet_downloads_allowed",
            AsyncMock(return_value=True),
        )
        downloads.start()
        self.addCleanup(downloads.stop)

    async def test_an_installed_tag_gets_its_size_from_local_api_tags_not_the_registry(self) -> None:
        # The real /api/tags shape reported on the Deck (docs/test-evidence/
        # plan70-ROUTING-MERGE-SIZE-01.json): nomic-embed-text:latest, about 274 MB.
        local_sizes = patch.object(
            main.ollama_local_setup_rpc,
            "list_installed_ollama_tag_sizes",
            return_value={"nomic-embed-text:latest": 274302450},
        )
        registry = patch.object(
            main.ollama_local_setup_rpc,
            "fetch_catalog_metadata",
            side_effect=AssertionError("the registry should never be asked about an installed tag"),
        )
        local_sizes.start()
        self.addCleanup(local_sizes.stop)
        registry.start()
        self.addCleanup(registry.stop)

        out = await self.plugin.fetch_ollama_catalog_metadata(["nomic-embed-text:latest"])

        self.assertEqual(out["tags"]["nomic-embed-text:latest"]["size_bytes"], 274302450)
        self.assertTrue(out["tags"]["nomic-embed-text:latest"]["exists"])
        self.assertEqual(out["source"], "live")

    async def test_a_tag_not_installed_still_asks_the_registry(self) -> None:
        local_sizes = patch.object(
            main.ollama_local_setup_rpc,
            "list_installed_ollama_tag_sizes",
            return_value={},
        )
        registry = patch.object(
            main.ollama_local_setup_rpc,
            "fetch_catalog_metadata",
            return_value={
                "source": "live",
                "error": "",
                "tags": {"qwen2.5:1.5b": {"size_bytes": 986_000_000, "exists": True}},
                "fetched_at": 1700000000,
            },
        )
        local_sizes.start()
        self.addCleanup(local_sizes.stop)
        registry_mock = registry.start()
        self.addCleanup(registry.stop)

        out = await self.plugin.fetch_ollama_catalog_metadata(["qwen2.5:1.5b"])

        registry_mock.assert_called_once_with(["qwen2.5:1.5b"])
        self.assertEqual(out["tags"]["qwen2.5:1.5b"]["size_bytes"], 986_000_000)

    async def test_one_installed_and_one_not_only_the_uninstalled_one_reaches_the_registry(self) -> None:
        local_sizes = patch.object(
            main.ollama_local_setup_rpc,
            "list_installed_ollama_tag_sizes",
            return_value={"nomic-embed-text:latest": 274302450},
        )
        registry = patch.object(
            main.ollama_local_setup_rpc,
            "fetch_catalog_metadata",
            return_value={
                "source": "live",
                "error": "",
                "tags": {"qwen2.5:1.5b": {"size_bytes": 986_000_000, "exists": True}},
                "fetched_at": 1700000000,
            },
        )
        local_sizes.start()
        self.addCleanup(local_sizes.stop)
        registry_mock = registry.start()
        self.addCleanup(registry.stop)

        out = await self.plugin.fetch_ollama_catalog_metadata(
            ["nomic-embed-text:latest", "qwen2.5:1.5b"]
        )

        registry_mock.assert_called_once_with(["qwen2.5:1.5b"])
        self.assertEqual(out["tags"]["nomic-embed-text:latest"]["size_bytes"], 274302450)
        self.assertEqual(out["tags"]["qwen2.5:1.5b"]["size_bytes"], 986_000_000)


if __name__ == "__main__":
    unittest.main()
