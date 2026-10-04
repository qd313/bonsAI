"""Title: Taking a model off the Deck keeps its name in the saved try order when a PC still has it

Purpose: Pin, on the saved settings file, that the two Deck-side clean-ups of the saved try orders
-- "Remove from Deck" (delete_ollama_model) and the look at the models list that drops entries this
Deck no longer holds (fetch_ollama_catalog_metadata) -- leave a name in both orders when a PC the
plugin knows (a saved host) answers that it has the same model, and still drop it when no saved PC
has it, when the PC does not answer, or when the PC only has other models.
The last class covers the other direction: when the plugin lists a PC's models and a saved name is
gone from that PC (and from this Deck and any other saved PC), it leaves both orders.
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

    async def _remove_on_deck(self, tag: str, *pc_ip: str) -> dict:
        rm = AsyncMock(return_value=(True, ""))
        with patch.object(RPC, "run_ollama_rm_async", rm):
            return await self.plugin.delete_ollama_model(tag, *pc_ip)

    async def _look(self, deck_has: list[str], *pc_ip: str) -> None:
        with patch.object(RPC, "list_installed_ollama_tags", return_value=list(deck_has)):
            await self.plugin.fetch_ollama_catalog_metadata(["gemma4:e2b-it-qat"], *pc_ip)

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

    async def test_a_typed_pc_address_that_is_not_a_saved_host_protects_the_name_too(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        await self._remove_on_deck("qwen2.5:1.5b", "192.168.1.30")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])

    async def test_an_old_call_without_the_address_still_works(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))

        out = await self._remove_on_deck("qwen2.5:1.5b")

        self.assertTrue(out["ok"])
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_name_no_pc_has_is_dropped_as_before(self) -> None:
        self._write_settings(self._settings())
        self.pc_models[PC_BASE] = ["something-else:1b"]

        await self._remove_on_deck("qwen2.5:1.5b")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_known_pc_that_does_not_answer_keeps_the_name_it_may_have(self) -> None:
        # list_installed_ollama_tags answers [] for a PC that is off: its list is unknown, so a name
        # that only it might hold cannot be ruled out, and the removal leaves both orders alone.
        self._write_settings(self._settings())

        await self._remove_on_deck("qwen2.5:1.5b")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

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

    # --- The AI models box: Remove, then the refresh it runs right after, both with the typed address ---
    # The Deck check of plan 81 (docs/test-evidence/plan81-P81-REMOVE-KEEPS-PC-PLACE.json): the PC was
    # typed on the Ollama tab only (no saved host), the removal kept the name, the refresh dropped it.

    async def _box_removes(self, tag: str, pc_ip: str) -> None:
        self.assertTrue((await self._remove_on_deck(tag, pc_ip))["ok"])
        await self._look(["gemma4:e2b-it-qat", "nomic-embed-text:latest"], pc_ip)

    async def test_the_refresh_after_a_removal_keeps_a_name_the_typed_pc_has(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        await self._box_removes("qwen2.5:1.5b", "192.168.1.30:11434")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

    async def test_a_name_the_typed_pc_does_not_have_still_leaves_both_orders(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["something-else:1b"]

        await self._box_removes("qwen2.5:1.5b", "192.168.1.30:11434")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_look_while_a_known_pc_is_silent_keeps_the_name_only_it_may_have(self) -> None:
        # The typed PC is off (or slow): nothing proves it lacks the name, so the look drops nothing.
        self._write_settings(self._settings(named_ollama_hosts=[]))

        await self._look(["gemma4:e2b-it-qat"], "192.168.1.30:11434")

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat", "qwen2.5:1.5b"])

    async def test_a_look_while_one_of_two_known_pcs_is_silent_drops_nothing(self) -> None:
        hosts = [{"label": "A", "host": "192.168.1.20"}]
        self._write_settings(self._settings(named_ollama_hosts=hosts))
        self.pc_models[PC_BASE] = ["something-else:1b"]  # answers, lacks the name; the typed one is silent

        await self._look(["gemma4:e2b-it-qat"], "192.168.1.30:11434")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])

    async def test_a_look_with_the_typed_address_keeps_a_name_the_deck_lacks(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        await self._look(["gemma4:e2b-it-qat"], "192.168.1.30:11434")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["qwen2.5:1.5b", "gemma4:e2b-it-qat"])

    async def test_a_look_without_an_address_behaves_as_before(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        await self._look(["gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def _removal_log(self, *tags: str) -> list[dict]:
        """The fields of each `local_setup.routing_remove` line written while removing `tags` (typed PC sent)."""
        logged: list[dict] = []

        async def spy(event: str, message: str, fields: dict | None = None, **_kw: object) -> None:
            if event == "local_setup.routing_remove":
                logged.append(dict(fields or {}))

        with patch.object(self.plugin, "_maybe_app_log", side_effect=spy):
            for tag in tags:
                await self._remove_on_deck(tag, "192.168.1.30:11434")
        return logged

    async def test_the_removal_logs_what_it_kept_and_what_it_dropped(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))
        self.pc_models[OTHER_PC_BASE] = ["qwen2.5:1.5b"]

        self.assertEqual(
            await self._removal_log("qwen2.5:1.5b", "gemma4:e2b-it-qat"),
            [
                {"kept_for_pc": "qwen2.5:1.5b", "dropped": "", "pc_address_sent": True, "pc_unreachable": False},
                {"kept_for_pc": "", "dropped": "gemma4:e2b-it-qat", "pc_address_sent": True, "pc_unreachable": False},
            ],
        )

    async def test_the_removal_log_says_when_a_known_pc_did_not_answer(self) -> None:
        self._write_settings(self._settings(named_ollama_hosts=[]))

        self.assertEqual(
            await self._removal_log("qwen2.5:1.5b"), [{"kept_for_pc": "qwen2.5:1.5b", "dropped": "", "pc_address_sent": True, "pc_unreachable": True}]
        )

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


DECK_BASE = ollama_pc_models.DEFAULT_BASE


class PcRemovalLeavesTheOrderTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    """A model taken off a PC leaves the saved order the next time the plugin lists that PC's models."""

    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self.lists: dict[str, list[str]] = {DECK_BASE: ["deck-only-model:1b"]}

        def fake_list(base: str, timeout_seconds: float = 5.0) -> list[str]:
            return list(self.lists.get(base, []))

        p = patch.object(ollama_pc_models, "list_installed_ollama_tags", side_effect=fake_list)
        p.start()
        self.addCleanup(p.stop)
        self._write_settings(
            {
                "ollama_local_on_deck": False,
                "named_ollama_hosts": [{"label": "Desktop", "host": "192.168.1.20"}],
                "text_model_routing_order": ["gone:7b", "gemma4:e2b-it-qat"],
                "vision_model_routing_order": ["gemma4:e2b-it-qat", "gone:7b"],
                "desktop_app_log_level": "verbose",
            }
        )

    def _raw(self) -> bytes:
        with open(self.settings_path, "rb") as f:
            return f.read()

    async def _pc_lists(self, models: list[str]) -> list[str]:
        return await ollama_pc_models.prune_orders_after_pc_listing(self.plugin, models)

    async def test_a_name_the_pc_no_longer_lists_leaves_both_saved_orders(self) -> None:
        out = await self._pc_lists(["gemma4:e2b-it-qat"])

        self.assertEqual(out, ["gone:7b"])
        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["desktop_app_log_level"], "verbose")

    async def test_a_name_this_deck_has_stays(self) -> None:
        self.lists[DECK_BASE] = ["gone:7b"]

        await self._pc_lists(["gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gone:7b", "gemma4:e2b-it-qat"])

    async def test_a_name_another_saved_pc_has_stays(self) -> None:
        self.lists["http://192.168.1.20:11434"] = ["gone:7b"]

        await self._pc_lists(["gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gone:7b", "gemma4:e2b-it-qat"])

    async def _pc_lists_deck_silent(self, set_up_on_deck: bool) -> list[str]:
        """The PC lists one model while this Deck's Ollama answers nothing (set up but stopped, or not set up)."""
        self.lists[DECK_BASE] = []
        with patch.object(ollama_pc_models, "local_ollama_cli_home_ready", return_value=set_up_on_deck):
            return await self._pc_lists(["gemma4:e2b-it-qat"])

    async def test_ollama_set_up_on_the_deck_but_not_answering_prunes_nothing(self) -> None:
        before = self._raw()
        self.assertEqual(await self._pc_lists_deck_silent(True), [])
        self.assertEqual(self._raw(), before)

    async def test_no_ollama_on_the_deck_at_all_the_pc_list_decides(self) -> None:
        self.assertEqual(await self._pc_lists_deck_silent(False), ["gone:7b"])
        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_no_ollama_on_the_deck_still_keeps_a_name_another_saved_pc_has(self) -> None:
        self.lists["http://192.168.1.20:11434"] = ["gone:7b"]
        await self._pc_lists_deck_silent(False)
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gone:7b", "gemma4:e2b-it-qat"])

    async def test_an_empty_listing_changes_nothing(self) -> None:
        before = self._raw()

        out = await self._pc_lists([])

        self.assertEqual(out, [])
        self.assertEqual(self._raw(), before)

    async def test_a_listing_that_holds_every_saved_name_writes_nothing(self) -> None:
        before = self._raw()

        await self._pc_lists(["gone:7b", "gemma4:e2b-it-qat"])

        self.assertEqual(self._raw(), before)

    async def test_a_model_being_downloaded_to_the_deck_keeps_its_place(self) -> None:
        self.plugin._local_ollama_setup_state = {"phase": "running", "done": False, "pull_tags": ["gone:7b"]}

        await self._pc_lists(["gemma4:e2b-it-qat"])

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gone:7b", "gemma4:e2b-it-qat"])


    # --- The wire: the connection test the box and the Ollama tab run ---

    async def _connection_test(self, address: str, result: dict) -> dict:
        from backend.services.ollama_connection_test import ConnectionTestOutcome

        outcome = ConnectionTestOutcome(result=result, host=address, timeout_seconds=10)
        with patch.object(main, "run_ollama_connection_test", AsyncMock(return_value=outcome)):
            return await self.plugin.test_ollama_connection(address, 10)

    async def test_a_reachable_pc_listing_cleans_the_saved_order(self) -> None:
        await self._connection_test("192.168.1.20", {"reachable": True, "models": ["gemma4:e2b-it-qat"]})

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b-it-qat"])

    async def test_a_test_of_this_decks_own_ollama_never_cleans_the_order(self) -> None:
        before = self._raw()

        await self._connection_test("127.0.0.1:11434", {"reachable": True, "models": ["gemma4:e2b-it-qat"]})

        self.assertEqual(self._raw(), before)

    async def test_an_unreachable_pc_or_an_empty_list_cleans_nothing(self) -> None:
        before = self._raw()

        await self._connection_test("192.168.1.20", {"reachable": False, "error": "x"})
        await self._connection_test("192.168.1.20", {"reachable": True, "models": []})

        self.assertEqual(self._raw(), before)


if __name__ == "__main__":
    unittest.main()

