"""A choice button under a Strategy answer must get the step-checklist instructions, not a fresh
choice menu, even when the chat remembers a subject (found 2026-10-03, plan 81 helper N1).

The button sends "[Strategy follow-up] I'm at: ...". With the knowledge base on and a remembered
subject, game_ai_request.py also hands the model the previous turn as a "FOLLOW-UP CONTEXT"
reminder. That reminder used to be spliced in FRONT of the whole question, so the question no
longer started with the marker, ``is_strategy_followup_question`` said no, and
``ollama_prompts.build_system_prompt`` gave the model the FIRST-TURN instructions (write a choice
menu) instead of the follow-up ones (coach, then a checklist, no menu).

These tests run the real ``run_game_ai_request`` with only the model call stubbed, and the stub
builds the system prompt with the real ``build_system_prompt`` from exactly what the request hands
it -- the same call ``Plugin._build_system_prompt`` makes in ``main.py`` -- so they look at the
instructions the model would actually have received, the level the Deck check looks at.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.ollama_prompts import build_system_prompt  # noqa: E402
from backend.services.strategy_guide_parse import (  # noqa: E402
    STRATEGY_FOLLOWUP_PREFIX,
    is_strategy_followup_question,
)
from test_game_ai_request_followup_finishes import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    _FakePlugin as _CapturingPlugin,
    _ok_result,
    _settings,
    _two_card_result,
)

_FIRST_TURN_MARK = "STRATEGY GUIDE MODE (active — first turn)"
_FOLLOWUP_MARK = "STRATEGY GUIDE MODE (active — follow-up turn)"


class _PromptBuildingPlugin(_CapturingPlugin):
    """Builds the real system prompt for every ask, the way Plugin._build_system_prompt does."""

    def __init__(self, settings: dict):
        super().__init__(settings)
        self.system_prompts: list[str] = []

    async def ask_ollama(self, question, pc_ip, app_id, app_name, **kwargs):
        self.system_prompts.append(
            build_system_prompt(
                question=question,
                app_id=app_id,
                app_name=app_name,
                normalized_attachments=[],
                prepared_images=[],
                lookup_app_name=lambda _id: app_name,
                lookup_screenshot_vdf_metadata=lambda _id: {},
                ask_mode=kwargs.get("ask_mode", "speed"),
                early_context_suffix=(kwargs.get("proton_log_attachment") or "").strip(),
                followup_subject=kwargs.get("followup_subject", ""),
                strategy_spoiler_consent=kwargs.get("strategy_spoiler_consent", False),
                strategy_spoiler_asked_entity=kwargs.get("strategy_spoiler_asked_entity", ""),
                strategy_spoiler_kb_entity_match=kwargs.get("strategy_spoiler_kb_entity_match", False),
                strategy_domain_guidance=kwargs.get("strategy_domain_guidance", False),
                strategy_title_profile=kwargs.get("strategy_title_profile", ""),
                strategy_checklist_state=kwargs.get("strategy_checklist_state"),
            )
        )
        return await super().ask_ollama(question, pc_ip, app_id, app_name, **kwargs)


def _ask(plugin, question: str, **extra):
    return asyncio.run(
        run_game_ai_request(
            plugin,
            question,
            "127.0.0.1:11434",
            app_id=_DRG_APP_ID,
            app_name=_DRG_APP_NAME,
            ask_mode="strategy",
            **extra,
        )
    )


class StrategyChoiceButtonGetsTheFollowupInstructionsTests(unittest.TestCase):
    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_choice_button_with_a_remembered_subject_asks_for_a_checklist_not_a_menu(self, mock_retrieve):
        mock_retrieve.return_value = _two_card_result()
        plugin = _PromptBuildingPlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _ask(plugin, "how do i beat the glyphid dreadnought")
        self.assertIn(_FIRST_TURN_MARK, plugin.system_prompts[-1])

        mock_retrieve.return_value = _two_card_result()
        _ask(plugin, f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: the second phase")

        sent = plugin.ask_ollama_args[-1][0]
        # The set-up really is the buggy one: the chat's memory put its reminder in the question...
        self.assertIn("FOLLOW-UP CONTEXT", sent)
        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "Glyphid Dreadnought")
        # ...and the model still has to be told this is a button press, so: checklist, no menu.
        prompt = plugin.system_prompts[-1]
        self.assertIn(_FOLLOWUP_MARK, prompt)
        self.assertNotIn(_FIRST_TURN_MARK, prompt)
        self.assertIn("bonsai-strategy-checklist", prompt)
        self.assertIn("Do NOT output a ```bonsai-strategy-branches block on this turn.", prompt)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_the_reminder_still_reaches_the_model_behind_the_persons_words(self, mock_retrieve):
        mock_retrieve.return_value = _two_card_result()
        plugin = _PromptBuildingPlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _ask(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.return_value = _two_card_result()
        _ask(plugin, f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: the second phase\nEarlier I asked: x")

        sent = plugin.ask_ollama_args[-1][0]
        self.assertTrue(is_strategy_followup_question(sent))
        self.assertTrue(sent.startswith(STRATEGY_FOLLOWUP_PREFIX))
        self.assertIn("how do i beat the glyphid dreadnought", sent)
        self.assertIn("Break the glowing plates first.", sent)
        # The person's own words come through whole, once, ahead of the reminder.
        self.assertEqual(sent.count("I'm at: the second phase"), 1)
        self.assertIn("Earlier I asked: x", sent)
        self.assertLess(sent.index("Earlier I asked: x"), sent.index("FOLLOW-UP CONTEXT"))
        # And the model's status-line topic is those words, not the reminder's opening.
        self.assertNotIn('about "FOLLOW-UP CONTEXT', plugin.system_prompts[-1])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_typed_followup_still_gets_its_reminder_in_front(self, mock_retrieve):
        """Only the marker question is re-ordered; an ordinary bare follow-up is as before."""
        mock_retrieve.return_value = _two_card_result()
        plugin = _PromptBuildingPlugin(_settings())
        plugin._ollama_result = _ok_result("Break the glowing plates first.")

        _ask(plugin, "how do i beat the glyphid dreadnought")
        mock_retrieve.return_value = _two_card_result()
        _ask(plugin, "what about its second phase")

        sent = plugin.ask_ollama_args[-1][0]
        self.assertTrue(sent.lstrip().startswith("FOLLOW-UP CONTEXT"))
        self.assertTrue(sent.rstrip().endswith("what about its second phase"))


if __name__ == "__main__":
    unittest.main()
