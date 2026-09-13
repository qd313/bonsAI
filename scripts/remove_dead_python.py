#!/usr/bin/env python3
"""Title: Remove Python definitions nothing calls

Purpose: Deletes a named function, class, constant, type alias or attribute
assignment from a Python file by finding it in the parsed file rather than by
matching text, so the whole thing goes -- decorators, its docstring, the comment
written above it -- and nothing half-deleted is left behind.

Used for: `python scripts/remove_dead_python.py <list.json>` where the list is
`[{"file": "py_modules/...", "name": "thing", "line": 42}, ...]`. `--dry` prints
exactly which lines would go without writing. Written for the refactor's delete
phase; the list comes from `scripts/phase2_map.py` after a whole-project sweep
confirms the name appears nowhere else.

Solves: The Python half of the same job the TypeScript remover does. Deleting by
hand loses a decorator or leaves an orphaned comment; deleting by regex over a
multi-line function is worse.

Does not: Decide what is dead, or follow callers. It deletes exactly what it is
handed, refuses a name it cannot find at the line given, and re-parses every file
it touched so a file it broke fails here rather than at the next test run.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _find(tree: ast.AST, name: str, line: int):
    """The node defining `name` at (or nearest below) `line`."""
    best = None
    for node in ast.walk(tree):
        got = None
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            got = node.name
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == name:
                    got = name
                elif isinstance(t, ast.Attribute) and t.attr == name:
                    got = name
        elif isinstance(node, ast.AnnAssign):
            t = node.target
            if isinstance(t, ast.Name) and t.id == name:
                got = name
            elif isinstance(t, ast.Attribute) and t.attr == name:
                got = name
        if got != name:
            continue
        if best is None or abs(node.lineno - line) < abs(best.lineno - line):
            best = node
    return best


def _span(node, lines: list[str]) -> tuple[int, int]:
    """1-based inclusive line range to delete, comment above and blank line below included."""
    start = node.lineno
    for dec in getattr(node, "decorator_list", []) or []:
        start = min(start, dec.lineno)

    # Absorb a comment block written directly above with no blank line between.
    i = start - 2  # 0-based index of the line above
    while i >= 0 and lines[i].strip().startswith("#"):
        start = i + 1
        i -= 1

    end = node.end_lineno
    # Absorb blank lines after it, so removing a definition does not leave a gap.
    j = end  # 0-based index of the line after
    while j < len(lines) and not lines[j].strip():
        end = j + 1
        j += 1
    return start, end


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Delete named Python definitions.")
    parser.add_argument("list_path")
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args(argv)

    targets = json.loads(Path(args.list_path).read_text(encoding="utf-8"))
    by_file: dict[str, list[dict]] = {}
    for t in targets:
        by_file.setdefault(t["file"], []).append(t)

    missing: list[str] = []
    pending: dict[Path, str] = {}

    for rel, items in by_file.items():
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        lines = text.split("\n")
        tree = ast.parse(text)

        spans = []
        for item in items:
            node = _find(tree, item["name"], item.get("line", 1))
            if node is None:
                missing.append(f"{rel}: no definition named {item['name']}")
                continue
            spans.append((*_span(node, lines), item["name"]))

        # Delete from the bottom up so earlier line numbers stay valid.
        spans.sort(key=lambda s: -s[0])
        drop: set[int] = set()
        for start, end, name in spans:
            drop.update(range(start, end + 1))
            print(f"  {rel}: removing {name} (lines {start}-{end})")

            # Always shout about comment lines being taken along, dry run or not.
            # Python convention says a comment block belongs to the statement below
            # it, but people write trailing notes about the statement ABOVE in the
            # same position. That cost a real lesson once: deleting a constant took
            # "Do not float on :main -- upstream image churn caused SIGILL on Deck"
            # with it, which was about the pinned image on the line before.
            absorbed = [lines[n - 1] for n in range(start, end + 1)
                        if lines[n - 1].strip().startswith("#")]
            for c in absorbed:
                print(f"      COMMENT GOING TOO -> {c.strip()}")
                print("      ^ check this describes the thing being deleted, not its neighbour")

            if args.dry:
                for n in range(start, min(end, start + 3)):
                    print(f"      | {lines[n - 1]}")
                if end - start > 3:
                    print(f"      | ... {end - start - 3} more line(s)")

        kept = "\n".join(l for n, l in enumerate(lines, 1) if n not in drop)
        try:
            ast.parse(kept)
        except SyntaxError as e:
            missing.append(f"{rel}: deleting would break the file ({e})")
            continue
        pending[path] = kept

    if missing:
        print(f"\nRefusing to save. {len(missing)} problem(s):", file=sys.stderr)
        for m in missing:
            print(f"  {m}", file=sys.stderr)
        return 1

    if args.dry:
        print(f"\n{len(targets)} definition(s) would be removed. Nothing written (--dry).")
        return 0

    for path, text in pending.items():
        path.write_text(text, encoding="utf-8")
    print(f"\n{len(targets)} definition(s) removed from {len(pending)} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
