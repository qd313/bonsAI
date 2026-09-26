"""Tests that game_ai_request.py's follow-up block actually wires the two plan 70 helper K
measurement switches (kb_followup_memory.drop_runnerup_notes_enabled /
send_prev_qa_enabled) -- both off by default, per-test environment cleanup so a later test file
never inherits either switch left on.

Uses the same mocked-retrieval pattern as tests/test_game_ai_request_followup_memory.py, plus a
small local fake plugin that (unlike that file's) also captures the positional arguments
run_game_ai_request hands to ask_ollama, since finish 3's context block is spliced into
question_for_model -- the first positional argument, not a kwarg.
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

_DRG_APP_ID = "548430"
_DRG_APP_NAME = "Deep Rock Galactic: Survivor"


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        self.ask_ollama_calls: list = []
        self.ask_ollama_args: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_args.append(args)
        self.ask_ollama_calls.append(kwargs)
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        pass


def _ok_result(text: str = "Here is how.") -> dict:
    return {"success": True, "response": text, "model": "test-model"}


def _run(plugin, question, *, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, ask_mode="strategy"):
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


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": True,
    }


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
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = _two_card_result()
        _run(plugin, "what about its second phase")

        attached = plugin.ask_ollama_calls[-1]["proton_log_attachment"] or ""
        self.assertIn("Dreadnought Twins", attached)
        self.assertIn("Glyphid Dreadnought", attached)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_only_the_subjects_own_card_reaches_the_model(self, mock_retrieve):
        os.environ[kb_followup_memory.DROP_RUNNERUP_ENV] = "1"
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = _two_card_result()
        _run(plugin, "what about its second phase")

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
    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_off_by_default_no_previous_turn_context_is_sent(self, mock_retrieve):
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = _two_card_result()
        _run(plugin, "what about its second phase")

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertNotIn("FOLLOW-UP CONTEXT", question_sent)
        self.assertEqual(
            kb_followup_memory.recall_previous_turn(
                app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, text_resolved_title=""
            ),
            ("", ""),
        )

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_the_previous_question_and_a_trimmed_answer_are_sent(self, mock_retrieve):
        os.environ[kb_followup_memory.SEND_PREV_QA_ENV] = "1"
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _run(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = _two_card_result()
        _run(plugin, "what about its second phase")

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertIn("FOLLOW-UP CONTEXT", question_sent)
        self.assertIn("how do i beat the glyphid dreadnought", question_sent)
        self.assertIn("Break the glowing plates first.", question_sent)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_on_but_the_first_turn_has_no_previous_answer_to_send(self, mock_retrieve):
        os.environ[kb_followup_memory.SEND_PREV_QA_ENV] = "1"
        mock_retrieve.return_value = _two_card_result()
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        question_sent = plugin.ask_ollama_args[-1][0]
        self.assertNotIn("FOLLOW-UP CONTEXT", question_sent)


if __name__ == "__main__":
    unittest.main()
