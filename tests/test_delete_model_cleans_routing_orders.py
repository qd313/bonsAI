"""Title: Removing a model takes it out of the saved try orders

Purpose: Pin that delete_ollama_model, after a successful `ollama rm`, drops the tag from the saved
text and vision try orders and leaves every other entry, and every other setting, alone.
Used for: main.py's delete_ollama_model (Remove from Deck on the AI models screen).
Solves: On the Deck (plan 64 flow H) qwen2.5:1.5b was removed through its row and the saved text
order still read ['qwen2.5:1.5b'] -- remove_tag_from_routing_orders existed and nothing called it,
so Ask's first choice was a model that was no longer installed.
Does not: Run ollama. The permission gate and `ollama rm` are faked.
"""

import unittest
from unittest.mock import AsyncMock, patch

from plugin_settings_file_harness import PluginSettingsFileMixin

import main
from main import Plugin


class DeleteModelCleansRoutingOrdersTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        gate = patch.object(Plugin, "_require_local_ollama_on_deck", AsyncMock(return_value=(True, None)))
        gate.start()
        self.addCleanup(gate.stop)

    async def _delete(self, tag: str, rm_ok: bool = True) -> dict:
        rm = AsyncMock(return_value=(rm_ok, "" if rm_ok else "rm failed"))
        with patch.object(main, "run_ollama_rm_async", rm):
            return await self.plugin.delete_ollama_model(tag)

    async def test_removed_model_leaves_both_saved_orders(self) -> None:
        self._write_settings(
            {
                "text_model_routing_order": ["qwen2.5:1.5b", "gemma4:e2b-it-qat"],
                "vision_model_routing_order": ["gemma4:e2b-it-qat", "qwen2.5:1.5b"],
                "desktop_app_log_level": "verbose",
            }
        )

        out = await self._delete("qwen2.5:1.5b")

        self.assertTrue(out["ok"])
        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["vision_model_routing_order"], ["gemma4:e2b-it-qat"])
        self.assertEqual(saved["desktop_app_log_level"], "verbose")

    async def test_the_deck_case_an_order_of_just_that_model_becomes_empty(self) -> None:
        self._write_settings({"text_model_routing_order": ["qwen2.5:1.5b"]})

        await self._delete("qwen2.5:1.5b")

        self.assertEqual(self._read_settings()["text_model_routing_order"], [])

    async def test_a_failed_remove_leaves_the_orders_alone(self) -> None:
        self._write_settings({"text_model_routing_order": ["qwen2.5:1.5b"]})

        out = await self._delete("qwen2.5:1.5b", rm_ok=False)

        self.assertFalse(out["ok"])
        self.assertEqual(self._read_settings()["text_model_routing_order"], ["qwen2.5:1.5b"])


if __name__ == "__main__":
    unittest.main()
