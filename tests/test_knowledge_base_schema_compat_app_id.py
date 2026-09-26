"""Title: The compat_patterns.app_id column (schema v4, D29)

Purpose: Phase 4 track 3 needed a per-game column on the shared troubleshooting tip
sheet, which is a schema bump (D29 / plan 18). This pins the column exists on a fresh
build, that an older corpus.db opened without it gets it added rather than crashing, and
that the version number itself moved.
Used for: knowledge_base_schema.py's CREATE_SCHEMA_SQL, _migrate_compat_patterns_v4,
apply_schema.
Solves: A silent additive column with no test is one accidental revert away from being
silently missing again -- see docs/lessons-learned.md, "prove a guard by breaking it."
"""

import sqlite3
import unittest

from backend.services.knowledge_base_schema import CORPUS_SCHEMA_VERSION, apply_schema


class CompatPatternsAppIdColumnTests(unittest.TestCase):
    def test_schema_version_is_four(self):
        """The number a manifest ships and a client compares against (D29's schema bump)."""
        self.assertEqual(CORPUS_SCHEMA_VERSION, 4)

    def test_a_fresh_database_has_the_column(self):
        conn = sqlite3.connect(":memory:")
        try:
            apply_schema(conn)
            cols = {r[1] for r in conn.execute("PRAGMA table_info(compat_patterns)").fetchall()}
            self.assertIn("app_id", cols)
        finally:
            conn.close()

    def test_the_column_is_nullable_and_free_text(self):
        """Every existing shared tip has no app_id (D29): null must insert cleanly."""
        conn = sqlite3.connect(":memory:")
        try:
            apply_schema(conn)
            conn.execute(
                "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, "
                "source_license, app_id) VALUES (1, 'proton', '[]', 'x', '', 'bonsAI-maintainer', NULL)"
            )
            conn.execute(
                "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, "
                "source_license, app_id) VALUES (2, 'proton', '[]', 'y', '', 'bonsAI-maintainer', '2321470')"
            )
            rows = conn.execute("SELECT pattern_id, app_id FROM compat_patterns ORDER BY pattern_id").fetchall()
            self.assertEqual(rows, [(1, None), (2, "2321470")])
        finally:
            conn.close()

    def test_an_older_database_gets_the_column_added_not_a_crash(self):
        """A corpus.db built before this column existed (schema v3) opens fine afterwards."""
        conn = sqlite3.connect(":memory:")
        try:
            # Build the pre-v4 shape by hand -- the exact CREATE_SCHEMA_SQL this column was
            # added to, minus the new column and its index.
            conn.executescript(
                """
                CREATE TABLE compat_patterns (
                    pattern_id INTEGER PRIMARY KEY,
                    topic TEXT NOT NULL,
                    platforms TEXT NOT NULL DEFAULT '[]',
                    card TEXT NOT NULL,
                    source_url TEXT,
                    source_license TEXT
                );
                """
            )
            conn.execute(
                "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, "
                "source_license) VALUES (1, 'proton', '[]', 'x', '', 'bonsAI-maintainer')"
            )
            conn.commit()

            apply_schema(conn)

            cols = {r[1] for r in conn.execute("PRAGMA table_info(compat_patterns)").fetchall()}
            self.assertIn("app_id", cols)
            row = conn.execute(
                "SELECT app_id FROM compat_patterns WHERE pattern_id = 1"
            ).fetchone()
            self.assertIsNone(row[0])
        finally:
            conn.close()
