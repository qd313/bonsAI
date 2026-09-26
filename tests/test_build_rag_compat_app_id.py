"""Title: The library builder seeds a tip's per-game app_id

Purpose: D29 added an optional per-game field to compat_patterns.json. This pins that
_seed_compat_patterns carries it into the built database -- null for a shared tip (every
row before this change, and most rows after it), the given value for a per-game one.
Used for: scripts/build_rag_db.py's _seed_compat_patterns.
Solves: A column added to the schema but never wired into the seeder ships a corpus.db
whose per-game tips are indistinguishable from shared ones -- the bug this schema change
exists to fix, quietly not actually fixed.
"""

import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_build_rag_db():
    path = REPO_ROOT / "scripts" / "build_rag_db.py"
    spec = importlib.util.spec_from_file_location("build_rag_db", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


build_rag_db = _load_build_rag_db()


class SeedCompatPatternsAppIdTests(unittest.TestCase):
    def _seed(self, rows: list[dict]) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        build_rag_db.apply_schema(conn)
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp)
            (data_dir / "compat_patterns.json").write_text(json.dumps(rows), encoding="utf-8")
            with mock.patch.object(build_rag_db, "KB_DATA_DIR", data_dir):
                build_rag_db._seed_compat_patterns(conn)
        conn.commit()
        return conn

    def test_a_row_with_no_app_id_key_is_seeded_as_null(self):
        conn = self._seed(
            [{"pattern_id": 1, "topic": "proton", "platforms": [], "card": "x",
              "source_url": "", "source_license": "bonsAI-maintainer"}]
        )
        try:
            row = conn.execute("SELECT app_id FROM compat_patterns WHERE pattern_id = 1").fetchone()
            self.assertIsNone(row[0])
        finally:
            conn.close()

    def test_a_per_game_row_carries_its_app_id_through(self):
        conn = self._seed(
            [{"pattern_id": 1, "topic": "proton", "platforms": [], "card": "x",
              "source_url": "", "source_license": "bonsAI-maintainer", "app_id": "2321470"}]
        )
        try:
            row = conn.execute("SELECT app_id FROM compat_patterns WHERE pattern_id = 1").fetchone()
            self.assertEqual(row[0], "2321470")
        finally:
            conn.close()

    def test_a_non_steam_titles_app_id_can_be_its_igdb_style_key(self):
        """Ocarina of Time has no Steam AppID in the real seed -- its per-game tips carry the
        same key strategy_seed.json already uses for that title (games.igdb_id)."""
        conn = self._seed(
            [{"pattern_id": 1, "topic": "proton", "platforms": [], "card": "x",
              "source_url": "", "source_license": "bonsAI-maintainer", "app_id": "emudeck-oot-n64"}]
        )
        try:
            row = conn.execute("SELECT app_id FROM compat_patterns WHERE pattern_id = 1").fetchone()
            self.assertEqual(row[0], "emudeck-oot-n64")
        finally:
            conn.close()
