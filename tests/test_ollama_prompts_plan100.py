"""Plan 100, lane P: the picture rules say a running game is the game in the picture.

What a person sees: with a game running and a screenshot attached, the AI used to sometimes name a
different game for the picture (4 of 9 God of War asks on 2026-10-24). The picture rules told it to
name a game only with two clues, and said nothing of the game already running and named to it. One
sentence now says the picture is from that game.

These tests build the real system prompt with ``build_system_prompt`` (the same call the Ask path
makes) and read the words the model would receive.
"""

import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.prompts.ollama_prompts import build_system_prompt  # noqa: E402

# The exact sentence; the tests below pin that it is one sentence that names the two things it asks.
GAME_IN_PICTURE_SENTENCE = (
    "The running game named above is the game in the picture: describe where in it the player is, "
    "and never name a different game."
)
TWO_CUES_RULE = "Require at least two distinct game-specific cues before naming a title."
PICTURE = "iVBORw0KGgo="  # any non-empty value counts as an attached picture


def _prompt(*, mode="strategy", picture=True, app_name="Hollow Knight", app_id="367520", question="where am i"):
    return build_system_prompt(
        question=question,
        app_id=app_id,
        app_name=app_name,
        normalized_attachments=[],
        prepared_images=[PICTURE] if picture else [],
        lookup_app_name=lambda _a: "",
        lookup_screenshot_vdf_metadata=lambda _p: {},
        ask_mode=mode,
    )


class WhenTheRunningGameIsTheGameInThePicture(unittest.TestCase):
    def test_a_picture_with_a_named_running_game_says_the_picture_is_from_that_game(self):
        for mode in ("speed", "strategy", "expert"):
            with self.subTest(mode=mode):
                p = _prompt(mode=mode)
                self.assertIn("The currently running game is: Hollow Knight (AppID: 367520).", p)
                self.assertIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_the_sentence_comes_with_the_picture_rules_and_after_the_two_clues_rule(self):
        p = _prompt()
        self.assertEqual(p.count(GAME_IN_PICTURE_SENTENCE), 1)
        self.assertLess(p.index(TWO_CUES_RULE), p.index(GAME_IN_PICTURE_SENTENCE))

    def test_no_picture_means_no_sentence(self):
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, _prompt(picture=False))

    def test_a_picture_with_no_game_running_means_no_sentence(self):
        p = _prompt(app_name="", app_id="")
        self.assertIn("No game is currently running.", p)
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_a_running_game_whose_name_is_unknown_means_no_sentence(self):
        p = _prompt(app_name="", app_id="367520")
        self.assertIn("(name unknown)", p)
        self.assertNotIn(GAME_IN_PICTURE_SENTENCE, p)

    def test_the_old_picture_rules_are_all_still_there(self):
        p = _prompt()
        self.assertIn(TWO_CUES_RULE, p)
        self.assertIn("Never claim that a numeric AppID value is the game title.", p)


if __name__ == "__main__":
    unittest.main()
