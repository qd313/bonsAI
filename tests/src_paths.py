"""Title: Find a screen source file by its name, wherever it sits under src/

Purpose: A few back-end tests read a screen file as text to check that it agrees with the back end
(the same ids, the same model tag, a time limit). They used to build the path from pieces
(`ROOT / "src" / "data" / "x.ts"`), which breaks silently the day the file moves to a feature folder.
`find_src_file("x.ts")` walks `src/` once, remembers every file name, and returns the one match.
Used for: tests/test_accent_intensity_parity.py, test_character_catalog_parity.py,
test_starter_tag_parity.py, test_starter_set_extras.py and test_rag_update_deadline.py.
Solves: folder-per-feature moves of the screen files needing a hand edit in each of these tests.
Does not: Search tests/ or scripts/ (see tests/script_loader.py for scripts); two files with the same
name are an error here, not a guess, so pass the name of a file that is unique under src/.
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
_SKIP_DIRS = {"node_modules", "__pycache__"}
_index: dict[str, list[Path]] | None = None


def _build_index() -> dict[str, list[Path]]:
    found: dict[str, list[Path]] = {}
    for folder, dirs, files in os.walk(REPO_ROOT / "src"):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for name in files:
            found.setdefault(name, []).append(Path(folder) / name)
    return found


def find_src_file(name: str) -> Path:
    """The one file called `name` anywhere under src/; raises if there is none or more than one."""
    global _index
    if _index is None:
        _index = _build_index()
    matches = _index.get(name, [])
    if not matches:
        raise FileNotFoundError(f"no file named {name} under src/")
    if len(matches) > 1:
        shown = ", ".join(str(m.relative_to(REPO_ROOT)).replace("\\", "/") for m in matches)
        raise FileNotFoundError(f"{len(matches)} files named {name} under src/ (expected one): {shown}")
    return matches[0]
