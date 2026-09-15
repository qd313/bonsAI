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

# A header claims a function reference only when it writes the trailing "()":
# `` `run_game_ai_request()` ``. A bare backticked word (`` `kb_domain` ``,
# `` `childList` ``, `` `python3` ``) is prose -- a setting name, a DOM
# attribute, a sibling file -- and is not checked. Requiring the parens is what
# separates a claim this checker can verify from ordinary quoting; without it
# 75 of 80 flagged names on 2026-09-14 were prose, and a check that is wrong 94%
# of the time is one everybody learns to ignore.
BACKTICK_CALL_RE = re.compile(r"`([A-Za-z_$][A-Za-z0-9_$]*)\(\)`")

# Names a header may call that live outside the file on purpose: browser and
# Python builtins. Anything else has to be defined in the file or imported
# into it, which is what makes a stale name -- a function renamed or moved out
# from under its own header -- fail the check.
GLOBAL_CALLABLES = {
    # DOM and browser
    "focus", "blur", "click", "querySelector", "querySelectorAll",
    "getElementById", "getBoundingClientRect", "addEventListener",
    "removeEventListener", "requestAnimationFrame", "setTimeout",
    "setInterval", "clearTimeout", "clearInterval", "fetch", "structuredClone",
    # JS stdlib
    "JSON", "Promise", "Array", "Object", "Number", "String", "Boolean",
    "Map", "Set", "Date", "Math", "RegExp", "Error",
    # Python builtins that show up in prose about a module
    "print", "open", "len", "range", "sorted", "repr", "str", "int", "float",
    "dict", "list", "set", "tuple", "bool", "isinstance", "getattr", "setattr",
}

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


def imported_names_python(path: str) -> set:
    """Every name an `import` or `from ... import` binds in this module, so a
    header may name a helper it calls from somewhere else."""
    try:
        with open(os.path.join(REPO_ROOT, path), "r", encoding="utf-8") as fh:
            tree = ast.parse(fh.read(), filename=path)
    except (SyntaxError, OSError):
        return set()
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                names.add(alias.asname or alias.name.split(".")[0])
    return names


# Everything between the braces of `import { a, b as c } from "..."`, plus the
# plain and namespace forms.
TS_IMPORT_BLOCK_RE = re.compile(r"import\s*(?:type\s*)?\{([^}]*)\}\s*from", re.S)
TS_IMPORT_PLAIN_RE = re.compile(r"import\s+(?:type\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|from)")
TS_IMPORT_STAR_RE = re.compile(r"import\s*\*\s*as\s+([A-Za-z_$][A-Za-z0-9_$]*)")


def imported_names_ts(text: str) -> set:
    """Same idea for TypeScript: the names this file imports are fair game in
    its header, because calling them is exactly what the header describes."""
    names = set()
    for block in TS_IMPORT_BLOCK_RE.findall(text):
        for part in block.split(","):
            part = part.strip()
            if not part:
                continue
            # "original as local" binds the local name.
            bound = part.split(" as ")[-1].strip()
            if re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", bound):
                names.add(bound)
    names.update(TS_IMPORT_PLAIN_RE.findall(text))
    names.update(TS_IMPORT_STAR_RE.findall(text))
    return names


def backticked_calls(header_text: str) -> set:
    """Names the header claims to call, i.e. written with the trailing ()."""
    return set(BACKTICK_CALL_RE.findall(header_text))


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
                names_in_header = backticked_calls(header_text)
                if names_in_header:
                    text = "".join(lines)
                    if path.endswith(".py"):
                        known = defined_names_python(path) | imported_names_python(path)
                    else:
                        known = defined_names_ts(text) | imported_names_ts(text)
                    known |= GLOBAL_CALLABLES
                    for name in sorted(names_in_header):
                        if name not in known:
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
