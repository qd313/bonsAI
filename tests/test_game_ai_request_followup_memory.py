"""Tests that run_game_ai_request actually wires the follow-up memory into the search words --
not just that the memory module works in isolation (see tests/test_kb_followup_memory.py for
that). The first two tests below run the real corpus at build/knowledge-base, because the claim
is about which note's card ranks *first* -- the same table plan 48's Lane E brief was measured
with:

    how do i beat the glyphid dreadnought  -> Glyphid Dreadnought, Dreadnought Twins, Exploder
    what about its second phase (no memory) -> Dreadnought Twins, Praetorian, Glyphid Dreadnought
    what about its second phase (remembered)-> Glyphid Dreadnought, ...

The remaining tests patch retrieve_knowledge_context and inspect the `question` kwarg it was
called with, the same way tests/test_kb_not_in_notes_wiring.py does for its own append step.
"""

import asyncio
import os
import sys
import types
import unittest
from unittest.mock import patch

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.services import kb_followup_memory
from backend.services.game_ai_request import run_game_ai_request
from backend.services.knowledge_base_service import KnowledgeRetrievalResult
from backend.services.ollama_prompts import kb_card_names

_CORPUS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build", "knowledge-base"
)
_CORPUS_AVAILABLE = os.path.isfile(os.path.join(_CORPUS_PATH, "corpus.db"))

_DRG_APP_ID = "548430"
_DRG_APP_NAME = "Deep Rock Galactic: Survivor"
_HADES_APP_ID = "2380520"
_HADES_APP_NAME = "Hades"


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        self.ask_ollama_calls: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_calls.append(kwargs)
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        pass


def _ok_result() -> dict:
    return {"success": True, "response": "Here is how.", "model": "test-model"}


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


@unittest.skipUnless(_CORPUS_AVAILABLE, "requires build/knowledge-base corpus")
class FollowupMemoryRealCorpusTests(unittest.TestCase):
    """The DRG pair from the brief -- where a plain word search puts the wrong boss first."""

    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    def _real_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": True,
            "rag_corpus_path": _CORPUS_PATH,
            # Keyword-only: deterministic, and the ranking bug reproduces without it (the
            # embedding model is an extra, not the cause -- see the module docstring's table).
            "rag_hybrid_retrieval_enabled": False,
        }

    def _attached_names(self, plugin: _FakePlugin) -> list:
        block = plugin.ask_ollama_calls[-1].get("proton_log_attachment") or ""
        return kb_card_names(block)

    def test_followup_attaches_the_right_bosss_note_first(self):
        plugin = _FakePlugin(self._real_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        self.assertEqual(self._attached_names(plugin)[0], "Glyphid Dreadnought")

        _run(plugin, "what about its second phase")
        self.assertEqual(
            self._attached_names(plugin)[0],
            "Glyphid Dreadnought",
            "the remembered boss should rank first on the bare follow-up",
        )

    def test_without_the_memory_the_same_followup_attaches_the_wrong_boss_first(self):
        # No prior question in this process -- today's behaviour, and the reason this lane
        # exists. Confirms the fixture reproduces the bug the fix above corrects.
        plugin = _FakePlugin(self._real_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "what about its second phase")

        self.assertNotEqual(self._attached_names(plugin)[0], "Glyphid Dreadnought")

    def test_a_fresh_named_question_is_untouched_by_a_stale_memory(self):
        plugin = _FakePlugin(self._real_settings())
        plugin._ollama_result = _ok_result()
        # Seed a wrong remembered subject deliberately -- a self-naming question must not be
        # thrown off by it.
        kb_followup_memory.remember(
            app_id=_DRG_APP_ID,
            app_name=_DRG_APP_NAME,
            text_resolved_title="",
            subject="Dreadnought Twins",
        )

        _run(plugin, "how do i beat the glyphid dreadnought")

        self.assertEqual(self._attached_names(plugin)[0], "Glyphid Dreadnought")


class FollowupMemorySearchWordsWiringTests(unittest.TestCase):
    """retrieve_knowledge_context is patched here -- these check the `question` kwarg it
    receives, not corpus ranking (the real-corpus class above covers that)."""

    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    def _settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": True,
        }

    def _drg_dreadnought_result(self) -> KnowledgeRetrievalResult:
        return KnowledgeRetrievalResult(
            attached=True,
            text_block=(
                f"[{_DRG_APP_NAME} / boss: Glyphid Dreadnought]\n"
                "Break the glowing plates, then focus the head."
            ),
            sources=[],
        )

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_fresh_named_question_keeps_its_own_search_words(self, mock_retrieve):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        # First question stores "Glyphid Dreadnought" as the remembered subject.
        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(
            attached=True,
            text_block=f"[{_DRG_APP_NAME} / boss: Dreadnought Twins]\nSplit fire between them.",
            sources=[],
        )
        _run(plugin, "how do i beat the dreadnought twins")

        _, kwargs = mock_retrieve.call_args
        self.assertEqual(kwargs["question"], "how do i beat the dreadnought twins")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_game_change_clears_the_memory(self, mock_retrieve):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        self.assertEqual(
            kb_followup_memory.recall(
                app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, text_resolved_title=""
            ),
            "Glyphid Dreadnought",
        )

        # A strategy question about a different game clears the first game's memory.
        mock_retrieve.return_value = KnowledgeRetrievalResult(
            attached=True,
            text_block=f"[{_HADES_APP_NAME} / boss: Megara]\nDodge the spear throws.",
            sources=[],
        )
        _run(plugin, "how do i beat megara", app_id=_HADES_APP_ID, app_name=_HADES_APP_NAME)

        # So a bare follow-up back on the DRG game no longer gets a remembered name added.
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        _run(plugin, "what about its second phase")

        _, kwargs = mock_retrieve.call_args
        self.assertEqual(kwargs["question"], "what about its second phase")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_speed_mode_never_gets_the_augmented_search_words(self, mock_retrieve):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        # A Strategy question first, so a subject is remembered for this game.
        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        _run(plugin, "what about its second phase", ask_mode="speed")

        _, kwargs = mock_retrieve.call_args
        self.assertEqual(kwargs["question"], "what about its second phase")
        # And the memory itself is untouched -- Speed neither reads nor clears it.
        self.assertEqual(
            kb_followup_memory.recall(
                app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, text_resolved_title=""
            ),
            "Glyphid Dreadnought",
        )


