"""Title: Load scripts/build_rag_db.py as a module for tests

Purpose: scripts/build_rag_db.py sits outside the normal import path (it is not part of
py_modules/backend), so a test that wants to call its real functions has to load it by
file path instead of a plain import. Several test files need exactly this.
Used for: tests/test_build_rag_compat_app_id.py, tests/test_build_rag_starting_out_validator.py
and tests/test_build_rag_attributions.py, and any future test that needs the real builder.
Solves: three test files each carried their own byte-for-byte copy of this loader (a
back-end-test duplication scripts/ratchet.py's duplicate_lines_be_tests counts).
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_build_rag_db():
    """Load and execute scripts/build_rag_db.py as a fresh module, and return it."""
    path = REPO_ROOT / "scripts" / "build_rag_db.py"
    spec = importlib.util.spec_from_file_location("build_rag_db", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
