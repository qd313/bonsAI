"""Title: Taking a model off the Deck keeps its name in the saved try order when a PC still has it

Purpose: Pin, on the saved settings file, that the two Deck-side clean-ups of the saved try orders
-- "Remove from Deck" (delete_ollama_model) and the look at the models list that drops entries this
Deck no longer holds (fetch_ollama_catalog_metadata) -- leave a name in both orders when a PC the
plugin knows (a saved host) answers that it has the same model, and still drop it when no saved PC
has it, when the PC does not answer, or when the PC only has other models.
Used for: main.py's delete_ollama_model and fetch_ollama_catalog_metadata (the AI models box).
Solves: The saved order is one list for whichever computer answers. Removing a model on the Deck
dropped its name even when the AI runs on a PC that has the same model, so the PC lost the place
(roadmap Bugs, found by reading the code in plan 79; call 7 of the plan 81 decisions).
Does not: Run ollama or reach a network. `ollama rm`, the Deck's list and each PC's list are faked;
the settings file is a real temp file and every assertion reads it back.
"""

import unittest
from unittest.mock import AsyncMock, patch

from backend_module_stubs import install_pwd_stub

install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

import main  # noqa: E402
from backend.services import ollama_embed_service as embed  # noqa: E402
from backend.services import ollama_pc_models  # noqa: E402

RPC = main.ollama_local_setup_rpc
PC_BASE = "http://192.168.1.20:11434"
OTHER_PC_BASE = "http://192.168.1.30:11434"


class DeckCleanupKeepsPcNamesTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        for target, new in (
            (RPC, ("_require_local_ollama_on_deck", AsyncMock(return_value=(True, None)))),
            (RPC, ("_internet_downloads_allowed", AsyncMock(return_value=False))),
        ):
            p = patch.object(target, new[0], new[1])
            p.start()
            self.addCleanup(p.stop)
        sizes = patch.object(RPC, "list_installed_ollama_tag_sizes", return_value={})
        sizes.start()
        self.addCleanup(sizes.stop)
        embed.reset_embed_availability_cache()
        self.addCleanup(embed.reset_embed_availability_cache)
        self.pc_models: dict[str, list[str]] = {}
        self.asked: list[str] = []

        def fake_pc_list(base: str, timeout_seconds: float = 5.0) -> list[str]:
            self.asked.append(base)
            return list(self.pc_models.get(base, []))

        pc = patch.object(ollama_pc_models, "list_installed_ollama_tags", side_effect=fake_pc_list)
        pc.start()
        self.addCleanup(pc.stop)

    def _settings(self, **extra: object) -> dict:
        base = {
            "ollama_local_on_deck": True,
            "named_ollama_hosts": [{"label": "Desktop", "host": "192.168.1.20"}],
            "text_model_routing_order": ["qwen2.5:1.5b", "gemma4:e2b-it-qat"],
            "vision_model_routing_order": ["gemma4:e2b-it-qat", "qwen2.5:1.5b"],
        }
        base.update(extra)
        return base

    async def _remove_on_deck(self, tag: str) -> dict:
        rm = AsyncMock(return_value=(True, ""))
        with patch.object(RPC, "run_ollama_rm_async", rm):
            return await self.plugin.delete_ollama_model(tag)

    async def _look(self, deck_has: list[str]) -> None:
        with patch.object(RPC, "list_installed_ollama_tags", return_value=list(deck_has)):
            await self.plugin.fetch_ollama_catalog_metadata(["gemma4:e2b-it-qat"])

    # --- Remove from Deck ---

    async def test_a_name_the_pc_still_has_stays_in_both_saved_orders(self) -> None:
        self._write_settings(self._settings())
        self.pc_models[PC_BASE] = ["qwen2.5:1.5b", "llama3:latest"]

        out = await self._remove_on_deck("qwen2.5:1.5b")

        self.assertTrue(out["ok"])
        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

    async def test_a_pc_that_lists_the_name_with_latest_still_counts(self) -> None:
        self._write_settings(self._settings(text_model_routing_order=["llama3", "gemma4:e2b-it-qat"]))
        self.pc_models[PC_BASE] = ["llama3:latest"]

        await self._remove_on_deck("llama3")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["llama3", "gemma4:e2b-it-qat"])

    async def test_a_name_no_pc_has_is_dropped_as_before(self) -> None:
        self._write_settings(self._settings())
        self.pc_models[PC_BASE] = ["something-else:1b"]

        await self._remove_on_deck("qwen2.5:1.5b")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_pc_that_does_not_answer_protects_nothing(self) -> None:
        # list_installed_ollama_tags answers [] for a PC that is off: an empty answer proves nothing.
        self._write_settings(self._settings())

        await self._remove_on_deck("qwen2.5:1.5b")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_with_no_saved_pc_the_removal_behaves_as_before_and_asks_nobody(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))

        await self._remove_on_deck("qwen2.5:1.5b")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(self.asked, [])

    async def test_a_name_that_is_in_no_order_does_not_wake_the_network(self) -> None:
        self._write_settings(self._settings())

        await self._remove_on_deck("never-in-the-order:1b")

        self.assertEqual(self.asked, [])

    async def test_the_second_of_two_saved_pcs_is_asked_too(self) -> None:
        hosts = [{"label": "A", "host": "192.168.1.20"}, {"label": "B", "host": "192.168.1.30:11434"}]
        self._write_settings(self._settings(named_ollama_hosts=hosts))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        await self._remove_on_deck("qwen2.5:1.5b")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])

    async def test_a_saved_host_that_is_this_deck_or_https_is_never_asked(self) -> None:
        hosts = [{"label": "Self", "host": "127.0.0.1"}, {"label": "Secure", "host": "https://pc.example"}]
        self._write_settings(self._settings(named_ollama_hosts=hosts))

        await self._remove_on_deck("qwen2.5:1.5b")

        self.assertEqual(self.asked, [])
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    # --- The look at the models list (a model removed outside the plugin) ---

    async def test_a_look_keeps_a_name_the_pc_has_that_the_deck_does_not(self) -> None:
        self._write_settings(self._settings())
        self.pc_models[PC_BASE] = ["qwen2.5:1.5b"]

        await self._look(["gemma4:e2b-it-qat"])

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

    async def test_a_look_still_drops_a_name_no_machine_has(self) -> None:
        self._write_settings(self._settings())
        self.pc_models[PC_BASE] = ["something-else:1b"]

        await self._look(["gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_look_with_nothing_to_drop_does_not_ask_the_pc(self) -> None:
        self._write_settings(self._settings())

        await self._look(["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

        self.assertEqual(self.asked, [])


if __name__ == "__main__":
    unittest.main()
