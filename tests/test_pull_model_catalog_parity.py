"""Parity between Pull Models catalog licenseClass and model_policy routing."""

from __future__ import annotations

import unittest

from backend.ollama.model_policy import classify_ollama_model_name

# Keep in sync with src/features/models/pullModelCatalog.ts PULL_MODEL_CATALOG tags + licenseClass.
CATALOG_POLICY_PARITY: dict[str, str] = {
    "qwen2.5vl:3b": "open_weight",
    "qwen3.5:4b": "foss",
    "gemma4:e2b-it-qat": "foss",
    "qwen3:4b": "foss",
    "qwen2.5:7b": "foss",
    "llava:7b": "foss",
    "gemma4:latest": "foss",
    "gemma3:4b": "open_weight",
    "qwen3:1.7b": "foss",
    "gemma3:1b": "open_weight",
    "qwen2.5:3b": "open_weight",
    "qwen2.5:1.5b": "foss",
    "llama3.2:3b": "open_weight",
    "llama3.2:1b": "open_weight",
    "moondream": "foss",
    "qwen2.5:14b": "foss",
    "minicpm-v:8b": "unknown",
    "llama3.2-vision:11b": "open_weight",
    "gemma4:12b-it-qat": "foss",
    "qwen3.5:9b": "foss",
    "granite4.2:8b": "foss",
    "gemma4:e4b-it-qat": "foss",
    "lfm2.5:8b": "open_weight",
    "deepseek-r1:1.5b": "foss",
    "llava-phi3": "foss",
    "qwen2.5-coder:3b": "open_weight",
    "qwen3:0.6b": "foss",
    "qwen3.5:0.8b": "foss",
    "qwen3.5:2b": "foss",
    "qwen3-vl:2b": "foss",
    "qwen3-vl:4b": "foss",
    "gemma3:270m": "open_weight",
    "smollm2:1.7b": "foss",
    "phi3:3.8b": "foss",
    "mistral:7b": "foss",
    "llama3.1:8b": "open_weight",
    "qwen3:8b": "foss",
    "qwen3:14b": "foss",
    "qwen3-vl:8b": "foss",
    "gemma3:12b": "open_weight",
    "phi4:14b": "foss",
    "qwen2.5vl:7b": "foss",
    "deepseek-r1:7b": "foss",
    "qwen2.5-coder:7b": "foss",
    "qwen3.5:27b": "foss",
    "gemma3:27b": "open_weight",
    "gemma4:26b": "foss",
    "gpt-oss:20b": "foss",
}


class TestPullModelCatalogParity(unittest.TestCase):
    def test_catalog_tags_match_model_policy(self):
        for tag, expected in CATALOG_POLICY_PARITY.items():
            self.assertEqual(
                classify_ollama_model_name(tag),
                expected,
                msg=f"{tag}: catalog licenseClass must match classify_ollama_model_name",
            )


class TestOpenLicenceExactTags(unittest.TestCase):
    """Five tags are open in a family whose other tags are not: only those exact tags are classed open source."""

    def test_the_listed_tags_are_open_source(self):
        for tag in ("mistral:7b", "deepseek-r1:1.5b", "deepseek-r1:7b", "smollm2:1.7b", "moondream", "moondream:latest"):
            self.assertEqual(classify_ollama_model_name(tag), "foss", msg=tag)
        # A repo prefix and capitals do not change the answer.
        self.assertEqual(classify_ollama_model_name("library/Mistral:7B"), "foss")

    def test_the_rest_of_a_limited_family_stays_as_it_was(self):
        # Other Mistral sizes and tags use other licences; DeepSeek's 8b and 70b are built on Llama.
        for tag in ("mistral", "mistral:latest", "mistral:7b-instruct", "mistral-nemo:12b", "mixtral:8x7b"):
            self.assertEqual(classify_ollama_model_name(tag), "open_weight", msg=tag)
        for tag in ("deepseek-r1", "deepseek-r1:8b", "deepseek-r1:14b", "deepseek-r1:70b", "deepseek-coder:6.7b"):
            self.assertEqual(classify_ollama_model_name(tag), "open_weight", msg=tag)
        for tag in ("smollm2:360m", "smollm2", "moondream:2"):
            self.assertEqual(classify_ollama_model_name(tag), "unknown", msg=tag)


if __name__ == "__main__":
    unittest.main()
