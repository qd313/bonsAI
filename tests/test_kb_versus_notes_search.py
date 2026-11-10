"""Title: A question about playing the infected side finds that note, not the survivors' side of it

Purpose: Pin what a player sees on the Left 4 Dead 2 versus notes. Asking for tips on playing as one
special infected, with "versus" in the question, attaches the note about playing that infected --
not the note about surviving it, which used to win on the word "versus" sitting in its name.
Used for: data/kb/notes/left-4-dead-2-versus.json (the survivors' notes' names).
Solves: plan 103, lane V3. Test question A-L4D2-03 ("tips for playing as the hunter in versus", Speed)
attached "Surviving Hunters and Jockeys in versus" instead of "Playing as the Hunter".
Does not: Cover meaning search (no vectors are built here).
"""

import re
import tempfile
import unittest
from pathlib import Path

from backend.knowledge.knowledge_base_service import close_connection, resolve_corpus_db_path, retrieve_knowledge_context
from build_rag_db_loader import load_build_rag_db

LEFT_4_DEAD_2 = "550"
_HEADER_RE = re.compile(r"^\[.*: (.*?)\].*\(trust: [^)]+\)\s*$", re.M)


def _build_real_library(root: str) -> dict:
    """The whole shipped library (seed, every notes file, tips), word search only, under ``root``."""
    builder = load_build_rag_db()
    # No embedding model on purpose: never reach Ollama from a unit test.
    builder._list_installed_ollama_tags = lambda *args, **kwargs: []
    out_dir = Path(root) / "out"
    builder.build_corpus(out_dir, seed=True, allow_missing_embeddings=True)
    return {"use_local_knowledge_base": True, "rag_hybrid_retrieval_enabled": False, "rag_corpus_path": str(out_dir)}


class PlayingAsTheInfectedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.settings = _build_real_library(cls._tmp.name)

    @classmethod
    def tearDownClass(cls):
        close_connection(resolve_corpus_db_path(cls.settings))
        cls._tmp.cleanup()

    def attached(self, question: str, ask_mode: str = "speed") -> list[str]:
        result = retrieve_knowledge_context(
            self.settings,
            ask_mode=ask_mode,
            question=question,
            app_id=LEFT_4_DEAD_2,
            app_name="",
            text_resolved_title="",
            domain="strategy",
            pc_ip="",
        )
        return [m.group(1) for m in _HEADER_RE.finditer(result.text_block or "")]

    def test_the_hunter_question_in_speed_attaches_playing_as_the_hunter(self):
        self.assertEqual(self.attached("tips for playing as the hunter in versus"), ["Playing as the Hunter"])

    def test_the_same_question_for_the_other_specials_attaches_their_own_note(self):
        for special in ("jockey", "smoker", "spitter"):
            with self.subTest(special=special):
                self.assertEqual(
                    self.attached(f"tips for playing as the {special} in versus"),
                    [f"Playing as the {special.capitalize()}"],
                )

    def test_a_survivor_question_still_finds_the_survivors_note(self):
        names = self.attached("how do survivors deal with a hunter and jockey in versus", ask_mode="strategy")
        self.assertIn("Surviving Hunters and Jockeys", names)


if __name__ == "__main__":
    unittest.main()
