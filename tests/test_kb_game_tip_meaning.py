"""A game's own tip is found by what the question means, not only by its words (plan 81, lane G).

Found on the Deck by plan 70 (docs/test-evidence/plan70-R4-try5.json, plan72-F3-TIP.json): with
Deep Rock Galactic: Survivor running, "the text looks blurry" attached that game's Render Scale
tip, but "the words on screen look blurry" did not -- the tip search read words only, and the
second sentence shares only one word ("blurry") with the tip's own text, which scores 2.0 against
a 4.0 cut-off. The fix reads the question's meaning too, for a game that ships its own tip.

Built against the real seed library and the real ``retrieve_knowledge_context``, so the cards that
come back are the ones the Ask would really receive. The deterministic tests stand in for the
embedding model with the tip's own stored vector (an exact meaning match) or a vector pointing the
other way; the ones marked "real model" ask this PC's Ollama and skip where it is not installed.
"""

import json
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services.knowledge_base_game_tip import (  # noqa: E402
    GAME_TIP_MEANING_FLOOR,
    SharedQueryEmbedding,
    pick_game_tip_by_meaning,
)
from backend.services.knowledge_base_service import (  # noqa: E402
    _get_connection,
    _load_compat_vectors,
    _load_section_vectors,
    _resolve_game_id,
    close_connection,
    retrieve_knowledge_context,
)
from backend.services.ollama_embed_service import (  # noqa: E402
    OllamaEmbedError,
    nomic_embed_available,
)
# The module, not its test class: a class imported by name here would run all of its tests twice.
import test_knowledge_base_service as kb_service_tests  # noqa: E402

SEED_DB = kb_service_tests.SEED_DB
REPO_ROOT = kb_service_tests.REPO_ROOT
DRG = {"app_id": "2321470", "app_name": "Deep Rock Galactic: Survivor"}
# The sentence from the Deck evidence (plan72-F3-TIP.json), with the game already running so the
# game's name is not typed. A long tail or the game's name lowers the meaning score (measured:
# 0.6772 bare, 0.6013 with "on my deck", 0.5654 with the name too) -- see the floor's comment.
REWORDED = "the words on screen look blurry"
SERVICE = "backend.services.knowledge_base_service"


def _settings():
    return {"use_local_knowledge_base": True, "rag_corpus_path": str(SEED_DB.parent)}


def _ask(question, *, ask_mode="strategy", game=DRG, domain="strategy"):
    return retrieve_knowledge_context(
        _settings(), ask_mode=ask_mode, question=question,
        app_id=game["app_id"], app_name=game["app_name"], domain=domain, pc_ip="",
    )


class PickByMeaningTests(unittest.TestCase):
    """The small decision the service delegates to -- no library needed."""

    def test_the_tip_closest_in_meaning_wins_when_it_clears_the_floor(self):
        vectors = {7: [1.0, 0.0], 9: [0.0, 1.0]}
        self.assertEqual(pick_game_tip_by_meaning(vectors, [0.0, 1.0]), 9)

    def test_nothing_is_picked_below_the_floor(self):
        # cosine 0.5 is under the floor, however the other tip scores
        vectors = {7: [0.5, 0.8660254]}
        self.assertIsNone(pick_game_tip_by_meaning(vectors, [1.0, 0.0]))

    def test_an_empty_pool_picks_nothing(self):
        self.assertIsNone(pick_game_tip_by_meaning({}, [1.0, 0.0]))

    def test_the_floor_sits_between_the_measured_strategy_ceiling_and_the_target_question(self):
        # Measured 2026-10-03 (docs in the commit message): the strongest of 114 strategy rows
        # for the four tip games scored 0.5873; "the words on screen look blurry" scored 0.6772.
        self.assertGreater(GAME_TIP_MEANING_FLOOR, 0.5873)
        self.assertLess(GAME_TIP_MEANING_FLOOR, 0.6772)


class SharedQueryEmbeddingTests(unittest.TestCase):
    def test_one_question_is_embedded_once_however_often_it_is_asked_for(self):
        calls = []

        def embed():
            calls.append(1)
            return [1.0, 0.0]

        shared = SharedQueryEmbedding(embed)
        self.assertEqual(shared.get(), [1.0, 0.0])
        self.assertEqual(shared.get(), [1.0, 0.0])
        self.assertEqual(len(calls), 1)

    def test_a_failed_embed_is_not_retried_and_raises_the_same_error_each_time(self):
        calls = []

        def embed():
            calls.append(1)
            raise OllamaEmbedError("no embed model")

        shared = SharedQueryEmbedding(embed)
        for _ in range(2):
            with self.assertRaises(OllamaEmbedError):
                shared.get()
        self.assertEqual(len(calls), 1)


class GameTipByMeaningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        kb_service_tests._ensure_seed_db()
        if not SEED_DB.is_file():
            raise unittest.SkipTest("seed corpus build failed")

    def tearDown(self):
        close_connection(str(SEED_DB))

    def _tip_vectors(self, app_id):
        conn = _get_connection(str(SEED_DB))
        ids = [r["pattern_id"] for r in conn.execute(
            "SELECT pattern_id FROM compat_patterns WHERE app_id = ?", (app_id,))]
        vectors = _load_compat_vectors(conn, ids)
        if not vectors:
            self.skipTest("seed corpus has no tip vectors -- build it with a local nomic-embed-text")
        return vectors

    def test_a_reworded_question_with_the_tips_meaning_attaches_the_tip(self):
        """The bug at the level the Deck looks at: the cards the Ask would receive."""
        tip_vector = list(self._tip_vectors("2321470").values())[0]
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True), \
             mock.patch(f"{SERVICE}.embed_texts", return_value=[tip_vector]):
            result = _ask(REWORDED)
        self.assertTrue(result.attached)
        self.assertIn("Render Scale", result.text_block)

    def test_the_meaning_check_costs_one_embed_call_not_two(self):
        tip_vector = list(self._tip_vectors("2321470").values())[0]
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True), \
             mock.patch(f"{SERVICE}.embed_texts", return_value=[tip_vector]) as embed:
            _ask(REWORDED)
        self.assertEqual(embed.call_count, 1)

    def test_a_question_that_means_something_else_keeps_its_own_notes(self):
        """The boss question from the same evidence: the game's notes, not the display tip.
        The model is stood in for by the Dreadnought note's own stored vector -- a question that
        means exactly that note, and nothing like the display tip."""
        conn = _get_connection(str(SEED_DB))
        row = conn.execute(
            "SELECT s.section_id FROM sections s JOIN games g ON g.game_id = s.game_id "
            "WHERE g.app_id = '2321470' AND s.name = 'Glyphid Dreadnought'").fetchone()
        boss_vector = _load_section_vectors(conn, [row["section_id"]]).get(row["section_id"])
        if not boss_vector:
            self.skipTest("seed corpus has no section vectors -- build it with a local nomic-embed-text")
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True),              mock.patch(f"{SERVICE}.embed_texts", return_value=[boss_vector]):
            result = _ask("how do i beat the dreadnought")
        self.assertTrue(result.attached)
        self.assertIn("Dreadnought", result.text_block)
        self.assertNotIn("Render Scale", result.text_block)

    def test_speed_mode_never_reads_meaning(self):
        """Speed promises the cheap word lookup only (the maintainer's call of 2026-09-05)."""
        tip_vector = list(self._tip_vectors("2321470").values())[0]
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True), \
             mock.patch(f"{SERVICE}.embed_texts", return_value=[tip_vector]) as embed:
            result = _ask(REWORDED, ask_mode="speed")
        embed.assert_not_called()
        self.assertNotIn("Render Scale", result.text_block)

    def test_a_failed_embed_leaves_the_ask_working_on_words_alone(self):
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True), \
             mock.patch(f"{SERVICE}.embed_texts", side_effect=OllamaEmbedError("down")):
            result = _ask("how do i beat the dreadnought")
        self.assertTrue(result.attached)
        self.assertIn("Dreadnought", result.text_block)

    def test_a_game_with_no_tip_never_has_tip_vectors_read(self):
        """Hades ships no tip of its own: the meaning check must not even look for one."""
        game = {"app_id": "1145360", "app_name": "Hades"}
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True),              mock.patch(f"{SERVICE}.embed_texts", return_value=[[0.0] * 768]),              mock.patch(f"{SERVICE}._load_compat_vectors", wraps=_load_compat_vectors) as load:
            _ask("how do i beat megaera", game=game)
        load.assert_not_called()

    def test_a_library_without_tip_vectors_still_answers_from_words(self):
        with mock.patch(f"{SERVICE}.nomic_embed_available", return_value=True), \
             mock.patch(f"{SERVICE}.corpus_has_usable_compat_vectors", return_value=False), \
             mock.patch(f"{SERVICE}.embed_texts", return_value=[[0.0] * 768]):
            result = _ask(REWORDED)
        self.assertNotIn("Render Scale", result.text_block)


class RealModelTests(unittest.TestCase):
    """With this PC's real embedding model: the sentences the Deck actually uses."""

    @classmethod
    def setUpClass(cls):
        kb_service_tests._ensure_seed_db()
        if not SEED_DB.is_file():
            raise unittest.SkipTest("seed corpus build failed")
        if not nomic_embed_available(""):
            raise unittest.SkipTest("needs a local embedding model (nomic-embed-text)")

    def tearDown(self):
        close_connection(str(SEED_DB))

    def test_real_model_the_reworded_question_attaches_the_render_scale_tip(self):
        result = _ask(REWORDED)
        self.assertTrue(result.attached)
        self.assertIn("Render Scale", result.text_block)

    def test_real_model_the_boss_question_still_attaches_the_boss_note(self):
        result = _ask("how do i beat the dreadnought")
        self.assertTrue(result.attached)
        self.assertIn("Dreadnought", result.text_block)
        self.assertNotIn("Render Scale", result.text_block)

    def test_real_model_no_measured_strategy_row_for_a_tip_game_reaches_a_tip(self):
        """The numbers behind GAME_TIP_MEANING_FLOOR, end to end: every tune/holdout strategy
        question in kb_eval_v2.json for a game that ships its own tip must keep the tip off."""
        rows = json.loads((REPO_ROOT / "tests" / "fixtures" / "kb_eval_v2.json").read_text(
            encoding="utf-8"))["queries"]
        games = {"2321470": "Deep Rock Galactic: Survivor", "377160": "Fallout 4",
                 "1547000": "Grand Theft Auto: San Andreas"}
        conn = _get_connection(str(SEED_DB))
        checked, wrong = 0, []
        for row in rows:
            app_id = str(row.get("app_id") or "")
            if row.get("domain") != "strategy" or app_id not in games:
                continue
            game_id, _ = _resolve_game_id(conn, app_id=app_id, app_name=games[app_id],
                                          shortcut_name="", text_resolved_title="")
            if game_id is None:
                continue
            checked += 1
            result = retrieve_knowledge_context(
                _settings(), ask_mode="strategy", question=row["query"], app_id=app_id,
                app_name=games[app_id], domain="strategy", pc_ip="")
            if result.notes == "compat_tips":
                wrong.append((row["id"], row["query"]))
        self.assertGreater(checked, 0)
        self.assertEqual(wrong, [], f"a strategy question was sent to a game tip: {wrong}")


if __name__ == "__main__":
    unittest.main()
