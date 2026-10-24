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


class GlossaryGameIdTests(_FolderBase):
    def _build_one(self, row: dict) -> sqlite3.Connection:
        self._write("glossary/a.json", [row])
        return self._seed()

    def _refused(self, *rows: dict) -> str:
        self._write("glossary/a.json", list(rows))
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        return str(ctx.exception)

    def test_a_game_id_row_is_filed_under_that_game(self):
        row = _word(1)
        del row["app_id"]
        conn = self._build_one({**row, "game_id": 7})
        self.assertEqual(conn.execute("SELECT game_id FROM glossary_terms").fetchall(), [(7,)])

    def test_an_app_id_row_still_works(self):
        conn = self._build_one(_word(1))
        self.assertEqual(conn.execute("SELECT game_id FROM glossary_terms").fetchall(), [(1,)])

    def test_both_ids_that_agree_are_accepted(self):
        conn = self._build_one(_word(1, game_id=1))
        self.assertEqual(conn.execute("SELECT game_id FROM glossary_terms").fetchall(), [(1,)])

    def test_both_ids_that_disagree_stop_the_build(self):
        self.assertIn("name different games", self._refused(_word(1, game_id=7)))

    def test_an_unknown_game_id_stops_the_build_naming_file_and_row(self):
        row = _word(1, game_id=99)
        del row["app_id"]
        message = self._refused(row)
        self.assertIn("no game has game_id 99", message)
        self.assertIn("glossary/a.json row 1", message)

    def test_a_row_with_neither_id_stops_the_build(self):
        row = _word(1)
        del row["app_id"]
        self.assertIn("needs an app_id or a game_id", self._refused(row))

    def test_a_game_id_that_is_not_a_number_stops_the_build(self):
        row = _word(1, game_id="seven")
        del row["app_id"]
        self.assertIn("is not a number", self._refused(row))

    def test_an_app_id_row_and_a_game_id_row_for_one_game_collide_on_a_term_key(self):
        by_game = _word(2, game_id=1)
        del by_game["app_id"]
        by_game.update(term_key="word1", term="other")
        self.assertIn("term_key repeats", self._refused(_word(1), by_game))

    def test_an_app_id_row_and_a_game_id_row_for_one_game_collide_on_a_spelling(self):
        by_game = _word(2, game_id=1, term="Word1", term_key="other")
        del by_game["app_id"]
        self.assertIn("used twice", self._refused(_word(1), by_game))

    def test_the_same_key_for_two_different_games_is_fine(self):
        other = _word(2, game_id=7)
        del other["app_id"]
        self._write("glossary/a.json", [_word(1, term_key="x", term="x"), {**other, "term_key": "x", "term": "x"}])
        self.assertEqual(len(self._seed().execute("SELECT * FROM glossary_terms").fetchall()), 2)


def _note(section_id: int, game_id: int = 1, **overrides) -> dict:
    row = {
        "section_id": section_id,
        "game_id": game_id,
        "section_type": "boss",
        "name": f"Extra {section_id}",
        "card": f"Extra card {section_id}.",
        "source_url": "",
        "source_license": "bonsAI-maintainer",
    }
    row.update(overrides)
    return row


