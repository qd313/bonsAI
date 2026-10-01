"""A new question about a different game must not be handed the last answer to copy (plan 78, helper I).

Seen on the Deck 2026-09-27 (docs/test-evidence/plan72-Z-FREEPLAY.json, finding 12) and measured
again on the PC's copy of the Deck's model: after a Doom answer, an answer about a different game's
boss came back with 49 words of the Doom answer word for word. The chat memory put the earlier
answer's opening 400 characters in front of the new question, under a heading that told the model
the person was "still asking about the same game". The earlier answers are now left out only on a
positive sign that the subject changed: the new question names a game other than the previous
turn's. Every follow-up, however it is worded, keeps them. These tests look at the text that
actually goes to the model.
"""

import re
import unittest

from test_game_ai_request import _FakePlugin  # noqa: F401  (also installs the decky stand-in)

from backend.services.chat_memory_service import (
    MEMORY_HEADER,
    MEMORY_QUESTIONS_ONLY_HEADER,
    apply_chat_memory_to_prompt,
    plan_and_build_chat_memory,
    subject_changed,
)

HOLLOW_KNIGHT_QUESTION = "In Hollow Knight the big mantis guys in the tall arena keep beating me, any tips"
HOLLOW_KNIGHT_ANSWER = (
    "Right, listen up, mate! Those big mantis guys are all about timing. See how they swing "
    "those big arms? Stay low, wait for the swing to finish, then slash down twice and get out "
    "before the next one comes round."
)
HADES_QUESTION = "Hades the three sisters in the second area are wrecking me, help"

# The notes library, as the title lookup sees it: a title or a nickname inside the text.
_LIBRARY = {"hollow knight": "Hollow Knight", "hades": "Hades", "doom eternal": "DOOM Eternal"}


def _library_title(text: str) -> str:
    low = re.sub(r"[^a-z0-9]+", " ", text.lower())
    for alias in sorted(_LIBRARY, key=len, reverse=True):
        if re.search(rf"(?<!\w){alias}(?!\w)", low):
            return _LIBRARY[alias]
    return ""


class _Log:
    def info(self, *a, **k):
        pass


def _turns(new_question: str, app_name: str = "") -> list:
    first = {"id": "1", "role": "user", "text": HOLLOW_KNIGHT_QUESTION}
    if app_name:
        first["app_name"] = app_name
    return [
        first,
        {"id": "2", "role": "assistant", "text": HOLLOW_KNIGHT_ANSWER},
        {"id": "3", "role": "user", "text": new_question},
    ]


def _prompt_for(new_question: str, library_title=_library_title, app_name: str = "") -> str:
    """The rules plus the memory block, as the model receives them for ``new_question``."""
    return apply_chat_memory_to_prompt(
        system_content="THE RULES",
        question=new_question,
        chat_turns=_turns(new_question, app_name),
        ask_mode="speed",
        think_effort="off",
        room_tokens=16384,
        attached_chars=0,
        logger=_Log(),
        library_title=library_title,
    )


FOLLOW_UPS = (
    "I still can't beat the boss, what else can I try",
    "can you give me a shorter version of the steps please",
    "tell me more about the dodge timing in the fight",
    "are there any other ways to get past the gate",
    "can you explain why the nail upgrade comes first",
    "I tried all of the tips and the fight is still too hard",
    "what should I do after I finish the steps above",
    "can you summarize the whole plan in two lines",
    "which of the three builds is the easiest for a beginner",
    "ok I did the first part, now what do I do next",
    "explain the third step in more detail",
    "what about their second phase",
    "I tried what you suggested and the boss still kills me",
    "how do I beat the Watcher Knights in Hollow Knight",  # the same game, a new question
    "how do I beat the Watcher Knights",  # names no game
)


