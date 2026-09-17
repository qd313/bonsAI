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
from backend.services.spy_confession_service import SPY_LIES_TAG_CLOSE, SPY_LIES_TAG_OPEN


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


class ReasoningPassthroughWiringTests(unittest.TestCase):
    """The finished status and the saved chat turn read reasoning_text, reasoning_seconds,
    reasoning_tokens, model and thinking_unsupported off the dict run_game_ai_request returns
    (main.py lines ~2426-2435). Those five keys have to actually be on that dict, not just on
    the Ollama call's own result, or a person never sees the thinking they were shown live.
    """

    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
        }

    def test_thinking_reaches_the_returned_dict(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Watch the boss's tell before you commit to the dodge.",
            "model": "gemma4:e2b-it-qat",
            "thinking_unsupported": False,
            "reasoning_text": "Think about the boss.\nHit the weak point.",
            "reasoning_seconds": 41,
            "reasoning_tokens": 380,
        }

        result = _run(plugin)

        self.assertEqual(result.get("model"), "gemma4:e2b-it-qat")
        self.assertEqual(result.get("thinking_unsupported"), False)
        self.assertEqual(
            result.get("reasoning_text"), "Think about the boss.\nHit the weak point."
        )
        self.assertEqual(result.get("reasoning_seconds"), 41)
        self.assertEqual(result.get("reasoning_tokens"), 380)

    def test_no_thinking_on_the_ollama_result_gives_the_no_thinking_shape(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "This game runs fine at the default power settings.",
            "model": "test-model",
        }

        result = _run(plugin)

        self.assertEqual(result.get("reasoning_text"), "")
        self.assertIsNone(result.get("reasoning_seconds"))
        self.assertEqual(result.get("reasoning_tokens"), 0)


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


class AnswerCheckerLoggingTests(unittest.TestCase):
    """The rule-based answer checker (response_verify.py) had never been called from anywhere.

    It should now run once per successful reply and write exactly one log line naming which
    rules fired -- nothing appended to the reply, no second model call, nothing on screen.
    """

    def _base_settings(self) -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
        }

    def _checker_log_calls(self, mock_logger):
        return [
            c
            for c in mock_logger.info.call_args_list
            if c.args and "answer checker ran" in str(c.args[0])
        ]

    def test_logs_the_rule_that_fired_for_a_reply_that_trips_one(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Try AppID 1234567 for that title.",
            "model": "test-model",
        }

        with patch("backend.services.game_ai_request.logger") as mock_logger:
            result = _run(plugin, question="What should I do next in this game?")

        self.assertTrue(result.get("success"))
        calls = self._checker_log_calls(mock_logger)
        self.assertEqual(len(calls), 1)
        _, rules_fired, warnings = calls[0].args
        self.assertEqual(rules_fired, 1)
        self.assertTrue(any("AppID 1234567" in w for w in warnings))

    def test_logs_zero_rules_fired_for_an_ordinary_reply(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "This game runs fine at the default power settings.",
            "model": "test-model",
        }

        with patch("backend.services.game_ai_request.logger") as mock_logger:
            _run(
                plugin,
                question="What should I do next in this game?",
                app_id="1145360",
                app_name="Hades",
            )

        calls = self._checker_log_calls(mock_logger)
        self.assertEqual(len(calls), 1)
        _, rules_fired, warnings = calls[0].args
        self.assertEqual(rules_fired, 0)
        self.assertEqual(warnings, [])

    def test_checker_result_reaches_the_show_details_snapshot(self):
        plugin = _FakePlugin(self._base_settings())
        plugin._ollama_result = {
            "success": True,
            "response": "Try AppID 1234567 for that title.",
            "model": "test-model",
        }

        _run(plugin)

        self.assertEqual(len(plugin.persisted_snapshots), 1)
        self.assertIsNotNone(plugin.persisted_snapshots[0].get("response_verify"))
        self.assertFalse(plugin.persisted_snapshots[0]["response_verify"]["passed"])

    def test_checker_does_not_change_the_reply_text(self):
        plugin = _FakePlugin(self._base_settings())
        text = "Try AppID 1234567 for that title."
        plugin._ollama_result = {"success": True, "response": text, "model": "test-model"}

        result = _run(plugin, question="What should I do next in this game?")

        self.assertEqual(result.get("response"), text)


