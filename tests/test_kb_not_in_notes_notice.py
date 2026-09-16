"""Tests for the output-side "not in my notes" and "no tip for this" attribution notices."""

import unittest

from backend.services.kb_not_in_notes_notice import (
    _NOT_IN_NOTES_LINE,
    _NO_CLOSE_MATCH_LINE,
    _NO_TIP_FOR_THIS_LINE,
    _THIN_MATCH_MEANING_CEILING,
    append_no_close_match_notice,
    append_no_tip_for_this_notice,
    append_not_in_notes_notice,
    should_show_no_close_match_notice,
    should_show_no_tip_for_this_notice,
    should_show_not_in_notes_notice,
)


class NotInNotesDecisionTests(unittest.TestCase):
    """should_show_not_in_notes_notice: the four coverage conditions plus Speed mode."""

    def test_covered_game_with_no_match_shows_the_notice(self):
        self.assertTrue(
            should_show_not_in_notes_notice(
                ask_mode="strategy", kb_attached=False, kb_coverage_status="sections"
            )
        )

    def test_covered_game_with_a_match_does_not_show_the_notice(self):
        self.assertFalse(
            should_show_not_in_notes_notice(
                ask_mode="strategy", kb_attached=True, kb_coverage_status="sections"
            )
        )

    def test_library_off_does_not_show_the_notice(self):
        # summarize_kb_coverage reports kb_off (not "sections") whenever the local knowledge
        # base setting is off, regardless of ask mode or attach state.
        self.assertFalse(
            should_show_not_in_notes_notice(
                ask_mode="strategy", kb_attached=False, kb_coverage_status="kb_off"
            )
        )

    def test_uncovered_game_does_not_show_the_notice(self):
        for status in ("no_sections", "app_unresolved", "no_app", "corpus_missing", "corpus_error"):
            with self.subTest(status=status):
                self.assertFalse(
                    should_show_not_in_notes_notice(
                        ask_mode="strategy", kb_attached=False, kb_coverage_status=status
                    )
                )

    def test_speed_mode_does_not_show_the_notice(self):
        # Even with a covered game and no match -- the two signals that otherwise qualify.
        self.assertFalse(
            should_show_not_in_notes_notice(
                ask_mode="speed", kb_attached=False, kb_coverage_status="sections"
            )
        )

    def test_expert_mode_with_no_match_shows_the_notice(self):
        # Expert is the other declared game-ask mode alongside Strategy.
        self.assertTrue(
            should_show_not_in_notes_notice(
                ask_mode="expert", kb_attached=False, kb_coverage_status="sections"
            )
        )


class NotInNotesAppendTests(unittest.TestCase):
    """append_not_in_notes_notice: wording and composition with the safety notice."""

    def test_exact_wording(self):
        out = append_not_in_notes_notice("Here is how you beat the boss.", True)
        self.assertIn(_NOT_IN_NOTES_LINE, out)
        self.assertIn(
            "Not in my notes — this answer is from the model's own knowledge.", out
        )

    def test_not_shown_leaves_reply_untouched(self):
        original = "Here is how you beat the boss."
        self.assertEqual(append_not_in_notes_notice(original, False), original)

    def test_stacks_after_an_existing_safety_notice_in_a_sensible_order(self):
        # A reply that already ends with the destructive-advice safety notice gets both
        # footers, safety first and the attribution note last -- appended in whichever order
        # the caller adds them, not reordered here.
        reply_with_safety_notice = (
            "Try deleting the existing prefix folder and letting Steam rebuild it."
            "\n\n—\n**bonsAI safety check:** this reply describes deleting save data, a "
            "Wine/Proton prefix, or compatdata, without a clear backup step. That is permanent "
            "unless the game uses Steam Cloud for saves -- back up the folder before deleting "
            "anything."
        )

        out = append_not_in_notes_notice(reply_with_safety_notice, True)

        self.assertIn("bonsAI safety check", out)
        self.assertIn(_NOT_IN_NOTES_LINE, out)
        self.assertLess(
            out.index("bonsAI safety check"),
            out.index(_NOT_IN_NOTES_LINE),
            "the attribution note should land after the safety notice, not before it",
        )


