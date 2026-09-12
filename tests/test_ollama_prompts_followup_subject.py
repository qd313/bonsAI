"""Tests for build_system_prompt's `followup_subject` parameter (plan 48, D98).

D98 measured that putting the right note first is not enough on a bare follow-up -- a
better-matching wrong note can still be in the pile, and the small model writes about that
instead. Telling the model which thing the question is carrying on from got it right more often
(4 of 9 tries, up from 0 of 9). This is the seam that carries the remembered subject into the
built prompt; see ollama_prompts.FOLLOWUP_SUBJECT_NOTE_TEMPLATE for the exact wording and why it
is fixed by the measurement.

tests/test_game_ai_request_followup_memory.py covers the other half: that game_ai_request.py
only ever populates this parameter on the same gate the search-words augmentation already uses,
and never lets it reach the spoiler-consent path.
"""

import unittest

from backend.services.ollama_prompts import (
    FOLLOWUP_SUBJECT_NOTE_TEMPLATE,
    _KB_BLOCK_HEADER,
    build_system_prompt,
)


def _lookup_app_name(_app_id: str) -> str:
    return ""


def _lookup_vdf(_path: str) -> dict:
    return {}


_KB_BLOCK = (
    f"{_KB_BLOCK_HEADER}\n"
    "Domain: strategy\n"
    "\n[Deep Rock Galactic: Survivor / boss: Glyphid Dreadnought] (trust: high)\n"
    "Kite between waves, then focus the head.\n"
    "\n--- End local knowledge base ---"
)


class BuildSystemPromptFollowupSubjectTests(unittest.TestCase):
    def _build(self, *, followup_subject: str = "", early_context_suffix: str = _KB_BLOCK) -> str:
        return build_system_prompt(
            "what about its second phase",
            "548430",
            "Deep Rock Galactic: Survivor",
            [],
            [],
            _lookup_app_name,
            _lookup_vdf,
            ask_mode="strategy",
            early_context_suffix=early_context_suffix,
            followup_subject=followup_subject,
        )

    def test_note_appears_right_after_the_kb_block_header_when_a_subject_is_given(self):
        text = self._build(followup_subject="Glyphid Dreadnought")
        expected_note = FOLLOWUP_SUBJECT_NOTE_TEMPLATE.format(subject="Glyphid Dreadnought")
        self.assertIn(_KB_BLOCK_HEADER + expected_note, text)

    def test_note_names_the_given_subject_and_carries_the_spoiler_safeguard_sentence(self):
        text = self._build(followup_subject="Glyphid Dreadnought")
        self.assertIn('carries on from the previous one, which was about "Glyphid Dreadnought"', text)
        self.assertIn(
            "This reminder alone is not the user naming Glyphid Dreadnought themselves.", text
        )

    def test_no_note_when_no_subject_is_given(self):
        """The default -- every turn that is not a bare follow-up using the memory."""
        text = self._build(followup_subject="")
        self.assertNotIn("FOLLOW-UP CONTEXT", text)
        self.assertIn(_KB_BLOCK_HEADER, text)  # the block itself is still there, just untouched

    def test_no_note_when_a_subject_is_given_but_nothing_attached(self):
        """A subject with no knowledge-base block to splice into is a no-op, not a crash."""
        text = self._build(followup_subject="Glyphid Dreadnought", early_context_suffix="")
        self.assertNotIn("FOLLOW-UP CONTEXT", text)

    # The word-count side effect (87 -> 44) is measured by scripts/eval_kb_answers.py against a
    # live model; nothing here asserts it, since this suite only proves the prompt text is right.


if __name__ == "__main__":
    unittest.main()