class FollowupMemoryPromptSubjectWiringTests(unittest.TestCase):
    """D98's second half: the exact turn the search-words augmentation fires on is also the only
    turn ``ask_ollama`` is told a follow-up subject, via the `followup_subject` kwarg it forwards
    to the prompt builder (ollama_prompts.build_system_prompt). Checked here the same way
    FollowupMemorySearchWordsWiringTests checks the search words -- by reading what a real
    run_game_ai_request call actually passed, not by re-deriving the gate.
    """

    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    def _settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": True,
        }

    def _drg_dreadnought_result(self) -> KnowledgeRetrievalResult:
        return KnowledgeRetrievalResult(
            attached=True,
            text_block=(
                f"[{_DRG_APP_NAME} / boss: Glyphid Dreadnought]\n"
                "Break the glowing plates, then focus the head."
            ),
            sources=[],
        )

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_bare_followup_using_memory_carries_the_subject_to_the_prompt_builder(
        self, mock_retrieve
    ):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

        _run(plugin, "what about its second phase")
        self.assertEqual(
            plugin.ask_ollama_calls[-1]["followup_subject"], "Glyphid Dreadnought"
        )

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_a_fresh_named_question_carries_no_subject_even_with_one_remembered(
        self, mock_retrieve
    ):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(
            attached=True,
            text_block=f"[{_DRG_APP_NAME} / boss: Dreadnought Twins]\nSplit fire between them.",
            sources=[],
        )
        _run(plugin, "how do i beat the dreadnought twins")

        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_speed_mode_never_carries_a_subject_even_with_one_remembered(self, mock_retrieve):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        _run(plugin, "what about its second phase", ask_mode="speed")

        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    @patch("backend.services.game_ai_request.should_retrieve_knowledge")
    def test_a_troubleshooting_question_never_carries_a_subject(
        self, mock_should_retrieve, mock_retrieve
    ):
        mock_should_retrieve.return_value = (True, "strategy")
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        # Force the domain a real crash/troubleshooting question routes to, rather than guessing
        # a sentence the router's own keyword rules would classify that way -- kb_domain
        # "compat" forgets the memory outright (see the module docstring's table), so it must
        # not carry a subject either, even phrased as a short "what about" follow-up.
        mock_should_retrieve.return_value = (True, "compat")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        _run(plugin, "what about the crash on the second level")

        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

    @patch("backend.services.game_ai_request.retrieve_knowledge_context")
    def test_the_remembered_subject_never_reaches_the_spoiler_consent_kwargs(self, mock_retrieve):
        """The safety half of D98: a remembered subject is sometimes just the top attached
        note's own title, not anything the person typed. If it ever counted as the person naming
        that thing, it would unfence that thing's spoilers on a turn nobody asked to unfence
        them. `strategy_spoiler_asked_entity`/`strategy_spoiler_consent` must stay exactly what
        the bare follow-up's own words would produce -- nothing named, no consent -- even though
        `followup_subject` on the same call is not blank.
        """
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = self._drg_dreadnought_result()
        _run(plugin, "what about its second phase")

        kwargs = plugin.ask_ollama_calls[-1]
        self.assertEqual(kwargs["followup_subject"], "Glyphid Dreadnought")
        self.assertEqual(kwargs["strategy_spoiler_asked_entity"], "")
        self.assertFalse(kwargs["strategy_spoiler_consent"])


if __name__ == "__main__":
    unittest.main()
