"""Unit tests for C1 Ask token budgets and soft-continue cue helpers."""

from __future__ import annotations

import sys
import types
import unittest

# Stubs so `from main import Plugin` works standalone, not just when an earlier-discovered
# suite happened to install them first (test discovery order is not a contract).
if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8
    _fcntl.flock = lambda *_a, **_k: False
    sys.modules["fcntl"] = _fcntl

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

from backend.services.ollama_ask_budgets import (
    ASK_MAX_SOFT_CONTINUES,
    ASK_VISIBLE_NUM_PREDICT,
    SOFT_CONTINUE_CUE,
    mark_model_without_thinking,
    model_supports_thinking,
    reset_thinking_support_cache,
    resolve_ask_token_budgets,
    strip_soft_continue_cue,
)


class OllamaAskBudgetsTests(unittest.TestCase):
    def setUp(self) -> None:
        # The cache is module-level (process = plugin session), so leaving it dirty would
        # make later suites pass or fail on discovery order.
        reset_thinking_support_cache()

    def tearDown(self) -> None:
        reset_thinking_support_cache()

    def test_visible_caps_match_bug_v1_targets(self) -> None:
        self.assertEqual(ASK_VISIBLE_NUM_PREDICT["speed"], 800)
        self.assertEqual(ASK_VISIBLE_NUM_PREDICT["expert"], 1200)
        self.assertEqual(ASK_VISIBLE_NUM_PREDICT["strategy"], 1600)
        # "deep" is the mode's pre-2026-06-26 name. Settings migrate it to "expert" on load,
        # so a table keyed "deep" is unreachable and silently costs Expert its budget.
        self.assertNotIn("deep", ASK_VISIBLE_NUM_PREDICT)

    def test_every_valid_ask_mode_has_its_own_cap(self) -> None:
        """The guard for the silent-fallback bug: a mode with no cap runs on Speed's.

        ``normalize_ask_mode`` falls back to "speed" for anything it does not recognise, so
        a mode missing from the table gets 800 tokens with no error anywhere. This asserts
        every real mode resolves to itself, and fails if a mode is added without a cap.
        """
        from main import Plugin

        self.assertTrue(Plugin.VALID_ASK_MODES)
        for mode in Plugin.VALID_ASK_MODES:
            with self.subTest(mode=mode):
                self.assertIn(mode, ASK_VISIBLE_NUM_PREDICT)
                self.assertEqual(resolve_ask_token_budgets(mode)["ask_mode"], mode)

    def test_every_place_that_knows_the_ask_modes_agrees(self) -> None:
        """Three files hold their own copy of what an ask mode is. They must match.

        The one definition is ``VALID_ASK_MODES`` in ask_payload.py. The reply-length
        table here keys off the same names, and model routing keeps a third list because
        each mode names its own chain of models. A mode missing from any of them fails
        quietly -- that is exactly how Expert ran on Speed's 800-token cap for seven weeks
        in 2026. Nothing checks this at import time, so it is checked here.
        """
        from backend.ollama_routing import TEXT_MODELS_BY_MODE
        from backend.services.ask_payload import DEFAULT_ASK_MODE, VALID_ASK_MODES

        self.assertEqual(
            set(VALID_ASK_MODES),
            set(ASK_VISIBLE_NUM_PREDICT),
            "the reply-length table and the list of ask modes have drifted apart",
        )
        self.assertEqual(
            set(VALID_ASK_MODES),
            set(TEXT_MODELS_BY_MODE),
            "model routing and the list of ask modes have drifted apart",
        )
        self.assertIn(
            DEFAULT_ASK_MODE,
            VALID_ASK_MODES,
            "the mode everything falls back to is not itself a valid mode",
        )

    def test_default_effort_keeps_think_false_and_visible_only_budget(self) -> None:
        for mode, visible in ASK_VISIBLE_NUM_PREDICT.items():
            budgets = resolve_ask_token_budgets(mode)
            self.assertEqual(budgets["think"], False)
            self.assertEqual(budgets["think_effort"], "off")
            self.assertEqual(budgets["thinking_budget"], 0)
            self.assertEqual(budgets["visible_num_predict"], visible)
            self.assertEqual(budgets["num_predict"], visible)
            self.assertEqual(budgets["max_continues"], ASK_MAX_SOFT_CONTINUES)

    def test_effort_levels_add_thinking_budget_to_num_predict(self) -> None:
        """Effort is carried by the budget, not the wire value — see D21."""
        low = resolve_ask_token_budgets("expert", think_effort="low")
        self.assertIs(low["think"], True)
        self.assertEqual(low["thinking_budget"], 256)
        self.assertEqual(low["num_predict"], 1200 + 256)

        high = resolve_ask_token_budgets("speed", think_effort="high")
        self.assertIs(high["think"], True)
        self.assertEqual(high["thinking_budget"], 1024)
        self.assertEqual(high["num_predict"], 800 + 1024)

        medium = resolve_ask_token_budgets("strategy", think_effort="medium")
        self.assertIs(medium["think"], True)
        self.assertEqual(medium["thinking_budget"], 512)
        self.assertEqual(medium["num_predict"], 1600 + 512)

    def test_think_wire_is_always_boolean_never_the_effort_name(self) -> None:
        """Named levels are gpt-oss-only; qwen3 / deepseek-r1 reject a string (D21)."""
        for effort in ("off", "low", "medium", "high"):
            with self.subTest(effort=effort):
                self.assertIsInstance(
                    resolve_ask_token_budgets("speed", think_effort=effort)["think"], bool
                )

    def test_thinking_support_cache_remembers_only_rejecting_models(self) -> None:
        reset_thinking_support_cache()
        self.assertTrue(model_supports_thinking("qwen3:4b"))
        mark_model_without_thinking("gemma3:4b")
        self.assertFalse(model_supports_thinking("gemma3:4b"))
        self.assertTrue(model_supports_thinking("qwen3:4b"))
        # Blank tags are not cacheable — an empty entry would disable thinking for every
        # model whose tag failed to resolve.
        mark_model_without_thinking("")
        self.assertTrue(model_supports_thinking(""))
        reset_thinking_support_cache()
        self.assertTrue(model_supports_thinking("gemma3:4b"))

    def test_unknown_mode_and_effort_fall_back_safely(self) -> None:
        budgets = resolve_ask_token_budgets("nope", think_effort="spicy")
        self.assertEqual(budgets["ask_mode"], "speed")
        self.assertEqual(budgets["think_effort"], "off")
        self.assertEqual(budgets["think"], False)
        self.assertEqual(budgets["num_predict"], 800)

    def test_none_mode_and_effort_fall_back_to_defaults(self) -> None:
        budgets = resolve_ask_token_budgets(None, think_effort=None)
        self.assertEqual(budgets["ask_mode"], "speed")
        self.assertEqual(budgets["think_effort"], "off")
        self.assertEqual(budgets["think"], False)
        self.assertEqual(budgets["num_predict"], 800)

    def test_strip_soft_continue_cue_removes_trailing_marker_only(self) -> None:
        body = "Hello world"
        self.assertEqual(strip_soft_continue_cue(body), body)
        self.assertEqual(
            strip_soft_continue_cue(body + "\n\n" + SOFT_CONTINUE_CUE),
            body,
        )
        self.assertEqual(
            strip_soft_continue_cue(body + "\n\n" + SOFT_CONTINUE_CUE + "   "),
            body,
        )
        # Cue mid-body is content, not the ephemeral tail marker.
        mid = f"Say {SOFT_CONTINUE_CUE} aloud"
        self.assertEqual(strip_soft_continue_cue(mid), mid)


if __name__ == "__main__":
    unittest.main()