class OutgoingPromptTests(unittest.TestCase):
    def test_a_question_naming_another_game_is_not_given_the_last_answer(self):
        prompt = _prompt_for(HADES_QUESTION)
        self.assertNotIn("swing those big arms", prompt)
        self.assertNotIn("Right, listen up", prompt)
        self.assertIn(MEMORY_QUESTIONS_ONLY_HEADER, prompt)
        self.assertNotIn(MEMORY_HEADER, prompt)

    def test_it_still_knows_what_was_asked_before(self):
        prompt = _prompt_for(HADES_QUESTION)
        self.assertIn(HOLLOW_KNIGHT_QUESTION, prompt)
        self.assertIn("THE RULES", prompt)

    def test_every_follow_up_keeps_the_answer_it_follows(self):
        for q in FOLLOW_UPS:
            with self.subTest(q=q):
                prompt = _prompt_for(q)
                self.assertIn("swing those big arms", prompt)
                self.assertIn(MEMORY_HEADER, prompt)

    def test_the_memory_text_of_a_follow_up_is_the_old_memory_text(self):
        """With no title lookup at all (the old code had none) the block is the same bytes."""
        for q in FOLLOW_UPS:
            with self.subTest(q=q):
                self.assertEqual(_prompt_for(q), _prompt_for(q, library_title=None))

    def test_the_library_not_being_readable_keeps_the_answers(self):
        self.assertIn("swing those big arms", _prompt_for(HADES_QUESTION, library_title=None))

        def broken(_text):
            raise RuntimeError("corpus unreadable")

        self.assertIn("swing those big arms", _prompt_for(HADES_QUESTION, library_title=broken))

    def test_the_game_that_was_running_counts_as_the_previous_turns_game(self):
        """The previous question named no game, but one was running: Hades is a different game."""
        plain = HOLLOW_KNIGHT_QUESTION.replace("In Hollow Knight ", "")
        turns = _turns(HADES_QUESTION, app_name="Hollow Knight")
        turns[0]["text"] = plain
        self.assertTrue(subject_changed(HADES_QUESTION, turns[:-1], _library_title))
        self.assertFalse(subject_changed("how do I beat the Watcher Knights in Hollow Knight", turns[:-1], _library_title))

    def test_a_previous_turn_about_no_game_that_can_be_told_keeps_the_answers(self):
        turns = [{"id": "1", "role": "user", "text": "any tips for the second boss"}]
        self.assertFalse(subject_changed(HADES_QUESTION, turns, _library_title))
        self.assertFalse(subject_changed(HADES_QUESTION, [], _library_title))


class TheLogSaysSoTests(unittest.TestCase):
    """The device check reads this: the ask log line says whether the earlier answers were left out."""

    def _memory(self, question: str):
        return plan_and_build_chat_memory(
            system_content="THE RULES",
            question=question,
            chat_turns=_turns(question),
            ask_mode="speed",
            think_effort="off",
            room_tokens=16384,
            library_title=_library_title,
        )[1]

    def test_another_game_is_marked(self):
        self.assertTrue(self._memory(HADES_QUESTION).answers_left_out)

    def test_a_follow_up_is_not(self):
        self.assertFalse(self._memory("what about their second phase").answers_left_out)


class WellKnownGamesNeedNoLibraryTests(unittest.TestCase):
    def test_a_game_the_library_lacks_but_the_short_list_knows_still_counts(self):
        turns = [{"id": "1", "role": "user", "text": HOLLOW_KNIGHT_QUESTION}]
        self.assertTrue(subject_changed("any tips for the early nights in Valheim", turns, _library_title))


class TheStepHandsOverTheLibraryTests(unittest.TestCase):
    def test_no_settings_means_no_lookup_and_so_the_answers_are_kept(self):
        import asyncio

        from backend.services.chat_memory_step import _library_title_lookup

        self.assertIsNone(asyncio.run(_library_title_lookup(object())))

        class Broken:
            async def load_settings(self):
                raise OSError("unreadable")

        self.assertIsNone(asyncio.run(_library_title_lookup(Broken())))

    def test_a_readable_library_gives_a_lookup(self):
        import asyncio
        from unittest.mock import patch

        from backend.services.chat_memory_step import _library_title_lookup

        class Plugin:
            async def load_settings(self):
                return {"rag_corpus_path": "somewhere"}

        lookup = asyncio.run(_library_title_lookup(Plugin()))
        with patch(
            "backend.services.knowledge_base_game_match.resolve_title_from_question",
            return_value="Hades",
        ) as resolve:
            self.assertEqual(lookup("anything"), "Hades")
        resolve.assert_called_once_with({"rag_corpus_path": "somewhere"}, "anything")


if __name__ == "__main__":
    unittest.main()
