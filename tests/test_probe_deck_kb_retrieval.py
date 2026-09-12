"""
Title: Deck knowledge-base retrieval probe — time budget tests

Purpose: Pin the pass / over-budget verdict the probe prints for the two timings written down in
         docs/knowledge-base.md, "Time budget for a game question": how long the meaning search
         takes, and how long until the first word of an answer appears, both with a game running.
Used for: scripts/probe_deck_kb_retrieval.py.
Solves: Before this, a slowdown in either number only got caught when a QA row happened to record
        one to compare against. These tests pin the verdict function itself, so the numbers in
        the doc and the numbers the probe checks against cannot quietly drift apart.
Does not: Call Ollama, read a real corpus, or touch the network — every case here hands the pure
          verdict functions a plain number and reads back a string.
"""

import importlib.util
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))


def _load_probe_module():
    spec = importlib.util.spec_from_file_location(
        "probe_deck_kb_retrieval", REPO_ROOT / "scripts" / "probe_deck_kb_retrieval.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:  # pragma: no cover - a load failure must not leave a stub behind
        sys.modules.pop(spec.name, None)
        raise
    return module


class SearchTimeVerdictTests(unittest.TestCase):
    """Strategy and Expert are meant to run the meaning search; the budget is 1.0 s, the figure
    the wave-two Deck evening's own row already expected ("at or under 1.0 s on the second and
    third questions", runs/plan46-R2-strategy-half.json)."""

    @classmethod
    def setUpClass(cls):
        cls.probe = _load_probe_module()

    def test_strategy_under_budget_passes(self):
        # The original 2026-08-18 reading on this Deck, 793-900 ms (docs/knowledge-base.md,
        # "Vector recall pass") — comfortably under the 1.0 s line.
        verdict = self.probe.search_time_verdict(850.0, "strategy")
        self.assertTrue(verdict.startswith("PASS"), verdict)

    def test_strategy_over_budget_fails(self):
        # The wave-two evening's second question, 1230.22 ms — over the 1.0 s line.
        verdict = self.probe.search_time_verdict(1230.22, "strategy")
        self.assertTrue(verdict.startswith("OVER BUDGET"), verdict)

    def test_strategy_current_readings_are_over_budget(self):
        # The regression this budget exists to catch: round-34's three readings (1078.87,
        # 1094.34, 1090.17 ms, docs/planning/34-feature-verification-round.md) already sit above
        # the August band and above this budget — this test documents that today's real numbers
        # fail the written-down figure, which is the point of writing it down.
        for embed_ms in (1078.87, 1094.34, 1090.17):
            verdict = self.probe.search_time_verdict(embed_ms, "strategy")
            self.assertTrue(verdict.startswith("OVER BUDGET"), verdict)

    def test_strategy_exactly_on_budget_passes(self):
        verdict = self.probe.search_time_verdict(1000.0, "strategy")
        self.assertTrue(verdict.startswith("PASS"), verdict)

    def test_expert_uses_the_same_budget_as_strategy(self):
        self.assertEqual(
            self.probe.search_time_verdict(1230.22, "expert"),
            self.probe.search_time_verdict(1230.22, "strategy"),
        )

    def test_no_meaning_search_passes_regardless_of_mode(self):
        # embed_ms stays 0.0 when the meaning search never ran (knowledge_base_service.py:1350).
        self.assertTrue(self.probe.search_time_verdict(0.0, "strategy").startswith("PASS"))
        self.assertTrue(self.probe.search_time_verdict(0.0, "speed").startswith("PASS"))

    def test_speed_mode_fails_on_any_measured_meaning_search_time(self):
        # KB-RECALL-01: Speed must read "Keyword search" with no embed time at all. Two of three
        # questions leaked into the meaning search in the round-34 reading, at 1140.40 ms.
        verdict = self.probe.search_time_verdict(1140.40, "speed")
        self.assertTrue(verdict.startswith("OVER BUDGET"), verdict)

    def test_unknown_mode_falls_back_to_the_strategy_budget(self):
        self.assertEqual(
            self.probe.search_time_verdict(1078.87, "some-new-mode"),
            self.probe.search_time_verdict(1078.87, "strategy"),
        )


class RealAskSearchVerdictTests(unittest.TestCase):
    """runs/plan48-R6-time-budget.json: the probe read 23-38 ms and printed PASS while a real Ask
    on the same Deck, minutes apart, read 1067 ms for the same step. The fault was order: a real
    Ask always runs the chat model for the previous question right before the embedding call for
    the next one, and the probe never did. `real_ask_search_verdict` is the wrapper that refuses
    to print a bare PASS for a reading that did not reproduce that order."""

    @classmethod
    def setUpClass(cls):
        cls.probe = _load_probe_module()

    def test_verified_pass_stays_a_plain_pass(self):
        # Same 850.0 ms reading as the plain PASS test above, but taken with a chat call first.
        verdict = self.probe.real_ask_search_verdict(850.0, "strategy", chat_ran_first=True)
        self.assertTrue(verdict.startswith("PASS"), verdict)
        self.assertNotIn("NOT VERIFIED", verdict)

    def test_unverified_pass_is_downgraded_to_not_verified(self):
        # The exact fault in the evidence file: a fast reading with no chat call first must not
        # read as a bare PASS.
        verdict = self.probe.real_ask_search_verdict(25.0, "strategy", chat_ran_first=False)
        self.assertTrue(verdict.startswith("NOT VERIFIED"), verdict)
        self.assertIn("cannot clear the device", verdict)

    def test_unverified_over_budget_is_not_softened(self):
        # An unverified reading that is already OVER BUDGET is still the worse news either way —
        # it must not be relabelled as merely unverified.
        verdict = self.probe.real_ask_search_verdict(1230.22, "strategy", chat_ran_first=False)
        self.assertTrue(verdict.startswith("OVER BUDGET"), verdict)

    def test_no_search_ran_stays_plain_pass_regardless_of_chat_ran_first(self):
        # Whether the meaning search ran at all is a fact about this reading, not about what ran
        # before it, so it is never downgraded.
        verdict = self.probe.real_ask_search_verdict(0.0, "strategy", chat_ran_first=False)
        self.assertEqual(verdict, self.probe.search_time_verdict(0.0, "strategy"))

    def test_speed_mode_over_budget_is_unaffected_by_chat_ran_first(self):
        verdict_a = self.probe.real_ask_search_verdict(1140.40, "speed", chat_ran_first=False)
        verdict_b = self.probe.real_ask_search_verdict(1140.40, "speed", chat_ran_first=True)
        self.assertEqual(verdict_a, verdict_b)
        self.assertTrue(verdict_a.startswith("OVER BUDGET"), verdict_a)


class AskModelFromSettingsTests(unittest.TestCase):
    """The chat call `--with-chat-before-search` makes must use the model a real Ask would try
    first, read from the Deck's own settings — never a hard-coded tag."""

    @classmethod
    def setUpClass(cls):
        cls.probe = _load_probe_module()

    def test_reads_first_entry_of_the_saved_try_order(self):
        settings = {"text_model_routing_order": ["qwen2.5:7b", "gemma4:e2b-it-qat"]}
        self.assertEqual(self.probe.ask_model_from_settings(settings), "qwen2.5:7b")

    def test_skips_blank_entries(self):
        settings = {"text_model_routing_order": ["  ", "gemma4:e2b-it-qat"]}
        self.assertEqual(self.probe.ask_model_from_settings(settings), "gemma4:e2b-it-qat")

    def test_falls_back_when_no_saved_order_exists(self):
        # A fresh install has no saved try order yet.
        self.assertEqual(
            self.probe.ask_model_from_settings({}),
            self.probe.DEFAULT_ASK_MODEL_FALLBACK,
        )

    def test_falls_back_when_saved_order_is_not_a_list(self):
        settings = {"text_model_routing_order": "gemma4:e2b-it-qat"}
        self.assertEqual(
            self.probe.ask_model_from_settings(settings),
            self.probe.DEFAULT_ASK_MODEL_FALLBACK,
        )


class FirstWordVerdictTests(unittest.TestCase):
    """No clean on-device reading of just this figure exists yet (see the doc section) — the
    budget borrows the app's own existing slow-reply warning, 60 seconds, as a stand-in."""

    @classmethod
    def setUpClass(cls):
        cls.probe = _load_probe_module()

    def test_not_measured_when_no_reading_supplied(self):
        self.assertEqual(self.probe.first_word_verdict(None), "not measured")

    def test_under_budget_passes(self):
        verdict = self.probe.first_word_verdict(45_000.0)
        self.assertTrue(verdict.startswith("PASS"), verdict)

    def test_over_budget_fails(self):
        # The one on-device reading in evidence: 69 s, runs/plan46-R2-strategy-half.json — though
        # taken during a prompt-overflow bug since fixed, so it is not used as the budget itself.
        verdict = self.probe.first_word_verdict(69_000.0)
        self.assertTrue(verdict.startswith("OVER BUDGET"), verdict)

    def test_exactly_on_budget_passes(self):
        verdict = self.probe.first_word_verdict(60_000.0)
        self.assertTrue(verdict.startswith("PASS"), verdict)


if __name__ == "__main__":
    unittest.main()
