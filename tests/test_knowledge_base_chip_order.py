"""The game's own chips, ordered by how close each note is to the last question (plan 103, lane C1).

A small library with hand-made three-number meaning vectors is built on disk, so each test says in
plain numbers which note is close to the question and which is not. What the tests pin:

* no remembered question: the order is exactly today's (the cold open and Speed asks);
* a question: the closest notes come first, then today's order carries on, so no chip is favoured
  for ever and the pool is still ten different chips;
* a note the spoiler rules would hold back (boss and enemy names the question did not say, and
  the other high-risk kinds) never comes forward unless today's pool already offered it;
* the game's own chips still come before the shared tips, and at least one game chip shows.
"""

import os
import sqlite3
import tempfile
import time
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import knowledge_base_chips as chips  # noqa: E402
from backend.knowledge.knowledge_base_cards import close_connection  # noqa: E402
from backend.knowledge.knowledge_base_schema import pack_embedding_vector  # noqa: E402

TOWARD = [1.0, 0.0, 0.0]  # what the question points at
AWAY = [0.0, 1.0, 0.0]


def _build_db(path: str, cards: list[tuple[str, str, list[float] | None]], *, with_vectors: bool = True) -> None:
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE games (game_id INTEGER, canonical_title TEXT)")
    conn.execute("CREATE TABLE sections (section_id INTEGER PRIMARY KEY, game_id INTEGER, section_type TEXT, name TEXT)")
    conn.execute("CREATE TABLE compat_patterns (topic TEXT)")
    conn.execute("INSERT INTO compat_patterns VALUES ('proton')")
    if with_vectors:
        conn.execute("CREATE TABLE section_vectors (section_id INTEGER PRIMARY KEY, embedding BLOB)")
    conn.execute("INSERT INTO games VALUES (1, 'Test Game')")
    for kind, name, vec in cards:
        cur = conn.execute("INSERT INTO sections (game_id, section_type, name) VALUES (1, ?, ?)", (kind, name))
        if with_vectors and vec is not None:
            conn.execute(
                "INSERT INTO section_vectors VALUES (?, ?)", (cur.lastrowid, pack_embedding_vector(vec))
            )
    conn.commit()
    conn.close()


def _mix(a: list[float], b: list[float], weight_a: float) -> list[float]:
    """A unit-length vector between two directions (weight_a is how much of the first)."""
    raw = [weight_a * x + (1 - weight_a) * y for x, y in zip(a, b)]
    norm = sum(v * v for v in raw) ** 0.5
    return [v / norm for v in raw]


def _a_big_game(with_vectors: bool = True):
    """Boss0..4, Enemy0..4, Item0..4 and four mechanics.

    Today's ten chips (round-robin over kinds) are Boss0-2, Enemy0-2, Item0-1 and Mech0-1; Boss3-4,
    Enemy3-4, Item2-4 and Mech2-3 are in the library but outside today's ten.
    """
    cards: list[tuple[str, str, list[float] | None]] = []
    cards += [("boss", f"Boss{i}", AWAY) for i in range(5)]
    cards += [("enemy", f"Enemy{i}", AWAY) for i in range(5)]
    cards += [("item", f"Item{i}", AWAY) for i in range(5)]
    cards += [("mechanic", f"Mech{i}", AWAY) for i in range(4)]
    return cards


def _twelve_of(kind: str, last_name: str) -> list[tuple[str, str, list[float] | None]]:
    """Twelve notes of one kind; only the twelfth is close, so it is never in today's ten."""
    cards: list[tuple[str, str, list[float] | None]] = [(kind, f"Filler {kind} {i}", AWAY) for i in range(11)]
    return cards + [(kind, last_name, TOWARD)]


