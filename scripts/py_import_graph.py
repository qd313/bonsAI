#!/usr/bin/env python3
"""Title: Back-end import graph

Purpose: Map the python import edges among main.py and py_modules/backend/**
the way the Decky loader resolves them, so a refactor can see which service
files depend on which — and which ones sit in an import cycle — before
moving code.
Used for: `.githooks/pre-commit` regenerates and stages
packages/bonsai-mcp/knowledge/architecture/py-import-graph.json on every
commit; `--check` verifies the committed file still matches the source tree.
Solves: The front-end already has import-graph.json; the back end had
nothing, so seeing "what imports settings_service.py" meant grepping by hand.
Does not: Track third-party or standard-library imports, or follow dynamic
`importlib.import_module(...)` calls — only literal `import` / `from import`
statements naming `backend.*` or `main` are counted as edges.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import sys
import warnings

# A couple of existing docstrings use a literal backslash-underscore for
# markdown escaping (e.g. "*\_commands services"); ast.parse validates string
# escapes while building the tree and warns about it. That is pre-existing
# file content, not a graph problem, so it is muted rather than left to spam
# every commit.
warnings.filterwarnings("ignore", category=SyntaxWarning)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(
    REPO_ROOT, "packages", "bonsai-mcp", "knowledge", "architecture", "py-import-graph.json"
)


def to_posix(path: str) -> str:
    return path.replace(os.sep, "/")


def collect_files() -> list:
    """main.py plus every py_modules/**/*.py file — the back-end half of
    CLAUDE.md's app-code definition."""
    files = []
    main_py = os.path.join(REPO_ROOT, "main.py")
    if os.path.isfile(main_py):
        files.append("main.py")

    py_dir = os.path.join(REPO_ROOT, "py_modules")
    for dirpath, dirnames, filenames in os.walk(py_dir):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for fn in filenames:
            if fn.endswith(".py"):
                rel = to_posix(os.path.relpath(os.path.join(dirpath, fn), REPO_ROOT))
                files.append(rel)
    return sorted(files)


def file_to_dotted(file_path_rel: str) -> str:
    """Inverse of dotted_to_path: 'py_modules/backend/services/x.py' -> 'backend.services.x'."""
    rel = file_path_rel
    if rel.startswith("py_modules/"):
        rel = rel[len("py_modules/") :]
    if rel.endswith(".py"):
        rel = rel[:-3]
    if rel.endswith("/__init__"):
        rel = rel[: -len("/__init__")]
    elif rel == "__init__":
        rel = ""
    return rel.replace("/", ".")


def dotted_to_path(dotted: str, file_set: set) -> "str | None":
    """Resolve a dotted module name the way the Decky loader resolves it: both
    the plugin root (repo root) and py_modules sit on sys.path (see
    scripts/run_python_tests.py, which reproduces that for tests), so
    'backend.services.x' means py_modules/backend/services/x.py and a bare
    top-level name like 'main' means main.py at the repo root."""
    if not dotted:
        return None
    rel = dotted.replace(".", "/")
    for cand in (f"py_modules/{rel}.py", f"py_modules/{rel}/__init__.py", f"{rel}.py"):
        if cand in file_set:
            return cand
    return None


def is_internal_dotted(dotted: "str | None") -> bool:
    """Only 'backend.*' and bare 'main' are ever internal; everything else
    (os, typing, decky, third-party packages, ...) is external and skipped
    the same way the front-end grapher skips non-relative specifiers."""
    if not dotted:
        return False
    head = dotted.split(".")[0]
    return head in ("backend", "main")


def extract_edges(file_path_rel: str, file_set: set):
    """Walk the whole AST (not just top-level statements) so a lazy import
    inside a function — used in this repo to break a real circular
    dependency at module-load time — still counts as an edge, matching how
    the front-end grapher scans whole file text rather than only the top."""
    abs_path = os.path.join(REPO_ROOT, file_path_rel)
    with open(abs_path, "r", encoding="utf-8") as fh:
        source = fh.read()
    try:
        tree = ast.parse(source, filename=file_path_rel)
    except SyntaxError as exc:
        print(f"warning: could not parse {file_path_rel}: {exc}", file=sys.stderr)
        return set(), []

    edges = set()
    unresolved = []

    def add_edge(target: "str | None"):
        if target and target != file_path_rel:
            edges.add(target)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                dotted = alias.name
                target = dotted_to_path(dotted, file_set)
                if target:
                    add_edge(target)
                elif is_internal_dotted(dotted):
                    unresolved.append(dotted)

        elif isinstance(node, ast.ImportFrom):
            level = node.level or 0
            module = node.module
            if level > 0:
                # Relative import (none exist in this repo today, but resolve
                # generically): strip (level) package segments from this
                # file's own dotted path, then append the named module.
                own_dotted = file_to_dotted(file_path_rel)
                own_parts = [p for p in own_dotted.split(".") if p]
                is_init = file_path_rel.endswith("__init__.py")
                base_parts = own_parts if is_init else own_parts[:-1]
                strip = level - 1
                if strip > 0:
                    base_parts = base_parts[:-strip] if strip < len(base_parts) else []
                base_dotted = ".".join(base_parts)
                module = f"{base_dotted}.{module}" if module else base_dotted

            if not is_internal_dotted(module):
                continue

            base_target = dotted_to_path(module, file_set)
            for alias in node.names:
                name = alias.name
                if name == "*":
                    add_edge(base_target)
                    continue
                combined = f"{module}.{name}" if module else name
                combined_target = dotted_to_path(combined, file_set)
                if combined_target:
                    add_edge(combined_target)
                elif base_target:
                    add_edge(base_target)
                else:
                    unresolved.append(combined)

    return edges, unresolved


