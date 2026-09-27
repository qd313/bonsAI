"""Tests that run_game_ai_request actually appends the "not in my notes" attribution line to
the reply the user (and transparency) sees -- not just that the decision function works in
isolation. See tests/test_kb_not_in_notes_notice.py for the module's own unit tests.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()  # so this file also runs on its own on Windows, not only after another installs it

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_service import KbCoverageSummary, KnowledgeRetrievalResult  # noqa: E402

_NOT_IN_NOTES_TEXT = "Not in my notes — this answer is from the model's own knowledge."
_NO_TIP_TEXT = "No tip for this — this answer is from the model's own knowledge."
_NO_CLOSE_MATCH_TEXT = (
    "No close match in my notes, this answer leans on the model's own knowledge."
)


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        self.persisted_snapshots: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        self.persisted_snapshots.append(payload)


def _run(
    plugin: _FakePlugin,
    ask_mode: str,
    question: str = "How do I beat the third boss?",
    app_id: str = "570",
    app_name: str = "Dota 2",
):
    return asyncio.run(
        run_game_ai_request(
            plugin,
            question,
            "127.0.0.1:11434",
            app_id=app_id,
            app_name=app_name,
            ask_mode=ask_mode,
        )
    )


def _base_settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": True,
    }


class NotInNotesWiringTests(unittest.TestCase):
    # Coverage says the corpus has sections for the running game, but retrieval found nothing
    # worth attaching -- this is the "covered game, no match" case the notice exists for.
    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, unavailable_reason="no_match"),
    )
    def test_covered_game_no_match_appends_the_notice(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))
        # Reaches the transparency snapshot Show Details reads, same as the model text does.
        self.assertEqual(len(plugin.persisted_snapshots), 1)
        self.assertIn(
            _NOT_IN_NOTES_TEXT, plugin.persisted_snapshots[0].get("final_response", "")
        )

    # Same coverage, but this time a note actually attached -- no notice.
    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(
            attached=True,
            text_block="Boss note: focus the adds first.",
            trust_tier="wiki",
            sources=[{"title": "Wiki"}],
        ),
    )
    def test_covered_game_with_match_shows_no_notice(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    # Speed never shows the line, even with the two other signals qualifying.
    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, unavailable_reason="no_match"),
    )
    def test_speed_mode_shows_no_notice(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="speed")

        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    # Library off: summarize_kb_coverage's real behaviour (no patch needed) is kb_off before it
    # ever touches the corpus, and should_retrieve_knowledge skips retrieval outright.
    def test_library_off_shows_no_notice(self):
        settings = _base_settings()
        settings["use_local_knowledge_base"] = False
        plugin = _FakePlugin(settings)
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    # Uncovered game: no corpus configured, so summarize_kb_coverage's real behaviour returns
    # corpus_missing (never "sections") without needing a patch.
    def test_uncovered_game_shows_no_notice(self):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))


class NoTipForThisWiringTests(unittest.TestCase):
    """Tests that run_game_ai_request appends the "no tip for this" line to the reply the user
    (and transparency) sees. See tests/test_kb_not_in_notes_notice.py for the module's own unit
    tests of the decision function this wires up.
    """

    # Routed to the tip sheet, nothing attached -- the case the line exists for. Speed mode on
    # purpose: unlike the sibling line, this one has no Ask-mode gate.
    @patch(
        "backend.services.game_ai_request.should_retrieve_knowledge",
        return_value=(True, "compat"),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, notes="no_hit (keyword)"),
    )
    def test_routed_to_tips_with_nothing_attached_appends_the_line(self, _retrieve, _should_kb):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Try restarting Steam and checking your network connection.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="speed", question="my controller stopped working")

        self.assertIn(_NO_TIP_TEXT, result.get("response", ""))
        self.assertEqual(len(plugin.persisted_snapshots), 1)
        self.assertIn(_NO_TIP_TEXT, plugin.persisted_snapshots[0].get("final_response", ""))

    # Same routing, but a tip actually attached -- no line.
    @patch(
        "backend.services.game_ai_request.should_retrieve_knowledge",
        return_value=(True, "compat"),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(
            attached=True,
            text_block="Tip: re-pair the controller from Bluetooth settings.",
            trust_tier="wiki",
            sources=[{"title": "Tip"}],
        ),
    )
    def test_a_tip_that_attached_shows_no_line(self, _retrieve, _should_kb):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Re-pair the controller from Bluetooth settings.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="speed", question="my controller stopped working")

        self.assertNotIn(_NO_TIP_TEXT, result.get("response", ""))

    # Routed to the notes instead of the tips -- this turn's search never looked at the tip
    # sheet, so the line must not appear even with nothing attached.
    @patch(
        "backend.services.game_ai_request.should_retrieve_knowledge",
        return_value=(True, "strategy"),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, unavailable_reason="no_match"),
    )
    def test_routed_to_notes_shows_no_line(self, _retrieve, _should_kb):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertNotIn(_NO_TIP_TEXT, result.get("response", ""))

    # Missing corpus: retrieve_knowledge_context's real early return for this, "corpus_missing".
    @patch(
        "backend.services.game_ai_request.should_retrieve_knowledge",
        return_value=(True, "compat"),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, unavailable_reason="corpus_missing"),
    )
    def test_missing_corpus_shows_no_line(self, _retrieve, _should_kb):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Some reply text.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="speed", question="my controller stopped working")

        self.assertNotIn(_NO_TIP_TEXT, result.get("response", ""))

    # Library off: should_retrieve_knowledge's real behaviour (no patch needed) skips retrieval
    # outright, so kb_domain never becomes "compat" and the line cannot fire.
    def test_library_off_shows_no_line(self):
        settings = _base_settings()
        settings["use_local_knowledge_base"] = False
        plugin = _FakePlugin(settings)
        plugin._ollama_result = {
            "success": True,
            "response": "Some reply text.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="speed", question="my controller stopped working")

        self.assertNotIn(_NO_TIP_TEXT, result.get("response", ""))


class TheTwoNoticesNeverBothAppearWiringTests(unittest.TestCase):
    """The one collision the module-level tests can only prove is possible in isolation: an
    Expert or Strategy ask about a game the notes cover, where *this* question was routed to
    the tip sheet instead and nothing there matched either. Both decision functions would read
    True; run_game_ai_request must show only the tip-sheet line.
    """

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.should_retrieve_knowledge",
        return_value=(True, "compat"),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=KnowledgeRetrievalResult(attached=False, notes="no_hit (keyword)"),
    )
    def test_no_tip_for_this_wins_over_not_in_my_notes(self, _retrieve, _should_kb, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Restart the game and check your network settings.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="expert", question="the game keeps crashing to desktop")

        response = result.get("response", "")
        self.assertIn(_NO_TIP_TEXT, response)
        self.assertNotIn(_NOT_IN_NOTES_TEXT, response)


def _attached(*, best_meaning, keyword_score, notes: str = "") -> KnowledgeRetrievalResult:
    return KnowledgeRetrievalResult(
        attached=True,
        text_block="Boss note: focus the adds first.",
        trust_tier="wiki",
        sources=[{"title": "Wiki"}],
        best_meaning=best_meaning,
        top_card_keyword_score=keyword_score,
        notes=notes,
    )


class NoCloseMatchWiringTests(unittest.TestCase):
    """The third line, end to end through run_game_ai_request."""

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_attached(best_meaning=0.60, keyword_score=0.0),
    )
    def test_a_thin_note_appends_the_notice(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertIn(_NO_CLOSE_MATCH_TEXT, result.get("response", ""))
        # The other two lines are about a turn where nothing attached; neither belongs here.
        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))
        self.assertNotIn(_NO_TIP_TEXT, result.get("response", ""))
        # Reaches the snapshot Show details reads, same as the model text does.
        self.assertEqual(len(plugin.persisted_snapshots), 1)
        self.assertIn(
            _NO_CLOSE_MATCH_TEXT, plugin.persisted_snapshots[0].get("final_response", "")
        )

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_attached(best_meaning=0.78, keyword_score=0.0),
    )
    def test_a_close_note_appends_nothing(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        self.assertNotIn(_NO_CLOSE_MATCH_TEXT, _run(plugin, ask_mode="strategy").get("response", ""))

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_attached(best_meaning=0.60, keyword_score=4.5),
    )
    def test_a_note_the_keyword_search_found_appends_nothing(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        self.assertNotIn(_NO_CLOSE_MATCH_TEXT, _run(plugin, ask_mode="strategy").get("response", ""))

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_attached(best_meaning=None, keyword_score=0.0),
    )
    def test_a_turn_with_no_meaning_score_appends_nothing(self, _retrieve, _coverage):
        # The case a Deck with no embed model is in on every single turn. Guarding this here as
        # well as in the decision function because it is the one that would be noticed by every
        # user at once if it regressed.
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Focus down the adds first, then burst the boss.",
            "model": "test-model",
        }

        self.assertNotIn(_NO_CLOSE_MATCH_TEXT, _run(plugin, ask_mode="strategy").get("response", ""))


class RerouteToTheTipSheetWiringTests(unittest.TestCase):
    """Plan 70 helper P, end to end. A Strategy Ask about a running game locks
    `should_retrieve_knowledge`'s domain to "strategy" before the question is even read (see
    knowledge_base_service.py), and that value is never revisited even when
    `_reroute_to_game_tip_if_it_fits` later sends the turn to the tip sheet instead -- so a
    turn the tip sheet actually answered still carries `kb_domain == "strategy"` all the way to
    this notice. Measured on the Deck 2026-09-26 (docs/test-evidence/plan70-R4-try3.json): Deep
    Rock Galactic: Survivor's own Render Scale tip attached and the reply used it, and the reply
    still ended with "No close match in my notes" underneath it."""

    @patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=4),
    )
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_attached(best_meaning=0.60, keyword_score=0.0, notes="compat_tips"),
    )
    def test_a_rerouted_tip_does_not_get_told_no_close_match(self, _retrieve, _coverage):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Raise the Render Scale slider -- below about 90% the text gets hard to read.",
            "model": "test-model",
        }

        result = _run(plugin, ask_mode="strategy")

        self.assertNotIn(_NO_CLOSE_MATCH_TEXT, result.get("response", ""))

    def test_a_rerouted_tip_turn_leaves_no_follow_up_subject(self):
        # The real block a rerouted Strategy turn gets (release library, 2026-09-26): its tip
        # headers parse as card names, so a turn still labelled "strategy" remembered "display"
        # as what the chat was about, and the next bare follow-up searched for it.
        tip_block = (
            "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
            "Domain: compat\n\n"
            "[Tip: display] (trust: wiki_no_patch)\n"
            "Researched, unconfirmed: the Render Scale slider also blurs menu/HUD text.\n"
        )
        retrieval = KnowledgeRetrievalResult(
            attached=True, text_block=tip_block, trust_tier="wiki_no_patch", notes="compat_tips"
        )
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {"success": True, "response": "Raise Render Scale.", "model": "m"}
        kb_followup_memory.forget()
        try:
            with patch(
                "backend.services.game_ai_request.summarize_kb_coverage",
                return_value=KbCoverageSummary(status="sections", section_count=4),
            ), patch(
                "backend.services.game_ai_request.retrieve_knowledge_context",
                return_value=retrieval,
            ):
                _run(plugin, ask_mode="strategy", question="the text looks blurry on my deck")

            remembered = kb_followup_memory.recall(
                app_id="570", app_name="Dota 2", text_resolved_title=""
            )
            self.assertEqual(remembered, "")
        finally:
            kb_followup_memory.forget()


def _black_mesa_retrieval(sources: list) -> KnowledgeRetrievalResult:
    """What lane J's device run attached: same corpus text, trust tier, meaning score and
    keyword score in both cases below -- only the card titles that came back differ.
    """
    return KnowledgeRetrievalResult(
        attached=True,
        text_block="Black Mesa notes.",
        trust_tier="wiki_no_patch",
        sources=sources,
        best_meaning=0.60,
        top_card_keyword_score=2.4,
    )


def _resolved_to_black_mesa_with_no_game_running(test_fn):
    """The two patches every test below needs: nothing running, so the game comes only from
    the words in the question, against the same corpus size lane J's device run had.
    """
    test_fn = patch(
        "backend.services.game_ai_request.summarize_kb_coverage",
        return_value=KbCoverageSummary(status="sections", section_count=14),
    )(test_fn)
    test_fn = patch(
        "backend.services.game_ai_request.resolve_title_from_question",
        return_value="Black Mesa",
    )(test_fn)
    return test_fn


class GameNamedOnlyInTheQuestionWiringTests(unittest.TestCase):
    """HONESTY-TEXT-GAME-01 (plan 56 lane J), end to end: nothing running, the game named only
    in the question. See docs/test-evidence/plan55-HONESTY-TEXT-GAME-01.json for the device run
    this reproduces.
    """

    @_resolved_to_black_mesa_with_no_game_running
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_black_mesa_retrieval(
            [
                {"title": "Black Mesa — Starting out in Black Mesa"},
                {"title": "Black Mesa — The opening tram ride and where it leads"},
                {"title": "Black Mesa — Houndeye"},
            ]
        ),
    )
    def test_horse_question_with_nothing_running_shows_the_line(
        self, _retrieve, _coverage, _resolve_title
    ):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "I don't have anything on taming a horse in Black Mesa.",
            "model": "test-model",
        }

        result = _run(
            plugin,
            ask_mode="strategy",
            question="black mesa how do i tame a horse",
            app_id="",
            app_name="",
        )

        self.assertIn(_NO_CLOSE_MATCH_TEXT, result.get("response", ""))

    @_resolved_to_black_mesa_with_no_game_running
    @patch(
        "backend.services.game_ai_request.retrieve_knowledge_context",
        return_value=_black_mesa_retrieval([{"title": "Black Mesa — Gonarch"}]),
    )
    def test_a_real_question_about_the_game_shows_no_line(
        self, _retrieve, _coverage, _resolve_title
    ):
        plugin = _FakePlugin(_base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Circle around and pop the sacs on its back.",
            "model": "test-model",
        }

        result = _run(
            plugin,
            ask_mode="strategy",
            question="how do i beat the gonarch in black mesa",
            app_id="",
            app_name="",
        )

        self.assertNotIn(_NO_CLOSE_MATCH_TEXT, result.get("response", ""))


if __name__ == "__main__":
    unittest.main()
