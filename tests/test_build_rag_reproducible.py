"""Title: Corpus build determinism

Purpose: Pin that a corpus rebuild is byte-reproducible — no build clock reaches the DB.
Used for: scripts/build_rag_db.py _seed_strategy_corpus crawled_at handling.
Solves: `crawled = _utc_now()` stamped build time into the 58 maintainer-authored rows, so
  every rebuild produced a different db_sha256 (three builds on 2026-08-14 gave 758505 /
  758506 / 758507 bytes) and the published manifest hash could not attest provenance.
Does not: Cover embedding determinism (vectors come from Ollama) or manifest published_at,
  which is publish metadata and is meant to move.
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from script_loader import load_script


def _load_build_rag_db():
    return load_script("build_rag_db", "build_rag_db_repro")


build_rag_db = _load_build_rag_db()


def _seed_payload(sections: list[dict]) -> dict:
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
        "sections": sections,
        "genre_patterns": [],
    }


class CorpusBuildDeterminismTests(unittest.TestCase):
    def _seed_into(self, tmp: Path, sections: list[dict]) -> sqlite3.Connection:
        (tmp / "strategy_seed.json").write_text(
            json.dumps(_seed_payload(sections)), encoding="utf-8"
        )
        original = build_rag_db.KB_DATA_DIR
        build_rag_db.KB_DATA_DIR = tmp
        try:
            conn = sqlite3.connect(":memory:")
            build_rag_db.apply_schema(conn)
            build_rag_db._seed_strategy_corpus(conn)
            return conn
        finally:
            build_rag_db.KB_DATA_DIR = original

    def _maintainer_section(self) -> dict:
        return {
            "section_id": 1,
            "game_id": 1,
            "section_type": "boss",
            "name": "Maintainer card",
            "card": "Written by us, crawled from nowhere.",
            "source_url": "",
            "source_license": "bonsAI-maintainer",
        }

    def test_maintainer_row_records_no_capture_date(self):
        """A card we wrote was never crawled, so it must not claim a capture date."""
        with tempfile.TemporaryDirectory() as d:
            conn = self._seed_into(Path(d), [self._maintainer_section()])
            crawled = conn.execute("SELECT crawled_at FROM sections").fetchone()[0]
        self.assertEqual(crawled, "", f"maintainer row claimed a capture date: {crawled!r}")

    def test_repeated_seeding_writes_identical_rows(self):
        """The same seed JSON must produce the same bytes however many times it is built.

        This is the actual regression: build time in crawled_at made every rebuild differ.
        """
        sections = [
            self._maintainer_section(),
            {
                "section_id": 2,
                "game_id": 1,
                "section_type": "boss",
                "name": "Wiki card",
                "card": "Distilled from a wiki.",
                "source_url": "https://example.wiki/Boss",
                "source_license": "CC-BY-SA-4.0",
                "crawled_at": "2026-08-09",
            },
        ]
        rows = []
        for _ in range(2):
            with tempfile.TemporaryDirectory() as d:
                conn = self._seed_into(Path(d), sections)
                rows.append(
                    conn.execute(
                        "SELECT section_id, crawled_at FROM sections ORDER BY section_id"
                    ).fetchall()
                )
        self.assertEqual(rows[0], rows[1])
        self.assertEqual(rows[0], [(1, ""), (2, "2026-08-09")])

    def test_sourced_row_without_capture_date_fails_the_build(self):
        """A third-party card with no crawled_at cannot be attributed, so refuse to guess it.

        Falling back to build time here is what made the corpus unreproducible; falling back
        to empty would silently blank a licensing-relevant field in ATTRIBUTIONS.
        """
        undated = {
            "section_id": 3,
            "game_id": 1,
            "section_type": "boss",
            "name": "Undated wiki card",
            "card": "Distilled from a wiki, capture date unrecorded.",
            "source_url": "https://example.wiki/Undated",
            "source_license": "CC-BY-SA-4.0",
        }
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(SystemExit) as caught:
                self._seed_into(Path(d), [undated])
        self.assertIn("Undated wiki card", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
