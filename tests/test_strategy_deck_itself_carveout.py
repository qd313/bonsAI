"""A Strategy first turn about the Steam Deck itself must not get a game's choice menu.

Roadmap: "A Strategy answer about the Deck overlay ended with the previous question's
Hollow Knight choices" (one-star, tag reply, seen 2026-09-27, cause found in plan 76).
The Strategy first-turn prompt makes a choice menu mandatory; with no game running the
model took the game from the chat's earlier question. The fix is a carve-out for
questions about the Deck itself, like the one for model-policy questions.
"""

import unittest

from backend.services.ask_topic_instructions import (
    DECK_ITSELF_NO_GAME_MENU_LINE,
    _user_asks_about_deck_itself,
)
from backend.services.ollama_prompts import build_system_prompt

# The exact old wording every Strategy first turn carries. It must survive untouched.
_MANDATORY_MENU_TEXT = (
    "Lead with the note's tactics in plain text first — skip the orientation — then you MUST end the reply "
    "with exactly one fenced block so the UI can show choices. "
    "Do not trail off into unrelated topics before the fence; the branch picker is mandatory on this turn.\n"
)


def _prompt(question: str, app_name: str = "", ask_mode: str = "strategy") -> str:
    return build_system_prompt(
        question,
        "",
        app_name,
        [],
        [],
        lambda _app_id: "",
        lambda _path: {},
        ask_mode=ask_mode,
    )


class DeckItselfDetectorTests(unittest.TestCase):
    def test_deck_itself_questions_match(self):
        for q in (
            "How do I turn on the performance overlay?",
            "What is the Steam overlay button for?",
            "How do I open Quick Access on my Steam Deck?",
            "How do I switch SteamOS to desktop mode?",
            "What does bonsAI do?",
            "How do I use the QAM to change brightness?",
        ):
            with self.subTest(q=q):
                self.assertTrue(_user_asks_about_deck_itself(q))

    def test_game_questions_do_not_match(self):
        for q in (
            "How do I beat the False Knight?",
            "Where do I find the Mantis Claw in Hollow Knight?",
            "I'm stuck in the City of Tears, what now?",
            "How do I parry Malenia?",
            "Best deck for the Silent in Slay the Spire?",
            "How do I beat Malenia in Elden Ring on my Steam Deck?",
            "",
        ):
            with self.subTest(q=q):
                self.assertFalse(_user_asks_about_deck_itself(q))


class StrategyDeckItselfPromptTests(unittest.TestCase):
    def test_deck_question_with_no_game_carries_the_carveout(self):
        text = _prompt("How do I open the performance overlay?")
        self.assertIn(DECK_ITSELF_NO_GAME_MENU_LINE, text)
        self.assertIn("never take a game", DECK_ITSELF_NO_GAME_MENU_LINE)
        self.assertIn("do NOT output", DECK_ITSELF_NO_GAME_MENU_LINE)
        # The carve-out comes after the mandatory wording, so it is the last word.
        self.assertGreater(text.index(DECK_ITSELF_NO_GAME_MENU_LINE), text.index("mandatory on this turn"))

    def test_plain_game_question_is_unchanged(self):
        text = _prompt("How do I beat the False Knight?", app_name="Hollow Knight")
        self.assertIn(_MANDATORY_MENU_TEXT, text)
        self.assertIn('{"question":"Where are you at in <THIS GAME>?","options":[', text)
        self.assertNotIn("DECK ITSELF", text)
        self.assertNotIn(DECK_ITSELF_NO_GAME_MENU_LINE, text)

    def test_game_question_with_no_game_running_is_unchanged(self):
        text = _prompt("Where do I find the Mantis Claw in Hollow Knight?")
        self.assertIn(_MANDATORY_MENU_TEXT, text)
        self.assertNotIn("DECK ITSELF", text)

    def test_deck_question_with_a_game_running_is_unchanged(self):
        text = _prompt("How do I open the performance overlay?", app_name="Hollow Knight")
        self.assertIn(_MANDATORY_MENU_TEXT, text)
        self.assertNotIn("DECK ITSELF", text)

    def test_followup_turn_gets_no_carveout(self):
        text = _prompt("[Strategy follow-up] I'm at: the overlay.")
        self.assertNotIn("DECK ITSELF", text)

    def test_other_ask_modes_get_no_carveout(self):
        self.assertNotIn("DECK ITSELF", _prompt("How do I open the overlay?", ask_mode="speed"))
        self.assertNotIn("DECK ITSELF", _prompt("How do I open the overlay?", ask_mode="expert"))

    def test_power_question_keeps_its_own_menu_rules(self):
        text = _prompt("How do I improve Steam Deck battery life?")
        self.assertNotIn("DECK ITSELF", text)
        self.assertIn(_MANDATORY_MENU_TEXT, text)


if __name__ == "__main__":
    unittest.main()
