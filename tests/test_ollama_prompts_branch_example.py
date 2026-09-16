"""Tests for the Strategy Guide branch-picker worked example in the system prompt.

Bug: the branch picker example the model is shown literally contained ellipses
("Where are you at in … ?" with "…" as every option label), so the model just
copied the placeholder instead of filling in a real game title. Roadmap:
"A branch question elides the game name" (one-star, tag reply, found 2026-09-04).
"""

import unittest

from backend.services.ollama_prompts import build_system_prompt


def _lookup_app_name(_app_id: str) -> str:
    return ""


def _lookup_vdf(_path: str) -> dict:
    return {}


class StrategyBranchExamplePromptTests(unittest.TestCase):
    # The literal opening fence line, followed immediately by the worked JSON
    # example on the next line. This only appears where the model is being
    # shown the actual example to copy the *shape* of, not the mentions of
    # "bonsai-strategy-branches" inside plain instruction sentences elsewhere
    # in the prompt.
    _FENCE_WITH_NEWLINE = "```bonsai-strategy-branches\n"

    def test_branch_example_has_no_bare_ellipsis_placeholder(self):
        """The worked example the model copies from must not contain a literal ellipsis."""
        text = build_system_prompt(
            "how do I get past this part",
            "",
            "Half-Life 2",
            [],
            [],
            _lookup_app_name,
            _lookup_vdf,
            ask_mode="strategy",
        )
        idx = text.index(self._FENCE_WITH_NEWLINE)
        json_line_start = idx + len(self._FENCE_WITH_NEWLINE)
        example_line = text[json_line_start : text.index("\n", json_line_start)]
        self.assertNotIn("…", example_line)
        # The example should look like a real worked answer, not a placeholder,
        # so there is nothing left for the model to copy verbatim.
        self.assertIn('"question":"Where are you at in', example_line)
        self.assertNotIn('"label":"…"', example_line)

    def test_branch_example_no_longer_offers_a_real_game_to_copy(self):
        """The example must not carry the old Half-Life 2 / Ravenholm / train station wording.

        Roadmap: "The follow-up menu keeps offering Half-Life 2 whatever game you asked
        about" -- the model copied the worked example's real-sounding words verbatim into
        answers about other games. The example must now use placeholders no answer would
        plausibly contain, not a real game's places.
        """
        text = build_system_prompt(
            "how do I get past this part",
            "",
            "Portal 2",
            [],
            [],
            _lookup_app_name,
            _lookup_vdf,
            ask_mode="strategy",
        )
        idx = text.index(self._FENCE_WITH_NEWLINE)
        json_line_start = idx + len(self._FENCE_WITH_NEWLINE)
        example_line = text[json_line_start : text.index("\n", json_line_start)]
        self.assertNotIn("Half-Life 2", example_line)
        self.assertNotIn("Ravenholm", example_line)
        self.assertNotIn("train station", example_line)

    def test_branch_example_absent_on_followup_turn(self):
        """Follow-up turns don't emit the branch fence at all, so there's nothing to check."""
        text = build_system_prompt(
            "[Strategy follow-up] I'm at: Ravenholm.",
            "",
            "Half-Life 2",
            [],
            [],
            _lookup_app_name,
            _lookup_vdf,
            ask_mode="strategy",
        )
        self.assertNotIn(self._FENCE_WITH_NEWLINE, text)


if __name__ == "__main__":
    unittest.main()
