"""Tests for the short names on the Show details chips (plan 105, the density board's option A):
every chip the board names carries the board's short name, the full label is kept for the box, a
chip whose label is already short carries none, and the short name survives the saved chat's trim.
"""

import unittest

from backend.answer.chip_short_labels import (
    journal_short_label,
    kb_coverage_short_label,
    model_short_label,
    reasoning_short_label,
    reply_style_short_label,
    screenshot_short_label,
    spoiler_short_label,
    tdp_short_label,
)
from backend.answer.transparency_service import (
    build_context_chips_manifest,
    transparency_snapshot_for_chat_slot,
)

# The answer the density board draws (docs/demos/mockup-board-2, tab 1): Hollow Knight, Strategy,
# a Proton log, two earlier tries, a screenshot, the library, 12 W, Balanced, 16 s of thinking.
BOARD_SNAPSHOT = {
    "route": "ollama",
    "success": True,
    "proton_log_excerpt_attached": True,
    "proton_journal_entry_count": 2,
    "proton_journal_attached": True,
    "user_image_count": 1,
    "kb_attached": True,
    "kb_retrieval_method": "hybrid",
    "kb_coverage_status": "sections",
    "kb_coverage_section_count": 14,
    "tdp_cap_watts": 12,
    "reply_verbosity": "balanced",
    "reasoning_text": "The armour drops after three hits.",
    "reasoning_effort": "medium",
    "reasoning_seconds": 16.4,
    "reasoning_tokens": 445,
    "ollama_model": "gemma4:e2b-it-qat",
}


def _chips(snapshot: dict) -> dict:
    return {c["id"]: c for c in build_context_chips_manifest(snapshot=snapshot)["context_chips"]}


class BoardChipsTests(unittest.TestCase):
    def test_each_chip_the_board_names_carries_its_short_name(self):
        chips = _chips(BOARD_SNAPSHOT)
        self.assertEqual(
            {k: chips[k]["short_label"] for k in chips if k != "spoiler_risk"},
            {
                "proton_logs": "Proton log",
                "journal": "2 earlier tries",
                "screenshot": "1 screenshot",
                "kb": "KB search",
                "kb_coverage": "14 sections",
                "tdp": "TDP 12 W",
                "reply_verbosity": "Balanced",
                "reasoning": "Thought 16 s",
                "model": "gemma4:e2b",
                "developer": "Developer",
            },
        )
        self.assertRegex(chips["spoiler_risk"]["short_label"], r"^Spoilers: (low|medium|high)$")

    def test_the_full_label_is_kept_for_the_box(self):
        chips = _chips(BOARD_SNAPSHOT)
        self.assertEqual(chips["reasoning"]["label"], "Thinking: Balanced · 16 s · ~445 tokens")
        self.assertEqual(chips["model"]["label"], "Routed gemma4:e2b-it-qat")
        self.assertEqual(chips["tdp"]["label"], "Read current TDP")
        self.assertEqual(chips["developer"]["label"], "Developer details")

    def test_a_chip_whose_label_is_already_short_carries_none(self):
        chips = _chips({**BOARD_SNAPSHOT, "proton_log_excerpt_attached": False, "proton_log_notes": "too big",
                        "proton_journal_entry_count": 0, "proton_journal_notes": "kept",
                        "spy_lying_active": True, "kb_coverage_status": "kb_off"})
        self.assertEqual(chips["proton_logs"]["short_label"], "")
        self.assertEqual(chips["journal"]["short_label"], "")
        self.assertEqual(chips["kb_coverage"]["short_label"], "")
        self.assertEqual(chips["spy"]["short_label"], "")

    def test_the_short_name_survives_the_saved_chats_trim(self):
        snapshot = dict(BOARD_SNAPSHOT)
        snapshot.update(build_context_chips_manifest(snapshot=snapshot))
        trimmed = transparency_snapshot_for_chat_slot(snapshot)
        shorts = {c["id"]: c["short_label"] for c in trimmed["context_chips"]}
        self.assertEqual(shorts["reasoning"], "Thought 16 s")
        self.assertEqual(shorts["model"], "gemma4:e2b")


class ShortNameRulesTests(unittest.TestCase):
    def test_counts_say_one_or_many(self):
        self.assertEqual(journal_short_label(1), "1 earlier try")
        self.assertEqual(screenshot_short_label(3), "3 screenshots")
        self.assertEqual(kb_coverage_short_label("sections", 1), "1 section")

    def test_whole_watts_drop_their_point(self):
        self.assertEqual(tdp_short_label(12.0), "TDP 12 W")
        self.assertEqual(tdp_short_label(7.5), "TDP 7.5 W")

    def test_style_seconds_and_spoiler_band(self):
        self.assertEqual(reply_style_short_label("detailed"), "Detailed")
        self.assertEqual(reasoning_short_label(None), "Thought 0 s")
        self.assertEqual(spoiler_short_label("med"), "Spoilers: medium")
        self.assertEqual(spoiler_short_label("high"), "Spoilers: high")

    def test_the_model_keeps_its_name_and_the_first_part_of_its_tag(self):
        self.assertEqual(model_short_label("gemma4:e2b-it-qat"), "gemma4:e2b")
        self.assertEqual(model_short_label("qwen3:4b-instruct-2507-q4_K_M"), "qwen3:4b")
        self.assertEqual(model_short_label("llama3.2:3b"), "llama3.2:3b")
        self.assertEqual(model_short_label("hf.co/someone/tiny-model:Q4_K_M"), "tiny-model:Q4_K_M")
        self.assertEqual(model_short_label("mistral"), "mistral")
        self.assertEqual(model_short_label(""), "")


if __name__ == "__main__":
    unittest.main()
