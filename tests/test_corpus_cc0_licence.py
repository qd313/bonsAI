"""Title: The library's checks accept CC0 (no-conditions) sources

Purpose: Pin that a note marked CC0-1.0 passes the publish check, gets its deed link and its own
    group in the credits file, and is read from a wiki's own licence wording; and that a made-up
    licence is still refused.
Used for: scripts/kb/publish_corpus.py, build_rag_db.py, extract_wiki_notes.py.
Solves: The best mod data is published CC0, and the publish check refused it.
Does not: Add any CC0 note; no note in the library uses the licence yet.
"""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from script_loader import load_script

CC0_DEED = "https://creativecommons.org/publicdomain/zero/1.0/"


class Cc0LicenceTests(unittest.TestCase):
    """A tiny hand-made library: one third-party note, one maintainer note, no vectors. The
    publish check's other complaints (no vectors, no chunks) are ignored; only licence lines count."""

    def setUp(self):
        self.build = load_script("build_rag_db.py", "build_rag_db_cc0_test")
        self.publish = load_script("publish_corpus.py", "publish_corpus_cc0_test")
        self.extract = load_script("extract_wiki_notes", register=True)
        self._tmp = tempfile.TemporaryDirectory()
        self.out_dir = Path(self._tmp.name)
        (self.out_dir / self.build.CORPUS_MANIFEST_FILENAME).write_text("{}", encoding="utf-8")
        conn = sqlite3.connect(self.out_dir / self.build.CORPUS_DB_FILENAME)
        try:
            self.build.apply_schema(conn)
            conn.execute(
                "INSERT INTO games(game_id, app_id, igdb_id, canonical_title, edition, platform, genres) "
                "VALUES (1, '1', NULL, 'Test Game', NULL, 'Steam', '[]')"
            )
            for sid, url, lic in ((1, "https://example.org/wiki/A", "CC-BY-4.0"), (2, "", "bonsAI-maintainer")):
                conn.execute(
                    "INSERT INTO sections(section_id, game_id, section_type, name, card, source_url, "
                    "source_license, source_version, crawled_at) VALUES "
                    "(?, 1, 'mechanic', ?, 'A card.', ?, ?, NULL, '2026-11-09')",
                    (sid, f"Section {sid}", url, lic),
                )
            conn.commit()
        finally:
            conn.close()

    def tearDown(self):
        self._tmp.cleanup()

    def _set_licence(self, name: str) -> None:
        conn = sqlite3.connect(self.out_dir / self.build.CORPUS_DB_FILENAME)
        try:
            conn.execute("UPDATE sections SET source_license = ? WHERE section_id = 1", (name,))
            conn.commit()
        finally:
            conn.close()

    def _licence_errors(self) -> list[str]:
        return [e for e in self.publish.validate_build(self.out_dir) if "source_license" in e]

    def test_publish_check_accepts_cc0(self):
        self._set_licence("CC0-1.0")
        self.assertEqual(self._licence_errors(), [])

    def test_publish_check_still_refuses_a_made_up_licence(self):
        self._set_licence("Made-Up-1.0")
        errors = self._licence_errors()
        self.assertTrue(any("disallowed" in e and "Made-Up-1.0" in e for e in errors), errors)

    def test_version_check_accepts_cc0(self):
        self.assertTrue(self.build.licence_string_includes_version("CC0-1.0"))

    def test_deed_link_for_cc0(self):
        self.assertEqual(self.build.licence_deed_url("CC0-1.0"), CC0_DEED)
        self.assertEqual(self.build.licence_deed_url("CC0 1.0"), CC0_DEED)

    def test_credits_file_gives_cc0_its_own_group(self):
        self._set_licence("CC0-1.0")
        conn = sqlite3.connect(self.out_dir / self.build.CORPUS_DB_FILENAME)
        try:
            text = self.build.format_attributions_markdown(conn)
        finally:
            conn.close()
        self.assertIn("## No-conditions sources (CC0)", text)
        group = text.split("## No-conditions sources (CC0)", 1)[1]
        self.assertIn("example.org · CC0-1.0", group)
        self.assertIn(CC0_DEED, group)
        self.assertIn("no conditions apply", group.lower())
        self.assertIn("courtesy", group)

    def test_credits_file_has_no_cc0_group_without_cc0_cards(self):
        self._set_licence("CC-BY-4.0")
        conn = sqlite3.connect(self.out_dir / self.build.CORPUS_DB_FILENAME)
        try:
            text = self.build.format_attributions_markdown(conn)
        finally:
            conn.close()
        self.assertNotIn("No-conditions sources", text)

    def test_wiki_reader_allows_and_recognises_cc0(self):
        self.assertIn("CC0-1.0", self.extract._load_allowed_licences())
        self.assertEqual(
            self.extract.canonical_licence("", "https://creativecommons.org/publicdomain/zero/1.0/"),
            "CC0-1.0",
        )
        self.assertEqual(self.extract.canonical_licence("CC0 1.0 Universal", ""), "CC0-1.0")
        self.assertEqual(self.extract.canonical_licence("Creative Commons Zero", ""), "CC0-1.0")


if __name__ == "__main__":
    unittest.main()
