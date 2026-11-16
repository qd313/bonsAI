"""Title: A question that names a mod gets its load-order rule at the point a question is answered from the notes

Purpose: Pin the one call site in knowledge_base_service.retrieve_knowledge_context: with the switch on,
a Skyrim Special Edition question that names a mod (Skyrim named in the question with nothing running, on
the strategy route and on the troubleshooting route a "load order" question takes) comes back with the
mod's block, after the notes when notes attached and alone when none did; a question naming no mod, or a
game that is not Fallout 4 or Skyrim Special Edition, comes back exactly as before; with the switch off
every question comes back exactly as before.
Used for: knowledge_base_service.py retrieve_knowledge_context and backend/knowledge/kb_mod_rule_block.py,
over a real library built from the shipped Skyrim and Fallout 4 notes and load-order files (no meaning
search, no Ollama).
Solves: A step that passes its own tests but is never called, or is called only on one of the two routes,
would show no block on the Deck. This test reads the result the answer step reads.
Does not: Test the wording of the block (test_kb_mod_rule_block.py) or the answer step that uses it.
"""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import kb_mod_rule_block as block  # noqa: E402
from backend.knowledge.knowledge_base_service import (  # noqa: E402
    close_connection,
    resolve_corpus_db_path,
    resolve_title_from_question,
    retrieve_knowledge_context,
    should_retrieve_knowledge,
)
from build_rag_db_loader import load_build_rag_db  # noqa: E402
from kb_keyword_corpus_support import build_keyword_corpus  # noqa: E402

FALLOUT_4, SKYRIM_SE = 5, 38
MOD_QUESTION = "in skyrim what loads after Alternate Start - Live Another Life"
LOAD_ORDER_QUESTION = "skyrim load order for Alternate Start - Live Another Life"
NOTES_AND_MOD_QUESTION = "starting out in skyrim and what loads after Alternate Start - Live Another Life"
NO_MOD_QUESTION = "skyrim what are good mods for a stealth archer"
FALLOUT_QUESTION = "does Armorsmith Extended need anything"
BLOCK_START = "--- LOOT load-order rule"


class ModBlockAtTheServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.settings = build_keyword_corpus(cls._tmp, (FALLOUT_4, SKYRIM_SE))
        db_path = resolve_corpus_db_path(cls.settings)
        conn = sqlite3.connect(db_path)
        load_build_rag_db()._seed_load_order(conn)  # the shipped LOOT files; the helper's fixture leaves them out
        conn.commit()
        conn.close()
        close_connection(db_path)

    @classmethod
    def tearDownClass(cls):
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def setUp(self):
        block._index_cache.clear()

    def retrieve(self, question, *, domain="strategy", app_id="", app_name=""):
        title = "" if (app_id or app_name) else resolve_title_from_question(self.settings, question)
        return retrieve_knowledge_context(
            self.settings, ask_mode="speed", question=question, app_id=app_id, app_name=app_name,
            text_resolved_title=title, domain=domain, pc_ip="",
        )

    @staticmethod
    def on():
        return mock.patch.object(block, "MOD_RULE_BLOCK_ON", True)

    @staticmethod
    def facts(result):
        """Everything about a result that is not a clock."""
        return (result.attached, result.text_block, result.sources, result.notes, result.attached_ids,
                result.trust_tier, result.retrieval_method)

    def test_skyrim_named_in_the_question_nothing_running_the_mods_block_is_attached(self):
        with self.on():
            result = self.retrieve(MOD_QUESTION)
        self.assertTrue(result.attached)
        self.assertTrue(result.text_block.startswith(BLOCK_START), result.text_block[:200])
        self.assertIn('"alternate start - live another life.esp" loads after', result.text_block)
        self.assertIn("bonsAI has not checked your own load order.", result.text_block)
        self.assertEqual(result.sources, [])

    def test_a_load_order_question_goes_to_the_tips_route_and_still_gets_the_block(self):
        should, domain = should_retrieve_knowledge(
            use_local_knowledge_base=True, ask_mode="speed", question=LOAD_ORDER_QUESTION, app_id="", app_name="",
            text_resolved_title=resolve_title_from_question(self.settings, LOAD_ORDER_QUESTION),
        )
        self.assertEqual((should, domain), (True, "compat"))
        with self.on():
            result = self.retrieve(LOAD_ORDER_QUESTION, domain=domain)
        self.assertTrue(result.attached)
        self.assertIn(BLOCK_START, result.text_block)
        self.assertIn("alternate start - live another life.esp", result.text_block)

    def test_when_notes_attach_the_block_follows_them_and_the_notes_are_as_they_were(self):
        before = self.retrieve(NOTES_AND_MOD_QUESTION)
        self.assertTrue(before.attached, "the test question must find a Skyrim note")
        with self.on():
            after = self.retrieve(NOTES_AND_MOD_QUESTION)
        sentinel = "--- End local knowledge base ---"
        notes_part, _, mod_part = after.text_block.partition(sentinel)
        self.assertEqual(notes_part + sentinel, before.text_block)
        self.assertTrue(mod_part.strip().startswith(BLOCK_START))
        self.assertEqual((after.sources, after.attached_ids, after.notes), (before.sources, before.attached_ids, before.notes))
        self.assertTrue(after.sources)

    def test_a_question_naming_no_mod_comes_back_exactly_as_before(self):
        for question in (NO_MOD_QUESTION, "skyrim how do I beat alduin"):
            with self.subTest(question=question):
                before = self.retrieve(question)
                with self.on():
                    after = self.retrieve(question)
                self.assertEqual(self.facts(after), self.facts(before))

    def test_a_running_fallout_4_gets_its_own_rule_and_a_running_other_game_gets_none(self):
        with self.on():
            fallout = self.retrieve(FALLOUT_QUESTION, app_id="377160")
            other = self.retrieve(MOD_QUESTION, app_id="1145360", app_name="Hades")
        self.assertIn('"Armorsmith Extended.esp" loads after "EAMR.esp"', fallout.text_block)
        self.assertNotIn(BLOCK_START, other.text_block)

    def test_with_the_switch_off_every_question_comes_back_exactly_as_it_did(self):
        self.assertIs(block.MOD_RULE_BLOCK_ON, False)
        with mock.patch.object(block, "mod_rule_block_for", side_effect=AssertionError("must not look")):
            for question in (MOD_QUESTION, NOTES_AND_MOD_QUESTION, NO_MOD_QUESTION):
                with self.subTest(question=question):
                    result = self.retrieve(question)
                    self.assertNotIn(BLOCK_START, result.text_block)


if __name__ == "__main__":
    unittest.main()