class SpyLyingWiringTests(unittest.TestCase):
    """The Spy's confession tag has to be stripped from the reply a person reads, and the lies
    carried into the ask result -- but only when the Spy is actually resolved at a lying accent
    level, and without changing what the destructive advice guard sees.
    """

    def _spy_settings(self, intensity: str = "heavy") -> dict:
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "ai_character_enabled": True,
            "ai_character_random": False,
            "ai_character_preset_id": "tf2_spy",
            "ai_character_custom_text": "",
            "ai_character_accent_intensity": intensity,
        }

    def test_tag_is_stripped_and_lies_reach_the_result_at_a_lying_level(self):
        plugin = _FakePlugin(self._spy_settings("heavy"))
        plugin._ollama_result = {
            "success": True,
            "response": (
                "Just drop your TDP to 4 watts, that always helps this game.\n\n"
                f"{SPY_LIES_TAG_OPEN}\n"
                "Said 4 watts always helps\n"
                f"{SPY_LIES_TAG_CLOSE}"
            ),
            "model": "test-model",
        }

        result = _run(plugin, question="What should I do next in this game?")

        self.assertNotIn(SPY_LIES_TAG_OPEN, result.get("response", ""))
        self.assertIn("Just drop your TDP to 4 watts", result.get("response", ""))
        self.assertTrue(result.get("spy_lying_active"))
        self.assertEqual(result.get("spy_lies"), ["Said 4 watts always helps"])
        # Both fields are also handed to build_ollama_route_snapshot's ollama_result argument
        # here; whether the Show details record itself stores them is transparency_service.py's
        # own concern and is tested in test_transparency_service.py.

    def test_tag_is_left_alone_below_a_lying_level(self):
        plugin = _FakePlugin(self._spy_settings("balanced"))
        text_with_tag_shaped_text = (
            f"An honest answer. {SPY_LIES_TAG_OPEN}\nnot a real lie\n{SPY_LIES_TAG_CLOSE}"
        )
        plugin._ollama_result = {
            "success": True,
            "response": text_with_tag_shaped_text,
            "model": "test-model",
        }

        result = _run(plugin, question="What should I do next in this game?")

        self.assertEqual(result.get("response"), text_with_tag_shaped_text)
        self.assertFalse(result.get("spy_lying_active"))
        self.assertEqual(result.get("spy_lies"), [])

    def test_non_spy_character_never_sets_spy_lying_active(self):
        plugin = _FakePlugin(
            {
                "latency_timeouts_custom_enabled": False,
                "input_sanitizer_user_disabled": False,
                "capabilities": {},
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "heavy",
            }
        )
        plugin._ollama_result = {"success": True, "response": "Plain advice.", "model": "test-model"}

        result = _run(plugin, question="What should I do next in this game?")

        self.assertFalse(result.get("spy_lying_active"))
        self.assertEqual(result.get("spy_lies"), [])

    def test_destructive_advice_guard_still_fires_on_a_lying_spy_reply(self):
        plugin = _FakePlugin(self._spy_settings("unleashed"))
        plugin._ollama_result = {
            "success": True,
            "response": (
                "Just delete your compatdata folder to fix this crash.\n\n"
                f"{SPY_LIES_TAG_OPEN}\n"
                "Said deleting compatdata fixes it\n"
                f"{SPY_LIES_TAG_CLOSE}"
            ),
            "model": "test-model",
        }

        result = _run(plugin, question="What should I do next in this game?")

        self.assertIn(
            "bonsAI safety check",
            result.get("response", ""),
            "the destructive advice notice must still be appended for a lying Spy reply",
        )


if __name__ == "__main__":
    unittest.main()
