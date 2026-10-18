"""The Search tab's game-notes lookup: a word in, up to twelve notes out, nothing raised.

Plan 92 / lane N4. The Deck check this protects: searching "mantis" with the knowledge library
installed lists the Mantis Lords note under "Game and help notes", and A on it shows the note's
own words; with the library removed the group is simply absent.

A small library is built here with the real table layout, so the real full-text index decides
what matches.
"""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import knowledge_base_notes_search as notes_search  # noqa: E402
from backend.knowledge.knowledge_base_cards import close_connection  # noqa: E402
from backend.knowledge.knowledge_base_schema import (  # noqa: E402
    CREATE_SCHEMA_SQL,
    FTS_SYNC_TRIGGERS_SQL,
)
from main import Plugin  # noqa: E402

MANTIS_TEXT = (
    "Three armoured warriors guard the village gate and bow to anyone who wins the first "
    "round. Wait for the mantis to leap, then strike from below and keep your distance "
    "while the second lord drops in from the ceiling."
)
SANCTUM_TEXT = (
    "A tall flying enemy in the sanctum. It is easy to mistake it for a mantis from far away, "
    "but it only swoops twice and then rests."
)


def _build_library(path: str, extra_scouts: int = 0, long_text: bool = False) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(CREATE_SCHEMA_SQL)
    conn.executescript(FTS_SYNC_TRIGGERS_SQL)
    conn.execute("INSERT INTO games (game_id, app_id, canonical_title) VALUES (1, '367520', 'Hollow Knight')")
    conn.execute("INSERT INTO games (game_id, app_id, canonical_title) VALUES (2, '999', 'Other Game')")
    conn.execute("INSERT INTO aliases VALUES ('hk', 1)")
    rows = [
        (1, "boss", "Mantis Lords", MANTIS_TEXT * (40 if long_text else 1)),
        (1, "enemy", "Sanctum Watcher", SANCTUM_TEXT),
        (1, "boss", "Gruz Mother", "A big bouncing boss that charges at you in a closed room."),
        (2, "boss", "Mantis Queen", "The queen of another game; dodge the dash and wait."),
    ]
    rows += [(1, "enemy", f"Mantis Scout {i}", "A small scout that patrols the wall.") for i in range(extra_scouts)]
    for game_id, kind, name, card in rows:
        conn.execute(
            "INSERT INTO sections (game_id, section_type, name, card) VALUES (?, ?, ?, ?)",
            (game_id, kind, name, card),
        )
    conn.commit()
    conn.close()


class NotesSearchTests(unittest.IsolatedAsyncioTestCase):
    def _library(self, **kwargs) -> dict:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db = os.path.join(tmp.name, "corpus.db")
        _build_library(db, **kwargs)
        self.addCleanup(close_connection, db)
        return {"use_local_knowledge_base": True, "rag_corpus_path": tmp.name}

    async def _ask(self, settings: dict, word: str = "", game_title: str = "") -> dict:
        with patch.object(Plugin, "load_settings", AsyncMock(return_value=settings)):
            return await Plugin().search_rag_corpus_notes(word, game_title)

    async def test_a_word_in_a_notes_name_finds_it_and_says_so(self) -> None:
        out = await self._ask(self._library(), "mantis")
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["reason"], "")
        first = next(n for n in out["notes"] if n["name"] == "Mantis Lords")
        self.assertEqual(first["kind"], "boss")
        self.assertEqual(first["game_title"], "Hollow Knight")
        self.assertTrue(first["name_matches"])
        self.assertEqual(first["text"], MANTIS_TEXT)

    async def test_a_word_found_only_in_a_notes_words_is_marked_as_not_in_its_name(self) -> None:
        out = await self._ask(self._library(), "mantis", "Hollow Knight")
        by_name = {n["name"]: n for n in out["notes"]}
        self.assertFalse(by_name["Sanctum Watcher"]["name_matches"])
        self.assertIn("mantis", by_name["Sanctum Watcher"]["snippet"])
        # The notes whose name holds the word come first.
        flags = [n["name_matches"] for n in out["notes"]]
        self.assertEqual(flags, sorted(flags, reverse=True))

    async def test_a_game_title_drops_the_notes_of_other_games(self) -> None:
        settings = self._library()
        everyone = await self._ask(settings, "mantis")
        self.assertIn("Other Game", {n["game_title"] for n in everyone["notes"]})
        only = await self._ask(settings, "mantis", "Hollow Knight")
        self.assertEqual({n["game_title"] for n in only["notes"]}, {"Hollow Knight"})
        # A short name the library knows the game by works too.
        alias = await self._ask(settings, "mantis", "HK")
        self.assertEqual({n["game_title"] for n in alias["notes"]}, {"Hollow Knight"})

    async def test_a_game_the_library_does_not_know_gives_no_notes_and_no_error(self) -> None:
        out = await self._ask(self._library(), "mantis", "Game Nobody Wrote")
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["notes"], [])
        self.assertTrue(out["reason"])

    async def test_at_most_twelve_notes_and_the_name_matches_are_kept(self) -> None:
        out = await self._ask(self._library(extra_scouts=20), "mantis")
        self.assertEqual(len(out["notes"]), 12)
        self.assertTrue(all(n["name_matches"] for n in out["notes"]))

    async def test_the_snippet_is_short_and_holds_the_word(self) -> None:
        out = await self._ask(self._library(), "mantis", "Hollow Knight")
        lords = next(n for n in out["notes"] if n["name"] == "Mantis Lords")
        self.assertIn("mantis", lords["snippet"].lower())
        self.assertLessEqual(len(lords["snippet"]), 142)
        self.assertLess(len(lords["snippet"]), len(MANTIS_TEXT))

    async def test_the_notes_own_words_are_capped_at_four_thousand_characters(self) -> None:
        out = await self._ask(self._library(long_text=True), "mantis", "Hollow Knight")
        lords = next(n for n in out["notes"] if n["name"] == "Mantis Lords")
        self.assertEqual(len(lords["text"]), 4000)

    async def test_a_library_that_is_not_installed_is_an_answer_not_an_error(self) -> None:
        for settings in ({}, {"rag_corpus_path": ""}, {"rag_corpus_path": os.path.join(tempfile.gettempdir(), "no-such-library-folder")}):
            out = await self._ask(settings, "mantis")
            self.assertTrue(out["ok"])
            self.assertFalse(out["installed"])
            self.assertEqual(out["notes"], [])
            self.assertTrue(out["reason"])
            self.assertNotIn("error", out)

    async def test_no_word_and_a_word_of_filler_find_nothing(self) -> None:
        settings = self._library()
        for word in ("", "   ", "the"):
            out = await self._ask(settings, word)
            self.assertTrue(out["ok"])
            self.assertTrue(out["installed"])
            self.assertEqual(out["notes"], [])

    async def test_a_broken_library_is_logged_once_and_answered_plainly(self) -> None:
        settings = self._library()
        notes_search._last_fault = ""
        with patch.object(notes_search, "search_notes", side_effect=sqlite3.DatabaseError("malformed")), patch.object(
            notes_search, "logger"
        ) as log:
            first = await self._ask(settings, "mantis")
            await self._ask(settings, "mantis")
        self.assertFalse(first["ok"])
        self.assertEqual(first["notes"], [])
        self.assertTrue(first["error"])
        self.assertTrue(first["code"])
        self.assertEqual(log.warning.call_count, 1)


if __name__ == "__main__":
    unittest.main()
