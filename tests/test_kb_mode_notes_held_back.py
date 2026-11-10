"""Title: A game-mode note does not take the first place from the ordinary note the question names

Purpose: Pin what a player sees on a Left 4 Dead 2 question that never says "versus": "how to beat
tank" attaches the game's own Tank note first, not the note about surviving the Tank in versus. A
question that does say it (versus, vs, survival, realism, "playing as", "infected team") still gets
its versus note first, a game with no such notes is untouched, and when nothing else fits a mode note
still attaches.
Used for: `_lead_with_the_note_the_question_names` and `_question_names_a_mode` in
knowledge_base_search.py, called at the end of `_fuse_cards_by_rrf` in knowledge_base_service.py.
Solves: plan 103, lane V3 (test question A-L4D2-01, "how to beat tank", Strategy).
Does not: Cover the word search or the notes' own words (tests/test_kb_versus_notes_search.py does).
"""

import sqlite3
import tempfile
import unittest
from unittest import mock

from backend.knowledge.knowledge_base_search import _question_names_a_mode
from backend.knowledge.knowledge_base_service import (
    KnowledgeCard,
    _fuse_cards_by_rrf,
    close_connection,
    resolve_corpus_db_path,
    retrieve_knowledge_context,
)
from kb_real_library_support import HEADER_RE, LEFT_4_DEAD_2, build_real_library

_SERVICE = "backend.knowledge.knowledge_base_service"


def _card(section_id: int, kind: str, name: str) -> KnowledgeCard:
    return KnowledgeCard(
        section_id, 3, "Left 4 Dead 2", kind, name, f"card {name}", "", "", None, None, "fallback_no_source"
    )


# The shape that was measured: the survivors' versus note leads the word list and the meaning list,
# the game's own boss note is right behind it on both.
SURVIVING = _card(1, "versus", "Surviving the Tank")
PLAYING_AS = _card(2, "versus", "Playing as the Tank")
TANK = _card(3, "boss", "Tank")
BOOMER = _card(4, "enemy", "Boomer")
QUERY_VECTOR = [1.0, 0.0]
VECTORS = {1: [1.0, 0.0], 2: [0.95, 0.31], 3: [0.9, 0.43], 4: [0.5, 0.86]}


def _fuse(question: str, cards=None, top_k: int = 3) -> list[str]:
    pool = cards if cards is not None else [SURVIVING, PLAYING_AS, TANK, BOOMER]
    return [c.name for c in _fuse_cards_by_rrf(pool, QUERY_VECTOR, VECTORS, top_k=top_k, question=question)]


class HeldBackTests(unittest.TestCase):
    def test_without_the_question_the_versus_note_leads_as_it_always_did(self):
        # The control: nothing changes for a caller that does not hand the question over.
        self.assertEqual(_fuse("")[0], "Surviving the Tank")

    def test_a_plain_tank_question_puts_the_game_s_own_note_first(self):
        self.assertEqual(_fuse("how to beat tank"), ["Tank", "Surviving the Tank", "Playing as the Tank"])

    def test_the_note_that_attaches_are_the_same_ones_just_in_another_order(self):
        self.assertEqual(sorted(_fuse("how to beat tank")), sorted(_fuse("")))

    def test_a_plural_in_the_question_or_the_title_still_matches(self):
        self.assertEqual(_fuse("how to beat tanks")[0], "Tank")
        hunters = [_card(1, "versus", "Surviving Hunters and Jockeys"), _card(2, "enemy", "Hunter")]
        vectors = {1: [1.0, 0.0], 2: [0.9, 0.43]}
        fused = _fuse_cards_by_rrf(hunters, QUERY_VECTOR, vectors, top_k=3, question="how to stop a hunter")
        self.assertEqual(fused[0].name, "Hunter")

    def test_a_question_that_says_versus_still_gets_its_versus_note_first(self):
        self.assertEqual(_fuse("how to beat the tank in versus")[0], "Surviving the Tank")

    def test_each_word_that_names_the_mode_or_the_side_lets_the_versus_note_lead(self):
        for question in (
            "tank vs save it",
            "tank survival tips",
            "tank in realism",
            "playing as the tank",
            "how to beat tank as the infected",
            "infected team and the tank",
        ):
            with self.subTest(question=question):
                self.assertEqual(_fuse(question)[0], "Surviving the Tank")

    def test_a_note_the_question_does_not_name_by_its_title_does_not_take_the_lead(self):
        self.assertEqual(_fuse("how do i survive")[0], "Surviving the Tank")

    def test_the_note_the_question_names_comes_in_from_further_down_and_the_last_one_makes_room(self):
        # The same question with the game's name typed after it ranks "Tank" fourth. It still leads.
        names = [_card(1, "versus", "Surviving the Tank"), PLAYING_AS, BOOMER, TANK]
        vectors = {1: [1.0, 0.0], 2: [0.97, 0.24], 4: [0.5, 0.86], 3: [0.95, 0.31]}
        fused = _fuse_cards_by_rrf(names, QUERY_VECTOR, vectors, top_k=3, question="how to beat tank")
        self.assertEqual([c.name for c in fused], ["Tank", "Surviving the Tank", "Playing as the Tank"])

    def test_an_ordinary_note_the_question_does_not_name_never_takes_the_lead(self):
        self.assertEqual(_fuse("how to beat the boss")[0], "Surviving the Tank")

    def test_a_game_with_no_mode_notes_is_untouched(self):
        plain = [_card(1, "boss", "Surviving the Tank"), PLAYING_AS, TANK, BOOMER]
        plain[1] = _card(2, "mechanic", "Playing as the Tank")
        self.assertEqual(_fuse("how to beat tank", plain), _fuse("", plain))

    def test_when_nothing_else_fits_a_mode_note_still_attaches_and_leads(self):
        only_modes = [SURVIVING, _card(5, "callout", "Dead Center ambush spots")]
        vectors = {1: [1.0, 0.0], 5: [0.9, 0.43]}
        fused = _fuse_cards_by_rrf(only_modes, QUERY_VECTOR, vectors, top_k=3, question="how to beat tank")
        self.assertEqual([c.name for c in fused], ["Surviving the Tank", "Dead Center ambush spots"])

    def test_all_four_kinds_are_held_back_and_nothing_else_is(self):
        for kind, held in (("versus", True), ("callout", True), ("survival", True), ("realism", True),
                           ("mechanic", False), ("boss", False), ("coop", False)):
            with self.subTest(kind=kind):
                leader = _card(1, kind, "Surviving the Tank")
                fused = _fuse_cards_by_rrf(
                    [leader, TANK], QUERY_VECTOR, {1: [1.0, 0.0], 3: [0.9, 0.43]}, top_k=2, question="how to beat tank"
                )
                self.assertEqual(fused[0].name, "Tank" if held else "Surviving the Tank")


