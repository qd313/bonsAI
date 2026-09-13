#!/usr/bin/env python3
"""Title: Code map generator

Purpose: Write docs/code-map.md, one line per app file with its Title and
Purpose header text, grouped by folder, so a reader can scan what every file
is for without opening each one.
Used for: `python scripts/code_map.py`, run by hand when headers change; not
wired into the pre-commit hook (that only regenerates the import graph).
Solves: There was no single place listing what every src/ and py_modules/
file is for — only the headers themselves, spread across 300 files.
Does not: Check whether a header is missing or wrong — see
scripts/check_headers.py for that. This script only reports what it finds.
"""

from __future__ import annotations

import os
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
        "One entry per app file: the Title and Purpose lines from its header, grouped by "
        "folder. A file with no entry under Purpose is missing a header line — "
        "see `scripts/check_headers.py`."
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
                purpose_text = escape_pipes(purpose) if purpose else "(no Purpose line found)"
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
