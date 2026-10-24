#!/usr/bin/env python3
"""Title: Docs split check

Purpose: Prove that splitting one big markdown file into a small "current" file plus one or
    more archive files lost nothing, by counting headings, list/table rows and non-blank lines
    in the original against the replacement files, and by checking that every non-blank line
    from the original still appears somewhere in the replacements.
Used for: `python scripts/docs_split_check.py --before <git ref>:<path> --after <path> [<path>
    ...]`, run once per split (docs/roadmap.md and docs/testing.md each get their own call)
    before a lane commits a documentation split. The "before" side is read straight out of git
    so a lane cannot fudge the comparison by quietly editing its own before-copy first.
Solves: A hand-checked "did I copy everything across" review misses lines in a document this
    size. This turns that review into a pass/fail a lane runs before every commit, and a failure
    prints exactly which lines did not make it across.
Does not: Judge whether a line landed in the right file (open vs. archived) — only whether it
    survives somewhere in the replacement set. Does not fix a bad split; a failing run means the
    split needs redoing, not the checker.
"""

from __future__ import annotations

import argparse
import collections
import re
import subprocess
import sys
from pathlib import Path

HEADING_RE = re.compile(r"^#{1,6}\s")
LIST_ROW_RE = re.compile(r"^\s*([-*+]|\d+[.)])\s+")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def read_before(ref_and_path: str) -> list[str]:
    """Read a file's content as it exists at a git ref, so it cannot be edited to match."""
    if ":" not in ref_and_path:
        raise SystemExit(
            f"--before must look like <git ref>:<path>, got {ref_and_path!r}"
        )
    ref, path = ref_and_path.split(":", 1)
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"],
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"git show {ref_and_path} failed:\n{result.stderr.decode('utf-8', 'replace')}"
        )
    text = result.stdout.decode("utf-8", "replace")
    return _normalize_newlines(text).split("\n")


def read_after(path: str) -> list[str]:
    text = Path(path).read_text(encoding="utf-8")
    return _normalize_newlines(text).split("\n")


def counts(lines: list[str]) -> dict[str, int]:
    non_blank = [line for line in lines if line.strip()]
    list_or_table_rows = sum(
        1
        for line in lines
        if LIST_ROW_RE.match(line) or TABLE_ROW_RE.match(line)
    )
    return {
        "headings": sum(1 for line in lines if HEADING_RE.match(line)),
        "list_rows": list_or_table_rows,
        "non_blank_lines": len(non_blank),
    }


def format_counts(label: str, sources: str, c: dict[str, int]) -> str:
    return (
        f"{label}  {sources}\n"
        f"  headings={c['headings']}  list/table rows={c['list_rows']}  "
        f"non-blank lines={c['non_blank_lines']}"
    )


def find_missing(
    before_lines: list[str], after_lines: list[str]
) -> list[tuple[int, str]]:
    """Every non-blank before-line must occur at least as often somewhere in after.

    Extra lines in `after` (a new pointer paragraph, a repeated table header needed to
    keep an archive file a valid standalone table) are fine and are not flagged — only a
    shortfall, meaning a line from the original that did not make it across, is a failure.
    """
    before_multiset = collections.Counter(
        line for line in before_lines if line.strip()
    )
    after_multiset = collections.Counter(line for line in after_lines if line.strip())
    missing = []
    for line, before_n in before_multiset.items():
        after_n = after_multiset.get(line, 0)
        if after_n < before_n:
            missing.append((before_n - after_n, line))
    return missing


def main(argv: list[str] | None = None) -> int:
    # A console codepage other than UTF-8 (the Windows default) would otherwise crash this
    # script the moment a moved line contains an em dash, arrow or curly quote — printing the
    # proof should never be the thing that fails.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(
        description=(
            "Prove a documentation split lost no line: --before is read out of git, "
            "--after is the one or more files that replace it."
        )
    )
    parser.add_argument(
        "--before", required=True, help="<git ref>:<path>, e.g. HEAD:docs/roadmap.md"
    )
    parser.add_argument(
        "--after",
        required=True,
        nargs="+",
        help="one or more files that together replace --before",
    )
    args = parser.parse_args(argv)

    before_lines = read_before(args.before)
    after_lines_combined: list[str] = []
    for path in args.after:
        after_lines_combined.extend(read_after(path))

    before_counts = counts(before_lines)
    after_counts = counts(after_lines_combined)

    print(format_counts("BEFORE", args.before, before_counts))
    print(format_counts("AFTER ", " + ".join(args.after), after_counts))

    missing = find_missing(before_lines, after_lines_combined)
    if missing:
        print(f"\nMISSING: {len(missing)} distinct line(s) not fully accounted for:")
        for shortfall, line in missing:
            preview = line if len(line) <= 200 else line[:200] + "…"
            print(f"  x{shortfall}  {preview}")
        return 1

    print(
        "\nOK: every non-blank line from the original is accounted for "
        "in the replacement file(s)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
