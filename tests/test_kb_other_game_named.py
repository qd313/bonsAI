"""Title: A question that names a game the library does not know

Purpose: Pin the small detector that tells a question naming some other, well-known game apart
from a bare follow-up that names no game at all. Used for: kb_other_game_named.py, which
game_ai_request.py asks before it falls back on the chat's own game. Solves: a Valheim question in
a Half-Life 2 chat got Half-Life 2's notes, because Valheim is not in the library so nothing
resolved it and the question looked like it named nothing. Does not: read the library or the
network -- the detector is a fixed list of well-known titles.
"""

import unittest

from backend.services.kb_other_game_named import other_game_besides, other_game_named_in


class OtherGameNamedTests(unittest.TestCase):
    def test_the_deck_question_names_valheim(self):
        q = "what are three good habits for surviving the early nights in Valheim"
        self.assertEqual(other_game_named_in(q), "valheim")

    def test_case_and_punctuation_do_not_matter(self):
        self.assertEqual(other_game_named_in("Is Baldur's Gate 3 worth it?"), "baldur s gate 3")
        self.assertEqual(other_game_named_in("ELDEN RING, any tips!"), "elden ring")

    def test_a_longer_title_wins_over_a_shorter_one(self):
        self.assertEqual(other_game_named_in("dark souls 3 pyromancy"), "dark souls 3")

    def test_a_bare_followup_names_nothing(self):
        self.assertEqual(other_game_named_in("what about the fourth one, and how do I get there"), "")
        self.assertEqual(other_game_named_in("my game stutters on the Deck"), "")
        self.assertEqual(other_game_named_in(""), "")

    def test_a_title_inside_a_longer_word_does_not_match(self):
        self.assertEqual(other_game_named_in("my minecrafty friend"), "")

    def test_ordinary_words_are_not_game_names(self):
        for q in ("how do I fix rust on my controller", "control the camera", "the ark of the covenant"):
            self.assertEqual(other_game_named_in(q), "", q)


class OtherGameBesidesTests(unittest.TestCase):
    def test_a_different_game_than_the_chats_own_counts(self):
        self.assertEqual(other_game_besides("tips for Valheim nights", "Half-Life 2"), "valheim")

    def test_the_chats_own_game_however_it_is_spelled_does_not_count(self):
        self.assertEqual(other_game_besides("how do I beat Eikthyr in Valheim", "Valheim"), "")
        self.assertEqual(other_game_besides("dark souls pyromancy", "Dark Souls 3"), "")

    def test_no_named_game_or_no_chat_game_means_nothing_to_skip(self):
        self.assertEqual(other_game_besides("what about after that", "Half-Life 2"), "")
        self.assertEqual(other_game_besides("tips for Valheim nights", ""), "")


class OrdinaryWordsAreNotOtherGamesTests(unittest.TestCase):
    """A sentence a player could type about the chat's own (library) game must never read as
    naming another game: a false match drops the library game's own notes."""

    SENTENCES = (
        "is this build satisfactory",
        "how do I make sure I don't starve on the first night",
        "how do I make sure I dont starve on the first night",
        "how do I fight like a dragon",
        "the timer says 7 days to die",
        "how do I counter strike back after a parry",
        "what is the overwatch range of this unit",
        "the borderlands of the map are empty",
        "he is a yakuza style boss",
        "I sat on a hearthstone by the fire",
        "an earthbound creature",
        "that was a blasphemous joke",
        "what are the breath of the wild animals here",
        "these are tears of the kingdom",
        "a long path of exile for the character",
        "the god of war shows up in the story",
        "beyond the call of duty",
        "the lost ark of the story",
        "the sims in this town",
        "the dragon age of the region",
        "a dragon quest for the hero",
        "an animal crossing sign",
        "the outer wilds of the map",
        "an age of empires in history",
        "the crusader kings of old",
        "hearts of iron and steel",
        "a farming simulator like this",
        "oxygen not included in the tank",
        "a lethal company of men",
        "the green hell of the jungle",
        "a silent hill town",
        "if you fall guys will grab you",
        "the cities skylines look great",
        "on battlefield 4 of the map",
        "the hunt showdown at dusk",
    )

    def test_each_sentence_names_no_other_game_in_a_library_games_chat(self):
        for sentence in self.SENTENCES:
            with self.subTest(sentence=sentence):
                self.assertEqual(other_game_named_in(sentence), "")
                self.assertEqual(other_game_besides(sentence, "Palworld"), "")


if __name__ == "__main__":
    unittest.main()
