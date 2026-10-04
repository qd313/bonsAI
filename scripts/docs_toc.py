#!/usr/bin/env python3
"""Title: Docs table of contents

Purpose: Write a linked table of contents at the top of each major document, built from the
    document's own `##` and `###` headings, so a person can jump straight to a section and an AI
    tool can see a document's shape without reading all of it.
Used for: `python scripts/docs_toc.py` to write or refresh every list; `--check` to fail (exit
    1) when any list is missing or out of date, without changing a file; `--json` with `--check`
    for one machine-readable object; `--file <path>` to work on one document only.
Solves: A hand-written contents list goes stale the first time a heading is renamed, and a
    broken link is worse than no list at all. A list the script writes, plus a check that fails
    when it drifts, cannot quietly go stale.
Does not: Touch any document not named in `DOCS`, change a heading, or list `####` and deeper.
    Does not check links elsewhere in a document -- only the ones in the list it writes.

How it works:
    1. `headings()` walks a document line by line, skipping fenced code blocks and anything
       already between the two markers, and collects every `#` heading with its level.
    2. `slug()` turns a heading into the link name GitHub gives it: inline markup dropped,
       lowercased, punctuation removed, spaces to hyphens. A repeated heading gets `-1`, `-2`
       and so on, counted across every heading level, the way GitHub counts them.
    3. `build_toc()` writes one list line per `##` and `###` heading between `TOC_START` and
       `TOC_END`. `apply_toc()` replaces the block if the markers exist, otherwise inserts it
       just before the first `##` heading, so a document's opening lines stay first.

Gotchas:
  - The list goes before the first `##`, never above the title or a document's opening text:
    the README's intro and the generated-file notice at the top of the code map must stay put.
  - The code map is rewritten from scratch by its own generator, so that generator calls
    `apply_toc()` before saving; without that, every rebuild would wipe the list.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TOC_START = "<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->"
TOC_END = "<!-- /toc -->"
TOC_TITLE = "**Contents**"
MAX_LEVEL = 3

# The documents people read today. Archives, plans and test evidence are left out on purpose, and
# so is the shelved roadmap: it has one section, so a list would hold a single link.
DOCS = [
    "README.md",
    "AGENTS.md",
    "CHANGELOG.md",
    "docs/guide.md",
    "docs/troubleshooting.md",
    "docs/testing.md",
    "docs/testing-manual.md",
    "docs/roadmap.md",
    "docs/roadmap-details.md",
    "docs/roadmap-kb-details.md",
    "docs/knowledge-base.md",
    "docs/code-map.md",
    "docs/development.md",
    "docs/lessons-learned.md",
    "docs/design-language.md",
    "docs/design-tokens.md",
    "docs/mcp-setup.md",
    "docs/code-clarity.md",
]

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_FENCE_RE = re.compile(r"^\s*(```|~~~)")
_LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_HTML_RE = re.compile(r"<[^>]+>")


def plain_text(text: str) -> str:
    """Heading text with links reduced to their words and HTML tags dropped."""
    text = _LINK_RE.sub(r"\1", text)
    return _HTML_RE.sub("", text).strip()


def slug(text: str) -> str:
    """The anchor GitHub gives a heading, before any duplicate number is added."""
    text = plain_text(text).replace("`", "").replace("*", "").lower()
    text = "".join(ch for ch in text if ch.isalnum() or ch in " -_")
    return text.replace(" ", "-")


def headings(lines: list[str]) -> list[tuple[int, str]]:
    found = []
    in_fence = False
    in_toc = False
    for line in lines:
        if line.strip() == TOC_START:
            in_toc = True
            continue
        if in_toc:
            if line.strip() == TOC_END:
                in_toc = False
            continue
        if _FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = _HEADING_RE.match(line)
        if match:
            found.append((len(match.group(1)), match.group(2)))
    return found


def build_toc(lines: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    entries = []
    for level, text in headings(lines):
        base = slug(text)
        count = seen.get(base, 0)
        seen[base] = count + 1
        anchor = base if count == 0 else f"{base}-{count}"
        # A heading with no letters or digits (the code map's "## .") has no usable link.
        if 2 <= level <= MAX_LEVEL and base:
            indent = "  " * (level - 2)
            label = plain_text(text).replace("[", "\\[").replace("]", "\\]")
            entries.append(f"{indent}- [{label}](#{anchor})")
    if not entries:
        return []
    return [TOC_START, TOC_TITLE, "", *entries, TOC_END]


def apply_toc(text: str) -> str:
    """The document with its contents list written or refreshed. Unchanged if it has no `##`."""
    lines = text.split("\n")
    toc = build_toc(lines)
    if TOC_START in (line.strip() for line in lines):
        start = next(i for i, line in enumerate(lines) if line.strip() == TOC_START)
        end = next(i for i in range(start, len(lines)) if lines[i].strip() == TOC_END)
        return "\n".join(lines[:start] + toc + lines[end + 1:])
    if not toc:
        return text
    in_fence = False
    for i, line in enumerate(lines):
        if _FENCE_RE.match(line):
            in_fence = not in_fence
        elif not in_fence and line.startswith("## "):
            return "\n".join(lines[:i] + toc + [""] + lines[i:])
    return text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write or check the contents list in each major doc.")
    parser.add_argument("--check", action="store_true", help="fail if any list is missing or stale; change nothing")
    parser.add_argument("--json", action="store_true", help="with --check, print one JSON object")
    parser.add_argument("--file", help="work on this one document only")
    args = parser.parse_args(argv)

    targets = [args.file] if args.file else DOCS
    stale = []
    for rel in targets:
        path = ROOT / rel
        if not path.exists():
            stale.append(f"{rel}: file not found")
            continue
        original = path.read_text(encoding="utf-8")
        newline = "\r\n" if "\r\n" in original else "\n"
        text = original.replace("\r\n", "\n")
        updated = apply_toc(text)
        if updated == text:
            continue
        if args.check:
            stale.append(f"{rel}: contents list missing or out of date")
        else:
            path.write_text(updated.replace("\n", newline), encoding="utf-8", newline="")
            print(f"updated {rel}")

    if args.check:
        if args.json:
            print(json.dumps({"ok": not stale, "stale": stale}))
        elif stale:
            print("\n".join(stale))
            print("Run `python scripts/docs_toc.py` to refresh them.")
        return 1 if stale else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
