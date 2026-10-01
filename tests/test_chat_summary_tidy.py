"""Unit tests for chat_summary_tidy: the guard that makes the saved chat summary read like a note a
person would write (plan 78 helper H; roadmap 'The chat summary reads oddly in places').

The model replies used here are the shapes the Deck's own model really wrote on the PC test runs
(a Game line naming a topic, empty-answer lines in its own log-speak, one Game line per question),
on hand-written chats whose text is in tests/fixtures/chat_summary_wording_chats.json.
"""

import json
import os
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.chat_summary_tidy import (
    known_games_of_chat,
    tidy_summary_text,
)

FIXTURE = os.path.join(
    os.path.dirname(__file__), "fixtures", "chat_summary_wording_chats.json"
)

_LIBRARY = {
    "hades": "Hades",
    "hollow knight": "Hollow Knight",
    "half life 2": "Half-Life 2",
    "pikmin 2": "Pikmin 2",
}


def _library(text: str) -> str:
    """Stands in for the notes library's own title match."""
    low = " ".join(text.lower().replace("-", " ").split())
    for alias, title in _LIBRARY.items():
        if alias in low:
            return title
    return ""


def _chats() -> dict:
    with open(FIXTURE, "r", encoding="utf-8") as f:
        return json.load(f)["chats"]


class KnownGamesTests(unittest.TestCase):
    def test_the_game_the_chat_was_opened_in_comes_first_then_running_games_by_count(self):
        chat = {"origin_app_name": "Hades"}
        turns = [
            {"app_name": "Hollow Knight"},
            {"app_name": "Hollow Knight"},
            {"app_name": "Hades"},
            {"app_name": ""},
            {"app_name": "Pikmin 2"},
        ]
        self.assertEqual(known_games_of_chat(chat, turns), ["Hades", "Hollow Knight", "Pikmin 2"])

    def test_a_chat_with_no_game_known_has_none(self):
        chats = _chats()
        self.assertEqual(
            known_games_of_chat(chats["no_game"], chats["no_game"]["turns"]), []
        )


