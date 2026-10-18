import unittest

from backend.prompts.ollama_prompts import (
    build_reply_followup_context_block,
    sanitize_reply_followup,
)


class ReplyFollowupTests(unittest.TestCase):
    def test_sanitize_requires_parent_turn(self):
        self.assertIsNone(sanitize_reply_followup(None))
        self.assertIsNone(sanitize_reply_followup({"chip_id": "too_long"}))
        self.assertIsNone(
            sanitize_reply_followup(
                {"chip_id": "nope", "parent_question": "q", "parent_answer": "a"}
            )
        )

    def test_sanitize_normalizes(self):
        out = sanitize_reply_followup(
            {
                "chip_id": "too_short",
                "parent_question": " How? ",
                "parent_answer": " Short ",
                "preferred_model": "qwen2.5vl:3b",
            }
        )
        self.assertEqual(out["chip_id"], "too_short")
        self.assertEqual(out["parent_question"], "How?")
        self.assertEqual(out["preferred_model"], "qwen2.5vl:3b")

    def test_context_block_includes_parent_turn(self):
        block = build_reply_followup_context_block("too_long", "Why lag?", "Because CPU.")
        self.assertNotIn("trimmed to fit", block)
        self.assertIn("Too long", block)
        self.assertIn("Why lag?", block)
        self.assertIn("Because CPU.", block)

    def test_long_parent_answer_is_trimmed_to_fit_the_window(self):
        """D46: a 1,600-token Strategy reply pasted whole into the follow-up did not fit the
        Deck's 4,096-token window; the paste is capped at REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS."""
        from backend.prompts.ollama_prompts import REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS

        long_answer = "Kite the boss between waves. " * 400  # ~11,600 characters
        block = build_reply_followup_context_block("too_long", "How do I beat the boss?", long_answer)
        self.assertIn("trimmed to fit", block)
        self.assertIn("Kite the boss between waves.", block)
        self.assertLess(len(block), REPLY_FOLLOWUP_PARENT_ANSWER_MAX_CHARS + 400)
        self.assertIn("Previous answer:\nKite the boss", block)

    def test_sanitize_accepts_unfenced_spoiler_chip(self):
        out = sanitize_reply_followup(
            {
                "chip_id": "unfenced_spoiler",
                "parent_question": "How do I beat the boss?",
                "parent_answer": "Just rush in.",
            }
        )
        self.assertIsNotNone(out)
        self.assertEqual(out["chip_id"], "unfenced_spoiler")

    def test_context_block_labels_unfenced_spoiler(self):
        block = build_reply_followup_context_block(
            "unfenced_spoiler", "How do I beat the boss?", "Just rush in."
        )
        self.assertIn("Unfenced spoiler", block)


if __name__ == "__main__":
    unittest.main()
