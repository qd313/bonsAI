#!/usr/bin/env python3
"""Title: Phase 2 map and measure

Purpose: Runs every code-inspection tool the clean-up needs in one go and writes
what each one found as a list of named things -- which exports nothing imports,
which back-end code nothing calls, which blocks of code are copy-pasted, which
long functions have nothing explaining them, which files have no purpose line,
how far one setting is spread, and which files are both big and depended on by
many others.

Used for: `python scripts/phase2_map.py` writes one JSON file per list plus a
short summary under docs/audit/refactor-round-two/phase2/. `--only <name>` runs a
single list. `--out <dir>` writes somewhere else. The summary is what a person or
a model reads; the JSON files hold the detail behind every number in it.

Solves: The refactor's delete-and-reshape decisions were about to be made from
counts alone ("126 unused exports") with no way to see which 126. This turns each
count into the actual list, cross-checked against the things that call code by
name at runtime -- the RPC methods, the test harness -- so a name that only looks
dead is not deleted.

Does not: Delete, move or change a single line of code, and does not decide
anything. It reports. It also does not replace scripts/ratchet.py: the ratchet
holds one number per measure and fails a build when one gets worse, while this
writes the list behind those numbers and is run by hand when a phase needs it.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# ratchet.py already knows which files count as app code, how to find a locally
# installed node tool on Windows, and how to read the generated maps. Importing
# it keeps one definition of those rules instead of a second copy that can drift.
import ratchet  # noqa: E402

ROOT = ratchet.ROOT
DEFAULT_OUT = ROOT / "docs" / "audit" / "refactor-round-two" / "phase2"

ARCH = ROOT / "packages" / "bonsai-mcp" / "knowledge" / "architecture"
FE_GRAPH = ARCH / "import-graph.json"
BE_GRAPH = ARCH / "py-import-graph.json"
RPC_MAP = ARCH / "rpc-map.json"
SETTINGS_CONTRACT = ROOT / "tests" / "contracts" / "settings-defaults.json"

# Every search in this phase skips these. Old copies of the repo under
# .claude/worktrees/ would otherwise report every finding twenty times over, and
# archived docs are a record of what was true once, not live code.
SEARCH_SKIP_DIRS = {
    "node_modules", "dist", ".git", "__pycache__", ".claude", "archive",
    ".venv", "venv", "coverage", ".pytest_cache",
}

# Places that call front-end code by name at runtime rather than importing it.
# An export only referenced from here is not dead -- deleting it breaks a test
# run or a preview session, which no import graph can see.
HARNESS_DIRS = ("src/test-harness", "tests", "scripts", "packages/bonsai-mcp")

# Methods on the Plugin class that Decky Loader itself calls. They have no caller
# inside this repo by design, so they must never be read as dead code.
DECKY_LIFECYCLE = {"_main", "_unload", "_migration", "_uninstall", "_unload_watchdog"}


# --------------------------------------------------------------------------- #
# Shared helpers
# --------------------------------------------------------------------------- #


def _rel(path) -> str:
    try:
        return str(Path(path).resolve().relative_to(ROOT)).replace("\\", "/")
    except (ValueError, OSError):
        return str(path).replace("\\", "/")


def _load_json(path: Path):
    return ratchet._load_json(path)


def _searchable_files(suffixes: tuple[str, ...]) -> list[Path]:
    """Every tracked-looking source file, skipping the noise directories."""
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SEARCH_SKIP_DIRS]
        for name in filenames:
            if name.endswith(suffixes):
                out.append(Path(dirpath) / name)
    return out


# Every export name is searched against the same few hundred files, so the file
# contents are read once and kept. Without this the harness cross-check alone
# re-reads the test tree a hundred and twenty times.
_text_cache: dict[str, str] = {}


def _files_mentioning(name: str, files: list[Path]) -> list[str]:
    """Which of `files` contain `name` as a whole word."""
    pattern = re.compile(r"\b" + re.escape(name) + r"\b")
    hits = []
    for f in files:
        key = str(f)
        if key not in _text_cache:
            try:
                _text_cache[key] = f.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                _text_cache[key] = ""
        if pattern.search(_text_cache[key]):
            hits.append(_rel(f))
    return sorted(hits)


# --------------------------------------------------------------------------- #
# 1. Unused front-end exports, files and packages (knip)
# --------------------------------------------------------------------------- #


# An `import {...} from "..."` or `export {...} from "..."` statement, however many
# lines it is spread over. Occurrences of a name inside one of these are moving the
# name around, not using it, so they are subtracted before deciding "nothing uses this".
_IMPORT_BLOCK = re.compile(r"^[ \t]*(?:import|export)\b[\s\S]*?from\s*['\"][^'\"]+['\"]", re.M)
_BARE_EXPORT_LIST = re.compile(r"^[ \t]*export\s*\{[^}]*\}[ \t]*;?[ \t]*$", re.M)

# A name written in a comment is not a use of it. icons.tsx carried a note saying
# one icon is "distinct from PasteClipboardIcon above"; that single mention was
# enough to score the icon as still in use, and it was dead. Comments are blanked
# rather than deleted so every character position still lines up with the real file.
_COMMENT = re.compile(r"/\*[\s\S]*?\*/|//[^\n]*")


def _blank_comments(text: str) -> str:
    return _COMMENT.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)


def _classify_export(name: str, rel_file: str, decl_line, other_files: list[Path]) -> dict:
    """Why is this export unused, and what does that mean for deleting it?

    knip counts three different situations as one number, and they need three
    different fixes: a name used only inside its own file just needs the `export`
    word removed, a name imported here and handed straight back out is a pointless
    middle step, and a name nothing anywhere mentions is the only real dead code.
    """
    path = ROOT / rel_file
    text = ratchet._read_text(path)
    if text is None:
        return {"kind": "unreadable", "fix": "could not read the file"}

    text = _blank_comments(text)
    moving_spans = [m.span() for m in _IMPORT_BLOCK.finditer(text)]
    moving_spans += [m.span() for m in _BARE_EXPORT_LIST.finditer(text)]

    def inside_a_move(pos: int) -> bool:
        return any(s <= pos < e for s, e in moving_spans)

    pattern = re.compile(r"\b" + re.escape(name) + r"\b")
    line_starts = [0]
    for ch in text.split("\n")[:-1]:
        line_starts.append(line_starts[-1] + len(ch) + 1)

    def line_of(pos: int) -> int:
        lo, hi = 0, len(line_starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if line_starts[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1

    imported_here = False
    internal_uses = 0
    for m in pattern.finditer(text):
        if inside_a_move(m.start()):
            imported_here = True
            continue
        if decl_line and line_of(m.start()) == decl_line:
            continue
        internal_uses += 1

    # Check other files FIRST. Getting this order wrong is not a small mistake: an
    # earlier version returned "used inside its own file" as soon as the name was
    # used locally, without ever looking outward, and a name can easily be both
    # used at home and imported elsewhere. Acting on that list took the export word
    # off names that eight other files import, and the type check caught it. The
    # outward check is the one that decides whether the export is needed at all.
    elsewhere = [f for f in _files_mentioning(name, other_files) if f != rel_file]
    if elsewhere:
        return {"kind": "named somewhere else after all",
                "fix": "check by hand before deleting",
                "seen_in": elsewhere[:4]}

    if internal_uses:
        return {"kind": "used inside its own file",
                "fix": "drop the export word, keep the code",
                "internal_uses": internal_uses}
    if imported_here:
        return {"kind": "handed straight back out",
                "fix": "drop the re-export; callers already import it from where it is defined"}

    return {"kind": "nothing mentions it", "fix": "delete it"}


def list_unused_exports() -> dict:
    knip = ratchet._bin_exists("knip")
    if knip is None:
        return {"error": "knip is not installed (pnpm add -D knip)"}
    try:
        proc = subprocess.run(
            [str(knip), "--reporter", "json"],
            cwd=ROOT, capture_output=True, text=True, timeout=300,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"error": f"knip did not run: {e}"}
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {"error": "knip printed something that was not JSON",
                "stderr": proc.stderr[-400:]}

    issues = data.get("issues", []) if isinstance(data, dict) else []
    harness_files = []
    for d in HARNESS_DIRS:
        base = ROOT / d
        if base.exists():
            for dirpath, dirnames, filenames in os.walk(base):
                dirnames[:] = [x for x in dirnames if x not in SEARCH_SKIP_DIRS]
                for n in filenames:
                    if n.endswith((".ts", ".tsx", ".mjs", ".js", ".py", ".json", ".md")):
                        harness_files.append(Path(dirpath) / n)
    # Test files that live next to the code they test count as harness too.
    for f in _searchable_files((".test.ts", ".test.tsx")):
        harness_files.append(f)
    # Everything that could import a frontend name: app code, tests, the harness,
    # the preview code and the tooling. A name only a test imports still needs its
    # export, so the outward check cannot be limited to app code.
    app_files = list(ratchet.fe_app_files()) + harness_files

    # knip reports one object per file; every category inside it is a list of
    # {name, line, col, pos} objects (a "duplicates" entry is a list of those).
    def names_in(items) -> list[dict]:
        out = []
        for item in items if isinstance(items, list) else []:
            if isinstance(item, list):
                out.extend(names_in(item))
            elif isinstance(item, dict) and item.get("name"):
                out.append(item)
            elif isinstance(item, str):
                out.append({"name": item})
        return out

    by_file: dict[str, dict] = {}
    unused_files: list[str] = []
    unused_packages: list[dict] = []
    totals = defaultdict(int)

    for issue in issues:
        if not isinstance(issue, dict):
            continue
        rel = _rel(ROOT / issue.get("file", "")) if issue.get("file") else ""

        for item in names_in(issue.get("files")):
            unused_files.append(item["name"].replace("\\", "/"))
        for key in ("dependencies", "devDependencies", "optionalPeerDependencies"):
            for item in names_in(issue.get(key)):
                unused_packages.append({"package": item["name"], "kind": key, "declared_in": rel})

        entry = by_file.setdefault(rel, {"exports": [], "types": [], "enumMembers": [],
                                         "namespaceMembers": [], "duplicates": []})
        for key in ("exports", "types", "enumMembers", "namespaceMembers", "duplicates"):
            for item in names_in(issue.get(key)):
                name = item["name"]
                referenced = _files_mentioning(name, harness_files)
                verdict = _classify_export(name, rel, item.get("line"), app_files)
                if referenced and verdict["kind"] == "nothing mentions it":
                    verdict = {"kind": "only a test or the harness names it",
                               "fix": "keep, or delete the test with it",
                               "seen_in": referenced[:4]}
                entry[key].append({
                    "name": name,
                    "line": item.get("line"),
                    "referenced_by_harness": referenced[:4],
                    **verdict,
                })
                totals[key] += 1
                totals[verdict["kind"]] += 1

    by_file = {k: v for k, v in by_file.items() if any(v.values())}

    # Careful with this one. "Every export knip flagged here is unreferenced" is
    # NOT the same as "this file is dead": knip only lists the exports it thinks
    # are unused, so a file can appear here and still have other exports that the
    # whole app imports. The import graph settles which is which, and only a file
    # nothing imports at all is safe to delete outright.
    fe_graph = _load_json(FE_GRAPH) or {}
    fe_mods = fe_graph.get("modules", {}) if isinstance(fe_graph, dict) else {}

    delete_whole_file = []
    for rel, e in by_file.items():
        if not e["exports"]:
            continue
        if any(x["kind"] != "nothing mentions it" for bucket in e.values() for x in bucket):
            continue
        if (fe_mods.get(rel) or {}).get("importedBy"):
            continue
        delete_whole_file.append({"file": rel, "flagged_exports": len(e["exports"]) + len(e["types"])})

    # The same finding sorted the way the work is actually done: one bucket per fix.
    by_fix = defaultdict(list)
    for rel, e in by_file.items():
        for bucket in e.values():
            for x in bucket:
                by_fix[x["kind"]].append(f"{rel}:{x.get('line')} {x['name']}")

    top = sorted(by_file.items(), key=lambda kv: -sum(len(v) for v in kv[1].values()))
    return {
        "totals": dict(totals),
        "unused_files": sorted(set(unused_files)),
        "unused_packages": unused_packages,
        "nothing_imports_this_file_and_no_export_is_referenced": delete_whole_file,
        "by_fix": {k: sorted(v) for k, v in sorted(by_fix.items(), key=lambda kv: -len(kv[1]))},
        "by_file": dict(top),
    }


# --------------------------------------------------------------------------- #
# 2. Unused back-end code (vulture, with the RPC surface on an allowlist)
# --------------------------------------------------------------------------- #


def _rpc_method_names() -> set[str]:
    data = _load_json(RPC_MAP)
    methods = data.get("methods", []) if isinstance(data, dict) else []
    out = set()
    for m in methods:
        if isinstance(m, dict) and m.get("name"):
            out.add(m["name"])
        elif isinstance(m, str):
            out.add(m)
    return out


# Attribute names that belong to a library, not to this project. sqlite3 reads
# `row_factory`; asyncio and unittest read the others. Nothing here calls them by
# name, so a dead-code tool always reports them, and deleting one breaks the code.
LIBRARY_OWNED_NAMES = {
    "row_factory", "text_factory", "isolation_level", "daemon", "returncode",
    "maxDiff", "longMessage", "__all__", "__slots__", "encoding", "errors",
}


def _classify_backend_name(name: str, rel_file: str, line: int,
                           be_files: list[Path], test_files: list[Path],
                           script_files: list[Path]) -> dict:
    """Why did the dead-code tool report this, and is it really dead?

    The tool reports a name it never saw read. That covers four very different
    things: code nothing calls, code only the tests call, code only a helper
    script calls, and names a library reads for us. Only the first is dead.
    """
    if name in LIBRARY_OWNED_NAMES:
        return {"kind": "a name a library owns", "fix": "leave it"}

    elsewhere = [f for f in _files_mentioning(name, be_files) if f != rel_file]
    if elsewhere:
        return {"kind": "another back-end file uses it", "fix": "leave it",
                "seen_in": elsewhere[:4]}

    # The dead-code tool is only pointed at main.py and py_modules, so a name a
    # helper script imports looks unused to it. CORPUS_SCHEMA_VERSION was reported
    # dead on 2026-09-13 and is imported by scripts/build_rag_db.py, which writes it
    # into every corpus it builds. Deleting it would have broken corpus building.
    in_scripts = [f for f in _files_mentioning(name, script_files) if f != rel_file]
    if in_scripts:
        return {"kind": "a helper script uses it", "fix": "leave it",
                "seen_in": in_scripts[:4]}

    # Used further down its own file? Then the tool is pointing at a definition
    # that is reached some way it cannot follow, and a person has to look.
    text = ratchet._read_text(ROOT / rel_file) or ""
    hits = [m for m in re.finditer(r"\b" + re.escape(name) + r"\b", text)]
    own_file_uses = max(0, len(hits) - 1)

    in_tests = _files_mentioning(name, test_files)
    if in_tests:
        return {"kind": "only the tests call it", "fix": "delete both, or keep both",
                "seen_in": in_tests[:4], "own_file_uses": own_file_uses}

    # A function argument nobody reads is a signature change, not a deletion.
    decl = text.split("\n")[line - 1] if 0 < line <= len(text.split("\n")) else ""
    if re.match(r"^\s+\w+\s*:", decl) or re.match(r"^\s+\w+\s*=", decl):
        if own_file_uses == 0:
            return {"kind": "an unused argument", "fix": "drop the argument and its callers' use of it"}

    return {"kind": "nothing calls it", "fix": "delete it", "own_file_uses": own_file_uses}


def list_unused_backend() -> dict:
    allow = _rpc_method_names() | DECKY_LIFECYCLE
    # Names the Python test suite calls directly. A helper only a test uses is
    # still a live decision ("is this test worth keeping"), not dead code.
    test_files = [p for p in _searchable_files((".py",))
                  if _rel(p).startswith("tests/") or "/tests/" in _rel(p)]
    script_files = [p for p in _searchable_files((".py", ".mjs"))
                    if _rel(p).startswith("scripts/")]
    be_files = list(ratchet.be_app_files())

    try:
        proc = subprocess.run(
            [sys.executable, "-m", "vulture", "main.py", "py_modules",
             "--min-confidence", "60"],
            cwd=ROOT, capture_output=True, text=True, timeout=180,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"error": f"vulture did not run: {e}"}
    if proc.returncode not in (0, 3):
        return {"error": f"vulture exited {proc.returncode}", "stderr": proc.stderr[-400:]}

    line_pat = re.compile(r"^(?P<file>.+?):(?P<line>\d+): unused (?P<kind>\w+) '(?P<name>[^']+)' \((?P<conf>\d+)% confidence\)")
    findings = []
    allowlisted = []
    for raw in proc.stdout.splitlines():
        m = line_pat.match(raw.strip())
        if not m:
            continue
        name = m.group("name")
        rec = {
            "file": _rel(ROOT / m.group("file")),
            "line": int(m.group("line")),
            "kind": m.group("kind"),
            "name": name,
            "confidence": int(m.group("conf")),
        }
        if name in allow:
            rec["why_kept"] = "on the RPC surface or called by the loader"
            allowlisted.append(rec)
            continue
        rec.update(_classify_backend_name(name, rec["file"], rec["line"], be_files, test_files, script_files))
        if rec["kind"] in ("a name a library owns", "another back-end file uses it", "a helper script uses it"):
            allowlisted.append(rec)
            continue
        findings.append(rec)

    order = {"nothing calls it": 0, "only the tests call it": 1, "an unused argument": 2}
    findings.sort(key=lambda r: (order.get(r["kind"], 9), r["file"], r["line"]))

    # The other half of "nothing calls this": RPC methods the front end never asks for.
    fe_called, _raw_sites, be_names, _note = ratchet._rpc_analysis()
    stranded = sorted(be_names - fe_called) if be_names else []

    by_kind = defaultdict(int)
    for r in findings:
        by_kind[r["kind"]] += 1

    return {
        "totals": {
            "reported": len(findings) + len(allowlisted),
            "needs_a_decision": len(findings),
            "ruled_out": len(allowlisted),
            "rpc_methods_no_frontend_caller": len(stranded),
            **by_kind,
        },
        "rpc_methods_no_frontend_caller": stranded,
        "needs_a_decision": findings,
        "ruled_out": allowlisted,
    }


# --------------------------------------------------------------------------- #
# 3. Copy-pasted code (jscpd)
# --------------------------------------------------------------------------- #


BASE_IGNORE = "**/node_modules/**,**/dist/**,**/.claude/worktrees/**,**/docs/archive/**"


def _jscpd_clones(paths: list[Path], extra_ignore: str = "") -> tuple[list[dict], int | None, str | None]:
    binary = ratchet._bin_exists("jscpd")
    if binary is None:
        return [], None, "jscpd is not installed"
    existing = [p for p in paths if p.exists()]
    if not existing:
        return [], None, "nothing to scan"
    ignore = BASE_IGNORE + ("," + extra_ignore if extra_ignore else "")
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [str(binary), *[str(p) for p in existing],
               "--min-tokens", "50", "--reporters", "json",
               "--output", tmp, "--silent",
               "--ignore", ignore]
        try:
            subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600)
        except (OSError, subprocess.TimeoutExpired) as e:
            return [], None, f"jscpd did not run: {e}"
        report = Path(tmp) / "jscpd-report.json"
        if not report.exists():
            return [], None, "jscpd produced no report"
        data = _load_json(report)
    if not isinstance(data, dict):
        return [], None, "jscpd report was not readable JSON"
    total = ((data.get("statistics") or {}).get("total") or {}).get("duplicatedLines")
    return data.get("duplicates", []) or [], total, None


def _group_clones(clones: list[dict]) -> list[dict]:
    """One row per pair of files, so a decision is 'merge these two' not 'look at 300 fragments'."""
    pairs: dict[tuple[str, str], dict] = {}
    for c in clones:
        a = _rel((c.get("firstFile") or {}).get("name", ""))
        b = _rel((c.get("secondFile") or {}).get("name", ""))
        if not a or not b:
            continue
        key = tuple(sorted((a, b)))
        rec = pairs.setdefault(key, {"files": list(key), "fragments": 0, "lines": 0, "biggest": None})
        lines = c.get("lines") or 0
        rec["fragments"] += 1
        rec["lines"] += lines
        first = c.get("firstFile") or {}
        second = c.get("secondFile") or {}
        if rec["biggest"] is None or lines > rec["biggest"]["lines"]:
            rec["biggest"] = {
                "lines": lines,
                "at": f"{a}:{first.get('start')}-{first.get('end')}",
                "and": f"{b}:{second.get('start')}-{second.get('end')}",
            }
    rows = sorted(pairs.values(), key=lambda r: -r["lines"])
    return rows


def list_duplicates() -> dict:
    app_paths = [ROOT / "src", ROOT / "main.py", ROOT / "py_modules"]
    app_clones, app_total, app_err = _jscpd_clones(app_paths)
    test_clones, test_total, test_err = _jscpd_clones([ROOT / "tests"])

    # The two numbers above are what the ratchet tracks, and both measure more
    # than their name says: "app code" points at src/, which holds the front-end
    # tests too, and "back-end tests" points at tests/, which holds JSON fixtures
    # as well as Python. These two re-runs say how much is really the app and
    # really the Python tests, so a target can be set against the right thing.
    _c, real_app_total, _e = _jscpd_clones(
        app_paths, "**/*.test.ts,**/*.test.tsx,**/test-harness/**")
    _c2, real_py_total, _e2 = _jscpd_clones([ROOT / "tests"], "**/*.json")

    app_rows = _group_clones(app_clones)
    test_rows = _group_clones(test_clones)

    def self_copies(rows):
        return [r for r in rows if r["files"][0] == r["files"][1]]

    # Two different counts, on purpose. "duplicated_lines" is jscpd's own figure
    # and is the one the ratchet tracks. "lines_across_pairs" adds every pair up,
    # so a block copied into three files is counted in each pair -- useful for
    # ranking what to merge first, wrong as a total.
    return {
        "app": {
            "error": app_err,
            "duplicated_lines": app_total,
            "duplicated_lines_excluding_front_end_tests": real_app_total,
            "file_pairs": len(app_rows),
            "lines_across_pairs": sum(r["lines"] for r in app_rows),
            "within_one_file": [r["files"][0] for r in self_copies(app_rows)],
            "top_pairs": app_rows[:40],
        },
        "backend_tests": {
            "error": test_err,
            "duplicated_lines": test_total,
            "duplicated_lines_python_only": real_py_total,
            "file_pairs": len(test_rows),
            "lines_across_pairs": sum(r["lines"] for r in test_rows),
            "top_pairs": test_rows[:25],
        },
    }


# --------------------------------------------------------------------------- #
# 4. Long functions with nothing explaining them
# --------------------------------------------------------------------------- #


def list_long_functions() -> dict:
    fe: dict = {"error": None, "violations": []}
    try:
        proc = subprocess.run(["node", "scripts/ts_long_functions.mjs"],
                              cwd=ROOT, capture_output=True, text=True, timeout=300)
        fe = json.loads(proc.stdout)
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        fe = {"error": f"the front-end scan did not run: {e}", "violations": []}

    be_rows = []
    for path in ratchet.be_app_files():
        text = ratchet._read_text(path)
        if text is None:
            continue
        try:
            tree = ast.parse(text)
        except SyntaxError:
            continue
        for node in ratchet._outermost_py_functions(tree):
            end = getattr(node, "end_lineno", None)
            if end is None:
                continue
            length = end - node.lineno + 1
            if length <= 60:
                continue
            if ast.get_docstring(node):
                continue
            be_rows.append({"file": _rel(path), "name": node.name,
                            "line": node.lineno, "length": length})
    be_rows.sort(key=lambda r: -r["length"])

    fe_rows = sorted(fe.get("violations", []), key=lambda r: -r.get("length", 0))
    by_file = defaultdict(int)
    for r in fe_rows:
        by_file[r["file"]] += 1
    return {
        "frontend": {"count": len(fe_rows), "error": fe.get("error"),
                     "worst_files": sorted(by_file.items(), key=lambda kv: -kv[1])[:15],
                     "violations": fe_rows},
        "backend": {"count": len(be_rows), "violations": be_rows},
    }


# --------------------------------------------------------------------------- #
# 5. Files with no purpose line
# --------------------------------------------------------------------------- #


def list_missing_headers() -> dict:
    try:
        proc = subprocess.run([sys.executable, "scripts/check_headers.py", "--json"],
                              cwd=ROOT, capture_output=True, text=True, timeout=180)
        data = json.loads(proc.stdout)
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        return {"error": f"the header check did not run: {e}"}
    missing = data.get("missing_purpose", [])
    groups = defaultdict(list)
    for rel in missing:
        parent = rel.rsplit("/", 1)[0] if "/" in rel else "."
        groups[parent].append(rel)
    return {
        "count": len(missing),
        "checked": data.get("checked"),
        "by_folder": {k: sorted(v) for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1]))},
        "other_problems": {k: v for k, v in data.items()
                           if k not in ("missing_purpose", "checked") and v},
    }


# --------------------------------------------------------------------------- #
# 6. How far one setting is spread
# --------------------------------------------------------------------------- #


def list_settings_spread() -> dict:
    contract = _load_json(SETTINGS_CONTRACT)
    if not isinstance(contract, dict):
        return {"error": f"{_rel(SETTINGS_CONTRACT)} is not a readable JSON object"}
    names = sorted(contract.keys())
    app_files = [Path(p) for p in ratchet.fe_app_files()] + [Path(p) for p in ratchet.be_app_files()]

    per_setting = {}
    edit_points = {}
    touched = defaultdict(int)
    for name in names:
        hits = _files_mentioning(name, app_files)
        per_setting[name] = hits
        for h in hits:
            touched[h] += 1
        # Lines, not files. Adding a setting means editing every one of these, and
        # one file can hold half a dozen of them, so the file count understates it.
        pattern = re.compile(r"\b" + re.escape(name) + r"\b")
        edit_points[name] = sum(
            1 for f in hits
            for line in (_text_cache.get(str(ROOT / f), "")).split("\n")
            if pattern.search(line)
        )

    # A file that mentions most of the settings is a place every new setting has
    # to be edited -- that is the cost the reshape phase is trying to remove.
    spread = sorted(touched.items(), key=lambda kv: -kv[1])
    # "Knows about every setting" means exactly that: the file names all of them.
    # These are the files a new setting always has to be added to.
    knows_all = [f for f, n in spread if n == len(names)]
    knows_many = [f for f, n in spread if len(names) > n >= max(3, len(names) // 4)]
    counts = sorted((len(v) for v in per_setting.values()))
    median = counts[len(counts) // 2] if counts else 0
    point_counts = sorted(edit_points.values())
    median_points = point_counts[len(point_counts) // 2] if point_counts else 0

    return {
        "settings_counted": len(names),
        "files_a_typical_setting_touches": median,
        "lines_a_typical_setting_touches": median_points,
        "lines_per_setting": dict(sorted(edit_points.items(), key=lambda kv: -kv[1])),
        "most_touched_setting": max(per_setting.items(), key=lambda kv: len(kv[1]))[0] if per_setting else None,
        "files_that_know_about_many_settings": [{"file": f, "settings": n} for f, n in spread[:20]],
        "files_every_new_setting_must_be_edited_in": knows_all,
        "files_that_know_about_a_quarter_or_more": knows_many,
        "per_setting": per_setting,
    }


# --------------------------------------------------------------------------- #
# 7. Big files, and who depends on them (the seam candidates)
# --------------------------------------------------------------------------- #


def list_seam_candidates() -> dict:
    fe_graph = _load_json(FE_GRAPH) or {}
    be_graph = _load_json(BE_GRAPH) or {}
    fe_mods = fe_graph.get("modules", {}) if isinstance(fe_graph, dict) else {}
    be_mods = be_graph.get("modules", {}) if isinstance(be_graph, dict) else {}

    rows = []
    for path in list(ratchet.fe_app_files()) + list(ratchet.be_app_files()):
        rel = _rel(path)
        lines = ratchet._count_lines(path)
        if lines <= 400:
            continue
        mod = fe_mods.get(rel) or be_mods.get(rel) or {}
        rows.append({
            "file": rel,
            "lines": lines,
            "imported_by": len(mod.get("importedBy", []) or []),
            "imports": len(mod.get("imports", []) or []),
        })
    rows.sort(key=lambda r: -r["lines"])

    cycles_be = be_graph.get("cycles", []) if isinstance(be_graph, dict) else []
    cycles_fe = fe_graph.get("cycles", []) if isinstance(fe_graph, dict) else []

    return {
        "files_over_400_lines": len(rows),
        "total_lines_in_them": sum(r["lines"] for r in rows),
        "cycles_backend": cycles_be,
        "cycles_frontend": cycles_fe,
        "rows": rows,
    }


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #


LISTS = {
    "unused-exports": list_unused_exports,
    "unused-backend": list_unused_backend,
    "duplicates": list_duplicates,
    "long-functions": list_long_functions,
    "missing-headers": list_missing_headers,
    "settings-spread": list_settings_spread,
    "seam-candidates": list_seam_candidates,
}


def _summary_lines(results: dict) -> list[str]:
    out = ["# Phase 2: what the tools found", "",
           "Generated by `python scripts/phase2_map.py`. Every number here has a list behind it",
           "in the JSON file named at the end of its section. Nothing in this file is a decision.", ""]

    ue = results.get("unused-exports")
    if ue and not ue.get("error"):
        t = ue.get("totals", {})
        out += [f"## Exports nothing imports: {t.get('exports', 0)} values, {t.get('types', 0)} types",
                "These are not all dead code. Sorted by what actually has to be done:"]
        for kind, items in ue.get("by_fix", {}).items():
            out.append(f"- {len(items)}: {kind}")
        out += [f"- {len(ue.get('nothing_imports_this_file_and_no_export_is_referenced', []))} whole files can go.",
                f"- {len(ue.get('unused_files', []))} files are never imported and "
                f"{len(ue.get('unused_packages', []))} declared packages are never imported -- "
                "check both by hand: a script run as a command, or a package with its own entry "
                "point, looks unused to a tool that only follows imports.",
                "- Detail: unused-exports.json", ""]

    ub = results.get("unused-backend")
    if ub and not ub.get("error"):
        t = ub.get("totals", {})
        out += [f"## Back-end code nothing calls: {t.get('needs_a_decision', 0)} need a decision"]
        for kind in ("nothing calls it", "only the tests call it", "an unused argument"):
            if t.get(kind):
                out.append(f"- {t[kind]}: {kind}")
        out += [f"- {t.get('ruled_out', 0)} more were reported and ruled out: on the RPC surface, "
                "called by the loader, used by another back-end file, or a name a library owns.",
                f"- {t.get('rpc_methods_no_frontend_caller', 0)} back-end methods the front end never asks for: "
                + ", ".join(ub.get("rpc_methods_no_frontend_caller", [])[:10]),
                "- Detail: unused-backend.json", ""]

    du = results.get("duplicates")
    if du:
        a, b = du.get("app", {}), du.get("backend_tests", {})
        out += [f"## Copy-pasted code: {a.get('duplicated_lines', 0)} lines in the app, {b.get('duplicated_lines', 0)} in the back-end tests",
                f"- Of the app figure, only {a.get('duplicated_lines_excluding_front_end_tests', 0)} lines are really app code; "
                "the rest is front-end tests, which the measure counts because they sit in the same folder.",
                f"- Of the back-end test figure, {b.get('duplicated_lines_python_only', 0)} lines are Python; the rest is JSON fixtures.",
                f"- App: {a.get('file_pairs', 0)} pairs of files share code; {len(a.get('within_one_file', []))} files repeat themselves inside one file.",
                f"- Back-end tests: {b.get('file_pairs', 0)} pairs.",
                "- Detail: duplicates.json", ""]
        top = a.get("top_pairs", [])[:3]
        if top:
            out.insert(len(out) - 2, "- Biggest overlaps: " + "; ".join(
                f"{r['files'][0]} and {r['files'][1]} ({r['lines']} lines)" for r in top))

    lf = results.get("long-functions")
    if lf:
        out += [f"## Long functions with nothing explaining them: {lf['frontend']['count']} front end, {lf['backend']['count']} back end",
                "- Worst files: " + ", ".join(f"{f} ({n})" for f, n in lf["frontend"]["worst_files"][:5]),
                "- Detail: long-functions.json", ""]

    mh = results.get("missing-headers")
    if mh and not mh.get("error"):
        out += [f"## Files with no purpose line: {mh.get('count', 0)} of {mh.get('checked', 0)} checked",
                "- Detail: missing-headers.json", ""]

    ss = results.get("settings-spread")
    if ss and not ss.get("error"):
        out += [f"## One setting is spread over many files",
                f"- {ss.get('settings_counted', 0)} settings. A typical one is named on "
                f"{ss.get('lines_a_typical_setting_touches', 0)} lines across {ss.get('files_a_typical_setting_touches', 0)} files.",
                f"- {len(ss.get('files_every_new_setting_must_be_edited_in', []))} files name all "
                f"{ss.get('settings_counted', 0)} settings, so a new setting means editing every one of them; "
                f"{len(ss.get('files_that_know_about_a_quarter_or_more', []))} more name at least a quarter.",
                "- Detail: settings-spread.json", ""]

    sc = results.get("seam-candidates")
    if sc:
        out += [f"## Big files: {sc.get('files_over_400_lines', 0)} over 400 lines, {sc.get('total_lines_in_them', 0)} lines between them",
                f"- Loops in the back end: {len(sc.get('cycles_backend', []))}. Loops in the front end: {len(sc.get('cycles_frontend', []))}.",
                "- Biggest: " + ", ".join(f"{r['file']} ({r['lines']})" for r in sc.get("rows", [])[:5]),
                "- Detail: seam-candidates.json", ""]

    return out


def main(argv=None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(description="Run every phase 2 code-inspection list.")
    parser.add_argument("--only", choices=sorted(LISTS), help="run one list instead of all of them")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="where to write the JSON files and the summary")
    args = parser.parse_args(argv)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    wanted = [args.only] if args.only else list(LISTS)
    results = {}
    for name in wanted:
        print(f"... {name}", flush=True)
        try:
            results[name] = LISTS[name]()
        except Exception as e:  # a broken tool must not lose the lists that did run
            results[name] = {"error": f"{type(e).__name__}: {e}"}
        (out_dir / f"{name}.json").write_text(
            json.dumps(results[name], indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    if not args.only:
        (out_dir / "summary.md").write_text("\n".join(_summary_lines(results)) + "\n", encoding="utf-8")
        print("\n".join(_summary_lines(results)))
    else:
        print(json.dumps(results[args.only], indent=1)[:2000])
    print(f"\nWritten to {_rel(out_dir)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
