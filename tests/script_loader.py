"""Title: Find a script under scripts/ by its name and load it as a module for tests

Purpose: Many back-end tests call the real functions of a script (the library builder, the publisher,
the evaluation scripts, the wiki readers). Scripts sit outside the normal import path, so a test has to load
them by file path. Each test used to build that path itself (`REPO_ROOT / "scripts" / "x.py"`), which breaks
when the script moves into a sub-folder. `find_script("x")` walks scripts/ once (all sub-folders) and returns
the one file called x.py; `load_script("x")` loads it as a fresh module.
Used for: tests/build_rag_db_loader.py, corpus_build_support.py and the tests of the library, publish,
evaluation and wiki scripts (test_build_rag_*, test_publish_corpus_*, test_eval_kb_*, test_extract_wiki_notes.py,
test_fetch_wiki_*.py, test_probe_deck_kb_retrieval.py, test_rag_corpus_download.py, test_source_attribution.py,
test_ollama_embed_service.py and test_workshop_setting.py).
Solves: folder moves of the scripts needing a hand edit in every test that loads one.
Does not: Find a script outside scripts/, or guess between two scripts with the same name (that is an error).
"""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
_SKIP_DIRS = {"node_modules", "__pycache__"}
_index: dict[str, list[Path]] | None = None


def _build_index() -> dict[str, list[Path]]:
    found: dict[str, list[Path]] = {}
    for folder, dirs, files in os.walk(REPO_ROOT / "scripts"):
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for name in files:
            if name.endswith(".py"):
                found.setdefault(name[:-3], []).append(Path(folder) / name)
    return found


def find_script(name: str) -> Path:
    """The one scripts/**/<name>.py (name with or without .py); raises if there is none or more than one."""
    global _index
    if _index is None:
        _index = _build_index()
    key = name[:-3] if name.endswith(".py") else name
    matches = _index.get(key, [])
    if not matches:
        raise FileNotFoundError(f"no script named {key}.py under scripts/")
    if len(matches) > 1:
        shown = ", ".join(str(m.relative_to(REPO_ROOT)).replace("\\", "/") for m in matches)
        raise FileNotFoundError(f"{len(matches)} scripts named {key}.py under scripts/ (expected one): {shown}")
    return matches[0]


def load_script(name: str, module_name: str | None = None, *, register: bool = False):
    """Load and execute the script as a fresh module named `module_name` (default: the script's name).

    `register=True` puts it in sys.modules before running it, which a script with dataclasses needs
    (they look their own module up by name); a failed load then leaves no half-made module behind.
    A caller that registers is the one that removes it again (addCleanup(sys.modules.pop, name, None)).
    """
    path = find_script(name)
    mod_name = module_name or path.stem
    spec = importlib.util.spec_from_file_location(mod_name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    if register:
        sys.modules[mod_name] = mod
    try:
        spec.loader.exec_module(mod)
    except BaseException:
        if register:
            sys.modules.pop(mod_name, None)
        raise
    return mod
