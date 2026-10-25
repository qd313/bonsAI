"""Plan 100, lane P: two prompt lines.

1. A route step says what it needs. The Strategy follow-up asks the AI to end a step that needs an
   item, ability or unlock with "Needs: <the thing>", the shape the panel draws as a Needs line.
2. The picture rules say a running game is the game in the picture.

What a person sees for the picture line: with a game running and a screenshot attached, the AI used to sometimes name a
different game for the picture (4 of 9 God of War asks on 2026-10-24). The picture rules told it to
name a game only with two clues, and said nothing of the game already running and named to it. One
sentence now says the picture is from that game.

These tests build the real system prompt with ``build_system_prompt`` (the same call the Ask path
makes) and read the words the model would receive.
"""

import re
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.prompts.ollama_prompts import build_system_prompt  # noqa: E402

# The exact sentence; the tests below pin that it is one sentence that names the two things it asks.
GAME_IN_PICTURE_SENTENCE = (
    "The running game named above is the game in the picture: describe where in it the player is, "
    "and never name a different game."
)
TWO_CUES_RULE = "Require at least two distinct game-specific cues before naming a title."
FOLLOWUP = "[Strategy follow-up] I'm at: the first boss"
FIRST_TURN = "how do i get to the first boss"
# A Python copy of STEP_NEEDS_RE in src/features/strategy/strategyChecklist.ts (the panel's split).
STEP_NEEDS_RE = re.compile(r"^(.*?)[\s(–—;,-]*\bneeds:\s*(.*?)[\s).]*$", re.IGNORECASE)
PICTURE = "iVBORw0KGgo="  # any non-empty value counts as an attached picture


def _prompt(*, mode="strategy", picture=True, app_name="Hollow Knight", app_id="367520", question="where am i", **extra):
    return build_system_prompt(
        question=question,
        app_id=app_id,
        app_name=app_name,
        normalized_attachments=[],
        prepared_images=[PICTURE] if picture else [],
        lookup_app_name=lambda _a: "",
        lookup_screenshot_vdf_metadata=lambda _p: {},
        ask_mode=mode,
        **extra,
    )


def _split_needs(label):
    """What the panel's splitStrategyStepNeeds returns, as (step, need) with need None when absent."""
    m = STEP_NEEDS_RE.match(label.strip())
    text = (m.group(1) if m else "").strip()
    needs = (m.group(2) if m else "").strip()
    if not m or not text or not needs:
        return label.strip(), None
    return text, needs


def _needs_clause(prompt):
    """The one sentence of the prompt that asks for a Needs ending, or None."""
    found = [line for line in prompt.splitlines() if "Needs:" in line]
    return found[0] if len(found) == 1 else None


class WhenARouteStepNeedsSomething(unittest.TestCase):
    def test_the_strategy_follow_up_asks_for_a_needs_ending_on_a_step_that_needs_something(self):
        clause = _needs_clause(_prompt(question=FOLLOWUP))
        self.assertIsNotNone(clause)
        self.assertIn("item, ability or unlock", clause)
        self.assertIn("a step that needs nothing has no such words", clause)

    def test_the_clause_sits_inside_the_checklist_instruction(self):
        p = _prompt(question=FOLLOWUP)
        self.assertLess(p.index("```bonsai-strategy-checklist"), p.index("Needs:"))
        self.assertLess(p.index("Needs:"), p.index("The visible coaching text above the checklist"))

    def test_the_example_in_the_clause_is_the_shape_the_panel_splits(self):
        clause = _needs_clause(_prompt(question=FOLLOWUP))
        example = re.search(r'"([^"]*\. Needs: [^"]+)"', clause).group(1)
        step, need = _split_needs(example)
        self.assertTrue(step.endswith("."), step)
        self.assertTrue(need, example)
        self.assertEqual(f"{step} Needs: {need}", example)

    def test_the_panels_split_reads_the_three_endings_the_model_may_write(self):
        self.assertEqual(_split_needs("Beat him. Needs: the Crest"), ("Beat him.", "the Crest"))
        self.assertEqual(_split_needs("Beat him (needs: the Crest)"), ("Beat him", "the Crest"))
        self.assertEqual(_split_needs("Beat him — Needs: the Crest"), ("Beat him", "the Crest"))
        self.assertEqual(_split_needs("Beat him."), ("Beat him.", None))

    def test_speed_and_expert_prompts_do_not_carry_it(self):
        for mode in ("speed", "expert"):
            for question in (FOLLOWUP, FIRST_TURN):
                with self.subTest(mode=mode, question=question[:12]):
                    self.assertNotIn("Needs:", _prompt(mode=mode, question=question))

    def test_the_strategy_first_turn_and_the_terse_follow_up_do_not_carry_it(self):
        self.assertNotIn("Needs:", _prompt(question=FIRST_TURN))
        self.assertNotIn("Needs:", _prompt(question=FOLLOWUP, reply_verbosity="terse"))


class WhenTheRunningGameIsTheGameInThePicture(unittest.TestCase):
    def test_a_picture_with_a_named_running_game_says_the_picture_is_from_that_game(self):
        for mode in ("speed", "strategy", "expert"):
            with self.subTest(mode=mode):
                p = _prompt(mode=mode)
                self.assertIn("The currently running game is: Hollow Knight (AppID: 367520).", p)
                self.assertIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_the_sentence_comes_with_the_picture_rules_and_after_the_two_clues_rule(self):
        p = _prompt()
        self.assertEqual(p.count(GAME_IN_PICTURE_SENTENCE), 1)
        self.assertLess(p.index(TWO_CUES_RULE), p.index(GAME_IN_PICTURE_SENTENCE))

    def test_no_picture_means_no_sentence(self):
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, _prompt(picture=False))

    def test_a_picture_with_no_game_running_means_no_sentence(self):
        p = _prompt(app_name="", app_id="")
        self.assertIn("No game is currently running.", p)
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_a_running_game_whose_name_is_unknown_means_no_sentence(self):
        p = _prompt(app_name="", app_id="367520")
        self.assertIn("(name unknown)", p)
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_the_old_picture_rules_are_all_still_there(self):
        p = _prompt()
        self.assertIn(TWO_CUES_RULE, p)
        self.assertIn("Never claim that a numeric AppID value is the game title.", p)


if __name__ == "__main__":
    unittest.main()
