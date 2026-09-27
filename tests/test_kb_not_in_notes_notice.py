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


class RerouteToTheTipSheetLeavesKbDomainStaleTests(unittest.TestCase):
    """Plan 70 helper P. `should_retrieve_knowledge` (knowledge_base_service.py) locks
    `kb_domain` to "strategy" before the question is even read, for a Strategy/Expert Ask about
    a running game -- and it is never updated afterward. So a turn `_reroute_to_game_tip_if_it_
    fits` sends to the tip sheet still carries `kb_domain == "strategy"` everywhere downstream,
    which is exactly `_thin()`'s own base shape: strategy mode, strategy domain, no keyword
    support (the forced tip card is fetched fresh rather than kept in the ranked list), a
    meaning score under the ceiling. Measured on the Deck 2026-09-26
    (docs/test-evidence/plan70-R4-try3.json): Deep Rock Galactic: Survivor's own Render Scale
    tip attached and the answer used it, and this line still printed underneath it."""

    def test_a_rerouted_tip_turn_does_not_show_the_notice(self):
        # Same inputs as test_thin_match_with_no_keyword_support_shows_the_notice, which is
        # correct there -- a genuine notes-domain thin match, no reroute in play. The only
        # difference here is kb_notes, which is how the caller learns a reroute happened.
        self.assertFalse(_thin(kb_notes="compat_tips"))

    def test_kb_domain_alone_still_catches_a_turn_that_reports_it_correctly(self):
        # The kb_notes check is additive, not a replacement -- a caller that already reports
        # kb_domain="compat" correctly (no reroute involved) is unaffected.
        self.assertFalse(_thin(kb_domain="compat", kb_notes=""))

    def test_an_unrelated_kb_notes_value_does_not_suppress_the_notice(self):
        # Only the exact resolution string the tip-sheet branch writes counts -- an ordinary
        # notes-domain resolution string (e.g. how a game was resolved) must not be read as
        # "this was really a tip-sheet turn".
        self.assertTrue(_thin(kb_notes="running_app"))


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


class GameNamedOnlyInTheQuestionMeaningTests(unittest.TestCase):
    """HONESTY-TEXT-GAME-01, part two (plan 56 lane K, 2026-09-16): the keyword fix above
    (lane J, `f2e358a`) was not enough on its own -- the notice still did not show on the
    device for "black mesa how do i tame a horse", because the game's own name in the question
    also inflates the MEANING score. Numbers below are exactly what the Deck measured
    (`retrieve_knowledge_context` against the Deck's own corpus and embed model) with and
    without "black mesa" in the question -- see kb_not_in_notes_notice.py's module comment and
    knowledge_base_service.py's `_question_without_game_name` for the fuller account.

    All of these pass ``kb_top_card_keyword_score=0.0`` (via ``_thin``'s defaults), i.e. no
    keyword support at all, so the outcome turns on the meaning check alone -- the same
    isolation ``NoCloseMatchDecisionTests`` above uses for the ceiling itself.
    """

    def test_the_horse_question_shows_once_the_stripped_score_is_used(self):
        # Raw meaning score for "black mesa how do i tame a horse": 0.687, which clears the
        # 0.65 ceiling and used to print no notice at all -- the gap lane J's fix left open.
        self.assertFalse(_thin(kb_best_meaning=0.687))
        # The same question with "black mesa" removed ("how do i tame a horse") scores 0.635,
        # under the ceiling like every other stretch question measured without the game's name.
        # Passing it as the stripped score is what makes the notice show.
        self.assertTrue(_thin(kb_best_meaning=0.687, kb_best_meaning_without_game_name=0.635))

    def test_the_gonarch_question_stays_quiet_either_way(self):
        # A real question about the game: 0.685 raw, 0.737 with "black mesa" stripped out of
        # "how do i beat the gonarch in black mesa" -- both sides of the ceiling agree here, so
        # the fix changes nothing for a question that really is about the game.
        self.assertFalse(_thin(kb_best_meaning=0.685, kb_best_meaning_without_game_name=0.737))

    def test_no_text_resolved_title_leaves_the_field_unset_and_changes_nothing(self):
        # A running game (or nothing resolved from the question at all) never fills this field
        # in -- it arrives here as None, same as "not measured" reads everywhere else in this
        # file, so the ceiling check falls back to the raw score exactly as it did before this
        # field existed.
        self.assertFalse(
            _thin(kb_best_meaning=0.687, kb_best_meaning_without_game_name=None)
        )
        self.assertTrue(
            _thin(kb_best_meaning=0.60, kb_best_meaning_without_game_name=None)
        )


