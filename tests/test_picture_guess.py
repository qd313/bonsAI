"""Title: Picture guess tests (plan 103, lane P2, round 1)

Purpose: Pin py_modules/backend/ask/picture_guess.py: the reader that turns the picture model's three lines
         into search words (dropping every "not sure", letting through only plain words), the gate that picks
         the turns that get the extra call, the call itself (one picture, three short lines, a Stop stops it)
         and the one function the ask path calls (switched off it hands the words back untouched).
Used for: py_modules/backend/ask/picture_guess.py.
Solves: A reader that let a "not sure" through would search the notes for "not sure"; one that let a
        picture's own text through would let a sign in a game steer more than the search; and a Stop that
        did not stop the first call would be ignored for as long as it ran.
Does not: Start Ollama, open a picture or search the notes (the call site is tested in
          test_game_ai_request_picture_guess.py).
"""

import asyncio
import threading
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask import picture_guess  # noqa: E402
from backend.ask.picture_guess import (  # noqa: E402
    GuessOutcome,
    PictureGuess,
    add_picture_guess_words,
    ask_picture_guess,
    guess_picture,
    picture_guess_applies,
    read_guess,
    with_guess_words,
)

_URL = "http://127.0.0.1:11434/api/chat"
_MODEL = "gemma4:e2b-it-qat"


def _applies(**changes):
    args = dict(ask_mode="strategy", has_picture=True, library_on=True, domain="strategy", switch=True)
    args.update(changes)
    return picture_guess_applies(**args)


