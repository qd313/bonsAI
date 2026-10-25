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
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.knowledge.knowledge_base_service import KnowledgeRetrievalResult  # noqa: E402
from backend.prompts.ollama_prompts import kb_card_names  # noqa: E402

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
        self.ask_ollama_questions: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_calls.append(kwargs)
        self.ask_ollama_questions.append(args[0] if args else "")
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

    def test_a_thank_you_after_a_boss_question_attaches_nothing_from_the_real_library(self):
        plugin = _FakePlugin(self._real_settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")
        _run(plugin, "thank you very much")

        self.assertEqual(self._attached_names(plugin), [])
        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
    def test_speed_mode_never_carries_a_subject_even_with_one_remembered(self, mock_retrieve):
        mock_retrieve.return_value = self._drg_dreadnought_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = _ok_result()

        _run(plugin, "how do i beat the glyphid dreadnought")

        mock_retrieve.reset_mock()
        mock_retrieve.return_value = KnowledgeRetrievalResult(attached=False)
        _run(plugin, "what about its second phase", ask_mode="speed")

        self.assertEqual(plugin.ask_ollama_calls[-1]["followup_subject"], "")

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
    @patch("backend.ask.game_ai_request.should_retrieve_knowledge")
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

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
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


class FollowupJunkPhraseWiringTests(unittest.TestCase):
    """Plan 100 lane F (Deck check P100-THANKS-01): after a boss question, a thank-you or an
    off-topic question carries nothing from the boss turn -- no library search, no remembered
    subject, no previous answer -- and the boss is still remembered for the next real follow-up.
    The same three turns the Deck block L0 ran in Deep Rock Galactic: Survivor.
    """

    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    _settings = FollowupMemoryPromptSubjectWiringTests._settings

    def _praetorian_result(self) -> KnowledgeRetrievalResult:
        return KnowledgeRetrievalResult(
            attached=True,
            text_block=(
                f"[{_DRG_APP_NAME} / boss: Praetorian]\n"
                "Shoot the glowing legs, then back away from its slam."
            ),
            sources=[],
        )

    def _boss_turn(self, mock_retrieve):
        mock_retrieve.return_value = self._praetorian_result()
        plugin = _FakePlugin(self._settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Shoot the glowing legs of the Praetorian first.",
            "model": "test-model",
        }
        _run(plugin, "how do i beat the praetorian")
        mock_retrieve.reset_mock()
        return plugin

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
    def test_a_thank_you_or_the_time_after_a_boss_turn_carries_nothing_and_searches_nothing(
        self, mock_retrieve
    ):
        for phrase in ("thank you very much", "what time is it"):
            with self.subTest(phrase=phrase):
                kb_followup_memory.forget()
                plugin = self._boss_turn(mock_retrieve)

                _run(plugin, phrase)

                mock_retrieve.assert_not_called()
                call = plugin.ask_ollama_calls[-1]
                self.assertEqual(call["followup_subject"], "")
                self.assertFalse(call.get("proton_log_attachment"))
                self.assertEqual(plugin.ask_ollama_questions[-1], phrase)

    @patch("backend.ask.game_ai_request.retrieve_knowledge_context")
    def test_the_boss_is_still_remembered_after_two_junk_turns(self, mock_retrieve):
        plugin = self._boss_turn(mock_retrieve)
        _run(plugin, "thank you very much")
        # A junk turn that did attach a note must not overwrite the boss either.
        mock_retrieve.return_value = KnowledgeRetrievalResult(
            attached=True,
            text_block=f"[{_DRG_APP_NAME} / boss: Exploder]\nPop it from range.",
            sources=[],
        )
        _run(plugin, "what time is it")
        mock_retrieve.reset_mock()
        mock_retrieve.return_value = self._praetorian_result()

        _run(plugin, "how do i beat it")

        searched = mock_retrieve.call_args.kwargs["question"]
        self.assertIn("Praetorian", searched)
        call = plugin.ask_ollama_calls[-1]
        self.assertEqual(call["followup_subject"], "Praetorian")
        # The previous question and answer sent along are the boss turn's, not the thank-you's.
        first_arg = plugin.ask_ollama_questions[-1]
        self.assertIn("how do i beat the praetorian", first_arg.lower())
        self.assertNotIn("thank you very much", first_arg.lower())


if __name__ == "__main__":
    unittest.main()