class NoteTextAlsoCountsAsRealSupportTests(unittest.TestCase):
    """The note's own text, not only its title, can show the question was really answered.

    Found on the Deck 2026-09-23: a Hollow Knight reply built on the Broken Vessel note (attached
    second, behind a generic "Starting out" note) still said nothing close was found, because the
    question described the boss ("the boss past the crystal spike area") instead of naming it, and
    the check only ever read note TITLES -- "Broken Vessel" shares no word with that description.
    The same shape hit a Half-Life 2 walkthrough reply built on three attached chapter notes.

    Card text below is copied verbatim from data/kb/strategy_seed.json (the real corpus these
    replies drew from), and ``kb_attached_notes`` (game_ai_request.py, `kb_attached_notes.py`'s
    `_parse_kb_attached_notes`) is exactly where a real call site would read a "card" field this
    shape from -- one entry per attached note, its own text alongside its title.
    """

    _HK_QUESTION = (
        "What should I know about the boss past the crystal spike area in Hollow Knight, "
        "the one that looks just like me?"
    )
    _HK_TITLES = (
        "Hollow Knight — Starting out in Hollow Knight",
        "Hollow Knight — Broken Vessel",
        "Hollow Knight — Watcher Knights",
    )
    # Verbatim card text, data/kb/strategy_seed.json section_id 185 (Starting out) / 186 (Broken
    # Vessel) / (Watcher Knights is left out of the two here on purpose: the fix only needs one
    # attached note's text to carry the real match).
    _HK_TEXTS = (
        "Everything opens from Dirtmouth, above the well into Hallownest; the map is one open "
        "world with no fast travel until you find and pay Cornifer's counterpart the cartographer "
        "and unlock Stag stations one at a time.",
        "The infected husk shaped like you, far west in the Ancient Basin past a gap that needs "
        "the Crystal Heart. It dashes with slashes that cover most of the arena, flails its nail "
        "overhead, leaps to slam down and throw four arcs of infection, shakes out a cascade of "
        "blobs that covers nearly everything when its health gets low, and spawns weak balloons "
        "that drift at you. It is one of the few bosses that gets knocked back, so Vengeful "
        "Spirit can hit it twice; Desolate Dive during the cascade both damages it and keeps you "
        "safe. A longer nail (Mark of Pride or Longnail) matches its reach, and Defender's Crest "
        "quietly clears the balloons. Heal when it staggers, head weighed down and shaking.",
    )

    _HL2_QUESTION = (
        "give me a detailed walkthrough of the first three chapters of half life 2 with tips "
        "for each"
    )
    _HL2_TITLES = (
        "Half-Life 2 — Sandtraps",
        "Half-Life 2 — Ravenholm",
        "Half-Life 2 — Strider",
    )
    # Verbatim card text, data/kb/strategy_seed.json section_id 37 (Sandtraps) / 33 (Ravenholm) /
    # 34 (Strider) -- the three notes the device run actually attached and used.
    _HL2_TEXTS = (
        "The coastal chapter that teaches the sand. Rock to rock on the way out; after the "
        "Antlion Guard you keep the pheropod and use antlions to break the Combine bunkers "
        "guarding the road to Nova Prospekt.",
        "Ammo is scarce on purpose, so fight with the town instead of your guns. Levers drop car "
        "traps and reset them; waist-high blade traps shred zombies while you duck under; "
        "propane spray ignites from a single shot. Poison zombies switch traps off, so deal with "
        "those first. Loose blades are gravity gun ammunition.",
        "RPG only, and roughly seven rockets on Normal. The rocket stays laser-guided the whole "
        "flight, so steer it wide and bring it in off-axis rather than straight up the barrel. "
        "Its warp cannon does splash damage, so keep moving between shots. A crate of rockets "
        "nearby means the fight is a long one.",
    )

    def test_hollow_knight_boss_description_no_longer_shows_the_notice(self):
        # The device measured a raw meaning score of 0.655 -- just *above* the 0.65 ceiling on
        # its own -- and only showed the notice because the game-name-stripped companion score
        # (HONESTY-TEXT-GAME-01 part two, tested on its own in
        # GameNamedOnlyInTheQuestionMeaningTests above) came in lower. This test isolates the
        # keyword/title-vs-text half of the fix instead, with a meaning score already under the
        # ceiling either way, so only the keyword-support check decides the outcome below.
        #
        # Before this fix: titles alone give no overlap with the question's real words ("boss",
        # "past", "crystal", "spike", "area", ...), so the notice wrongly showed under a reply
        # that plainly used the Broken Vessel note.
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=24.76,
                kb_best_meaning=0.60,
                question=self._HK_QUESTION,
                kb_game_name="Hollow Knight",
                kb_source_titles=self._HK_TITLES,
            )
        )
        # After this fix: the note's own text carries "past" and "crystal", so the same turn no
        # longer shows the notice.
        self.assertFalse(
            _thin(
                kb_top_card_keyword_score=24.76,
                kb_best_meaning=0.60,
                question=self._HK_QUESTION,
                kb_game_name="Hollow Knight",
                kb_source_titles=self._HK_TITLES,
                kb_source_texts=self._HK_TEXTS,
            )
        )

    def test_half_life_2_walkthrough_no_longer_shows_the_notice(self):
        # Before this fix: "chapters" (the question) shares no word with any of the three titles.
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=5.2278805106341215,
                kb_best_meaning=0.5820469847443327,
                question=self._HL2_QUESTION,
                kb_game_name="Half-Life 2",
                kb_source_titles=self._HL2_TITLES,
            )
        )
        # After this fix: Sandtraps' own text says "the coastal chapter" -- singular, where the
        # question says "chapters" -- and the plural/singular tolerance in `_content_words` is
        # what lets that count as the same word.
        self.assertFalse(
            _thin(
                kb_top_card_keyword_score=5.2278805106341215,
                kb_best_meaning=0.5820469847443327,
                question=self._HL2_QUESTION,
                kb_game_name="Half-Life 2",
                kb_source_titles=self._HL2_TITLES,
                kb_source_texts=self._HL2_TEXTS,
            )
        )

    def test_a_genuine_wrong_subject_case_still_shows_the_notice(self):
        # The guard against over-reach: a real device reply that SHOULD keep this line
        # (docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json). "How do I beat the boss at the
        # end of the first area in Hades?" attached the wrong notes (Temple of Styx, Theseus and
        # Asterius) and the reply named the wrong boss. Theseus and Asterius' own card happens to
        # say "...killing Asterius first...", which would have wrongly counted as a match on the
        # word "first" alone -- exactly why "first"/"last"/"next" were added to the filler words
        # rather than left as ordinary content.
        titles = ("Hades — Temple of Styx", "Hades — Theseus and Asterius")
        texts = (
            "Buy charms before entry; poison resistance or healing crucial. Route choice "
            "affects shop access.",
            "Two at once, which is the actual difficulty. Asterius, the bull, telegraphs a long "
            "charge — sidestep it and he is briefly stuck. Theseus throws his spear and "
            "periodically calls down a god's power, which is marked on the ground before it "
            "lands. Most runs go better killing Asterius first, because Theseus alone is "
            "predictable.",
        )
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=6.0,
                kb_best_meaning=0.5,
                question="How do I beat the boss at the end of the first area in Hades?",
                kb_game_name="Hades",
                kb_source_titles=titles,
                kb_source_texts=texts,
            )
        )

    def test_black_mesa_horse_question_still_shows_the_notice_with_texts_too(self):
        # The other regression guard: adding note text must not quiet the horse-taming case
        # `GameNamedOnlyInTheQuestionTests` above already covers with titles alone.
        titles = (
            "Black Mesa — Starting out in Black Mesa",
            "Black Mesa — The opening tram ride and where it leads",
            "Black Mesa — Houndeye",
        )
        texts = (
            "Black Mesa is Half-Life rebuilt from the ground up on the Source engine, with new "
            "art, sound and voice work but the original's chapters, weapons and enemies kept on "
            "purpose rather than added to.",
            "Black Mesa opens with a long tram ride that needs no input beyond looking around; "
            "it carries you from the surface entrance through checkpoints and cargo bays into "
            "the underground facility.",
            "Three-legged with one big compound eye, and always in a pack of up to four. Alone "
            "one is timid; together they charge a sonic shockwave that hurts you and smashes "
            "crates and glass.",
        )
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=2.4,
                kb_best_meaning=0.60,
                question="black mesa how do i tame a horse",
                kb_game_name="Black Mesa",
                kb_source_titles=titles,
                kb_source_texts=texts,
            )
        )

    def test_no_texts_passed_behaves_exactly_as_before_the_fix(self):
        # Backward compatibility: every caller and every test that predates this fix never
        # passes kb_source_texts, so titles alone keep deciding this exactly as before.
        self.assertTrue(
            _thin(
                kb_top_card_keyword_score=24.76,
                kb_best_meaning=0.60,
                question=self._HK_QUESTION,
                kb_game_name="Hollow Knight",
                kb_source_titles=self._HK_TITLES,
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
