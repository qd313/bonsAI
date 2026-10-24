"""Title: The library builder reads content folders and library-id glossary rows

Purpose: Pin that data/kb/glossary/*.json adds words and data/kb/notes/*.json adds notes beside the
main seed files, that a words file may name its game by the library's own id, that a problem names
the file it came from, and that the same inputs build the same bytes.
Used for: scripts/kb/build_rag_db.py's folder readers, _glossary_row_problems, _seed_glossary_terms
and _seed_strategy_corpus.
Solves: Several content lanes writing at once without sharing one file, and games with no Steam id
(the Nintendo titles) having tap-to-define words at all.
Does not: Cover the main files alone (test_build_rag_glossary.py, test_build_rag_reproducible.py).
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from build_rag_db_loader import load_build_rag_db
from rag_corpus_seed_fixtures import compat_payload, seed_payload

build_rag_db = load_build_rag_db()

APP_ID = "413150"


def _word(term_id: int, **overrides) -> dict:
    row = {
        "term_id": term_id,
        "app_id": APP_ID,
        "term_key": f"word{term_id}",
        "term": f"word{term_id}",
        "alt_forms": [],
        "peek": "A short peek.",
        "full_text": "The full definition.",
    }
    row.update(overrides)
    return row


class _FolderBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.kb_dir = Path(self._tmp.name) / "kb_data"
        self.kb_dir.mkdir()
        seed = seed_payload(2)
        # A second game with no Steam id, to be named by the library's own id.
        seed["games"].append({"game_id": 7, "app_id": None, "igdb_id": "emudeck-test", "canonical_title": "Other", "platform": "N64"})
        self._write("strategy_seed.json", seed)
        self._write("compat_patterns.json", compat_payload(2))
        self._orig = build_rag_db.KB_DATA_DIR
        build_rag_db.KB_DATA_DIR = self.kb_dir

    def tearDown(self):
        build_rag_db.KB_DATA_DIR = self._orig
        self._tmp.cleanup()

    def _write(self, rel: str, payload) -> None:
        path = self.kb_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    def _seed(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        build_rag_db.apply_schema(conn)
        build_rag_db.seed_sample_corpus(conn)
        return conn


class GlossaryFolderTests(_FolderBase):
    def _terms(self, conn) -> list[tuple]:
        return conn.execute("SELECT term_id, game_id, term_key FROM glossary_terms ORDER BY term_id").fetchall()

    def test_words_in_the_folder_join_the_main_file(self):
        self._write("glossary_terms.json", [_word(1)])
        self._write("glossary/b.json", [_word(3)])
        self._write("glossary/a.json", [_word(2)])
        conn = self._seed()
        self.assertEqual(self._terms(conn), [(1, 1, "word1"), (2, 1, "word2"), (3, 1, "word3")])

    def test_a_missing_folder_gives_no_words(self):
        self.assertEqual(self._terms(self._seed()), [])

    def test_a_sources_file_is_not_read_as_words(self):
        self._write("glossary/a.json", [_word(1)])
        self._write("glossary/a.sources.json", {"1": ["section 4"]})
        self.assertEqual(self._terms(self._seed()), [(1, 1, "word1")])

    def test_a_repeat_across_two_files_names_the_files(self):
        self._write("glossary/a.json", [_word(1)])
        self._write("glossary/b.json", [_word(1, term_key="other", term="other")])
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("term_id 1 repeats", str(ctx.exception))
        self.assertIn("glossary/b.json", str(ctx.exception))

    def test_a_repeated_spelling_across_files_stops_the_build(self):
        self._write("glossary_terms.json", [_word(1, term="kiting", term_key="a")])
        self._write("glossary/b.json", [_word(2, term="Kiting", term_key="b")])
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("used twice", str(ctx.exception))

    def test_a_file_that_is_not_a_list_names_itself(self):
        self._write("glossary/a.json", {"oops": 1})
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("glossary/a.json", str(ctx.exception))

    def test_the_shared_loader_returns_the_merged_list(self):
        self._write("glossary_terms.json", [_word(1)])
        self._write("glossary/a.json", [_word(2)])
        self.assertEqual([r["term_id"] for r in build_rag_db.load_glossary_rows()], [1, 2])


if __name__ == "__main__":
    unittest.main()
