"""Title: A resolved game's own Deck tips join its troubleshooting search

Purpose: D29 / Phase 4 track 3's per-game field on compat_patterns is only useful once
something actually reads it back. This pins the two small pieces knowledge_base_service.py
adds for that: working out which key(s) a resolved game's own tips would carry, and pulling
those tips into the pool the same way a routed topic's tips already are.
Used for: knowledge_base_service.py's _compat_app_keys_for_game / _compat_tips_for_app_keys.
Solves: A column with no reader is a schema change that changes nothing a person notices --
this is the regression test for the read side landing, kept in its own file (no Ollama, no
built corpus) so it runs even while the shared PC model is busy with someone else's work.
"""

import sqlite3
import unittest

from backend.services.knowledge_base_schema import apply_schema
from backend.services.knowledge_base_service import (
    _compat_app_keys_for_game,
    _compat_tips_for_app_keys,
)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    return conn


def _seed(conn: sqlite3.Connection) -> None:
    apply_schema(conn)
    conn.executemany(
        "INSERT INTO games(game_id, app_id, igdb_id, canonical_title, edition, platform, genres) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (1, "2321470", None, "Deep Rock Galactic: Survivor", None, "Steam", "[]"),
            (2, None, "emudeck-oot-n64", "The Legend of Zelda: Ocarina of Time", "N64", "Nintendo 64", "[]"),
            (3, "550", None, "Left 4 Dead 2", None, "Steam", "[]"),
        ],
    )
    conn.executemany(
        "INSERT INTO compat_patterns(pattern_id, topic, platforms, card, source_url, "
        "source_license, app_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (1, "proton", "[]", "shared tip, no game", "", "bonsAI-maintainer", None),
            (2, "display", "[]", "DRG Survivor's own quirk", "", "bonsAI-maintainer", "2321470"),
            (3, "controller", "[]", "Ocarina's own quirk", "", "bonsAI-maintainer", "emudeck-oot-n64"),
        ],
    )
    conn.commit()


class CompatAppKeysForGameTests(unittest.TestCase):
    def test_a_steam_title_resolves_to_its_app_id(self):
        conn = _connect()
        try:
            _seed(conn)
            self.assertEqual(_compat_app_keys_for_game(conn, 1), ["2321470"])
        finally:
            conn.close()

    def test_a_title_with_no_steam_app_id_resolves_to_its_igdb_id(self):
        conn = _connect()
        try:
            _seed(conn)
            self.assertEqual(_compat_app_keys_for_game(conn, 2), ["emudeck-oot-n64"])
        finally:
            conn.close()

    def test_an_unknown_game_id_resolves_to_nothing(self):
        conn = _connect()
        try:
            _seed(conn)
            self.assertEqual(_compat_app_keys_for_game(conn, 999), [])
        finally:
            conn.close()


class CompatTipsForAppKeysTests(unittest.TestCase):
    def test_a_games_own_tip_is_pulled_in(self):
        conn = _connect()
        try:
            _seed(conn)
            cards = _compat_tips_for_app_keys(
                conn, app_keys=["2321470"], exclude_ids=set(), top_k=6
            )
            self.assertEqual([c.card for c in cards], ["DRG Survivor's own quirk"])
        finally:
            conn.close()

    def test_a_different_games_own_tip_is_not_pulled_in(self):
        """Left 4 Dead 2 has no per-game tip of its own -- the shared tip and DRG's tip must
        not leak into a game they were not written for."""
        conn = _connect()
        try:
            _seed(conn)
            cards = _compat_tips_for_app_keys(
                conn,
                app_keys=_compat_app_keys_for_game(conn, 3),
                exclude_ids=set(),
                top_k=6,
            )
            self.assertEqual(cards, [])
        finally:
            conn.close()

    def test_no_app_keys_pulls_in_nothing(self):
        """N1 holds for free (plan 18): no game resolved, no key to filter on, nothing pulled."""
        conn = _connect()
        try:
            _seed(conn)
            self.assertEqual(
                _compat_tips_for_app_keys(conn, app_keys=[], exclude_ids=set(), top_k=6), []
            )
        finally:
            conn.close()

    def test_an_already_seen_pattern_id_is_excluded(self):
        conn = _connect()
        try:
            _seed(conn)
            cards = _compat_tips_for_app_keys(
                conn, app_keys=["2321470"], exclude_ids={2}, top_k=6
            )
            self.assertEqual(cards, [])
        finally:
            conn.close()
