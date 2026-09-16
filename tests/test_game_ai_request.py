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

    def test_fenced_block_shaped_like_the_prompt_asks_for_is_removed(self):
        # ollama_prompts.py tells the model to wrap the power block in exactly this fence
        # (language tag "json", nothing else in the box) -- the one shape the old fix could
        # never remove, since it deliberately skipped anything inside a code box.
        text = (
            "Dropping your power draw should help with fan noise.\n\n"
            '```json\n{"tdp_watts": 10, "gpu_clock_mhz": 1000}\n```\n'
        )
        result = strip_tdp_recommendation_block(text)
        self.assertNotIn("tdp_watts", result)
        self.assertNotIn("```", result)
        self.assertIn("help with fan noise", result)

    def test_fenced_block_with_no_language_tag_is_also_removed(self):
        text = "Try this.\n\n" '```\n{"tdp_watts": 8, "gpu_clock_mhz": null}\n```\n'
        result = strip_tdp_recommendation_block(text)
        self.assertNotIn("tdp_watts", result)
        self.assertNotIn("```", result)
        self.assertIn("Try this.", result)

    def test_fenced_code_sample_with_real_code_is_left_alone(self):
        text = (
            "Here is a launch option example:\n\n"
            "```\nPROTON_LOG=1 %command%\n```\n"
        )
        self.assertEqual(strip_tdp_recommendation_block(text), text)

    def test_fenced_block_holding_the_power_block_plus_other_text_survives(self):
        text = (
            "Here is the JSON shape the assistant uses internally:\n\n"
            '```json\n// example only, not a live suggestion\n'
            '{"tdp_watts": 10, "gpu_clock_mhz": 1000}\n```\n'
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
        # Records "publish_asked_entity" and "ask_ollama" entries in the order they actually
        # happened, so a test can prove the publish reaches the live poll before the model call
        # runs, not just that both eventually carry the same value.
        self.call_order: list = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    def _active_request_id(self):
        return 99

    def _publish_asked_entity(self, request_id, entity):
        self.call_order.append(("publish_asked_entity", request_id, entity))

    async def ask_ollama(self, *args, **kwargs):
        self.ask_ollama_kwargs = kwargs
        self.call_order.append(("ask_ollama", kwargs.get("strategy_spoiler_asked_entity")))
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


class AskedEntityStreamingPublishWiringTests(unittest.TestCase):
    """Plan 54 gap 2, streaming: the named thing must reach the live poll before the answer
    completes, not only in the finished result dict -- otherwise the spoiler box on screen still
    waits for the whole answer before it can open.
    """

    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": False,
        }

    def test_publish_fires_once_before_ask_ollama_with_the_same_value(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "Wheatley starts lying immediately."}

        question = "wheatley fight"
        result = _run(plugin, question=question, ask_mode="strategy")

        publish_calls = [c for c in plugin.call_order if c[0] == "publish_asked_entity"]
        self.assertEqual(len(publish_calls), 1)
        _, request_id, published_entity = publish_calls[0]
        self.assertEqual(request_id, plugin._active_request_id())
        self.assertEqual(published_entity, result.get("strategy_spoiler_asked_entity"))

        publish_index = plugin.call_order.index(publish_calls[0])
        ask_index = next(i for i, c in enumerate(plugin.call_order) if c[0] == "ask_ollama")
        self.assertLess(publish_index, ask_index, "publish must reach the poll before ask_ollama runs")

    def test_no_publish_when_nothing_is_named(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {"success": True, "response": "General advice."}

        _run(plugin, question="what class should I play", ask_mode="strategy")

        publish_calls = [c for c in plugin.call_order if c[0] == "publish_asked_entity"]
        self.assertEqual(publish_calls, [])


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
