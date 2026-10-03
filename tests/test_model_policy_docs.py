"""The user guide and troubleshooting wording about the model tiers must agree with the code.

Licence labels pass (plan 77): the docs used to call Gemma a Tier 2 family and the one small
default model "FOSS", while the code puts Gemma 4 in Tier 1 and the Qwen 3B sizes are under
Qwen's own licence on Qwen's cards.
"""

from __future__ import annotations

import unittest
from pathlib import Path

from backend.ollama_routing import no_installed_routing_models_message
from backend.services.model_policy import classify_ollama_model_name

ROOT = Path(__file__).resolve().parent.parent


def _read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


class ModelPolicyDocsTests(unittest.TestCase):
    def test_guide_says_where_gemma_sits(self):
        self.assertEqual(classify_ollama_model_name("gemma4:e2b-it-qat"), "foss")
        self.assertEqual(classify_ollama_model_name("gemma3:4b"), "open_weight")
        guide = _read("docs/guide.md")
        self.assertNotIn("such as the Gemma family", guide)
        open_source = next(line for line in guide.splitlines() if line.startswith("| **Open source only**"))
        open_weight = next(line for line in guide.splitlines() if line.startswith("| **Also try open-weight models**"))
        self.assertIn("Gemma 4", open_source)
        self.assertIn("Gemma 3", open_weight)

    def test_guide_heading_matches_the_link_the_app_uses(self):
        """modelPolicy.ts links to docs/guide.md#ai-models-and-licences; the heading must produce it.

        The README rewrite for 0.6.0 moved the model policy table from the README to the user guide.
        """
        self.assertIn("docs/guide.md#ai-models-and-licences", _read("src/data/modelPolicy.ts"))
        self.assertIn("\n## AI models and licences\n", _read("docs/guide.md"))

    def test_guide_names_the_qwen_3b_licence(self):
        self.assertIn("Qwen Research", _read("docs/guide.md"))

    def test_troubleshooting_agrees_with_the_code(self):
        text = _read("docs/troubleshooting.md")
        self.assertNotIn("one FOSS multimodal model", text)
        self.assertNotIn("Tier 1 policy only allows FOSS tags — use Tier 2 for Gemma.", text)
        self.assertIn("Qwen Research", text)
        self.assertIn("Gemma 4", text)

    def test_no_model_message_does_not_call_the_default_foss(self):
        msg = no_installed_routing_models_message([], False)
        self.assertNotIn("FOSS", msg)
        self.assertIn("qwen2.5vl:3b", msg)


if __name__ == "__main__":
    unittest.main()