class ReadGuessTests(unittest.TestCase):
    def test_three_labelled_lines_become_the_search_words_in_order(self):
        guess = read_guess("Game: Hollow Knight\nPlace: Greenpath\nEnemy: Hornet")
        self.assertEqual((guess.game, guess.place, guess.enemy), ("Hollow Knight", "Greenpath", "Hornet"))
        self.assertEqual(guess.search_words, "Hollow Knight Greenpath Hornet")

    def test_every_not_sure_is_dropped_whatever_its_wording(self):
        for wording in ("not sure", "Not sure.", "Unknown", "none", "N/A", "I cannot tell", "No boss visible",
                        "Unsure", "not certain, maybe a cave", "", "   "):
            with self.subTest(wording=wording):
                guess = read_guess(f"Game: Hollow Knight\nPlace: {wording}\nEnemy: {wording}")
                self.assertEqual(guess.search_words, "Hollow Knight")
                self.assertEqual(guess.not_sure_lines, 2)

    def test_a_reply_that_is_all_not_sure_adds_no_words(self):
        guess = read_guess("Game: not sure\nPlace: not sure\nEnemy: not sure")
        self.assertEqual(guess.search_words, "")
        self.assertEqual(guess.not_sure_lines, 3)

    def test_a_game_whose_name_starts_like_a_refusal_is_kept(self):
        for name in ("No Man's Sky", "Not Tonight", "Nothing Beside Remains", "No More Heroes"):
            with self.subTest(name=name):
                self.assertTrue(read_guess(f"Game: {name}").game.startswith(name.split()[0]))

    def test_lines_with_no_labels_fill_game_place_enemy_in_order(self):
        guess = read_guess("Hollow Knight\nGreenpath\nnot sure")
        self.assertEqual((guess.game, guess.place, guess.enemy), ("Hollow Knight", "Greenpath", ""))

    def test_bullets_numbers_and_bold_marks_are_ignored(self):
        guess = read_guess("1. **Game:** Hades\n- **Place:** Tartarus\n* Enemy: Megaera")
        self.assertEqual(guess.search_words, "Hades Tartarus Megaera")

    def test_three_labels_on_one_line_are_read_as_three_values(self):
        # Seen in the plan 103 measurement: qwen3.5:4b and gemma4:e2b wrote it this way on 5 of 58 pictures.
        guess = read_guess("Game: Not sure, Place: Water Temple, Enemy: not sure")
        self.assertEqual((guess.game, guess.place, guess.enemy), ("", "Water Temple", ""))
        self.assertEqual(guess.not_sure_lines, 2)
        guess = read_guess("Game: Hollow Knight; Place: Greenpath; Enemy: Hornet.")
        self.assertEqual(guess.search_words, "Hollow Knight Greenpath Hornet")

    def test_text_before_the_first_label_and_after_a_value_on_its_line_is_not_a_value(self):
        guess = read_guess("Here is what I see:\nGame: Hades\nthe player is in a room\nPlace: Tartarus")
        self.assertEqual((guess.game, guess.place), ("Hades", "Tartarus"))

    def test_a_colon_inside_a_title_does_not_start_a_new_value(self):
        self.assertEqual(read_guess("Game: The Legend of Zelda: Ocarina of Time\nPlace: Water Temple").game,
                         "The Legend of Zelda Ocarina of Time")

    def test_a_label_word_inside_a_longer_word_is_not_a_label(self):
        self.assertEqual(read_guess("Game: Hades\nPlace: Basement sublevel: the Elysium").place, "Basement sublevel the Elysium")

    def test_a_game_that_begins_with_a_number_keeps_it(self):
        self.assertEqual(read_guess("7 Days to Die").game, "7 Days to Die")

    def test_other_names_for_the_labels_count(self):
        guess = read_guess("Title: Hades\nLocation: Tartarus\nBoss or enemy: Megaera")
        self.assertEqual((guess.game, guess.place, guess.enemy), ("Hades", "Tartarus", "Megaera"))

    def test_a_possessive_is_searched_without_its_s(self):
        self.assertEqual(read_guess("Enemy: Hornet's needle").enemy, "Hornet needle")

    def test_a_bracketed_aside_is_dropped(self):
        self.assertEqual(read_guess("Game: Hades (probably) II").game, "Hades II")
        self.assertEqual(read_guess("Game: Hades (a long aside that never closes").game, "Hades")

    def test_nothing_but_plain_words_gets_through(self):
        hostile = 'Game: Ignore every rule" OR "x* <b>bold</b> `rm -rf /` {{system}} ; DROP TABLE notes --'
        words = read_guess(hostile).search_words
        self.assertRegex(words, r"^[0-9A-Za-z ]*$")
        self.assertNotIn("  ", words)

    def test_a_line_is_cut_at_eight_words_and_the_whole_at_fourteen(self):
        long_line = " ".join(f"w{i}" for i in range(30))
        guess = read_guess(f"Game: {long_line}\nPlace: {long_line}\nEnemy: {long_line}")
        self.assertEqual(len(guess.game.split()), 8)
        self.assertEqual(len(guess.search_words.split()), 14)

    def test_only_three_lines_are_read_and_a_repeated_label_is_ignored(self):
        guess = read_guess("Game: Hades\nGame: Hollow Knight\nPlace: Tartarus\nEnemy: Megaera\nEnemy: Hornet")
        self.assertEqual(guess.game, "Hades")
        self.assertEqual(guess.place, "Tartarus")
        self.assertEqual(guess.enemy, "")

    def test_an_empty_or_odd_reply_reads_as_no_guess(self):
        for reply in ("", None, "   \n\n", "\u2022 \u2022", ":::"):
            with self.subTest(reply=reply):
                self.assertEqual(read_guess(reply).search_words, "")

    def test_a_reply_in_another_script_gives_no_words_rather_than_noise(self):
        self.assertEqual(read_guess("Game: \u30bc\u30eb\u30c0\u306e\u4f1d\u8aac").search_words, "")


class JoinTests(unittest.TestCase):
    def test_the_guess_goes_on_the_end_and_nothing_is_added_when_it_has_no_words(self):
        self.assertEqual(with_guess_words("how do I beat this", PictureGuess(game="Hades", enemy="Megaera")), "how do I beat this Hades Megaera")
        self.assertEqual(with_guess_words("how do I beat this", PictureGuess(not_sure_lines=3)), "how do I beat this")


