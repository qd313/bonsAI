"""A bare question asked while another game runs is not handed the last game's answers (plan 78, round 3).

Seen on the Deck: with Deep Rock Galactic: Survivor running, three questions that named Hollow
Knight were asked, then "how do I dodge enemy projectiles in this game". The answer got Deep Rock's
notes (right) but carried Hollow Knight wording ("soul orbs") from the earlier answers, because the
new question names no game and only a NAMED game counted as the new turn's game. The new turn's
game is now the game its question names, else the game running for it, read from its own saved
app name, and a previous turn is read the same way. A saved turn keeps the running game's name even
when the spoiler exception set that game aside inside the ask, so a turn that named Hollow Knight
with Deep Rock running is about Hollow Knight.
"""

import unittest

from test_chat_memory_borrowed_wording import _Log, _library_title as _base_title

from backend.services.chat_memory_service import (
    MEMORY_HEADER,
    MEMORY_QUESTIONS_ONLY_HEADER,
    apply_chat_memory_to_prompt,
)

DRG = "Deep Rock Galactic: Survivor"
HK_QUESTIONS = (
    "In Hollow Knight how do I beat the Soul Master",
    "In Hollow Knight where do I find more soul",
    "In Hollow Knight what do the soul orbs do",
)
HK_ANSWERS = (
    "Dodge the first dive, then strike twice. The Soul Master teleports after each volley.",
    "Soul comes from striking enemies, and the shaman upgrades make each pickup larger.",
    "Soul orbs drift towards you and refill your focus when you pick them up.",
)
DRG_QUESTIONS = (
    "How do I beat the Glyphid Dreadnought",
    "Where do I find more nitra",
    "What do the upgrade cards do",
)
DRG_ANSWERS = (
    "Circle the Dreadnought and shoot the weak spot on its back.",
    "Nitra drops from the grey rocks, so mine those between waves.",
    "Upgrade cards add a permanent boost for the rest of the run.",
)
BARE = "how do I dodge enemy projectiles in this game"


def _library_title(text: str) -> str:
    if "deep rock" in text.lower():
        return DRG
    return _base_title(text)


def _chat(questions, answers, app_name, live_question, live_app_name):
    turns = []
    for i, (q, a) in enumerate(zip(questions, answers)):
        turns.append({"id": f"u{i}", "role": "user", "text": q, "app_name": app_name})
        turns.append({"id": f"a{i}", "role": "assistant", "text": a, "app_name": app_name})
    turns.append({"id": "live", "role": "user", "text": live_question, "app_name": live_app_name})
    return turns


def _prompt(turns, question):
    return apply_chat_memory_to_prompt(
        system_content="THE RULES",
        question=question,
        chat_turns=turns,
        ask_mode="speed",
        think_effort="off",
        room_tokens=16384,
        attached_chars=0,
        logger=_Log(),
        library_title=_library_title,
    )


class TheDeckCaseTests(unittest.TestCase):
    def test_bare_question_with_another_game_running_drops_the_answers_and_keeps_the_questions(self):
        prompt = _prompt(_chat(HK_QUESTIONS, HK_ANSWERS, DRG, BARE, DRG), BARE)
        self.assertNotIn("soul orbs drift", prompt.lower())
        self.assertNotIn("Soul Master teleports", prompt)
        for q in HK_QUESTIONS:
            self.assertIn(q, prompt)
        self.assertIn(MEMORY_QUESTIONS_ONLY_HEADER, prompt)
        self.assertNotIn(MEMORY_HEADER, prompt)

    def test_a_turn_saved_with_no_app_name_that_named_the_game_is_read_the_same_way(self):
        prompt = _prompt(_chat(HK_QUESTIONS, HK_ANSWERS, "", BARE, DRG), BARE)
        self.assertNotIn("Soul orbs drift", prompt)
        self.assertIn(MEMORY_QUESTIONS_ONLY_HEADER, prompt)


class WhatMustStillBeKeptTests(unittest.TestCase):
    def test_the_same_bare_question_after_turns_about_the_running_game_keeps_the_answers(self):
        prompt = _prompt(_chat(DRG_QUESTIONS, DRG_ANSWERS, DRG, BARE, DRG), BARE)
        self.assertIn("Upgrade cards add a permanent boost", prompt)
        self.assertIn(MEMORY_HEADER, prompt)
        self.assertNotIn(MEMORY_QUESTIONS_ONLY_HEADER, prompt)

    def test_what_else_can_i_try_with_the_same_game_running_keeps_the_answers(self):
        q = "what else can I try"
        prompt = _prompt(_chat(DRG_QUESTIONS, DRG_ANSWERS, DRG, q, DRG), q)
        self.assertIn("Circle the Dreadnought", prompt)
        self.assertIn(MEMORY_HEADER, prompt)

    def test_what_else_can_i_try_with_nothing_running_after_a_named_game_keeps_the_answers(self):
        q = "what else can I try"
        prompt = _prompt(_chat(HK_QUESTIONS, HK_ANSWERS, "", q, ""), q)
        self.assertIn("Soul orbs drift towards you", prompt)
        self.assertIn(MEMORY_HEADER, prompt)

    def test_a_bare_question_when_the_previous_turn_ran_no_game_keeps_the_answers(self):
        turns = _chat(("any tips for the second boss",), ("Watch the pattern.",), "", BARE, DRG)
        self.assertIn("Watch the pattern.", _prompt(turns, BARE))

    def test_a_bare_question_that_names_the_running_game_after_a_turn_naming_it_keeps_them(self):
        turns = _chat(HK_QUESTIONS, HK_ANSWERS, "Hollow Knight", BARE, "Hollow Knight")
        self.assertIn("Soul orbs drift towards you", _prompt(turns, BARE))


if __name__ == "__main__":
    unittest.main()
