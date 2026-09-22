"""merge_pulled_tags_into_routing_orders must extend saved try orders without replacing derived ones."""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


class MergePulledTagsRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_dir = self.tmp.name
        self.settings_path = os.path.join(self.settings_dir, "settings.json")
        os.makedirs(self.settings_dir, exist_ok=True)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    def _write_settings(self, data: dict) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def _read_settings(self) -> dict:
        with open(self.settings_path, encoding="utf-8") as f:
            return json.load(f)

    async def test_appends_pulled_tag_to_saved_text_order(self) -> None:
        self._write_settings({"text_model_routing_order": ["gemma4:e2b", "tinyllama"]})

        out = await self.plugin.merge_pulled_tags_into_routing_orders(["mistral:7b"])

        self.assertTrue(out["ok"])
        self.assertEqual(out["merged"], ["mistral:7b"])
        self.assertEqual(
            self._read_settings()["text_model_routing_order"],
            ["gemma4:e2b", "tinyllama", "mistral:7b"],
        )

    async def test_vision_capable_tag_reaches_both_orders(self) -> None:
        self._write_settings(
            {
                "text_model_routing_order": ["tinyllama"],
                "vision_model_routing_order": ["llava:7b"],
            }
        )

        await self.plugin.merge_pulled_tags_into_routing_orders(["qwen2.5vl:3b"])

        saved = self._read_settings()
        self.assertEqual(saved["text_model_routing_order"], ["tinyllama", "qwen2.5vl:3b"])
        self.assertEqual(saved["vision_model_routing_order"], ["llava:7b", "qwen2.5vl:3b"])

    async def test_text_only_tag_stays_out_of_vision_order(self) -> None:
        self._write_settings(
            {
                "text_model_routing_order": ["tinyllama"],
                "vision_model_routing_order": ["llava:7b"],
            }
        )

        await self.plugin.merge_pulled_tags_into_routing_orders(["mistral:7b"])

        saved = self._read_settings()
        self.assertIn("mistral:7b", saved["text_model_routing_order"])
        self.assertEqual(saved["vision_model_routing_order"], ["llava:7b"])

    async def test_empty_saved_orders_are_left_alone(self) -> None:
        """A derived order already contains anything just pulled; a one-tag write would replace it."""
        self._write_settings({"ask_mode": "speed"})

        out = await self.plugin.merge_pulled_tags_into_routing_orders(["mistral:7b"])

        self.assertTrue(out["ok"])
        self.assertEqual(out["merged"], [])
        self.assertEqual(out["reason"], "defaults_in_use")
        self.assertEqual(self._read_settings(), {"ask_mode": "speed"})

    async def test_high_vram_tag_goes_to_top_when_toggle_on(self) -> None:
        self._write_settings(
            {
                "model_allow_high_vram_fallbacks": True,
                "text_model_routing_order": ["tinyllama", "gemma4:e2b"],
            }
        )

        await self.plugin.merge_pulled_tags_into_routing_orders(["qwen2.5:32b"])

        self.assertEqual(
            self._read_settings()["text_model_routing_order"],
            ["qwen2.5:32b", "tinyllama", "gemma4:e2b"],
        )

    async def test_high_vram_tag_goes_to_bottom_when_toggle_off(self) -> None:
        self._write_settings(
            {
                "model_allow_high_vram_fallbacks": False,
                "text_model_routing_order": ["tinyllama", "gemma4:e2b"],
            }
        )

        await self.plugin.merge_pulled_tags_into_routing_orders(["qwen2.5:32b"])

        self.assertEqual(
            self._read_settings()["text_model_routing_order"],
            ["tinyllama", "gemma4:e2b", "qwen2.5:32b"],
        )

    async def test_merging_same_tag_twice_does_not_duplicate(self) -> None:
        self._write_settings({"text_model_routing_order": ["tinyllama"]})

        await self.plugin.merge_pulled_tags_into_routing_orders(["mistral:7b"])
        await self.plugin.merge_pulled_tags_into_routing_orders(["mistral:7b"])

        self.assertEqual(
            self._read_settings()["text_model_routing_order"],
            ["tinyllama", "mistral:7b"],
        )

    async def test_no_tags_reports_failure_without_writing(self) -> None:
        self._write_settings({"text_model_routing_order": ["tinyllama"]})

        for payload in ([], None, ["  "], "mistral:7b"):
            out = await self.plugin.merge_pulled_tags_into_routing_orders(payload)
            self.assertFalse(out["ok"])
            self.assertEqual(out["error"], "no_tags")

        self.assertEqual(self._read_settings()["text_model_routing_order"], ["tinyllama"])


if __name__ == "__main__":
    unittest.main()
