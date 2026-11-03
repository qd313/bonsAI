"""Title: The picture question can say which game the picture is from

Purpose: With a game running and a screenshot attached, the AI named another game about a third of the time
         (plan 98 measurement, 2026-10-25). The running game's name only reached it in the system text, far
         from the picture. Plan 102 lane D measured one plain sentence, "This screenshot is from <game>.", at
         the front of the question itself: the game was named 91 and 92 times in a hundred, against 67 and 70.
         This pins that shape (on by default) and the switch BONSAI_PICTURE_GAME_IN_QUESTION: "today" or "0"
         turns it off, "in-question-only" also drops the system text's own sentence about the picture.
Used for: ollama_ask_service.run_ask_ollama (the message sent to /api/chat) and ollama_prompts
          (picture_game_shape, question_with_picture_game, the system sentence).
Solves: A shape that only exists in a measuring run would be lost; the tests keep the three shapes honest.
Does not: Talk to Ollama or read a picture: the model call and the picture reader are mocks.
"""

from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

from script_loader import load_script
from test_ollama_ask_service import _FakePlugin  # also installs the decky and pwd stand-ins

from backend.ask.ollama_ask_service import run_ask_ollama
from backend.prompts.ollama_prompts import (
    PICTURE_SHAPE_ENV,
    build_system_prompt,
    picture_game_shape,
    question_with_picture_game,
)

SHOT = [{"path": "/home/deck/shot.png", "name": "shot.png"}]
QUESTION = "what game is this and where am i"
GAME_SENTENCE = "This screenshot is from God of War."
SYSTEM_SENTENCE = "The running game named above is the game in the picture"


