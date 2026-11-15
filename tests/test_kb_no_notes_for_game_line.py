"""Plan 104 lane H2 (Deck check P104-NO-NOTES-LINE-01): a small line under the answer when the
library holds nothing for the game, in Speed, Strategy and Expert.

Before this, an answer about Stardew Valley or Terraria (games the library does not hold) came
from the model's memory and said nothing about it. The two older lines ("Not in my notes", "No
close match") only exist for games the library holds. These tests run the real
``run_game_ai_request`` with a stand-in model and look at the text the person reads: the third line
shows for a game the library has no entry for (running, or named while nothing runs), and stays
away from a game it holds, a thank-you, a troubleshooting question and a missing or switched-off
library. The decision function's own cases are at the bottom.
"""

import unittest
from unittest.mock import patch

from test_kb_not_in_notes_wiring import _FakePlugin, _base_settings, _run  # same stand-in model and setup

from backend.knowledge import kb_not_in_notes_notice  # noqa: E402
from backend.knowledge.knowledge_base_service import KbCoverageSummary, KnowledgeRetrievalResult  # noqa: E402

_LINE = "No notes for this game — this answer is from the model's own knowledge."
_NOT_IN_NOTES = "Not in my notes — this answer is from the model's own knowledge."
_NO_CLOSE_MATCH = "No close match in my notes, this answer leans on the model's own knowledge."
_MODES = ("speed", "strategy", "expert")
_STARDEW = {"app_id": "413150", "app_name": "Stardew Valley"}
_NOTHING_RUNNING = {"app_id": "", "app_name": ""}
_GENRE_CARD = KnowledgeRetrievalResult(
    attached=True,
    text_block="\n[Genre/compat fallback] (trust: fallback_no_source)\nGeneral genre advice.\n",
    trust_tier="fallback_no_source",
    sources=[],
)
_NOTHING_FOUND = KnowledgeRetrievalResult(attached=False, unavailable_reason="no_match")
_A_REAL_NOTE = KnowledgeRetrievalResult(
    attached=True,
    text_block="\n[Hollow Knight / boss: Mantis Lords] (trust: wiki)\nThree lords, two at once.\n",
    trust_tier="wiki",
    sources=[{"title": "Hollow Knight — Mantis Lords"}],
)


def _ask(coverage, retrieved, *, mode, question="How do I get more money early on?", game=_STARDEW,
         settings=None, domain=None):
    """The finished reply for one turn: the model says one sentence, the plugin adds what it adds."""
    plugin = _FakePlugin(settings or _base_settings())
    plugin._ollama_result = {"success": True, "response": "Sell what you grow.", "model": "test-model"}
    patches = [
        patch("backend.ask.game_ai_request.summarize_kb_coverage", return_value=coverage),
        patch("backend.ask.game_ai_request.retrieve_knowledge_context", return_value=retrieved),
    ]
    if domain is not None:
        patches.append(patch("backend.ask.game_ai_request.should_retrieve_knowledge", return_value=(True, domain)))
    for p in patches:
        p.start()
    try:
        result = _run(plugin, ask_mode=mode, question=question, **game)
    finally:
        for p in patches:
            p.stop()
    return str(result.get("response", "")), plugin