class EmptyLineTests(unittest.TestCase):
    def test_a_line_whose_answer_is_an_empty_phrase_is_dropped(self):
        for empty in (
            "Stuck on: None.",
            "Player is stuck on: None apparent in this log.",
            "Stuck on: None apparent in this log",
            "Stuck: No specific current sticking point mentioned.",
            "Stuck on: None apparent in this log.",
            "Settings: N/A",
            "Stuck on: Unknown.",
            "Stuck on: No sticking point mentioned.",
            "Stuck on: Nothing mentioned so far.",
            "Where the player is: Unknown at this time.",
            "Stuck on: Not specified.",
            "Stuck on: n/a",
            "Where the player is: Unknown",
            "Help requested:",
        ):
            with self.subTest(empty=empty):
                text = f"Player asked how to beat a boss.\n{empty}\nPlayer wants short answers."
                self.assertEqual(
                    tidy_summary_text(text),
                    "Player asked how to beat a boss.\nPlayer wants short answers.",
                )

    def test_a_whole_sentence_that_says_nothing_is_dropped(self):
        text = (
            "Player asked about day limits.\n"
            "Player is currently not stuck on a specific problem.\n"
            "No other topics discussed.\n"
            "No specific help requested yet."
        )
        self.assertEqual(tidy_summary_text(text), "Player asked about day limits.")

    def test_the_wordier_ways_of_saying_nothing_was_asked_are_dropped(self):
        text = (
            "Player asked about day limits.\n"
            "No specific questions about how to answer were asked.\n"
            "No specific instruction given for answering.\n"
            "No other recent topics discussed.\n"
            "No specific sticking points mentioned in this summary.\n"
            "No new game topics discussed."
        )
        self.assertEqual(tidy_summary_text(text), "Player asked about day limits.")

    def test_a_line_with_a_colon_inside_a_word_is_left_exactly_as_written(self):
        text = "Player asked about bonsai:vac-check command."
        self.assertEqual(tidy_summary_text(text), text)

    def test_a_real_answer_that_merely_starts_with_an_empty_word_is_kept_word_for_word(self):
        """Round 2 (the session owner ran these through the guard): "Stuck on: not sure how to
        beat X" is the most useful line a summary holds. An answer is empty only when the WHOLE
        answer is an empty phrase; what follows the empty word decides, not how it starts."""
        for real in (
            "Player is stuck on: Nothing works against the Soul Master.",
            "Stuck on: Not sure how to beat the Soul Master in the Soul Sanctum.",
            "Stuck on: Unknown how to open the gate after the second boss.",
            "Stuck on: None of the weapons seem to damage the boss.",
            "Problem: Unclear which upgrade to buy first.",
            "Stuck on: Nobody mentions where the third rune is.",
            "Next step: Not yet decided, but the player wants a ranged build.",
            "Stuck on: No idea where the key to the vault is.",
            "Stuck on: none of the dash timings land on the second boss.",
            "Player asked for: no spoilers please.",
            "Stuck on: No weapon works against the boss yet.",
            "Player is not stuck, but wants a ranged build.",
            "Nothing helps: the shader cache keeps rebuilding after every update.",
            "No potion works on the second boss so far.",
        ):
            with self.subTest(real=real):
                self.assertEqual(
                    tidy_summary_text(f"Player asked about bosses.\n{real}", known_games=["Hades"]),
                    f"Game: Hades\nPlayer asked about bosses.\n{real}",
                )

    def test_an_empty_head_is_dropped_and_the_real_tail_is_kept(self):
        self.assertEqual(
            tidy_summary_text("Stuck on: None. The player wants a ranged build."),
            "Stuck on: The player wants a ranged build.",
        )

    def test_a_sentence_after_an_empty_phrase_is_kept_as_its_own_line(self):
        text = "Stuck on: Not specified. Player is asking about the Mantis Lords."
        self.assertEqual(tidy_summary_text(text), "Stuck on: Player is asking about the Mantis Lords.")


