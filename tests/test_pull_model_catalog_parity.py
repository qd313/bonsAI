"""Parity between Pull Models catalog licenseClass and model_policy routing."""

from __future__ import annotations

import unittest

from backend.services.model_policy import classify_ollama_model_name

# Keep in sync with src/data/pullModelCatalog.ts PULL_MODEL_CATALOG tags + licenseClass.
CATALOG_POLICY_PARITY: dict[str, str] = {
    "qwen2.5vl:3b": "foss",
    "qwen3.5:4b": "foss",
    "gemma4:e2b-it-qat": "open_weight",
    "qwen3:4b": "foss",
    "qwen2.5:7b": "foss",
    "llava:7b": "foss",
    "gemma4:latest": "open_weight",
    "gemma3:4b": "open_weight",
    "qwen3:1.7b": "foss",
    "gemma3:1b": "open_weight",
    "qwen2.5:3b": "foss",
    "qwen2.5:1.5b": "foss",
    "llama3.2:3b": "open_weight",
    "llama3.2:1b": "open_weight",
    "moondream": "unknown",
    "qwen2.5:14b": "foss",
    "minicpm-v:8b": "unknown",
    "llama3.2-vision:11b": "open_weight",
    "deepseek-r1:1.5b": "open_weight",
    "llava-phi3": "foss",
    "qwen2.5-coder:3b": "foss",
}


class TestPullModelCatalogParity(unittest.TestCase):
    def test_catalog_tags_match_model_policy(self):
        for tag, expected in CATALOG_POLICY_PARITY.items():
            self.assertEqual(
                classify_ollama_model_name(tag),
                expected,
                msg=f"{tag}: catalog licenseClass must match classify_ollama_model_name",
            )


if __name__ == "__main__":
    unittest.main()
