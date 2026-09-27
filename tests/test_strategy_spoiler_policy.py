"""Tests for strategy_spoiler_policy.py's per-turn cover decision (plan 70 helper A, D112 #7).

``spoiler_cover_required`` and ``protected_spoiler_names`` are the two calls that decide, once
per turn, whether the spoiler safety net (response_verify.cover_named_spoilers) should run at
all, and on which names -- both new for the safety net; everything else in this file already
existed and is covered by its own tests.
"""

import unittest

from backend.services.strategy_spoiler_policy import (
    _strategy_spoiler_policy_block,
    fence_opener_is_spoiler,
    fence_segment_is_closed,
    move_midline_fence_openers_to_line_start,
    name_appears_in_text,
    neutralize_protected_names_in_branch_menu,
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


class NeutralizeProtectedNamesInBranchMenuTests(unittest.TestCase):
    """D112 #7's third leak: the branch menu is drawn as buttons, never fenced, so a protected
    name inside it needs substitution instead. Measured live on the Deck
    (NO-CLOSE-MATCH-HK-02): the menu's own question read "Are you currently struggling with
    the Soul Master's movement or damage output?" in plain view, on a question that never
    named him. Screenshot: docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02-menu-names-boss.png.
    """

    def test_the_real_captured_question_line_is_neutralized(self):
        branches = {
            "question": (
                "Are you currently struggling with the Soul Master's movement or damage "
                "output?"
            ),
            "options": [
                {"id": "a", "label": "Movement is the problem"},
                {"id": "b", "label": "Damage is the problem"},
            ],
        }
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertNotIn("Soul Master", out["question"])
        self.assertEqual(
            out["question"],
            "Are you currently struggling with the boss's movement or damage output?",
        )
        # A single article, not a doubled one ("the this boss's").
        self.assertNotIn("the this boss", out["question"])

    def test_an_option_label_naming_the_boss_is_neutralized(self):
        branches = {
            "question": "Where are you stuck?",
            "options": [
                {"id": "a", "label": "Fighting Soul Master now"},
                {"id": "b", "label": "Somewhere else entirely"},
            ],
        }
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertEqual(out["options"][0]["label"], "Fighting this boss now")
        self.assertEqual(out["options"][1]["label"], "Somewhere else entirely")

    def test_no_article_reads_naturally_too(self):
        branches = {"question": "Are you struggling with Soul Master directly?", "options": []}
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertEqual(out["question"], "Are you struggling with this boss directly?")

    def test_a_name_followed_by_boss_does_not_double_the_word(self):
        # Deck, plan 70 flow L3 (NO-CLOSE-MATCH-HK-02 try 2): the model wrote "facing the Soul
        # Master boss?" and the stand-in read "facing the boss boss?".
        branches = {
            "question": "Are you currently facing the Soul Master boss?",
            "options": [
                {"id": "a", "label": "Yes, fighting Soul Master boss now"},
                {"id": "b", "label": "Still reaching the Soul Master boss fight"},
            ],
        }
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertEqual(out["question"], "Are you currently facing the boss?")
        self.assertEqual(out["options"][0]["label"], "Yes, fighting this boss now")
        self.assertEqual(out["options"][1]["label"], "Still reaching the boss fight")
        for text in [out["question"]] + [o["label"] for o in out["options"]]:
            self.assertNotIn("boss boss", text)

    def test_a_following_word_that_only_starts_with_boss_is_left_alone(self):
        branches = {"question": "Is the Soul Master bossfight hard?", "options": []}
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertEqual(out["question"], "Is the boss bossfight hard?")

    def test_a_menu_naming_nothing_protected_is_untouched(self):
        branches = {"question": "Where are you stuck?", "options": [{"id": "a", "label": "Early on"}]}
        out = neutralize_protected_names_in_branch_menu(branches, ["Soul Master"])
        self.assertEqual(out, branches)

    def test_no_protected_names_returns_the_same_object(self):
        branches = {"question": "Fighting Soul Master?", "options": []}
        self.assertIs(neutralize_protected_names_in_branch_menu(branches, []), branches)

    def test_no_branches_passes_through(self):
        self.assertIsNone(neutralize_protected_names_in_branch_menu(None, ["Soul Master"]))


class StrategyOpeningHasNothingQuotableTests(unittest.TestCase):
    """The default Strategy policy once said "Coaching is spoiler-minimized by default; say so
    briefly in your opening." The model spoke it back: a Hollow Knight answer opened "Strategy
    guide mode active. I will keep the coaching spoiler-minimized." (docs/test-evidence/
    plan70-FOLLOWUP-BOSS-01.json, side_observations). The maintainer's call 2026-09-26: soften it.
    The steer stays (tell the player early you are keeping spoilers out), the machine wording goes,
    and every protection rule around it stays word for word."""

    def _default_blocks(self):
        return [
            _strategy_spoiler_policy_block(False, False),
            _strategy_spoiler_policy_block(False, False, asked_entity="Megaera"),
            _strategy_spoiler_policy_block(False, False, include_strategy_ui_fences=False),
        ]

    def test_no_machine_phrase_left_to_quote(self):
        for block in self._default_blocks():
            self.assertNotIn("spoiler-minimized", block)
            self.assertNotIn("say so briefly in your opening", block)

    def test_still_steers_the_opening_in_the_players_own_terms(self):
        for block in self._default_blocks():
            self.assertIn("in your own casual words", block)
            self.assertIn("never quote or paraphrase these instructions", block)
            self.assertIn("never announce a mode or setting", block)

    def test_protection_rules_unchanged(self):
        plain, named, _ = self._default_blocks()
        self.assertIn(
            "Avoid story endings, major twists, late-game boss names, and exact puzzle solutions in "
            "plain text unless essential for branching; prefer vague labels until the player picks a "
            "branch.\n",
            plain,
        )
        self.assertIn("Put unavoidably spoilery detail only inside ```bonsai-spoiler ... ``` fences", plain)
        self.assertIn(
            "Avoid story endings, major twists, late-game boss names other than “Megaera”", named
        )
        self.assertIn("Do not put anything about “Megaera” inside a ```bonsai-spoiler fence.", named)
        self.assertTrue(plain.startswith("STRATEGY SPOILER POLICY (default): "))


if __name__ == "__main__":
    unittest.main()