class ChipOrderTests(unittest.TestCase):
    def setUp(self) -> None:
        # The remembered question is process-wide; each test starts with none.
        chips._LAST_QUESTIONS.clear()

    def _chips_for(self, cards, *, question=None, remembered=None, with_vectors=True, game_id=1) -> list[str]:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db = os.path.join(tmp.name, "corpus.db")
        _build_db(db, cards, with_vectors=with_vectors)
        self.addCleanup(close_connection, db)
        if remembered is not None:
            chips.remember_last_question(1, remembered[0], remembered[1])
        with mock.patch.object(chips, "resolve_corpus_db_path", return_value=db), mock.patch.object(
            chips, "_resolve_game_id", return_value=(game_id, "exact")
        ):
            # A question handed in goes through the inner function (the public one has a frozen shape
            # and only ever uses a kept question); everything else goes through the public one.
            if question:
                result = chips._chip_candidates_for(
                    {"use_local_knowledge_base": True},
                    app_id="1",
                    app_name="Test Game",
                    last_question=chips.LastQuestion(*question),
                )
            else:
                result = chips.suggest_chip_candidates(
                    {"use_local_knowledge_base": True}, app_id="1", app_name="Test Game"
                )
        self.assertTrue(result.ok)
        self._last_result = result
        return [c.text for c in result.candidates if c.domain == "strategy"]

    def test_no_question_keeps_todays_order_exactly(self):
        cards = _a_big_game()
        cards[11] = ("item", "Item1", TOWARD)  # close to nothing asked: there is no question
        got = self._chips_for(cards)
        self.assertEqual(len(got), 10)
        self.assertEqual(
            got[:4],
            ["How do I beat Boss0?", "How do I deal with Enemy0?", "How do I use Item0?", "What should I know about Mech0?"],
        )

    def test_the_closest_notes_come_first_and_todays_order_carries_on(self):
        cards = _a_big_game()
        cards[1] = ("boss", "Boss1", _mix(TOWARD, AWAY, 0.9))  # in today's pool, close
        cards[14] = ("item", "Item4", TOWARD)  # not in today's pool, closer, an item
        before = self._chips_for(cards)
        self.assertNotIn("How do I use Item4?", before)
        after = self._chips_for(cards, question=("how do I use item four", TOWARD))
        self.assertEqual(after[:2], ["How do I use Item4?", "How do I beat Boss1?"])
        self.assertEqual(len(after), 10)
        self.assertEqual(len(set(after)), 10)
        # The rest is today's order, minus the chips that moved up.
        rest = [t for t in before if t not in after[:2]]
        self.assertEqual(after[2:], rest[:8])

    def test_a_question_far_from_everything_changes_nothing(self):
        cards = _a_big_game()
        before = self._chips_for(cards)
        # The question points at a third direction; every note is equally (not) close.
        after = self._chips_for(cards, question=("anything", [0.0, 0.0, 1.0]))
        self.assertEqual(after, before)

    def test_a_note_only_slightly_nearer_than_the_rest_does_not_come_forward(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", _mix(TOWARD, AWAY, 0.25))
        before = self._chips_for(cards)
        after = self._chips_for(cards, question=("anything", TOWARD))
        self.assertEqual(after, before)

    def test_a_boss_the_question_did_not_name_is_not_brought_forward(self):
        cards = _a_big_game()
        cards[4] = ("boss", "Boss4", TOWARD)  # outside today's pool, close, but never named
        after = self._chips_for(cards, question=("how do I kill the big one at the end", TOWARD))
        self.assertNotIn("How do I beat Boss4?", after)

    def test_a_boss_the_question_named_is_brought_forward(self):
        cards = _a_big_game()
        cards[4] = ("boss", "Boss4", TOWARD)
        after = self._chips_for(cards, question=("how do I beat Boss4", TOWARD))
        self.assertEqual(after[0], "How do I beat Boss4?")

    def test_an_enemy_the_question_did_not_name_is_not_brought_forward(self):
        cards = _a_big_game()
        cards[9] = ("enemy", "Enemy4", TOWARD)  # outside today's pool
        after = self._chips_for(cards, question=("what is that thing shooting at me", TOWARD))
        self.assertNotIn("How do I deal with Enemy4?", after)

    def test_a_held_back_note_todays_pool_already_offers_may_move_up(self):
        cards = _a_big_game()
        cards[2] = ("boss", "Boss2", TOWARD)  # in today's pool already
        after = self._chips_for(cards, question=("anything", TOWARD))
        self.assertEqual(after[0], "How do I beat Boss2?")

    def test_the_other_high_risk_kinds_are_held_back_too(self):
        for kind in ("dungeon", "quest", "area", "ending", "story", "puzzle", "secret"):
            with self.subTest(kind=kind):
                cards = _a_big_game() + _twelve_of(kind, "Later Place")
                before = self._chips_for(cards)
                self.assertFalse(any("Later Place" in t for t in before))
                after = self._chips_for(cards, question=("anything", TOWARD))
                self.assertFalse(any("Later Place" in t for t in after))

    def test_a_low_risk_kind_comes_forward_without_being_named(self):
        for kind in ("mechanic", "tip", "versus", "coop", "callout", "survival", "realism"):
            with self.subTest(kind=kind):
                cards = _a_big_game() + _twelve_of(kind, "Plain Thing")
                before = self._chips_for(cards)
                self.assertFalse(any("Plain Thing" in t for t in before))
                after = self._chips_for(cards, question=("anything", TOWARD))
                self.assertTrue(any("Plain Thing" in t for t in after[:2]), after[:3])

    def test_the_starting_out_note_is_not_pushed_ahead_of_a_question(self):
        cards = _a_big_game() + [("starting_out", "Starting out in Test Game", TOWARD)]
        cards[14] = ("item", "Item4", _mix(TOWARD, AWAY, 0.9))  # a little less close than the starting note
        before = self._chips_for(cards)
        self.assertEqual(before[0], "How do I get started in Test Game?")
        after = self._chips_for(cards, question=("anything", TOWARD))
        self.assertEqual(after[0], "How do I use Item4?")
        self.assertIn("How do I get started in Test Game?", after)

    def test_notes_without_vectors_or_a_library_without_the_table_keep_todays_order(self):
        no_vectors = [(k, n, None) for k, n, _ in _a_big_game()]
        self.assertEqual(
            self._chips_for(no_vectors, question=("anything", TOWARD)), self._chips_for(no_vectors)
        )
        self.assertEqual(
            self._chips_for(_a_big_game(), question=("anything", TOWARD), with_vectors=False),
            self._chips_for(_a_big_game(), with_vectors=False),
        )

    def test_a_vector_of_the_wrong_length_keeps_todays_order(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        before = self._chips_for(cards)
        after = self._chips_for(cards, question=("anything", [1.0, 0.0]))
        self.assertEqual(after, before)

    def test_game_chips_still_come_before_shared_tips_and_one_game_chip_shows(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        self._chips_for(cards, question=("how do I use item four", TOWARD))
        domains = [c.domain for c in self._last_result.candidates]
        self.assertEqual(domains[0], "strategy")
        self.assertIn("compat", domains)
        self.assertLess(max(i for i, d in enumerate(domains) if d == "strategy"), domains.index("compat"))

    def test_the_next_question_moves_the_chips_again(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        cards[11] = ("item", "Item1", _mix(AWAY, [0.0, 0.0, 1.0], 0.5))
        first = self._chips_for(cards, question=("about toward", TOWARD))
        second = self._chips_for(cards, question=("about away", _mix(AWAY, [0.0, 0.0, 1.0], 0.5)))
        self.assertEqual(first[0], "How do I use Item4?")
        self.assertNotEqual(second[0], first[0])
        # Every chip today offers is still offered after either question, past the closest few.
        today = self._chips_for(cards)
        self.assertTrue(set(today[:6]) <= set(first) | set(second))

    def test_a_remembered_question_is_used_once(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        first = self._chips_for(cards, remembered=("how do I use item four", TOWARD))
        self.assertEqual(first[0], "How do I use Item4?")
        # The same library asked again, nothing remembered any more: today's order.
        again = self._chips_for(cards)
        self.assertNotEqual(again[0], "How do I use Item4?")

    def test_the_public_call_keeps_its_frozen_shape_and_still_orders_by_a_kept_question(self):
        import inspect

        self.assertEqual(
            list(inspect.signature(chips.suggest_chip_candidates).parameters),
            ["settings", "app_id", "app_name", "shortcut_name"],
        )
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        self.assertEqual(self._chips_for(cards, remembered=("q", TOWARD))[0], "How do I use Item4?")

    def test_a_remembered_question_goes_stale(self):
        chips.remember_last_question(1, "q", TOWARD, now=1000.0)
        self.assertIsNone(chips._take_last_question(1, now=1000.0 + chips._LAST_QUESTION_TTL_S + 1))
        chips.remember_last_question(1, "q", TOWARD, now=1000.0)
        self.assertIsNotNone(chips._take_last_question(1, now=1000.0 + chips._LAST_QUESTION_TTL_S - 1))

    def test_a_remembered_question_belongs_to_its_game(self):
        chips.remember_last_question(7, "q", TOWARD)
        self.assertIsNone(chips._take_last_question(1))
        self.assertIsNotNone(chips._take_last_question(7))

    def test_a_stale_remembered_question_keeps_todays_order(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        chips.remember_last_question(1, "q", TOWARD, now=time.monotonic() - chips._LAST_QUESTION_TTL_S - 5)
        self.assertEqual(self._chips_for(cards), self._chips_for(cards, question=None))
        self.assertNotEqual(self._chips_for(cards)[0], "How do I use Item4?")

    def test_a_question_handed_in_wins_over_a_remembered_one(self):
        cards = _a_big_game()
        cards[14] = ("item", "Item4", TOWARD)
        cards[11] = ("item", "Item1", [0.0, 0.0, 1.0])
        got = self._chips_for(
            cards, question=("about item one", [0.0, 0.0, 1.0]), remembered=("about item four", TOWARD)
        )
        self.assertEqual(got[0], "How do I use Item1?")

    def test_the_held_back_kinds_match_the_spoiler_rules_so_they_cannot_drift(self):
        from backend.spoilers import spoiler_risk_service, strategy_spoiler_policy

        self.assertEqual(
            chips._HELD_BACK_KINDS,
            frozenset(spoiler_risk_service._HIGH_SPOILER_SECTION_TYPES)
            | frozenset(strategy_spoiler_policy._BOSS_LIKE_KINDS),
        )


if __name__ == "__main__":
    unittest.main()
