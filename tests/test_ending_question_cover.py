"""Title: The whole answer to "how does the game end?" sits inside one cover

Purpose: Proves, on the text the screen is sent, that a question asking how a story ends (or for a
major reveal) gets its WHOLE answer inside one ```bonsai-spoiler``` cover: the finished answer, and
every snapshot of it while it streams, from the first word on. Deck, plan 105 Headline-first check:
"How does Hollow Knight end?" came back with the first sentence naming the final boss in plain view.
Used for: backend/spoilers/ending_question_cover.py through the two places that call it, the live
poll (ollama_ask_service.run_ask_ollama) and the finished answer (game_ai_request.run_game_ai_request).
Solves: the maintainer's call, 2026-11-17: allow the ending question, but make sure the whole response
is spoilered.
Does not: draw anything (src/features/answer/transcript/MainTabChatTranscript.endingCover.test.tsx
draws the same strings, read from tests/contracts/ending-cover-answers.json) or load a model.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402
from test_game_ai_request_spoiler_cover import _FakePlugin, _run, _settings  # noqa: E402

from backend.ask import ollama_ask_service  # noqa: E402
from backend.spoilers.ending_question_cover import (  # noqa: E402
    cover_whole_answer,
    ending_cover_applies,
    question_asks_for_the_ending,
)

ENDING_QUESTION = "How does Hollow Knight end?"
ANSWER = (
    "The game ends after you defeat the final boss, who is the Hollow Knight itself.\n\n"
    "The story then concludes with the player ascending to the Light."
)
CONTRACT = Path(__file__).resolve().parent / "contracts" / "ending-cover-answers.json"
RID = 9


def _outside_the_cover(snapshot: str) -> str:
    """What the screen would show in plain view: everything outside a closed cover and outside
    an open one (an open cover is drawn as a chip)."""
    closed = re.sub(r"```bonsai-spoiler\n.*?\n```", "", snapshot, flags=re.DOTALL)
    return re.sub(r"```bonsai-spoiler\n.*$", "", closed, flags=re.DOTALL).strip()


class TheEndingQuestionList(unittest.TestCase):
    MATCHES = [
        "How does Hollow Knight end?",
        "how does it end",
        "How does the game end?",
        "Hollow Knight: how did it end",
        "What's the ending?",
        "the ending of Hades",
        "What is the true ending in Hollow Knight",
        "how do I get the secret ending",
        "What happens at the end of Portal 2?",
        "who is the final boss",
        "Who's the final boss in Elden Ring?",
        "was there a plot twist in Spec Ops",
        "WHO DIES in the last chapter",
    ]
    NO_MATCHES = [
        "How do I end the day in Stardew?",
        "What should I plant on my plot in Stardew?",
        "plot",
        "How do I beat the final boss?",
        "what is the final boss weak to",
        "How does the day end in Stardew?",
        "What does the Soul meter do?",
        "How do I beat the Mantis Lords?",
        "How do I end a fight early?",
        "the weekend",
        "",
    ]

    def test_ending_questions_match(self) -> None:
        for question in self.MATCHES:
            with self.subTest(question):
                self.assertTrue(question_asks_for_the_ending(question))

    def test_false_matches_and_strategy_questions_do_not(self) -> None:
        for question in self.NO_MATCHES:
            with self.subTest(question):
                self.assertFalse(question_asks_for_the_ending(question))

    def test_consent_and_hide_less_turn_it_off(self) -> None:
        self.assertTrue(ending_cover_applies(ENDING_QUESTION, consent=False))
        self.assertFalse(ending_cover_applies(ENDING_QUESTION, consent=True))
        self.assertFalse(ending_cover_applies(ENDING_QUESTION + " Spoilers are okay.", consent=False))
        self.assertFalse(ending_cover_applies(ENDING_QUESTION, consent=False, title_profile="open_tier"))
        self.assertTrue(ending_cover_applies(ENDING_QUESTION, consent=False, title_profile="strict_tier"))


class TheCoverShape(unittest.TestCase):
    def test_a_plain_answer_goes_inside_one_fence_headline_included(self) -> None:
        out = cover_whole_answer(ANSWER, done=True)
        self.assertEqual(out, f"```bonsai-spoiler\n{ANSWER}\n```")
        self.assertEqual(_outside_the_cover(out), "")

    def test_a_stream_is_covered_from_its_first_word_and_stays_open(self) -> None:
        for upto in (3, 20, len(ANSWER)):
            out = cover_whole_answer(ANSWER[:upto], done=False)
            self.assertTrue(out.startswith("```bonsai-spoiler\n"), out)
            self.assertEqual(_outside_the_cover(out), "")
            self.assertFalse(out.rstrip().endswith("\n```"), "the cover stays open while it streams")

    def test_a_half_typed_fence_mark_at_the_end_is_held_back(self) -> None:
        out = cover_whole_answer("It ends well.\n```bon", done=False)
        self.assertEqual(out, "```bonsai-spoiler\nIt ends well.")

    def test_an_answer_with_its_own_covers_gets_no_fence_inside_the_fence(self) -> None:
        raw = "It ends.\n\n```bonsai-spoiler\nThe Light wins.\n```\n\nThen the credits roll."
        out = cover_whole_answer(raw, done=True)
        self.assertEqual(out.count("```"), 2, out)
        self.assertEqual(out, "```bonsai-spoiler\nIt ends.\n\nThe Light wins.\n\nThen the credits roll.\n```")

    def test_an_answer_that_is_already_one_cover_stays_one_cover(self) -> None:
        raw = "```bonsai-spoiler\nThe Light wins.\n```"
        self.assertEqual(cover_whole_answer(raw, done=True), raw)
        once = cover_whole_answer("A.\n```bonsai-spoiler\nB\n```\nC", done=True)
        self.assertEqual(cover_whole_answer(once, done=True), once)

    def test_the_marks_a_model_writes_with_the_label_between_backticks_are_read(self) -> None:
        raw = "It ends. ```bonsai-spoiler```The Light wins.```bonsai-spoiler``` Roll credits."
        out = cover_whole_answer(raw, done=True)
        self.assertEqual(out.count("```"), 2, out)
        self.assertIn("The Light wins.", out)

    def test_an_ordinary_code_block_inside_cannot_end_the_cover(self) -> None:
        raw = "It ends.\n```python\nx = 1\n```\nDone."
        out = cover_whole_answer(raw, done=True)
        self.assertEqual(out, "```bonsai-spoiler\nIt ends.\n~~~python\nx = 1\n~~~\nDone.\n```")

    def test_an_empty_answer_is_left_alone(self) -> None:
        self.assertEqual(cover_whole_answer("", done=True), "")
        self.assertEqual(cover_whole_answer("  \n", done=False), "  \n")


class TheLiveAnswer(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    """What the screen is sent, poll by poll, while a question streams (the same drive as
    test_loading_the_ai_line.py: a fake model call that speaks through the real on_delta)."""

    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings({})
        self.plugin._reset_partial_stream_snapshot(RID)

    def _polled(self) -> str:
        pending = {"status": "pending", "request_id": RID, "started_at": time.time()}
        merged = self.plugin._merge_partial_into_background_status(pending)
        return str(merged.get("partial_response") or "")

    async def _stream(self, question: str, chunks: list[str], **kwargs: Any) -> list[str]:
        """Every snapshot the screen would read: one after each flush, and the finished one."""
        seen: list[str] = []

        def speaks(*_args: Any, **kw: Any) -> dict[str, Any]:
            said = ""
            for chunk in chunks:
                said += chunk
                kw["on_delta"](said, False)
                seen.append(self._polled())
            kw["on_delta"](said, True)
            seen.append(self._polled())
            return {"success": True, "status": 200, "model": "gemma4:e2b-it-qat", "response": said,
                    "assistant_raw": said}

        with (
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=["gemma4:e2b-it-qat"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.media.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.ask.ollama_ask_service.post_ollama_chat", side_effect=speaks),
        ):
            await ollama_ask_service.run_ask_ollama(
                self.plugin, question, "127.0.0.1:11434", "", "",
                request_timeout_seconds=30, token_stream_request_id=RID, **kwargs,
            )
        return seen

    async def test_the_cover_is_there_from_the_first_word(self) -> None:
        words = ANSWER.split(" ")
        chunks = [w + " " for w in words]
        seen = await self._stream(ENDING_QUESTION, chunks)
        self.assertGreater(len(seen), 5)
        for snapshot in seen:
            self.assertTrue(snapshot.startswith("```bonsai-spoiler\n"), snapshot)
            self.assertEqual(_outside_the_cover(snapshot), "", snapshot)
        self.assertEqual(seen[-1], f"```bonsai-spoiler\n{ANSWER.strip()}\n```")

    async def test_the_models_own_cover_inside_it_never_ends_the_outer_one_early(self) -> None:
        said = "It ends.\n\n```bonsai-spoiler\nThe Light wins.\n```\nThen credits."
        seen = await self._stream(ENDING_QUESTION, [said[i:i + 7] for i in range(0, len(said), 7)])
        for snapshot in seen:
            self.assertEqual(_outside_the_cover(snapshot), "", snapshot)
            self.assertEqual(snapshot.count("```bonsai-spoiler"), 1, snapshot)

    async def test_no_cover_with_consent_or_for_a_question_that_is_not_about_the_ending(self) -> None:
        for question, kwargs in [
            (ENDING_QUESTION + " Spoilers are okay.", {}),
            (ENDING_QUESTION, {"strategy_spoiler_consent": True}),
            (ENDING_QUESTION, {"strategy_title_profile": "open_tier"}),
            ("How do I end the day in Stardew?", {}),
            ("What does the Soul meter do?", {}),
        ]:
            with self.subTest(question=question, kwargs=kwargs):
                self.plugin._reset_partial_stream_snapshot(RID)
                seen = await self._stream(question, ["The meter ", "fills as you hit things."], **kwargs)
                for snapshot in seen:
                    self.assertNotIn("```", snapshot)


class TheFinishedAnswer(unittest.TestCase):
    def _ask(self, question: str, response: str = ANSWER, **kwargs: Any) -> str:
        plugin = _FakePlugin(_settings())
        plugin._ollama_result = {"success": True, "response": response, "model": "test-model"}
        with (
            patch("backend.ask.game_ai_request.should_retrieve_knowledge", return_value=(False, "")),
        ):
            return str(_run(plugin, question, **kwargs).get("response", ""))

    def test_an_ending_question_gets_one_fence_around_the_whole_answer(self) -> None:
        for mode in ("speed", "expert", "strategy"):
            with self.subTest(mode=mode):
                out = self._ask(ENDING_QUESTION, ask_mode=mode)
                self.assertTrue(out.startswith("```bonsai-spoiler\n"), out)
                self.assertTrue(out.endswith("\n```"), out)
                self.assertEqual(out.count("```"), 2, out)
                self.assertEqual(_outside_the_cover(out), "")
                self.assertIn("final boss", out)

    def test_with_consent_there_is_no_fence(self) -> None:
        self.assertEqual(self._ask(ENDING_QUESTION + " full spoilers please"), ANSWER)
        self.assertEqual(self._ask(ENDING_QUESTION, spoiler_consent=True), ANSWER)

    def test_the_false_matches_get_no_fence(self) -> None:
        for question in ("How do I end the day in Stardew?", "What should I plant on a plot?",
                         "How do I beat the final boss?", "What does the Soul meter do?"):
            with self.subTest(question):
                self.assertEqual(self._ask(question), ANSWER)

    def test_an_answer_with_its_own_covers_ends_up_with_one_fence(self) -> None:
        raw = "It ends.\n\n```bonsai-spoiler\nThe Light wins.\n```\n\nThen credits."
        out = self._ask(ENDING_QUESTION, raw)
        self.assertEqual(out.count("```"), 2, out)
        self.assertEqual(_outside_the_cover(out), "")

    def test_the_answers_the_screen_test_draws_are_what_the_back_end_writes(self) -> None:
        """tests/contracts/ending-cover-answers.json holds the strings the screen test draws; they
        must stay exactly what this back end writes for those answers."""
        for case in json.loads(CONTRACT.read_text(encoding="utf-8"))["cases"]:
            with self.subTest(case["name"]):
                self.assertEqual(cover_whole_answer(case["model_text"], done=True), case["finished"])
                self.assertEqual(self._ask(case["question"], case["model_text"]), case["finished"])
                for partial, shown in case["streamed"]:
                    self.assertEqual(cover_whole_answer(partial, done=False), shown)


if __name__ == "__main__":
    unittest.main()
