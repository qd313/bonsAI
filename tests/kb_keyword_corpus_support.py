"""Title: A word-search-only corpus of the real library, for tests

Purpose: Builds a real knowledge-base corpus from data/kb/strategy_seed.json (every game, or only
the games a test names), with no meaning-search vectors, so a test can ask the exact question a
person asked and read back which notes attach, in order -- without Ollama.
Used for: tests/test_kb_typed_game_name_search.py and tests/test_kb_no_close_match_lexical.py.
Solves: The question-to-attached-notes level could only be tested against the full seed corpus,
which needs the embedding model and skips on the build server. The notes here are the live seed
rows, so a rewritten note is what the test sees; only the vectors are missing.
Does not: Test anything about meaning search. Not itself a test file (no test_ prefix).
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from build_rag_db_loader import load_build_rag_db

REPO_ROOT = Path(__file__).resolve().parent.parent

BLACK_MESA = 14
HOLLOW_KNIGHT = 15
BALDURS_GATE_3 = 4


def build_keyword_corpus(tmp: tempfile.TemporaryDirectory, game_ids: tuple[int, ...] = ()) -> dict:
    """Build the corpus under ``tmp`` and return the ``settings`` dict that reads it.

    Pass no ``game_ids`` for the whole library: a word-search score depends on how common a word
    is across the whole corpus, so a test of ranking order should use the library a player has.
    """
    seed = json.loads((REPO_ROOT / "data" / "kb" / "strategy_seed.json").read_text(encoding="utf-8"))
    wanted = set(game_ids) or {g["game_id"] for g in seed["games"]}
    payload = {
        "games": [g for g in seed["games"] if g["game_id"] in wanted],
        "aliases": [a for a in seed["aliases"] if a["game_id"] in wanted],
        "sections": [s for s in seed["sections"] if s["game_id"] in wanted],
        "genre_patterns": seed.get("genre_patterns") or [],
    }
    root = Path(tmp.name)
    data_dir = root / "kb_data"
    data_dir.mkdir()
    (data_dir / "strategy_seed.json").write_text(json.dumps(payload), encoding="utf-8")
    (data_dir / "compat_patterns.json").write_text("[]", encoding="utf-8")
    builder = load_build_rag_db()
    builder.KB_DATA_DIR = data_dir
    # No embedding model on purpose: never reach Ollama from a unit test.
    builder._list_installed_ollama_tags = lambda *args, **kwargs: []
    out_dir = root / "out"
    builder.build_corpus(out_dir, seed=True, allow_missing_embeddings=True)
    return {
        "use_local_knowledge_base": True,
        "rag_hybrid_retrieval_enabled": False,
        "rag_corpus_path": str(out_dir),
    }
