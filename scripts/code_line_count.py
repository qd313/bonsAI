#!/usr/bin/env python3
"""Title: How big is this file, really

Purpose: Counts the lines of a file that are actually code, leaving out blank
lines, comments and Python docstrings. It exists because "how many lines is
this file" turned out to be two different questions. One is "how much is going
on in here", which is what the refactor cares about when it decides a file is
too big to hold in your head. The other is "how far do I have to scroll", which
also counts the explanation at the top. Measuring the first with the second
punishes a file for being well explained.

Used for: `scripts/ratchet.py` for the "files over 400 lines" number, and
`scripts/check_headers.py` for deciding which files are big enough to need a
walkthrough in their header.

Solves: On 2026-09-14 a worker writing a header for a 364-line file pushed it
over 400, and shortened its own explanation twice to get back under. The number
meant to encourage splitting up big files was instead discouraging explaining
them, which is the opposite of what the phase it was running in existed to do.
Sixteen more files sat close enough to the limit to hit the same wall.

Does not: Judge whether the code is any good, or count statements rather than
lines. A long line is still one line.

How it works:
 1. Python files are parsed, and the docstring of every module, class and
    function is noted by line range. Comments never appear in the parse tree at
    all, so they are found by looking for a line whose first character is a #.
 2. TypeScript and TSX files go through `blank_out_comments()`, which walks the
    text one character at a time. A regex cannot do this correctly: a web
    address inside quotes contains two slashes and must not read as the start of
    a comment, so the walk has to know when it is inside a string.
 3. Either way, what is left is counted with blank lines dropped.

Gotchas:
 - A file that will not parse falls back to counting every line. Better to
   over-count than to silently report a broken file as small.
 - This is a deliberate twin of `blankOutComments` in
   packages/bonsai-mcp/scripts/generate-architecture.mjs. That one has to stay
   in JavaScript because it runs from the commit hook; this one has to be
   Python because its callers are. If you fix a bug in one, fix it in the other.
"""

from __future__ import annotations

import ast
import os
import sys


def blank_out_comments(text: str) -> str:
    """Replace every comment with spaces, keeping newlines so nothing shifts."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        here = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if here == "/" and nxt == "/":
            while i < n and text[i] != "\n":
                out.append(" ")
                i += 1
            continue

        if here == "/" and nxt == "*":
            while i < n and not (text[i] == "*" and i + 1 < n and text[i + 1] == "/"):
                out.append("\n" if text[i] == "\n" else " ")
                i += 1
            out.append("  ")
            i += 2
            continue

        if here in ('"', "'", "`"):
            quote = here
            out.append(here)
            i += 1
            while i < n:
                if text[i] == "\\":
                    out.append(text[i])
                    if i + 1 < n:
                        out.append(text[i + 1])
                    i += 2
                    continue
                out.append(text[i])
                i += 1
                if text[i - 1] == quote:
                    break
            continue

        out.append(here)
        i += 1
    return "".join(out)


def _python_code_lines(text: str) -> int:
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return len([line for line in text.splitlines() if line.strip()])

    docstring_lines = set()
    for node in ast.walk(tree):
        if not isinstance(
            node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)
        ):
            continue
        body = getattr(node, "body", None)
        if not body:
            continue
        first = body[0]
        if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant):
            if isinstance(first.value.value, str):
                docstring_lines.update(
                    range(first.lineno, (first.end_lineno or first.lineno) + 1)
                )

    count = 0
    for number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or number in docstring_lines or stripped.startswith("#"):
            continue
        count += 1
    return count


def code_line_count(path) -> int:
    """Lines of real code in one file. Blank lines, comments and docstrings out."""
    path = str(path)
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError:
        return 0

    if path.endswith(".py"):
        return _python_code_lines(text)

    if path.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs")):
        return len([line for line in blank_out_comments(text).splitlines() if line.strip()])

    return len([line for line in text.splitlines() if line.strip()])


def raw_line_count(path) -> int:
    """Every line in the file, explanation included -- how far you have to scroll."""
    try:
        with open(str(path), "rb") as handle:
            data = handle.read()
    except OSError:
        return 0
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(f"{code_line_count(arg):6d} code  {raw_line_count(arg):6d} total  {arg}")
