"""The chips the back end hands the screen for a running game: ten, all different, by kind.

Plan 79 / D122 item 9: with six, a given game chip came back about every 66 seconds. With ten
it is about 108. A small library is built on disk so the test does not need the seed corpus.
"""

import os
import sqlite3
import tempfile
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import knowledge_base_chips as chips  # noqa: E402
from backend.services.knowledge_base_cards import close_connection  # noqa: E402


def _build_db(path: str, cards: list[tuple[str, str]]) -> None:
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE games (game_id INTEGER, canonical_title TEXT)")
    conn.execute("CREATE TABLE sections (section_id INTEGER PRIMARY KEY, game_id INTEGER, section_type TEXT, name TEXT)")
    conn.execute("CREATE TABLE compat_patterns (topic TEXT)")
    conn.execute("INSERT INTO games VALUES (1, 'Test Game')")
    for kind, name in cards:
        conn.execute("INSERT INTO sections (game_id, section_type, name) VALUES (1, ?, ?)", (kind, name))
    conn.commit()
    conn.close()


class ChipPoolSizeTests(unittest.TestCase):
    def _chips_for(self, cards: list[tuple[str, str]]) -> list[str]:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db = os.path.join(tmp.name, "corpus.db")
        _build_db(db, cards)
        self.addCleanup(close_connection, db)
        with mock.patch.object(chips, "resolve_corpus_db_path", return_value=db), mock.patch.object(
            chips, "_resolve_game_id", return_value=(1, "exact")
        ):
            result = chips.suggest_chip_candidates(
                {"use_local_knowledge_base": True}, app_id="1", app_name="Test Game"
            )
        self.assertTrue(result.ok)
        return [c.text for c in result.candidates if c.domain == "strategy"]

    def test_a_big_game_gets_ten_different_chips_round_robin_over_kinds(self):
        cards = (
            [("boss", f"Boss{i}") for i in range(5)]
            + [("enemy", f"Enemy{i}") for i in range(5)]
            + [("item", f"Item{i}") for i in range(5)]
        )
        got = self._chips_for(cards)
        self.assertEqual(len(got), 10)
        self.assertEqual(len(set(got)), 10)
        self.assertEqual(
            got[:3],
            ["How do I beat Boss0?", "How do I deal with Enemy0?", "How do I use Item0?"],
        )
        # Round-robin: ten chips over three kinds is 4 / 3 / 3, never one kind flooding.
        self.assertEqual(sum(t.startswith("How do I beat") for t in got), 4)

    def test_a_small_game_gets_every_card_once(self):
        got = self._chips_for([("boss", "A"), ("enemy", "B"), ("item", "C"), ("boss", "D")])
        self.assertEqual(len(got), 4)
        self.assertEqual(len(set(got)), 4)


if __name__ == "__main__":
    unittest.main()
