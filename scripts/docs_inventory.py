#!/usr/bin/env python3
"""Title: Docs and scripts inventory

Purpose: Lists every project document under docs/ (skipping docs/archive/, since
those are already put away) and every file under scripts/, and pulls together the
facts a person needs to decide whether to keep, put away, or throw out each one:
how big it is, what it is called, when it was last touched, how many other tracked
files still mention it, and whether the file itself says its work is finished.

Used for: `python scripts/docs_inventory.py` prints a plain table. `python
scripts/docs_inventory.py --json` prints the same facts as one JSON list, so a
write-up (for example a clean-up proposal for the maintainer) can read the facts
instead of re-deriving them by opening every file.

Solves: Deciding what to archive or delete used to mean opening roughly 195 files
by hand. This gathers the cheap, checkable facts first, so a human only has to
open the handful of files the table cannot settle.

Does not: Decide anything by itself, and does not move, delete, or archive a
single file. It only reports what is there and lets a person make the call. It
also does not read git history beyond "the last commit that touched this file" —
it is not a full change-log tool.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Words a document or script sometimes uses about its own status. These are a
# hint for a human, not a verdict — the table only reports what it found.
SHIPPED_WORDS = [
    "shipped",
    "complete",
    "completed",
    "row closes",
    "entry moved to done",
]
SUPERSEDED_WORDS = [
    "superseded",
    "supersedes",
    "replaced by",
    "replaced with",
    "obsolete",
]
ABANDONED_WORDS = [
    "abandoned",
    "not pursued",
    "shelved",
    "won't do",
    "wont do",
    "no longer planned",
    "dropped",
    "path not taken",
]

SUPERSEDED_BY_RE = re.compile(
    r"(?:superseded|replaced)\s+(?:by|with)\s+([^\n\.;]{3,80})", re.IGNORECASE
)

TITLE_LINE_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$")


def to_posix(path: str) -> str:
    return path.replace(os.sep, "/")


def run_git(args: list[str], timeout: int = 30) -> tuple[int, str]:
    """Run a git command from the repo root. Returns (returncode, stdout)."""
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired):
        return (-1, "")
    return (proc.returncode, proc.stdout)


def list_tracked_files(subdir: str) -> list[str]:
    """Git-tracked files under subdir, as repo-relative posix paths."""
    code, out = run_git(["ls-files", "--", subdir])
    if code != 0:
        return []
    return [to_posix(line.strip()) for line in out.splitlines() if line.strip()]


def last_commit_date(rel_path: str) -> str:
    """The date (YYYY-MM-DD) of the last commit that touched this file."""
    code, out = run_git(["log", "-1", "--format=%cs", "--", rel_path])
    if code != 0:
        return "UNKNOWN"
    out = out.strip()
    return out if out else "UNKNOWN"


# Filenames so generic (repeated across many folders) that searching for the
# bare name mostly finds mentions of a *different* file with the same name —
# the repo has 11 README.md files alone. For these, search "parent-folder/name"
# instead, which is still what most relative links actually contain.
GENERIC_BASENAMES = {"readme.md", "index.md", "index.json", "changelog.md"}


def count_inbound_refs(rel_path: str) -> int:
    """How many other tracked files (repo-wide) mention this file's name."""
    basename = os.path.basename(rel_path)
    if len(basename) < 5:
        # Too short a name (e.g. a two-letter stem) produces noise, not signal.
        return -1
    search_for = basename
    if basename.lower() in GENERIC_BASENAMES:
        parent = os.path.basename(os.path.dirname(rel_path))
        if parent:
            search_for = f"{parent}/{basename}"
    code, out = run_git(
        ["grep", "-l", "--fixed-strings", "-i", "--", search_for]
    )
    if code not in (0, 1):
        return -1
    files = [to_posix(line.strip()) for line in out.splitlines() if line.strip()]
    files = [f for f in files if f != rel_path]
    return len(files)


