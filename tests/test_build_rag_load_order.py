"""Title: The library builder writes LOOT's load-order rules into their own tables

Purpose: Pin how data/kb/load_order/*.json becomes the load_order_sources and load_order_rules
tables: one source row per game with its commit, date and CC0 licence, one rule row per plugin, a
bad file stops the build with a plain reason, the manifest counts the rules, the credits file names
LOOT, a build with no such folder still works and has no such table, and the same input builds the
same bytes.
Used for: scripts/kb/build_rag_db.py's _seed_load_order, build_corpus and
collect_third_party_attribution_sources, and LOAD_ORDER_SCHEMA_SQL and load_order_name_key in
knowledge_base_schema.
Solves: A rule filed under the wrong game, a file whose licence is not CC0, a web link, or a library
that fails to open because of a table it does not need would all ship with no other symptom.
Does not: Cover how the plugin reads a rule back (tests/test_rag_corpus_load_order.py) or the shipped
data files themselves (tests/test_load_order_data_files.py).
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from backend.knowledge.knowledge_base_schema import (
    load_order_is_pattern_name,
    load_order_name_key,
    load_order_pattern_matches,
)
from build_rag_db_loader import load_build_rag_db
from rag_corpus_seed_fixtures import compat_payload, seed_payload
from script_loader import load_script

build_rag_db = load_build_rag_db()


def _entry(name: str = "Big Mod.esp", **overrides) -> dict:
    entry = {
        "name": name,
        "isPattern": False,
        "after": [],
        "requires": [],
        "incompatible": [],
        "messages": [],
    }
    entry.update(overrides)
    return entry


def game_file(game: str = "fallout4", entries=None, **header_overrides) -> dict:
    header = {
        "game": game,
        "repository": f"https://github.com/loot/{game}",
        "commit": "a" * 40,
        "commit_date": "2026-11-01",
        "licence": "CC0-1.0",
        "date_read": "2026-11-15",
    }
    header.update(header_overrides)
    if entries is None:
        entries = [_entry(after=[{"name": "Other.esp"}])]
    return {"header": header, "groups": [{"name": "default", "after": []}], "entries": entries}


class _LoadOrderBuildBase(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.kb_dir = self.root / "kb_data"
        (self.kb_dir / "load_order").mkdir(parents=True)
        for name, payload in (("strategy_seed.json", seed_payload(2)), ("compat_patterns.json", compat_payload(2))):
            (self.kb_dir / name).write_text(json.dumps(payload), encoding="utf-8")
        self.enterContext(mock.patch.object(build_rag_db, "KB_DATA_DIR", self.kb_dir))

    def _write(self, name: str, data) -> None:
        (self.kb_dir / "load_order" / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def _seed(self) -> sqlite3.Connection:
        conn = sqlite3.connect(":memory:")
        build_rag_db.apply_schema(conn)
        build_rag_db.seed_sample_corpus(conn)
        return conn

    def _refused(self, *needles: str) -> None:
        with self.assertRaises(SystemExit) as ctx:
            self._seed()
        for needle in needles:
            self.assertIn(needle, str(ctx.exception))


def _tables(conn: sqlite3.Connection) -> set[str]:
    return {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


class NameKeyTests(unittest.TestCase):
    def test_a_name_is_compared_without_case_extension_spaces_or_underscores(self):
        for spelling in ("Unofficial Skyrim Patch.esp", "unofficial_skyrim_patch.ESM", "UnofficialSkyrimPatch"):
            with self.subTest(spelling=spelling):
                self.assertEqual(load_order_name_key(spelling), "unofficialskyrimpatch")

    def test_a_dot_inside_a_name_is_not_taken_for_an_extension(self):
        self.assertEqual(load_order_name_key("Mod v1.20"), "modv1.20")


class PatternMatchTests(unittest.TestCase):
    def test_a_name_is_a_pattern_by_loots_own_characters(self):
        for name in (r"A.*\.esp", "A|B.esp", "A?.esp", "Left: Dead"):
            self.assertTrue(load_order_is_pattern_name(name), name)
        for name in ("ccBGSFO4001-PipBoy(Black).esl", "Plain Mod.esp", "Mod [1.2].esp"):
            self.assertFalse(load_order_is_pattern_name(name), name)

    def test_a_pattern_fits_the_whole_name_without_regard_to_case(self):
        self.assertTrue(load_order_pattern_matches(r"Bashed Patch.*\.esp", "bashed patch, 0.ESP"))
        self.assertFalse(load_order_pattern_matches(r"Bashed Patch.*\.esp", "My Bashed Patch.esp"))

    def test_a_plain_name_is_tried_with_each_plugin_ending_but_a_file_ending_is_not_added_to(self):
        self.assertTrue(load_order_pattern_matches(r"Bashed Patch.*\.esp", "Bashed Patch"))
        self.assertTrue(load_order_pattern_matches(r"Mod v1\.20\.esm", "Mod v1.20"))
        self.assertFalse(load_order_pattern_matches(r"Bashed Patch.*\.esp", "Bashed Patch.txt"))

    def test_a_pattern_that_will_not_compile_matches_nothing(self):
        self.assertFalse(load_order_pattern_matches("Broken(.esp", "Broken(.esp"))


class SeedLoadOrderTests(_LoadOrderBuildBase):
    def test_a_plain_schema_has_no_load_order_table(self):
        conn = sqlite3.connect(":memory:")
        build_rag_db.apply_schema(conn)
        self.assertFalse({"load_order_rules", "load_order_sources"} & _tables(conn))

    def test_no_folder_files_means_no_table_and_a_build_that_still_works(self):
        conn = self._seed()
        try:
            self.assertFalse({"load_order_rules", "load_order_sources"} & _tables(conn))
            self.assertEqual(build_rag_db._load_order_rule_count(conn), 0)
        finally:
            conn.close()

    def test_a_missing_folder_is_no_table_either(self):
        (self.kb_dir / "load_order").rmdir()
        conn = self._seed()
        try:
            self.assertNotIn("load_order_rules", _tables(conn))
        finally:
            conn.close()

    def test_each_game_gets_a_source_row_and_its_rules(self):
        entry = _entry(
            "Big Mod.esp",
            group="Late",
            after=[{"name": "Other.esp", "condition": 'active("X.esp")'}],
            requires=[{"name": "Lib.esp", "display": "Lib"}],
            incompatible=[{"name": "Clash.esp"}],
            messages=[{"type": "say", "text": "Hello {0}", "subs": ["a"], "condition": None}],
        )
        self._write("fallout4.json", game_file("fallout4", [entry, _entry("Pat.*\\.esp", isPattern=True,
                                                                            after=[{"name": "Z.esp"}])]))
        self._write("skyrimse.json", game_file("skyrimse", commit_date="2026-10-31"))
        conn = self._seed()
        try:
            sources = conn.execute(
                "SELECT game_key, repository, commit_hash, commit_date, licence, date_read, groups "
                "FROM load_order_sources ORDER BY game_key"
            ).fetchall()
            self.assertEqual(
                [(s[0], s[1], s[3], s[4], s[5]) for s in sources],
                [
                    ("fallout4", "https://github.com/loot/fallout4", "2026-11-01", "CC0-1.0", "2026-11-15"),
                    ("skyrimse", "https://github.com/loot/skyrimse", "2026-10-31", "CC0-1.0", "2026-11-15"),
                ],
            )
            self.assertEqual(json.loads(sources[0][6]), [{"name": "default", "after": []}])
            row = conn.execute(
                "SELECT name, name_key, is_pattern, plugin_group, after, requires, incompatible, messages "
                "FROM load_order_rules WHERE game_key = 'fallout4' ORDER BY rule_id"
            ).fetchall()
            self.assertEqual(len(row), 2)
            name, key, is_pattern, group, after, requires, incompatible, messages = row[0]
            self.assertEqual((name, key, is_pattern, group), ("Big Mod.esp", "bigmod", 0, "Late"))
            self.assertEqual(json.loads(after), entry["after"])
            self.assertEqual(json.loads(requires), entry["requires"])
            self.assertEqual(json.loads(incompatible), entry["incompatible"])
            self.assertEqual(json.loads(messages), entry["messages"])
            self.assertEqual(row[1][2], 1)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM load_order_rules").fetchone()[0], 3)
        finally:
            conn.close()

    def test_a_good_file_is_not_refused(self):
        # The other direction: none of the refusals below may fire on good input.
        self._write("fallout4.json", game_file())
        self._seed().close()


class LoadOrderRefusalTests(_LoadOrderBuildBase):
    def test_a_licence_that_is_not_cc0_stops_the_build(self):
        self._write("fallout4.json", game_file(licence="CC-BY-SA-4.0"))
        self._refused("load_order", "fallout4.json", "licence")

    def test_a_game_that_is_not_known_stops_the_build(self):
        self._write("starfield.json", game_file("starfield"))
        self._refused("starfield.json", "game")

    def test_a_missing_header_field_stops_the_build(self):
        data = game_file()
        del data["header"]["commit"]
        self._write("fallout4.json", data)
        self._refused("fallout4.json", "commit")

    def test_a_badly_dated_header_stops_the_build(self):
        self._write("fallout4.json", game_file(commit_date="yesterday"))
        self._refused("commit_date")

    def test_two_files_for_one_game_stop_the_build(self):
        self._write("fallout4.json", game_file())
        self._write("fallout4-again.json", game_file())
        self._refused("fallout4", "twice")

    def test_a_plugin_with_no_rule_stops_the_build(self):
        self._write("fallout4.json", game_file(entries=[_entry()]))
        self._refused("Big Mod.esp", "no rule")

    def test_a_web_link_anywhere_stops_the_build(self):
        bad = _entry(messages=[{"type": "say", "text": "See https://example.org", "subs": [], "condition": None}])
        self._write("fallout4.json", game_file(entries=[bad]))
        self._refused("link")

    def test_a_pattern_that_is_not_a_regular_expression_stops_the_build(self):
        self._write("fallout4.json", game_file(entries=[_entry("Broken(.esp", isPattern=True,
                                                               after=[{"name": "A.esp"}])]))
        self._refused("Broken(.esp", "pattern")

    def test_two_entries_with_one_name_stop_the_build(self):
        rows = [_entry("Same.esp", after=[{"name": "A.esp"}]), _entry("same.ESP", after=[{"name": "B.esp"}])]
        self._write("fallout4.json", game_file(entries=rows))
        self._refused("same.ESP", "twice")

    def test_a_message_of_an_unknown_kind_stops_the_build(self):
        bad = _entry(messages=[{"type": "shout", "text": "Hi", "subs": [], "condition": None}])
        self._write("fallout4.json", game_file(entries=[bad]))
        self._refused("shout")

    def test_a_rule_item_with_no_name_stops_the_build(self):
        self._write("fallout4.json", game_file(entries=[_entry(after=[{"condition": "x"}])]))
        self._refused("after")

    def test_a_file_that_is_not_an_object_stops_the_build(self):
        self._write("fallout4.json", ["not", "an", "object"])
        self._refused("fallout4.json")


class LoadOrderBuildCorpusTests(_LoadOrderBuildBase):
    def setUp(self):
        super().setUp()
        model = build_rag_db.DEFAULT_EMBEDDING_MODEL
        zeros = [0.0] * build_rag_db.DEFAULT_EMBEDDING_DIM
        self.enterContext(mock.patch.object(build_rag_db, "_list_installed_ollama_tags", return_value=[model]))
        self.enterContext(
            mock.patch.object(build_rag_db, "_embed_texts_build", side_effect=lambda _b, texts, **_k: [zeros] * len(texts))
        )

    def _out(self, name: str) -> Path:
        return self.root / name

    def test_the_manifest_counts_the_rules_and_the_schema_version_stays_4(self):
        self._write("fallout4.json", game_file())
        self._write("skyrimse.json", game_file("skyrimse", entries=[
            _entry("A.esp", after=[{"name": "B.esp"}]), _entry("C.esp", incompatible=[{"name": "D.esp"}])]))
        manifest = build_rag_db.build_corpus(self._out("out"), seed=True)
        self.assertEqual(manifest["load_order_rule_count"], 3)
        self.assertEqual(manifest["schema_version"], 4)

    def test_a_build_with_the_folder_missing_has_no_table_and_counts_zero(self):
        (self.kb_dir / "load_order").rmdir()
        manifest = build_rag_db.build_corpus(self._out("out"), seed=True)
        self.assertEqual(manifest["load_order_rule_count"], 0)
        conn = sqlite3.connect(str(self._out("out") / "corpus.db"))
        try:
            self.assertFalse({"load_order_rules", "load_order_sources"} & _tables(conn))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0], 2)
        finally:
            conn.close()

    def test_the_credits_name_loots_lists_as_a_no_conditions_source(self):
        self._write("fallout4.json", game_file())
        manifest = build_rag_db.build_corpus(self._out("out"), seed=True)
        text = manifest["attributions_markdown"]
        self.assertIn("No-conditions sources (CC0)", text)
        self.assertIn("github.com · CC0-1.0", text)
        self.assertIn("Fallout 4 — load-order rules from LOOT", text)
        self.assertIn("2026-11-01", text)
        self.assertEqual(text, (self._out("out") / "ATTRIBUTIONS.md").read_text(encoding="utf-8"))

    def test_no_credit_is_added_when_there_are_no_rules(self):
        (self.kb_dir / "load_order").rmdir()
        text = build_rag_db.build_corpus(self._out("out"), seed=True)["attributions_markdown"]
        self.assertNotIn("LOOT", text)

    def test_a_library_with_rules_still_passes_the_publish_check(self):
        # The publish gate needs no line for these tables: the build refuses anything but CC0.
        self._write("fallout4.json", game_file())
        build_rag_db.build_corpus(self._out("out"), seed=True)
        errors = load_script("publish_corpus").validate_build(self._out("out"))
        self.assertEqual(errors, [])

    def test_the_build_is_repeatable_with_rules(self):
        self._write("fallout4.json", game_file())
        first = build_rag_db.build_corpus(self._out("out1"), seed=True)
        second = build_rag_db.build_corpus(self._out("out2"), seed=True)
        self.assertEqual(first["db_sha256"], second["db_sha256"])


if __name__ == "__main__":
    unittest.main()
