#!/usr/bin/env python3
"""Title: Comments-only proof

Purpose: Proves that a range of commits changed nothing but comments. Phase 5 of
the refactor adds an explanation to every file and every long function and is
meant to leave the program itself untouched, across roughly ninety files written
by six workers at once. This script is what turns "meant to" into something
checked. For each changed file it takes the comments out of the before and after
versions and compares what is left. If a single character of actual code moved,
it says so and names the file.

Used for: The session that merges a phase 5 worker's branch, before it merges.
Run it by hand, or from the merge step:
    python scripts/comment_only_check.py experimental refactor/p5-a-py-ai

Solves: Reading ninety diffs by eye to spot the one place a worker "tidied" a
line of code while writing about it. That is the one way this phase could break
the plugin, and it is the kind of mistake that reads as harmless in a diff.

Does not: Judge whether the comments are any good, or check anything the test
suite already checks. It answers one question only, and answers it exactly.

How it works:
 1. `changed_files()` asks git which files differ between the two commits.
 2. Python files go to `python_fingerprint()`, which parses the file and throws
    the docstrings away. Comments never reach the syntax tree in the first
    place, so what comes back describes the code and nothing else.
 3. TypeScript files go to `ts_fingerprint()`, which shells out to
    `scripts/strip_ts_comments.mjs` for the same idea in a language Python
    cannot parse.
 4. Anything else -- a script, a document, a settings file -- is reported as
    unchecked rather than quietly passed. In this phase there should not be any.
 5. A file whose two fingerprints match changed only its comments. A file whose
    fingerprints differ has had its code changed, and is listed as a failure.

Gotchas:
 - A file that is added or deleted outright cannot be a comment-only change, and
   is reported as a failure. That is deliberate: phase 5 adds no files.
 - A Python file that does not parse is a failure too, not a skip. A worker that
   breaks the syntax of a docstring has broken the file.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE_HELPER = os.path.join(REPO_ROOT, "scripts", "strip_ts_comments.mjs")

PY_SUFFIXES = (".py",)
TS_SUFFIXES = (".ts", ".tsx")

# Files nobody writes by hand: a git hook rebuilds them from the code on every
# commit. Adding comments moves line numbers, so these change as a side effect
# and their changing proves nothing either way. They are listed separately
# rather than passed silently. Anything generated that is also compiled --
# src/types/rpcMethods.ts, for one -- is deliberately NOT here: it is real code,
# and phase 5 changing it would mean a worker had moved a method.
GENERATED_PATHS = (
    "packages/bonsai-mcp/knowledge/architecture/",
    "docs/code-map.md",
)


def is_generated(path: str) -> bool:
    return any(path.startswith(prefix) or path == prefix for prefix in GENERATED_PATHS)


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def changed_files(base: str, head: str) -> list:
    out = git("diff", "--name-status", f"{base}...{head}")
    rows = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        rows.append((parts[0], parts[-1]))
    return rows


def file_at(ref: str, path: str) -> str:
    return git("show", f"{ref}:{path}")


def strip_docstrings(tree: ast.AST) -> ast.AST:
    """Drop the docstring from every module, class and function.

    A docstring is the first statement of a body when that statement is a bare
    string. That is exactly what this phase rewrites, so it has to come out
    before two versions can be compared.
    """
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
                node.body = body[1:] or [ast.Pass()]
    return tree


def python_fingerprint(source: str, path: str) -> str:
    tree = ast.parse(source, filename=path)
    return ast.dump(strip_docstrings(tree), annotate_fields=True)


def ts_fingerprint(source: str, path: str, tmp_dir: str, tag: str) -> str:
    """Write the text to a scratch file and let the node helper strip it.

    The suffix has to survive the round trip: the compiler treats .ts and .tsx
    differently, and a .tsx file parsed as .ts fails on its first tag.
    """
    suffix = ".tsx" if path.endswith(".tsx") else ".ts"
    scratch = os.path.join(tmp_dir, f"{tag}{suffix}")
    with open(scratch, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(source)
    result = subprocess.run(
        ["node", NODE_HELPER, scratch],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        shell=(os.name == "nt"),
    )
    if result.returncode != 0:
        raise RuntimeError(f"stripping {path} failed: {result.stderr.strip()[:400]}")
    return result.stdout


def main(argv) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("base", help="the commit the work started from")
    parser.add_argument("head", help="the branch or commit to check")
    parser.add_argument("--json", action="store_true", help="print one JSON object")
    args = parser.parse_args(argv)

    import tempfile

    comment_only, code_changed, unchecked, errors, generated = [], [], [], [], []

    with tempfile.TemporaryDirectory() as tmp_dir:
        for status, path in changed_files(args.base, args.head):
            if is_generated(path):
                generated.append(path)
                continue
            if status != "M":
                code_changed.append({"file": path, "why": f"file was {status}, not modified"})
                continue
            try:
                before = file_at(args.base, path)
                after = file_at(args.head, path)
                if path.endswith(PY_SUFFIXES):
                    same = python_fingerprint(before, path) == python_fingerprint(after, path)
                elif path.endswith(TS_SUFFIXES):
                    same = ts_fingerprint(before, path, tmp_dir, "before") == ts_fingerprint(
                        after, path, tmp_dir, "after"
                    )
                else:
                    unchecked.append(path)
                    continue
            except (SyntaxError, RuntimeError) as exc:
                errors.append({"file": path, "error": str(exc)[:300]})
                continue
            (comment_only if same else code_changed).append(
                path if same else {"file": path, "why": "code differs once comments are removed"}
            )

    ok = not code_changed and not errors and not unchecked

    if args.json:
        print(
            json.dumps(
                {
                    "ok": ok,
                    "comment_only": comment_only,
                    "code_changed": code_changed,
                    "unchecked": unchecked,
                    "errors": errors,
                    "generated": generated,
                },
                indent=1,
            )
        )
    else:
        print(f"{len(comment_only)} file(s) changed comments only.")
        if generated:
            print(f"{len(generated)} generated file(s) moved with them, which is expected.")
        for item in code_changed:
            print(f"  CODE CHANGED: {item['file']} -- {item['why']}")
        for path in unchecked:
            print(f"  NOT CHECKED (needs a person): {path}")
        for item in errors:
            print(f"  COULD NOT CHECK: {item['file']} -- {item['error']}")
        print("PASS: comments only." if ok else "FAIL: something other than comments changed.")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
