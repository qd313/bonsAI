"""Plan 78 helper A (D121 item 1): a story game named in the question while a no-story game runs.

Seen on the Deck 3 of 3 (plan 77, row P77-SPOILER-OTHER-GAME): with Deep Rock Galactic: Survivor
running, "how do I beat the boss in the Soul Sanctum in Hollow Knight" came back naming the boss
with no spoiler cover. Last night's first fix judged the turn by the named game's spoiler profile
and changed nothing on the Deck, because the covers come from the attached NOTES (they name the
bosses to hide) and the running game picked the notes.

So these tests do not stop at "which profile was chosen". They run the real ask path
(``run_game_ai_request``) against a small real library on disk, with the real retrieval and the
real cover step, and read what actually reaches the answer: the notes handed to the model, the
cover around a protected boss, the choice menu, and the credit footers. The only stand-in is the
model itself, which replies with a fixed text naming a protected boss.
"""

import asyncio
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_cards import close_connection  # noqa: E402
from backend.services.knowledge_base_schema import (  # noqa: E402
    CORPUS_DB_FILENAME,
    CREATE_SCHEMA_SQL,
    FTS_SYNC_TRIGGERS_SQL,
)
from backend.services.ollama_prompts import kb_card_names  # noqa: E402

_DRG_APP_ID = "2321470"
_DRG_APP_NAME = "Deep Rock Galactic: Survivor"
_HK_APP_ID = "367520"
_HK_APP_NAME = "Hollow Knight"

_HK_QUESTION = "How do I beat the boss in the Soul Sanctum in Hollow Knight?"

# What the stand-in model says: it names Hollow Knight's protected boss (the question never did).
# Its choice menu (below) names him too, as a real model's does.
_HK_REPLY = (
    "Wait out his teleport, then strike. The Soul Master fakes his own death partway through "
    "and comes back as Soul Tyrant, so keep your healing for the second form."
)
_DRG_REPLY = "The Glyphid Dreadnought has a weak spot on its back, so circle it and shoot there."

_GAMES = (
    # game_id, app_id, canonical title, aliases
    (1, _DRG_APP_ID, _DRG_APP_NAME, ("deep rock galactic survivor", "drg survivor")),
    (2, _HK_APP_ID, _HK_APP_NAME, ("hollow knight", "hk")),
)
_SECTIONS = (
    # game_id, type, name, card
    (
        1,
        "boss",
        "Glyphid Dreadnought",
        "The Glyphid Dreadnought is a huge boss in the hollow caves. Shoot the weak spot on its "
        "back while circling it to beat the boss.",
    ),
    (
        1,
        "boss",
        "Hollow Bough",
        "Hollow Bough is a boss that spawns swarms in the Soul Sanctum-style arena. Kill the "
        "swarmers first, then focus the boss.",
    ),
    (
        2,
        "boss",
        "Soul Master",
        "The Soul Master guards the Soul Sanctum. He teleports and fires soul orbs; strike him "
        "right after each teleport to beat the boss, and he returns as Soul Tyrant.",
    ),
    (
        2,
        "boss",
        "Soul Tyrant",
        "Soul Tyrant is the second form of the boss in the Soul Sanctum, faster and with more "
        "orbs to dodge.",
    ),
)


def _build_library(directory: Path) -> None:
    """A two-game library in the real corpus layout. No meaning vectors: retrieval falls back to
    the word search, which is deterministic and needs no model running."""
    conn = sqlite3.connect(str(directory / CORPUS_DB_FILENAME))
    try:
        conn.executescript(CREATE_SCHEMA_SQL)
        conn.executescript(FTS_SYNC_TRIGGERS_SQL)
        for game_id, app_id, title, aliases in _GAMES:
            conn.execute(
                "INSERT INTO games (game_id, app_id, canonical_title) VALUES (?, ?, ?)",
                (game_id, app_id, title),
            )
            for alias in aliases:
                conn.execute(
                    "INSERT INTO aliases (alias_normalized, game_id) VALUES (?, ?)",
                    (alias, game_id),
                )
        for game_id, section_type, name, card in _SECTIONS:
            conn.execute(
                "INSERT INTO sections (game_id, section_type, name, card, source_url, "
                "source_license, crawled_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (game_id, section_type, name, card, "https://example.test/" + name.replace(" ", "_"),
                 "CC-BY-SA-3.0", "2026-09-01"),
            )
        conn.commit()
    finally:
        conn.close()


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self.reply = ""
        self.ask_calls: list[dict] = []

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        self.ask_calls.append({"args": args, **kwargs})
        return {
            "success": True,
            "response": self.reply,
            "model": "test-model",
            "strategy_guide_branches": _branches_from(self.reply),
        }

    async def _persist_input_transparency(self, payload):
        pass


