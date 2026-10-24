"""Title: Shared seed payloads for the RAG-corpus embedding-guarantee tests

Purpose: The same tiny, fully controlled corpus (2 sections, 2 compat tips) that
test_build_rag_embedding_guarantee.py and test_publish_corpus_embedding_guarantee.py each build,
so every test in both files has known, fixed totals to check against instead of reading the
live, actively-edited data/kb/strategy_seed.json.
Used for: Both of those files import seed_payload() and compat_payload() from here rather than
keeping their own copy of the same two functions.
Solves: The two functions were identical, word for word, in both files -- one guarantee about
building a corpus, one about publishing it, over the exact same input shape. That was 50
duplicated lines counted by scripts/ratchet.py's duplicate_lines_be_tests metric.
Does not: Build anything, call either guarantee, or know what either one checks. Not itself a
test file (no test_ prefix), so unittest discovery in scripts/run_python_tests.py does not try
to run it.
"""

from __future__ import annotations


def seed_payload(section_count: int) -> dict:
    return {
        "games": [
            {
                "game_id": 1,
                "app_id": "413150",
                "canonical_title": "Test Game",
                "platform": "PC",
                "genres": ["action"],
            }
        ],
        "aliases": [],
        "sections": [
            {
                "section_id": i,
                "game_id": 1,
                "section_type": "boss",
                "name": f"Section {i}",
                "card": f"Card body {i}.",
                "source_url": "",
                "source_license": "bonsAI-maintainer",
            }
            for i in range(1, section_count + 1)
        ],
        "genre_patterns": [],
    }


def compat_payload(pattern_count: int) -> list:
    return [
        {
            "pattern_id": i,
            "topic": "proton",
            "platforms": ["deck"],
            "card": f"Tip body {i}.",
            "source_url": "",
            "source_license": "bonsAI-maintainer",
        }
        for i in range(1, pattern_count + 1)
    ]
