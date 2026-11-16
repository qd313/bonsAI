"""Title: The shipped LOOT rule files are what the licence reviewer was told they are

Purpose: Pin the two files under data/kb/load_order/: each names the LOOT repository, a full commit
hash, the commit's date, "CC0-1.0" and the day it was read; neither holds a web address (a link to
Nexus Mods most of all) or a stray byte; both pass the library builder's own row checks; and the
real seed builds them into the load_order tables with the same counts.
Used for: data/kb/load_order/fallout4.json and skyrimse.json, made by scripts/kb/fetch_loot_masterlist.py
and read by scripts/kb/build_rag_db.py's _seed_load_order.
Solves: A file edited by hand, re-fetched against a different commit without saying so, or carrying a
link the plugin may not ship would reach the published library with no other symptom.
Does not: Re-read GitHub (the fetcher's own tests use stand-ins) or test how a rule is found
(tests/test_rag_corpus_load_order.py).
"""

from __future__ import annotations

import json
import re
import sqlite3
import unittest
from pathlib import Path

from build_rag_db_loader import REPO_ROOT, load_build_rag_db

build_rag_db = load_build_rag_db()
FOLDER = REPO_ROOT / "data" / "kb" / "load_order"
GAMES = ("fallout4", "skyrimse")
# The commits plan 101 read and plan 104 pinned. Reading a newer list is a deliberate change: say so in the
# commit, update these two lines and the date below.
PINNED = {"fallout4": "4c7858a84bc65b34904b53c5e6252d3f6f9b1247", "skyrimse": "f37b59d04fb28f438a71159216bffb5fb3f9af73"}
FLOOR = {"fallout4": 400, "skyrimse": 1200}


def _load(game: str) -> dict:
    return json.loads((FOLDER / f"{game}.json").read_text(encoding="utf-8"))


class ShippedLoadOrderFileTests(unittest.TestCase):
    def test_each_file_names_its_source_its_commit_and_the_cc0_licence(self):
        for game in GAMES:
            with self.subTest(game=game):
                head = _load(game)["header"]
                self.assertEqual(head["game"], game)
                self.assertEqual(head["repository"], f"https://github.com/loot/{game}")
                self.assertEqual(head["commit"], PINNED[game])
                self.assertEqual(head["licence"], "CC0-1.0")
                self.assertRegex(head["commit_date"], r"^\d{4}-\d{2}-\d{2}$")
                self.assertRegex(head["date_read"], r"^\d{4}-\d{2}-\d{2}$")
                self.assertGreaterEqual(head["date_read"], head["commit_date"])

    def test_no_web_address_and_no_stray_byte_is_in_either_file(self):
        for game in GAMES:
            with self.subTest(game=game):
                raw = (FOLDER / f"{game}.json").read_bytes()
                # A Windows checkout (core.autocrlf=true) writes these files with CRLF line ends; the blobs in
                # Git are LF. A CRLF pair is fine; any other carriage return is a stray byte.
                self.assertNotIn(b"\r", raw.replace(b"\r\n", b"\n"))
                self.assertNotIn(b"\x00", raw)
                text = raw.decode("utf-8")
                self.assertNotIn("nexusmods", text.lower())
                # The header's own repository address is the only web address.
                self.assertEqual(re.findall(r"https?://[^\"]*", text), [f"https://github.com/loot/{game}"])

    def test_each_file_holds_a_sane_number_of_entries_each_with_a_rule(self):
        for game in GAMES:
            with self.subTest(game=game):
                entries = _load(game)["entries"]
                self.assertGreaterEqual(len(entries), FLOOR[game])
                for e in entries:
                    self.assertTrue(e["after"] or e["requires"] or e["incompatible"] or e["messages"], e["name"])

    def test_the_notice_names_loots_lists_with_their_repositories_and_licence(self):
        line = next(
            (l for l in (REPO_ROOT / "data" / "kb" / "NOTICE.md").read_text(encoding="utf-8").splitlines() if "LOOT" in l),
            "",
        )
        for game in GAMES:
            self.assertIn(f"github.com/loot/{game}", line)
        self.assertIn("CC0-1.0", line)

    def test_conditions_are_kept_as_written_including_file_fingerprint_tests(self):
        # The fetcher's header says so; the checker counts these rules as not checked.
        for game in GAMES:
            with self.subTest(game=game):
                self.assertIn("checksum(", (FOLDER / f"{game}.json").read_text(encoding="utf-8"))

    def test_both_files_pass_the_builders_own_row_checks(self):
        pairs = build_rag_db._load_order_files()
        self.assertEqual(sorted(p[0] for p in pairs), ["load_order/fallout4.json", "load_order/skyrimse.json"])
        self.assertEqual(build_rag_db._load_order_problems(pairs), [])

    def test_the_real_seed_builds_both_games_with_the_same_counts(self):
        conn = sqlite3.connect(":memory:")
        try:
            build_rag_db.apply_schema(conn)
            build_rag_db.seed_sample_corpus(conn)
            for game in GAMES:
                built = conn.execute("SELECT COUNT(*) FROM load_order_rules WHERE game_key = ?", (game,)).fetchone()[0]
                self.assertEqual(built, len(_load(game)["entries"]))
            self.assertEqual(
                build_rag_db._load_order_rule_count(conn), sum(len(_load(g)["entries"]) for g in GAMES)
            )
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