def read_text(abs_path: Path) -> str:
    try:
        return abs_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def first_title_line(rel_path: str, text: str) -> str:
    """First heading (markdown) or a best-effort title line for a script."""
    lines = text.splitlines()

    if rel_path.endswith(".md"):
        for line in lines[:50]:
            m = TITLE_LINE_RE.match(line)
            if m:
                return m.group(1).strip()
        for line in lines:
            if line.strip():
                return line.strip()[:100]
        return "(empty file)"

    if rel_path.endswith(".py"):
        # Module docstring, first line; prefer an explicit "Title:" line.
        joined = "\n".join(lines[:40])
        doc_m = re.search(r'"""(.*?)(?:"""|\Z)', joined, re.DOTALL)
        if doc_m:
            doc_lines = [l.strip() for l in doc_m.group(1).splitlines() if l.strip()]
            for dl in doc_lines:
                title_m = re.match(r"Title:\s*(.+)", dl)
                if title_m:
                    return title_m.group(1).strip()
            if doc_lines:
                return doc_lines[0][:100]
        for line in lines[:10]:
            s = line.strip()
            if s and not s.startswith("#!") and s.startswith("#"):
                return s.lstrip("#").strip()[:100]
        return "(no title found)"

    if rel_path.endswith((".sh", ".ps1")):
        for line in lines[:10]:
            s = line.strip()
            if s.startswith("#!"):
                continue
            if s.startswith("#"):
                return s.lstrip("#").strip()[:100]
        return "(no title found)"

    if rel_path.endswith(".mjs"):
        joined = "\n".join(lines[:40])
        doc_m = re.search(r"/\*(.*?)\*/", joined, re.DOTALL)
        if doc_m:
            doc_lines = [l.strip(" *") for l in doc_m.group(1).splitlines() if l.strip(" *")]
            for dl in doc_lines:
                title_m = re.match(r"Title:\s*(.+)", dl)
                if title_m:
                    return title_m.group(1).strip()
            if doc_lines:
                return doc_lines[0][:100]
        return "(no title found)"

    if rel_path.endswith(".json"):
        return "(data file, no title)"

    for line in lines:
        if line.strip():
            return line.strip()[:100]
    return "(empty file)"


def self_declared_status(text: str) -> dict:
    """What the file says about its own status, if anything."""
    lower = text.lower()
    found = []
    if any(w in lower for w in SUPERSEDED_WORDS):
        found.append("superseded")
    if any(w in lower for w in SHIPPED_WORDS):
        found.append("shipped")
    if any(w in lower for w in ABANDONED_WORDS):
        found.append("abandoned")

    superseded_by = None
    m = SUPERSEDED_BY_RE.search(text)
    if m:
        superseded_by = m.group(1).strip()

    return {"self_says": found, "superseded_by": superseded_by}


def build_row(rel_path: str) -> dict:
    abs_path = REPO_ROOT / rel_path
    try:
        size = abs_path.stat().st_size
    except OSError:
        size = -1
    text = read_text(abs_path)
    status = self_declared_status(text)
    return {
        "path": rel_path,
        "size_bytes": size,
        "title": first_title_line(rel_path, text),
        "last_commit": last_commit_date(rel_path),
        "inbound_refs": count_inbound_refs(rel_path),
        "self_says": status["self_says"],
        "superseded_by": status["superseded_by"],
    }


def collect_docs() -> list[dict]:
    files = [
        f
        for f in list_tracked_files("docs")
        if f.endswith(".md") and not f.startswith("docs/archive/")
    ]
    return [build_row(f) for f in sorted(files)]


def collect_scripts() -> list[dict]:
    files = list_tracked_files("scripts")
    return [build_row(f) for f in sorted(files)]


def print_table(rows: list[dict], heading: str) -> None:
    print(f"\n== {heading} ({len(rows)}) ==")
    print(
        f"{'path':<60} {'size':>7} {'last commit':>11} {'refs':>5} {'says':<28} title"
    )
    for row in rows:
        says = ",".join(row["self_says"]) if row["self_says"] else "-"
        refs = str(row["inbound_refs"]) if row["inbound_refs"] >= 0 else "?"
        print(
            f"{row['path']:<60} {row['size_bytes']:>7} {row['last_commit']:>11} "
            f"{refs:>5} {says:<28} {row['title']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inventory of docs/*.md (outside docs/archive/) and scripts/* "
        "for a keep/archive/delete triage pass."
    )
    parser.add_argument(
        "--json", action="store_true", help="print one JSON object instead of tables"
    )
    args = parser.parse_args()

    # Windows consoles default to a codepage that cannot show every character
    # (an em dash becomes a "?"); force UTF-8 so table titles print correctly.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    docs = collect_docs()
    scripts = collect_scripts()

    if args.json:
        print(
            json.dumps(
                {
                    "docs": docs,
                    "scripts": scripts,
                    "counts": {"docs": len(docs), "scripts": len(scripts)},
                },
                indent=2,
            )
        )
        return 0

    print_table(docs, "docs (excluding docs/archive/)")
    print_table(scripts, "scripts")
    total_kb = sum(r["size_bytes"] for r in docs if r["size_bytes"] > 0) / 1024
    print(f"\nTotal docs: {len(docs)} files, {total_kb:.1f} KB")
    print(f"Total scripts: {len(scripts)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