class NoTipForThisDecisionTests(unittest.TestCase):
    """should_show_no_tip_for_this_notice: routed-to-tips, nothing attached, any Ask mode."""

    def test_routed_to_tips_with_nothing_attached_shows_the_line(self):
        self.assertTrue(
            should_show_no_tip_for_this_notice(kb_attached=False, kb_domain="compat")
        )

    def test_routed_to_tips_with_a_tip_attached_does_not_show_the_line(self):
        self.assertFalse(
            should_show_no_tip_for_this_notice(kb_attached=True, kb_domain="compat")
        )

    def test_speed_mode_still_shows_the_line(self):
        # Unlike the sibling notice, this one has no Ask-mode gate -- the brief is explicit
        # that a tip search runs in any mode, so the line can too. There is no ask_mode
        # parameter to pass: the function's signature is the proof.
        self.assertTrue(
            should_show_no_tip_for_this_notice(kb_attached=False, kb_domain="compat")
        )

    def test_routed_to_notes_instead_does_not_show_the_line(self):
        # domain == "strategy" means this turn's search looked in the notes, not the tips.
        self.assertFalse(
            should_show_no_tip_for_this_notice(kb_attached=False, kb_domain="strategy")
        )

    def test_not_routed_at_all_does_not_show_the_line(self):
        # The library-off case: should_retrieve_knowledge never returns "compat" while the
        # setting is off, so kb_domain stays "" and this line never fires from that alone.
        self.assertFalse(
            should_show_no_tip_for_this_notice(kb_attached=False, kb_domain="")
        )

    def test_missing_corpus_does_not_show_the_line(self):
        self.assertFalse(
            should_show_no_tip_for_this_notice(
                kb_attached=False,
                kb_domain="compat",
                kb_unavailable_reason="corpus_missing",
            )
        )

    def test_a_tip_trimmed_for_space_does_not_show_the_line(self):
        # A real tip was found and scored -- the context budget cut it, which is a different
        # fact from "no tip fit". kb_attached is already False in this case (the tip never
        # reached the model), so kb_notes is the only signal that tells the two apart.
        self.assertFalse(
            should_show_no_tip_for_this_notice(
                kb_attached=False,
                kb_domain="compat",
                kb_notes="dropped_by_context_budget",
            )
        )

    def test_floors_own_signal_shows_the_line_once_it_lands(self):
        # Forward-compatibility case: once lane C's floor ships, an unattached compat turn's
        # kb_notes reads "routed_nothing_fit (...)" instead of the plainer "no_hit (...)". Both
        # must show the line.
        self.assertTrue(
            should_show_no_tip_for_this_notice(
                kb_attached=False,
                kb_domain="compat",
                kb_notes="routed_nothing_fit (some_reason)",
            )
        )
        self.assertTrue(
            should_show_no_tip_for_this_notice(
                kb_attached=False,
                kb_domain="compat",
                kb_notes="no_hit (some_reason)",
            )
        )


class NoTipForThisAppendTests(unittest.TestCase):
    """append_no_tip_for_this_notice: wording and composition with the safety notice."""

    def test_exact_wording(self):
        out = append_no_tip_for_this_notice("Try restarting Steam.", True)
        self.assertIn(_NO_TIP_FOR_THIS_LINE, out)
        self.assertIn(
            "No tip for this — this answer is from the model's own knowledge.", out
        )

    def test_not_shown_leaves_reply_untouched(self):
        original = "Try restarting Steam."
        self.assertEqual(append_no_tip_for_this_notice(original, False), original)

    def test_stacks_after_an_existing_safety_notice_in_a_sensible_order(self):
        reply_with_safety_notice = (
            "Try deleting the existing prefix folder and letting Steam rebuild it."
            "\n\n—\n**bonsAI safety check:** this reply describes deleting save data, a "
            "Wine/Proton prefix, or compatdata, without a clear backup step. That is permanent "
            "unless the game uses Steam Cloud for saves -- back up the folder before deleting "
            "anything."
        )

        out = append_no_tip_for_this_notice(reply_with_safety_notice, True)

        self.assertIn("bonsAI safety check", out)
        self.assertIn(_NO_TIP_FOR_THIS_LINE, out)
        self.assertLess(
            out.index("bonsAI safety check"),
            out.index(_NO_TIP_FOR_THIS_LINE),
            "the attribution note should land after the safety notice, not before it",
        )


class TheTwoLinesNeverBothAppearTests(unittest.TestCase):
    """Both decision functions can return True for the same inputs (only kb_domain differs
    between the two on the same turn) -- proving the module's own functions are mutually
    exclusive is not possible without the call site's extra guard, so this proves the two
    functions do not enforce it *themselves*, which is why game_ai_request.py must and does."""

    def test_both_functions_would_fire_together_without_the_call_sites_guard(self):
        # An Expert ask about a game whose notes are covered, but this particular turn got
        # routed to the tip sheet (kb_domain == "compat") and nothing attached: both decision
        # functions read True in isolation. game_ai_request.py is what stops both lines landing
        # on the same reply -- see its test in test_kb_not_in_notes_wiring.py.
        show_not_in_notes = should_show_not_in_notes_notice(
            ask_mode="expert", kb_attached=False, kb_coverage_status="sections"
        )
        show_no_tip = should_show_no_tip_for_this_notice(
            kb_attached=False, kb_domain="compat"
        )
        self.assertTrue(show_not_in_notes)
        self.assertTrue(show_no_tip)


