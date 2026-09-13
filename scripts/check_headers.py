#!/usr/bin/env python3
"""Title: File header checker

Purpose: Verify every app file carries a Purpose line, and, at the stricter
`full` level, a How it works line (large files only) plus valid backticked
function references, so a missing or stale header shows up as a check failure.
Used for: `python scripts/check_headers.py` (level `purpose`, the default) and
the future `--level full` pass once every file gets a How it works line.
Solves: Nothing else in the repo notices a new file that ships with no header,
or a header that drifts out of date as the file grows.
Does not: Rewrite or add headers itself, and does not judge header wording —
it only checks for the presence of the required lines and referenced names.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys
import warnings

# A couple of existing docstrings use a literal backslash-underscore for
# markdown escaping; ast.parse warns about that while validating string
# escapes. That is pre-existing file content, not a header problem, so it is
# muted rather than spamming every run.
warnings.filterwarnings("ignore", category=SyntaxWarning)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Backtick-wrapped, identifier-shaped tokens inside a header, optionally with
# a trailing "()" (e.g. `` `run_game_ai_request()` `` or `` `useBonsaiAskOrchestration` ``).
BACKTICK_NAME_RE = re.compile(r"`([A-Za-z_$][A-Za-z0-9_$]*)\(?\)?`")

FUNC_PATTERNS = [
    re.compile(r"\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)"),
    re.compile(r"\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\("),
    re.compile(r"\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function"),
    re.compile(r"\bclass\s+([A-Za-z_$][A-Za-z0-9_$]*)"),
]


def to_posix(path: str) -> str:
    return path.replace(os.sep, "/")


def is_excluded(rel_path: str) -> bool:
    """Always-exclude list from CLAUDE.md's DEFINITIONS, applied to any file."""
    parts = to_posix(rel_path).split("/")
    if "node_modules" in parts or "dist" in parts or ".git" in parts:
        return True
    if ".claude" in parts and "worktrees" in parts:
        return True
    if to_posix(rel_path).startswith("docs/archive/"):
        return True
    return False


def collect_app_files() -> list:
    """app code = src/**/*.ts and *.tsx excluding *.test.* and src/test-harness/,
    plus main.py and py_modules/**/*.py."""
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
    """Drop leading whitespace and JSDoc-style `*` so both TS block comments
    and Python docstrings can be scanned with the same startswith() check."""
    return line.strip().lstrip("*").strip()


def has_purpose_line(lines: list) -> bool:
    for line in lines[:60]:
        if strip_comment_marker(line).startswith("Purpose:"):
            return True
    return False


def has_how_it_works_line(lines: list) -> bool:
    for line in lines:
        if strip_comment_marker(line).startswith("How it works:"):
            return True
    return False


def extract_header_text(path: str, lines: list) -> str:
    """Text of the header block only (module docstring for .py, the first
    /** ... */ block for .ts/.tsx), so backtick refs elsewhere in the file
    (e.g. in code comments) are not mistaken for header references."""
    if path.endswith(".py"):
        try:
            source = "".join(lines)
            tree = ast.parse(source, filename=path)
        except SyntaxError:
            return ""
        return ast.get_docstring(tree) or ""

    text = "".join(lines)
    match = re.search(r"/\*\*(.*?)\*/", text, re.S)
    if match and text[: match.start()].strip() == "":
        return match.group(1)
    return ""


def defined_names_python(path: str) -> set:
    try:
        with open(os.path.join(REPO_ROOT, path), "r", encoding="utf-8") as fh:
            source = fh.read()
        tree = ast.parse(source, filename=path)
    except (SyntaxError, OSError):
        return set()
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
    return names


def defined_names_ts(text: str) -> set:
    names = set()
    for pat in FUNC_PATTERNS:
        for m in pat.finditer(text):
            names.add(m.group(1))
    return names


def backticked_names(header_text: str) -> set:
    return set(BACKTICK_NAME_RE.findall(header_text))


def scan(level: str):
    files = collect_app_files()
    missing_purpose = []
    missing_how_it_works = []
    bad_function_refs = []

    for path in files:
        abs_path = os.path.join(REPO_ROOT, path)
        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as fh:
                lines = fh.readlines()
        except OSError:
            missing_purpose.append(path)
            continue

        if not has_purpose_line(lines):
            missing_purpose.append(path)

        if level == "full":
            if len(lines) > 400 and not has_how_it_works_line(lines):
                missing_how_it_works.append(path)

            header_text = extract_header_text(path, lines)
            if header_text:
                names_in_header = backticked_names(header_text)
                if names_in_header:
                    text = "".join(lines)
                    defined = defined_names_python(path) if path.endswith(".py") else defined_names_ts(text)
                    for name in sorted(names_in_header):
                        if name not in defined:
                            bad_function_refs.append({"file": path, "name": name})

    return files, missing_purpose, missing_how_it_works, bad_function_refs


def main(argv) -> int:
    parser = argparse.ArgumentParser(description="Check that app files have a Purpose header line.")
    parser.add_argument("--json", action="store_true", help="print one JSON object instead of human output")
    parser.add_argument("--level", choices=["purpose", "full"], default="purpose")
    args = parser.parse_args(argv)

    files, missing_purpose, missing_how_it_works, bad_function_refs = scan(args.level)

    if args.level == "purpose":
        has_failure = bool(missing_purpose)
    else:
        has_failure = bool(missing_purpose or missing_how_it_works or bad_function_refs)

    if args.json:
        result = {
            "missing_purpose": missing_purpose,
            "missing_how_it_works": missing_how_it_works,
            "bad_function_refs": bad_function_refs,
            "checked": len(files),
        }
        print(json.dumps(result))
    else:
        failures = list(missing_purpose)
        if args.level == "full":
            failures += [f"{p}: missing How it works: line" for p in missing_how_it_works]
            failures += [f"{b['file']}: header references `{b['name']}`, not defined in that file" for b in bad_function_refs]
        for line in failures[:40]:
            print(line)
        print(f"{len(failures)} failure(s) across {len(files)} file(s) checked")

    return 1 if has_failure else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
