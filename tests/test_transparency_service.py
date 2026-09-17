"""Tests for the Spy chip and the Thinking chip (plan 57) in the Show details record: when each
shows, what it says, and whether it survives being trimmed down for a saved chat turn.
"""

import unittest

from backend.services.transparency_service import (
    build_context_chips_manifest,
    build_ollama_route_snapshot,
    reasoning_chip_label,
    transparency_snapshot_for_chat_slot,
)


class SpyChipTests(unittest.TestCase):
    def _snapshot(self, **overrides) -> dict:
        base = {"spy_lying_active": False, "spy_lies": []}
        base.update(overrides)
        return base

    def test_chip_absent_when_the_spy_was_not_lying(self):
        manifest = build_context_chips_manifest(snapshot=self._snapshot())
        ids = [c["id"] for c in manifest["context_chips"]]
        self.assertNotIn("spy", ids)

    def test_chip_present_with_the_lies_as_bullets(self):
        manifest = build_context_chips_manifest(
            snapshot=self._snapshot(
                spy_lying_active=True,
                spy_lies=["Said 4 watts always helps", "Claimed no cooldown needed"],
            )
        )
        chip = next(c for c in manifest["context_chips"] if c["id"] == "spy")
        self.assertEqual(chip["label"], "Spy")
        bullets = chip["body"]["bullets"]
        self.assertEqual(bullets[0], "The Spy was on")
        self.assertIn("Said 4 watts always helps", bullets)
        self.assertIn("Claimed no cooldown needed", bullets)

    def test_chip_says_did_not_confess_when_the_tag_was_missing(self):
        manifest = build_context_chips_manifest(
            snapshot=self._snapshot(spy_lying_active=True, spy_lies=[])
        )
        chip = next(c for c in manifest["context_chips"] if c["id"] == "spy")
        self.assertEqual(chip["body"]["bullets"], ["The Spy was on and did not confess"])


class OllamaRouteSnapshotSpyFieldsTests(unittest.TestCase):
    """build_ollama_route_snapshot is what run_game_ai_request actually calls -- these prove
    the fields it hands in under ollama_result reach both the stored snapshot and its chip.
    """

    def _snapshot_with_spy(self, *, spy_lying_active: bool, spy_lies: list) -> dict:
        return build_ollama_route_snapshot(
            raw_question="what now",
            sanitizer_action="allow",
            sanitizer_reason_codes=[],
            text_after_sanitizer="what now",
            ollama_result={
                "success": True,
                "spy_lying_active": spy_lying_active,
                "spy_lies": spy_lies,
            },
            base_response_text="An honest-sounding wrong answer.",
            response_text="An honest-sounding wrong answer.",
            applied=None,
            app_id="",
            app_name="",
            pc_ip="127.0.0.1",
            err_tail="",
            elapsed_seconds=1.0,
        )

    def test_fields_reach_the_snapshot_and_its_chip(self):
        snapshot = self._snapshot_with_spy(
            spy_lying_active=True, spy_lies=["Said the boss has no weak point"]
        )
        self.assertTrue(snapshot["spy_lying_active"])
        self.assertEqual(snapshot["spy_lies"], ["Said the boss has no weak point"])
        chip = next(c for c in snapshot["context_chips"] if c["id"] == "spy")
        self.assertIn("Said the boss has no weak point", chip["body"]["bullets"])

    def test_chip_absent_when_not_lying(self):
        snapshot = self._snapshot_with_spy(spy_lying_active=False, spy_lies=[])
        ids = [c["id"] for c in snapshot["context_chips"]]
        self.assertNotIn("spy", ids)

    def test_chip_survives_the_chat_slot_trim(self):
        snapshot = self._snapshot_with_spy(
            spy_lying_active=True, spy_lies=["Said the boss has no weak point"]
        )
        trimmed = transparency_snapshot_for_chat_slot(snapshot)
        ids = [c["id"] for c in trimmed["context_chips"]]
        self.assertIn("spy", ids)


class ReasoningChipLabelTests(unittest.TestCase):
    def test_label_reads_level_seconds_and_estimated_tokens(self):
        self.assertEqual(
            reasoning_chip_label(effort_key="medium", seconds=41, tokens=380),
            "Thinking: Balanced · 41 s · ~380 tokens",
        )

    def test_every_effort_key_maps_to_its_own_word(self):
        self.assertEqual(reasoning_chip_label(effort_key="low", seconds=1, tokens=1), "Thinking: Brief · 1 s · ~1 tokens")
        self.assertEqual(reasoning_chip_label(effort_key="high", seconds=1, tokens=1), "Thinking: Deep · 1 s · ~1 tokens")

    def test_unknown_effort_key_falls_back_to_a_plain_word(self):
        label = reasoning_chip_label(effort_key="", seconds=5, tokens=10)
        self.assertTrue(label.startswith("Thinking: Thinking ·"))


class ReasoningChipTests(unittest.TestCase):
    """build_ollama_route_snapshot is what run_game_ai_request actually calls -- these prove the
    reasoning fields it hands in under ollama_result reach both the stored snapshot and its chip,
    the same shape the Spy tests above already prove for the Spy chip.
    """

    def _snapshot_with_reasoning(
        self, *, reasoning_text: str, reasoning_seconds, reasoning_tokens, think_effort: str = "medium"
    ) -> dict:
        return build_ollama_route_snapshot(
            raw_question="how do i kill the boss",
            sanitizer_action="allow",
            sanitizer_reason_codes=[],
            text_after_sanitizer="how do i kill the boss",
            ollama_result={
                "success": True,
                "reasoning_text": reasoning_text,
                "reasoning_seconds": reasoning_seconds,
                "reasoning_tokens": reasoning_tokens,
                "ask_budgets": {"think_effort": think_effort},
            },
            base_response_text="Stand behind it and swing.",
            response_text="Stand behind it and swing.",
            applied=None,
            app_id="",
            app_name="",
            pc_ip="127.0.0.1",
            err_tail="",
            elapsed_seconds=41.0,
        )

    def test_chip_present_and_labelled_from_the_ollama_result(self):
        snapshot = self._snapshot_with_reasoning(
            reasoning_text="Thinking Process: the boss has a weak point.",
            reasoning_seconds=41,
            reasoning_tokens=380,
            think_effort="medium",
        )
        chip = next(c for c in snapshot["context_chips"] if c["id"] == "reasoning")
        self.assertEqual(chip["label"], "Thinking: Balanced · 41 s · ~380 tokens")
        self.assertIn("estimate", " ".join(chip["body"]["bullets"]).lower())

    def test_chip_absent_when_reasoning_text_is_empty(self):
        """Thinking Off, or a model that cannot think: no chip at all."""
        snapshot = self._snapshot_with_reasoning(
            reasoning_text="", reasoning_seconds=None, reasoning_tokens=0
        )
        ids = [c["id"] for c in snapshot["context_chips"]]
        self.assertNotIn("reasoning", ids)

    def test_chip_survives_the_chat_slot_trim(self):
        snapshot = self._snapshot_with_reasoning(
            reasoning_text="Thinking Process: the boss has a weak point.",
            reasoning_seconds=41,
            reasoning_tokens=380,
        )
        trimmed = transparency_snapshot_for_chat_slot(snapshot)
        ids = [c["id"] for c in trimmed["context_chips"]]
        self.assertIn("reasoning", ids)


if __name__ == "__main__":
    unittest.main()