def _thin(**overrides):
    """A turn where a note attached and nothing pointed at it but the meaning search."""
    base = dict(
        ask_mode="strategy",
        kb_attached=True,
        kb_coverage_status="sections",
        kb_domain="strategy",
        kb_best_meaning=0.60,
        kb_top_card_keyword_score=0.0,
    )
    base.update(overrides)
    return should_show_no_close_match_notice(**base)


class NoCloseMatchDecisionTests(unittest.TestCase):
    """should_show_no_close_match_notice: the two strength signals plus the eligibility gates."""

    def test_thin_match_with_no_keyword_support_shows_the_notice(self):
        self.assertTrue(_thin())

    def test_a_note_the_keyword_search_ranked_does_not_show_the_notice(self):
        # The whole point of the second signal: a note some word in the question actually
        # pointed at is not the thin case, however middling its meaning score.
        self.assertFalse(_thin(kb_top_card_keyword_score=3.216))

    def test_a_close_meaning_match_does_not_show_the_notice(self):
        self.assertFalse(_thin(kb_best_meaning=0.72))

    def test_exactly_at_the_ceiling_does_not_show_the_notice(self):
        # The ceiling is the first score considered good enough, not the last considered thin.
        self.assertFalse(_thin(kb_best_meaning=_THIN_MATCH_MEANING_CEILING))
        self.assertTrue(_thin(kb_best_meaning=_THIN_MATCH_MEANING_CEILING - 0.0001))

    def test_an_unmeasured_meaning_score_does_not_show_the_notice(self):
        # None means the meaning half never ran -- Speed mode, no embed model, a corpus with no
        # vectors. Reading that as "weak" would print this line on every turn of a Deck with no
        # embed model, which is the opposite of what it is for.
        self.assertFalse(_thin(kb_best_meaning=None))

    def test_nothing_attached_does_not_show_the_notice(self):
        # That turn belongs to "not in my notes", which is the line for it.
        self.assertFalse(_thin(kb_attached=False))

    def test_speed_mode_does_not_show_the_notice(self):
        self.assertFalse(_thin(ask_mode="speed"))

    def test_expert_mode_shows_the_notice(self):
        self.assertTrue(_thin(ask_mode="expert"))

    def test_the_tip_sheet_does_not_show_the_notice(self):
        # The tips have their own floor at a different value; this line is the notes' line.
        self.assertFalse(_thin(kb_domain="compat"))

    def test_a_game_the_notes_do_not_cover_does_not_show_the_notice(self):
        self.assertFalse(_thin(kb_coverage_status="no_sections"))
        self.assertFalse(_thin(kb_coverage_status="kb_off"))


