import os
import sqlite3
import unittest
from pathlib import Path
from unittest import mock

from backend.knowledge.knowledge_base_schema import (
    apply_schema,
    corpus_compat_vectors_fully_indexed,
    corpus_has_usable_compat_vectors,
    corpus_has_usable_section_vectors,
    corpus_has_usable_vectors,
    corpus_section_vectors_fully_indexed,
    default_corpus_dir_internal,
    default_corpus_dir_sd,
    is_allowed_corpus_install_path,
    list_rag_storage_options,
    pack_embedding_vector,
    sanitize_corpus_install_dir,
    unpack_embedding_vector,
)


class KnowledgeBaseSchemaPathTests(unittest.TestCase):
    def test_default_internal_under_home(self):
        path = default_corpus_dir_internal()
        self.assertTrue(is_allowed_corpus_install_path(Path(path)))

    def test_sanitize_internal_path(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            resolved = sanitize_corpus_install_dir("/home/deck/.bonsai/rag")
        self.assertTrue(resolved.replace("\\", "/").endswith("/.bonsai/rag"))

    def test_sd_path_allowed_when_under_run_media(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            sd_install = Path("/run/media/deck/SD128/.bonsai/rag")
            self.assertTrue(is_allowed_corpus_install_path(sd_install))

    def test_default_corpus_dir_sd(self):
        path = default_corpus_dir_sd("/run/media/deck/MySD")
        self.assertTrue(str(path).replace("\\", "/").endswith("/run/media/deck/MySD/.bonsai/rag"))

    def test_sanitize_rejects_outside_home_and_sd(self):
        with self.assertRaises(ValueError):
            sanitize_corpus_install_dir("/var/tmp/rag")

    def test_list_storage_options_includes_internal(self):
        opts = list_rag_storage_options()
        self.assertIn("internal", opts)
        self.assertTrue(str(opts["internal"]["install_path"]))

    def test_sanitize_sd_path_under_run_media(self):
        with mock.patch("pathlib.Path.home", return_value=Path("/home/deck")):
            resolved = sanitize_corpus_install_dir("/run/media/deck/SDCARD/.bonsai/rag")
        self.assertTrue(resolved.endswith(os.path.join(".bonsai", "rag")))


    def test_vector_helpers_roundtrip(self):
        vec = [0.5, -0.25, 0.125]
        self.assertEqual(unpack_embedding_vector(pack_embedding_vector(vec)), vec)

    def test_corpus_has_usable_vectors_false_when_manifest_says_so(self):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE section_vectors (section_id INTEGER PRIMARY KEY, embedding BLOB)"
        )
        conn.execute(
            "INSERT INTO section_vectors(section_id, embedding) VALUES (1, ?)",
            (pack_embedding_vector([0.1, 0.2]),),
        )
        self.assertFalse(corpus_has_usable_vectors(conn, {"embeddings_populated": False}))
        self.assertTrue(corpus_has_usable_vectors(conn, {"embeddings_populated": True}))

    def test_corpus_has_usable_compat_vectors(self):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE compat_pattern_vectors (pattern_id INTEGER PRIMARY KEY, embedding BLOB)"
        )
        conn.execute(
            "INSERT INTO compat_pattern_vectors(pattern_id, embedding) VALUES (1, ?)",
            (pack_embedding_vector([0.1, 0.2]),),
        )
        self.assertTrue(corpus_has_usable_compat_vectors(conn))
        self.assertTrue(corpus_has_usable_vectors(conn))
        self.assertFalse(corpus_has_usable_section_vectors(conn))


