"""Tests for how the AI's own instructions write the hidden-block label (plan 81, helper F).

The instructions used to name the label as ```bonsai-spoiler``` (the label with backticks on both
sides, on one word) in six lines. A small model copied that odd shape into its answers, writing it
as both the opening and the closing mark of a hidden block (plan 78, 1 October). The reader copes
with the shape since 09bf7fd7, but the cure for a copied shape is to stop showing it. Every line
that talks about a hidden block must now show the shape the reader accepts best: the opening line
```bonsai-spoiler on its own, and a closing ``` on a line of its own.

These tests look at the prompt the model is actually handed, built the way the Ask path builds it,
in every arm that mentions the label (story title with a knowledge-base note, speed mode with a
note, a named entity, a low-risk title with and without a matched note, a consented turn, and a
follow-up turn).
"""

import re
import unittest

from backend.services.ollama_prompts import build_system_prompt
from backend.services.strategy_spoiler_policy import _strategy_spoiler_policy_block

# The odd shape: the label immediately followed by a backtick run (allowing spaces), anywhere.
ODD_SHAPE_RE = re.compile(r"bonsai-spoiler[ \t]*`{3}")

_KB_BLOCK = (
    "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
    "Domain: strategy\n\n"
    "[Hades / boss: Megaera] (trust: high)\n"
    "Some tactics text here.\n"
    "--- end of knowledge base ---"
)


def _prompt(*, ask_mode="strategy", entity="", match=False, consent=False, question="", **extra):
    return build_system_prompt(
        question or "how do i beat megaera",
        extra.pop("app_id", "1145360"),
        extra.pop("app_name", "Hades"),
        [],
        [],
        lambda app_id: "",
        lambda path: {},
        ask_mode=ask_mode,
        early_context_suffix=_KB_BLOCK,
        strategy_spoiler_consent=consent,
        strategy_spoiler_asked_entity=entity,
        strategy_spoiler_kb_entity_match=match,
        **extra,
    )


class HiddenBlockLabelWordingTests(unittest.TestCase):
    def _arms(self):
        low = {"app_id": "2321470", "app_name": "Deep Rock Galactic: Survivor", "strategy_title_profile": "low_narrative"}
        return {
            "story title, note attached, nothing named": _prompt(),
            "speed mode, note attached": _prompt(ask_mode="speed"),
            "story title, entity named": _prompt(entity="Megaera", match=True),
            "low-risk title, entity named": _prompt(entity="Dreadnought", match=True, **low),
            "low-risk title, note matched, nothing named": _prompt(match=True, **low),
            "low-risk title, nothing matched": _prompt(**low),
            "consented turn": _prompt(consent=True),
            "follow-up turn": _prompt(question="Follow-up: I'm at the second boss."),
        }

    def test_no_instruction_in_the_built_prompt_shows_the_label_between_two_sets_of_backticks(self):
        for name, prompt in self._arms().items():
            with self.subTest(arm=name):
                hits = [m.group(0) for m in ODD_SHAPE_RE.finditer(prompt)]
                self.assertEqual(hits, [], f"prompt shows the odd label shape: {hits}")

    def test_policy_block_never_shows_the_odd_shape_in_any_branch(self):
        blocks = {
            "default": _strategy_spoiler_policy_block(False, False),
            "default, follow-up": _strategy_spoiler_policy_block(False, True),
            "consent": _strategy_spoiler_policy_block(True, False),
            "named entity": _strategy_spoiler_policy_block(False, False, asked_entity="Megaera"),
            "named entity, matched note": _strategy_spoiler_policy_block(
                False, False, asked_entity="Megaera", kb_entity_match=True
            ),
            "low risk, no entity, matched note": _strategy_spoiler_policy_block(
                False, False, kb_entity_match=True, title_profile="low_narrative"
            ),
            "low risk, nothing identified": _strategy_spoiler_policy_block(
                False, False, title_profile="low_narrative"
            ),
            "low risk, entity": _strategy_spoiler_policy_block(
                False, False, asked_entity="Dreadnought", title_profile="low_narrative"
            ),
        }
        for name, block in blocks.items():
            with self.subTest(branch=name):
                self.assertNotRegex(block, ODD_SHAPE_RE)

    def test_knowledge_base_line_names_the_label_the_way_the_reader_accepts_best(self):
        prompt = _prompt()
        self.assertIn("KNOWLEDGE BASE (offline corpus)", prompt)
        self.assertIn(
            "Put spoilery walkthrough detail inside a hidden block "
            "(opening line exactly ```bonsai-spoiler, closing ``` on its own line)",
            prompt,
        )


if __name__ == "__main__":
    unittest.main()