class GameNamedOnlyInTheQuestionTests(unittest.TestCase):
    """HONESTY-TEXT-GAME-01 (plan 56 lane J): the real shape of the device failure on
    2026-09-15 -- three Black Mesa cards attached to "black mesa how do i tame a horse", none of
    them about a horse, with a nonzero keyword score because every one of the game's own cards
    repeats "Black Mesa" in its title. See docs/test-evidence/plan55-HONESTY-TEXT-GAME-01.json
    for the device run and its attached card titles, copied below.
    """

    _BLACK_MESA_SOURCE_TITLES = (
        "Black Mesa — Starting out in Black Mesa",
        "Black Mesa — The opening tram ride and where it leads",
        "Black Mesa — Houndeye",
    )

    def test_the_horse_question_shows_the_notice_once_the_keyword_score_is_checked(self):
        # Before this fix, any nonzero keyword score short-circuited straight to "no notice" --
        # this reproduces the device run's own numbers: a real (nonzero) score from the game's
        # own name, and a meaning score under the thin-match ceiling.
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=2.4,
                kb_best_meaning=0.60,
                question="black mesa how do i tame a horse",
                kb_game_name="Black Mesa",
                kb_source_titles=self._BLACK_MESA_SOURCE_TITLES,
            )
        )

    def test_the_gonarch_question_still_shows_no_notice(self):
        # The real question about the game the fix must not break: "gonarch" is a word the
        # question and the winning card's title both carry, so the nonzero score is trusted.
        self.assertFalse(
            _thin(
                kb_top_card_keyword_score=2.4,
                kb_best_meaning=0.60,
                question="how do i beat the gonarch in black mesa",
                kb_game_name="Black Mesa",
                kb_source_titles=("Black Mesa — Gonarch",),
            )
        )

    def test_a_zero_keyword_score_is_unaffected_by_the_new_arguments(self):
        # The new arguments only ever act on a nonzero score -- see
        # `_keyword_score_reflects_the_question`'s early return. A zero score keeps deciding this
        # purely on the meaning score, exactly as it did before this fix.
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=0.0,
                kb_best_meaning=0.60,
                question="black mesa how do i tame a horse",
                kb_game_name="Black Mesa",
                kb_source_titles=self._BLACK_MESA_SOURCE_TITLES,
            )
        )

    def test_no_titles_passed_trusts_the_score_same_as_before_the_fix(self):
        # Backward compatibility: every caller that predates this fix (and the plain _thin()
        # calls above in this file) never passes kb_source_titles, so a nonzero score must keep
        # meaning "no notice" on its own, same as before this parameter existed.
        self.assertFalse(
            _thin(
                kb_top_card_keyword_score=2.4,
                kb_best_meaning=0.60,
                question="black mesa how do i tame a horse",
                kb_game_name="Black Mesa",
            )
        )


class NoCloseMatchAppendTests(unittest.TestCase):
    def test_appends_the_exact_line_below_a_rule(self):
        out = append_no_close_match_notice("Try the left door first.", True)
        self.assertTrue(out.startswith("Try the left door first."))
        self.assertTrue(out.endswith("*%s*" % _NO_CLOSE_MATCH_LINE))
        self.assertIn("\n\n\u2014\n", out)

    def test_leaves_the_reply_alone_when_it_should_not_show(self):
        self.assertEqual(
            append_no_close_match_notice("Try the left door first.", False),
            "Try the left door first.",
        )

    def test_empty_reply_still_gets_the_line(self):
        self.assertTrue(append_no_close_match_notice("", True).endswith("*%s*" % _NO_CLOSE_MATCH_LINE))

    def test_the_line_joins_its_two_halves_with_a_comma(self):
        # The maintainer chose a comma here on 2026-09-07, after a draft that used a dash to
        # match the two sibling lines. Pinned because it looks like a slip next to its siblings
        # and would otherwise get tidied back to a dash by anyone reading the three together.
        self.assertEqual(
            _NO_CLOSE_MATCH_LINE,
            "No close match in my notes, this answer leans on the model's own knowledge.",
        )
        self.assertNotIn("—", _NO_CLOSE_MATCH_LINE)
        # The siblings keep their dashes; this is a deliberate difference, not a style drift.
        self.assertIn("—", _NOT_IN_NOTES_LINE)
        self.assertIn("—", _NO_TIP_FOR_THIS_LINE)

    def test_the_three_lines_are_different_sentences(self):
        # Each says a different thing: nothing came from the notes, nothing came from the tips,
        # and something came from the notes but it was a stretch. Sharing wording would make the
        # three indistinguishable to the person reading them.
        self.assertEqual(
            len({_NOT_IN_NOTES_LINE, _NO_TIP_FOR_THIS_LINE, _NO_CLOSE_MATCH_LINE}), 3
        )


class TheThirdLineCannotCollideWithTheOtherTwoTests(unittest.TestCase):
    """The other two need nothing to have attached; this one needs something to have.

    That is what makes the three mutually exclusive, and it holds in the functions themselves
    rather than only at the call site -- unlike the first two, which need game_ai_request.py's
    guard (see TheTwoLinesNeverBothAppearTests above).
    """

    def test_no_input_makes_this_line_and_not_in_notes_both_true(self):
        for attached in (True, False):
            not_in_notes = should_show_not_in_notes_notice(
                ask_mode="strategy", kb_attached=attached, kb_coverage_status="sections"
            )
            no_close_match = _thin(kb_attached=attached)
            self.assertFalse(not_in_notes and no_close_match)

    def test_no_input_makes_this_line_and_no_tip_both_true(self):
        for attached in (True, False):
            no_tip = should_show_no_tip_for_this_notice(
                kb_attached=attached, kb_domain="compat"
            )
            no_close_match = _thin(kb_attached=attached, kb_domain="compat")
            self.assertFalse(no_tip and no_close_match)


if __name__ == "__main__":
    unittest.main()
