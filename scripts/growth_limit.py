#!/usr/bin/env python3
"""Title: Growth limit

Purpose: Stop a big app file from getting bigger, without letting a raised limit happen by
    accident. Any file that was already over 800 lines of code the last time this was recorded
    keeps that size as its own ceiling; every other app file may not cross 800. Comments, blank
    lines and docstrings never count towards either number -- the same rule
    scripts/ratchet.py's "files over 400 lines" number already uses.

Used for: `python scripts/growth_limit.py` (add `--json` for one machine-readable object instead
    of plain lines), run from `scripts/verify.py --quick` before every commit, the same way the
    header check and the ratchet check run. `python scripts/growth_limit.py --record` re-scans
    every watched file and updates scripts/growth_limits.json: it adds a file that just crossed
    800, lowers a limit for a file that has shrunk, and drops a file that is back at or under 800
    -- but it never raises a limit for a file that has grown past its recorded number; it prints
    that it refused and leaves that entry alone. Raising one file's limit is its own, separate,
    deliberate step: `python scripts/growth_limit.py --raise <path> --reason "<why>"`.

Solves: Splitting a long file only helps once. Nothing else in the repo stops the same file, or a
    different one, growing straight back past 800 lines the next time a feature lands on top of
    it. The first version of this check told a failing file's committer to fix it by running
    `--record` again -- which silently re-recorded every file at today's size, so a file that had
    simply grown got its limit raised without anyone deciding that on purpose. A hard limit that
    can raise itself is not a hard limit.

Does not: Split anything itself. Does not touch files at or under the 800-line general cap; a
    file can grow freely up to that point with no entry needed in scripts/growth_limits.json at
    all. Does not judge whether a reason given to `--raise` is a good one -- it only requires that
    one was typed, and records it next to the number so a reviewer can see it.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from dataclasses import dataclass, field
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


def _normalize_path_arg(path_arg: str) -> str:
    """Turn whatever a person typed after --raise into the posix, repo-root-relative form
    `measure()` uses as a key, whether they typed it with backslashes, forward slashes, or as a
    full path."""
    p = Path(path_arg)
    if p.is_absolute():
        try:
            p = p.relative_to(ROOT)
        except ValueError:
            return p.as_posix()
    return p.as_posix()


# --------------------------------------------------------------------------- #
# Pure logic -- no file I/O, easy to test on made-up numbers
# --------------------------------------------------------------------------- #


@dataclass
class RecordResult:
    """What `--record` decided to do with every watched file's current size."""

    limits: dict[str, dict]
    added: list[str] = field(default_factory=list)
    lowered: list[tuple[str, int, int]] = field(default_factory=list)  # path, old, new
    dropped: list[str] = field(default_factory=list)
    refused: list[tuple[str, int, int]] = field(default_factory=list)  # path, current, recorded


def apply_record(sizes: dict[str, int], existing: dict[str, dict]) -> RecordResult:
    """Work out the new growth_limits.json contents from today's sizes and what was recorded
    before, without raising anything.

    A file already listed that has grown past its own recorded limit is left exactly as it was --
    that is the whole point of `--record` never raising a limit on its own. A file listed that has
    shrunk gets its limit lowered to the new, smaller size; a raise's reason belonged to the old,
    bigger number, so it is dropped along with the number it was for -- if the file grows again it
    has to be raised again, on purpose, with a fresh reason. A file that shrinks back to 800 or
    under is dropped from the list entirely; the general cap already covers it. A newly-over-800
    file that was not listed before is added at its current size."""
    result = RecordResult(limits={})
    for path, loc in sizes.items():
        entry = existing.get(path)
        if entry is None:
            if loc > GENERAL_CAP:
                result.limits[path] = {"limit": loc}
                result.added.append(path)
            continue

        recorded = entry["limit"]
        if loc > recorded:
            result.limits[path] = entry
            result.refused.append((path, loc, recorded))
        elif loc <= GENERAL_CAP:
            result.dropped.append(path)
        elif loc < recorded:
            result.limits[path] = {"limit": loc}
            result.lowered.append((path, recorded, loc))
        else:
            result.limits[path] = entry
    return result


def find_violations(
    sizes: dict[str, int], limits: dict[str, dict]
) -> list[tuple[str, int, int, str | None]]:
    """(path, current size, its cap, its reason if it has one) for every file over its cap.

    A listed file's cap is its recorded limit; an unlisted file's cap is the general 800. One
    formula covers "a listed file went over its recorded limit" and "an unlisted file crossed
    800" -- an unlisted file's cap just happens to be 800."""
    violations = []
    for path, loc in sorted(sizes.items()):
        entry = limits.get(path)
        cap = entry["limit"] if entry else GENERAL_CAP
        reason = entry.get("reason") if entry else None
        if loc > cap:
            violations.append((path, loc, cap, reason))
    return violations


def _violation_message(path: str, loc: int, cap: int, reason: str | None = None) -> str:
    msg = f"{path} has grown to {loc} lines of code, over its limit of {cap}."
    if reason:
        msg += f' This limit was raised on purpose before ("{reason}"), but it has grown past that too.'
    msg += (
        " Move the new code into a new file, or, after a review, raise this one file's limit "
        f'with `python scripts/growth_limit.py --raise {path} --reason "..."`.'
    )
    return msg


# --------------------------------------------------------------------------- #
# growth_limits.json load/save
# --------------------------------------------------------------------------- #


