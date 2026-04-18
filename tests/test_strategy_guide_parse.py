import unittest

from backend.services.strategy_guide_parse import (
    STRATEGY_FOLLOWUP_PREFIX,
    extract_strategy_guide_branches,
    is_strategy_followup_question,
)


class StrategyGuideParseTests(unittest.TestCase):
    def test_is_strategy_followup_question(self):
        self.assertTrue(is_strategy_followup_question(f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: a."))
        self.assertTrue(is_strategy_followup_question(f"  \n{STRATEGY_FOLLOWUP_PREFIX} x"))
        self.assertFalse(is_strategy_followup_question("Help with Water Temple"))

    def test_extract_strips_valid_fence(self):
        raw = (
            "Here is some coaching.\n\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Where?","options":[{"id":"a","label":"Start"},{"id":"b","label":"End"}]}\n'
            "```\n"
        )
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertEqual(payload["question"], "Where?")
        self.assertEqual(len(payload["options"]), 2)
        self.assertEqual(payload["options"][0]["label"], "Start")
        self.assertNotIn("bonsai-strategy-branches", visible)
        self.assertIn("coaching", visible)

    def test_extract_malformed_returns_original(self):
        raw = "text only ```bonsai-strategy-branches\nnot json\n```"
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertIsNone(payload)
        self.assertEqual(visible, raw)

    def test_extract_too_few_options(self):
        raw = (
            'Intro\n```bonsai-strategy-branches\n{"question":"Q?","options":[{"id":"a","label":"Only"}]}\n```'
        )
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertIsNone(payload)
        self.assertEqual(visible, raw)


if __name__ == "__main__":
    unittest.main()
