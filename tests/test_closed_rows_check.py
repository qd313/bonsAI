"""
Title: Closed rows check tests

Purpose: Pins the three parts of scripts/closed_rows_check.py that decide what counts: reading row
ids out of prose with their ranges expanded, keeping only closing entries, and dropping an id whose
own sentence says it is still owed.

Used for: `npm run test:py`, and `python scripts/verify.py` whenever a Python file changes.

Solves: The check's value rests on two real misses it catches (the ban lookup's four boxes on
2026-09-23, the settings card's rows 06 and 07 on 2026-09-16). Both were written as ranges ("VAC-03
to 06", "**SETTINGS-CARD-01** through **07**"), so a regex change that stops expanding ranges would
quietly stop catching either.

Does not: Run git or read the real documents; the replay against real commits is recorded in
docs/audit/planning-folder-review-2026-09-24.md.
"""

import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent / "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import closed_rows_check as crc  # noqa: E402 -- needs the path line above


def ids(text):
    return [rid for rid, _ in crc.expand_ids(text)]


class ExpandIdsTests(unittest.TestCase):
    def test_a_single_id(self):
        self.assertEqual(ids("Row **KB-CANCEL-01** passed"), ["KB-CANCEL-01"])

    def test_a_range_written_with_to(self):
        self.assertEqual(ids("Left: **VAC-03 to 06**"), ["VAC-03", "VAC-04", "VAC-05", "VAC-06"])

    def test_a_range_written_with_bold_through(self):
        self.assertEqual(
            ids("Rows **SETTINGS-CARD-05** through **07**."),
            ["SETTINGS-CARD-05", "SETTINGS-CARD-06", "SETTINGS-CARD-07"],
        )

    def test_a_range_written_with_an_ellipsis(self):
        self.assertEqual(ids("SOFT-PREDICT-01…03"), ["SOFT-PREDICT-01", "SOFT-PREDICT-02", "SOFT-PREDICT-03"])

    def test_a_range_naming_the_prefix_twice(self):
        self.assertEqual(ids("**REASONING-01** through **REASONING-03**"), ["REASONING-01", "REASONING-02", "REASONING-03"])

    def test_a_letter_suffix_is_kept(self):
        self.assertEqual(ids("CHAT-SLOTS-V3-14c passed"), ["CHAT-SLOTS-V3-14c"])


class IdsClosedByTests(unittest.TestCase):
    def test_a_closing_entry_names_its_rows(self):
        lines = ["- ★ **Ban lookup** — **DONE 2026-09-23:** VAC-03 to 06 passed."]
        self.assertEqual(sorted(crc.ids_closed_by(lines, [0], "x.md")), ["VAC-03", "VAC-04", "VAC-05", "VAC-06"])

    def test_an_entry_that_closes_nothing_names_nothing(self):
        lines = ["- ★ **Ban lookup** — **VERIFY.** Rows VAC-03 to 06 wait on the key."]
        self.assertEqual(crc.ids_closed_by(lines, [0], "x.md"), {})

    def test_a_row_its_own_sentence_calls_owed_is_dropped(self):
        lines = ["- ★ **Card** — **DONE 2026-09-16.** Rows CARD-01 passed. CARD-02 is still owed on the Deck."]
        self.assertEqual(list(crc.ids_closed_by(lines, [0], "x.md")), ["CARD-01"])

    def test_the_whole_list_item_is_read_from_any_of_its_lines(self):
        lines = [
            "- ★ **Card** — **DONE 2026-09-16.** The card floats.",
            "  Rows **CARD-01** through **02**.",
        ]
        self.assertEqual(sorted(crc.ids_closed_by(lines, [1], "x.md")), ["CARD-01", "CARD-02"])


if __name__ == "__main__":
    unittest.main()
