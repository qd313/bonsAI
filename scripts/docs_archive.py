#!/usr/bin/env python3
"""Title: docs_archive

Purpose: read docs/archive/INDEX.md and tell a person which archived files have passed
         their delete-after date.
Used for: plan 51 (refactor round two), the archiving pass that moved finished, replaced,
          and abandoned write-ups and scripts into docs/archive/ and scripts/archive/ on
          2026-09-13. Only the abandoned ones carry a delete-after date; this script is how
          someone checks, later, whether that date has arrived.
Solves: nobody wants to reread the whole index by eye every so often just to see if a date
         has come and gone. This does that one check and prints a short list.
Does not: delete a file, move a file, or change the index in any way. It only prints. Acting
          on what it prints -- actually removing a file -- is a decision for a person to make
          and carry out by hand.

Commands:
  docs_archive.py list-overdue [--index PATH] [--as-of YYYY-MM-DD]
      Print every row in the index whose delete-after date is today or earlier.
      --index defaults to docs/archive/INDEX.md next to the repo root this script sits in.
      --as-of defaults to today; pass a date to check against a different day.
"""
import argparse
import datetime
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INDEX = os.path.join(REPO_ROOT, "docs", "archive", "INDEX.md")

# Matches one markdown table row: | File | Reason | Archived | Delete after | Why |
ROW_PATTERN = re.compile(
    r"^\|\s*(?P<file>[^|]+?)\s*\|\s*(?P<reason>[^|]+?)\s*\|\s*(?P<archived>[^|]+?)\s*\|"
    r"\s*(?P<delete_after>[^|]+?)\s*\|\s*(?P<why>[^|]+?)\s*\|\s*$"
)

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_date(text):
    """Return a date object for a YYYY-MM-DD string, or None if text is not one."""
    text = text.strip()
    if not DATE_PATTERN.match(text):
        return None
    return datetime.datetime.strptime(text, "%Y-%m-%d").date()


def read_rows(index_path):
    """Read every file row out of the archive index table.

    Returns a list of dicts with keys: file, reason, archived, delete_after, why.
    delete_after is a date object, or None when the row has no delete date (a dash).
    Header and separator rows, and any row whose first cell is not a real file name,
    are skipped.
    """
    rows = []
    with open(index_path, "r", encoding="utf-8") as handle:
        for line in handle:
            match = ROW_PATTERN.match(line.rstrip("\n"))
            if not match:
                continue
            file_cell = match.group("file").strip()
            reason_cell = match.group("reason").strip()
            if file_cell.lower() == "file" or set(file_cell) <= {"-"}:
                continue  # header row or separator row
            if reason_cell.lower() not in ("finished", "replaced", "abandoned"):
                continue  # not one of this pass's data rows
            rows.append(
                {
                    "file": file_cell,
                    "reason": reason_cell,
                    "archived": match.group("archived").strip(),
                    "delete_after": parse_date(match.group("delete_after")),
                    "why": match.group("why").strip(),
                }
            )
    return rows


def list_overdue(index_path, as_of):
    if not os.path.isfile(index_path):
        print("No index found at {}.".format(index_path))
        return 1

    rows = read_rows(index_path)
    overdue = [row for row in rows if row["delete_after"] is not None and row["delete_after"] <= as_of]

    if not overdue:
        print("Nothing is past its delete-after date as of {}.".format(as_of.isoformat()))
        return 0

    print("These have passed their delete-after date as of {}:".format(as_of.isoformat()))
    print("Nothing has been deleted -- this is only a list for a person to act on.")
    print("")
    for row in overdue:
        print("{}  (delete after {})".format(row["file"], row["delete_after"].isoformat()))
        print("  {}".format(row["why"]))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check the archive index for overdue files.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    overdue_parser = subparsers.add_parser(
        "list-overdue", help="print every archived file whose delete-after date has passed"
    )
    overdue_parser.add_argument(
        "--index",
        default=DEFAULT_INDEX,
        help="path to the archive index (default: docs/archive/INDEX.md)",
    )
    overdue_parser.add_argument(
        "--as-of",
        default=None,
        help="check against this date (YYYY-MM-DD) instead of today",
    )

    args = parser.parse_args(argv)

    if args.command == "list-overdue":
        if args.as_of:
            as_of = parse_date(args.as_of)
            if as_of is None:
                print("--as-of must look like YYYY-MM-DD, got: {}".format(args.as_of))
                return 2
        else:
            as_of = datetime.date.today()
        return list_overdue(args.index, as_of)

    return 2


if __name__ == "__main__":
    sys.exit(main())