class QuestionNamesAModeTests(unittest.TestCase):
    def test_words_and_phrases_that_name_a_mode_or_a_side(self):
        for question in (
            "tips for playing as the hunter in versus",
            "tank vs save it",
            "best survival spot",
            "realism rules",
            "dead center callouts",
            "how do we play as the infected",
            "infected team combos",
        ):
            with self.subTest(question=question):
                self.assertTrue(_question_names_a_mode(question))

    def test_a_plain_question_about_a_character_names_neither(self):
        for question in ("how to beat tank", "hunter pounce spots for full damage", "what does the special infected do", ""):
            with self.subTest(question=question):
                self.assertFalse(_question_names_a_mode(question))


class AskPathTests(unittest.TestCase):
    """The question from the Ask box, through the real library and the blend, with the meaning
    search's numbers made up (the survivors' note is the best meaning match, like on the PC)."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.settings = build_real_library(cls._tmp.name)
        with sqlite3.connect(resolve_corpus_db_path(cls.settings)) as db:
            rows = db.execute("SELECT section_id, name FROM sections WHERE game_id = 3").fetchall()
        # Boomer's note shares words with the question but not its meaning (the PC's numbers: 15th of 24).
        favourites = {
            "Surviving the Tank": [1.0, 0.0], "Playing as the Tank": [0.97, 0.24], "Tank": [0.95, 0.31], "Boomer": [-1.0, 0.0],
        }
        cls.vectors = {sid: favourites.get(name, [0.0, 1.0]) + [0.0] * 766 for sid, name in rows}

    @classmethod
    def tearDownClass(cls):
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def attached(self, question: str) -> list[str]:
        with mock.patch(f"{_SERVICE}.nomic_embed_available", return_value=True), mock.patch(
            f"{_SERVICE}.corpus_has_usable_section_vectors", return_value=True
        ), mock.patch(f"{_SERVICE}.corpus_embedding_compatible", return_value=True), mock.patch(
            f"{_SERVICE}.embed_texts", return_value=[[1.0, 0.0] + [0.0] * 766]
        ), mock.patch(f"{_SERVICE}._vector_recall_sections", return_value=([], self.vectors)):
            result = retrieve_knowledge_context(
                {**self.settings, "rag_hybrid_retrieval_enabled": True},
                ask_mode="strategy",
                question=question,
                app_id=LEFT_4_DEAD_2,
                app_name="",
                text_resolved_title="",
                domain="strategy",
                pc_ip="127.0.0.1:11434",
            )
        self.assertEqual(result.retrieval_method, "hybrid")
        return [m.group(1) for m in HEADER_RE.finditer(result.text_block or "")]

    def test_how_to_beat_tank_attaches_the_tank_note_first(self):
        names = self.attached("how to beat tank")
        self.assertEqual(names[0], "Tank")
        self.assertIn("Surviving the Tank", names)

    def test_the_same_question_with_versus_in_it_attaches_the_versus_note_first(self):
        self.assertEqual(self.attached("how to beat tank in versus")[0], "Surviving the Tank")


if __name__ == "__main__":
    unittest.main()
