"""Unit tests for input sanitizer commands and lane behavior."""

import unittest

from backend.commands.input_sanitizer_service import (
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

    # Long, ordinary questions were refused as "random characters" because the letter-variety
    # ratio shrinks as a text grows (about 26 distinct letters in 350 letters is under 8 percent).
    LONG_QUESTIONS = (
        "In Hollow Knight I keep dying to the Mantis Lords after the first one goes down and the other "
        "two come at me together, what should I watch for and which charms help the most for that fight? "
        "I have the Quick Focus charm and the Longnail charm equipped right now, plus Sharp Shadow, but "
        "I never seem to get enough soul to heal between their dives, and when I do heal they land a "
        "hit anyway. Should I swap something out, or is it better to learn the pattern and stay close?",
        "I am playing Elden Ring on my Steam Deck and the frame rate drops badly in Limgrave near the "
        "big trees, even though I set the TDP limit to 12 watts and capped the frame rate at 40. "
        "Would lowering the shadow quality help more than the resolution, and is FSR worth turning on "
        "for this game? I also notice the fan gets loud after about twenty minutes, so any advice on "
        "battery life and heat would be great, thanks.",
        "Can you explain how the Hades weapon aspects work? I have unlocked the Aspect of Zagreus for the "
        "Stygian Blade and I am not sure whether it is better than the Aspect of Chaos for a first "
        "clear, because my runs usually end around the Elysium bosses, usually to Theseus and the "
        "Minotaur together, and I would love to know which boons pair well with the dash attack.",
    )

    JUNK_INPUTS = (
        "a" * 60,
        "ab" * 40,
        "asdfghjkl" * 14,
        "qwer " * 16,
        "x" * 40 + " " + "y" * 40,
    )

    def test_long_ordinary_questions_pass(self) -> None:
        self.assertGreaterEqual(len(self.LONG_QUESTIONS[0]), 400)
        for q in self.LONG_QUESTIONS:
            with self.subTest(length=len(q)):
                r = apply_input_sanitizer_lane(q, False)
                self.assertEqual(r.action, "pass", r.user_message)

    def test_junk_inputs_are_still_blocked(self) -> None:
        for junk in self.JUNK_INPUTS:
            with self.subTest(junk=junk[:20]):
                r = apply_input_sanitizer_lane(junk, False)
                self.assertEqual(r.action, "block")
                self.assertIn("random characters", r.user_message)

    def test_long_unspaced_random_letters_are_still_blocked(self) -> None:
        import random

        rng = random.Random(7)
        mash = "".join(rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(500))
        r = apply_input_sanitizer_lane(mash, False)
        self.assertEqual(r.action, "block")


if __name__ == "__main__":
    unittest.main()
