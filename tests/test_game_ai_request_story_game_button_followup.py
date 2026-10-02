"""Plan 79 helper AE (D122 item 9): a button pressed under an answer keeps that answer's game.

Plan 78 made a question that names a protected story game, asked while a no-story game runs
(Hollow Knight asked about with Deep Rock Galactic: Survivor running), use Hollow Knight's notes
and spoiler covers for that one turn. A choice button ("I'm at: ...") or a refine chip pressed
under that answer sends text that names no game, so it used to go back to Deep Rock's notes and
Deep Rock's no-cover rules, and the follow-up answer could name a boss with nothing over it.
The one Deck try of the choice button (plan78-P77-SPOILER-OTHER-GAME-try2.json) kept Hollow
Knight only because the screen had quoted "Earlier I asked: ..." into the button's text, from a
memory that is empty after a plugin reload or a reopened chat.

These run the real ask path like test_game_ai_request_story_game_named.py does (a two-game
library on disk, real retrieval, real cover step; only the model is a stand-in) and read what
reaches the answer: the notes handed to the model, and the cover around a protected boss. The
saved chat is a stand-in plugin method that returns the turns the real one would.
"""

import asyncio
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.game_ai_request import run_game_ai_request  # noqa: E402
from backend.services.knowledge_base_cards import close_connection  # noqa: E402
from backend.services.knowledge_base_schema import CORPUS_DB_FILENAME  # noqa: E402
from backend.services.ollama_prompts import kb_card_names  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    _DRG_REPLY,
    _HK_QUESTION,
    _HK_REPLY,
    _FakePlugin,
    _build_library,
)

# What the screen sends when a choice button is pressed: the "Earlier I asked" line is there
# only while the screen still remembers the question (_BUTTON_NO_QUOTE is the text without it).
_PICK_LINE = "[Strategy follow-up] I'm at: Fighting the boss in the Soul Sanctum."
_PICK_TAIL = "Give controller-friendly coaching for this exact point, then end with **If you want to cheat…** as instructed."
_BUTTON_NO_QUOTE = f"{_PICK_LINE}\n{_PICK_TAIL}"
_BUTTON_WITH_QUOTE = f"{_PICK_LINE}\nEarlier I asked: {_HK_QUESTION}\n\n{_PICK_TAIL}"
_DRG_QUESTION = "How do I beat the boss in the caves?"
# A refine chip fills the box with its own words and the old question; the player can edit the
# game's name out of it. The chip's payload still carries the parent question exactly.
_CHIP_TEXT_WITHOUT_GAME = "That was too long, shorter please: how do I beat the boss in the Soul Sanctum?"
_CHIP_TEXT_DRG = "That was too long, shorter please: how do I beat the boss in the caves?"


def _chip(chip_id, parent_question, parent_answer):
    return {
        "chip_id": chip_id,
        "parent_question": parent_question,
        "parent_answer": parent_answer,
        "preferred_model": None,
    }


def _turn(role, text):
    return {"role": role, "text": text, "app_id": _DRG_APP_ID, "app_name": _DRG_APP_NAME}


class _ChatPlugin(_FakePlugin):
    """The stand-in plugin plus the saved chat the real one reads from disk."""

    def __init__(self, settings, turns, slots_dir=""):
        super().__init__(settings)
        self._turns = turns
        self._slots_dir = slots_dir
        self._chat_slots_store_lock = asyncio.Lock()

    def _chat_slots_settings_dir(self):
        return self._slots_dir

    def _active_request_id(self):
        return 7

    def chat_for_request(self, request_id):
        return {"id": "chat-1", "turns": list(self._turns), "origin_app_id": _DRG_APP_ID,
                "origin_app_name": _DRG_APP_NAME}


