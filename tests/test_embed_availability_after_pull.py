"""Title: A finished pull of the meaning-search model is seen straight away

Purpose: Whether the meaning-search model is installed is remembered for 30 seconds, so a
question does not ask Ollama every time. Right after the model is pulled, that memory still
says "missing": the knowledge-base hint stayed up and Ask skipped meaning search for up to
30 seconds after the model had landed. These pin the fix: when a pull that included the
model finishes, the memory is dropped, so the next check asks Ollama again. A pull of some
other model leaves it alone -- Ask relies on it.
Used for: ollama_embed_service.forget_embed_availability_after_pull and the custom-pull
runner in ollama_local_setup_rpc._start_custom_ollama_pull.
Does not: Touch the network; the installed-model list and the pull itself are faked.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from main import Plugin  # noqa: E402
from backend.services import ollama_embed_service as embed  # noqa: E402
from backend.services import ollama_local_setup_rpc as setup_rpc  # noqa: E402

DECK = "127.0.0.1"


def _available_with(tags: list[str]) -> bool:
    with mock.patch.object(embed, "list_installed_ollama_tags", return_value=tags):
        return embed.nomic_embed_available(DECK)


class ForgetAfterPullTests(unittest.TestCase):
    def setUp(self) -> None:
        embed.reset_embed_availability_cache()

    def tearDown(self) -> None:
        embed.reset_embed_availability_cache()

    def test_memory_still_holds_without_a_pull(self) -> None:
        self.assertFalse(_available_with([]))
        # Within 30 s the remembered "missing" still answers, as Ask relies on.
        self.assertFalse(_available_with(["nomic-embed-text:latest"]))

    def test_pull_of_the_model_drops_the_memory(self) -> None:
        self.assertFalse(_available_with([]))
        embed.forget_embed_availability_after_pull(["nomic-embed-text"])
        self.assertTrue(_available_with(["nomic-embed-text:latest", "gemma4:e2b-it-qat"]))

    def test_pull_of_another_model_keeps_the_memory(self) -> None:
        self.assertFalse(_available_with([]))
        embed.forget_embed_availability_after_pull(["gemma4:e2b-it-qat"])
        self.assertFalse(_available_with(["nomic-embed-text:latest"]))


class CustomPullRunnerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        embed.reset_embed_availability_cache()

    def tearDown(self) -> None:
        embed.reset_embed_availability_cache()

    async def test_finished_pull_makes_the_next_check_fresh(self) -> None:
        self.assertFalse(_available_with([]))

        async def fake_setup(**_kwargs) -> None:
            return None

        plugin = Plugin()
        with mock.patch.object(setup_rpc, "_require_local_ollama_on_deck", mock.AsyncMock(return_value=(True, None))), \
                mock.patch(
                    "backend.services.ollama_catalog_service.partition_pull_tags_by_registry",
                    return_value=(["nomic-embed-text"], []),
                ), \
                mock.patch.object(setup_rpc, "run_local_setup", side_effect=fake_setup):
            out = await setup_rpc.pull_ollama_models(plugin, ["nomic-embed-text"])
            self.assertTrue(out["accepted"])
            await plugin._local_ollama_setup_task

        self.assertTrue(_available_with(["nomic-embed-text:latest"]))


if __name__ == "__main__":
    unittest.main()
