"""Title: The library builder writes each game's tap-to-define words

Purpose: Pin how data/kb/glossary_terms.json becomes the glossary_terms table: each word is filed
under its game, a bad row stops the build with a plain reason, the manifest counts the words, the
same input builds the same bytes, and the file that ships holds the two Deep Rock Galactic:
Survivor words with their exact text.
Used for: scripts/kb/build_rag_db.py's _seed_glossary_terms, build_corpus and the glossary_terms
table in knowledge_base_schema.CREATE_SCHEMA_SQL.
Solves: A word filed under the wrong game, a repeated spelling the screen would silently drop, or
a definition that drifted unseen would all ship in the published library with no other symptom.
Does not: Cover how the plugin reads the words back (tests/test_knowledge_base_glossary.py).
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from build_rag_db_loader import REPO_ROOT, load_build_rag_db
from rag_corpus_seed_fixtures import compat_payload, seed_payload

build_rag_db = load_build_rag_db()

APP_ID = "413150"


def _word(term_id: int = 1, **overrides) -> dict:
    row = {
        "term_id": term_id,
        "app_id": APP_ID,
        "term_key": f"word{term_id}",
        "term": f"word{term_id}",
        "alt_forms": [f"word{term_id}s"],
        "peek": "A short peek.",
        "full_text": "The full definition.",
    }
    row.update(overrides)
    return row


class _GlossaryBuildBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.kb_dir = Path(self._tmp.name) / "kb_data"
        self.kb_dir.mkdir()
        (self.kb_dir / "strategy_seed.json").write_text(json.dumps(seed_payload(2)), encoding="utf-8")
        (self.kb_dir / "compat_patterns.json").write_text(json.dumps(compat_payload(2)), encoding="utf-8")
        self._orig_kb_data_dir = build_rag_db.KB_DATA_DIR
        build_rag_db.KB_DATA_DIR = self.kb_dir

    def tearDown(self):
        build_rag_db.KB_DATA_DIR = self._orig_kb_data_dir
        self._tmp.cleanup()

    def _write_words(self, rows) -> None:
        (self.kb_dir / "glossary_terms.json").write_text(
            json.dumps(rows, ensure_ascii=False), encoding="utf-8"
        )

    def _seed(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        build_rag_db.apply_schema(conn)
        build_rag_db.seed_sample_corpus(conn)
        return conn


class SeedGlossaryTermsTests(_GlossaryBuildBase):
    def test_the_words_are_written_with_their_game(self):
        self._write_words([_word(1), _word(2, alt_forms=[])])
        conn = self._seed()
        try:
            game_id = conn.execute("SELECT game_id FROM games WHERE app_id = ?", (APP_ID,)).fetchone()[0]
            rows = conn.execute(
                "SELECT term_id, game_id, term_key, term, alt_forms, peek, full_text "
                "FROM glossary_terms ORDER BY term_id"
            ).fetchall()
        finally:
            conn.close()
        self.assertEqual(
            rows,
            [
                (1, game_id, "word1", "word1", '["word1s"]', "A short peek.", "The full definition."),
                (2, game_id, "word2", "word2", "[]", "A short peek.", "The full definition."),
            ],
        )

    def test_no_words_file_gives_an_empty_table(self):
        conn = self._seed()
        try:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM glossary_terms").fetchone()[0], 0)
        finally:
            conn.close()

    def test_a_word_for_an_unknown_game_stops_the_build(self):
        self._write_words([_word(1, app_id="999999")])
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("999999", str(ctx.exception))

    def test_an_empty_peek_or_definition_stops_the_build(self):
        for field in ("peek", "full_text", "term"):
            with self.subTest(field=field):
                self._write_words([_word(1, **{field: "  "})])
                with self.assertRaises(SystemExit) as ctx:
                    self._seed()
                self.assertIn(f"{field} is empty", str(ctx.exception))

    def test_alt_forms_that_are_not_a_list_of_text_stop_the_build(self):
        for bad in ("kite", [1, 2]):
            with self.subTest(bad=bad):
                self._write_words([_word(1, alt_forms=bad)])
                with self.assertRaises(SystemExit) as ctx:
                    self._seed()
                self.assertIn("alt_forms", str(ctx.exception))

    def test_two_words_with_one_spelling_stop_the_build(self):
        # The second word's alternate form repeats the first word's own spelling, in another case.
        self._write_words(
            [
                _word(1, term="kiting", term_key="a"),
                _word(2, term="other", term_key="b", alt_forms=["Kiting"]),
            ]
        )
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("used twice", str(ctx.exception))

    def test_a_repeated_key_or_id_stops_the_build(self):
        self._write_words([_word(1), _word(1, term_key="other", term="other", alt_forms=[])])
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("term_id 1 repeats", str(ctx.exception))
        self._write_words([_word(1), _word(2, term_key="word1", term="other", alt_forms=[])])
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        self.assertIn("term_key repeats", str(ctx.exception))

    def test_a_good_file_is_not_refused(self):
        # The other direction: the refusals above must not fire on good input.
        self._write_words([_word(1), _word(2)])
        conn = self._seed()
        conn.close()


class GlossaryBuildCorpusTests(_GlossaryBuildBase):
    def setUp(self):
        super().setUp()
        self._orig_tags = build_rag_db._list_installed_ollama_tags
        self._orig_embed = build_rag_db._embed_texts_build
        build_rag_db._list_installed_ollama_tags = lambda *a, **k: [build_rag_db.DEFAULT_EMBEDDING_MODEL]
        dim = build_rag_db.DEFAULT_EMBEDDING_DIM
        build_rag_db._embed_texts_build = lambda base_http, texts, *, model, timeout_s: [
            [0.0] * dim for _ in texts
        ]
        self._write_words([_word(1), _word(2)])

    def tearDown(self):
        build_rag_db._list_installed_ollama_tags = self._orig_tags
        build_rag_db._embed_texts_build = self._orig_embed
        super().tearDown()

    def test_the_manifest_counts_the_words(self):
        manifest = build_rag_db.build_corpus(Path(self._tmp.name) / "out", seed=True)
        self.assertEqual(manifest["glossary_term_count"], 2)

    def test_the_words_are_not_notes_or_vectors(self):
        out = Path(self._tmp.name) / "out"
        build_rag_db.build_corpus(out, seed=True)
        conn = sqlite3.connect(str(out / "corpus.db"))
        try:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0], 2)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM section_vectors").fetchone()[0], 2)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM glossary_terms").fetchone()[0], 2)
        finally:
            conn.close()

    def test_the_build_is_repeatable_with_words(self):
        first = build_rag_db.build_corpus(Path(self._tmp.name) / "out1", seed=True)
        second = build_rag_db.build_corpus(Path(self._tmp.name) / "out2", seed=True)
        self.assertEqual(first["db_sha256"], second["db_sha256"])


class ShippedGlossaryFileTests(unittest.TestCase):
    def test_the_shipped_file_holds_the_two_deep_rock_galactic_words(self):
        rows = json.loads((REPO_ROOT / "data" / "kb" / "glossary_terms.json").read_text(encoding="utf-8"))
        self.assertEqual(
            rows,
            [
                {
                    "term_id": 1,
                    "app_id": "2321470",
                    "term_key": "kiting",
                    "term": "kiting",
                    "alt_forms": ["kite", "kited", "kites"],
                    "peek": "Backing away while you keep shooting.",
                    "full_text": (
                        "Kiting means backing away from an enemy while you keep shooting it, using "
                        "your movement speed to stay just out of melee range instead of tanking hits. "
                        "It buys survival time, but a run spent only kiting mines nothing — kite "
                        "between waves, not instead of mining."
                    ),
                },
                {
                    "term_id": 2,
                    "app_id": "2321470",
                    "term_key": "overclock",
                    "term": "overclock",
                    "alt_forms": ["overclocks", "overclocked"],
                    "peek": "A weapon mod that changes what it does, not just its numbers.",
                    "full_text": (
                        "An overclock is a weapon mod that changes what a weapon is for rather than "
                        "simply making it bigger — read what it removes as well as what it adds "
                        "before slotting one. Save your best overclock, or a nuke, for an armor-break "
                        "window on a boss like the Dreadnought."
                    ),
                },
            ],
        )

    def test_the_shipped_file_builds_against_the_real_seed(self):
        conn = sqlite3.connect(":memory:")
        try:
            build_rag_db.apply_schema(conn)
            build_rag_db.seed_sample_corpus(conn)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM glossary_terms").fetchone()[0], 2)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
