"""Tests for the Spy chip in the Show details record: when it shows, what it says, and whether
it survives being trimmed down for a saved chat turn.
"""

import unittest

from backend.services.transparency_service import (
    build_context_chips_manifest,
    build_ollama_route_snapshot,
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


if __name__ == "__main__":
    unittest.main()
