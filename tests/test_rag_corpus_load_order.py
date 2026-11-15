"""Title: The plugin finds a mod's load-order rule in the library, and never fails when it cannot

Purpose: Pin rag_corpus_load_order: given a game and a mod's file name or plain name it returns that
mod's rule from LOOT's list (or nothing), names match without case, file ending, spaces or
underscores, a pattern entry matches as a pattern, a library with no such table or no library at all
or a damaged one answers nothing and raises nothing, and every read uses the calling thread's own
connection.
Used for: backend/knowledge/rag_corpus_load_order.py, over a library built by the real builder from
the shipped data/kb/load_order files.
Solves: A reader that raised on an older library (the plugin never rewrites an installed library), found
nothing for "Sky UI SE" though the list has "SkyUI_SE.esp", or shared one connection between threads
(which crashed the whole back end on 2026-11-11) would each show up as a broken answer with no
visible cause.
Does not: Choose when a rule is attached to an answer or word it for the AI.
"""

from __future__ import annotations

import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_load_order as reader  # noqa: E402
from backend.knowledge.knowledge_base_cards import close_connection  # noqa: E402
from backend.knowledge.knowledge_base_schema import CREATE_SCHEMA_SQL, LOAD_ORDER_SCHEMA_SQL  # noqa: E402
from build_rag_db_loader import load_build_rag_db  # noqa: E402

build_rag_db = load_build_rag_db()


class _Library(unittest.TestCase):
    """A library file in a fresh folder; subclasses decide what it holds."""

    def setUp(self):
        self.folder = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.db = self.folder / "corpus.db"
        self.addCleanup(close_connection, str(self.db))
        self.settings = {"rag_corpus_path": str(self.folder), "use_local_knowledge_base": True}

    def _build(self, *, rules: bool = True) -> None:
        conn = sqlite3.connect(str(self.db))
        conn.executescript(CREATE_SCHEMA_SQL)
        if rules:
            build_rag_db._seed_load_order(conn)  # the real shipped files
        conn.commit()
        conn.close()


class FindingAModTests(_Library):
    def setUp(self):
        super().setUp()
        self._build()

    def _find(self, game, name):
        return reader.rag_corpus_load_order_entry(self.settings, game, name)

    def test_three_mods_are_found_by_plain_name_and_by_file_name(self):
        for game, plain, file_name, stored in (
            ("skyrimse", "SkyUI SE", "SkyUI_SE.esp", "SkyUI_SE.esp"),
            ("skyrimse", "Requiem", "Requiem.esp", "Requiem.esp"),
            ("fallout4", "Armorsmith Extended", "Armorsmith Extended.esp", "Armorsmith Extended.esp"),
        ):
            for spelling in (plain, file_name):
                with self.subTest(game=game, spelling=spelling):
                    entry = self._find(game, spelling)
                    self.assertIsNotNone(entry)
                    self.assertEqual(entry["name"], stored)

    def test_the_entry_carries_the_rules_the_date_and_the_commit(self):
        entry = self._find("skyrimse", "skyui_se")
        self.assertEqual(entry["game"], "skyrimse")
        self.assertEqual(entry["list_date"], "2026-10-31")
        self.assertEqual(entry["commit"], "f37b59d04fb28f438a71159216bffb5fb3f9af73")
        self.assertEqual(entry["group"], "Fixes")
        self.assertEqual(entry["requires"][0]["name"], "../skse64_loader.exe")
        self.assertEqual(self._find("skyrimse", "Requiem")["incompatible"][0], {"name": "Adamant.esp"})
        self.assertEqual(self._find("fallout4", "Vivid Waters")["after"][0], {"name": "WET.esp"})
        self.assertEqual(self._find("fallout4", "Vivid Waters")["list_date"], "2026-11-01")

    def test_names_match_without_case_ending_spaces_or_underscores(self):
        for spelling in ("skyui_se.ESP", "Sky UI SE", "SKYUI_SE", "  skyui se  ", "SkyUI_SE"):
            with self.subTest(spelling=spelling):
                self.assertEqual(self._find("skyrimse", spelling)["name"], "SkyUI_SE.esp")

    def test_the_game_may_be_given_as_a_steam_id_or_a_title(self):
        for game in ("skyrimse", "489830", "Skyrim Special Edition", "The Elder Scrolls V: Skyrim Special Edition"):
            with self.subTest(game=game):
                self.assertEqual(self._find(game, "Requiem")["name"], "Requiem.esp")
        self.assertEqual(self._find("377160", "Vivid Waters")["name"], "Vivid Waters.esp")

    def test_a_mod_of_the_other_game_or_an_unknown_one_is_not_found(self):
        self.assertIsNone(self._find("fallout4", "SkyUI_SE.esp"))
        self.assertIsNone(self._find("skyrimse", "A Mod Nobody Listed.esp"))
        self.assertIsNone(self._find("starfield", "Requiem"))
        self.assertIsNone(self._find("", "Requiem"))
        self.assertIsNone(self._find("skyrimse", ""))
        self.assertIsNone(self._find("skyrimse", "   "))
        self.assertIsNone(self._find("skyrimse", "x" * 5000))

    def test_a_pattern_entry_matches_as_a_pattern_over_the_whole_name(self):
        for spelling in ("Bashed Patch, 0.esp", "bashed patch.ESP", "Bashed Patch"):
            with self.subTest(spelling=spelling):
                entry = self._find("skyrimse", spelling)
                self.assertEqual(entry["name"], "Bashed Patch.*\\.esp")
                self.assertTrue(entry["is_pattern"])
        self.assertIsNone(self._find("skyrimse", "My Bashed Patch.esp"))
        self.assertIsNone(self._find("skyrimse", "Bashed Patch.txt"))

    def test_a_plain_name_is_found_before_any_pattern(self):
        conn = sqlite3.connect(str(self.db))
        conn.execute(
            "INSERT INTO load_order_rules(rule_id, game_key, name, name_key, is_pattern, after) "
            "VALUES (9001, 'skyrimse', 'Sky.*\\.esp', 'sky.*', 1, '[]')"
        )
        conn.commit()
        conn.close()
        close_connection(str(self.db))
        self.assertEqual(self._find("skyrimse", "SkyUI_SE.esp")["name"], "SkyUI_SE.esp")

    def test_a_pattern_that_will_not_compile_is_skipped_not_raised(self):
        conn = sqlite3.connect(str(self.db))
        conn.execute(
            "INSERT INTO load_order_rules(rule_id, game_key, name, name_key, is_pattern) "
            "VALUES (9002, 'skyrimse', 'Broken(.esp', 'broken(', 1)"
        )
        conn.commit()
        conn.close()
        close_connection(str(self.db))
        self.assertIsNone(self._find("skyrimse", "Unlisted.esp"))


