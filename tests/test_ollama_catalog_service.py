"""Tests for Ollama catalog tag validation and metadata helpers."""

import unittest

from backend.services.ollama_catalog_service import (
    is_valid_ollama_pull_tag,
    normalize_ollama_pull_tags,
    split_ollama_tag,
)


class TestOllamaCatalogService(unittest.TestCase):
    def test_valid_tags(self):
        self.assertTrue(is_valid_ollama_pull_tag("llama3.2:3b"))
        self.assertTrue(is_valid_ollama_pull_tag("qwen2.5vl:3b"))
        self.assertTrue(is_valid_ollama_pull_tag("qwen3.5:4b"))
        self.assertTrue(is_valid_ollama_pull_tag("moondream"))

    def test_rejects_shell_metacharacters(self):
        self.assertFalse(is_valid_ollama_pull_tag("foo; rm -rf /"))
        self.assertFalse(is_valid_ollama_pull_tag("$(whoami)"))
        self.assertFalse(is_valid_ollama_pull_tag("tag with spaces"))

    def test_normalize_dedupes(self):
        self.assertEqual(
            normalize_ollama_pull_tags(["llama3.2:3b", "llama3.2:3b", "bad tag"]),
            ["llama3.2:3b"],
        )

    def test_split_tag(self):
        self.assertEqual(split_ollama_tag("gemma3:4b"), ("gemma3", "4b"))
        self.assertEqual(split_ollama_tag("moondream"), ("moondream", "latest"))


if __name__ == "__main__":
    unittest.main()
