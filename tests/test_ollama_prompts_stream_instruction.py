"""Tests for bonsai-status stream instruction tone."""

import unittest

from backend.prompts.ollama_prompts import build_bonsai_status_stream_instruction


# The exact tone adjective gets rewritten whenever the blurb copy is refreshed
# (ff6547f swapped "sarcastic" for "disgruntled or dry-deadpan"). Assert the
# durable intent -- a wry, non-neutral tone is requested and sarcasm is not
# forbidden -- instead of pinning one word.
WRY_TONE_MARKERS = ("sarcas", "deadpan", "dry wit", "disgruntled", "wry")


class BonsaiStatusStreamInstructionTests(unittest.TestCase):
    def test_character_off_requests_wry_tone(self):
        text = build_bonsai_status_stream_instruction(
            app_name="Elden Ring",
            question_snippet="fps drop",
            character_roleplay_on=False,
        ).lower()
        self.assertNotIn("no sarcasm", text)
        self.assertTrue(
            any(marker in text for marker in WRY_TONE_MARKERS),
            f"expected a wry-tone directive in the character-off status line; got: {text}",
        )

    def test_strategy_spoiler_guardrail_preserved(self):
        text = build_bonsai_status_stream_instruction(
            ask_mode="strategy",
            character_roleplay_on=False,
        )
        self.assertIn("NEVER spoil", text)

    def test_strategy_mode_offers_the_spoiler_marker_as_a_fallback(self):
        """Asking the model not to spoil is the first line of defence, not the only one.

        Compliance with a 3B model is a probability. When it names the boss anyway it needs
        somewhere safe to put the name, and redactThinkingBlurbSpoilers.ts renders that span as
        blocks. Both markers must be taught, or the client sees an unclosed span and masks the
        rest of the line.
        """
        text = build_bonsai_status_stream_instruction(
            ask_mode="strategy",
            character_roleplay_on=False,
        )
        self.assertIn("[[spoiler]]", text)
        self.assertIn("[[/spoiler]]", text)

    def test_non_strategy_modes_do_not_teach_the_spoiler_marker(self):
        """No masking surface outside Strategy, so the marker would only be noise in the prompt."""
        text = build_bonsai_status_stream_instruction(ask_mode="speed", character_roleplay_on=False)
        self.assertNotIn("[[spoiler]]", text)

    def test_later_status_updates_are_invited_but_bounded(self):
        """The line used to freeze for the whole generation; it may now advance with the work.

        Bounded on purpose -- an unbounded invitation is how a small model ends up emitting a tag
        per paragraph and the line flickers.
        """
        text = build_bonsai_status_stream_instruction(
            app_name="Elden Ring",
            question_snippet="fps drop",
            character_roleplay_on=False,
        ).lower()
        self.assertIn("one more", text)
        self.assertIn("two or three", text)
        self.assertNotIn("exactly one line", text)


if __name__ == "__main__":
    unittest.main()
