"""Tests for rule-based response verification."""

import unittest

from backend.services.response_verify import (
    _parse_yes_no_verdict,
    drop_branch_menu_copying_the_worked_example,
    verify_ollama_response,
)


class ResponseVerifyTests(unittest.TestCase):
    def test_flags_invented_appid_without_game(self):
        result = verify_ollama_response(
            response_text="Try AppID 1234567 for that title.",
            app_id="",
            app_name="",
        )
        self.assertFalse(result["passed"])
        self.assertTrue(result["warnings"])


    def test_parse_yes_no_verdict(self):
        self.assertFalse(_parse_yes_no_verdict("YES"))
        self.assertTrue(_parse_yes_no_verdict("NO"))
        self.assertIsNone(_parse_yes_no_verdict("maybe"))


class DropBranchMenuCopyingTheWorkedExampleTests(unittest.TestCase):
    """Roadmap: "The follow-up menu keeps offering Half-Life 2 whatever game you asked about"

    and "A follow-up offered a place from a different game" -- one cause, the model copying
    the prompt's own worked example (Half-Life 2, the train station, Ravenholm) instead of
    answering for the real game.
    """

    def _menu(self, question: str, label_a: str, label_b: str) -> dict:
        return {
            "question": question,
            "options": [
                {"id": "a", "label": label_a},
                {"id": "b", "label": label_b},
            ],
        }

    def test_a_menu_carrying_the_examples_words_is_dropped(self):
        menu = self._menu(
            "Where are you at in Portal 2?",
            "Just arrived at the train station",
            "Fighting through Ravenholm",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Portal 2"))

    def test_a_menu_whose_heading_names_the_wrong_game_is_dropped(self):
        menu = self._menu(
            "Where are you at in Half-Life 2?",
            "Early in the boss fight",
            "Right before the final area",
        )
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(menu, "Hades"))

    def test_a_legitimate_menu_passes_unchanged(self):
        menu = self._menu(
            "Where are you at in Hades?",
            "Just started a run from the House of Hades",
            "Fighting through Elysium",
        )
        self.assertEqual(
            drop_branch_menu_copying_the_worked_example(menu, "Hades"), menu
        )

    def test_half_life_2_itself_is_allowed_to_mention_half_life_2(self):
        menu = self._menu(
            "Where are you at in Half-Life 2?",
            "Just left the train station in City 17",
            "Deep into the Highway 17 chapter",
        )
        self.assertEqual(
            drop_branch_menu_copying_the_worked_example(menu, "Half-Life 2"), menu
        )

    def test_no_branches_block_passes_through(self):
        self.assertIsNone(drop_branch_menu_copying_the_worked_example(None, "Hades"))


if __name__ == "__main__":
    unittest.main()
