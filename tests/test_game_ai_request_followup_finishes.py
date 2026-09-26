"""Tests that game_ai_request.py's follow-up block actually wires the two plan 70 helper K
measurement switches (kb_followup_memory.drop_runnerup_notes_enabled / send_prev_qa_enabled).
The maintainer picked finish 3 from the measured numbers, so send_prev_qa_enabled() is on by
default and its environment variable now only ever turns it back off; drop_runnerup_notes_enabled()
stays off unless turned on. Per-test environment cleanup so a later test file never inherits
either switch's environment variable left set.

Reuses the neighbouring test file's fake plugin, question runner and settings dict
(tests/test_game_ai_request_followup_memory.py) rather than a second, near-identical copy of
each -- this file only adds what that one does not need: capturing the *positional* arguments
run_game_ai_request hands to ask_ollama, since finish 3's context block is spliced into
question_for_model, the first positional argument, not a kwarg.
"""

import asyncio
import os
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_service import KnowledgeRetrievalResult  # noqa: E402
from test_game_ai_request_followup_memory import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    _FakePlugin as _BaseFakePlugin,
    _run,
)


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": True,
    }


class _FakePlugin(_BaseFakePlugin):
    """The neighbour's fake plugin, plus positional-argument capture and a real record of every
    transparency snapshot game_ai_request.py builds and saves (the neighbour's own version is a
    no-op there)."""

    def __init__(self, settings: dict):
        super().__init__(settings)
        self.ask_ollama_args: list = []
        self.transparency_snapshots: list = []

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_args.append(args)
        return await super().ask_ollama(*args, **kwargs)

    async def _persist_input_transparency(self, payload):
        self.transparency_snapshots.append(payload)


def _ok_result(text: str = "Here is how.") -> dict:
    return {"success": True, "response": text, "model": "test-model"}


def _two_card_result() -> KnowledgeRetrievalResult:
    return KnowledgeRetrievalResult(
        attached=True,
        text_block=(
            "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
            "Domain: strategy\n"
            f"\n[{_DRG_APP_NAME} / boss: Dreadnought Twins] (trust: high)\n"
            "Split fire between them.\n"
            f"\n[{_DRG_APP_NAME} / boss: Glyphid Dreadnought] (trust: high)\n"
            "Break the glowing plates, then focus the head.\n"
            "--- End local knowledge base ---"
        ),
        sources=[],
    )


def _run_followup_pair(
    mock_retrieve,
    plugin,
    first_question: str,
    second_question: str,
    *,
    second_retrieval=None,
    app_id: str = _DRG_APP_ID,
    app_name: str = _DRG_APP_NAME,
) -> None:
    """A self-naming first turn (so a subject gets remembered), then a bare follow-up second
    turn against the same plugin and chat, resetting the retrieval mock in between. Shared by
    every wiring test below that only differs in which switch is set and what it checks
    afterward off `plugin` -- see each test for that part.
    """
    mock_retrieve.return_value = _two_card_result()
    _run(plugin, first_question)
    mock_retrieve.reset_mock()
    mock_retrieve.return_value = second_retrieval if second_retrieval is not None else _two_card_result()
    _run(plugin, second_question, app_id=app_id, app_name=app_name)


class _SwitchTestCase(unittest.TestCase):
    """Base class: clears kb_followup_memory and both env switches before and after every test,
    so leaving one on by accident in an earlier test never leaks into a later file."""

    def setUp(self):
        kb_followup_memory.forget()
        os.environ.pop(kb_followup_memory.DROP_RUNNERUP_ENV, None)
        os.environ.pop(kb_followup_memory.SEND_PREV_QA_ENV, None)

    def tearDown(self):
        kb_followup_memory.forget()
        os.environ.pop(kb_followup_memory.DROP_RUNNERUP_ENV, None)
        os.environ.pop(kb_followup_memory.SEND_PREV_QA_ENV, None)


