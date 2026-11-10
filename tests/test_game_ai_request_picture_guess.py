"""Title: The picture's guess at the one call site (plan 103, lane P2, round 2)

Purpose: Pin how run_game_ai_request uses py_modules/backend/ask/picture_guess.py, against a small real library:
         switched off (the way it ships) an ordinary picture turn is exactly what it was, byte for byte in what
         the AI is handed and what comes back; switched on, a Strategy picture turn searches the notes with the
         guess's words added, so the boss the picture shows gets its note attached; a Stop during the extra call
         ends the whole ask with no search and no answer call; and the guess's words reach nothing but the search.
Used for: py_modules/backend/ask/game_ai_request.py and py_modules/backend/ask/picture_guess.py.
Solves: A wiring slip would either change every picture turn on a build where the switch is off, or let the guess's
        words (which come from a picture, so from whatever a game screen says) into the AI's prompt or the reply.
Does not: Start Ollama or open a picture: the first call's outcome is a stand-in, as is the model that answers.
"""

import asyncio
import json
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask import game_ai_request, picture_guess  # noqa: E402
from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.ask.picture_guess import GuessOutcome, PictureGuess  # noqa: E402
from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.prompts.ollama_prompts import kb_card_names  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    SmallLibraryAskSetup,
    _FakePlugin,
    _without_timings,
)

_QUESTION = "How do I beat this?"
_PICTURE = [{"path": "C:/pics/boss.jpg", "name": "boss.jpg", "source": "recent", "app_id": ""}]
_MARKER = "Zorblax"  # a word no note holds: if it shows anywhere but the search, the words leaked


def _guess(enemy="Hollow Bough", extra=""):
    return PictureGuess(game="", place=extra, enemy=enemy)


class _PictureAsk(SmallLibraryAskSetup):
    """The real ask path with a picture attached and the model replaced by a recorder."""

    def setUp(self):
        super().setUp()
        self.settings["capabilities"] = {"media_library_access": True}
        self.guess_calls = []
        self.searches = []

    def ask(self, *, outcome=None, switch=False, question=_QUESTION, ask_mode="strategy", attachments=_PICTURE,
            baseline=False, guess_raises=False):
        plugin = _FakePlugin(self.settings)
        plugin.reply = "Circle it and shoot the glowing spot."

        async def fake_guess(_plugin, settings, atts, pc_ip, preferred_model=None):
            self.guess_calls.append((atts, pc_ip, preferred_model))
            if guess_raises:
                raise AssertionError("the first call must not be made")
            return outcome

        async def passthrough(_plugin, settings, atts, pc_ip, preferred_model, ask_mode, words, library_on, domain):
            return words, False

        real_retrieve = game_ai_request.retrieve_knowledge_context

        def recording_retrieve(settings, **kwargs):
            self.searches.append(kwargs["question"])
            return real_retrieve(settings, **kwargs)

        patches = [patch.object(picture_guess, "PICTURE_GUESS_ON", switch), patch.object(picture_guess, "guess_picture", fake_guess),
                   patch.object(game_ai_request, "retrieve_knowledge_context", recording_retrieve)]
        if baseline:  # the ask path as it was before the call site existed
            patches.append(patch.object(picture_guess, "add_picture_guess_words", passthrough))
        for p in patches:
            p.start()
        try:
            result = asyncio.run(run_game_ai_request(
                plugin, question, "127.0.0.1:11434", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME,
                attachments=attachments, ask_mode=ask_mode))
        finally:
            for p in reversed(patches):
                p.stop()
        kb_followup_memory.forget()
        return plugin, result

    @staticmethod
    def notes_in(plugin):
        return kb_card_names(plugin.ask_calls[-1].get("proton_log_attachment") or "")


class SwitchedOffTurnsAreUnchangedTests(_PictureAsk, unittest.TestCase):
    def test_it_ships_switched_off(self):
        self.assertIs(picture_guess.PICTURE_GUESS_ON, False)

    def test_a_picture_turn_is_what_it_was_with_no_first_call_and_the_same_search(self):
        plugin, result = self.ask(guess_raises=True)
        base_plugin, base_result = self.ask(guess_raises=True, baseline=True)
        self.assertEqual(self.guess_calls, [])
        self.assertEqual(self.searches[0], self.searches[1])
        self.assertEqual(self.searches[0], _QUESTION)
        self.assertEqual(len(plugin.ask_calls), 1)
        self.assertEqual(plugin.ask_calls, base_plugin.ask_calls)  # every argument the AI call received
        self.assertEqual(json.dumps(_without_timings(result), sort_keys=True, default=str),
                         json.dumps(_without_timings(base_result), sort_keys=True, default=str))

    def test_a_turn_with_no_picture_is_what_it_was_even_with_the_switch_on(self):
        plugin, result = self.ask(outcome=GuessOutcome("written", _guess()), switch=True, attachments=[])
        base_plugin, base_result = self.ask(outcome=GuessOutcome("written", _guess()), switch=True, attachments=[], baseline=True)
        self.assertEqual(self.guess_calls, [])
        self.assertEqual(plugin.ask_calls, base_plugin.ask_calls)
        self.assertEqual(json.dumps(_without_timings(result), sort_keys=True, default=str),
                         json.dumps(_without_timings(base_result), sort_keys=True, default=str))


