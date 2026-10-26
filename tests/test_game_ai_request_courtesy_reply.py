"""Plan 100 lane M2 (Deck check P100-THANKS-01): a thank-you or an off-topic question after a boss
question gets one short friendly line back, not the boss advice again.

Lane F already kept the library search and the remembered subject out of such a turn. What the Deck
still showed was a 52-word answer that repeated the earlier boss advice with a branch menu under it,
and a "Not in my notes" line added below. These tests run the real ``run_game_ai_request`` and the
real ``run_ask_ollama`` with only the HTTP call to the model stubbed, and build the system prompt
with the real ``build_system_prompt`` from exactly what ``run_ask_ollama`` hands the plugin (the same
call ``Plugin._build_system_prompt`` makes in main.py), so they look at what the model would receive:
the instructions, and the chat history behind them.
"""

import asyncio
import unittest
from typing import Any
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.ask.ollama_ask_service import run_ask_ollama  # noqa: E402
from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.knowledge.knowledge_base_service import (  # noqa: E402
    KbCoverageSummary,
    KnowledgeRetrievalResult,
)
from backend.prompts.ollama_prompts import COURTESY_TURN_REPLY_BLOCK, build_system_prompt  # noqa: E402

_DRG_APP_ID = "548430"
_DRG_APP_NAME = "Deep Rock Galactic: Survivor"
_NOT_IN_NOTES_TEXT = "Not in my notes — this answer is from the model's own knowledge."
_BOSS_QUESTION = "how do i beat the praetorian"
_BOSS_ANSWER = "Shoot the glowing legs of the Praetorian first, then back away from its slam."
_BRANCH_FENCE = "bonsai-strategy-branches"
_FIRST_TURN_MARK = "STRATEGY GUIDE MODE (active — first turn)"


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "use_local_knowledge_base": True,
        "model_policy_tier": "open_source_only",
        "model_policy_non_foss_unlocked": False,
        "model_allow_high_vram_fallbacks": False,
        "screenshot_attachment_preset": "low",
        "ai_character_enabled": False,
        "ollama_keep_alive": "",
        "capabilities": {},
    }


