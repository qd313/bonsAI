"""Wiring tests for the spoiler safety net's finished-reply half (plan 70 helper A, D112 #7):

game_ai_request.py's own call to response_verify.cover_named_spoilers, right after the honesty
footers and before the finished reply is persisted and returned. The checker's own rules
(sentence-splitting, fence-skipping, the doubled-block case) are tested directly in
test_response_verify.py; this file only proves the wiring -- that a real Ask, with a real
attached note, actually reaches the checker with the right "was a cover promised" flag and the
right protected names.

Built the same way test_game_ai_request_kb_attached_notes.py already does: a real
``KnowledgeCard`` formatted through the real ``_format_block``, so the attached text this test
feeds the checker is the same shape retrieval really produces, not a hand-typed guess at it.
"""

import asyncio
import re
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_service import (  # noqa: E402
    KnowledgeCard,
    KnowledgeRetrievalResult,
    _format_block,
)


def _soul_master_card() -> KnowledgeCard:
    return KnowledgeCard(
        section_id=1,
        game_id=1,
        game_title="Hollow Knight",
        section_type="boss",
        name="Soul Master",
        card="Soul Master fakes its death partway through the fight, then returns as Soul Tyrant.",
        source_url="https://hollowknight.wiki/w/Soul_Master",
        source_license="CC-BY-SA-3.0",
        source_version=None,
        crawled_at="2026-09-01",
        trust_tier="wiki_verified",
    )


def _attached_result(card: KnowledgeCard) -> KnowledgeRetrievalResult:
    text_block, trust, sources = _format_block(
        [card], fallback_text=None, domain="strategy", max_bytes=6_144
    )
    return KnowledgeRetrievalResult(attached=True, text_block=text_block, trust_tier=trust, sources=sources)


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    def _active_request_id(self):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        pass


def _settings() -> dict:
    return {
        "latency_timeouts_custom_enabled": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        "use_local_knowledge_base": True,
    }


def _run(plugin, question, **kwargs):
    return asyncio.run(run_game_ai_request(plugin, question, "127.0.0.1:11434", **kwargs))


def _text_outside_spoiler_fences(text: str) -> str:
    return re.sub(r"```bonsai-spoiler\n.*?```\n?", "", text, flags=re.DOTALL)


class SpoilerCoverWiringTests(unittest.TestCase):
    """Roadmap: "A name-withheld boss question on a story-protected game comes back with no
    spoiler box" -- measured on the Deck 2026-09-22/23 (Hollow Knight, "the boss past the
    crystal spike area"), 83 reads during streaming, never covered."""

    def _wire_soul_master_reply(self, mock_should, mock_retrieve, response_text):
        """Wire a Strategy Ask against Hollow Knight with the Soul Master card attached and
        the given model reply text already decided, and return the plugin ready for `_run`."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_soul_master_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = {
            "success": True,
            "response": response_text,
            "model": "test-model",
        }
        return plugin

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_boss_named_in_the_reply_but_not_the_question_is_covered(
        self, mock_should, mock_retrieve
    ):
        plugin = self._wire_soul_master_reply(
            mock_should,
            mock_retrieve,
            "Soul Master fakes its death partway through, then comes back as Soul Tyrant. "
            "Keep swinging once it falls the first time.",
        )

        result = _run(
            plugin,
            "How do I beat the boss past the crystal spike area?",
            ask_mode="strategy",
            app_name="Hollow Knight",
        )

        response = result.get("response", "")
        self.assertIn("```bonsai-spoiler", response, "the boss name must be covered somewhere")
        self.assertNotIn("Soul Master", _text_outside_spoiler_fences(response))
        # Nothing was silently deleted -- the name is still there, just behind the fence.
        self.assertIn("Soul Master", response)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_boss_the_question_already_named_is_left_in_plain_text(
        self, mock_should, mock_retrieve
    ):
        plugin = self._wire_soul_master_reply(
            mock_should, mock_retrieve, "Soul Master fakes its death partway through the fight."
        )

        result = _run(
            plugin,
            "How do I beat Soul Master?",
            ask_mode="strategy",
            app_name="Hollow Knight",
        )

        response = result.get("response", "")
        self.assertNotIn("```bonsai-spoiler", response)
        self.assertIn("Soul Master fakes its death partway through the fight.", response)

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_low_narrative_title_is_never_covered(self, mock_should, mock_retrieve):
        """Deep Rock Galactic: Survivor (LOW_NARRATIVE_APP_IDS) -- a boss name is routine
        gameplay there, not a story spoiler, so the prompt never asked for a cover at all."""
        card = KnowledgeCard(
            section_id=1,
            game_id=1,
            game_title="Deep Rock Galactic: Survivor",
            section_type="boss",
            name="The Hive",
            card="The Hive spawns waves of swarmers from three points on the map.",
            source_url="",
            source_license="",
            source_version=None,
            crawled_at="2026-09-01",
            trust_tier="fallback_no_source",
        )
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(card)
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "The Hive spawns waves of swarmers from three points on the map.",
            "model": "test-model",
        }

        result = _run(
            plugin,
            "What is the final boss like?",
            ask_mode="strategy",
            app_name="Deep Rock Galactic: Survivor",
        )

        self.assertNotIn("```bonsai-spoiler", result.get("response", ""))

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_consent_turns_the_cover_off(self, mock_should, mock_retrieve):
        plugin = self._wire_soul_master_reply(
            mock_should, mock_retrieve, "Soul Master fakes its death partway through the fight."
        )

        result = _run(
            plugin,
            "The boss past the crystal spike area, spoilers are okay",
            ask_mode="strategy",
            app_name="Hollow Knight",
        )

        self.assertNotIn("```bonsai-spoiler", result.get("response", ""))

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_the_models_own_thinking_is_covered_too(self, mock_should, mock_retrieve):
        """D112 #7 leak fix: THINKING-SPOILER-01. The saved reasoning shown in the fold
        afterwards must not name a protected boss either -- the thinking text below is the
        literal capture from the session's scratchpad L1-2-HK-C.jsonl (t=9268)."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_soul_master_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Watch his attack patterns and strike when he is open.",
            "model": "test-model",
            "reasoning_text": (
                'The context is clearly Hollow Knight, and the specific boss described '
                'matches the "Soul Master" from the local knowledge base.'
            ),
            "reasoning_seconds": 12,
            "reasoning_tokens": 40,
        }

        result = _run(
            plugin,
            "How do I beat the boss past the crystal spike area?",
            ask_mode="strategy",
            app_name="Hollow Knight",
        )

        self.assertNotIn("Soul Master", result.get("reasoning_text", ""))
        self.assertIn("[hidden]", result.get("reasoning_text", ""))

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_the_branch_menu_is_neutralized_not_fenced(self, mock_should, mock_retrieve):
        """D112 #7's third leak: NO-CLOSE-MATCH-HK-02, measured live on the Deck. The menu's
        own question read "Are you currently struggling with the Soul Master's movement or
        damage output?" in plain view -- the screen draws it as a button, so a fence would
        show as literal backtick text rather than hide anything."""
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(_soul_master_card())
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Watch his attack patterns and strike when he is open.",
            "model": "test-model",
            "strategy_guide_branches": {
                "question": (
                    "Are you currently struggling with the Soul Master's movement or damage "
                    "output?"
                ),
                "options": [
                    {"id": "a", "label": "His movement is the problem"},
                    {"id": "b", "label": "His damage is the problem"},
                ],
            },
        }

        result = _run(
            plugin,
            "How do I beat the boss past the crystal spike area?",
            ask_mode="strategy",
            app_name="Hollow Knight",
        )

        branches = result.get("strategy_guide_branches") or {}
        self.assertNotIn("Soul Master", branches.get("question", ""))
        self.assertNotIn("```", branches.get("question", ""), "never fence a button's own text")
        for opt in branches.get("options") or []:
            self.assertNotIn("Soul Master", opt.get("label", ""))
            self.assertNotIn("```", opt.get("label", ""))



