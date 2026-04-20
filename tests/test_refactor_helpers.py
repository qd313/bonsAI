import unittest

from refactor_helpers import (
    build_ollama_chat_url,
    normalize_ollama_base,
    parse_tdp_recommendation,
    select_ollama_models,
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

    def test_select_ollama_models_text_and_vision(self):
        """FOSS-first safe chains; optional high-VRAM tail extends the list."""
        self.assertIn("llama3:latest", select_ollama_models(False))
        self.assertIn("llava:7b", select_ollama_models(True, "speed"))
        self.assertEqual(select_ollama_models(False, "speed")[0], "qwen2.5:1.5b")
        self.assertEqual(select_ollama_models(False, "strategy")[0], "qwen2.5:latest")
        self.assertEqual(select_ollama_models(False, "deep")[0], "qwen2.5:14b")
        self.assertEqual(select_ollama_models(True, "speed")[0], "llava:7b")
        self.assertEqual(select_ollama_models(True, "strategy")[0], "qwen2.5vl:latest")
        self.assertEqual(select_ollama_models(True, "deep")[0], "qwen2.5vl:latest")
        self.assertEqual(select_ollama_models(False, "invalid")[0], "qwen2.5:1.5b")

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


if __name__ == "__main__":
    unittest.main()
