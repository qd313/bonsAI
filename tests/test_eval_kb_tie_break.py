"""Title: Tie-break weight rule for the knowledge-base search measurement

Purpose: Pin the decision rule behind scripts/kb/eval_kb_embed_models.py's --tie-break variant —
a measurement-only prototype, never shipped.
Used for: eval_kb_embed_models.py _tie_break_weights, the pure function _run_tie_break_arm
  calls to pick (RRF_W_FTS, RRF_W_VEC) per query.
Solves: Leaning the whole search toward meaning won on the numbers and was reverted because it
  buried a brand-new note with no vector yet behind a heavier vector weight. The narrower
  follow-up keeps the blend even and only leans toward meaning where the keyword pass found
  nothing at all — there is no keyword hit to bury when there is not one.
Does not: Run the measurement itself (needs a corpus and Ollama) or touch
  knowledge_base_service.py's real blend weights — see the module docstring in
  eval_kb_embed_models.py for how the swap is scoped to one query and restored.
"""

from __future__ import annotations

import unittest
from pathlib import Path

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]
PY_MODULES = REPO_ROOT / "py_modules"


def _load_eval_module():
    import sys

    if str(PY_MODULES) not in sys.path:
        sys.path.insert(0, str(PY_MODULES))
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    # The module's dataclasses use `from __future__ import annotations` (string annotations),
    # and dataclass processing on 3.12 resolves those by looking the module up in
    # sys.modules[cls.__module__] -- it must already be registered before it runs.
    return load_script("eval_kb_embed_models", "eval_kb_embed_models_tie_break_test", register=True)


class TieBreakWeightsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_eval_module()

    def _card(self):
        return self.mod.KnowledgeCard(
            section_id=1,
            game_id=1,
            game_title="Test Game",
            section_type="boss",
            name="Test Card",
            card="Card body.",
            source_url="",
            source_license="bonsAI-maintainer",
            source_version=None,
            crawled_at=None,
            trust_tier="fallback",
        )

    def test_no_keyword_hit_leans_toward_meaning(self):
        weights = self.mod._tie_break_weights([])
        self.assertEqual(weights, self.mod.TIE_BREAK_NO_MATCH_WEIGHTS)
        self.assertGreater(weights[1], weights[0], "meaning weight should outweigh keyword")

    def test_a_keyword_hit_keeps_the_blend_even(self):
        weights = self.mod._tie_break_weights([self._card()])
        self.assertEqual(weights, self.mod.TIE_BREAK_EVEN_WEIGHTS)
        self.assertEqual(weights[0], weights[1], "a real keyword hit must stay balanced")

    def test_multiple_keyword_hits_also_stay_even(self):
        weights = self.mod._tie_break_weights([self._card(), self._card()])
        self.assertEqual(weights, self.mod.TIE_BREAK_EVEN_WEIGHTS)

    def test_custom_weight_pairs_are_honored(self):
        weights = self.mod._tie_break_weights(
            [], no_match_weights=(1.0, 3.0), even_weights=(2.0, 2.0)
        )
        self.assertEqual(weights, (1.0, 3.0))
        weights = self.mod._tie_break_weights(
            [self._card()], no_match_weights=(1.0, 3.0), even_weights=(2.0, 2.0)
        )
        self.assertEqual(weights, (2.0, 2.0))


if __name__ == "__main__":
    unittest.main()