class _LivePlugin(_FakePlugin):
    """Has a live partial-stream snapshot, so what the screen would read mid-answer is seen."""

    def __init__(self, settings: dict):
        super().__init__(settings)
        import threading

        self._partial_response_lock = threading.Lock()
        self._partial_stream_snapshot = {"request_id": 7}

    def _active_request_id(self):
        return 7


class NotesBlockProtectionTests(unittest.TestCase):
    """Plan 70 (D112 #7): the "From the notes" block's header names the attached note. When the
    answer uses the Soul Master note without naming him, the answer has no cover to hide behind,
    so the block itself has to know the note's name is protected -- live and when finished."""

    def _run_with(self, mock_should, mock_retrieve, question, reply, app_name="Hollow Knight", card=None):
        mock_should.return_value = (True, "strategy")
        mock_retrieve.return_value = _attached_result(card or _soul_master_card())
        plugin = _LivePlugin(_settings())
        plugin._ollama_result = {"success": True, "response": reply, "model": "test-model"}
        result = _run(plugin, question, ask_mode="strategy", app_name=app_name)
        return result, plugin._partial_stream_snapshot.get("kb_attached_notes") or []

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_described_boss_note_is_marked_live_and_finished(self, mock_should, mock_retrieve):
        result, live = self._run_with(
            mock_should, mock_retrieve,
            "in hollow knight how do I beat the spell casting boss at the top of the sanctum",
            "Hit him from below while he conjures orbs.",
        )
        self.assertEqual([n.get("spoiler_protected") for n in live], [True])
        self.assertEqual([n.get("spoiler_protected") for n in result["kb_attached_notes"]], [True])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_boss_the_question_named_is_not_marked(self, mock_should, mock_retrieve):
        result, live = self._run_with(
            mock_should, mock_retrieve, "How do I beat Soul Master?", "Hit him from below."
        )
        self.assertNotIn("spoiler_protected", live[0])
        self.assertNotIn("spoiler_protected", result["kb_attached_notes"][0])

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_low_narrative_title_is_not_marked(self, mock_should, mock_retrieve):
        hive = KnowledgeCard(
            section_id=1, game_id=1, game_title="Deep Rock Galactic: Survivor", section_type="boss",
            name="The Hive", card="The Hive spawns waves of swarmers.", source_url="",
            source_license="", source_version=None, crawled_at="2026-09-01",
            trust_tier="fallback_no_source",
        )
        result, _live = self._run_with(
            mock_should, mock_retrieve, "What is the final boss like?", "Swarmers.",
            app_name="Deep Rock Galactic: Survivor", card=hive,
        )
        self.assertNotIn("spoiler_protected", result["kb_attached_notes"][0])

if __name__ == "__main__":
    unittest.main()