class DropRunnerupSwitchWiringTests(_SwitchTestCase):
    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_off_by_default_the_sibling_card_still_reaches_the_model(self, mock_retrieve):
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about its second phase",
        )

        attached = plugin.ask_ollama_calls[-1]["proton_log_attachment"] or ""
        self.assertIn("Dreadnought Twins", attached)
        self.assertIn("Glyphid Dreadnought", attached)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_only_the_subjects_own_card_reaches_the_model(self, mock_retrieve):
        os.environ[kb_followup_memory.DROP_RUNNERUP_ENV] = "1"
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about its second phase",
        )

        attached = plugin.ask_ollama_calls[-1]["proton_log_attachment"] or ""
        self.assertIn("Glyphid Dreadnought", attached)
        self.assertNotIn("Dreadnought Twins", attached)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_but_not_a_followup_turn_leaves_both_cards(self, mock_retrieve):
        os.environ[kb_followup_memory.DROP_RUNNERUP_ENV] = "1"
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        # A first, self-naming question -- no remembered subject is in play yet, so the switch
        # has nothing to act on.
        _run(plugin, "how do i beat the glyphid dreadnought")

        attached = plugin.ask_ollama_calls[-1]["proton_log_attachment"] or ""
        self.assertIn("Dreadnought Twins", attached)
        self.assertIn("Glyphid Dreadnought", attached)


class SendPrevQaSwitchWiringTests(_SwitchTestCase):
    """The maintainer's pick: on by default, so these prove the default rather than an opt-in."""

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_by_default_the_previous_question_and_a_trimmed_answer_are_sent(self, mock_retrieve):
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about its second phase",
        )

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertIn("FOLLOW-UP CONTEXT", question_sent)
        self.assertIn("how do i beat the glyphid dreadnought", question_sent)
        self.assertIn("Break the glowing plates first.", question_sent)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_explicit_zero_turns_it_off(self, mock_retrieve):
        os.environ[kb_followup_memory.SEND_PREV_QA_ENV] = "0"
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about its second phase",
        )

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertNotIn("FOLLOW-UP CONTEXT", question_sent)
        self.assertEqual(
            kb_followup_memory.recall_previous_turn(
                app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, text_resolved_title=""
            ),
            ("", ""),
        )

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_but_the_first_turn_has_no_previous_answer_to_send(self, mock_retrieve):
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertNotIn("FOLLOW-UP CONTEXT", question_sent)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_different_game_in_the_same_chat_sends_nothing(self, mock_retrieve):
        """A bare follow-up right after switching games: the game just asked about (Hades) is not
        the one this chat's memory holds a subject for (Deep Rock Galactic: Survivor), so
        kb_followup_memory.recall() -- checked before the switch ever gets a look-in -- returns no
        subject at all, the game-change side effect it already had before this lane existed. With
        no remembered subject, the whole follow-up block is skipped, so the switch has nothing to
        send regardless of its own setting."""
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about her second phase",
            second_retrieval=KnowledgeRetrievalResult(attached=False),
            app_id="1145360",
            app_name="Hades",
        )

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertNotIn("FOLLOW-UP CONTEXT", question_sent)
        self.assertEqual(
            kb_followup_memory.recall_previous_turn(
                app_id="1145360", app_name="Hades", text_resolved_title=""
            ),
            ("", ""),
        )


