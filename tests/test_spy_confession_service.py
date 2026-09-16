"""Tests for the Spy's closing confession tag: parsing it back out of a finished reply."""

import unittest

from backend.services.spy_confession_service import (
    SPY_LIES_TAG_CLOSE,
    SPY_LIES_TAG_OPEN,
    parse_spy_lies_tag,
)


class ParseSpyLiesTagTests(unittest.TestCase):
    def test_reply_with_no_tag_is_returned_unchanged(self):
        text = "Just drop your TDP to 8 watts, that always helps."
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, text)
        self.assertEqual(lies, [])

    def test_normal_tag_is_stripped_and_lies_are_split_by_line(self):
        text = (
            "Just drop your TDP to 8 watts, that always helps.\n\n"
            f"{SPY_LIES_TAG_OPEN}\n"
            "Said 8 watts always helps\n"
            "Claimed this game needs no cooldown\n"
            f"{SPY_LIES_TAG_CLOSE}"
        )
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Just drop your TDP to 8 watts, that always helps.")
        self.assertEqual(
            lies,
            ["Said 8 watts always helps", "Claimed this game needs no cooldown"],
        )

    def test_tag_with_no_lines_strips_the_tag_and_returns_no_lies(self):
        text = f"Honest answer this time.\n\n{SPY_LIES_TAG_OPEN}\n{SPY_LIES_TAG_CLOSE}"
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Honest answer this time.")
        self.assertEqual(lies, [])

    def test_unclosed_tag_is_left_exactly_alone(self):
        text = f"Still writing the reply {SPY_LIES_TAG_OPEN}\nSaid something wrong"
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, text)
        self.assertEqual(lies, [])

    def test_empty_text_returns_unchanged(self):
        self.assertEqual(parse_spy_lies_tag(""), ("", []))

    def test_blank_lines_between_lies_are_dropped(self):
        text = (
            f"{SPY_LIES_TAG_OPEN}\n"
            "First lie\n"
            "\n"
            "Second lie\n"
            f"{SPY_LIES_TAG_CLOSE}"
        )
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "")
        self.assertEqual(lies, ["First lie", "Second lie"])


if __name__ == "__main__":
    unittest.main()
