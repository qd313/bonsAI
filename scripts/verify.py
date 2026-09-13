"""
Title: Verify

Purpose: The one command every refactor lane runs before it commits, and the one the merge
step runs before it lands a branch. Quick mode is a fast pre-commit gate (typecheck, only the
tests touched by the current change, the header check, the ratchet check). Full mode adds the
whole test suite, the production build, and the generated-architecture snapshot check, for use
at merge time. Both modes print nothing on success but a one-line summary, and print only
failures otherwise, because a lane reading its own output should not have to scroll past noise
to find the thing that broke.

Used for: `python scripts/verify.py --quick` before every lane commit; `python scripts/verify.py
--full` at every merge. `--json` switches to a single machine-readable object for a headless
worker (a lane agent, a merge script) that needs a pass/fail per step rather than console text.

Solves: Without this, every lane invents its own pre-commit check, and a slow or noisy one gets
skipped under time pressure. A single script means "run verify" is unambiguous everywhere in the
refactor, and a failure is always reported the same way: step name, failing test name, the
assertion, nothing else.

Does not: Fix anything, install anything, or decide what the tests should assert. Does not talk
to the Steam Deck. Does not replace `scripts/check_headers.py` or `scripts/ratchet.py` - it only
calls them, and skips them gracefully while they do not exist yet.

How it works:
    1. Work out what changed (`git diff --name-only HEAD` plus untracked files), once, up front.
    2. Quick steps, in order: typecheck (`npx tsc --noEmit`); vitest for the changed TypeScript
       under `src/` only, skipped when none changed; the whole Python suite, whenever any `.py`
       file changed; the header check; the ratchet check. The last two are skipped with a short
       note when their script does not exist yet.
    3. Full mode runs all of the above, then the whole JS test suite, the whole Python suite
       again (matching the documented `npm run test:py`), the production build, and the
       architecture-snapshot check.
    4. Each step's raw output is condensed: ANSI codes stripped, blank lines dropped, a
       tool-specific extractor pulls out failing test names and assertion text where it can
       recognize the shape (tsc errors, unittest FAIL/ERROR blocks, vitest FAIL blocks, JSON
       list fields from the header/ratchet scripts), a generic tail-of-output fallback otherwise.
       Any traceback found is cut to its last 8 lines.
    5. Human output: one line on success; on failure, the condensed lines from every failing
       step, capped at 40 lines total. JSON output: always one object, every step included,
       whether it passed, failed, or was skipped.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MAX_TOTAL_LINES = 40
TRACEBACK_TAIL_LINES = 8

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
_TS_ERROR_RE = re.compile(r"error TS\d+")
_UNITTEST_HEADER_RE = re.compile(r"^(FAIL|ERROR): (.+)$")
_SEPARATOR_RE = re.compile(r"^[=\-]{4,}$")
_VITEST_FAIL_RE = re.compile(r"\bFAIL\b")


class StepResult:
    def __init__(self, name: str):
        self.name = name
        self.ok: bool = True
        self.skipped: bool = False
        self.seconds: float = 0.0
        self.detail: str = ""
        self.failure_lines: list[str] = []


def _which(tool: str) -> str:
    """Resolve a tool to an absolute path when possible; fall back to the bare name so a
    missing tool fails with a clear FileNotFoundError instead of a silent PATH miss."""
    return shutil.which(tool) or tool


def _run(cmd: list[str], cwd: Path = ROOT) -> tuple[int, str, float]:
    """Run a command, return (exit code, combined stdout+stderr, seconds). A missing
    executable is reported as exit code 127 with a one-line explanation instead of raising."""
    start = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        combined = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, combined, time.monotonic() - start
    except FileNotFoundError:
        return 127, f"command not found: {cmd[0]}", time.monotonic() - start


def _clean_lines(text: str) -> list[str]:
    text = _ANSI_RE.sub("", text)
    return [line.rstrip() for line in text.splitlines() if line.strip()]


def _cut_tracebacks(lines: list[str]) -> list[str]:
    """Trim every 'Traceback (most recent call last):' block to its last N lines, keeping
    everything outside of tracebacks untouched."""
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        if lines[i].strip().startswith("Traceback (most recent call last):"):
            j = i + 1
            block = []
            while j < n and (lines[j].startswith(" ") or lines[j].startswith("\t") or "Error" in lines[j]):
                block.append(lines[j])
                j += 1
                if "Error" in lines[j - 1]:
                    break
            out.append(lines[i])
            out.extend(block[-TRACEBACK_TAIL_LINES:])
            i = j
        else:
            out.append(lines[i])
            i += 1
    return out


def _condense_tsc(lines: list[str]) -> list[str]:
    hits = [line for line in lines if _TS_ERROR_RE.search(line)]
    return hits if hits else lines[-15:]


def _condense_test_blocks(lines: list[str]) -> list[str]:
    """Shared extractor for unittest ('FAIL: name' / 'ERROR: name' blocks separated by rows of
    '=' or '-') and vitest ('FAIL <file> > <test name>' followed by the assertion). Emits the
    failing name plus up to 8 lines of the assertion/traceback that follows it."""
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        m = _UNITTEST_HEADER_RE.match(line)
        is_vitest_fail = _VITEST_FAIL_RE.search(line) is not None
        if m or is_vitest_fail:
            name = m.group(0) if m else line.strip()
            out.append(name)
            j = i + 1
            # unittest puts a cosmetic '----' divider directly under the header, before the
            # traceback text; skip exactly that one so it doesn't look like the end of the block.
            if j < n and _SEPARATOR_RE.match(lines[j]):
                j += 1
            tail: list[str] = []
            while j < n and len(tail) < TRACEBACK_TAIL_LINES:
                nxt = lines[j]
                if _SEPARATOR_RE.match(nxt) or _UNITTEST_HEADER_RE.match(nxt) or _VITEST_FAIL_RE.search(nxt):
                    break
                tail.append(f"  {nxt}")
                j += 1
            out.extend(tail)
            i = j
        else:
            i += 1
    return out if out else lines[-15:]


def _condense_json_object(raw: str) -> list[str] | None:
    """For scripts that speak JSON on failure (check_headers, and ratchet if it follows the
    same convention): print every non-empty list field, short-form. Returns None if the output
    does not parse as a JSON object."""
    try:
        obj = json.loads(raw.strip().splitlines()[-1]) if raw.strip() else None
    except (json.JSONDecodeError, IndexError):
        obj = None
    if obj is None:
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return None
    if not isinstance(obj, dict):
        return None
    out: list[str] = []
    for key, value in obj.items():
        if isinstance(value, list) and value:
            shown = ", ".join(str(v) for v in value[:10])
            more = "" if len(value) <= 10 else f" (+{len(value) - 10} more)"
            out.append(f"{key}: {shown}{more}")
    return out


def _condense(step_kind: str, raw_output: str) -> list[str]:
    lines = _cut_tracebacks(_clean_lines(raw_output))
    if step_kind == "tsc":
        return _condense_tsc(lines)
    if step_kind == "tests":
        return _condense_test_blocks(lines)
    if step_kind == "json":
        parsed = _condense_json_object(raw_output)
        if parsed is not None:
            return parsed
        return lines[-15:]
    return lines[-15:]


def _short_detail(lines: list[str]) -> str:
    if not lines:
        return "failed"
    first = lines[0].strip()
    return first[:100] if len(first) > 100 else first


# --------------------------------------------------------------------------------------
# Step implementations
# --------------------------------------------------------------------------------------


def get_changed_files() -> list[str]:
    tracked_code, tracked_out, _ = _run([_which("git"), "diff", "--name-only", "HEAD"])
    untracked_code, untracked_out, _ = _run([_which("git"), "ls-files", "--others", "--exclude-standard"])
    files: set[str] = set()
    if tracked_code == 0:
        files.update(line.strip() for line in tracked_out.splitlines() if line.strip())
    if untracked_code == 0:
        files.update(line.strip() for line in untracked_out.splitlines() if line.strip())
    return sorted(files)


def step_typecheck() -> StepResult:
    result = StepResult("typecheck")
    code, out, seconds = _run([_which("npx"), "tsc", "--noEmit"])
    result.seconds = seconds
    result.ok = code == 0
    if not result.ok:
        result.failure_lines = _condense("tsc", out)
        result.detail = _short_detail(result.failure_lines)
    return result


def step_vitest_related(ts_changed: list[str]) -> StepResult:
    result = StepResult("vitest_related")
    if not ts_changed:
        result.skipped = True
        result.detail = "no changed TypeScript under src/"
        return result
    code, out, seconds = _run([_which("npx"), "vitest", "related", *ts_changed, "--run", "--reporter=dot"])
    result.seconds = seconds
    result.ok = code == 0
    if not result.ok:
        result.failure_lines = _condense("tests", out)
        result.detail = _short_detail(result.failure_lines)
    return result


def step_python_tests(py_changed: list[str], *, script: str, label: str) -> StepResult:
    result = StepResult(label)
    if not py_changed:
        result.skipped = True
        result.detail = "no changed .py files"
        return result
    code, out, seconds = _run([sys.executable, script])
    result.seconds = seconds
    result.ok = code == 0
    if not result.ok:
        result.failure_lines = _condense("tests", out)
        result.detail = _short_detail(result.failure_lines)
    return result


def step_optional_script(script_relpath: str, args: list[str], label: str) -> StepResult:
    """Runs a script that is frozen by contract but may not be written yet. Skips cleanly,
    without counting as a failure, when the file is absent."""
    result = StepResult(label)
    script_path = ROOT / script_relpath
    if not script_path.exists():
        result.skipped = True
        result.detail = f"{script_relpath} not present yet"
        return result
    code, out, seconds = _run([sys.executable, str(script_path), *args])
    result.seconds = seconds
    result.ok = code == 0
    if not result.ok:
        result.failure_lines = _condense("json", out)
        result.detail = _short_detail(result.failure_lines)
    return result


def step_npm(script_name: str, label: str, kind: str = "generic") -> StepResult:
    result = StepResult(label)
    code, out, seconds = _run([_which("npm"), "run", script_name] if script_name != "test" else [_which("npm"), "test"])
    result.seconds = seconds
    result.ok = code == 0
    if not result.ok:
        result.failure_lines = _condense(kind, out)
        result.detail = _short_detail(result.failure_lines)
    return result


# --------------------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------------------


def run(mode: str) -> tuple[list[StepResult], float]:
    start = time.monotonic()
    changed = get_changed_files()
    ts_changed = [f for f in changed if f.startswith("src/") and (f.endswith(".ts") or f.endswith(".tsx"))]
    py_changed = [f for f in changed if f.endswith(".py")]

    steps: list[StepResult] = []
    steps.append(step_typecheck())
    steps.append(step_vitest_related(ts_changed))
    steps.append(step_python_tests(py_changed, script="scripts/run_python_tests.py", label="python_tests"))
    steps.append(step_optional_script("scripts/check_headers.py", ["--json"], "check_headers"))
    steps.append(step_optional_script("scripts/ratchet.py", ["check", "--json"], "ratchet"))

    if mode == "full":
        steps.append(step_npm("test", "npm_test", kind="tests"))
        steps.append(step_npm("test:py", "npm_test_py", kind="tests"))
        steps.append(step_npm("build", "npm_build", kind="generic"))
        steps.append(step_npm("mcp:validate", "mcp_validate", kind="generic"))

    return steps, time.monotonic() - start


def render_human(mode: str, steps: list[StepResult], total_seconds: float) -> int:
    failing = [s for s in steps if not s.ok and not s.skipped]
    if not failing:
        skipped = [s for s in steps if s.skipped]
        note = ""
        if skipped:
            names = ", ".join(f"{s.name} ({s.detail})" for s in skipped)
            note = f" - skipped: {names}"
        print(f"verify --{mode}: PASS in {total_seconds:.1f}s{note}")
        return 0

    lines: list[str] = []
    for step in failing:
        lines.append(f"[{step.name}] FAILED")
        lines.extend(f"  {line}" for line in step.failure_lines)

    if len(lines) > MAX_TOTAL_LINES:
        lines = lines[: MAX_TOTAL_LINES - 1] + ["... (truncated)"]

    print("\n".join(lines))
    return 1


def render_json(mode: str, steps: list[StepResult], total_seconds: float) -> int:
    ok = all(s.ok or s.skipped for s in steps)
    obj = {
        "mode": mode,
        "ok": ok,
        "steps": [
            {
                "name": s.name,
                "ok": s.ok,
                "skipped": s.skipped,
                "seconds": round(s.seconds, 2),
                "detail": s.detail,
            }
            for s in steps
        ],
        "seconds": round(total_seconds, 2),
    }
    print(json.dumps(obj))
    return 0 if ok else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the refactor's shared verify gate.")
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--quick", action="store_true", help="typecheck, impacted tests, header/ratchet checks")
    mode_group.add_argument("--full", action="store_true", help="quick, plus the full test suite, build, and mcp:validate")
    parser.add_argument("--json", action="store_true", help="print one JSON object instead of human text")
    args = parser.parse_args(argv)

    mode = "quick" if args.quick else "full"
    steps, total_seconds = run(mode)

    if args.json:
        return render_json(mode, steps, total_seconds)
    return render_human(mode, steps, total_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
