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

    # Plan 77 (SPY-REVEAL-01): the model on the Deck wrote the closing tag without its ">" and the
    # whole block showed as raw text. The reader now takes a closer that is cut short at the very
    # end of the reply, and a closer that never came at all.
    def test_closing_tag_missing_its_bracket_at_the_very_end_still_counts(self):
        text = (
            "Just drop your TDP to 8 watts.\n\n"
            f"{SPY_LIES_TAG_OPEN} first lie about TDP\nsecond lie about cooldown\n"
            "</bonsai-spy-lies"
        )
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Just drop your TDP to 8 watts.")
        self.assertEqual(lies, ["first lie about TDP", "second lie about cooldown"])

    def test_closing_tag_missing_its_bracket_with_trailing_whitespace_still_counts(self):
        text = f"Answer.\n{SPY_LIES_TAG_OPEN}\nOne lie\n</bonsai-spy-lies \n"
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Answer.")
        self.assertEqual(lies, ["One lie"])

    def test_closing_tag_cut_off_part_way_through_its_name_still_counts(self):
        text = f"Answer.\n{SPY_LIES_TAG_OPEN}\nOne lie\n</bonsai-spy-l"
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Answer.")
        self.assertEqual(lies, ["One lie"])

    def test_no_closing_tag_at_all_takes_everything_from_the_opener_to_the_end(self):
        text = f"Answer.\n\n{SPY_LIES_TAG_OPEN}\nSaid something wrong\nSaid another thing wrong"
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Answer.")
        self.assertEqual(lies, ["Said something wrong", "Said another thing wrong"])

    def test_a_bracketless_closer_in_the_middle_of_text_is_not_a_closer(self):
        text = f"{SPY_LIES_TAG_OPEN}\nOne lie </bonsai-spy-lies but the reply goes on\nnot a lie line"
        clean, lies = parse_spy_lies_tag(text)
        # No real closer, so it is the unclosed case: everything after the opener is the block.
        self.assertEqual(clean, "")
        self.assertEqual(
            lies, ["One lie </bonsai-spy-lies but the reply goes on", "not a lie line"]
        )

    def test_well_formed_tag_with_text_after_it_still_keeps_that_text(self):
        text = f"Before.\n{SPY_LIES_TAG_OPEN}\nOne lie\n{SPY_LIES_TAG_CLOSE}\nAfter."
        clean, lies = parse_spy_lies_tag(text)
        self.assertEqual(clean, "Before.\n\nAfter.")
        self.assertEqual(lies, ["One lie"])

    def test_opener_alone_with_nothing_after_it_is_stripped_with_no_lies(self):
        clean, lies = parse_spy_lies_tag(f"Answer.\n{SPY_LIES_TAG_OPEN}")
        self.assertEqual(clean, "Answer.")
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
