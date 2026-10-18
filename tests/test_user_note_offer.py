"""Plan 92 lane N2: the word rule that decides when a question is worth offering as a note.

Pure functions only: no AI, no files. Each phrase below is a question a person might type, and
each case is checked by asking what the person meant.
"""

import unittest

from backend.notes.user_note_offer import (
    NOTE_TEXT_LIMIT,
    note_offer_for_note_words,
    note_offer_for_question,
    offer_text_from_question,
)


class OffersWhenTheQuestionStatesSomethingToKeep(unittest.TestCase):
    """Ten phrases that say something about the person or how they play."""

    def assertOffers(self, question, expected):
        self.assertEqual(offer_text_from_question(question), expected, question)

    def test_im_doing_a_run(self):
        self.assertOffers(
            "I'm doing a Steel Soul run, how do I beat the mantis lords", "I'm doing a Steel Soul run."
        )

    def test_the_deck_spelling_without_an_apostrophe_that_says_i_am(self):
        # The send-question script cannot carry an apostrophe, so the Deck check types "I am".
        self.assertOffers(
            "I am doing a Steel Soul run, how do I beat the mantis lords", "I am doing a Steel Soul run."
        )

    def test_curly_apostrophe_and_lower_case(self):
        self.assertOffers("i’m on a no-hit run and need tips for the Soul Master", "I’m on a no-hit run.")

    def test_playing_on_a_setting(self):
        self.assertOffers("I'm playing on hard mode, any tips for the first boss", "I'm playing on hard mode.")

    def test_playing_on_a_device(self):
        self.assertOffers("I'm playing on Steam Deck docked. What settings are good?", "I'm playing on Steam Deck docked.")

    def test_i_prefer(self):
        self.assertOffers("I prefer dodging over blocking, how do I beat Hornet", "I prefer dodging over blocking.")

    def test_i_dont_want(self):
        self.assertOffers("I don't want spoilers, how do I find the next area", "I don't want spoilers.")

    def test_i_dont_like(self):
        self.assertOffers("I don't like grinding. What is the fastest way to get geo?", "I don't like grinding.")

    def test_no_spoilers_past_a_place(self):
        self.assertOffers(
            "no spoilers past the City of Tears, where is the next bench?", "No spoilers past the City of Tears."
        )

    def test_dont_spoil(self):
        self.assertOffers(
            "Please don't spoil the ending, but who is the Radiance?", "Don't spoil the ending."
        )

    def test_a_control_mapped_to_a_button(self):
        self.assertOffers(
            "I have the dash mapped to the right bumper. How do I beat the mantis lords?",
            "I have the dash mapped to the right bumper.",
        )

    def test_the_offered_clause_is_cut_at_the_limit(self):
        long_tail = "word " * 80
        text = offer_text_from_question(f"I prefer {long_tail}")
        self.assertIsNotNone(text)
        self.assertLessEqual(len(text), NOTE_TEXT_LIMIT)
        self.assertTrue(text.startswith("I prefer word"))


class StaysQuietWhenNothingIsWorthKeeping(unittest.TestCase):
    """Ten phrases that must not bring a card: plain questions, or only a passing state."""

    def assertQuiet(self, question):
        self.assertIsNone(offer_text_from_question(question), question)

    def test_a_plain_question(self):
        self.assertQuiet("how do I beat the mantis lords")

    def test_im_stuck(self):
        self.assertQuiet("I'm stuck")

    def test_where_the_person_is_right_now(self):
        self.assertQuiet("I'm at the City of Tears, where next")

    def test_i_do_not_know(self):
        self.assertQuiet("I don't know where to go")

    def test_i_dont_understand(self):
        self.assertQuiet("I don't understand how charm notches work")

    def test_a_question_about_playing_on_hard_mode(self):
        self.assertQuiet("how do I play on hard mode")

    def test_asking_for_a_choice_is_not_stating_one(self):
        self.assertQuiet("Should I prefer the nail or the spells?")

    def test_remember_inside_a_question_is_not_the_command(self):
        self.assertQuiet("do you remember where the bench is")

    def test_unsure_is_not_a_preference(self):
        self.assertQuiet("I am not sure which charm to use")

    def test_a_run_that_is_not_the_persons_own(self):
        self.assertQuiet("how long is a Steel Soul run")

    def test_a_question_that_asks_what_spoilers_are(self):
        self.assertQuiet("is there a no-spoilers mode in this game?")

    def test_an_empty_question(self):
        self.assertQuiet("")
        self.assertQuiet("   ")