class NotesFolderTests(_FolderBase):
    def _refused(self, payload: dict, rel: str = "notes/a.json") -> str:
        self._write(rel, payload)
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        return str(ctx.exception)

    def test_a_notes_file_adds_its_sections_games_and_aliases(self):
        self._write(
            "notes/a.json",
            {
                "games": [{"game_id": 9, "app_id": "777", "canonical_title": "New", "platform": "PC"}],
                "aliases": [{"alias": "newgame", "game_id": 9}],
                "sections": [_note(10, game_id=9)],
            },
        )
        conn = self._seed()
        self.assertEqual(conn.execute("SELECT name, game_id FROM sections WHERE section_id = 10").fetchall(), [("Extra 10", 9)])
        self.assertEqual(conn.execute("SELECT game_id FROM aliases WHERE alias_normalized = 'newgame'").fetchall(), [(9,)])
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0], 3)

    def test_a_missing_notes_folder_changes_nothing(self):
        self.assertEqual(self._seed().execute("SELECT COUNT(*) FROM sections").fetchone()[0], 2)

    def test_a_sources_file_in_notes_is_skipped(self):
        self._write("notes/a.json", {"sections": [_note(10)]})
        self._write("notes/a.sources.json", ["not", "an", "object"])
        self.assertEqual(self._seed().execute("SELECT COUNT(*) FROM sections").fetchone()[0], 3)

    def test_a_repeated_section_id_names_both_files(self):
        message = self._refused({"sections": [_note(1)]})
        self.assertIn("section_id 1", message)
        self.assertIn("strategy_seed.json", message)
        self.assertIn("notes/a.json", message)

    def test_a_cited_source_without_a_capture_date_names_the_file(self):
        message = self._refused({"sections": [_note(10, source_url="https://example.org/x")]})
        self.assertIn("crawled_at", message)
        self.assertIn("Extra 10 [notes/a.json]", message)

    def test_a_mistyped_starting_out_row_names_the_file(self):
        message = self._refused({"sections": [_note(10, name="Starting out in Foo", section_type="mechanic")]})
        self.assertIn("Starting out in Foo [notes/a.json]", message)

    def test_a_notes_file_that_is_not_an_object_names_itself(self):
        self.assertIn("notes/a.json", self._refused([1, 2]))

    def test_a_good_notes_file_with_dated_source_is_not_refused(self):
        self._write(
            "notes/a.json",
            {"sections": [_note(10, source_url="https://example.org/x", crawled_at="2026-01-01")]},
        )
        self._seed()

    def test_the_shared_loader_returns_the_merged_seed(self):
        self._write("notes/a.json", {"sections": [_note(10)]})
        self.assertEqual([s["section_id"] for s in build_rag_db.load_strategy_seed()["sections"]], [1, 2, 10])


class MergedBuildTests(_FolderBase):
    def setUp(self):
        super().setUp()
        self._orig_tags = build_rag_db._list_installed_ollama_tags
        self._orig_embed = build_rag_db._embed_texts_build
        build_rag_db._list_installed_ollama_tags = lambda *a, **k: [build_rag_db.DEFAULT_EMBEDDING_MODEL]
        dim = build_rag_db.DEFAULT_EMBEDDING_DIM
        build_rag_db._embed_texts_build = lambda base_http, texts, *, model, timeout_s: [[0.0] * dim for _ in texts]
        extra = _word(1, game_id=7)
        del extra["app_id"]
        self._write("glossary/a.json", [extra])
        self._write("notes/a.json", {"sections": [_note(10, game_id=7)]})

    def tearDown(self):
        build_rag_db._list_installed_ollama_tags = self._orig_tags
        build_rag_db._embed_texts_build = self._orig_embed
        super().tearDown()

    def test_the_library_holds_the_extra_word_and_note(self):
        out = Path(self._tmp.name) / "out"
        build_rag_db.build_corpus(out, seed=True)
        conn = sqlite3.connect(str(out / "corpus.db"))
        try:
            self.assertEqual(conn.execute("SELECT game_id, term_key FROM glossary_terms").fetchall(), [(7, "word1")])
            self.assertEqual(conn.execute("SELECT game_id FROM sections WHERE section_id = 10").fetchall(), [(7,)])
        finally:
            conn.close()

    def test_the_same_merged_build_twice_is_byte_identical(self):
        first = build_rag_db.build_corpus(Path(self._tmp.name) / "out1", seed=True)
        second = build_rag_db.build_corpus(Path(self._tmp.name) / "out2", seed=True)
        self.assertEqual(first["db_sha256"], second["db_sha256"])


if __name__ == "__main__":
    unittest.main()
