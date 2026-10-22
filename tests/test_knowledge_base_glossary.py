"""The tap-to-define words the knowledge library keeps for a game: found, or plainly absent.

Plan 86 step 3 (the glossary move). The Deck check this protects: with the rebuilt library
installed, "kiting" and "overclock" are underlined in a Deep Rock Galactic: Survivor answer;
with no library, a library built before the words existed, or the library switch off, the same
words are plain text and nothing errors.

A small library is built here with the real table layout, then (for the older-library case) has the
glossary table dropped, the way tests/test_kb_per_game_compat_pull.py drops a column.
"""

import os
import shutil
import sqlite3
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import knowledge_base_glossary as glossary  # noqa: E402
from backend.knowledge.knowledge_base_cards import close_connection  # noqa: E402
from backend.knowledge.knowledge_base_schema import (  # noqa: E402
    CREATE_SCHEMA_SQL,
    FTS_SYNC_TRIGGERS_SQL,
)
from main import Plugin  # noqa: E402

DRG_APP_ID = "2321470"
DRG_TITLE = "Deep Rock Galactic: Survivor"
KITING_FULL = "Kiting means backing away from an enemy while you keep shooting it."


def _build_library(path: str, *, with_table: bool = True, with_words: bool = True) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(CREATE_SCHEMA_SQL)
    conn.executescript(FTS_SYNC_TRIGGERS_SQL)
    conn.execute(f"INSERT INTO games (game_id, app_id, canonical_title) VALUES (1, '{DRG_APP_ID}', '{DRG_TITLE}')")
    conn.execute("INSERT INTO games (game_id, app_id, canonical_title) VALUES (2, '999', 'Other Game')")
    conn.execute("INSERT INTO aliases VALUES ('deep rock galactic survivor', 1)")
    if with_words:
        conn.executemany(
            "INSERT INTO glossary_terms (term_id, game_id, term_key, term, alt_forms, peek, full_text) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (2, 1, "overclock", "overclock", '["overclocks", "overclocked"]', "A weapon mod.", "An overclock is a mod."),
                (1, 1, "kiting", "kiting", '["kite", "kited", "kites"]', "Backing away.", KITING_FULL),
            ],
        )
    if not with_table:
        conn.execute("DROP TABLE glossary_terms")
    conn.commit()
    conn.close()


class GlossaryForGameTests(unittest.IsolatedAsyncioTestCase):
    def _library(self, *, switch_on: bool = True, **kwargs) -> dict:
        """Write a small library in a fresh folder and return the settings that point at it."""
        folder = tempfile.mkdtemp(prefix="glossary-test-")
        self.addCleanup(shutil.rmtree, folder, ignore_errors=True)
        _build_library(os.path.join(folder, "corpus.db"), **kwargs)
        self.addCleanup(close_connection, os.path.join(folder, "corpus.db"))
        return {"use_local_knowledge_base": switch_on, "rag_corpus_path": folder}

    async def _ask(self, settings: dict, app_id: str = DRG_APP_ID) -> dict:
        with patch.object(Plugin, "load_settings", AsyncMock(return_value=settings)):
            return await Plugin().get_rag_corpus_glossary(app_id)

    async def test_the_games_words_come_back_by_app_id(self) -> None:
        out = await self._ask(self._library())
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["game_title"], DRG_TITLE)
        self.assertEqual(out["reason"], "")
        self.assertEqual([t["id"] for t in out["terms"]], ["kiting", "overclock"])
        self.assertEqual(
            out["terms"][0],
            {
                "id": "kiting",
                "term": "kiting",
                "alt_forms": ["kite", "kited", "kites"],
                "peek": "Backing away.",
                "full": KITING_FULL,
            },
        )

    async def test_a_game_is_found_by_name_when_no_app_id_is_given(self) -> None:
        settings = self._library()
        out = glossary.glossary_for_game(settings, "", DRG_TITLE)
        self.assertEqual([t["id"] for t in out["terms"]], ["kiting", "overclock"])
        by_alias = glossary.glossary_for_game(settings, "", "Deep Rock Galactic Survivor")
        self.assertEqual([t["id"] for t in by_alias["terms"]], ["kiting", "overclock"])

    async def test_another_game_gets_no_words(self) -> None:
        out = await self._ask(self._library(), "999")
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["terms"], [])

    async def test_no_game_gets_no_words(self) -> None:
        settings = self._library()
        self.assertEqual((await self._ask(settings, ""))["terms"], [])
        self.assertEqual((await self._ask(settings, "123456789"))["terms"], [])

    async def test_a_library_that_is_not_installed_gives_no_words_and_no_error(self) -> None:
        with tempfile.TemporaryDirectory() as empty:
            out = await self._ask({"use_local_knowledge_base": True, "rag_corpus_path": empty})
        self.assertTrue(out["ok"])
        self.assertFalse(out["installed"])
        self.assertEqual(out["terms"], [])
        self.assertNotIn("error", out)
        out = await self._ask({})
        self.assertTrue(out["ok"])
        self.assertFalse(out["installed"])

    async def test_a_library_built_before_the_glossary_gives_no_words_and_no_error(self) -> None:
        glossary._last_fault = ""
        with patch.object(glossary, "logger") as log:
            out = await self._ask(self._library(with_table=False))
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["terms"], [])
        self.assertNotIn("error", out)
        log.warning.assert_not_called()

    async def test_an_empty_table_gives_no_words(self) -> None:
        out = await self._ask(self._library(with_words=False))
        self.assertTrue(out["ok"])
        self.assertTrue(out["installed"])
        self.assertEqual(out["terms"], [])

    async def test_the_library_switch_off_gives_no_words(self) -> None:
        out = await self._ask(self._library(switch_on=False))
        self.assertTrue(out["ok"])
        self.assertFalse(out["installed"])
        self.assertEqual(out["terms"], [])

    async def test_the_ai_gets_the_games_title_and_spellings(self) -> None:
        title, terms = glossary.glossary_for_prompt(self._library(), DRG_APP_ID, "")
        self.assertEqual(title, DRG_TITLE)
        self.assertEqual(terms, ["kiting", "overclock"])
        self.assertEqual(glossary.glossary_for_prompt(self._library(switch_on=False), DRG_APP_ID), ("", []))

    async def test_a_damaged_library_never_stops_the_ai_instructions(self) -> None:
        glossary._last_fault = ""
        with patch.object(
            glossary, "glossary_for_game", side_effect=sqlite3.DatabaseError("malformed")
        ), patch.object(glossary, "logger") as log:
            self.assertEqual(glossary.glossary_for_prompt({}, DRG_APP_ID), ("", []))
            self.assertEqual(glossary.glossary_for_prompt({}, DRG_APP_ID), ("", []))
        self.assertEqual(log.warning.call_count, 1)

    async def test_a_broken_library_is_logged_once_and_answered_plainly(self) -> None:
        settings = self._library()
        glossary._last_fault = ""
        with patch.object(
            glossary, "glossary_for_game", side_effect=sqlite3.DatabaseError("malformed")
        ), patch.object(glossary, "logger") as log:
            first = await self._ask(settings)
            await self._ask(settings)
        self.assertFalse(first["ok"])
        self.assertEqual(first["terms"], [])
        self.assertTrue(first["error"])
        self.assertTrue(first["code"])
        self.assertEqual(log.warning.call_count, 1)