class WhichGameTheNoteIsFor(unittest.TestCase):
    def test_a_running_game_gives_its_id_and_name(self):
        offer = note_offer_for_question(
            "I'm doing a Steel Soul run", app_id="367520", app_name="Hollow Knight", resolved_title=""
        )
        self.assertEqual(
            offer, {"text": "I'm doing a Steel Soul run.", "app_id": "367520", "game_title": "Hollow Knight"}
        )

    def test_with_nothing_running_the_title_the_ask_worked_out(self):
        offer = note_offer_for_question(
            "I'm doing a Steel Soul run", app_id="", app_name="", resolved_title="Hollow Knight"
        )
        self.assertEqual(offer, {"text": "I'm doing a Steel Soul run.", "app_id": "", "game_title": "Hollow Knight"})

    def test_a_running_game_wins_over_a_title_the_question_names(self):
        offer = note_offer_for_question(
            "I'm doing a Steel Soul run", app_id="1145360", app_name="Hades", resolved_title="Hollow Knight"
        )
        self.assertEqual(offer["game_title"], "Hades")
        self.assertEqual(offer["app_id"], "1145360")

    def test_a_game_with_only_a_name_keeps_the_name(self):
        offer = note_offer_for_question("I prefer dodging", app_id="", app_name="Some Emulated Game", resolved_title="")
        self.assertEqual(offer["app_id"], "")
        self.assertEqual(offer["game_title"], "Some Emulated Game")

    def test_no_game_at_all_means_every_game(self):
        offer = note_offer_for_question("I prefer dodging", app_id="", app_name="", resolved_title="")
        self.assertEqual(offer, {"text": "I prefer dodging.", "app_id": "", "game_title": ""})

    def test_an_id_that_is_not_digits_is_left_out(self):
        offer = note_offer_for_question("I prefer dodging", app_id="abc", app_name="X", resolved_title="")
        self.assertEqual(offer["app_id"], "")

    def test_a_quiet_question_gives_no_offer(self):
        self.assertIsNone(
            note_offer_for_question("how do I beat the mantis lords", app_id="1", app_name="X", resolved_title="")
        )


class TheWordsAfterRemember(unittest.TestCase):
    def test_the_words_become_the_note_with_a_capital_and_a_full_stop(self):
        offer = note_offer_for_note_words(
            "no spoilers past the City of Tears", app_id="", app_name="", resolved_title="Hollow Knight"
        )
        self.assertEqual(
            offer, {"text": "No spoilers past the City of Tears.", "app_id": "", "game_title": "Hollow Knight"}
        )

    def test_a_lone_i_becomes_a_capital_i(self):
        offer = note_offer_for_note_words("i like the dash on R1", app_id="", app_name="", resolved_title="")
        self.assertEqual(offer["text"], "I like the dash on R1.")

    def test_nothing_after_remember_is_no_offer(self):
        self.assertIsNone(note_offer_for_note_words("", app_id="", app_name="", resolved_title=""))
        self.assertIsNone(note_offer_for_note_words("  ?! ", app_id="", app_name="", resolved_title=""))

    def test_a_long_note_is_cut_at_the_limit(self):
        offer = note_offer_for_note_words("x" * 500, app_id="", app_name="", resolved_title="")
        self.assertEqual(len(offer["text"]), NOTE_TEXT_LIMIT)


if __name__ == "__main__":
    unittest.main()