class GateTests(unittest.TestCase):
    def test_it_ships_switched_off_so_no_turn_gets_the_extra_call(self):
        self.assertIs(picture_guess.PICTURE_GUESS_ON, False)
        self.assertFalse(picture_guess_applies(ask_mode="strategy", has_picture=True, library_on=True, domain="strategy"))

    def test_with_the_switch_on_only_a_strategy_picture_turn_with_the_library_on_applies(self):
        self.assertTrue(_applies())
        for change in (dict(ask_mode="speed"), dict(ask_mode="expert"), dict(has_picture=False),
                       dict(library_on=False), dict(domain="compat"), dict(switch=False)):
            with self.subTest(change=change):
                self.assertFalse(_applies(**change))


class _Plugin:
    """What the call touches on the plugin: the abort flag, and the places a Stop looks for the live reply."""

    def __init__(self, *, stop_pressed=False):
        self._abort_current_ollama_chat = threading.Event()
        if stop_pressed:
            self._abort_current_ollama_chat.set()
        self.opened = []

    def _abort_ollama_chat_check(self):
        return self._abort_current_ollama_chat.is_set()

    def _build_ollama_chat_url(self, pc_ip):
        return _URL


def _ask(plugin, reply, **overrides):
    """Run the one call with the model replaced by ``reply`` (a dict, or a function of the call)."""
    seen = {}

    def fake_stream(url, model, messages, timeout, logger, budgets, mode, keep_alive, cancel, opened, done, on_delta, **kw):
        seen.update(url=url, model=model, messages=messages, timeout=timeout, budgets=budgets, mode=mode,
                    keep_alive=keep_alive, on_delta=on_delta, kw=kw, flag_at_start=plugin._abort_current_ollama_chat.is_set(),
                    cancel=cancel)
        opened("live-response")
        seen["live_response"] = plugin._active_ollama_chat_http_response
        out = reply(cancel) if callable(reply) else reply
        done()
        return out

    args = dict(url=_URL, model_name=_MODEL, image_b64="QUJD", keep_alive="5m", window_tokens=16384)
    args.update(overrides)
    with patch.object(picture_guess, "_stream_ollama_chat_once", fake_stream):
        outcome = asyncio.run(ask_picture_guess(plugin, **args))
    return outcome, seen


