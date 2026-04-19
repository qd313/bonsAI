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

    def test_extract_trailing_comma_in_options(self):
        raw = (
            "Intro\n```bonsai-strategy-branches\n"
            '{"question":"Where?","options":[{"id":"a","label":"Start"},{"id":"b","label":"End",}],}\n'
            "```\n"
        )
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["question"], "Where?")
        self.assertEqual(len(payload["options"]), 2)

    def test_extract_bracket_tag_urlencoded_json(self):
        """Models sometimes emit [bonsai-strategy-branches] (%7B...}) instead of a markdown fence."""
        raw = (
            "Coach intro.\n"
            '[bonsai-strategy-branches] (%7B"question":"Where are you at in %5BWater Temple%5D?",'
            '"options":[{"id":"a","label":"Entrance area with a large waterfall"},'
            '{"id":"b","label":"Interior rooms with puzzles and enemies"}]})\n'
            "As your trusty guide…"
        )
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["question"], "Where are you at in [Water Temple]?")
        self.assertEqual(len(payload["options"]), 2)
        self.assertEqual(payload["options"][0]["label"], "Entrance area with a large waterfall")
        self.assertNotIn("bonsai-strategy-branches", visible)
        self.assertIn("Coach intro", visible)
        self.assertIn("trusty guide", visible)

    def test_extract_bracket_tag_raw_json_in_parens(self):
        raw = (
            "Hi\n[BonsAI-Strategy-Branches] ("
            '{"question":"Pick?","options":[{"id":"a","label":"One"},{"id":"b","label":"Two"}]})\n'
            "Tail"
        )
        visible, payload = extract_strategy_guide_branches(raw)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["question"], "Pick?")
        self.assertEqual(len(payload["options"]), 2)
        self.assertNotIn("[BonsAI", visible, msg=visible)


if __name__ == "__main__":
    unittest.main()
