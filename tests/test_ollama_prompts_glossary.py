"""Tests for the tap-to-define glossary clause in the AI's instructions (replaces the old
single-title tests: the words now come from the knowledge library, handed in by the caller)."""

import unittest

from backend.prompts.ollama_prompts import build_system_prompt

DRG_TITLE = "Deep Rock Galactic: Survivor"
DRG_WORDS = ["kiting", "overclock"]

# The paragraph the AI has always been given for Deep Rock Galactic: Survivor, word for word.
DRG_CLAUSE = (
    chr(10)
    + "GLOSSARY (Deep Rock Galactic: Survivor): kiting / overclock are tap-to-define in this UI -- "
    "the player can select one of these words to see its definition. Use them naturally "
    "where they fit rather than stopping to define them inline; only spell one out in "
    "prose if the player directly asks what it means."
    + chr(10)
)


def _prompt(question: str, app_id: str, app_name: str, **kwargs) -> str:
    return build_system_prompt(
        question, app_id, app_name, [], [], lambda _app_id: "", lambda _path: {}, **kwargs
    )


class GlossaryPromptTests(unittest.TestCase):
    def test_glossary_clause_names_the_game_and_its_words(self):
        text = _prompt(
            "how do I deal with the praetorian",
            "2321470",
            DRG_TITLE,
            glossary_game_title=DRG_TITLE,
            glossary_terms=DRG_WORDS,
        )
        self.assertIn("GLOSSARY (Deep Rock Galactic: Survivor)", text)
        self.assertIn("kiting", text)
        self.assertIn("overclock", text)
        self.assertIn(DRG_CLAUSE, text)

    def test_glossary_clause_present_in_strategy_mode_too(self):
        text = _prompt(
            "how do I deal with the praetorian",
            "2321470",
            DRG_TITLE,
            ask_mode="strategy",
            glossary_game_title=DRG_TITLE,
            glossary_terms=DRG_WORDS,
        )
        self.assertIn("GLOSSARY (Deep Rock Galactic: Survivor)", text)

    def test_no_glossary_clause_without_words(self):
        for app_id, name in (("2321470", DRG_TITLE), ("570", "Dota 2"), ("", "")):
            with self.subTest(app_id=app_id):
                text = _prompt("what is kiting", app_id, name)
                self.assertNotIn("GLOSSARY (", text)
                strategy = _prompt("what is kiting", app_id, name, ask_mode="strategy")
                self.assertNotIn("GLOSSARY (", strategy)

    def test_another_games_words_name_that_game(self):
        text = _prompt(
            "how do I win", "570", "Dota 2", glossary_game_title="Dota 2", glossary_terms=["gank"]
        )
        self.assertIn("GLOSSARY (Dota 2): gank are tap-to-define", text)
        self.assertNotIn("Deep Rock", text)


if __name__ == "__main__":
    unittest.main()
