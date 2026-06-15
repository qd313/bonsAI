import unittest

from refactor_helpers import (
    TIER1_ESSENTIALS_PULL_TAGS,
    TIER2_MULTIMODAL_PULL_TAGS,
    build_effective_models_to_try,
    build_ollama_chat_url,
    filter_models_to_installed,
    is_current_tdp_read_intent,
    is_ollama_model_missing_error,
    is_valid_setup_pull_profile,
    no_installed_routing_models_message,
    normalize_ollama_base,
    parse_tdp_recommendation,
    select_ollama_models,
    setup_recommended_pull_tags,
)


class RefactorHelperTests(unittest.TestCase):
    """Contract tests for pure helper behavior extracted from backend orchestration paths."""

    def test_normalize_ollama_base_defaults(self):
        """Ensure empty host input resolves to the expected default localhost endpoint."""
        host, port, base = normalize_ollama_base("")
        self.assertEqual(host, "127.0.0.1")
        self.assertEqual(port, 11434)
        self.assertEqual(base, "http://127.0.0.1:11434")

    def test_normalize_ollama_base_accepts_host_port(self):
        """Verify host:port inputs stay stable after normalization."""
        host, port, base = normalize_ollama_base("192.168.1.50:11500")
        self.assertEqual(host, "192.168.1.50")
        self.assertEqual(port, 11500)
        self.assertEqual(base, "http://192.168.1.50:11500")

    def test_build_ollama_chat_url(self):
        """Confirm chat URL builder appends the fixed /api/chat endpoint."""
        self.assertEqual(
            build_ollama_chat_url("10.0.0.2:11434"),
            "http://10.0.0.2:11434/api/chat",
        )

    def test_setup_recommended_pull_tags_tier1_essentials(self):
        tags = setup_recommended_pull_tags("tier1_essentials")
        self.assertEqual(tags, list(TIER1_ESSENTIALS_PULL_TAGS))
        self.assertEqual(len(tags), 1)
        self.assertEqual(tags[0], "qwen2.5vl:3b")

    def test_setup_recommended_pull_tags_tier2_multimodal(self):
        tags = setup_recommended_pull_tags("tier2_multimodal")
        self.assertEqual(tags, list(TIER2_MULTIMODAL_PULL_TAGS))

    def test_setup_recommended_pull_tags_unknown_returns_empty(self):
        self.assertEqual(setup_recommended_pull_tags("bogus"), [])
        self.assertEqual(setup_recommended_pull_tags("tier1_foss_full"), [])
        self.assertEqual(setup_recommended_pull_tags("starter"), [])

    def test_is_valid_setup_pull_profile(self):
        self.assertTrue(is_valid_setup_pull_profile("tier1_essentials"))
        self.assertTrue(is_valid_setup_pull_profile("tier2_multimodal"))
        self.assertTrue(is_valid_setup_pull_profile("update_installed"))
        self.assertFalse(is_valid_setup_pull_profile("starter"))
        self.assertFalse(is_valid_setup_pull_profile("tier1_foss_full"))
        self.assertFalse(is_valid_setup_pull_profile(None))

    def test_select_ollama_models_text_and_vision(self):
        """Essentials chains: qwen2.5vl first; Tier 2 gemma tail; deprioritized tags last."""
        text = select_ollama_models(False, "speed")
        self.assertEqual(text[0], "qwen2.5vl:3b")
        self.assertIn("qwen2.5:3b", text)
        self.assertIn("gemma4:e2b-it-qat", text)
        self.assertIn("gemma4:latest", text)
        self.assertEqual(select_ollama_models(False, "strategy")[0], "qwen2.5vl:3b")
        self.assertEqual(select_ollama_models(False, "deep")[0], "qwen2.5vl:3b")

        vision = select_ollama_models(True, "speed")
        self.assertEqual(vision[0], "qwen2.5vl:3b")
        self.assertIn("gemma4:e2b-it-qat", vision)
        self.assertIn("llava:7b", vision)
        self.assertLess(vision.index("gemma4:e2b-it-qat"), vision.index("llava:7b"))

        self.assertEqual(select_ollama_models(False, "invalid")[0], "qwen2.5vl:3b")

        safe_speed = select_ollama_models(False, "speed", False)
        hi_speed = select_ollama_models(False, "speed", True)
        self.assertLess(len(safe_speed), len(hi_speed))
        self.assertIn("qwen2.5:32b", hi_speed)

        safe_vis = select_ollama_models(True, "deep", False)
        hi_vis = select_ollama_models(True, "deep", True)
        self.assertLess(len(safe_vis), len(hi_vis))
        self.assertIn("internvl3.5:38b", hi_vis)

    def test_parse_tdp_recommendation_fenced_json(self):
        """Verify fenced JSON recommendations are parsed and clamped to safe hardware bounds."""
        text = 'Use this.\n```json\n{"tdp_watts": 20, "gpu_clock_mhz": 1700}\n```'
        parsed = parse_tdp_recommendation(text, 3, 15, 200, 1600)
        self.assertEqual(parsed, {"tdp_watts": 15, "gpu_clock_mhz": 1600})

    def test_parse_tdp_recommendation_natural_language(self):
        """Verify natural-language TDP suggestions are recognized when JSON is absent."""
        parsed = parse_tdp_recommendation("Set TDP to 8 watts for battery life.", 3, 15, 200, 1600)
        self.assertEqual(parsed, {"tdp_watts": 8, "gpu_clock_mhz": None})

    def test_parse_tdp_recommendation_invalid(self):
        """Ensure parser returns None when no actionable recommendation exists."""
        parsed = parse_tdp_recommendation("No power recommendation provided.", 3, 15, 200, 1600)
        self.assertIsNone(parsed)

    def test_is_ollama_model_missing_error(self):
        self.assertTrue(is_ollama_model_missing_error(404, ""))
        self.assertTrue(is_ollama_model_missing_error(404, "{}"))
        self.assertTrue(
            is_ollama_model_missing_error(400, '{"error":"model \'gemma3:latest\' not found"}')
        )
        self.assertFalse(is_ollama_model_missing_error(500, "internal server error"))

    def test_is_current_tdp_read_intent_detects(self):
        self.assertTrue(is_current_tdp_read_intent("what is the current tdp"))
        self.assertTrue(is_current_tdp_read_intent("What is current TDP?"))
        self.assertTrue(is_current_tdp_read_intent("read tdp from hardware"))

    def test_is_current_tdp_read_intent_rejects_tuning(self):
        self.assertFalse(is_current_tdp_read_intent("What TDP should I use for 60fps?"))
        self.assertFalse(is_current_tdp_read_intent("recommend tdp for this game"))

    def test_filter_models_to_installed_preserves_order(self):
        chain = ["qwen2.5vl:3b", "gemma4:e2b-it-qat", "llama3:latest"]
        matched, skipped = filter_models_to_installed(chain, ["gemma4:e2b-it-qat"])
        self.assertEqual(matched, ["gemma4:e2b-it-qat"])
        self.assertEqual(skipped, ["qwen2.5vl:3b", "llama3:latest"])

    def test_filter_models_to_installed_empty_installed_passthrough(self):
        chain = ["qwen2.5vl:3b"]
        matched, skipped = filter_models_to_installed(chain, [])
        self.assertEqual(matched, chain)
        self.assertEqual(skipped, [])

    def test_no_installed_routing_models_message_mentions_essentials(self):
        msg = no_installed_routing_models_message(["custom:7b"], False)
        self.assertIn("qwen2.5vl:3b", msg)
        self.assertIn("custom:7b", msg)

    def test_build_effective_models_to_try_host_fallback(self):
        chain = ["qwen2.5vl:3b", "gemma4:e2b-it-qat"]
        models, strategy = build_effective_models_to_try(chain, ["gemma4:e2b-it-qat"])
        self.assertEqual(strategy, "installed_in_policy_chain")
        self.assertEqual(models, ["gemma4:e2b-it-qat"])

    def test_build_effective_models_to_try_only_gemma_on_tier1_chain(self):
        tier1_chain = ["qwen2.5vl:3b", "qwen2.5:3b"]
        models, strategy = build_effective_models_to_try(tier1_chain, ["gemma4:e2b-it-qat"])
        self.assertEqual(strategy, "installed_host_fallback")
        self.assertEqual(models, ["gemma4:e2b-it-qat"])

    def test_build_effective_models_to_try_no_tags_uses_chain(self):
        chain = ["qwen2.5vl:3b"]
        models, strategy = build_effective_models_to_try(chain, [])
        self.assertEqual(strategy, "full_chain")
        self.assertEqual(models, chain)


if __name__ == "__main__":
    unittest.main()