class WhenThereIsNothingToReadTests(_Library):
    def test_a_library_built_before_the_table_existed_answers_nothing(self):
        self._build(rules=False)
        conn = sqlite3.connect(str(self.db))
        self.assertNotIn("load_order_rules", {r[0] for r in conn.execute("SELECT name FROM sqlite_master")})
        conn.close()
        self.assertIsNone(reader.rag_corpus_load_order_entry(self.settings, "skyrimse", "Requiem"))

    def test_no_library_or_the_library_switched_off_answers_nothing(self):
        self._build()
        self.assertIsNone(reader.rag_corpus_load_order_entry({}, "skyrimse", "Requiem"))
        self.assertIsNone(reader.rag_corpus_load_order_entry(None, "skyrimse", "Requiem"))
        off = {**self.settings, "use_local_knowledge_base": False}
        self.assertIsNone(reader.rag_corpus_load_order_entry(off, "skyrimse", "Requiem"))
        missing = {"rag_corpus_path": str(self.folder / "nowhere"), "use_local_knowledge_base": True}
        self.assertIsNone(reader.rag_corpus_load_order_entry(missing, "skyrimse", "Requiem"))

    def test_a_damaged_library_answers_nothing_and_raises_nothing(self):
        self.db.write_bytes(b"this is not a database" * 100)
        self.assertIsNone(reader.rag_corpus_load_order_entry(self.settings, "skyrimse", "Requiem"))


class OwnConnectionPerThreadTests(_Library):
    def test_each_thread_reads_through_its_own_connection(self):
        self._build()
        seen: dict[str, int] = {}
        real = reader._get_connection

        def recording(db_path):
            conn = real(db_path)
            seen[threading.current_thread().name] = id(conn)
            return conn

        results: dict[str, object] = {}

        def read(label):
            results[label] = reader.rag_corpus_load_order_entry(self.settings, "skyrimse", "Requiem")

        with mock.patch.object(reader, "_get_connection", recording):
            threads = [threading.Thread(target=read, args=(n,), name=n) for n in ("one", "two")]
            for t in threads:
                t.start()
            for t in threads:
                t.join()
        self.assertEqual(set(seen), {"one", "two"})
        self.assertNotEqual(seen["one"], seen["two"])
        self.assertTrue(all(r["name"] == "Requiem.esp" for r in results.values()))
        close_connection(str(self.db))

    def test_a_table_the_schema_does_not_know_still_lets_the_reader_load_with_no_rule(self):
        # LOAD_ORDER_SCHEMA_SQL alone (no rows) is a library with the table but no rule for the mod.
        conn = sqlite3.connect(str(self.db))
        conn.executescript(CREATE_SCHEMA_SQL)
        conn.executescript(LOAD_ORDER_SCHEMA_SQL)
        conn.commit()
        conn.close()
        self.assertIsNone(reader.rag_corpus_load_order_entry(self.settings, "skyrimse", "Requiem"))


class PublicNameTests(unittest.TestCase):
    def test_every_public_name_carries_rag_corpus(self):
        public = [
            n for n, v in vars(reader).items()
            if callable(v) and not n.startswith("_") and getattr(v, "__module__", "") == reader.__name__
        ]
        self.assertTrue(public)
        for name in public:
            self.assertIn("rag_corpus", name)


if __name__ == "__main__":
    unittest.main()
