#!/usr/bin/env python3
"""Title: Code map generator

Purpose: Write docs/code-map.md, one line per app file with its Title and the
opening of its Purpose, grouped by folder, so somebody can find the file they
want by scanning one page instead of opening three hundred.
Used for: runs on its own in the pre-commit hook, so the map cannot fall behind
the headers. `python scripts/code_map.py` refreshes it by hand.
Solves: There was no single place listing what every file is for — only the
headers themselves, spread across three hundred files.
Does not: Check whether a header is missing or wrong — see
scripts/check_headers.py for that, which fails the build. This only reports
what it finds.

Gotchas: entries are trimmed to their opening sentences (`opening_of()`), and
an entry ending in […] has more in the file. That trimming is the whole reason
the map stays usable: headers are deliberately written at whatever length the
file needs, and pasting all of them onto one page produced something nobody
would read. If the map ever feels too thin, raise the two numbers above it —
do not shorten a single header to fit this page.
"""

from __future__ import annotations

import os
import re
import sys
import warnings

# See scripts/check_headers.py: a couple of existing docstrings use a literal
# backslash-underscore for markdown escaping, which trips a parser warning
# unrelated to anything this script checks.
warnings.filterwarnings("ignore", category=SyntaxWarning)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(REPO_ROOT, "docs", "code-map.md")


def to_posix(path: str) -> str:
    return path.replace(os.sep, "/")


def is_excluded(rel_path: str) -> bool:
    parts = to_posix(rel_path).split("/")
    if "node_modules" in parts or "dist" in parts or ".git" in parts:
        return True
    if ".claude" in parts and "worktrees" in parts:
        return True
    if to_posix(rel_path).startswith("docs/archive/"):
        return True
    return False


def collect_app_files() -> list:
    """Same app-code definition as scripts/check_headers.py: src/**/*.ts(x)
    excluding *.test.* and src/test-harness/, plus main.py and
    py_modules/**/*.py."""
    files = []

    src_dir = os.path.join(REPO_ROOT, "src")
    for dirpath, dirnames, filenames in os.walk(src_dir):
        rel_dir = to_posix(os.path.relpath(dirpath, REPO_ROOT))
        if rel_dir == "src/test-harness" or rel_dir.startswith("src/test-harness/"):
            dirnames[:] = []
            continue
        for fn in filenames:
            if not (fn.endswith(".ts") or fn.endswith(".tsx")):
                continue
            if ".test." in fn:
                continue
            rel = to_posix(os.path.relpath(os.path.join(dirpath, fn), REPO_ROOT))
            if is_excluded(rel):
                continue
            files.append(rel)

    main_py = os.path.join(REPO_ROOT, "main.py")
    if os.path.isfile(main_py):
        files.append("main.py")

    py_dir = os.path.join(REPO_ROOT, "py_modules")
    for dirpath, dirnames, filenames in os.walk(py_dir):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for fn in filenames:
            if not fn.endswith(".py"):
                continue
            rel = to_posix(os.path.relpath(os.path.join(dirpath, fn), REPO_ROOT))
            if is_excluded(rel):
                continue
            files.append(rel)

    return sorted(files)


def strip_comment_marker(line: str) -> str:
    """Drop TS `/** ... * ` markers and a Python docstring's opening
    quotes — 'Title:' commonly shares its line with the opening \"\"\"."""
    s = line.strip().lstrip("*").strip()
    s = s.lstrip('"').lstrip("'").strip()
    return s


FIELD_LABELS = ("Title:", "Purpose:", "Used for:", "Solves:", "Does not:")


