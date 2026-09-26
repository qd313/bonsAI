"""Title: The "where do I start" rescue reaches a game's own starting_out note

Purpose: D65 gave "starting out" cards their own kind. A player who types "where do I
start" or "how do I get started" never says the note's own name ("Starting out in Black
Mesa"), so the same generic-word rescue every other kind already has ("the boss", "this
level") has to know the word "start" means this kind too.
Used for: knowledge_base_search.py's `_TYPE_WORDS` / `_section_types_named`.
Solves: A new kind is invisible to this rescue until its own words are added -- this is a
regression test for that one dict entry, kept in its own file since knowledge_base_search.py
is a shared file another lane is also changing.
"""

import unittest

from backend.services.knowledge_base_search import _section_types_named


class StartingOutRescuePhraseListTests(unittest.TestCase):
    def test_where_do_i_start_names_the_starting_out_kind(self):
        self.assertIn("starting_out", _section_types_named("where do I start"))

    def test_how_do_i_get_started_names_the_starting_out_kind(self):
        self.assertIn("starting_out", _section_types_named("how do I get started in this game"))

    def test_new_to_this_where_do_i_begin_names_the_starting_out_kind(self):
        self.assertIn("starting_out", _section_types_named("I'm new to this, where do I begin"))

    def test_an_unrelated_question_does_not_name_it(self):
        self.assertNotIn("starting_out", _section_types_named("how do I beat the final boss"))