class NoNotesForThisGameLineTests(unittest.TestCase):
    def test_a_running_game_the_library_does_not_hold_ends_with_the_line_in_every_mode(self):
        for mode in _MODES:
            for retrieved in (_NOTHING_FOUND, _GENRE_CARD):  # a genre card is not a note about the game
                with self.subTest(mode=mode, attached=retrieved.attached):
                    text, plugin = _ask(KbCoverageSummary(status="app_unresolved"), retrieved, mode=mode)
                    self.assertTrue(text.endswith(f"\n\n—\n*{_LINE}*"), text)
                    self.assertEqual(text.count("—\n*"), 1)  # one line, not two
                    self.assertIn(_LINE, plugin.persisted_snapshots[0].get("final_response", ""))

    def test_a_game_the_library_knows_but_holds_no_notes_for_gets_the_line(self):
        for mode in _MODES:
            with self.subTest(mode=mode):
                text, _ = _ask(KbCoverageSummary(status="no_sections"), _NOTHING_FOUND, mode=mode)
                self.assertIn(_LINE, text)

    def test_nothing_running_and_a_well_known_game_named_gets_the_line_in_every_mode(self):
        for mode in _MODES:
            with self.subTest(mode=mode):
                text, _ = _ask(KbCoverageSummary(status="no_app"), _NOTHING_FOUND, mode=mode,
                               question="Any tips for the first night in Terraria?", game=_NOTHING_RUNNING)
                self.assertTrue(text.endswith(f"*{_LINE}*"), text)

    def test_nothing_running_and_no_game_named_gets_no_line(self):
        for mode in _MODES:
            with self.subTest(mode=mode):
                text, _ = _ask(KbCoverageSummary(status="no_app"), _NOTHING_FOUND, mode=mode,
                               question="What is a good way to unwind after work?", game=_NOTHING_RUNNING)
                self.assertNotIn("No notes for this game", text)

    def test_a_game_the_library_holds_gets_no_line_when_a_note_attached(self):
        for mode in _MODES:
            with self.subTest(mode=mode):
                text, _ = _ask(KbCoverageSummary(status="sections", section_count=9), _A_REAL_NOTE, mode=mode,
                               question="How do I beat the Mantis Lords?",
                               game={"app_id": "367520", "app_name": "Hollow Knight"})
                self.assertNotIn("No notes for this game", text)

    def test_never_together_with_one_of_the_two_older_lines(self):
        # A held game with nothing found: the older line shows (Strategy and Expert), the new one does not.
        text, _ = _ask(KbCoverageSummary(status="sections", section_count=9), _NOTHING_FOUND, mode="strategy",
                       game={"app_id": "367520", "app_name": "Hollow Knight"})
        self.assertIn(_NOT_IN_NOTES, text)
        self.assertNotIn("No notes for this game", text)
        # A held game where a note came back that was a stretch: "No close match" only.
        stretch = KnowledgeRetrievalResult(
            attached=True, text_block="\n[Hollow Knight / boss: Mantis Lords] (trust: wiki)\nThree lords.\n",
            trust_tier="wiki", sources=[{"title": "Hollow Knight — Mantis Lords"}], best_meaning=0.4,
            top_card_keyword_score=0.0)
        text, _ = _ask(KbCoverageSummary(status="sections", section_count=9), stretch, mode="strategy",
                       question="How do I tame a horse?", game={"app_id": "367520", "app_name": "Hollow Knight"})
        self.assertNotIn("No notes for this game", text)
        self.assertEqual(text.count("—\n*"), text.count(_NO_CLOSE_MATCH))

    def test_a_thank_you_gets_no_line(self):
        for mode in _MODES:
            with self.subTest(mode=mode):
                text, _ = _ask(KbCoverageSummary(status="app_unresolved"), _NOTHING_FOUND, mode=mode,
                               question="thank you very much")
                self.assertEqual(text, "Sell what you grow.")

    def test_a_troubleshooting_question_gets_no_line(self):
        # The turn went to the shared tips, which are not about one game.
        for mode in _MODES:
            for retrieved in (_NOTHING_FOUND, _GENRE_CARD):
                with self.subTest(mode=mode, attached=retrieved.attached):
                    text, _ = _ask(KbCoverageSummary(status="app_unresolved"), retrieved, mode=mode,
                                   question="the game crashes on startup", domain="compat")
                    self.assertNotIn("No notes for this game", text)

    def test_a_missing_or_switched_off_library_gets_no_line(self):
        for status in ("kb_off", "corpus_missing", "corpus_error"):
            with self.subTest(status=status):
                text, _ = _ask(KbCoverageSummary(status=status), _NOTHING_FOUND, mode="strategy")
                self.assertNotIn("No notes for this game", text)
        off = _base_settings()
        off["use_local_knowledge_base"] = False
        text, _ = _ask(KbCoverageSummary(status="kb_off"), _NOTHING_FOUND, mode="speed", settings=off)
        self.assertEqual(text, "Sell what you grow.")