def _branches_from(reply: str):
    """The menu the real parser would hand back for a Hollow Knight reply."""
    if "Soul Master" not in reply:
        return None
    return {
        "question": "Which part is giving you trouble?",
        "options": [
            {"label": "The Soul Master teleport", "value": "I keep getting hit by the Soul Master teleport"},
            {"label": "The second form", "value": "I am stuck on the second form"},
        ],
    }


class StoryGameNamedWhileANoStoryGameRunsTests(unittest.TestCase):
    def setUp(self):
        self._dir = Path(tempfile.mkdtemp(prefix="p78a-library-"))
        _build_library(self._dir)
        self.settings = {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
            "use_local_knowledge_base": True,
            "rag_corpus_path": str(self._dir),
            "rag_hybrid_retrieval_enabled": False,
        }
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()
        close_connection(str(self._dir / CORPUS_DB_FILENAME))
        shutil.rmtree(self._dir, ignore_errors=True)

    def _ask(self, question, *, app_id, app_name, reply, spoiler_consent=False, ask_mode="strategy"):
        plugin = _FakePlugin(self.settings)
        plugin.reply = reply
        result = asyncio.run(
            run_game_ai_request(
                plugin,
                question,
                "127.0.0.1:11434",
                app_id=app_id,
                app_name=app_name,
                ask_mode=ask_mode,
                spoiler_consent=spoiler_consent,
            )
        )
        return plugin, result

    def _exception_log_lines(self, question, **kwargs) -> list[str]:
        """The log lines this ask wrote that announce the exception."""
        with patch("backend.services.game_ai_request.logger") as logger:
            self._ask(question, **kwargs)
        kb_followup_memory.forget()
        written = [
            (call.args[0] % call.args[1:]) if len(call.args) > 1 else str(call.args[0])
            for call in logger.info.call_args_list
            if call.args
        ]
        return [line for line in written if "named story game picks the notes" in line]

    @staticmethod
    def _notes_handed_to_the_model(plugin) -> list[str]:
        return kb_card_names(plugin.ask_calls[-1].get("proton_log_attachment") or "")

    @staticmethod
    def _outside_covers(text: str) -> str:
        import re

        return re.sub(r"```bonsai-spoiler\n.*?```\n?", "", text, flags=re.DOTALL)

    # -- the bug, at the level the Deck check looks at ---------------------------------------

    def test_hollow_knight_notes_reach_the_model_while_deep_rock_runs(self):
        plugin, result = self._ask(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )

        handed = self._notes_handed_to_the_model(plugin)
        self.assertIn("Soul Master", handed)
        self.assertNotIn("Glyphid Dreadnought", handed)
        self.assertNotIn("Hollow Bough", handed)
        shown = [note.get("title") or note.get("name") for note in result["kb_attached_notes"]]
        self.assertIn("Soul Master", shown)
        self.assertNotIn("Hollow Bough", shown)

    def test_a_protected_boss_the_model_names_comes_out_inside_a_cover(self):
        _, result = self._ask(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )

        response = result["response"]
        self.assertIn("```bonsai-spoiler", response, "at least one cover is expected")
        self.assertNotIn("Soul Master", self._outside_covers(response))
        self.assertNotIn("Soul Tyrant", self._outside_covers(response))
        # Nothing was deleted; the name is still there, behind the cover.
        self.assertIn("Soul Master", response)

    def test_the_choice_menu_does_not_name_the_protected_boss(self):
        _, result = self._ask(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )

        menu = result["strategy_guide_branches"]
        self.assertTrue(menu, "the menu itself is still offered")
        shown = [menu["question"]] + [option["label"] for option in menu["options"]]
        self.assertNotIn("Soul Master", " ".join(shown))

    def test_the_turn_matches_the_same_question_with_no_game_running(self):
        """Same notes, same covers, same menu, same credit line as nothing running."""
        _, with_drg = self._ask(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )
        kb_followup_memory.forget()
        _, with_nothing = self._ask(_HK_QUESTION, app_id="", app_name="", reply=_HK_REPLY)

        self.assertEqual(with_drg["response"], with_nothing["response"])
        self.assertEqual(with_drg["strategy_guide_branches"], with_nothing["strategy_guide_branches"])
        self.assertEqual(with_drg["kb_attached_notes"], with_nothing["kb_attached_notes"])
        self.assertEqual(
            with_drg["transparency"]["context_chips"], with_nothing["transparency"]["context_chips"]
        )

    def test_the_prompt_is_judged_as_a_story_game(self):
        plugin, _ = self._ask(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )

        self.assertEqual(plugin.ask_calls[-1]["strategy_title_profile"], "protect_progression")

    def test_the_exception_says_so_in_the_log(self):
        lines = self._exception_log_lines(
            _HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY
        )

        self.assertEqual(len(lines), 1, lines)
        self.assertIn(_DRG_APP_NAME, lines[0])
        self.assertIn("hollow knight", lines[0].lower())

    # -- the limits of the call ---------------------------------------------------------------

    def test_a_question_about_the_running_game_still_gets_its_own_notes_and_no_cover(self):
        question = "How do I beat the boss in the caves in Deep Rock Galactic Survivor?"
        self.assertEqual(
            self._exception_log_lines(
                question, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_REPLY
            ),
            [],
        )
        plugin, result = self._ask(
            question, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_REPLY
        )

        handed = self._notes_handed_to_the_model(plugin)
        self.assertIn("Glyphid Dreadnought", handed)
        self.assertNotIn("Soul Master", handed)
        self.assertNotIn("```bonsai-spoiler", result["response"])

    def test_a_question_naming_no_game_keeps_the_running_games_notes(self):
        plugin, result = self._ask(
            "How do I beat the boss?", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_REPLY
        )

        handed = self._notes_handed_to_the_model(plugin)
        self.assertNotIn("Soul Master", handed)
        self.assertNotIn("```bonsai-spoiler", result["response"])

    def test_spoilers_are_okay_still_opens_everything(self):
        plugin, result = self._ask(
            _HK_QUESTION + " Spoilers are okay.",
            app_id=_DRG_APP_ID,
            app_name=_DRG_APP_NAME,
            reply=_HK_REPLY,
        )

        self.assertIn("Soul Master", self._notes_handed_to_the_model(plugin))
        self.assertNotIn("```bonsai-spoiler", result["response"])
        self.assertIn("Soul Master", result["response"])

    def test_a_story_game_running_changes_nothing(self):
        """The exception is for a no-story game running only: a story game running keeps its own
        notes, whatever else the question mentions."""
        question = "How do I beat the boss in the caves in Deep Rock Galactic Survivor?"
        lines = self._exception_log_lines(
            question, app_id=_HK_APP_ID, app_name=_HK_APP_NAME, reply=_DRG_REPLY
        )
        plugin, _ = self._ask(question, app_id=_HK_APP_ID, app_name=_HK_APP_NAME, reply=_DRG_REPLY)

        self.assertEqual(lines, [])
        handed = self._notes_handed_to_the_model(plugin)
        self.assertNotIn("Glyphid Dreadnought", handed)

    def test_the_next_bare_follow_up_goes_back_to_the_running_games_notes(self):
        """Only that turn. Nothing of the Hollow Knight turn is carried into the follow-up: the
        remembered subject belongs to another game, so the follow-up search is not widened."""
        self._ask(_HK_QUESTION, app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_HK_REPLY)

        plugin, result = self._ask(
            "what about its second phase",
            app_id=_DRG_APP_ID,
            app_name=_DRG_APP_NAME,
            reply=_DRG_REPLY,
        )

        call = plugin.ask_calls[-1]
        self.assertEqual(call.get("followup_subject") or "", "")
        handed = self._notes_handed_to_the_model(plugin)
        self.assertNotIn("Soul Master", handed)
        self.assertNotIn("Soul Tyrant", handed)
        self.assertNotIn("```bonsai-spoiler", result["response"])


if __name__ == "__main__":
    unittest.main()