class SavedQuestionNeverLeaksTheReminderTests(_SwitchTestCase):
    """The other half of the QA regression (docs/test-evidence/plan70-QA-FREE-PLAY-01.json): the
    saved "text_after_sanitizer" field -- Show details and the desktop trace log's source for
    what the person asked -- must also read the person's own words, never finish 3's reminder
    text spliced ahead of it for the model. Runs the real two-turn follow-up through the real
    run_game_ai_request, exactly as the wiring tests above do; only ask_ollama itself is a stub,
    so everything game_ai_request.py itself does, including building this saved snapshot, runs
    for real.
    """

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_the_saved_question_and_the_progress_line_both_stay_clean(self, mock_retrieve):
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run_followup_pair(
            mock_retrieve,
            plugin,
            "how do i beat the glyphid dreadnought",
            "what about its second phase",
        )

        self.assertEqual(len(plugin.transparency_snapshots), 2)
        for snapshot in plugin.transparency_snapshots:
            self.assertNotIn("FOLLOW-UP CONTEXT", str(snapshot.get("text_after_sanitizer") or ""))
        self.assertEqual(
            plugin.transparency_snapshots[-1].get("text_after_sanitizer"),
            "what about its second phase",
        )
        # The progress-line half: question_for_display is what a live status line would quote,
        # and it stays clean even though the model itself still receives the reminder ahead of it.
        self.assertEqual(
            plugin.ask_ollama_calls[-1].get("question_for_display"),
            "what about its second phase",
        )
        self.assertIn("FOLLOW-UP CONTEXT", plugin.ask_ollama_args[-1][0])


class BranchPickDisplayQuestionTests(_SwitchTestCase):
    """The same leak, a second way to trigger it: picking a branch from the suggestion menu
    sends the model "[Strategy follow-up] I'm at: …", but the live progress line and Show
    details must show the friendly "I'm at: …" the saved turn header already does -- caught on
    the Deck, docs/test-evidence/plan70-L5-FLOW3-DRG.json. main.py's accept step already has that
    friendly text on hand (the same one it saves) and now hands it down as
    run_game_ai_request's own ``question_for_display`` argument -- a single self-contained turn,
    not a two-turn follow-up, so this calls run_game_ai_request directly rather than through the
    ``_run`` helper the wiring tests above share.
    """

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_question_for_display_overrides_the_composed_prompt(self, mock_retrieve):
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Here's how to approach the early campaign.")

        composed = (
            "[Strategy follow-up] I'm at: Just starting the campaign.\n"
            "Earlier I asked: how do I beat the glyphid dreadnought\n\n"
            "Give controller-friendly coaching for this exact point, then end with "
            "**If you want to cheat…** as instructed."
        )
        asyncio.run(
            run_game_ai_request(
                plugin,
                composed,
                "127.0.0.1:11434",
                app_id=_DRG_APP_ID,
                app_name=_DRG_APP_NAME,
                ask_mode="strategy",
                question_for_display="I'm at: Just starting the campaign",
            )
        )

        # The progress-line half.
        display_sent = plugin.ask_ollama_calls[-1].get("question_for_display") or ""
        self.assertEqual(display_sent, "I'm at: Just starting the campaign")
        self.assertNotIn("[Strategy follow-up]", display_sent)
        # The saved-question half (Show details, the desktop trace log).
        self.assertEqual(
            plugin.transparency_snapshots[-1].get("text_after_sanitizer"),
            "I'm at: Just starting the campaign",
        )
        # The model itself still receives the full composed text, brackets and all.
        self.assertIn("[Strategy follow-up]", plugin.ask_ollama_args[-1][0])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_with_no_question_for_display_it_falls_back_to_the_sanitized_text(self, mock_retrieve):
        """An ordinary question, or an older caller that predates this argument: unchanged."""
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        asyncio.run(
            run_game_ai_request(
                plugin,
                "how do i beat the glyphid dreadnought",
                "127.0.0.1:11434",
                app_id=_DRG_APP_ID,
                app_name=_DRG_APP_NAME,
                ask_mode="strategy",
            )
        )

        self.assertEqual(
            plugin.ask_ollama_calls[-1].get("question_for_display"),
            "how do i beat the glyphid dreadnought",
        )
        self.assertEqual(
            plugin.transparency_snapshots[-1].get("text_after_sanitizer"),
            "how do i beat the glyphid dreadnought",
        )


if __name__ == "__main__":
    unittest.main()
