"""The search leaves its question vector for the chips fetched after the answer (plan 103, lane C1).

Runs the real retrieval against the seed library (built the same way test_knowledge_base_service builds
it) with only the embedding call and its availability mocked. The question's vector is set to a stored
note's own vector, so which chip should lead afterwards is known in advance. What this pins:

* a search that made a vector: the next chip request for that game is ordered by it, the one after
  that is back to today's order;
* a Speed search, a tips search and a search with no game keep nothing;
* the search's own result (notes, their order, scores, text) is the same with and without the keeping;
* an error inside the keeping cannot break a search.
"""

import dataclasses
import unittest
from unittest import mock

from backend.knowledge import knowledge_base_chips as chips
from backend.knowledge.knowledge_base_service import (
    _get_connection,
    close_connection,
    retrieve_knowledge_context,
    suggest_chip_candidates,
)
from backend.knowledge.knowledge_base_schema import (
    corpus_has_usable_section_vectors,
    unpack_embedding_vector,
)
from test_knowledge_base_service import SEED_DB, _ensure_seed_db

_SERVICE = "backend.knowledge.knowledge_base_service"
_SETTINGS = {"use_local_knowledge_base": True, "rag_corpus_path": str(SEED_DB.parent)}
_GAME = {"app_id": "550", "app_name": "Left 4 Dead 2"}
_NOT_HELD_BACK = ("mechanic", "item")


class SearchLeavesTheQuestionForTheChipsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _ensure_seed_db()
        if not SEED_DB.is_file():
            raise unittest.SkipTest("seed corpus build failed")
        conn = _get_connection(str(SEED_DB))
        if not corpus_has_usable_section_vectors(conn):
            raise unittest.SkipTest("seed corpus has no section vectors -- build it with a local nomic-embed-text")
        close_connection(str(SEED_DB))

    def setUp(self):
        chips._LAST_QUESTIONS.clear()
        self.addCleanup(close_connection, str(SEED_DB))
        self.addCleanup(chips._LAST_QUESTIONS.clear)

    # -- helpers
    def _chip_texts(self) -> list[str]:
        result = suggest_chip_candidates(_SETTINGS, **_GAME)
        self.assertTrue(result.ok)
        return [c.text for c in result.candidates if c.domain == "strategy"]

    def _targets(self, count: int) -> list[tuple[str, list[float]]]:
        """Notes of kinds the spoiler rules do not hold back, outside today's ten chips, with their own
        stored vectors: (the chip that note makes, its vector)."""
        todays = set(self._chip_texts())
        conn = _get_connection(str(SEED_DB))
        rows = conn.execute(
            "SELECT s.section_type, s.name, v.embedding FROM sections s "
            "JOIN section_vectors v ON v.section_id = s.section_id "
            "JOIN games g ON g.game_id = s.game_id WHERE g.app_id = ? ORDER BY s.section_id",
            (_GAME["app_id"],),
        ).fetchall()
        out = []
        for row in rows:
            if row["section_type"] not in _NOT_HELD_BACK:
                continue
            text = chips._curtail_section_to_chip(row["section_type"], row["name"])
            if text in todays:
                continue
            out.append((text, unpack_embedding_vector(bytes(row["embedding"]))))
            if len(out) == count:
                break
        self.assertEqual(len(out), count, "the seed library should hold enough notes outside today's ten")
        return out

    def _search(self, vector, *, question="how do i use that", ask_mode="strategy", domain="strategy", game=True):
        identity = _GAME if game else {"app_id": "", "app_name": ""}
        with mock.patch(f"{_SERVICE}.nomic_embed_available", return_value=True), mock.patch(
            f"{_SERVICE}.embed_texts", return_value=[vector]
        ):
            return retrieve_knowledge_context(
                _SETTINGS,
                ask_mode=ask_mode,
                question=question,
                domain=domain,
                pc_ip="127.0.0.1:11434",
                **identity,
            )

    def _without_timing(self, result) -> dict:
        data = dataclasses.asdict(result)
        data.pop("timing_ms", None)
        return data

    # -- the chips follow the search
    def test_the_next_chip_request_is_ordered_by_the_search_and_the_one_after_is_not(self):
        (text, vector), = self._targets(1)
        before = self._chip_texts()
        self.assertNotIn(text, before)
        result = self._search(vector, question="what should I do about this one")
        self.assertEqual(result.retrieval_method, "hybrid")
        after = self._chip_texts()
        self.assertEqual(after[0], text)
        self.assertEqual(self._chip_texts(), before)

    # -- the searches that keep nothing
    def test_a_speed_search_a_tips_search_and_a_search_with_no_game_keep_nothing(self):
        (text, vector), = self._targets(1)
        cases = {
            "speed": dict(ask_mode="speed"),
            "tips": dict(domain="compat", question="why is my game crashing proton issue"),
            "no game": dict(game=False, domain="compat", question="why is my game crashing proton issue"),
        }
        for name, kwargs in cases.items():
            with self.subTest(name), mock.patch(f"{_SERVICE}.remember_last_question") as kept:
                self._search(vector, **kwargs)
                kept.assert_not_called()
                self.assertNotEqual(self._chip_texts()[0], text)

    def test_a_search_that_made_a_vector_for_the_game_keeps_it_once(self):
        (_, vector), = self._targets(1)
        with mock.patch(f"{_SERVICE}.remember_last_question") as kept:
            self._search(vector, question="the question")
        kept.assert_called_once()
        game_id, question, kept_vector = kept.call_args.args
        self.assertIsInstance(game_id, int)
        self.assertEqual(question, "the question")
        self.assertEqual(kept_vector, vector)

    # -- the search itself is untouched
    def test_the_search_returns_the_same_notes_in_the_same_order_with_or_without_the_keeping(self):
        for text, vector in self._targets(3):
            question = "what should I do about this one"
            with self.subTest(question=question):
                with mock.patch(f"{_SERVICE}.remember_last_question"):
                    plain = self._without_timing(self._search(vector, question=question))
                chips._LAST_QUESTIONS.clear()
                kept = self._without_timing(self._search(vector, question=question))
                self.assertTrue(plain["attached"])
                self.assertEqual(kept, plain)

    def test_an_error_in_the_keeping_cannot_break_a_search(self):
        (text, vector), = self._targets(1)
        question = "what should I do about this one"
        with mock.patch(f"{_SERVICE}.remember_last_question"):
            plain = self._without_timing(self._search(vector, question=question))
        with mock.patch(f"{_SERVICE}.remember_last_question", side_effect=RuntimeError("boom")):
            broken = self._without_timing(self._search(vector, question=question))
        self.assertEqual(broken, plain)
        self.assertTrue(broken["attached"])
        self.assertEqual(broken["retrieval_method"], "hybrid")


if __name__ == "__main__":
    unittest.main()
