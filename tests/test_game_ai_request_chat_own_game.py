"""Plan 68 step 2, § 8 question 1: the first memory-check failure from the plan's own § 1 --
with no game running and the question naming no game, the knowledge-base search got no game at
all, so a follow-up in an established chat could never find its own notes.

``_chat_own_game_title`` (game_ai_request.py) is tested directly first, then
``run_game_ai_request`` itself to prove the fallback is actually wired into D19's own
``text_resolved_title`` -- still losing to a running game or a title the question names, per the
plan's own precedence.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.game_ai_request import _chat_own_game_title, run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_service import KnowledgeRetrievalResult  # noqa: E402


def _resolves_only_half_life_2(_settings, text):
    return "Half-Life 2" if str(text).strip() == "Half-Life 2" else ""


class ChatOwnGameTitleTests(unittest.TestCase):
    """The pure lookup, isolated from run_game_ai_request's own wiring. ``resolve_title_from_
    question`` is patched once here, defaulting to "only Half-Life 2 resolves to anything" --
    the one test that needs a different answer overrides ``self.mock_resolve`` directly."""

    def setUp(self):
        patcher = patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            side_effect=_resolves_only_half_life_2,
        )
        self.mock_resolve = patcher.start()
        self.addCleanup(patcher.stop)

    def test_a_turns_app_name_wins(self):
        chat = {"turns": [{"role": "assistant", "text": "...", "app_name": "Half-Life 2"}]}
        self.assertEqual(_chat_own_game_title({}, chat), "Half-Life 2")

    def test_an_app_name_that_does_not_resolve_is_still_used_as_written(self):
        self.mock_resolve.side_effect = None
        self.mock_resolve.return_value = ""
        chat = {"turns": [{"role": "assistant", "text": "...", "app_name": "A Homebrew Thing"}]}
        self.assertEqual(_chat_own_game_title({}, chat), "A Homebrew Thing")

    def test_walks_newest_first(self):
        chat = {
            "turns": [
                {"role": "assistant", "text": "...", "app_name": "Portal 2"},
                {"role": "assistant", "text": "...", "app_name": "Half-Life 2"},
            ]
        }
        self.assertEqual(_chat_own_game_title({}, chat), "Half-Life 2")

    def test_a_user_turns_own_text_is_read_when_nothing_has_an_app_name(self):
        chat = {"turns": [{"role": "user", "text": "Half-Life 2", "app_name": ""}]}
        self.assertEqual(_chat_own_game_title({}, chat), "Half-Life 2")

    def test_an_assistant_turns_own_text_is_never_read(self):
        chat = {"turns": [{"role": "assistant", "text": "Half-Life 2", "app_name": ""}]}
        self.assertEqual(_chat_own_game_title({}, chat), "")

    def test_only_the_newest_twelve_turns_are_walked(self):
        old_turn = {"role": "assistant", "text": "...", "app_name": "Half-Life 2"}
        recent_turns = [
            {"role": "assistant", "text": "...", "app_name": ""} for _ in range(12)
        ]
        chat = {"turns": [old_turn, *recent_turns]}
        self.assertEqual(_chat_own_game_title({}, chat), "")

    def test_falls_back_to_the_chats_origin_app_name_last(self):
        chat = {"turns": [], "origin_app_name": "Half-Life 2"}
        self.assertEqual(_chat_own_game_title({}, chat), "Half-Life 2")

    def test_a_chat_with_no_game_anywhere_resolves_to_nothing(self):
        self.mock_resolve.side_effect = None
        self.mock_resolve.return_value = ""
        chat = {"turns": [{"role": "user", "text": "what should I do", "app_name": ""}]}
        self.assertEqual(_chat_own_game_title({}, chat), "")


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict, chat: dict):
        self._settings = settings
        self._chat = chat
        self._ollama_result: dict = {"success": True, "response": "ok", "model": "test-model"}

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    def chat_for_request(self, _request_id):
        return self._chat

    async def ask_ollama(self, *_args, **kwargs):
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        pass


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": False,
    }


def _half_life_2_chat() -> dict:
    return {
        "id": "chat-hl2",
        "turns": [
            {
                "role": "user",
                "text": "how do I beat the antlion guard",
                "app_name": "Half-Life 2",
            },
            {"role": "assistant", "text": "Lure it onto the crane magnet.", "app_name": "Half-Life 2"},
        ],
        "subject": None,
        "origin_app_id": "220",
        "origin_app_name": "Half-Life 2",
    }


def _run(plugin, question, *, app_id="", app_name="", ask_mode="strategy"):
    return asyncio.run(
        run_game_ai_request(
            plugin, question, "127.0.0.1:11434", app_id=app_id, app_name=app_name, ask_mode=ask_mode
        )
    )


class RunGameAiRequestChatFallbackWiringTests(unittest.TestCase):
    """Wired into D19's own ``text_resolved_title`` -- read off what actually reached
    ``retrieve_knowledge_context``, the same way the sibling follow-up-memory tests read the
    ``question`` kwarg it was called with. ``should_retrieve_knowledge`` and
    ``retrieve_knowledge_context`` are patched once here for every test in this class; only
    ``resolve_title_from_question`` (what a game's own name or the question's words resolve to)
    differs test to test, so that one stays a per-test ``with patch(...)``."""

    def setUp(self):
        should_patcher = patch("backend.services.game_ai_request.should_retrieve_knowledge")
        retrieve_patcher = patch("backend.services.game_ai_request.retrieve_knowledge_context")
        self.mock_should = should_patcher.start()
        self.mock_retrieve = retrieve_patcher.start()
        self.addCleanup(should_patcher.stop)
        self.addCleanup(retrieve_patcher.stop)
        self.mock_should.return_value = (True, "strategy")
        self.mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)

    def _resolved_title(self) -> str:
        _, kwargs = self.mock_retrieve.call_args
        return kwargs["text_resolved_title"]

    def test_nothing_running_and_a_bare_followup_uses_the_chats_own_game(self):
        plugin = _FakePlugin(_settings(), _half_life_2_chat())
        with patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            side_effect=_resolves_only_half_life_2,
        ):
            _run(plugin, "what about after that")
        self.assertEqual(self._resolved_title(), "Half-Life 2")

    def test_a_running_game_wins_over_the_chats_own_game(self):
        plugin = _FakePlugin(_settings(), _half_life_2_chat())
        with patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            side_effect=_resolves_only_half_life_2,
        ):
            # A different game is actually running -- the chat's own (Half-Life 2) must not win.
            _run(plugin, "what about after that", app_id="620", app_name="Portal 2")
        self.assertEqual(self._resolved_title(), "")

    def test_a_title_named_in_the_question_wins_over_the_chats_own_game(self):
        plugin = _FakePlugin(_settings(), _half_life_2_chat())

        def _resolve(_settings, text):
            return "Portal 2" if "portal 2" in str(text).lower() else ""

        with patch(
            "backend.services.game_ai_request.resolve_title_from_question", side_effect=_resolve
        ):
            _run(plugin, "how do I beat portal 2's final chamber")
        self.assertEqual(self._resolved_title(), "Portal 2")

    def test_a_chat_with_no_game_anywhere_keeps_todays_behaviour(self):
        empty_chat = {
            "id": "chat-empty",
            "turns": [{"role": "user", "text": "what should I do next", "app_name": ""}],
            "subject": None,
            "origin_app_id": "",
            "origin_app_name": "",
        }
        plugin = _FakePlugin(_settings(), empty_chat)
        with patch(
            "backend.services.game_ai_request.resolve_title_from_question", return_value=""
        ):
            _run(plugin, "what should I do next")
        self.assertEqual(self._resolved_title(), "")

    def test_logs_one_line_when_the_fallback_is_used(self):
        plugin = _FakePlugin(_settings(), _half_life_2_chat())
        with patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            side_effect=_resolves_only_half_life_2,
        ), patch("backend.services.game_ai_request.logger") as mock_logger:
            _run(plugin, "what about after that")

        matches = [
            c
            for c in mock_logger.info.call_args_list
            if c.args and "no game running or named" in str(c.args[0])
        ]
        self.assertEqual(len(matches), 1)
        self.assertIn("Half-Life 2", matches[0].args)


if __name__ == "__main__":
    unittest.main()
