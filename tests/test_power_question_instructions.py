"""A power or battery question must be told to answer with numbers a person can set.

Plan 72 and plan 78 saw that only 5 of 18 test answers to power questions held a number (a TDP in
watts, a frame cap, a refresh rate). The model got the hardware appendix and nothing that asked for
values, so it listed general tips. These tests read the instructions the model is actually given
(build_system_prompt), the nearest step to the answer on screen that runs without the model.
The before-and-after run with the real model is in the plan 79 log.
"""

import unittest

from backend.services.ask_topic_instructions import _user_asks_sweet_spot_tuning
from backend.services.ollama_prompts import build_system_prompt

# The line the model is told to copy the shape of: a short "name: value unit" line.
NUMBER_ASK_MARKERS = ("TDP limit: 6 W", "Framerate limit: 40 FPS", "from 3 to 15", "Refresh rate")

POWER_QUESTIONS = [
    ("How do I get more battery life in this game?", "Hollow Knight"),
    ("What TDP should I use?", ""),
    ("What TDP should I use for this game?", "Hades"),
    ("How can I make my battery last longer when I play?", ""),
    ("Best power settings for a long play session on the Deck?", "ELDEN RING"),
    ("My battery drains too fast, what can I change?", ""),
    ("How do I save power while playing?", "Stardew Valley"),
    ("What frame rate cap should I use to save battery?", ""),
    ("Recommend settings that balance performance and battery life.", "Hades"),
    ("How can I reduce power draw and heat on my Steam Deck?", ""),
    ("What's the efficiency sweet spot for this game?", "Hades"),
]

# Questions that must not get the number-asking line: gameplay, controls, general, and the
# power-adjacent jobs that have their own instructions.
OTHER_QUESTIONS = [
    ("How do I beat the Mantis Lords?", "Hollow Knight"),
    ("What is a good early charm combination?", "Hollow Knight"),
    ("How do I use the parry in Hades?", "Hades"),
    ("What settings should I use for Hades?", "Hades"),
    ("How do I take a screenshot on the Steam Deck?", ""),
    ("Which kind of games are good for short play sessions?", ""),
    ("How do I change the controller layout?", "ELDEN RING"),
    ("What's my TDP right now?", ""),
    ("Why is Ollama slow on my Deck?", ""),
    ("How do I fix stuttering in this game?", "Hades"),
    ("What is the most efficient way to farm gold?", "Stardew Valley"),
    ("Where do I find the battery in Half-Life 2?", "Half-Life 2"),
    ("How do I charge the battery in this zelda puzzle?", "The Legend of Zelda"),
    ("How does mana drain work in Hollow Knight?", "Hollow Knight"),
    ("What drains my health in Hades?", "Hades"),
    ("Where is the power plant in Fallout 4?", "Fallout 4"),
    ("How much power does the reactor need in Subnautica?", "Subnautica"),
    ("How do I recharge the power cell battery in Subnautica?", "Subnautica"),
]


def _prompt(question: str, game: str, mode: str) -> str:
    return build_system_prompt(
        question=question,
        app_id="123" if game else "",
        app_name=game,
        normalized_attachments=[],
        prepared_images=[],
        lookup_app_name=lambda _a: "",
        lookup_screenshot_vdf_metadata=lambda _p: {},
        ask_mode=mode,
    )


class PowerQuestionAsksForNumbersTests(unittest.TestCase):
    def test_every_power_question_is_told_to_give_exact_values(self):
        for mode in ("speed", "expert"):
            for question, game in POWER_QUESTIONS:
                with self.subTest(mode=mode, question=question):
                    prompt = _prompt(question, game, mode)
                    for marker in NUMBER_ASK_MARKERS:
                        self.assertIn(marker, prompt)

    def test_the_line_names_the_real_menu_and_the_deck_limit(self):
        prompt = _prompt("How do I get more battery life in this game?", "Hollow Knight", "speed")
        self.assertIn("Quick Access", prompt)
        self.assertIn("do not invent others", prompt)
        # The number the model is shown as an example must itself be inside the Deck's range.
        self.assertIn("a whole number from 3 to 15", prompt)

    def test_other_questions_do_not_get_the_line(self):
        for mode in ("speed", "expert"):
            for question, game in OTHER_QUESTIONS:
                with self.subTest(mode=mode, question=question):
                    prompt = _prompt(question, game, mode)
                    self.assertNotIn("The user wants numbers they can set", prompt)
                    self.assertNotIn("TDP limit: 6 W", prompt)

    def test_strategy_first_turn_keeps_its_branch_menu_and_gets_the_line(self):
        prompt = _prompt("How do I get more battery life in this game?", "Hollow Knight", "strategy")
        self.assertIn("The user wants numbers they can set", prompt)
        self.assertIn("bonsai-strategy-branches", prompt)

    def test_predicate_matches_power_asks_only(self):
        for question, _game in POWER_QUESTIONS:
            self.assertTrue(_user_asks_sweet_spot_tuning(question), question)
        for question, _game in OTHER_QUESTIONS:
            self.assertFalse(_user_asks_sweet_spot_tuning(question), question)


if __name__ == "__main__":
    unittest.main()
