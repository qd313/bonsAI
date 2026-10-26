"""Title: Typing "GTA San Andreas" in a chat about another game reaches the San Andreas notes

Purpose: Pin what the Deck saw on 2026-10-25 (workshop:test-evidence/plan100-P100-FOUR-GAMES-01.json):
with nothing running, in a chat whose own game was Portal 2, "in GTA San Andreas what does body armor
do" went to Portal 2, and "Grand Theft Auto San Andreas: how does body armor work" was answered as
"a game the library does not know". Both sentences must now resolve to the San Andreas notes, with
the chat's own game set to Portal 2 and with none, and a Portal 2 question must stay Portal 2.
Used for: data/kb/notes/gta-san-andreas.json's aliases list, and the D19 lookup that reads it.
Solves: plan 100 lane M3 (a typed game name lost to the chat's remembered game).
Does not: Cover meaning search (no vectors are built here).
"""

import logging
import re
import tempfile
import unittest
from pathlib import Path

from build_rag_db_loader import load_build_rag_db
from backend.chats.chat_own_game_title import text_resolved_title_for_turn
from backend.knowledge.knowledge_base_service import (
    close_connection,
    resolve_corpus_db_path,
    resolve_title_from_question,
    retrieve_knowledge_context,
)

SAN_ANDREAS = "Grand Theft Auto: San Andreas - The Definitive Edition"
SENTENCES = (
    "in GTA San Andreas what does body armor do",
    "Grand Theft Auto San Andreas: how does body armor work",
    "Grand Theft Auto: San Andreas, how does body armor work",
    "gta: san andreas body armor",
    "san andreas body armor",
    "gta sa body armor",
)
_HEADER_RE = re.compile(r"^\[.*: (.*?)\].*\(trust: [^)]+\)\s*$", re.M)


class GtaSanAndreasTypedNameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        builder = load_build_rag_db()
        # No embedding model on purpose: never reach Ollama from a unit test.
        builder._list_installed_ollama_tags = lambda *args, **kwargs: []
        out_dir = Path(cls._tmp.name) / "out"
        builder.build_corpus(out_dir, seed=True, allow_missing_embeddings=True)
        cls.settings = {
            "use_local_knowledge_base": True,
            "rag_hybrid_retrieval_enabled": False,
            "rag_corpus_path": str(out_dir),
        }
        cls.log = logging.getLogger("test_gta_sa")

    @classmethod
    def tearDownClass(cls):
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def resolve(self, question: str, chat: dict) -> str:
        return text_resolved_title_for_turn(self.settings, question, chat, resolve_title_from_question, self.log)

    def test_each_spelling_resolves_with_the_chats_own_game_set_to_portal_2(self):
        chat = {"turns": [], "origin_app_name": "Portal 2"}
        for question in SENTENCES:
            with self.subTest(question=question):
                self.assertEqual(self.resolve(question, chat), SAN_ANDREAS)

    def test_each_spelling_resolves_with_no_chat_game(self):
        for question in SENTENCES:
            with self.subTest(question=question):
                self.assertEqual(self.resolve(question, {"turns": []}), SAN_ANDREAS)

    def test_a_portal_2_question_still_resolves_to_portal_2(self):
        chat = {"turns": [], "origin_app_name": "Portal 2"}
        self.assertEqual(self.resolve("in portal 2 how do I use the repulsion gel", chat), "Portal 2")

    def test_a_bare_follow_up_still_uses_the_chats_own_game(self):
        chat = {"turns": [], "origin_app_name": "Portal 2"}
        self.assertEqual(self.resolve("what about the next room", chat), "Portal 2")

    def test_the_body_armor_note_attaches_in_a_portal_2_chat(self):
        question = SENTENCES[0]
        title = self.resolve(question, {"turns": [], "origin_app_name": "Portal 2"})
        result = retrieve_knowledge_context(
            self.settings, ask_mode="strategy", question=question, app_id="", app_name="",
            text_resolved_title=title, domain="strategy", pc_ip="",
        )
        names = [m.group(1) for m in _HEADER_RE.finditer(result.text_block or "")]
        self.assertIn("Body Armor", names)


if __name__ == "__main__":
    unittest.main()
