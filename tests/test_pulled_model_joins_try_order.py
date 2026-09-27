"""Title: A model downloaded from the picker joins the saved try order when it finishes

Purpose: The picker's downloads used to reach the saved try order only if the Settings panel
happened to be open and watching at the moment the download finished; close the menu or change
tab first and the new model never joined it. These pin the fix: the back end adds the model
itself, right where the download ends, and only when it ended well.
Used for: the custom-pull runner in ollama_local_setup_rpc._start_custom_ollama_pull.
Does not: Touch the network or run ``ollama pull``; the registry check and the pull are faked.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402
from backend.services import ollama_local_setup_rpc as setup_rpc  # noqa: E402


class PulledModelJoinsTryOrderTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()

    async def _pull(self, tag: str, *, ends_in: str) -> None:
        async def fake_setup(*, state, **_kwargs) -> None:
            state["phase"] = ends_in
            state["done"] = True

        with mock.patch.object(setup_rpc, "_require_local_ollama_on_deck", mock.AsyncMock(return_value=(True, None))), \
                mock.patch(
                    "backend.services.ollama_catalog_service.partition_pull_tags_by_registry",
                    return_value=([tag], []),
                ), \
                mock.patch.object(setup_rpc, "run_local_setup", side_effect=fake_setup):
            out = await setup_rpc.pull_ollama_models(self.plugin, [tag])
            self.assertTrue(out["accepted"])
            await self.plugin._local_ollama_setup_task

    async def test_finished_download_joins_the_saved_order(self) -> None:
        self._write_settings({"text_model_routing_order": ["gemma4:e2b"]})
        await self._pull("mistral:7b", ends_in="done")
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b", "mistral:7b"])

    async def test_failed_download_leaves_the_order_alone(self) -> None:
        self._write_settings({"text_model_routing_order": ["gemma4:e2b"]})
        await self._pull("mistral:7b", ends_in="failed")
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["gemma4:e2b"])


if __name__ == "__main__":
    unittest.main()