class DecisionTests(unittest.TestCase):
    """The same decision on its own, so each reason to stay quiet is pinned without the whole ask."""

    def _show(self, status="app_unresolved", transparency=None, notes=(), question="how do I farm?"):
        return kb_not_in_notes_notice.should_show_no_notes_for_game_notice(
            kb_coverage_status=status,
            kb_transparency={"kb_attached": False, "kb_domain": "strategy", "kb_notes": "", "kb_sources": [],
                             **(transparency or {})},
            kb_attached_notes=list(notes),
            question=question,
        )

    def test_the_covered_statuses_are_not_this_lines_business(self):
        self.assertFalse(self._show(status="sections"))
        self.assertFalse(self._show(status="kb_off"))
        self.assertFalse(self._show(status="none"))

    def test_no_app_needs_a_well_known_game_in_the_question(self):
        self.assertFalse(self._show(status="no_app"))
        self.assertTrue(self._show(status="no_app", question="best seeds in stardew valley"))

    def test_a_tip_turn_is_left_alone_even_when_a_tip_attached(self):
        self.assertFalse(self._show(transparency={"kb_domain": "compat"}))
        self.assertFalse(self._show(transparency={"kb_domain": "strategy", "kb_notes": "compat_tips"}))
        self.assertFalse(self._show(transparency={"kb_domain": "compat", "kb_attached": True,
                                                  "kb_sources": [{"title": "tip"}]}))

    def test_a_game_note_that_attached_means_no_line(self):
        self.assertFalse(self._show(transparency={"kb_attached": True, "kb_sources": [{"title": "x"}]},
                                    notes=[{"name": "Boss", "kind": "boss"}]))

    def test_a_genre_card_alone_does_not_count_as_a_game_note(self):
        self.assertTrue(self._show(transparency={"kb_attached": True, "kb_trust_tier": "fallback_no_source"}))

    def test_a_note_cut_for_room_means_no_line(self):
        self.assertFalse(self._show(transparency={"kb_notes": "dropped_by_context_budget"}))

    def test_append_adds_the_line_in_the_footer_shape_only_when_asked(self):
        self.assertEqual(kb_not_in_notes_notice.append_no_notes_for_game_notice("Hi.\n", False), "Hi.\n")
        self.assertEqual(kb_not_in_notes_notice.append_no_notes_for_game_notice("Hi.\n", True), f"Hi.\n\n—\n*{_LINE}*")


class LogLineTests(unittest.TestCase):
    """The plugin log's "notes for this answer" line (read back by the Deck check) names the new line too."""

    def test_the_log_line_names_the_line_when_it_was_added(self):
        line = kb_not_in_notes_notice.kb_attach_log_line(
            {"kb_attached": False}, [], not_in_notes_shown=False, no_close_match_shown=False,
            no_notes_for_game_shown=True)
        self.assertIn("'No notes for this game' line added", line)

    def test_the_log_line_is_as_it_was_when_it_was_not(self):
        line = kb_not_in_notes_notice.kb_attach_log_line(
            {"kb_attached": False}, [], not_in_notes_shown=False, no_close_match_shown=False)
        self.assertTrue(line.endswith("no footer line added"), line)

    def test_a_real_turn_logs_it(self):
        from backend.knowledge import kb_notes_footers
        with patch.object(kb_notes_footers, "logger") as fake_logger:
            kb_notes_footers.append_kb_notes_footers(
                "Sell what you grow.", ask_mode="speed",
                kb_transparency={"kb_attached": False, "kb_domain": "strategy", "kb_notes": "", "kb_sources": []},
                kb_coverage_transparency={"kb_coverage_status": "app_unresolved"}, text_resolved_title="",
                question_for_kb_search="how do I get money", kb_attached_notes=[])
        self.assertIn("'No notes for this game' line added", str(fake_logger.info.call_args_list[0].args[0]))


if __name__ == "__main__":
    unittest.main()