class _ModelStubbedPlugin:
    """A plugin that really runs ``run_ask_ollama`` and records what the model would be sent."""

    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict, chat_turns: list):
        self._settings = settings
        self._chat_turns = chat_turns
        self.system_prompts: list[str] = []
        self.ask_kwargs: list[dict] = []
        self.reply_text = "You're welcome!"

    # What run_game_ai_request and run_ask_ollama read off the plugin.
    async def load_settings(self):
        return dict(self._settings)

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def _persist_input_transparency(self, payload):
        pass

    def chat_for_request(self, request_id):
        # No chat id: the remembered subject then lives under the game, exactly as for an Ask
        # outside a saved chat, and nothing is written to a chat file.
        return {"id": "", "turns": list(self._chat_turns), "summary": None, "subject": None}

    def _active_request_id(self):
        return None

    def _build_ollama_chat_url(self, pc_ip):
        return f"http://{pc_ip}/api/chat"

    def _build_system_prompt(self, question, app_id, app_name, attachments, images,
                             ask_mode="speed", **kw):
        return build_system_prompt(
            question=question,
            app_id=app_id,
            app_name=app_name,
            normalized_attachments=attachments,
            prepared_images=images,
            lookup_app_name=lambda _id: app_name,
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode=ask_mode,
            early_context_suffix=(kw.get("proton_log_attachment") or "").strip(),
            followup_subject=kw.get("followup_subject", ""),
            strategy_spoiler_consent=kw.get("strategy_spoiler_consent", False),
            strategy_spoiler_asked_entity=kw.get("strategy_spoiler_asked_entity", ""),
            strategy_spoiler_kb_entity_match=kw.get("strategy_spoiler_kb_entity_match", False),
            strategy_domain_guidance=kw.get("strategy_domain_guidance", False),
            strategy_title_profile=kw.get("strategy_title_profile", ""),
            strategy_checklist_state=kw.get("strategy_checklist_state"),
            reply_verbosity=kw.get("reply_verbosity", "balanced"),
            reply_language=kw.get("reply_language", "english"),
            courtesy_turn=kw.get("courtesy_turn", False),
        )

    async def _maybe_app_log(self, *a, **k):
        return None

    def _abort_ollama_chat_check(self):
        return False

    def _publish_thinking_phase_key(self, *a, **k):
        return None

    def _update_partial_response(self, *a, **k):
        return None

    def _publish_spoiler_consent(self, *a, **k):
        return None

    async def ask_ollama(self, question, pc_ip, app_id, app_name, *args, **kwargs):
        self.ask_kwargs.append(kwargs)

        def _fake_post(url, model_name, messages, *a, **k):
            # The system message as the model gets it: the built prompt plus the chat's memory.
            self.system_prompts.append(messages[0]["content"])
            return {"success": True, "status": 200, "model": model_name,
                    "response": self.reply_text, "assistant_raw": self.reply_text}

        with (
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags",
                  return_value=["qwen3:4b"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.ask.ollama_ask_service.glossary_for_prompt", return_value=("", [])),
            patch("backend.media.screenshot_media.prepare_attachment_images",
                  return_value=([], [], [])),
            patch("backend.ask.ollama_ask_service.post_ollama_chat", side_effect=_fake_post),
            # The Deck's real room. Without it the long prompt leaves the memory step the 4,096
            # fallback and it carries nothing, which would hide the very history under test.
            patch("backend.chats.chat_memory_step.choose_window_tokens", return_value=16384),
        ):
            return await run_ask_ollama(
                self, question, pc_ip, app_id, app_name, *args, **kwargs
            )


def _boss_chat_then(question: str) -> list:
    return [
        {"id": "t1", "role": "user", "text": _BOSS_QUESTION},
        {"id": "t2", "role": "assistant", "text": _BOSS_ANSWER},
        {"id": "t3", "role": "user", "text": question},
    ]


def _praetorian_result() -> KnowledgeRetrievalResult:
    return KnowledgeRetrievalResult(
        attached=True,
        text_block=(
            "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---\n"
            "Domain: strategy\n"
            f"\n[{_DRG_APP_NAME} / boss: Praetorian] (trust: high)\n"
            "Shoot the glowing legs, then back away from its slam.\n"
            "--- End local knowledge base ---"
        ),
        sources=[],
    )


def _ask(plugin, question: str, ask_mode: str):
    return asyncio.run(
        run_game_ai_request(
            plugin, question, "127.0.0.1:11434",
            app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, ask_mode=ask_mode,
        )
    )


@patch(
    "backend.ask.game_ai_request.summarize_kb_coverage",
    return_value=KbCoverageSummary(status="sections", section_count=4),
)
@patch("backend.ask.game_ai_request.retrieve_knowledge_context")
class CourtesyTurnReachesTheModelTests(unittest.TestCase):
    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    def _thank_you_turn(self, mock_retrieve, ask_mode="strategy", phrase="thanks a lot for that"):
        mock_retrieve.return_value = _praetorian_result()
        plugin = _ModelStubbedPlugin(_settings(), _boss_chat_then(phrase))
        result = _ask(plugin, phrase, ask_mode)
        return plugin, result

    def test_a_thank_you_after_a_boss_turn_sends_no_earlier_turns(self, mock_retrieve, _cov):
        plugin, _ = self._thank_you_turn(mock_retrieve)

        prompt = plugin.system_prompts[-1]
        self.assertNotIn(_BOSS_ANSWER, prompt)
        self.assertNotIn(_BOSS_QUESTION, prompt)
        self.assertNotIn("You asked", prompt)
        self.assertNotIn("Praetorian", prompt)

    def test_a_thank_you_gets_the_short_reply_instruction_and_no_branch_menu(self, mock_retrieve, _cov):
        plugin, _ = self._thank_you_turn(mock_retrieve)

        prompt = plugin.system_prompts[-1]
        self.assertIn(COURTESY_TURN_REPLY_BLOCK, prompt)
        self.assertIn("25 words", COURTESY_TURN_REPLY_BLOCK)
        self.assertNotIn(_BRANCH_FENCE, prompt)
        self.assertNotIn(_FIRST_TURN_MARK, prompt)
        self.assertTrue(plugin.ask_kwargs[-1]["courtesy_turn"])

    def test_the_date_question_is_treated_the_same_way(self, mock_retrieve, _cov):
        plugin, _ = self._thank_you_turn(mock_retrieve, phrase="what is the date today")

        prompt = plugin.system_prompts[-1]
        self.assertIn(COURTESY_TURN_REPLY_BLOCK, prompt)
        self.assertNotIn(_BOSS_ANSWER, prompt)
        self.assertNotIn(_BRANCH_FENCE, prompt)

    def test_a_thank_you_gets_no_not_in_my_notes_line(self, mock_retrieve, _cov):
        plugin, result = self._thank_you_turn(mock_retrieve)

        self.assertEqual(result.get("response"), "You're welcome!")
        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    def test_a_real_question_with_no_match_still_gets_the_line(self, mock_retrieve, _cov):
        """The control: the footer is still added where it was, so the test above proves the
        thank-you turn skipped it rather than the footer never firing in this set-up."""
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False, unavailable_reason="no_match")
        question = "how do i beat the bosses here"
        plugin = _ModelStubbedPlugin(_settings(), _boss_chat_then(question))
        plugin.reply_text = "Focus the adds first."

        result = _ask(plugin, question, "strategy")

        self.assertIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))
        self.assertFalse(plugin.ask_kwargs[-1]["courtesy_turn"])
        self.assertNotIn(COURTESY_TURN_REPLY_BLOCK, plugin.system_prompts[-1])

    def test_speed_mode_thank_you_behaves_the_same(self, mock_retrieve, _cov):
        plugin, result = self._thank_you_turn(mock_retrieve, ask_mode="speed")

        prompt = plugin.system_prompts[-1]
        self.assertIn(COURTESY_TURN_REPLY_BLOCK, prompt)
        self.assertNotIn(_BOSS_ANSWER, prompt)
        self.assertNotIn(_BRANCH_FENCE, prompt)
        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    def test_expert_mode_thank_you_behaves_the_same(self, mock_retrieve, _cov):
        plugin, result = self._thank_you_turn(mock_retrieve, ask_mode="expert")

        prompt = plugin.system_prompts[-1]
        self.assertIn(COURTESY_TURN_REPLY_BLOCK, prompt)
        self.assertNotIn(_BOSS_ANSWER, prompt)
        self.assertNotIn(_NOT_IN_NOTES_TEXT, result.get("response", ""))

    def test_the_next_real_follow_up_is_unchanged_by_the_thank_you_before_it(self, mock_retrieve, _cov):
        mock_retrieve.return_value = _praetorian_result()
        thanks_chat = _boss_chat_then("thanks a lot for that")
        plugin = _ModelStubbedPlugin(_settings(), [{"id": "t0", "role": "user", "text": _BOSS_QUESTION}])
        plugin.reply_text = _BOSS_ANSWER
        _ask(plugin, _BOSS_QUESTION, "strategy")
        plugin._chat_turns = thanks_chat
        plugin.reply_text = "You're welcome!"
        _ask(plugin, "thanks a lot for that", "strategy")
        plugin._chat_turns = thanks_chat + [
            {"id": "t4", "role": "assistant", "text": "You're welcome!"},
            {"id": "t5", "role": "user", "text": "how do i kill them"},
        ]
        mock_retrieve.return_value = _praetorian_result()
        plugin.reply_text = "Shoot the legs."

        _ask(plugin, "how do i kill them", "strategy")

        prompt = plugin.system_prompts[-1]
        call = plugin.ask_kwargs[-1]
        self.assertFalse(call["courtesy_turn"])
        self.assertEqual(call["followup_subject"], "Praetorian")
        self.assertNotIn(COURTESY_TURN_REPLY_BLOCK, prompt)
        self.assertIn("STRATEGY GUIDE MODE", prompt)
        self.assertIn(_BOSS_ANSWER, prompt)
        self.assertIn("You asked: " + _BOSS_QUESTION, prompt)


class CourtesyFlagPlumbingTests(unittest.IsolatedAsyncioTestCase):
    """main.py's two pass-through methods hand the flag on: without them the flag set in
    game_ai_request.py would stop at the plugin and the Deck would see no change."""

    async def test_plugin_ask_ollama_hands_the_flag_to_the_ask_service(self):
        from main import Plugin

        seen: dict[str, Any] = {}

        async def _record(_plugin, *args, **kwargs):
            seen.update(kwargs)
            return {"success": True}

        with patch("main.run_ask_ollama", _record):
            await Plugin().ask_ollama("thanks", "127.0.0.1:11434", "", "", courtesy_turn=True)
        self.assertTrue(seen["courtesy_turn"])

    def test_plugin_build_system_prompt_hands_the_flag_to_the_prompt_builder(self):
        from main import Plugin

        for flag in (True, False):
            with self.subTest(flag=flag):
                prompt = Plugin()._build_system_prompt(
                    "thanks a lot for that", _DRG_APP_ID, _DRG_APP_NAME, [], [],
                    ask_mode="strategy", courtesy_turn=flag,
                )
                self.assertEqual(COURTESY_TURN_REPLY_BLOCK in prompt, flag)


if __name__ == "__main__":
    unittest.main()
