"""Tests for Ollama model fallback deprioritization."""

import unittest

from refactor_helpers import (
    BLOCKED_PULL_CATALOG_TAGS,
    ollama_tag_is_deprioritized,
    select_ollama_models,
    sort_models_deprioritized_last,
)


class ModelSelectionTests(unittest.TestCase):
    def test_deprioritized_tags_sort_last(self):
        tags = ["qwen2.5vl:3b", "llava:7b", "qwen2.5:3b"]
        out = sort_models_deprioritized_last(tags)
        self.assertEqual(out[-1], "llava:7b")
        self.assertEqual(out[0], "qwen2.5vl:3b")

    def test_select_ollama_models_puts_llava_after_essentials(self):
        models = select_ollama_models(True, "speed", False)
        self.assertIn("llava:7b", models)
        self.assertIn("qwen2.5vl:3b", models)
        self.assertLess(models.index("qwen2.5vl:3b"), models.index("llava:7b"))

    def test_legacy_vicuna_family_deprioritized(self):
        self.assertTrue(ollama_tag_is_deprioritized("vicuna:latest"))

    def test_blocked_pull_tags_frozen(self):
        self.assertIn("internvl3.5:38b", BLOCKED_PULL_CATALOG_TAGS)


if __name__ == "__main__":
    unittest.main()
