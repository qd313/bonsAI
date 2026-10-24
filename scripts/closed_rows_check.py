"""
Title: Closed rows check

Purpose: Fails a change that closes a Deck test row in one document while the same row is still
open in the live test lists. A check's status is written in up to four places: the roadmap's Done
list, its archive files, the testing.md table and the tick boxes in testing-manual.md. Closing it
in one place and forgetting another has already happened, and nothing noticed.

Used for: `python scripts/verify.py --quick` runs it on every commit. By hand:
`python scripts/closed_rows_check.py` checks the uncommitted change against HEAD;
`--commit <sha>` checks one past commit against its parent; `--json` prints one object.

Solves: On 2026-09-23 the Steam ban lookup's four checks passed and were closed on the roadmap and
in testing.md, but their four tick boxes in testing-manual.md stayed empty. On 2026-09-16 the
settings card went to Done naming rows 01 through 07 while rows 06 and 07 were still "Open — owed"
in testing.md. Both reached the archive unnoticed. Replaying this check over those two commits
flags both.

Does not: Read the whole history, judge whether a check really passed, or edit anything. It only
looks at lines this change adds to the closed lists, and only reports a row that the same change
leaves open. A row named in a closing entry only as still owed ("still owed: X") is ignored.

How it works:
    1. Collect the lines the change adds to the closed lists: the Done section of the roadmap and
       the archive files for finished work and closed test rows.
    2. For each added line, take the whole entry it belongs to (a list item or table row). Keep the
       entry only if it reads as closing something (DONE, PASS, passed, Verified, Closed,
       confirmed on the Deck).
    3. Pull the row IDs out of it, expanding ranges such as "VAC-03 to 06", "SOFT-PREDICT-01…05"
       and "**SETTINGS-CARD-01** through **07**". Drop an ID whose own sentence says it is owed,
       open, blocked or not run.
    4. Look each ID up in the live lists after the change: an unticked box in testing-manual.md, or
       a testing.md table row whose status starts with Open, Partial or Re-open. Report each hit
       with both line numbers, and exit 1 if there is any.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CLOSED_FILES = (
    "docs/roadmap.md",
    "docs/archive/roadmap-done-v0.5.0.md",
    "docs/archive/roadmap-completed.md",
    "docs/archive/roadmap-bugs-fixed.md",
    "docs/archive/testing-closed-2026.md",
    "docs/archive/testing-manual-closed-2026.md",
)
ROADMAP_DONE_HEADING = re.compile(r"^## Done\b")

CLOSING = re.compile(r"\bDONE\b|\bPASS(?:ED)?\b|\bpassed\b|\bVerified\b|\bClosed\b|confirmed on the Deck", re.I)
OWED = re.compile(
    r"\bowed\b|\bstill open\b|\bnot run\b|\bnever run\b|\bnot yet\b|\bblocked\b|\bOpen —|\bFAIL", re.I
)

ID = r"[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{2}[a-z]?"
RANGE = re.compile(
    rf"\**(?P<id>{ID})\**(?:\s*(?:…|\.\.\.|–|\bto\b|\bthrough\b)\s*\**(?:(?P<prefix>[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)-)?(?P<end>\d{{2}})\b\**)?"
)


def expand_ids(text: str) -> list[tuple[str, int]]:
    """Return (row id, offset) for every id in the text, with ranges expanded."""
    found: list[tuple[str, int]] = []
    for m in RANGE.finditer(text):
        first = m.group("id")
        found.append((first, m.start()))
        end = m.group("end")
        if not end:
            continue
        base, start_num = first.rsplit("-", 1)
        start = int(re.match(r"\d+", start_num).group())
        stop = int(end)
        if m.group("prefix") and m.group("prefix") != base:
            continue
        if stop <= start or stop - start > 20:
            continue
        for n in range(start + 1, stop + 1):
            found.append((f"{base}-{n:02d}", m.start()))
    return found


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True
    ).stdout


def added_lines(base: str, target: str | None, path: str) -> list[int]:
    """New-file line numbers of the lines the change adds to one file."""
    args = ["diff", "-U0", base] + ([target] if target else []) + ["--", path]
    out = git(*args)
    numbers: list[int] = []
    for m in re.finditer(r"^@@ -\S+ \+(\d+)(?:,(\d+))? @@", out, re.M):
        start, count = int(m.group(1)), int(m.group(2) or "1")
        numbers.extend(range(start, start + count))
    return numbers


def removed_text(base: str, target: str | None) -> set[str]:
    """Every line the change removes from any tracked doc, stripped: an added line found here was moved,
    not newly written, so it closes nothing new."""
    args = ["diff", "-U0", base] + ([target] if target else []) + ["--", "docs", "CHANGELOG.md"]
    out = git(*args)
    return {
        line[1:].strip()
        for line in out.split("\n")
        if line.startswith("-") and not line.startswith("---") and line[1:].strip()
    }


def read_after(target: str | None, path: str) -> list[str]:
    if target:
        try:
            return git("show", f"{target}:{path}").split("\n")
        except subprocess.CalledProcessError:
            return []
    p = ROOT / path
    return p.read_text(encoding="utf-8").split("\n") if p.exists() else []


def entry_around(lines: list[str], index: int) -> tuple[int, str]:
    """The list item or table row that holds lines[index], as (first line index, text)."""
    line = lines[index]
    if line.lstrip().startswith("|"):
        return index, line
    start = index
    while start > 0 and not re.match(r"^\s*(?:- |\d+\. |#)", lines[start]) and lines[start].strip():
        start -= 1
    end = index
    while end + 1 < len(lines) and lines[end + 1].strip() and not re.match(r"^\s*(?:- |\d+\. |#)", lines[end + 1]):
        end += 1
    return start, " ".join(l.strip() for l in lines[start : end + 1])


def sentence_at(text: str, offset: int) -> str:
    left = max(text.rfind(". ", 0, offset), text.rfind(": ", 0, offset), text.rfind("; ", 0, offset))
    right_candidates = [i for i in (text.find(". ", offset), text.find("; ", offset)) if i != -1]
    right = min(right_candidates) if right_candidates else len(text)
    return text[left + 1 : right]


def done_start(path: str, lines: list[str]) -> int | None:
    """Index where closed entries begin: the Done heading in the roadmap, the top of an archive file."""
    if path != "docs/roadmap.md":
        return 0
    heads = [i for i, l in enumerate(lines) if ROADMAP_DONE_HEADING.match(l)]
    return heads[0] if heads else None


def ids_closed_by(lines: list[str], indexes: list[int], path: str) -> dict[str, str]:
    """Row id -> 'file:line' for ids that the closing entries holding these lines name as closed."""
    result: dict[str, str] = {}
    seen_entries: set[int] = set()
    for i in indexes:
        start, text = entry_around(lines, i)
        if start in seen_entries or not CLOSING.search(text):
            continue
        seen_entries.add(start)
        for rid, offset in expand_ids(text):
            if OWED.search(sentence_at(text, offset)):
                continue
            result.setdefault(rid, f"{path}:{start + 1}")
    return result


def read_before(base: str, path: str) -> list[str]:
    try:
        return git("show", f"{base}:{path}").split("\n")
    except subprocess.CalledProcessError:
        return []


def closed_ids(base: str, target: str | None) -> dict[str, str]:
    """Row id -> 'file:line' for every id this change closes for the first time.

    An id some closing entry already named before the change is left out: editing that entry, or
    moving it between files, repeats an old claim rather than making a new one."""
    result: dict[str, str] = {}
    already: set[str] = set()
    moved = removed_text(base, target)
    for path in CLOSED_FILES:
        before = read_before(base, path)
        start = done_start(path, before)
        if start is not None:
            already.update(ids_closed_by(before, list(range(start, len(before))), path))
    for path in CLOSED_FILES:
        numbers = added_lines(base, target, path)
        if not numbers:
            continue
        lines = read_after(target, path)
        start = done_start(path, lines)
        if start is None:
            continue
        indexes = [
            n - 1 for n in numbers if start <= n - 1 < len(lines) and lines[n - 1].strip() not in moved
        ]
        for rid, where in ids_closed_by(lines, indexes, path).items():
            if rid not in already:
                result.setdefault(rid, where)
    return result


def open_rows(target: str | None) -> dict[str, list[str]]:
    """Row id -> ['file:line', ...] for rows still open in the live lists.

    Only a line that names exactly one row counts. A summary line covering a range ("REASONING-01
    through REASONING-07", a testing.md row for "CHAT-SLOTS-V2-01…06") stays open while any one of
    its checks is owed, so a closed sub-check inside it is not a contradiction."""
    found: dict[str, list[str]] = {}
    manual = read_after(target, "docs/testing-manual.md")
    for i, line in enumerate(manual):
        if re.match(r"^\s*- \[ \]", line):
            ids = {rid for rid, _ in expand_ids(line[:240])}
            if len(ids) == 1:
                found.setdefault(ids.pop(), []).append(f"docs/testing-manual.md:{i + 1}")
    testing = read_after(target, "docs/testing.md")
    for i, line in enumerate(testing):
        cells = [c.strip() for c in line.split("|")]
        if len(cells) < 5 or not line.lstrip().startswith("|"):
            continue
        status = cells[3].strip("* ")
        if re.match(r"(Open|Partial|Re-open)\b", status):
            ids = {rid for rid, _ in expand_ids(cells[2])}
            if len(ids) == 1:
                found.setdefault(ids.pop(), []).append(f"docs/testing.md:{i + 1}")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[1])
    parser.add_argument("--commit", help="check this commit against its parent instead of the working tree")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    base, target = (f"{args.commit}~1", args.commit) if args.commit else ("HEAD", None)
    closed = closed_ids(base, target)
    still_open = open_rows(target)
    problems = [
        f"{rid} is closed at {where} but still open at {', '.join(still_open[rid])}"
        for rid, where in sorted(closed.items())
        if rid in still_open
    ]
    if args.json:
        print(json.dumps({"ok": not problems, "problems": problems}))
    else:
        for p in problems:
            print(p)
        if problems:
            print(
                "Close the row in the live list too (tick and move the box, or set the testing.md status),"
                " or, if part of it is still owed, say so in the closing entry (\"still owed\")."
            )
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