def read_header_fields(path: str):
    """Best-effort Title/Purpose pulled from the first 60 lines, tolerant of
    both the TS `/** * Title: ... */` block style and the Python docstring
    style — see docs/code-clarity.md for the header convention. A field that
    word-wraps onto following lines (some Purpose lines do) is joined back
    into one line, stopping at the next label or a blank line."""
    abs_path = os.path.join(REPO_ROOT, path)
    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()[:60]
    except OSError:
        return None, None

    title_parts = None
    purpose_parts = None
    current = None  # "title" | "purpose" | None

    for line in lines:
        stripped = strip_comment_marker(line)
        if not stripped:
            current = None
            continue
        if stripped.startswith("Title:"):
            title_parts = [stripped[len("Title:") :].strip()]
            current = "title"
            continue
        if stripped.startswith("Purpose:"):
            purpose_parts = [stripped[len("Purpose:") :].strip()]
            current = "purpose"
            continue
        if any(stripped.startswith(lbl) for lbl in FIELD_LABELS):
            current = None
            continue
        if current == "title":
            title_parts.append(stripped)
        elif current == "purpose":
            purpose_parts.append(stripped)

    title = " ".join(title_parts).strip() if title_parts else None
    purpose = " ".join(purpose_parts).strip() if purpose_parts else None

    return title, purpose


def escape_pipes(text: str) -> str:
    return text.replace("|", "\\|")


# Where one entry in the map stops. A Purpose line is written for somebody
# reading that file and can run to a full paragraph; an entry here is written
# for somebody scanning 311 of them at once, and those are different jobs.
SUMMARY_MIN_CHARS = 110
SUMMARY_MAX_CHARS = 280

# A full stop that ends a sentence: followed by a space and a capital letter, a
# digit or an opening quote. This skips "e.g." and "i.e." because the letter
# after the space is lower case, and skips a decimal point because there is no
# space.
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'*])")


def opening_of(purpose: str) -> str:
    """The first sentence or two of a Purpose line, for the map entry.

    Takes sentences until there are at least SUMMARY_MIN_CHARS, so a very short
    opening sentence ("The plugin has two halves.") is not the whole entry, then
    stops. Anything still over SUMMARY_MAX_CHARS is cut at the last space and
    given an ellipsis. Returns the whole thing unchanged when it is already
    short, and never returns an empty string for a non-empty input.
    """
    text = purpose.strip()
    if len(text) <= SUMMARY_MIN_CHARS:
        return text

    out = ""
    for sentence in _SENTENCE_END.split(text):
        out = f"{out} {sentence}".strip() if out else sentence
        if len(out) >= SUMMARY_MIN_CHARS:
            break

    if len(out) > SUMMARY_MAX_CHARS:
        cut = out[:SUMMARY_MAX_CHARS].rsplit(" ", 1)[0]
        return cut.rstrip(",;:-") + "…"

    # Say so when there is more in the file, so a reader scanning the map knows
    # this entry is an opening and not the whole of what the header says.
    return out + (" […]" if len(out) < len(text) else "")


def group_key(path: str) -> str:
    d = os.path.dirname(path)
    return d if d else "."


def render(files: list) -> str:
    groups: dict = {}
    for path in files:
        groups.setdefault(group_key(path), []).append(path)

    lines = []
    lines.append("<!-- GENERATED by scripts/code_map.py. Do not hand-edit; re-run the script to refresh. -->")
    lines.append("")
    lines.append("# Code map")
    lines.append("")
    lines.append(
        "One entry per app file, grouped by folder: its Title, then the opening of its "
        "Purpose. Headers are written at whatever length the file needs, so an entry "
        "ending in […] has more in the file itself — open it rather than assuming this "
        "is all it says. A file with no entry under Purpose is missing a header line; "
        "see `scripts/check_headers.py`, which fails the build on one."
    )
    lines.append("")

    for group in sorted(groups.keys()):
        lines.append(f"## {group}")
        lines.append("")
        for path in sorted(groups[group]):
            title, purpose = read_header_fields(path)
            name = os.path.basename(path)
            if title is None and purpose is None:
                lines.append(f"- **{name}** ({path}) — no header found.")
            else:
                title_text = escape_pipes(title) if title else name
                purpose_text = escape_pipes(opening_of(purpose)) if purpose else "(no Purpose line found)"
                lines.append(f"- **{name}** ({path}) — *{title_text}*: {purpose_text}")
        lines.append("")

    return "\n".join(lines).rstrip("\n") + "\n"


def main(argv) -> int:
    files = collect_app_files()
    text = render(files)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    print(f"wrote {to_posix(os.path.relpath(OUT_PATH, REPO_ROOT))} ({len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