class GameLineTests(unittest.TestCase):
    def test_a_game_line_naming_a_topic_is_replaced_by_the_game_the_chat_knows(self):
        text = "Game: Parrying practice\nPlayer asked how to practice parrying."
        out = tidy_summary_text(text, known_games=["Hades"])
        self.assertEqual(out, "Game: Hades\nPlayer asked how to practice parrying.")

    def test_a_chat_with_no_known_game_and_a_made_up_game_gets_no_game_line(self):
        chats = _chats()
        known = known_games_of_chat(chats["no_game"], chats["no_game"]["turns"])
        for line in (
            "Game: Action games.",
            "Game is unspecified.",
            "Game unknown.",
            "Game: Unknown, but involves False Knight and Hornet.",
            "Game: General",
            "Games discussed include Antlion Guard and Megaera.",
        ):
            with self.subTest(line=line):
                out = tidy_summary_text(
                    line + "\nPlayer asked about parrying practice.",
                    known_games=known,
                    library_title=_library,
                )
                self.assertEqual(out, "Player asked about parrying practice.")

    def test_a_game_the_library_knows_is_kept_even_when_the_chat_names_none(self):
        # The Hades-labelled chat the Deck had was a question about another game entirely.
        out = tidy_summary_text(
            "Game is Pikmin 2.\nPlayer asked about day limits.",
            known_games=["Hades"],
            library_title=_library,
        )
        self.assertEqual(out, "Games: Hades, Pikmin 2\nPlayer asked about day limits.")

    def test_a_list_keeps_only_the_names_that_are_games(self):
        out = tidy_summary_text(
            "Games: Hollow Knight, Soul Sanctum, Hades, Survival Games.",
            library_title=_library,
        )
        self.assertEqual(out, "Games: Hollow Knight, Hades")

    def test_a_name_the_model_shortens_or_pads_still_matches_the_chats_own_game(self):
        known = ["Deep Rock Galactic: Survivor"]
        for line in (
            "Game: Deep Rock Galactic Survivor weapon upgrades (general advice).",
            "Game is Deep Rock Galactic.",
        ):
            with self.subTest(line=line):
                out = tidy_summary_text(line, known_games=known)
                self.assertEqual(out, "Game: Deep Rock Galactic: Survivor")

    def test_one_game_line_per_question_becomes_one_game_line_and_keeps_the_topics(self):
        text = (
            "Game: Half-Life 2. Player asked about crashing after Ravenholm load.\n"
            "Game: Hades. Player asked how to beat Megaera.\n"
            "Game: General. Player asked about food and water in a survival game.\n"
            "Game: Half-Life 2. Player asked for a complete walkthrough."
        )
        self.assertEqual(
            tidy_summary_text(text, library_title=_library).splitlines(),
            [
                "Games: Half-Life 2, Hades",
                "Player asked about crashing after Ravenholm load.",
                "Player asked how to beat Megaera.",
                "Player asked about food and water in a survival game.",
                "Player asked for a complete walkthrough.",
            ],
        )

    def test_the_chats_own_game_is_added_when_the_model_wrote_no_game_line(self):
        out = tidy_summary_text(
            "Player asked about stutter.\nPlayer asked about TDP.", known_games=["Deep Rock Galactic"]
        )
        self.assertEqual(out, "Game: Deep Rock Galactic\nPlayer asked about stutter.\nPlayer asked about TDP.")

    def test_a_sentence_that_only_starts_with_the_word_game_is_not_a_game_line(self):
        out = tidy_summary_text("Game crashes after the loading screen.", known_games=["Hades"])
        self.assertEqual(out, "Game: Hades\nGame crashes after the loading screen.")

    def test_at_most_five_games_are_shown(self):
        known = ["A Game One", "B Game Two", "C Game Three", "D Game Four", "E Game Five", "F Game Six"]
        out = tidy_summary_text("Player asked something.", known_games=known)
        self.assertEqual(
            out.splitlines()[0], "Games: A Game One, B Game Two, C Game Three, D Game Four, E Game Five"
        )


class ShapeTests(unittest.TestCase):
    def test_bold_bullets_numbers_and_repeats_are_cleaned_up(self):
        text = (
            "**Game:** Hades\n"
            "- Player asked about the first boss.\n"
            "2. Player asked about the first boss.\n"
            "* **Stuck on:** the dash timing"
        )
        self.assertEqual(
            tidy_summary_text(text, library_title=_library).splitlines(),
            ["Game: Hades", "Player asked about the first boss.", "Stuck on: the dash timing"],
        )

    def test_no_real_line_is_cut_to_reach_a_line_count(self):
        text = "\n".join(f"Player asked question number {i}." for i in range(30))
        out = tidy_summary_text(text, known_games=["Hades"]).splitlines()
        self.assertEqual(out[0], "Game: Hades")
        self.assertEqual(out[1:], [f"Player asked question number {i}." for i in range(30)])

    def test_a_reply_that_is_only_empty_lines_comes_back_empty(self):
        self.assertEqual(tidy_summary_text("Stuck on: None.\nHelp requested:"), "")

    def test_ordinary_lines_are_left_exactly_as_written(self):
        text = (
            "Player is stuck on Hornet in Greenpath because she is too fast.\n"
            "Player asked about FSR: what it does and when to turn it on.\n"
            "Advice given: Dash through the fire orbs, strike after landing."
        )
        self.assertEqual(tidy_summary_text(text), text)

    def test_a_library_that_raises_costs_nothing(self):
        def broken(_text: str) -> str:
            raise RuntimeError("corpus unreadable")

        out = tidy_summary_text("Game: Hades\nPlayer asked about Megaera.", library_title=broken)
        self.assertEqual(out, "Player asked about Megaera.")


if __name__ == "__main__":
    unittest.main()