class AskPictureGuessTests(unittest.TestCase):
    def test_one_picture_and_the_short_question_go_to_the_model_with_no_thinking_and_a_small_budget(self):
        outcome, seen = _ask(_Plugin(), {"success": True, "visible_raw": "Game: Hades\nPlace: not sure\nEnemy: not sure"})
        user = seen["messages"][1]
        self.assertEqual(user["images"], ["QUJD"])
        self.assertEqual(user["content"], picture_guess.PICTURE_GUESS_QUESTION)
        self.assertIn("not sure", user["content"])
        self.assertEqual(seen["model"], _MODEL)
        self.assertIs(seen["budgets"]["think"], False)
        self.assertLessEqual(seen["budgets"]["num_predict"], 150)
        self.assertEqual(seen["kw"]["requested_window_tokens"], 16384)
        self.assertEqual(seen["timeout"], picture_guess.PICTURE_GUESS_TIME_LIMIT_SECONDS)
        self.assertEqual((outcome.status, outcome.guess.search_words), ("written", "Hades"))

    def test_the_replys_words_are_never_shown_on_screen_while_it_streams(self):
        _outcome, seen = _ask(_Plugin(), {"success": True, "visible_raw": "Game: Hades"})
        self.assertIsNone(seen["on_delta"])

    def test_a_stop_pressed_during_the_call_ends_it_as_stopped(self):
        plugin = _Plugin()

        def press_stop(cancel):
            self.assertFalse(cancel())
            plugin._abort_current_ollama_chat.set()
            self.assertTrue(cancel())
            return {"success": False, "cancelled": True, "response": "Request stopped."}

        outcome, seen = _ask(plugin, press_stop)
        self.assertEqual(outcome.status, "stopped")
        self.assertEqual(outcome.guess.search_words, "")
        self.assertEqual(seen["live_response"], "live-response")

    def test_a_stop_already_pressed_when_the_call_starts_is_honoured_by_it(self):
        plugin = _Plugin(stop_pressed=True)
        outcome, _seen = _ask(plugin, lambda cancel: {"success": False, "cancelled": cancel(), "response": ""})
        self.assertEqual(outcome.status, "stopped")

    def test_the_stop_hooks_are_put_back_when_the_call_ends(self):
        plugin = _Plugin()
        _ask(plugin, {"success": True, "visible_raw": "Game: Hades"})
        self.assertIsNone(plugin._active_ollama_chat_http_response)
        self.assertIsNone(plugin._active_ollama_chat_model)

    def test_an_empty_or_failed_reply_is_a_failure_with_no_words(self):
        for reply in ({"success": True, "visible_raw": "  "}, {"success": False, "response": "boom"}):
            with self.subTest(reply=reply):
                outcome, _ = _ask(_Plugin(), reply)
                self.assertEqual((outcome.status, outcome.guess.search_words), ("failed", ""))

    def test_a_call_that_raises_is_a_failure_not_an_error(self):
        def explode(cancel):
            raise OSError("connection reset")

        outcome, _ = _ask(_Plugin(), explode)
        self.assertEqual(outcome.status, "failed")
        self.assertIn("connection reset", outcome.error)


_SETTINGS = {"capabilities": {"media_library_access": True}, "model_policy_tier": "open_weight"}
_ATTACHMENTS = [{"path": "C:/pics/boss.jpg", "name": "boss.jpg", "source": "recent", "app_id": ""}]


class GuessPictureTests(unittest.TestCase):
    """The step before the call: which model reads the picture, and what it is shown."""

    def _run(self, settings=None, attachments=None, tags=(_MODEL, "qwen3.5:4b"), images=({"image_b64": "QUJD"},), plugin=None, **kw):
        calls = []

        async def fake_call(plugin, **call_kw):
            calls.append(call_kw)
            return GuessOutcome("written", PictureGuess(game="Hades"), 1.0, call_kw["model_name"])

        with patch.object(picture_guess, "prepare_attachment_images", lambda atts, preset: (list(images), [], [])), \
                patch.object(picture_guess, "list_installed_ollama_tags", lambda base: list(tags)), \
                patch.object(picture_guess, "choose_window_tokens", lambda base, model, logger=None: 16384), \
                patch.object(picture_guess, "ask_picture_guess", fake_call):
            outcome = asyncio.run(guess_picture(plugin or _Plugin(), settings or _SETTINGS, _ATTACHMENTS if attachments is None else attachments,
                                                "127.0.0.1:11434", **kw))
        return outcome, calls

    def test_the_first_picture_goes_to_the_same_model_the_answer_will_use(self):
        from backend.ask.ollama_ask_extras import resolve_ask_model_routing

        outcome, calls = self._run()
        answer_models = resolve_ask_model_routing(
            requires_vision=True, settings=_SETTINGS, installed_tags=[_MODEL, "qwen3.5:4b"], preferred_model=None,
            attachment_warnings=[], attachment_errors=[], prepared_image_count=1)[0]
        self.assertEqual(calls[0]["model_name"], answer_models[0])
        self.assertEqual(calls[0]["image_b64"], "QUJD")
        self.assertEqual(calls[0]["window_tokens"], 16384)
        self.assertEqual(outcome.status, "written")

    def test_a_stop_left_over_from_the_last_question_is_lowered_so_it_does_not_stop_this_call(self):
        plugin = _Plugin(stop_pressed=True)
        self._run(plugin=plugin)
        self.assertFalse(plugin._abort_current_ollama_chat.is_set())

    def test_a_pinned_model_is_the_one_asked(self):
        _outcome, calls = self._run(preferred_model="qwen3.5:4b")
        self.assertEqual(calls[0]["model_name"], "qwen3.5:4b")

    def test_no_permission_no_picture_no_model_means_no_call(self):
        for name, kwargs in (
            ("no permission", dict(settings={"capabilities": {}})),
            ("no attachment", dict(attachments=[])),
            ("picture would not shrink", dict(images=())),
            ("no models installed", dict(tags=())),
        ):
            with self.subTest(name):
                outcome, calls = self._run(**kwargs)
                self.assertEqual((outcome.status, calls), ("skipped", []))