class SwitchedOnTests(_PictureAsk, unittest.TestCase):
    def test_the_boss_the_picture_shows_gets_its_note_attached_when_the_typed_words_name_nothing(self):
        plain, _ = self.ask()
        guessed, _ = self.ask(outcome=GuessOutcome("written", _guess()), switch=True)
        self.assertEqual(self.searches, [_QUESTION, f"{_QUESTION} Hollow Bough"])
        self.assertEqual(self.notes_in(guessed)[0], "Hollow Bough")
        self.assertNotIn("Hollow Bough", self.notes_in(plain))

    def test_the_first_call_gets_the_pictures_the_pc_and_the_pinned_model(self):
        self.ask(outcome=GuessOutcome("written", _guess()), switch=True)
        atts, pc_ip, pinned = self.guess_calls[0]
        self.assertEqual((atts, pc_ip, pinned), (_PICTURE, "127.0.0.1:11434", None))

    def test_a_guess_with_no_words_leaves_the_ordinary_search(self):
        plugin, _ = self.ask(outcome=GuessOutcome("written", PictureGuess(not_sure_lines=3)), switch=True)
        self.assertEqual(self.searches, [_QUESTION])
        self.assertEqual(len(plugin.ask_calls), 1)

    def test_a_failed_first_call_leaves_the_ordinary_search_and_the_answer_still_comes(self):
        plugin, result = self.ask(outcome=GuessOutcome("failed", PictureGuess()), switch=True)
        self.assertEqual(self.searches, [_QUESTION])
        self.assertTrue(result["success"])
        self.assertEqual(len(plugin.ask_calls), 1)

    def test_only_a_strategy_turn_gets_the_first_call(self):
        for mode in ("speed", "expert"):
            with self.subTest(mode=mode):
                self.ask(outcome=GuessOutcome("written", _guess()), switch=True, ask_mode=mode)
        self.assertEqual(self.guess_calls, [])

    def test_a_thank_you_with_a_picture_gets_no_first_call(self):
        self.ask(outcome=GuessOutcome("written", _guess()), switch=True, question="Thank you very much")
        self.assertEqual(self.guess_calls, [])

    def test_a_turn_whose_search_goes_to_the_tip_sheet_gets_no_first_call(self):
        with patch.object(game_ai_request, "should_retrieve_knowledge", lambda **kwargs: (True, "compat")):
            self.ask(outcome=GuessOutcome("written", _guess()), switch=True)
        self.assertEqual(self.guess_calls, [])

    def test_with_the_library_off_there_is_no_first_call(self):
        self.settings["use_local_knowledge_base"] = False
        self.ask(outcome=GuessOutcome("written", _guess()), switch=True)
        self.assertEqual(self.guess_calls, [])


class StopDuringTheFirstCallTests(_PictureAsk, unittest.TestCase):
    def test_a_stop_ends_the_whole_ask_with_no_search_and_no_answer_call(self):
        plugin, result = self.ask(outcome=GuessOutcome("stopped", PictureGuess()), switch=True)
        self.assertEqual(plugin.ask_calls, [])
        self.assertEqual(self.searches, [])
        self.assertIs(result["cancelled"], True)
        self.assertIs(result["success"], False)
        self.assertEqual(result["response"], "Request stopped (connection closed).")


class TheWordsStayInTheSearchTests(_PictureAsk, unittest.TestCase):
    def test_nothing_the_ai_is_handed_or_the_person_reads_carries_the_guess_words(self):
        plugin, result = self.ask(outcome=GuessOutcome("written", _guess(enemy=f"Hollow Bough {_MARKER}")), switch=True)
        self.assertIn(_MARKER, self.searches[0])  # it did reach the search...
        self.assertNotIn(_MARKER, json.dumps(plugin.ask_calls, default=str))  # ...and nothing handed to the AI
        self.assertNotIn(_MARKER, json.dumps(result, default=str))  # ...nor anything returned for the screen or saved


if __name__ == "__main__":
    unittest.main()
