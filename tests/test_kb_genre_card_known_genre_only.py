"""Plan 104 (row P104-M8-NO-NOTES-GENRE-CARD, part one): a game the library has no notes for no longer gets
another genre's card. (The marking of such a turn is in test_kb_no_notes_turn_marked.py.)

Found by lane H1: asked about Terraria (a game the library holds nothing on), the AI was handed the
library's only general card, "Soulslike basics", and borrowed "Vigor" and "Energy" from it in 3 answers
of 3. Terraria is not a soulslike. The search's general-card fallback
(``_genre_fallback``) returned the first general card for every game, whatever the card's genre and
whatever the game's own genres were.

The first group is the fallback on its own. The second runs the real ask path against a small real
library (the stand-in model is the only fake) and reads what reaches the model.
"""

import asyncio
import sqlite3
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.knowledge.knowledge_base_cards import close_connection  # noqa: E402
from backend.knowledge.knowledge_base_schema import CORPUS_DB_FILENAME  # noqa: E402
from backend.knowledge.knowledge_base_search import _genre_fallback  # noqa: E402
from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    SmallLibraryAskSetup,
    _FakePlugin,
)

_SOULSLIKE_CARD = "Soulslike basics: learn dodge timing, stamina management, and safe heal windows."
_TERRARIA = {"app_id": "105600", "app_name": "Terraria"}
_NO_NOTES_QUESTION = "what is the best way to beat the Eye of Cthulhu in Terraria, give me the full run-down"


def _connection() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(
        "CREATE TABLE games (game_id INTEGER PRIMARY KEY, genres TEXT);"
        "CREATE TABLE genre_patterns (pattern_id INTEGER PRIMARY KEY, genre_tags TEXT NOT NULL, card TEXT NOT NULL);"
    )
    conn.execute("INSERT INTO genre_patterns VALUES (1, 'soulslike', ?)", (_SOULSLIKE_CARD,))
    conn.execute("INSERT INTO games VALUES (1, '[\"soulslike\", \"action\"]')")
    conn.execute("INSERT INTO games VALUES (2, '[\"survival\", \"sandbox\"]')")
    conn.execute("INSERT INTO games VALUES (3, NULL)")
    return conn


class GenreFallbackTests(unittest.TestCase):
    def test_a_game_that_has_the_cards_genre_gets_the_card(self):
        self.assertEqual(_genre_fallback(_connection(), 1), _SOULSLIKE_CARD)

    def test_a_game_of_another_genre_gets_nothing(self):
        self.assertIsNone(_genre_fallback(_connection(), 2))

    def test_a_game_with_no_genres_on_file_gets_nothing(self):
        self.assertIsNone(_genre_fallback(_connection(), 3))

    def test_a_game_the_library_does_not_have_gets_nothing(self):
        self.assertIsNone(_genre_fallback(_connection(), None))
        self.assertIsNone(_genre_fallback(_connection(), 99))

    def test_a_card_with_several_tags_matches_on_any_one_of_them(self):
        conn = _connection()
        conn.execute("UPDATE genre_patterns SET genre_tags = 'metroidvania, soulslike'")
        self.assertEqual(_genre_fallback(conn, 1), _SOULSLIKE_CARD)


class NoNotesGameGetsNoOtherGenresCardTests(SmallLibraryAskSetup, unittest.TestCase):
    """The real ask path against the small library; the Soulslike card is added to it here."""

    def _library_with_the_card(self, *, drg_genres: str | None = None):
        conn = sqlite3.connect(str(self._dir / CORPUS_DB_FILENAME))
        try:
            conn.execute(
                "INSERT INTO genre_patterns(pattern_id, genre_tags, card, source_license) VALUES (1, 'soulslike', ?, '')",
                (_SOULSLIKE_CARD,),
            )
            if drg_genres is not None:
                conn.execute("UPDATE games SET genres = ? WHERE app_id = ?", (drg_genres, _DRG_APP_ID))
            conn.commit()
        finally:
            conn.close()
        close_connection(str(self._dir / CORPUS_DB_FILENAME))

    def _ask(self, question, *, game, mode="expert"):
        plugin = _FakePlugin(self.settings)
        plugin.reply = "Sure."
        result = asyncio.run(
            run_game_ai_request(plugin, question, "127.0.0.1:11434", ask_mode=mode, **game)
        )
        return plugin.ask_calls[-1], str(result.get("response", ""))

    @staticmethod
    def _what_the_model_was_given(call) -> str:
        return call.get("proton_log_attachment") or ""

    def test_a_game_the_library_holds_nothing_on_is_not_handed_the_soulslike_card(self):
        self._library_with_the_card()
        call, _ = self._ask(_NO_NOTES_QUESTION, game=_TERRARIA)
        self.assertNotIn("Soulslike basics", self._what_the_model_was_given(call))

    def test_the_same_game_in_strategy_mode_is_not_handed_it_either(self):
        self._library_with_the_card()
        call, _ = self._ask(_NO_NOTES_QUESTION, game=_TERRARIA, mode="strategy")
        self.assertNotIn("Soulslike basics", self._what_the_model_was_given(call))

    def test_a_game_that_is_a_soulslike_still_gets_the_card_when_nothing_matches(self):
        self._library_with_the_card(drg_genres='["soulslike", "action"]')
        kb_followup_memory.forget()
        call, _ = self._ask(
            "How do I tame a horse in Deep Rock Galactic Survivor?",
            game={"app_id": _DRG_APP_ID, "app_name": _DRG_APP_NAME},
            mode="strategy",
        )
        self.assertIn("Soulslike basics", self._what_the_model_was_given(call))

    def test_a_game_of_another_genre_in_the_library_is_not_handed_it_when_nothing_matches(self):
        self._library_with_the_card(drg_genres='["bullet-heaven", "roguelike"]')
        call, text = self._ask(
            "How do I tame a horse in Deep Rock Galactic Survivor?",
            game={"app_id": _DRG_APP_ID, "app_name": _DRG_APP_NAME},
            mode="strategy",
        )
        self.assertNotIn("Soulslike basics", self._what_the_model_was_given(call))
        self.assertIn("Not in my notes", text)  # nothing attached for a covered game: the older line says so


if __name__ == "__main__":
    unittest.main()
