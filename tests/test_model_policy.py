"""Tests for heuristic Ollama model policy classification and filtering."""

import unittest

from backend.services.model_policy import (
    classify_ollama_model_name,
    empty_filter_user_message,
    KEPT_IN_TIER_1_PENDING_CALL,
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

    def test_classify_gpt_oss_is_open_source(self):
        """Licence labels pass (plan 77): gpt-oss is Apache 2.0 at every size (Ollama page and
        the openai/gpt-oss-20b card, read 2026-09-29), so it belongs in Tier 1, not Tier 3."""
        self.assertEqual(classify_ollama_model_name("gpt-oss:20b"), "foss")
        self.assertEqual(classify_ollama_model_name("gpt-oss:120b"), "foss")
        self.assertEqual(classify_ollama_model_name("gpt-oss"), "foss")

    def test_classify_vicuna_and_orca_mini_are_open_weight(self):
        """Vicuna is Llama 1/2 licensed; orca-mini is CC BY-NC-SA (original) or Llama 2 (v3)."""
        for tag in ("vicuna", "vicuna:13b", "orca-mini", "orca-mini:3b", "orca-mini:70b"):
            self.assertEqual(classify_ollama_model_name(tag), "open_weight", tag)

    def test_classify_size_specific_qwen_licences(self):
        """Only some Qwen sizes carry Qwen's own licence; the rest stay Apache 2.0."""
        for tag in ("qwen2.5:72b", "qwen2.5:72b-instruct-q4_K_M", "qwen2.5-coder:3b",
                    "qwen2.5vl:72b", "qwen2:72b"):
            self.assertEqual(classify_ollama_model_name(tag), "open_weight", tag)
        for tag in ("qwen2.5:7b", "qwen2.5:32b", "qwen2.5:latest", "qwen2.5-coder:7b",
                    "qwen2.5-coder:32b", "qwen2.5vl:7b", "qwen2.5vl:32b", "qwen2:7b",
                    "qwen3:4b", "qwen3-vl:latest", "qwen3.5:9b"):
            self.assertEqual(classify_ollama_model_name(tag), "foss", tag)

    def test_classify_whole_older_qwen_family_is_open_weight(self):
        """The first Qwen (1.5) generation was released under the Tongyi Qianwen licences."""
        for tag in ("qwen:0.5b", "qwen:7b", "qwen:72b", "qwen:latest"):
            self.assertEqual(classify_ollama_model_name(tag), "open_weight", tag)

    def test_classify_llava_by_base_model(self):
        """llava:7b and :34b ship Apache 2.0 (Mistral / Yi based); :13b is Llama 2 licensed;
        llava-llama3 is a Llama 3 fine-tune."""
        self.assertEqual(classify_ollama_model_name("llava:7b"), "foss")
        self.assertEqual(classify_ollama_model_name("llava:latest"), "foss")
        self.assertEqual(classify_ollama_model_name("llava:34b"), "foss")
        self.assertEqual(classify_ollama_model_name("llava:13b"), "open_weight")
        self.assertEqual(classify_ollama_model_name("llava-llama3"), "open_weight")
        self.assertEqual(classify_ollama_model_name("llava-phi3"), "foss")

    def test_tier1_keeps_the_default_picture_model_and_second_text_fallback(self):
        """The maintainer's call (labels only): qwen2.5vl:3b and qwen2.5:3b stay in Tier 1 even
        though Qwen's own cards give the 3B size the Qwen Research licence. Flipping this is the
        one-line change to KEPT_IN_TIER_1_PENDING_CALL."""
        self.assertEqual(classify_ollama_model_name("qwen2.5vl:3b"), "foss")
        self.assertEqual(classify_ollama_model_name("qwen2.5:3b"), "foss")
        self.assertEqual(
            KEPT_IN_TIER_1_PENDING_CALL,
            frozenset({("qwen2.5vl", "3b"), ("qwen2.5", "3b")}),
        )

    def test_filter_tier1_drops_size_limited_and_legacy_models(self):
        models = ["qwen2.5:72b", "qwen2.5-coder:3b", "vicuna:latest", "orca-mini:latest",
                  "llava:13b", "qwen3:4b", "gpt-oss:20b"]
        self.assertEqual(
            filter_model_list(models, "open_source_only", False), ["qwen3:4b", "gpt-oss:20b"]
        )
        self.assertEqual(filter_model_list(models, "open_weight", False), models)

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