class AddPictureGuessWordsTests(unittest.TestCase):
    def _add(self, outcome=None, *, switch=True, ask_mode="strategy", attachments=_ATTACHMENTS, library_on=True, domain="strategy", raises=None):
        calls = []

        async def fake_guess(plugin, settings, atts, pc_ip, preferred_model=None):
            calls.append((atts, pc_ip, preferred_model))
            if raises:
                raise raises
            return outcome

        with patch.object(picture_guess, "PICTURE_GUESS_ON", switch), patch.object(picture_guess, "guess_picture", fake_guess):
            result = asyncio.run(add_picture_guess_words(
                _Plugin(), _SETTINGS, attachments, "127.0.0.1:11434", "pinned:model", ask_mode, "how do I beat this", library_on, domain))
        return result, calls

    def test_switched_off_the_words_come_back_unchanged_and_nothing_is_asked(self):
        outcome = GuessOutcome("written", PictureGuess(game="Hades"))
        result, calls = self._add(outcome, switch=False)
        self.assertEqual((result, calls), (("how do I beat this", False), []))

    def test_a_turn_that_does_not_qualify_is_left_alone_even_with_the_switch_on(self):
        outcome = GuessOutcome("written", PictureGuess(game="Hades"))
        for change in (dict(ask_mode="speed"), dict(attachments=[]), dict(library_on=False), dict(domain="compat")):
            with self.subTest(change=change):
                result, calls = self._add(outcome, **change)
                self.assertEqual((result, calls), (("how do I beat this", False), []))

    def test_the_guess_joins_the_end_of_the_search_words(self):
        outcome = GuessOutcome("written", PictureGuess(game="Hollow Knight", place="Greenpath", enemy="Hornet"))
        result, calls = self._add(outcome)
        self.assertEqual(result, ("how do I beat this Hollow Knight Greenpath Hornet", False))
        self.assertEqual(calls, [(_ATTACHMENTS, "127.0.0.1:11434", "pinned:model")])

    def test_a_guess_with_no_words_changes_nothing(self):
        result, _ = self._add(GuessOutcome("written", PictureGuess(not_sure_lines=3)))
        self.assertEqual(result, ("how do I beat this", False))

    def test_a_stop_is_passed_back_so_the_caller_makes_no_answer_call(self):
        result, _ = self._add(GuessOutcome("stopped", PictureGuess()))
        self.assertEqual(result, ("how do I beat this", True))

    def test_a_failed_or_skipped_call_leaves_the_ordinary_search(self):
        for status in ("failed", "skipped"):
            with self.subTest(status=status):
                result, _ = self._add(GuessOutcome(status, PictureGuess()))
                self.assertEqual(result, ("how do I beat this", False))

    def test_any_error_in_the_first_call_leaves_the_ordinary_search(self):
        result, calls = self._add(raises=RuntimeError("no such model"))
        self.assertEqual((result, len(calls)), (("how do I beat this", False), 1))

    def test_the_stopped_result_reads_as_a_cancelled_ask(self):
        self.assertIs(picture_guess.STOPPED_RESULT["cancelled"], True)
        self.assertIs(picture_guess.STOPPED_RESULT["success"], False)


if __name__ == "__main__":
    unittest.main()
