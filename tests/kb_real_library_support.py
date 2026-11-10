"""Title: A word-search-only copy of the whole real library, notes folder included, for tests

Purpose: Builds the corpus the way the shipped build reads it (the seed, every file in data/kb/notes/,
the tip sheet), with no meaning-search vectors, so a test can ask the exact question a person asked
and read back which notes attach, in order -- without Ollama.
Used for: tests/test_kb_versus_notes_search.py and tests/test_kb_mode_notes_held_back.py.
Solves: tests/kb_keyword_corpus_support.py builds from the seed file alone, so it cannot see the
notes that live in their own files (the Left 4 Dead 2 versus notes are one of those files).
Does not: Test anything about meaning search. Not itself a test file (no test_ prefix).
"""

from __future__ import annotations

import re
from pathlib import Path

from build_rag_db_loader import load_build_rag_db

LEFT_4_DEAD_2 = "550"
HEADER_RE = re.compile(r"^\[.*: (.*?)\].*\(trust: [^)]+\)\s*$", re.M)


def build_real_library(root: str) -> dict:
    """The whole shipped library (seed, every notes file, tips), word search only, under ``root``;
    returns the ``settings`` dict that reads it."""
    builder = load_build_rag_db()
    # No embedding model on purpose: never reach Ollama from a unit test.
    builder._list_installed_ollama_tags = lambda *args, **kwargs: []
    out_dir = Path(root) / "out"
    builder.build_corpus(out_dir, seed=True, allow_missing_embeddings=True)
    return {"use_local_knowledge_base": True, "rag_hybrid_retrieval_enabled": False, "rag_corpus_path": str(out_dir)}
