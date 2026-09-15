"""Tests for the raw TDP JSON block being stripped from a reply before it reaches a person.

Bug: a reply could end with the literal line the model used to signal a power suggestion,
e.g. ``{"tdp_watts": 5, "gpu_clock_mhz": 1200}``, sitting in the words a person reads. The
stripping itself is unit-tested directly against ``strip_tdp_recommendation_block``; the
wiring tests below confirm ``run_game_ai_request`` actually applies it to the reply a person
sees while the power suggestion feature that reads the same block keeps working.
"""

import asyncio
import sys
import types
import unittest
from unittest.mock import patch

from backend.tdp_intent import strip_tdp_recommendation_block

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

from backend.services.game_ai_request import run_game_ai_request
from backend.services.ollama_prompts import extract_strategy_asked_entity


class StripTdpRecommendationBlockTests(unittest.TestCase):
    def test_removes_the_block_and_keeps_the_surrounding_words(self):
        text = (
            "Try dropping your TDP a bit for this game.\n"
            '{"tdp_watts": 5, "gpu_clock_mhz": 1200}'
        )
        result = strip_tdp_recommendation_block(text)
        self.assertNotIn("tdp_watts", result)
        self.assertIn("Try dropping your TDP a bit for this game.", result)

    def test_reply_with_no_block_is_byte_identical(self):
        text = "This game runs fine at the default power settings."
        self.assertEqual(strip_tdp_recommendation_block(text), text)

    def test_fenced_code_sample_the_person_asked_for_is_left_alone(self):
        text = (
            "Here is the JSON shape the assistant uses internally:\n\n"
            '```json\n{"tdp_watts": 10, "gpu_clock_mhz": 1000}\n```\n'
        )
        self.assertEqual(strip_tdp_recommendation_block(text), text)

    def test_empty_text_is_returned_unchanged(self):
        self.assertEqual(strip_tdp_recommendation_block(""), "")


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result: dict = {}
        self.persisted_snapshots: list = []
        # The kwargs the last ask_ollama call received, so a test can check what actually reached
        # the prompt call rather than only what the result dict reports back.
        self.ask_ollama_kwargs: dict = {}

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_kwargs = kwargs
        return self._ollama_result

    async def _persist_input_transparency(self, payload):
        self.persisted_snapshots.append(payload)


def _run(plugin: _FakePlugin, question: str = "How do I get better performance in this game?", **kwargs):
    return asyncio.run(
        run_game_ai_request(
            plugin,
            question,
            "127.0.0.1:11434",
            **kwargs,
        )
    )


class TdpBlockWiringTests(unittest.TestCase):
    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
        }

    def test_raw_block_is_stripped_from_the_reply_a_person_sees(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": (
                "Dropping your power draw should help with fan noise.\n"
                '{"tdp_watts": 5, "gpu_clock_mhz": 1200}'
            ),
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertTrue(result.get("success"))
        self.assertNotIn("tdp_watts", result.get("response", ""))
        self.assertIn("help with fan noise", result.get("response", ""))

    def test_power_suggestion_still_reaches_the_caller(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": (
                "Dropping your power draw should help with fan noise.\n"
                '{"tdp_watts": 5, "gpu_clock_mhz": 1200}'
            ),
            "model": "test-model",
        }

        result = _run(plugin)

        applied = result.get("applied") or {}
        suggestion = applied.get("suggestion") or {}
        self.assertEqual(suggestion.get("tdp_watts"), 5)
        self.assertEqual(suggestion.get("gpu_clock_mhz"), 1200)

    def test_reply_with_no_block_is_byte_identical(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "This game runs fine at the default power settings.",
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertEqual(
            result.get("response"), "This game runs fine at the default power settings."
        )


class StrategySpoilerAskedEntityWiringTests(unittest.TestCase):
    """Plan 54 gap 2: the backend's own guess at the named thing must reach the result dict (so
    the screen can use it) and the prompt call (so a test can prove it is the same value the
    prompt was told, not a second, silently-drifted copy).
    """

    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": False,
        }

    def test_result_dict_carries_the_named_thing_the_extractor_finds(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "Wheatley starts lying immediately."}

        question = "wheatley fight"
        expected = extract_strategy_asked_entity(question)
        self.assertTrue(expected, "fixture question must actually name something")

        result = _run(plugin, question=question, ask_mode="strategy")

        self.assertEqual(result.get("strategy_spoiler_asked_entity"), expected)

    def test_the_same_value_reaches_the_prompt_call(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "Wheatley starts lying immediately."}

        question = "wheatley fight"
        expected = extract_strategy_asked_entity(question)

        result = _run(plugin, question=question, ask_mode="strategy")

        self.assertEqual(plugin.ask_ollama_kwargs.get("strategy_spoiler_asked_entity"), expected)
        self.assertEqual(
            result.get("strategy_spoiler_asked_entity"),
            plugin.ask_ollama_kwargs.get("strategy_spoiler_asked_entity"),
        )

    def test_result_dict_carries_an_empty_string_when_nothing_is_named(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "General advice."}

        result = _run(plugin, question="what class should I play", ask_mode="strategy")

        self.assertEqual(result.get("strategy_spoiler_asked_entity"), "")


class StrategyTitleProfileWiringTests(unittest.TestCase):
    """Plan 54 gap 3: nothing running, a game named only in the question -- the prompt must get
    the same resolved profile the risk chip does, so the two never disagree.

    ``resolve_title_from_question`` needs a real corpus database to look the title up, which
    this fake plugin cannot supply. Monkeypatched in the ``game_ai_request`` module namespace
    (where it is imported by name) to stand in for that lookup -- noted here and in the report,
    per the brief, rather than building a real corpus fixture for one call.
    """

    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": False,
        }

    def test_no_story_game_named_in_the_question_gets_the_low_narrative_profile(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "Pick whichever class you like."}

        with patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            return_value="Deep Rock Galactic: Survivor",
        ):
            _run(plugin, question="drg survivor what class", ask_mode="strategy")

        self.assertEqual(
            plugin.ask_ollama_kwargs.get("strategy_title_profile"), "low_narrative"
        )

    def test_story_game_named_in_the_question_gets_the_protect_progression_profile(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "General advice."}

        with patch(
            "backend.services.game_ai_request.resolve_title_from_question",
            return_value="Fallout: New Vegas",
        ):
            _run(plugin, question="what should I do next", ask_mode="strategy")

        self.assertEqual(
            plugin.ask_ollama_kwargs.get("strategy_title_profile"), "protect_progression"
        )


if __name__ == "__main__":
    unittest.main()