class ButtonUnderAnAnswerKeepsItsGameTests(unittest.TestCase):
    def setUp(self):
        self._dir = Path(tempfile.mkdtemp(prefix="p79ae-library-"))
        _build_library(self._dir)
        self.addCleanup(shutil.rmtree, self._dir, ignore_errors=True)
        self.addCleanup(close_connection, str(self._dir / CORPUS_DB_FILENAME))
        self.addCleanup(kb_followup_memory.forget)
        kb_followup_memory.forget()
        self.settings = dict(
            use_local_knowledge_base=True,
            rag_corpus_path=str(self._dir),
            rag_hybrid_retrieval_enabled=False,
            capabilities={},
            input_sanitizer_user_disabled=False,
            latency_timeouts_custom_enabled=False,
        )

    def _chat_with_a_hollow_knight_answer(self, live_question):
        """The saved chat when the button is pressed: the Hollow Knight question, its answer, and
        the live question, which the real plugin has already written into the chat."""
        return [_turn("user", _HK_QUESTION), _turn("assistant", _HK_REPLY), _turn("user", live_question)]

    def _ask(self, question, turns, reply, reply_followup=None):
        plugin = _ChatPlugin(self.settings, turns, str(self._dir))
        plugin.reply = reply
        result = asyncio.run(
            run_game_ai_request(
                plugin,
                question,
                "127.0.0.1:11434",
                app_id=_DRG_APP_ID,
                app_name=_DRG_APP_NAME,
                ask_mode="strategy",
                reply_followup=reply_followup,
            )
        )
        return plugin, result

    @staticmethod
    def _handed(plugin):
        return kb_card_names(plugin.ask_calls[-1].get("proton_log_attachment") or "")

    @staticmethod
    def _outside_covers(text):
        return re.sub(r"```bonsai-spoiler\n.*?```\n?", "", text, flags=re.DOTALL)

    def _assert_deep_rocks_turn(self, plugin, result):
        handed = self._handed(plugin)
        self.assertIn("Glyphid Dreadnought", handed)
        self.assertNotIn("Soul Master", handed)
        self.assertNotIn("```bonsai-spoiler", result["response"])

    def _assert_hollow_knights_turn(self, plugin, result):
        handed = self._handed(plugin)
        self.assertIn("Soul Master", handed)
        self.assertNotIn("Glyphid Dreadnought", handed)
        self.assertNotIn("Hollow Bough", handed)
        self.assertIn("```bonsai-spoiler", result["response"], "a cover is expected")
        self.assertNotIn("Soul Master", self._outside_covers(result["response"]))
        self.assertNotIn("Soul Tyrant", self._outside_covers(result["response"]))
        self.assertEqual(plugin.ask_calls[-1]["strategy_title_profile"], "protect_progression")

    # -- the choice button --------------------------------------------------------------------

    def test_a_choice_button_without_the_quoted_question_keeps_hollow_knights_notes_and_covers(self):
        """The button text names no game; the saved chat says which answer it was pressed under."""
        plugin, result = self._ask(
            _BUTTON_NO_QUOTE, self._chat_with_a_hollow_knight_answer(_BUTTON_NO_QUOTE), _HK_REPLY
        )

        self._assert_hollow_knights_turn(plugin, result)

    def test_a_choice_button_with_the_quoted_question_still_keeps_hollow_knights_notes(self):
        """The case the Deck try happened to exercise; it must not stop working."""
        plugin, result = self._ask(
            _BUTTON_WITH_QUOTE, self._chat_with_a_hollow_knight_answer(_BUTTON_WITH_QUOTE), _HK_REPLY
        )

        self._assert_hollow_knights_turn(plugin, result)

    def test_a_second_button_press_still_finds_the_typed_question_behind_the_first(self):
        first_pick = _BUTTON_NO_QUOTE
        second_pick = f"{_PICK_LINE.replace('boss in', 'first form of the boss in')}\n{_PICK_TAIL}"
        turns = [
            _turn("user", _HK_QUESTION),
            _turn("assistant", _HK_REPLY),
            _turn("user", first_pick),
            _turn("assistant", _HK_REPLY),
            _turn("user", second_pick),
        ]

        plugin, result = self._ask(second_pick, turns, _HK_REPLY)

        self._assert_hollow_knights_turn(plugin, result)

    def test_a_choice_button_under_a_deep_rock_answer_stays_with_deep_rock(self):
        turns = [_turn("user", _DRG_QUESTION), _turn("assistant", _DRG_REPLY), _turn("user", _BUTTON_NO_QUOTE)]

        plugin, result = self._ask(_BUTTON_NO_QUOTE, turns, _DRG_REPLY)

        self._assert_deep_rocks_turn(plugin, result)

    # -- the refine chip ----------------------------------------------------------------------

    def test_a_refine_chip_whose_text_names_no_game_keeps_hollow_knights_notes_and_covers(self):
        """The chip sends the parent question exactly, whatever the player did to the box text."""
        chip = _chip("too_long", _HK_QUESTION, _HK_REPLY)
        turns = self._chat_with_a_hollow_knight_answer(_CHIP_TEXT_WITHOUT_GAME)

        plugin, result = self._ask(_CHIP_TEXT_WITHOUT_GAME, turns, _HK_REPLY, reply_followup=chip)

        self._assert_hollow_knights_turn(plugin, result)

    def test_a_refine_chip_without_a_saved_chat_still_keeps_hollow_knights_notes(self):
        chip = _chip("bad_information", _HK_QUESTION, _HK_REPLY)

        plugin, result = self._ask(_CHIP_TEXT_WITHOUT_GAME, [], _HK_REPLY, reply_followup=chip)

        self._assert_hollow_knights_turn(plugin, result)

    def test_a_refine_chip_under_a_deep_rock_answer_stays_with_deep_rock(self):
        chip = _chip("too_long", _DRG_QUESTION, _DRG_REPLY)

        plugin, result = self._ask(_CHIP_TEXT_DRG, [], _DRG_REPLY, reply_followup=chip)

        self._assert_deep_rocks_turn(plugin, result)

    # -- what must not change -----------------------------------------------------------------

    def test_a_typed_follow_up_naming_no_game_still_goes_to_the_running_game(self):
        """Plan 78 question 1: the maintainer's call. Even with a Hollow Knight answer just above."""
        typed = "what about its second phase"
        plugin, result = self._ask(typed, self._chat_with_a_hollow_knight_answer(typed), _DRG_REPLY)

        handed = self._handed(plugin)
        self.assertNotIn("Soul Master", handed)
        self.assertNotIn("Soul Tyrant", handed)
        self.assertNotIn("```bonsai-spoiler", result["response"])

    def test_the_log_says_the_answer_above_picked_the_notes(self):
        from unittest.mock import patch

        with patch("backend.services.game_ai_request.logger") as logger:
            self._ask(_BUTTON_NO_QUOTE, self._chat_with_a_hollow_knight_answer(_BUTTON_NO_QUOTE), _HK_REPLY)
        lines = [
            (call.args[0] % call.args[1:]) if len(call.args) > 1 else str(call.args[0])
            for call in logger.info.call_args_list
            if call.args
        ]
        picked = [line for line in lines if "named story game picks the notes" in line]
        self.assertEqual(len(picked), 1, picked)
        self.assertIn("answer above", picked[0])
        self.assertIn(_DRG_APP_NAME, picked[0])


if __name__ == "__main__":
    unittest.main()
