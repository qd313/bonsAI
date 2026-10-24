#!/usr/bin/env python3
"""Title: Build the architecture maps when a check needs them

Purpose: Five small JSON files describe the code from the outside: which back-end
methods exist, which files are biggest, how the front-end and back-end files import
each other, which tests exist, which settings variables the code reads. They are no longer saved in the repo. This file builds
them in the folder it sits in, on demand, so a check can ask for them and always
gets files that match the code as it is right now.
Used for: scripts/ratchet.py (the import-cycle counts and the front-end/back-end
method-name checks) and, through ratchet, scripts/phase2_map.py. The tool server in
packages/bonsai-mcp does the same thing in its own code when it starts.
Solves: The maps used to be rewritten and committed on every commit. Helpers
working side by side in their own copies then collided on those files at every
landing. Building them where they are read removes the collision and removes the
chance of reading a stale one.
Does not: Build src/types/rpcMethods.ts (that one stays saved in the repo and the
commit hook keeps it fresh), build docs/code-map.md (`python scripts/code_map.py`
does that on request), or raise when a build fails -- it returns the reasons so the
caller can say the map could not be built instead of crashing.
Gotchas: it rebuilds every time it is called in a new process, not only when a file
is missing, because the maps are cheap (about a second) and a file that is present
is exactly the one that may be stale. Within one process it builds once.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCH_DIR = ROOT / "packages" / "bonsai-mcp" / "knowledge" / "architecture"
GENERATOR_JS = ROOT / "packages" / "bonsai-mcp" / "scripts" / "generate-architecture.mjs"
PY_GRAPH_SCRIPT = ROOT / "scripts" / "py_import_graph.py"

# The five maps the JavaScript generator writes, plus the one the Python script writes.
MAP_FILES = (
    "rpc-map.json",
    "hotspots.json",
    "import-graph.json",
    "test-inventory.json",
    "env-vars.json",
    "py-import-graph.json",
)

BUILD_TIMEOUT_SECONDS = 180

_problems_from_last_build: list[str] | None = None


def _run(command: list[str], what: str) -> str | None:
    """Run one generator. Returns None when it worked, otherwise a sentence saying why not."""
    try:
        done = subprocess.run(
            command,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=BUILD_TIMEOUT_SECONDS,
        )
    except FileNotFoundError:
        return f"{what}: the program {command[0]!r} was not found"
    except subprocess.TimeoutExpired:
        return f"{what}: took longer than {BUILD_TIMEOUT_SECONDS} seconds"
    if done.returncode != 0:
        detail = (done.stderr or done.stdout or "").strip().splitlines()
        return f"{what}: failed ({detail[-1] if detail else 'no output'})"
    return None


def build_maps(force: bool = False) -> list[str]:
    """Build all seven maps into ARCH_DIR. Returns the reasons any step failed (empty = all built).

    Builds once per process; pass force=True to build again (the tests do).
    """
    global _problems_from_last_build
    if _problems_from_last_build is not None and not force:
        return _problems_from_last_build

    problems: list[str] = []
    node = shutil.which("node")
    if node is None:
        problems.append("the front-end maps: node was not found")
    else:
        failure = _run([node, str(GENERATOR_JS), "--maps-only"], "the front-end maps")
        if failure:
            problems.append(failure)
    failure = _run([sys.executable, str(PY_GRAPH_SCRIPT)], "the back-end import map")
    if failure:
        problems.append(failure)

    _problems_from_last_build = problems
    return problems


def map_path(name: str, force: bool = False) -> tuple[Path, str | None]:
    """The path of one map after building, plus a sentence saying why it may be missing.

    The sentence is None when the build worked. A file left over from an earlier build is
    still handed back when the build failed, because an old map is better than no map for a
    count -- the caller reads the sentence and decides how loudly to say so.
    """
    problems = build_maps(force=force)
    return ARCH_DIR / name, ("; ".join(problems) if problems else None)
