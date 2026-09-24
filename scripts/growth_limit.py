#!/usr/bin/env python3
"""Title: Growth limit

Purpose: Stop a big app file from getting bigger. Any file that was already over 800 lines of
    code the last time this was recorded keeps that size as its own ceiling; every other app file
    may not cross 800. Comments, blank lines and docstrings never count towards either number --
    the same rule scripts/ratchet.py's "files over 400 lines" number already uses.

Used for: `python scripts/growth_limit.py` (add `--json` for one machine-readable object instead
    of plain lines), run from `scripts/verify.py --quick` before every commit, the same way the
    header check and the ratchet check run. `python scripts/growth_limit.py --record` writes
    today's sizes into scripts/growth_limits.json -- run by hand, once, after a batch of splitting
    is finished and the new, smaller sizes are meant to become the limits going forward.

Solves: Splitting a long file only helps once. Nothing else in the repo stops the same file, or a
    different one, growing straight back past 800 lines the next time a feature lands on top of
    it -- this makes that a failing check instead of something nobody notices until the file is
    huge again.

Does not: Split anything itself, or decide a crossed limit is wrong -- a deliberate size increase
    is allowed, it just has to be a decision: review the growth, then run `--record` again so the
    new size becomes the new limit. Does not touch files under the 800-line general cap; a file
    can grow freely up to that point with no entry needed in scripts/growth_limits.json at all.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from code_line_count import code_line_count  # noqa: E402 -- needs the path line above
from ratchet import be_app_files, fe_app_files, _to_posix  # noqa: E402 -- same file list as "files over 400"

ROOT = Path(__file__).resolve().parent.parent
LIMITS_JSON = Path(__file__).resolve().parent / "growth_limits.json"

GENERAL_CAP = 800


def app_files() -> list[Path]:
    """Every file this check watches: the same list scripts/ratchet.py's "files over 400 lines"
    metric measures -- src/**/*.ts(x) excluding tests, plus main.py and py_modules/**/*.py."""
    return sorted(fe_app_files() + be_app_files(), key=lambda p: _to_posix(p))


def measure() -> dict[str, int]:
    """Every watched file's current code-line count, keyed by its posix path from the repo root."""
    return {_to_posix(f): code_line_count(f) for f in app_files()}


# --------------------------------------------------------------------------- #
# Pure logic -- no file I/O, easy to test on made-up numbers
# --------------------------------------------------------------------------- #


def compute_limits(sizes: dict[str, int]) -> dict[str, int]:
    """Which files get their own recorded limit: every one already over the general cap.

    Anything at or under the general cap needs no entry -- the general cap covers it."""
    return {path: loc for path, loc in sizes.items() if loc > GENERAL_CAP}


def find_violations(sizes: dict[str, int], limits: dict[str, int]) -> list[tuple[str, int, int]]:
    """(path, current size, its cap) for every file currently over its cap.

    A listed file's cap is its recorded limit; an unlisted file's cap is the general 800.
    One formula covers "a listed file went over its recorded limit" and "an unlisted file
    crossed 800" -- an unlisted file's cap just happens to be 800."""
    violations = []
    for path, loc in sorted(sizes.items()):
        cap = limits.get(path, GENERAL_CAP)
        if loc > cap:
            violations.append((path, loc, cap))
    return violations


def _violation_message(path: str, loc: int, cap: int) -> str:
    return (
        f"{path} has grown to {loc} lines of code, over its limit of {cap}. Move the new code "
        f"into a new file, or raise this file's limit on purpose after a review by running "
        f"`python scripts/growth_limit.py --record` again."
    )


# --------------------------------------------------------------------------- #
# growth_limits.json load/save
# --------------------------------------------------------------------------- #


def load_limits() -> dict[str, int]:
    if not LIMITS_JSON.exists():
        return {}
    try:
        data = json.loads(LIMITS_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    raw = data.get("limits") if isinstance(data, dict) else None
    if not isinstance(raw, dict):
        return {}
    return {
        path: value
        for path, value in raw.items()
        if isinstance(path, str) and isinstance(value, int)
    }


def save_limits(limits: dict[str, int]) -> None:
    data = {
        "note": (
            "Files whose code line count (comments, blank lines and docstrings excluded -- see "
            "scripts/code_line_count.py) was already over 800 the last time this was recorded. A "
            "file listed here may not go over the number next to it. Any file not listed here may "
            "not go over 800. To grow a listed file on purpose: review the growth, then run "
            "`python scripts/growth_limit.py --record` again so the new size becomes the new "
            "limit. Written by scripts/growth_limit.py --record -- do not hand-edit."
        ),
        "recorded_at": datetime.date.today().isoformat(),
        "limits": dict(sorted(limits.items())),
    }
    # newline="\n" always, matching scripts/ratchet.py's save: without it Python's text-mode
    # write turns this into CRLF on Windows, which then shows every line as changed on Linux.
    with open(LIMITS_JSON, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(data, indent=2) + "\n")


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #


def cmd_record() -> int:
    sizes = measure()
    limits = compute_limits(sizes)
    save_limits(limits)
    rel = LIMITS_JSON.relative_to(ROOT).as_posix()
    print(f"Recorded {len(limits)} file(s) over {GENERAL_CAP} lines of code into {rel}.")
    for path in sorted(limits):
        print(f"  {path}: {limits[path]}")
    return 0


def cmd_check(as_json: bool) -> int:
    limits = load_limits()
    sizes = measure()
    violations = find_violations(sizes, limits)
    messages = [_violation_message(path, loc, cap) for path, loc, cap in violations]

    if as_json:
        print(json.dumps({"violations": messages, "checked": len(sizes)}))
    else:
        for line in messages[:40]:
            print(line)
        print(f"{len(messages)} file(s) over their limit, {len(sizes)} checked")
    return 1 if violations else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail if an app file has grown past its recorded size limit (or past 800 "
        "lines of code if it has no recorded limit)."
    )
    parser.add_argument("--json", action="store_true", help="print one JSON object instead of plain lines")
    parser.add_argument(
        "--record",
        action="store_true",
        help="write today's sizes (every file over 800 lines of code) into scripts/growth_limits.json",
    )
    args = parser.parse_args(argv)

    if args.record:
        return cmd_record()
    return cmd_check(args.json)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