class _Case(unittest.TestCase):
    def _shape(self, value):
        env = {PICTURE_SHAPE_ENV: value} if value is not None else {}
        patcher = patch.dict(os.environ, env, clear=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        if value is None:
            os.environ.pop(PICTURE_SHAPE_ENV, None)


class WhichShapeIsOn(_Case):
    def test_the_scoring_script_sets_the_same_switch_and_offers_the_same_shapes(self) -> None:
        mod = load_script("eval_screenshot_reading", register=True)
        self.addCleanup(sys.modules.pop, "eval_screenshot_reading", None)
        self.assertEqual(mod.PICTURE_SHAPE_ENV, PICTURE_SHAPE_ENV)
        for shape in mod.PICTURE_SHAPES:
            self._shape(None)
            mod.apply_picture_shape(shape)
            self.assertEqual(picture_game_shape(), shape)

    def test_unset_is_the_game_in_the_question(self) -> None:
        self._shape(None)
        self.assertEqual(picture_game_shape(), "in-question")

    def test_the_two_named_shapes_are_read(self) -> None:
        for value in ("in-question", "in-question-only"):
            with self.subTest(value=value):
                self._shape(value)
                self.assertEqual(picture_game_shape(), value)

    def test_today_and_the_off_words_turn_it_off_whatever_the_capitals_and_spaces(self) -> None:
        for value in ("today", " Today ", "0", "off", "false", "no"):
            with self.subTest(value=value):
                self._shape(value)
                self.assertEqual(picture_game_shape(), "today")

    def test_an_empty_or_unknown_word_keeps_the_default_on(self) -> None:
        for value in ("", "  In-Question ", "nonsense", "1"):
            with self.subTest(value=value):
                self._shape(value)
                self.assertEqual(picture_game_shape(), "in-question")


class TheQuestionTextForAPictureTurn(_Case):
    def test_switched_off_the_question_is_sent_as_it_is(self) -> None:
        self._shape("today")
        self.assertEqual(question_with_picture_game(QUESTION, "God of War", True), QUESTION)

    def test_in_question_puts_the_game_sentence_first_then_the_question(self) -> None:
        for shape in (None, "in-question", "in-question-only"):
            with self.subTest(shape=shape):
                self._shape(shape)
                text = question_with_picture_game(QUESTION, "God of War", True)
                self.assertTrue(text.startswith(GAME_SENTENCE), text)
                self.assertTrue(text.endswith(QUESTION), text)

    def test_no_picture_or_no_game_name_leaves_the_question_alone(self) -> None:
        self._shape("in-question")
        self.assertEqual(question_with_picture_game(QUESTION, "God of War", False), QUESTION)
        self.assertEqual(question_with_picture_game(QUESTION, "", True), QUESTION)
        self.assertEqual(question_with_picture_game(QUESTION, "   ", True), QUESTION)


class TheSystemTextsOwnSentence(_Case):
    def _prompt(self, *, picture: bool = True) -> str:
        return build_system_prompt(
            question=QUESTION,
            app_id="1593500",
            app_name="God of War",
            normalized_attachments=[],
            prepared_images=["iVBORw0KGgo="] if picture else [],
            lookup_app_name=lambda _a: "",
            lookup_screenshot_vdf_metadata=lambda _p: {},
            ask_mode="speed",
        )

    def test_the_default_the_first_shape_and_the_off_switch_keep_it(self) -> None:
        for shape in (None, "in-question", "today"):
            with self.subTest(shape=shape):
                self._shape(shape)
                self.assertIn(SYSTEM_SENTENCE, self._prompt())

    def test_the_second_shape_leaves_it_out_and_keeps_the_rest_of_the_picture_rules(self) -> None:
        self._shape("in-question-only")
        p = self._prompt()
        self.assertNotIn(SYSTEM_SENTENCE, p)
        self.assertIn("The currently running game is: God of War (AppID: 1593500).", p)
        self.assertIn("Require at least two distinct game-specific cues before naming a title.", p)


class TheMessageSentToTheModel(unittest.IsolatedAsyncioTestCase):
    async def _sent_messages(self, shape, *, app_name="God of War", app_id="1593500", picture=True):
        env = {PICTURE_SHAPE_ENV: shape} if shape else {}
        with (
            patch.dict(os.environ, env, clear=False),
            patch("backend.media.screenshot_media.prepare_attachment_images") as prep,
            patch("backend.ask.ollama_ask_service.post_ollama_chat") as post,
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=["gemma4:e2b-it-qat"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
        ):
            if not shape:
                os.environ.pop(PICTURE_SHAPE_ENV, None)
            prep.return_value = ([{"image_b64": "abc"}] if picture else [], [], [])
            post.return_value = {"success": True, "status": 200, "model": "gemma4:e2b-it-qat", "response": "ok"}
            await run_ask_ollama(
                _FakePlugin(), QUESTION, "127.0.0.1:11434", app_id, app_name, attachments=SHOT)
        post.assert_called()
        return post.call_args.args[2]

    async def test_switched_off_the_user_message_is_the_bare_question_with_the_picture_on_it(self) -> None:
        user = (await self._sent_messages("today"))[1]
        self.assertEqual(user["role"], "user")
        self.assertEqual(user["content"], QUESTION)
        self.assertEqual(user["images"], ["abc"])

    async def test_by_default_the_user_message_begins_with_the_game_sentence(self) -> None:
        for shape in (None, "in-question", "in-question-only"):
            with self.subTest(shape=shape):
                user = (await self._sent_messages(shape))[1]
                self.assertTrue(user["content"].startswith(GAME_SENTENCE), user["content"])
                self.assertTrue(user["content"].endswith(QUESTION))
                self.assertEqual(user["images"], ["abc"])

    async def test_the_system_message_is_untouched_by_the_shape(self) -> None:
        for shape in (None, "today", "in-question", "in-question-only"):
            with self.subTest(shape=shape):
                system = (await self._sent_messages(shape))[0]
                self.assertEqual(system, {"role": "system", "content": "system prompt"})

    async def test_a_turn_with_no_picture_or_no_running_game_is_not_changed(self) -> None:
        no_picture = (await self._sent_messages(None, picture=False))[1]
        self.assertEqual(no_picture["content"], QUESTION)
        no_game = (await self._sent_messages(None, app_name="", app_id=""))[1]
        self.assertEqual(no_game["content"], QUESTION)


if __name__ == "__main__":
    unittest.main()