def build_graph():
    files = collect_files()
    file_set = set(files)
    imports = {f: set() for f in files}
    imported_by = {f: set() for f in files}
    unresolved_all = []

    for f in files:
        edges, unresolved = extract_edges(f, file_set)
        for e in edges:
            imports[f].add(e)
            imported_by[e].add(f)
        for spec in unresolved:
            unresolved_all.append({"file": f, "spec": spec})

    return files, imports, imported_by, unresolved_all


def tarjan_scc(graph: dict) -> list:
    """Standard Tarjan strongly-connected-components pass. A cycle is
    reported once per SCC (so four files that all cycle through one central
    file come back as one four-file group), not once per back-edge — a plain
    single-back-edge-per-DFS-call count would instead report that group as
    three separate two-file cycles, which is not what "this file is stuck in
    a cycle with three others" means to a reader."""
    index_counter = [0]
    stack: list = []
    lowlink: dict = {}
    index: dict = {}
    on_stack: dict = {}
    result: list = []

    def strongconnect(node):
        index[node] = index_counter[0]
        lowlink[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        on_stack[node] = True

        for successor in graph.get(node, ()):
            if successor not in index:
                strongconnect(successor)
                lowlink[node] = min(lowlink[node], lowlink[successor])
            elif on_stack.get(successor):
                lowlink[node] = min(lowlink[node], index[successor])

        if lowlink[node] == index[node]:
            comp = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                comp.append(w)
                if w == node:
                    break
            result.append(comp)

    for node in graph:
        if node not in index:
            strongconnect(node)

    return result


def generate() -> dict:
    files, imports, imported_by, unresolved_all = build_graph()
    edge_count = sum(len(v) for v in imports.values())

    raw_cycles = tarjan_scc(imports)
    cycles = sorted(
        (sorted(comp) for comp in raw_cycles if len(comp) > 1),
        key=lambda comp: comp[0],
    )

    leaves = sorted(f for f in files if not imports[f])
    # main.py is the entry point: nothing importing it is expected, same
    # treatment as src/index.tsx in the front-end orphan check.
    orphans = sorted(f for f in files if not imported_by[f] and f != "main.py")
    fan_in = sorted(
        ({"path": f, "count": len(imported_by[f])} for f in files),
        key=lambda d: (-d["count"], d["path"]),
    )
    unresolved_sorted = sorted(unresolved_all, key=lambda d: (d["file"], d["spec"]))
    modules = {
        f: {"imports": sorted(imports[f]), "importedBy": sorted(imported_by[f])}
        for f in sorted(files)
    }

    return {
        "note": (
            "Generated. Python import edges among main.py and py_modules/backend/** "
            "resolved the way the Decky loader sees them (backend.* -> "
            "py_modules/backend/**; see scripts/py_import_graph.py). Standard-library "
            "and third-party imports are excluded."
        ),
        "fileCount": len(files),
        "edgeCount": edge_count,
        "cycles": cycles,
        "leaves": leaves,
        "orphans": orphans,
        "fanIn": fan_in,
        "unresolved": unresolved_sorted,
        "modules": modules,
    }


def render(data: dict) -> str:
    return json.dumps(data, indent=2) + "\n"


def main(argv) -> int:
    parser = argparse.ArgumentParser(description="Generate the back-end python import graph.")
    parser.add_argument("--json", action="store_true", help="print a short summary object")
    parser.add_argument(
        "--check",
        action="store_true",
        help="do not write; exit 1 if the file on disk differs from the generated output",
    )
    args = parser.parse_args(argv)

    data = generate()
    text = render(data)
    summary = {
        "modules": data["fileCount"],
        "edges": data["edgeCount"],
        "cycles": data["cycles"],
        "leaves": len(data["leaves"]),
    }

    if args.check:
        current = None
        if os.path.isfile(OUT_PATH):
            with open(OUT_PATH, "r", encoding="utf-8") as fh:
                current = fh.read()
        stale = current != text
        if args.json:
            print(json.dumps(summary))
        elif stale:
            print(
                f"stale: {to_posix(os.path.relpath(OUT_PATH, REPO_ROOT))} does not match "
                "the generated output - run `python scripts/py_import_graph.py`",
                file=sys.stderr,
            )
        else:
            print(f"{to_posix(os.path.relpath(OUT_PATH, REPO_ROOT))} is up to date")
        return 1 if stale else 0

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)

    if args.json:
        print(json.dumps(summary))
    else:
        rel = to_posix(os.path.relpath(OUT_PATH, REPO_ROOT))
        print(
            f"wrote {rel} ({data['fileCount']} modules, {data['edgeCount']} edges, "
            f"{len(data['cycles'])} cycles, {len(data['leaves'])} leaves)"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
