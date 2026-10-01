"""A new question about another game must not be handed the last answer to copy (plan 78, helper I).

Seen on the Deck 2026-09-27 (docs/test-evidence/plan72-Z-FREEPLAY.json, finding 12) and measured
again on the PC's copy of the Deck's model: after a Doom answer, an answer about a different game's
boss came back with 49 words of the Doom answer word for word. The chat memory put the earlier
answer's opening 400 characters in front of the new question, under a heading that told the model
the person was "still asking about the same game". These tests look at the text that actually goes
to the model.
"""

import unittest

from test_game_ai_request import _FakePlugin  # noqa: F401  (also installs the decky stand-in)
from backend.services.chat_memory_service import (
    MEMORY_HEADER,
    apply_chat_memory_to_prompt,
    plan_and_build_chat_memory,
    question_stands_alone,
)

HOLLOW_KNIGHT_QUESTION = "In Hollow Knight the big mantis guys in the tall arena keep beating me, any tips"
HOLLOW_KNIGHT_ANSWER = (
    "Right, listen up, mate! Those big mantis guys are all about timing. See how they swing "
    "those big arms? Stay low, wait for the swing to finish, then slash down twice and get out "
    "before the next one comes round."
)
HADES_QUESTION = "Hades the three sisters in the second area are wrecking me, help"


class _Log:
    def info(self, *a, **k):
        pass


def _prompt_for(new_question: str) -> str:
    """The rules plus the memory block, as the model receives them for ``new_question``."""
    return apply_chat_memory_to_prompt(
        system_content="THE RULES",
        question=new_question,
        chat_turns=[
            {"id": "1", "role": "user", "text": HOLLOW_KNIGHT_QUESTION},
            {"id": "2", "role": "assistant", "text": HOLLOW_KNIGHT_ANSWER},
            {"id": "3", "role": "user", "text": new_question},
        ],
        ask_mode="speed",
        think_effort="off",
        room_tokens=16384,
        attached_chars=0,
        logger=_Log(),
    )


class OutgoingPromptTests(unittest.TestCase):
    def test_a_question_about_another_game_is_not_given_the_last_answer(self):
        prompt = _prompt_for(HADES_QUESTION)
        self.assertNotIn("swing those big arms", prompt)
        self.assertNotIn("Right, listen up", prompt)

    def test_it_still_knows_what_was_asked_before(self):
        prompt = _prompt_for(HADES_QUESTION)
        self.assertIn(HOLLOW_KNIGHT_QUESTION, prompt)
        self.assertIn("THE RULES", prompt)

    def test_a_bare_follow_up_still_gets_the_answer_it_follows(self):
        prompt = _prompt_for("what about their second phase")
        self.assertIn("swing those big arms", prompt)
        self.assertIn(MEMORY_HEADER, prompt)

    def test_a_follow_up_with_a_pronoun_still_gets_the_answer(self):
        prompt = _prompt_for("why do they keep hitting me so hard")
        self.assertIn("swing those big arms", prompt)


class TheLogSaysSoTests(unittest.TestCase):
    """The device check reads this: the ask log line says whether the earlier answers were left out."""

    def _memory(self, question: str):
        return plan_and_build_chat_memory(
            system_content="THE RULES",
            question=question,
            chat_turns=[
                {"id": "1", "role": "user", "text": HOLLOW_KNIGHT_QUESTION},
                {"id": "2", "role": "assistant", "text": HOLLOW_KNIGHT_ANSWER},
                {"id": "3", "role": "user", "text": question},
            ],
            ask_mode="speed",
            think_effort="off",
            room_tokens=16384,
        )[1]

    def test_a_stand_alone_question_is_marked(self):
        self.assertTrue(self._memory(HADES_QUESTION).answers_left_out)

    def test_a_follow_up_is_not(self):
        self.assertFalse(self._memory("what about their second phase").answers_left_out)


class WhichQuestionsStandAloneTests(unittest.TestCase):
    def test_questions_that_name_their_own_subject(self):
        for q in (
            HADES_QUESTION,
            "Why do the mantis lords keep hitting me when I slash down at them from above the platform",
            "In Doom Eternal how do I fight the Marauder, he keeps blocking everything",
            "How can I stretch my battery on a long flight?",
            "What TDP should I use for menus and idle?",
            "Why is my Deck running hot?",
            "Recommended TDP for this game?",
        ):
            with self.subTest(q=q):
                self.assertTrue(question_stands_alone(q))

    def test_questions_that_need_the_turns_before_them(self):
        for q in (
            "what about their second phase",
            "and how do I deal with the little ones that come with it",
            "why is it so slow",
            "explain that more simply please",
            "explain this more simply please",
            "can you give me the steps for the second option",
            "ok",
            "",
        ):
            with self.subTest(q=q):
                self.assertFalse(question_stands_alone(q))

    def test_a_question_in_another_language_keeps_the_old_behaviour(self):
        self.assertFalse(question_stands_alone("y que hay de la segunda fase del jefe de esa zona difícil"))


if __name__ == "__main__":
    unittest.main()