def load_limits() -> dict[str, dict]:
    """path -> {"limit": int, "reason": str (optional), "date": str (optional)}.

    Reads a plain integer the same way, as {"limit": that integer} -- the shape this file used
    before --raise existed -- so an older growth_limits.json still loads."""
    if not LIMITS_JSON.exists():
        return {}
    try:
        data = json.loads(LIMITS_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    raw = data.get("limits") if isinstance(data, dict) else None
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict] = {}
    for path, value in raw.items():
        if not isinstance(path, str):
            continue
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            out[path] = {"limit": value}
        elif isinstance(value, dict) and isinstance(value.get("limit"), int):
            entry = {"limit": value["limit"]}
            if isinstance(value.get("reason"), str) and value["reason"]:
                entry["reason"] = value["reason"]
            if isinstance(value.get("date"), str) and value["date"]:
                entry["date"] = value["date"]
            out[path] = entry
    return out


def save_limits(limits: dict[str, dict]) -> None:
    serializable = {}
    for path, entry in sorted(limits.items()):
        obj = {"limit": entry["limit"]}
        if entry.get("reason"):
            obj["reason"] = entry["reason"]
        if entry.get("date"):
            obj["date"] = entry["date"]
        serializable[path] = obj

    data = {
        "note": (
            "Files whose code line count (comments, blank lines and docstrings excluded -- see "
            "scripts/code_line_count.py) is over 800. A file listed here may not go over the "
            "\"limit\" number next to it. Any file not listed here may not go over 800. "
            "`python scripts/growth_limit.py --record` keeps this file in sync with reality, but "
            "it never raises a limit by itself -- a file that has grown past its own recorded "
            "limit is left alone and reported as refused. To grow a listed file's limit on "
            "purpose: review the growth, then run "
            "`python scripts/growth_limit.py --raise <path> --reason \"<why>\"`, which writes the "
            "new number, the reason, and today's date. Written by scripts/growth_limit.py -- do "
            "not hand-edit."
        ),
        "recorded_at": datetime.date.today().isoformat(),
        "limits": serializable,
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
    existing = load_limits()
    result = apply_record(sizes, existing)
    save_limits(result.limits)

    try:
        rel = LIMITS_JSON.relative_to(ROOT).as_posix()
    except ValueError:
        rel = str(LIMITS_JSON)
    print(f"Wrote {len(result.limits)} file(s) into {rel}.")
    for path in sorted(result.added):
        print(f"  added {path}: {result.limits[path]['limit']}")
    for path, old, new in sorted(result.lowered):
        print(f"  lowered {path}: {old} -> {new}")
    for path in sorted(result.dropped):
        print(f"  dropped {path} (now at or under {GENERAL_CAP})")
    for path, loc, recorded in sorted(result.refused):
        print(
            f"  refused to raise {path}: it is at {loc} lines of code, over its recorded limit "
            f"of {recorded}. --record does not raise limits -- review it on purpose, then run "
            f'`python scripts/growth_limit.py --raise {path} --reason "..."`.'
        )
    return 0


def cmd_raise(path_arg: str, reason: str | None) -> int:
    reason = (reason or "").strip()
    if not reason:
        print("give a reason: python scripts/growth_limit.py --raise <path> --reason \"why\"", file=sys.stderr)
        return 2

    sizes = measure()
    rel = _normalize_path_arg(path_arg)
    if rel not in sizes:
        print(
            f"{rel} is not one of the files this check watches "
            "(src/**/*.ts(x) minus tests, main.py, py_modules/**/*.py).",
            file=sys.stderr,
        )
        return 2

    limits = load_limits()
    loc = sizes[rel]
    old = limits.get(rel, {}).get("limit")
    limits[rel] = {"limit": loc, "reason": reason, "date": datetime.date.today().isoformat()}
    save_limits(limits)

    if old is None:
        print(f"{rel}: now limited to {loc} lines of code. Reason: {reason}")
    else:
        print(f"{rel}: limit raised from {old} to {loc} lines of code. Reason: {reason}")
    return 0


def cmd_check(as_json: bool) -> int:
    limits = load_limits()
    sizes = measure()
    violations = find_violations(sizes, limits)
    messages = [_violation_message(path, loc, cap, reason) for path, loc, cap, reason in violations]
    raised = [
        {"path": path, "limit": entry["limit"], "reason": entry["reason"], "date": entry.get("date")}
        for path, entry in sorted(limits.items())
        if entry.get("reason")
    ]

    if as_json:
        print(json.dumps({"violations": messages, "checked": len(sizes), "raised": raised}))
    else:
        for line in messages[:40]:
            print(line)
        if raised:
            print("Limits raised on purpose:")
            for r in raised:
                when = f" ({r['date']})" if r.get("date") else ""
                print(f"  {r['path']}: {r['limit']}{when} - {r['reason']}")
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
        help=(
            "sync scripts/growth_limits.json with today's sizes: add newly-over-800 files, lower "
            "shrunk limits, drop files back under 800. Never raises a limit -- a grown file is "
            "reported as refused instead."
        ),
    )
    parser.add_argument(
        "--raise",
        dest="raise_path",
        metavar="PATH",
        default=None,
        help="raise one file's limit to its current size, on purpose. Requires --reason.",
    )
    parser.add_argument("--reason", default=None, help="required with --raise: why this file's limit is being raised")
    args = parser.parse_args(argv)

    if args.raise_path is not None:
        return cmd_raise(args.raise_path, args.reason)
    if args.record:
        return cmd_record()
    return cmd_check(args.json)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