class CorpusFullyIndexedTests(unittest.TestCase):
    """corpus_section_vectors_fully_indexed / corpus_compat_vectors_fully_indexed answer a
    stricter question than corpus_has_usable_*_vectors: not "any?" but "every one?". The two
    existing "any?" checks must keep answering exactly as before — see
    test_corpus_has_usable_* below in this file, unchanged by this test class."""

    def _conn_with_sections(self, total: int, indexed: int):
        import sqlite3

        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE sections (section_id INTEGER PRIMARY KEY)")
        conn.execute("CREATE TABLE section_vectors (section_id INTEGER PRIMARY KEY, embedding BLOB)")
        conn.execute("CREATE TABLE compat_patterns (pattern_id INTEGER PRIMARY KEY)")
        conn.execute(
            "CREATE TABLE compat_pattern_vectors (pattern_id INTEGER PRIMARY KEY, embedding BLOB)"
        )
        for i in range(1, total + 1):
            conn.execute("INSERT INTO sections(section_id) VALUES (?)", (i,))
        for i in range(1, indexed + 1):
            conn.execute(
                "INSERT INTO section_vectors(section_id, embedding) VALUES (?, ?)",
                (i, pack_embedding_vector([0.1])),
            )
        return conn

    # --- manifest-driven answer (the path build_rag_db.py's manifest feeds at runtime) ---

    def test_complete_corpus_is_fully_indexed_by_manifest(self):
        manifest = {
            "embeddings_populated": True,
            "embedding_section_total_count": 2,
            "embedding_section_count": 2,
        }
        conn = self._conn_with_sections(total=0, indexed=0)  # manifest wins; DB is irrelevant
        self.assertTrue(corpus_section_vectors_fully_indexed(conn, manifest))

    def test_partial_corpus_is_not_fully_indexed_by_manifest(self):
        manifest = {
            "embeddings_populated": True,
            "embedding_section_total_count": 2,
            "embedding_section_count": 1,
        }
        conn = self._conn_with_sections(total=0, indexed=0)
        self.assertFalse(corpus_section_vectors_fully_indexed(conn, manifest))
        # The existing, deliberately lenient check must still say yes — a note with some but
        # not all vectors baked stays searchable today.
        self.assertTrue(corpus_has_usable_section_vectors(conn, manifest))

    def test_empty_corpus_is_not_fully_indexed_by_manifest(self):
        manifest = {"embeddings_populated": False}
        conn = self._conn_with_sections(total=0, indexed=0)
        self.assertFalse(corpus_section_vectors_fully_indexed(conn, manifest))
        self.assertFalse(corpus_has_usable_section_vectors(conn, manifest))

    # --- DB fallback (an older manifest with no total-count fields) ---

    def test_complete_corpus_is_fully_indexed_from_the_db(self):
        conn = self._conn_with_sections(total=2, indexed=2)
        self.assertTrue(corpus_section_vectors_fully_indexed(conn, manifest=None))

    def test_partial_corpus_is_not_fully_indexed_from_the_db(self):
        conn = self._conn_with_sections(total=2, indexed=1)
        self.assertFalse(corpus_section_vectors_fully_indexed(conn, manifest=None))
        self.assertTrue(corpus_has_usable_section_vectors(conn, manifest=None))

    def test_empty_corpus_is_not_fully_indexed_from_the_db(self):
        conn = self._conn_with_sections(total=2, indexed=0)
        self.assertFalse(corpus_section_vectors_fully_indexed(conn, manifest=None))
        self.assertFalse(corpus_has_usable_section_vectors(conn, manifest=None))

    # --- the compat tip side of the same check ---

    def test_compat_complete_partial_and_empty(self):
        conn = self._conn_with_sections(total=0, indexed=0)
        conn.execute("INSERT INTO compat_patterns(pattern_id) VALUES (1), (2)")
        conn.execute(
            "INSERT INTO compat_pattern_vectors(pattern_id, embedding) VALUES (1, ?)",
            (pack_embedding_vector([0.1]),),
        )
        # 1 of 2 indexed: not fully indexed, but still usable today.
        self.assertFalse(corpus_compat_vectors_fully_indexed(conn, manifest=None))
        self.assertTrue(corpus_has_usable_compat_vectors(conn, manifest=None))

        conn.execute(
            "INSERT INTO compat_pattern_vectors(pattern_id, embedding) VALUES (2, ?)",
            (pack_embedding_vector([0.1]),),
        )
        self.assertTrue(corpus_compat_vectors_fully_indexed(conn, manifest=None))


class GlossaryTableTests(unittest.TestCase):
    def test_apply_schema_creates_the_glossary_table_with_no_search_index_or_vectors(self):
        conn = sqlite3.connect(":memory:")
        try:
            apply_schema(conn)
            tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            self.assertIn("glossary_terms", tables)
            self.assertNotIn("glossary_terms_fts", tables)
            self.assertNotIn("glossary_term_vectors", tables)
            columns = [r[1] for r in conn.execute("PRAGMA table_info(glossary_terms)")]
            self.assertEqual(
                columns, ["term_id", "game_id", "term_key", "term", "alt_forms", "peek", "full_text"]
            )
        finally:
            conn.close()

    def test_apply_schema_is_harmless_on_a_library_that_has_the_glossary_table(self):
        conn = sqlite3.connect(":memory:")
        try:
            apply_schema(conn)
            conn.execute("INSERT INTO games(game_id, app_id, canonical_title) VALUES (1, '10', 'G')")
            conn.execute(
                "INSERT INTO glossary_terms(term_id, game_id, term_key, term, peek, full_text) "
                "VALUES (1, 1, 'k', 'k', 'p', 'f')"
            )
            apply_schema(conn)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM glossary_terms").fetchone()[0], 1)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
