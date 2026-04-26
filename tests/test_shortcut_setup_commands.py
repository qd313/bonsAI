"""Unit tests for shortcut-setup magic keywords (Deck / Stadia guidance)."""

import unittest

from backend.services.shortcut_setup_commands import (
    COMMAND_SHORTCUT_DECK,
    COMMAND_SHORTCUT_STADIA,
    classify_shortcut_setup_command,
    normalize_command_input_with_slash,
    response_message_for_shortcut,
)


class ShortcutSetupCommandsTests(unittest.TestCase):
    def test_classify_deck_stadia(self) -> None:
        self.assertEqual(classify_shortcut_setup_command(COMMAND_SHORTCUT_DECK), "deck")
        self.assertEqual(classify_shortcut_setup_command("  " + COMMAND_SHORTCUT_DECK.upper()), "deck")
        self.assertEqual(classify_shortcut_setup_command("/" + COMMAND_SHORTCUT_DECK), "deck")
        self.assertEqual(classify_shortcut_setup_command(" /" + COMMAND_SHORTCUT_DECK + "  "), "deck")
        self.assertEqual(classify_shortcut_setup_command(COMMAND_SHORTCUT_STADIA), "stadia")
        self.assertIsNone(classify_shortcut_setup_command("not a command"))
        self.assertIsNone(classify_shortcut_setup_command(COMMAND_SHORTCUT_DECK + " extra"))

    def test_normalize_slash(self) -> None:
        self.assertEqual(normalize_command_input_with_slash("/Foo"), "foo")
        self.assertEqual(normalize_command_input_with_slash("  /Foo  "), "foo")

    def test_response_messages_differ(self) -> None:
        d = response_message_for_shortcut("deck")
        s = response_message_for_shortcut("stadia")
        self.assertIn("R4", d)
        self.assertIn("Guide", d)
        self.assertIn("Stadia", s)
        self.assertIn("spare", s.lower())
        self.assertIn("troubleshooting", d.lower())
        self.assertIn("troubleshooting", s.lower())


if __name__ == "__main__":
    unittest.main()
