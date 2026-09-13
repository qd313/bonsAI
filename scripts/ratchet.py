"""Title: Refactor ratchet

Purpose: Measure a fixed list of code-health numbers for the phase 0 refactor and
    compare today's numbers against the best ever recorded, so a build can fail
    the moment one of them gets worse instead of after it quietly slides for weeks.
Used for: `python scripts/ratchet.py measure|check|update`, called by hand today
    and by the phase 0 verify script once it lands. Every number here is one the
    refactor is only allowed to improve — see docs/planning/51-refactor-round-two.md
    section B2 for the plan this implements.
Solves: Without a fixed set of numbers checked on every change, "the refactor made
    things better" is just an opinion. This turns that opinion into a table that
    can go red.
Does not: Fix anything itself, or decide what counts as "good enough" — the target
    values in scripts/ratchet.json are goals to work toward, not thresholds this
    script enforces. The only thing `check` enforces is "not worse than the best
    ever measured".

Commands
--------
    python scripts/ratchet.py measure [--json]
        Measure every metric this run and print the results. Exit 0 unless the
        script itself broke (a metric it cannot measure is not a failure -- it is
        printed as "n/a" with a one-line reason and otherwise ignored).

    python scripts/ratchet.py check [--json]
        Measure, then compare against scripts/ratchet.json. Exit 1 if any metric
        with a recorded best got worse; exit 0 otherwise. The plain-text mode
        prints only the metrics that got worse (at most 40 lines) -- a clean run
        prints nothing.

    python scripts/ratchet.py update [--metric NAME] [--force]
        Measure, then write today's numbers into scripts/ratchet.json wherever
        they are better than the recorded best (or the recorded best is not known
        yet). Refuses to record a worse number unless --force is given. --metric
        limits this to one metric.

A metric that cannot be measured right now (a tool is not installed yet, or a
file another lane has not written yet) is not an error: it is recorded as `null`
and `check` skips it without comment. See MISSING TOOLS in each metric function
below for exactly which ones this applies to today.

Standard library only. Runs on Windows and Linux without any project dependency
being installed first (the metrics that DO need a dependency -- jscpd, knip --
degrade to "not measured" when that dependency is not there).
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path
from typing import Callable, Optional

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"
RATCHET_JSON = SCRIPTS_DIR / "ratchet.json"
TS_LONG_FUNCTIONS_SCRIPT = SCRIPTS_DIR / "ts_long_functions.mjs"

LONG_FUNCTION_LINES = 60

# The only four places CLAUDE.md says are allowed to bypass callDeckyWithTimeout.
ALLOWED_RAW_CALL_METHODS = {
    "clear_plugin_data",
    "install_rag_corpus_local",
    "start_voice_transcription",
    "stop_voice_transcription",
}

EXCLUDED_DIR_NAMES = {"node_modules", "dist", ".git", "__pycache__"}

# Never counted as duplication anywhere: installed packages, build output, old
# copies of the repo, and archived write-ups.
BASE_JSCPD_IGNORE = "**/node_modules/**,**/dist/**,**/.claude/worktrees/**,**/docs/archive/**"

# Backend methods that have no frontend caller ON PURPOSE. Without these the
# "nothing calls this" number reads 3 when only one is a real finding.
#   ask_ollama   - the backend calls it itself, from game_ai_request.py. Deleting
#                  it stops the AI answering anything.
#   dbg_fe_log   - a logging hook used when testing on the Deck and the Deck
#                  cannot reach the PC. Having no caller is the point of it.
# ask_game_ai is deliberately NOT here: it is the older foreground ask path and a
# real finding, held for now by the 2026-09-13 decision.
RPC_METHODS_WITHOUT_A_FRONTEND_CALLER_BY_DESIGN = {
    "ask_ollama",
    "dbg_fe_log",
}


# --------------------------------------------------------------------------- #
# Small helpers shared by more than one metric
# --------------------------------------------------------------------------- #


def _to_posix(path: Path) -> str:
    """Forward slashes always, so the same run reads the same on Windows and Linux."""
    return path.relative_to(ROOT).as_posix()


def _walk_files(base: Path, suffixes: tuple[str, ...], skip_dir_names: set[str] = frozenset()):
    if not base.exists():
        return
    for entry in sorted(base.iterdir()):
        if entry.is_dir():
            if entry.name in EXCLUDED_DIR_NAMES or entry.name in skip_dir_names:
                continue
            yield from _walk_files(entry, suffixes, skip_dir_names)
        elif entry.suffix in suffixes:
            yield entry


def fe_app_files() -> list[Path]:
    """src/**/*.ts and *.tsx, excluding *.test.* and src/test-harness/."""
    src = ROOT / "src"
    out = []
    for f in _walk_files(src, (".ts", ".tsx"), skip_dir_names={"test-harness"}):
        if ".test." in f.name:
            continue
        out.append(f)
    return out


def be_app_files() -> list[Path]:
    """main.py plus py_modules/**/*.py."""
    out = []
    main_py = ROOT / "main.py"
    if main_py.exists():
        out.append(main_py)
    out.extend(_walk_files(ROOT / "py_modules", (".py",)))
    return out


def _read_text(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def _count_lines(path: Path) -> int:
    data = path.read_bytes()
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def _bin_exists(name: str) -> Optional[Path]:
    """Look for a locally-installed CLI tool's binary under node_modules/.bin.

    Deliberately does not fall back to a PATH-wide `shutil.which`: a tool that
    happens to be on some other project's PATH is not "installed here", and the
    point of this check is "did this repo actually add the dependency yet".
    """
    bin_dir = ROOT / "node_modules" / ".bin"
    # Order matters on Windows. The extension-less file in .bin is a Unix shell
    # script; handing it to CreateProcess fails with "not a valid Win32
    # application". The .cmd wrapper next to it is the one Windows can run, so
    # try that first there and the plain name first everywhere else.
    if os.name == "nt":
        candidates = (f"{name}.cmd", f"{name}.CMD", name)
    else:
        candidates = (name, f"{name}.cmd", f"{name}.CMD")
    for candidate in candidates:
        p = bin_dir / candidate
        if p.exists():
            return p
    return None


def _load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


# --------------------------------------------------------------------------- #
# Metric 1: files over 400 lines, app code both sides
# --------------------------------------------------------------------------- #


def metric_files_over_400_lines():
    files = fe_app_files() + be_app_files()
    over = [f for f in files if _count_lines(f) > 400]
    return len(over), None


# --------------------------------------------------------------------------- #
# Metric 2: outermost front-end functions over 60 lines with no leading comment
# --------------------------------------------------------------------------- #


def metric_fe_long_functions_uncommented():
    if not TS_LONG_FUNCTIONS_SCRIPT.exists():
        return None, "scripts/ts_long_functions.mjs is missing"
    node = shutil.which("node")
    if node is None:
        return None, "node is not on PATH"
    try:
        proc = subprocess.run(
            [node, str(TS_LONG_FUNCTIONS_SCRIPT)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f"ts_long_functions.mjs did not run: {e}"
    if proc.returncode != 0:
        return None, f"ts_long_functions.mjs exited {proc.returncode}: {proc.stderr.strip()[:200]}"
    try:
        data = json.loads(proc.stdout)
        return int(data["count"]), None
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None, "ts_long_functions.mjs printed something unexpected"


# --------------------------------------------------------------------------- #
# Metric 3: back-end functions over 60 lines with no docstring
# --------------------------------------------------------------------------- #


def _outermost_py_functions(tree: ast.AST) -> list[ast.AST]:
    """Functions not themselves written inside another function.

    A method on a class counts (the class is not a function), but a function
    defined inside another function's body does not -- the outer one already
    covers those lines.
    """
    result: list[ast.AST] = []

    def visit(node: ast.AST) -> None:
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                result.append(child)
                # Do not recurse into it: nothing inside is "outermost".
            else:
                visit(child)

    visit(tree)
    return result


def metric_be_long_functions_no_docstring():
    violations = 0
    for path in be_app_files():
        text = _read_text(path)
        if text is None:
            continue
        try:
            with warnings.catch_warnings():
                # A handful of existing docstrings trip Python's own
                # invalid-escape-sequence warning; that is a pre-existing quirk
                # of those files, not something this metric is about.
                warnings.simplefilter("ignore", SyntaxWarning)
                tree = ast.parse(text, filename=str(path))
        except SyntaxError:
            continue
        for fn in _outermost_py_functions(tree):
            end = getattr(fn, "end_lineno", None)
            if end is None:
                continue
            length = end - fn.lineno + 1
            if length > LONG_FUNCTION_LINES and not ast.get_docstring(fn):
                violations += 1
    return violations, None


# --------------------------------------------------------------------------- #
# Metrics 4-5: duplicate lines via jscpd (not installed as of phase 0 lane A)
# --------------------------------------------------------------------------- #


def _run_jscpd(paths: list[Path], extra_ignore: str = "") -> tuple[Optional[int], Optional[str]]:
    jscpd_bin = _bin_exists("jscpd")
    if jscpd_bin is None:
        return None, "jscpd is not installed yet (planned as a dev dependency, see docs/planning/51-refactor-round-two.md B3)"
    existing = [str(p) for p in paths if p.exists()]
    if not existing:
        return None, "jscpd: none of the target paths exist"
    ignore = BASE_JSCPD_IGNORE + ("," + extra_ignore if extra_ignore else "")
    with tempfile.TemporaryDirectory(prefix="bonsai-jscpd-") as tmp:
        try:
            proc = subprocess.run(
                [
                    str(jscpd_bin),
                    *existing,
                    "--min-tokens",
                    "50",
                    "--reporters",
                    "json",
                    "--output",
                    tmp,
                    "--silent",
                    # jscpd 5 is a rewrite with a different command line: there is no
                    # --gitignore switch any more, so the paths we never want counted
                    # have to be named here instead.
                    "--ignore",
                    ignore,
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=180,
            )
        except (OSError, subprocess.TimeoutExpired) as e:
            return None, f"jscpd did not run: {e}"
        # jscpd exits non-zero when it finds duplicates above its own threshold
        # (unrelated to whether it ran successfully), so a report file on disk is
        # the real success signal, not the exit code.
        report_path = Path(tmp) / "jscpd-report.json"
        if not report_path.exists():
            return None, f"jscpd produced no report (exit {proc.returncode}): {proc.stderr.strip()[:200]}"
        data = _load_json(report_path)
        if not isinstance(data, dict):
            return None, "jscpd report was not readable JSON"
        stats = data.get("statistics", {})
        total = stats.get("total", {}) if isinstance(stats, dict) else {}
        duplicated = total.get("duplicatedLines") if isinstance(total, dict) else None
        if not isinstance(duplicated, int):
            return None, "jscpd report did not have statistics.total.duplicatedLines"
        return duplicated, None


def metric_duplicate_lines_app():
    # App code means app code. src/ also holds the frontend tests (*.test.ts and
    # the test harness), and counting those here was hiding what this number is
    # for: before 2026-09-13 it read 1847, of which only 877 was the app. Frontend
    # test duplication is real but it is a different job with a different risk, so
    # it does not belong in the app figure.
    return _run_jscpd(
        [ROOT / "src", ROOT / "main.py", ROOT / "py_modules"],
        "**/*.test.ts,**/*.test.tsx,**/test-harness/**",
    )


def metric_duplicate_lines_be_tests():
    # "Back-end tests" = the Python test files. tests/ also holds JSON fixtures
    # (the saved preview-suite runs), and repeated blocks in those are data, not
    # code anybody would hand-edit. Counting them read 2286 where the Python is 2076.
    return _run_jscpd([ROOT / "tests"], "**/*.json")


# --------------------------------------------------------------------------- #
# Metric 6: unused front-end exports via knip (not installed as of phase 0 lane A)
# --------------------------------------------------------------------------- #


def metric_unused_exports_fe():
    knip_bin = _bin_exists("knip")
    if knip_bin is None:
        return None, "knip is not installed yet (planned as a dev dependency, see docs/planning/51-refactor-round-two.md B3)"
    try:
        proc = subprocess.run(
            [str(knip_bin), "--reporter", "json"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=180,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f"knip did not run: {e}"
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None, "knip printed something that was not JSON"
    if isinstance(data, dict) and "issues" in data:
        issues = data["issues"]
        count = 0
        for issue in issues if isinstance(issues, list) else []:
            for key in ("exports", "nsExports", "duplicates", "unlisted"):
                v = issue.get(key) if isinstance(issue, dict) else None
                if isinstance(v, list):
                    count += len(v)
        return count, None
    return None, "knip report did not have the expected shape"


# --------------------------------------------------------------------------- #
# Metrics 7-8: import cycles
# --------------------------------------------------------------------------- #


def _cycle_count_from(path: Path) -> tuple[Optional[int], Optional[str]]:
    if not path.exists():
        return None, f"{_to_posix(path)} does not exist yet"
    data = _load_json(path)
    if not isinstance(data, dict) or "cycles" not in data:
        return None, f"{_to_posix(path)} did not have a top-level 'cycles' list"
    cycles = data["cycles"]
    if not isinstance(cycles, list):
        return None, f"{_to_posix(path)}'s 'cycles' field was not a list"
    return len(cycles), None


def metric_import_cycles_be():
    return _cycle_count_from(ROOT / "packages/bonsai-mcp/knowledge/architecture/py-import-graph.json")


def metric_import_cycles_fe():
    return _cycle_count_from(ROOT / "packages/bonsai-mcp/knowledge/architecture/import-graph.json")


# --------------------------------------------------------------------------- #
# RPC call-site scanning, shared by metrics 9, 11 and 12
# --------------------------------------------------------------------------- #

# `callDeckyWithTimeout<[Args], Result>("method_name", ...)` -- the generic type
# arguments can themselves contain angle brackets (`Record<string, string>`), so
# instead of trying to balance `<...>` we scan forward, non-greedy, for the first
# quoted identifier. Type arguments never contain quotes in this codebase, so the
# first quote found is always the method name.
_PAT_WRAPPED_CALL = re.compile(r"callDeckyWithTimeout\s*(?:<[\s\S]*?>)?\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]")

# Raw `call("method_name")` / `call<Args, Result>("method_name")`. The negative
# lookbehind keeps this from matching `x.call(...)` (plain JS Function.call), and
# `\bcall\b` keeps it from matching inside `callDeckyWithTimeout(` (no boundary
# between "call" and the "D" that follows it there).
_PAT_RAW_CALL = re.compile(r"(?<!\.)\bcall\b\s*(?:<[\s\S]*?>)?\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]")

_RPC_MAP_PATH = ROOT / "packages/bonsai-mcp/knowledge/architecture/rpc-map.json"

_rpc_analysis_cache = None


def _rpc_analysis():
    """Every RPC method name called from the frontend, every raw (unwrapped)
    call site, and every backend method name from the generated RPC map.

    Scoped to frontend app code (production code, not tests) because a call site
    that only exists in a test mock cannot actually strand the UI or hit a typo'd
    backend method on a real device.
    """
    global _rpc_analysis_cache
    if _rpc_analysis_cache is not None:
        return _rpc_analysis_cache

    fe_called: set[str] = set()
    raw_sites: list[tuple[str, str]] = []
    for path in fe_app_files():
        text = _read_text(path) or ""
        for m in _PAT_WRAPPED_CALL.finditer(text):
            fe_called.add(m.group(1))
        for m in _PAT_RAW_CALL.finditer(text):
            fe_called.add(m.group(1))
            raw_sites.append((_to_posix(path), m.group(1)))

    be_methods: Optional[set[str]] = None
    be_note = None
    rpc_map = _load_json(_RPC_MAP_PATH)
    if isinstance(rpc_map, dict) and isinstance(rpc_map.get("methods"), list):
        be_methods = {
            m["name"]
            for m in rpc_map["methods"]
            if isinstance(m, dict) and isinstance(m.get("name"), str)
        }
    else:
        be_note = f"{_to_posix(_RPC_MAP_PATH)} did not have the expected shape"

    _rpc_analysis_cache = (fe_called, raw_sites, be_methods, be_note)
    return _rpc_analysis_cache


def metric_raw_call_sites():
    _fe_called, raw_sites, _be_methods, _note = _rpc_analysis()
    violations = [s for s in raw_sites if s[1] not in ALLOWED_RAW_CALL_METHODS]
    return len(violations), None


def metric_fe_calls_with_no_be_method():
    fe_called, _raw_sites, be_methods, note = _rpc_analysis()
    if be_methods is None:
        return None, note
    return len(fe_called - be_methods), None


def metric_be_methods_with_no_caller():
    """Backend methods the frontend never asks for, minus the ones that are like
    that on purpose (see RPC_METHODS_WITHOUT_A_FRONTEND_CALLER_BY_DESIGN)."""
    fe_called, _raw_sites, be_methods, note = _rpc_analysis()
    if be_methods is None:
        return None, note
    stranded = be_methods - fe_called - RPC_METHODS_WITHOUT_A_FRONTEND_CALLER_BY_DESIGN
    return len(stranded), None


# --------------------------------------------------------------------------- #
# Metric 10: files without a purpose header
# --------------------------------------------------------------------------- #


def metric_files_without_purpose_header():
    check_headers = SCRIPTS_DIR / "check_headers.py"
    if not check_headers.exists():
        return None, "scripts/check_headers.py does not exist yet (a different phase 0 lane adds it)"
    python = sys.executable or "python"
    try:
        proc = subprocess.run(
            [python, str(check_headers), "--json"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f"check_headers.py did not run: {e}"
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None, "check_headers.py --json did not print JSON"
    missing = data.get("missing_purpose") if isinstance(data, dict) else None
    if not isinstance(missing, list):
        return None, "check_headers.py --json had no 'missing_purpose' list"
    return len(missing), None


# --------------------------------------------------------------------------- #
# Metric 13: settings field list repeated in usePluginSettings.ts
# --------------------------------------------------------------------------- #
#
# THE RULE (deterministic, line-based -- there is no AST for "the same list of
# fields written out again"):
#
# 1. A line "matches" if, stripped, it is one of:
#      - `key: normalized.snake_case,`         (an object literal built from state)
#      - `setSomething(...);`                  (a setter call, one per line)
#      - `const [x, setX] = useState(...)`     (a state declaration)
#      - `identifier,`                         (a bare name -- shorthand property,
#                                                 a dependency-array entry, or a
#                                                 return-object entry)
# 2. A line is "neutral" (does not break a run, but does not extend it either) if
#    it is blank, a comment, or made up only of brace/paren/bracket/comma
#    punctuation (`}, [`, `};`, and so on).
# 3. Anything else breaks a run.
# 4. `const [x, setX] = useState<T>(` sometimes wraps its default value onto the
#    next one or two lines when the line would otherwise be too long. Those
#    continuation lines are joined back onto the declaration line first (bounded
#    to 5 lookahead lines) so a single wrapped declaration is not miscounted as a
#    "break".
# 5. A run of 8 or more consecutive matching lines (neutral lines don't count
#    against the run, but don't extend it either) is "one place the field list is
#    repeated". The count is the number of such runs in the file.
#
# This was checked by hand against the file as it stood on 2026-09-13: it finds
# exactly the 7 places CLAUDE.md's settings section names (state, snapshot,
# hydrate, load-failure reset, debounce deps, the returned object, the save
# snapshot). If the settings hook is later rewritten around a single field table,
# this rule may undercount what remains (a table literal has a different shape
# than any of the four patterns above) -- that direction is safe: it can only
# make the number look better than it is, never worse, and "better than reality"
# cannot fail this ratchet.

_PROP_COLON = re.compile(r"^[A-Za-z0-9_]+:\s*normalized\.[a-zA-Z0-9_]+,?$")
_SETTER_CALL = re.compile(r"^set[A-Za-z0-9_]+\(.*\);?$")
_STATE_DECL = re.compile(r"^const \[[A-Za-z0-9_]+,\s*set[A-Za-z0-9_]+\]\s*=\s*useState\b")
_BARE_IDENT = re.compile(r"^[A-Za-z0-9_]+,$")
_PUNCT_ONLY = re.compile(r"^[{}\[\]();,]+$")
_MIN_RUN_LENGTH = 8


def _settings_line_matches(stripped: str) -> bool:
    return bool(
        _PROP_COLON.match(stripped)
        or _SETTER_CALL.match(stripped)
        or _STATE_DECL.match(stripped)
        or _BARE_IDENT.match(stripped)
    )


def _settings_line_neutral(stripped: str) -> bool:
    if not stripped:
        return True
    if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
        return True
    return bool(_PUNCT_ONLY.match(re.sub(r"\s+", "", stripped)))


def _merge_wrapped_state_decls(lines: list[str]) -> list[str]:
    out = []
    i = 0
    n = len(lines)
    while i < n:
        stripped = lines[i].strip()
        if _STATE_DECL.match(stripped):
            depth = lines[i].count("(") - lines[i].count(")")
            buf = stripped
            j = i + 1
            while depth > 0 and j < n and j < i + 6:
                buf += " " + lines[j].strip()
                depth += lines[j].count("(") - lines[j].count(")")
                j += 1
            out.append(buf)
            i = j
        else:
            out.append(lines[i])
            i += 1
    return out


def _count_field_list_runs(text: str) -> int:
    lines = _merge_wrapped_state_decls(text.splitlines())
    runs = 0
    run_length = 0
    for line in lines:
        stripped = line.strip()
        if _settings_line_matches(stripped):
            run_length += 1
        elif _settings_line_neutral(stripped):
            pass
        else:
            if run_length >= _MIN_RUN_LENGTH:
                runs += 1
            run_length = 0
    if run_length >= _MIN_RUN_LENGTH:
        runs += 1
    return runs


def metric_settings_field_list_repeats():
    path = ROOT / "src/hooks/usePluginSettings.ts"
    text = _read_text(path)
    if text is None:
        return None, "src/hooks/usePluginSettings.ts not found"
    return _count_field_list_runs(text), None


# --------------------------------------------------------------------------- #
# Metric 14: doc sizes
# --------------------------------------------------------------------------- #


def _doc_size_kb(rel_path: str):
    """Size of a document in KB, counted with line endings normalised.

    Not `st_size`. Git hands out CRLF line endings on Windows, and whether a given checkout
    actually has them depends on when the file was last written and by what. That made the
    same unchanged document measure 13.04 KB in the main checkout and 13.26 KB in a fresh
    copy -- one byte per line -- so every lane failed this check for a reason that had
    nothing to do with its work. Counting the text with `\\n` endings gives every checkout
    the same answer.
    """
    path = ROOT / rel_path
    if not path.exists():
        return None, f"{rel_path} not found"
    raw = path.read_bytes().replace(b"\r\n", b"\n")
    return round(len(raw) / 1024, 2), None


def metric_doc_size_kb_roadmap():
    return _doc_size_kb("docs/roadmap.md")


def metric_doc_size_kb_testing():
    return _doc_size_kb("docs/testing.md")


def metric_doc_size_kb_claude():
    return _doc_size_kb("CLAUDE.md")


def metric_doc_size_kb_agents():
    return _doc_size_kb("AGENTS.md")


# --------------------------------------------------------------------------- #
# Metric 15: live docs still mentioning Cursor
# --------------------------------------------------------------------------- #
#
# A plain case-insensitive search for "cursor" is useless here: this plugin is
# full of D-pad and text-cursor UI code, and a whole-word search for "cursor"
# matches well over 30 current docs for that reason alone. What we actually want
# is mentions of the Cursor *tool* that is being retired -- the old flat
# `.cursorrules` file, the "no cursor/* branches" policy line, and prose that
# names the Cursor editor/AI as a proper noun -- while leaving alone the still-
# current `.cursor/rules/*.mdc` per-control focus-graph convention that CLAUDE.md
# itself requires (see "New Settings/QAM controls need a focus-graph entry").
_CURSOR_MENTION = re.compile(r"\.cursorrules\b|\bcursor/\*|\bCursor\b(?!/rules/)")


def metric_live_docs_mentioning_cursor():
    docs = ROOT / "docs"
    if not docs.exists():
        return None, "docs/ not found"
    count = 0
    for entry in sorted(docs.rglob("*")):
        if not entry.is_file():
            continue
        rel_parts = entry.relative_to(docs).parts
        # What this metric is for: no LIVE guidance should still tell anyone to use the
        # editor that was dropped. The archive, the audit folder and the planning folder are
        # dated records of what happened and why -- including the removal itself -- so a
        # mention there is the record working, not a leftover. Counting them means the
        # handover note describing the removal makes the check fail.
        if rel_parts and rel_parts[0] in ("archive", "audit", "planning"):
            continue
        if "changelog" in entry.name.lower():
            continue
        text = _read_text(entry)
        if text is None:
            continue
        if _CURSOR_MENTION.search(text):
            count += 1
    return count, None


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #

MEASURERS: dict[str, Callable[[], tuple[Optional[int | float], Optional[str]]]] = {
    "files_over_400_lines": metric_files_over_400_lines,
    "fe_long_functions_uncommented": metric_fe_long_functions_uncommented,
    "be_long_functions_no_docstring": metric_be_long_functions_no_docstring,
    "duplicate_lines_app": metric_duplicate_lines_app,
    "duplicate_lines_be_tests": metric_duplicate_lines_be_tests,
    "unused_exports_fe": metric_unused_exports_fe,
    "import_cycles_be": metric_import_cycles_be,
    "import_cycles_fe": metric_import_cycles_fe,
    "raw_call_sites": metric_raw_call_sites,
    "files_without_purpose_header": metric_files_without_purpose_header,
    "fe_calls_with_no_be_method": metric_fe_calls_with_no_be_method,
    "be_methods_with_no_caller": metric_be_methods_with_no_caller,
    "settings_field_list_repeats": metric_settings_field_list_repeats,
    "doc_size_kb_roadmap": metric_doc_size_kb_roadmap,
    "doc_size_kb_testing": metric_doc_size_kb_testing,
    "doc_size_kb_claude": metric_doc_size_kb_claude,
    "doc_size_kb_agents": metric_doc_size_kb_agents,
    "live_docs_mentioning_cursor": metric_live_docs_mentioning_cursor,
}


def measure_all() -> tuple[dict[str, Optional[float]], dict[str, str]]:
    values: dict[str, Optional[float]] = {}
    notes: dict[str, str] = {}
    for metric_id, fn in MEASURERS.items():
        try:
            value, note = fn()
        except Exception as e:  # noqa: BLE001 -- a broken metric is not a broken ratchet
            value, note = None, f"measurement crashed: {e}"
        values[metric_id] = value
        if note:
            notes[metric_id] = note
    return values, notes


# --------------------------------------------------------------------------- #
# ratchet.json load/save
# --------------------------------------------------------------------------- #


def load_ratchet_file() -> dict:
    if not RATCHET_JSON.exists():
        return {}
    data = _load_json(RATCHET_JSON)
    return data if isinstance(data, dict) else {}


def save_ratchet_file(data: dict) -> None:
    # newline="\n" always: without it, Python's text-mode write turns this into
    # CRLF on Windows, which then shows every line as changed in a diff taken on
    # Linux (or in this repo's own git history, which keeps the other generated
    # architecture JSON files LF-only for the same reason).
    with open(RATCHET_JSON, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(data, indent=2) + "\n")


def _metric_entries(ratchet_data: dict):
    for key, entry in ratchet_data.items():
        if key.startswith("_"):
            continue
        if isinstance(entry, dict):
            yield key, entry


def _is_worse(current: float, best: float, direction: str) -> bool:
    if direction == "higher_is_better":
        return current < best
    return current > best  # lower_is_better (the default assumption)


def _is_better(current: float, best: float, direction: str) -> bool:
    if direction == "higher_is_better":
        return current > best
    return current < best


# --------------------------------------------------------------------------- #
# Commands
# --------------------------------------------------------------------------- #


def cmd_measure(as_json: bool) -> int:
    values, notes = measure_all()
    ratchet_data = load_ratchet_file()
    if as_json:
        print(json.dumps(values, indent=2, sort_keys=True))
        for metric_id, note in notes.items():
            print(f"note: {metric_id}: {note}", file=sys.stderr)
        return 0

    label_width = max((len(_label_for(ratchet_data, m)) for m in MEASURERS), default=10)
    print(f"{'metric'.ljust(label_width)}  value")
    print(f"{'-' * label_width}  -----")
    for metric_id in MEASURERS:
        label = _label_for(ratchet_data, metric_id)
        value = values[metric_id]
        shown = "n/a" if value is None else _fmt(value)
        print(f"{label.ljust(label_width)}  {shown}")
    if notes:
        print()
        print("Some numbers could not be measured this run:")
        seen = set()
        for metric_id, note in notes.items():
            if note in seen:
                continue
            seen.add(note)
            print(f"  - {note}")
    return 0


def _label_for(ratchet_data: dict, metric_id: str) -> str:
    entry = ratchet_data.get(metric_id)
    if isinstance(entry, dict) and isinstance(entry.get("label"), str):
        return entry["label"]
    return metric_id


def _fmt(value) -> str:
    if isinstance(value, float) and value == int(value):
        return str(int(value))
    return str(value)


def cmd_check(as_json: bool) -> int:
    values, _notes = measure_all()
    ratchet_data = load_ratchet_file()
    regressions = []
    advisories = []
    checked = 0
    skipped = 0
    for metric_id, entry in _metric_entries(ratchet_data):
        best = entry.get("best")
        current = values.get(metric_id)
        if best is None or current is None:
            skipped += 1
            continue
        checked += 1
        direction = entry.get("direction", "lower_is_better")
        # A ceiling suits a number that legitimately drifts up in normal use but must never
        # balloon. The roadmap and the testing doc gain a line every time work lands, so
        # "may only shrink" would block the bookkeeping every landing owes; "must stay under
        # this" keeps them honest without fighting ordinary use. A breached ceiling is a real
        # failure even on a metric that is otherwise only advisory.
        ceiling = entry.get("ceiling")
        if ceiling is not None and current > ceiling:
            regressions.append(
                {
                    "id": metric_id,
                    "label": entry.get("label", metric_id),
                    "current": current,
                    "best": best,
                    "direction": direction,
                    "ceiling": ceiling,
                }
            )
            continue
        if _is_worse(current, best, direction):
            row = {
                "id": metric_id,
                "label": entry.get("label", metric_id),
                "current": current,
                "best": best,
                "direction": direction,
            }
            # An advisory metric is one that is allowed to get worse for now, for a written
            # reason, and is reported rather than enforced. The roadmap and the testing doc
            # grow by a line every time work lands; they only start shrinking when phase 1
            # splits them, and until then blocking on their size would block the bookkeeping
            # that every landing owes. Phase 1 clears the flag.
            if entry.get("advisory"):
                row["why_allowed"] = entry.get("advisory_reason", "allowed to grow for now")
                advisories.append(row)
            else:
                regressions.append(row)

    if as_json:
        print(
            json.dumps(
                {
                    "regressions": regressions,
                    "advisories": advisories,
                    "checked": checked,
                    "skipped": skipped,
                },
                indent=2,
            )
        )
        return 1 if regressions else 0

    for r in regressions[:40]:
        if "ceiling" in r:
            print(f"{r['label']} is over its ceiling: {_fmt(r['current'])} (must stay under {_fmt(r['ceiling'])}).")
            continue
        word = "dropped to" if r["direction"] == "higher_is_better" else "rose to"
        print(f"{r['label']} got worse: {word} {_fmt(r['current'])} (best so far was {_fmt(r['best'])}).")
    for r in advisories[:10]:
        word = "dropped to" if r["direction"] == "higher_is_better" else "rose to"
        print(f"note only: {r['label']} {word} {_fmt(r['current'])} (best {_fmt(r['best'])}) - {r['why_allowed']}.")
    return 1 if regressions else 0


def cmd_update(metric_filter: Optional[str], force: bool) -> int:
    values, _notes = measure_all()
    ratchet_data = load_ratchet_file()
    updated = []
    kept = []
    for metric_id, entry in _metric_entries(ratchet_data):
        if metric_filter and metric_id != metric_filter:
            continue
        current = values.get(metric_id)
        if current is None:
            continue
        best = entry.get("best")
        direction = entry.get("direction", "lower_is_better")
        if best is None or _is_better(current, best, direction) or force:
            entry["best"] = current
            updated.append((metric_id, best, current))
        else:
            kept.append((metric_id, best, current))

    if metric_filter and metric_filter not in ratchet_data:
        print(f"No metric named '{metric_filter}' in scripts/ratchet.json.", file=sys.stderr)
        return 1

    if updated:
        save_ratchet_file(ratchet_data)

    for metric_id, best, current in updated:
        print(f"{metric_id}: recorded {_fmt(current)} (was {_fmt(best) if best is not None else 'unknown'}).")
    for metric_id, best, current in kept:
        print(f"{metric_id}: kept {_fmt(best)} -- today's {_fmt(current)} is not better (use --force to override).")
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Measure and enforce the phase 0 refactor ratchet.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_measure = sub.add_parser("measure", help="Measure every metric and print the results.")
    p_measure.add_argument("--json", action="store_true")

    p_check = sub.add_parser("check", help="Fail if any metric got worse than its recorded best.")
    p_check.add_argument("--json", action="store_true")

    p_update = sub.add_parser("update", help="Record today's numbers where they improved.")
    p_update.add_argument("--metric", default=None)
    p_update.add_argument("--force", action="store_true")

    args = parser.parse_args(argv)

    if args.command == "measure":
        return cmd_measure(args.json)
    if args.command == "check":
        return cmd_check(args.json)
    if args.command == "update":
        return cmd_update(args.metric, args.force)
    return 2


if __name__ == "__main__":
    sys.exit(main())
