"""Tests for heuristic Ollama model policy classification and filtering."""

import unittest

from backend.services.model_policy import (
    classify_ollama_model_name,
    empty_filter_user_message,
    filter_model_list,
    reconcile_model_policy_tier,
)


class ModelPolicyTests(unittest.TestCase):
    def test_classify_qwen_llava_foss(self):
        self.assertEqual(classify_ollama_model_name("qwen2.5:7b"), "foss")
        self.assertEqual(classify_ollama_model_name("qwen3-vl:latest"), "foss")
        self.assertEqual(classify_ollama_model_name("llava:7b"), "foss")

    def test_classify_llama_gemma_open_weight(self):
        self.assertEqual(classify_ollama_model_name("llama3:latest"), "open_weight")
        self.assertEqual(classify_ollama_model_name("gemma3:2b"), "open_weight")
        self.assertEqual(classify_ollama_model_name("llama3.2-vision:latest"), "open_weight")

    def test_classify_internvl_open_weight(self):
        self.assertEqual(classify_ollama_model_name("internvl3.5:38b"), "open_weight")

    def test_classify_gemma4_foss(self):
        """Sept 2026 licence-list catch-up (docs/planning/41-deck-model-survey.md, D73):
        Gemma 4 moved to Apache 2.0 in April 2026, so only this generation reads as
        open-source -- gemma, gemma2 and gemma3 stay open-weight above."""
        self.assertEqual(classify_ollama_model_name("gemma4:e2b-it-qat"), "foss")
        self.assertEqual(classify_ollama_model_name("gemma4:e4b-it-qat"), "foss")
        self.assertEqual(classify_ollama_model_name("gemma4:12b-it-qat"), "foss")
        self.assertEqual(classify_ollama_model_name("gemma4:latest"), "foss")

    def test_classify_granite_foss(self):
        self.assertEqual(classify_ollama_model_name("granite4.2:8b"), "foss")
        self.assertEqual(classify_ollama_model_name("granite4.2:3b"), "foss")

    def test_classify_lfm_and_liquid_open_weight(self):
        self.assertEqual(classify_ollama_model_name("lfm2.5:8b"), "open_weight")
        self.assertEqual(classify_ollama_model_name("liquid:8b"), "open_weight")

    def test_classify_unknown_tag_unchanged(self):
        self.assertEqual(classify_ollama_model_name("mystery-model:7b"), "unknown")
        self.assertEqual(classify_ollama_model_name(""), "unknown")

    def test_filter_tier1_drops_llama(self):
        models = ["llama3:latest", "qwen2.5:latest"]
        out = filter_model_list(models, "open_source_only", False)
        self.assertEqual(out, ["qwen2.5:latest"])

    def test_filter_tier2_keeps_llama(self):
        models = ["llama3:latest", "qwen2.5:latest"]
        out = filter_model_list(models, "open_weight", False)
        self.assertEqual(out, ["llama3:latest", "qwen2.5:latest"])

    def test_unknown_requires_tier3_unlock(self):
        models = ["some-custom-model:latest", "qwen2.5:latest"]
        out = filter_model_list(models, "non_foss", False)
        self.assertEqual(out, ["qwen2.5:latest"])
        out2 = filter_model_list(models, "non_foss", True)
        self.assertEqual(out2, models)

    def test_reconcile_downgrades_non_foss_without_ack(self):
        t, u = reconcile_model_policy_tier("non_foss", False)
        self.assertEqual(t, "open_weight")
        self.assertFalse(u)

    def test_reconcile_clears_ack_when_not_non_foss(self):
        t, u = reconcile_model_policy_tier("open_weight", True)
        self.assertEqual(t, "open_weight")
        self.assertFalse(u)

    def test_empty_filter_message_nonempty(self):
        msg = empty_filter_user_message("open_source_only", False, False)
        self.assertIn("Tier 1", msg)


if __name__ == "__main__":
    unittest.main()
