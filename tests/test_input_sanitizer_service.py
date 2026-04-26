"""Unit tests for input sanitizer commands and lane behavior."""

import unittest

from backend.services.input_sanitizer_service import (
    COMMAND_DISABLE_SANITIZE,
    COMMAND_ENABLE_SANITIZE,
    apply_input_sanitizer_lane,
    classify_sanitizer_command,
    deterministic_normalize,
)


class InputSanitizerServiceTests(unittest.TestCase):
    def test_classify_command_case_insensitive(self) -> None:
        self.assertEqual(classify_sanitizer_command("  " + COMMAND_DISABLE_SANITIZE.upper() + "  "), "disable")
        self.assertEqual(classify_sanitizer_command(COMMAND_ENABLE_SANITIZE), "enable")
        self.assertIsNone(classify_sanitizer_command("not a command"))
        self.assertIsNone(classify_sanitizer_command(COMMAND_DISABLE_SANITIZE + " extra"))

    def test_deterministic_strips_nul_and_collapses_space(self) -> None:
        text, reasons = deterministic_normalize("a\x00b\t\tc\n\n")
        self.assertEqual(text, "ab c")
        self.assertIn("nul_removed", reasons)

    def test_lane_passes_normal_question(self) -> None:
        r = apply_input_sanitizer_lane("How do I cap TDP on Steam Deck?", False)
        self.assertEqual(r.action, "pass")
        self.assertIn("TDP", r.text)

    def test_lane_blocked_empty(self) -> None:
        r = apply_input_sanitizer_lane("   \n\t  ", False)
        self.assertEqual(r.action, "block")

    def test_user_disabled_skips_block_heuristic(self) -> None:
        r = apply_input_sanitizer_lane("   ", True)
        self.assertEqual(r.action, "pass")
        self.assertEqual(r.text, "")


if __name__ == "__main__":
    unittest.main()
