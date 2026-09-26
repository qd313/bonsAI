"""Tests for strategy_spoiler_policy.py's per-turn cover decision (plan 70 helper A, D112 #7).

``spoiler_cover_required`` and ``protected_spoiler_names`` are the two calls that decide, once
per turn, whether the spoiler safety net (response_verify.cover_named_spoilers) should run at
all, and on which names -- both new for the safety net; everything else in this file already
existed and is covered by its own tests.
"""

import unittest

from backend.services.strategy_spoiler_policy import (
    fence_opener_is_spoiler,
    fence_segment_is_closed,
    move_midline_fence_openers_to_line_start,
    name_appears_in_text,
    partial_fence_tail_match,
    protected_spoiler_names,
    spoiler_cover_required,
)


class NameAppearsInTextTests(unittest.TestCase):
    def test_exact_case_insensitive_match(self):
        self.assertTrue(name_appears_in_text("Watch out for SOUL MASTER.", "Soul Master"))

    def test_plural_is_tolerated(self):
        self.assertTrue(name_appears_in_text("dodge the exploders", "Exploder"))

    def test_substring_of_a_longer_word_does_not_count(self):
        self.assertFalse(name_appears_in_text("the plants are dangerous", "Lan"))

    def test_absent_name_is_false(self):
        self.assertFalse(name_appears_in_text("How do I get started?", "Soul Master"))


class SpoilerCoverRequiredTests(unittest.TestCase):
    """Mirrors the exact branch ``_strategy_spoiler_policy_block`` picks -- a cover is only
    ever asked for on the same turn the prompt's own default (no consent, story title,
    Strategy/Expert-with-KB-cards) branch fires."""

    def test_required_on_an_ordinary_story_strategy_turn(self):
        self.assertTrue(
            spoiler_cover_required(
                False,
                strategy_domain=True,
                title_profile="protect_progression",
            )
        )

    def test_not_required_when_the_player_consented(self):
        self.assertFalse(
            spoiler_cover_required(
                True,
                strategy_domain=True,
                title_profile="protect_progression",
            )
        )

    def test_not_required_for_a_low_narrative_title(self):
        self.assertFalse(
            spoiler_cover_required(
                False,
                strategy_domain=True,
                title_profile="low_narrative",
            )
        )

    def test_not_required_outside_strategy_domain(self):
        """A TDP-tuning or ordinary Speed turn never gets a spoiler policy in the prompt at
        all (ollama_prompts.build_system_prompt only injects one when strategy_domain is
        true) -- the safety net must not invent a requirement the prompt never made."""
        self.assertFalse(
            spoiler_cover_required(
                False,
                strategy_domain=False,
                title_profile="protect_progression",
            )
        )

    def test_app_id_lookup_is_used_when_no_title_profile_is_passed(self):
        # 367520 is Hollow Knight (spoiler_title_profiles.PROTECT_PROGRESSION_APP_IDS).
        self.assertTrue(
            spoiler_cover_required(False, strategy_domain=True, app_id="367520")
        )
        # 2321470 is Deep Rock Galactic: Survivor (LOW_NARRATIVE_APP_IDS).
        self.assertFalse(
            spoiler_cover_required(False, strategy_domain=True, app_id="2321470")
        )


class ProtectedSpoilerNamesTests(unittest.TestCase):
    def test_drops_a_name_the_question_already_used(self):
        names = protected_spoiler_names(
            "how do i beat soul master", ["Soul Master", "False Knight"]
        )
        self.assertEqual(names, ["False Knight"])

    def test_keeps_every_name_the_question_did_not_use(self):
        names = protected_spoiler_names(
            "the boss past the crystal spike area", ["Soul Master", "False Knight"]
        )
        self.assertEqual(names, ["Soul Master", "False Knight"])

    def test_drops_duplicates_and_blanks(self):
        names = protected_spoiler_names("what class should i play", ["Soul Master", "", "Soul Master"])
        self.assertEqual(names, ["Soul Master"])

    def test_empty_card_list_gives_no_protected_names(self):
        self.assertEqual(protected_spoiler_names("anything", []), [])


class MoveMidlineFenceOpenersToLineStartTests(unittest.TestCase):
    """D112 #7 leak fix (SPOILER-COVER-01): a fence marker glued to the end of a word is
    invisible to both this checker and the screen's own scanner, which both require a fence
    to start its own line."""

    def test_a_glued_opener_gets_its_own_line(self):
        out = move_midline_fence_openers_to_line_start("The```bonsai-spoiler\nbody\n```")
        self.assertEqual(out, "The\n```bonsai-spoiler\nbody\n```")

    def test_an_opener_already_at_line_start_is_untouched(self):
        text = "Intro.\n```bonsai-spoiler\nbody\n```\nOutro."
        self.assertEqual(move_midline_fence_openers_to_line_start(text), text)

    def test_no_backticks_at_all_returns_the_same_text(self):
        text = "Nothing special here."
        self.assertEqual(move_midline_fence_openers_to_line_start(text), text)

    def test_a_glued_closer_also_gets_its_own_line(self):
        out = move_midline_fence_openers_to_line_start("```bonsai-spoiler\nbody```")
        self.assertEqual(out, "```bonsai-spoiler\nbody\n```")


class FenceSegmentHelpersTests(unittest.TestCase):
    def test_a_closed_segment_is_closed(self):
        self.assertTrue(fence_segment_is_closed("```bonsai-spoiler\nbody\n```"))

    def test_an_open_segment_is_not_closed(self):
        self.assertFalse(fence_segment_is_closed("```bonsai-spoiler\nbody so far"))

    def test_a_spoiler_opener_is_recognised(self):
        self.assertTrue(fence_opener_is_spoiler("```bonsai-spoiler\nbody"))

    def test_a_non_spoiler_opener_is_not_a_spoiler(self):
        self.assertFalse(fence_opener_is_spoiler("```bonsai-strategy-branches\n{}"))
        self.assertFalse(fence_opener_is_spoiler("```python\nprint(1)"))


class PartialFenceTailMatchTests(unittest.TestCase):
    def test_a_half_typed_opener_at_the_very_end_matches(self):
        self.assertIsNotNone(partial_fence_tail_match("some prose\n\n```bon"))

    def test_a_bare_backtick_at_the_end_matches(self):
        self.assertIsNotNone(partial_fence_tail_match("some prose\n\n`"))

    def test_an_ordinary_trailing_word_does_not_match(self):
        self.assertIsNone(partial_fence_tail_match("some prose continuing"))

    def test_a_backtick_not_at_a_line_start_does_not_match(self):
        self.assertIsNone(partial_fence_tail_match("some prose with a ` mid-line"))


if __name__ == "__main__":
    unittest.main()