class GlossaryForANamedGameTests(unittest.IsolatedAsyncioTestCase):
    """Plan 97 L5: with no game running, the words follow the game the question names (or, for a bare
    follow-up, the game the chat has been about) -- the same game the notes follow."""

    def _library(self) -> dict:
        folder = tempfile.mkdtemp(prefix="glossary-test-")
        self.addCleanup(shutil.rmtree, folder, ignore_errors=True)
        _build_library(os.path.join(folder, "corpus.db"))
        self.addCleanup(close_connection, os.path.join(folder, "corpus.db"))
        return {"use_local_knowledge_base": True, "rag_corpus_path": folder}

    async def _ask(self, settings: dict, app_id: str = "", question: str = "", earlier=None) -> dict:
        with patch.object(Plugin, "load_settings", AsyncMock(return_value=settings)):
            return await Plugin().get_rag_corpus_glossary(app_id, question, earlier)

    async def test_nothing_running_and_a_game_named_gives_that_games_words(self) -> None:
        out = await self._ask(
            self._library(),
            question="What does kiting mean in Deep Rock Galactic: Survivor and when should I overclock?",
        )
        self.assertTrue(out["ok"])
        self.assertEqual(out["game_title"], DRG_TITLE)
        self.assertEqual([t["id"] for t in out["terms"]], ["kiting", "overclock"])

    async def test_a_bare_follow_up_follows_the_game_the_chat_was_about(self) -> None:
        out = await self._ask(
            self._library(),
            question="and what is an overclock?",
            earlier=[{"text": "Tell me about kiting in Deep Rock Galactic Survivor", "app_name": ""}],
        )
        self.assertEqual(out["game_title"], DRG_TITLE)
        self.assertEqual([t["id"] for t in out["terms"]], ["kiting", "overclock"])

    async def test_a_question_naming_no_game_in_a_chat_about_none_gets_no_words(self) -> None:
        out = await self._ask(self._library(), question="how do I make my battery last longer?")
        self.assertTrue(out["ok"])
        self.assertEqual(out["terms"], [])

    async def test_a_running_game_still_wins_over_a_game_named_in_the_question(self) -> None:
        out = await self._ask(
            self._library(),
            app_id="999",
            question="What does kiting mean in Deep Rock Galactic: Survivor?",
        )
        self.assertEqual(out["terms"], [])

    async def test_a_game_with_no_words_named_gives_none(self) -> None:
        out = await self._ask(self._library(), question="tips for Other Game please")
        self.assertTrue(out["ok"])
        self.assertEqual(out["terms"], [])

    async def test_the_library_switch_off_gives_no_words_for_a_named_game(self) -> None:
        settings = {**self._library(), "use_local_knowledge_base": False}
        out = await self._ask(settings, question="kiting in Deep Rock Galactic Survivor")
        self.assertFalse(out["installed"])
        self.assertEqual(out["terms"], [])

    async def test_junk_in_the_earlier_list_is_ignored(self) -> None:
        out = await self._ask(self._library(), question="overclock?", earlier=["x", None, {"text": 5}, 7])
        self.assertTrue(out["ok"])
        self.assertEqual(out["terms"], [])


if __name__ == "__main__":
    unittest.main()
