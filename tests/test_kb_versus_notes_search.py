"""Title: A question about playing the infected side finds that note, not the survivors' side of it

Purpose: Pin what a player sees on the Left 4 Dead 2 versus notes. Asking for tips on playing as one
special infected, with "versus" in the question, attaches the note about playing that infected --
not the note about surviving it, which used to win on the word "versus" sitting in its name.
Used for: data/kb/notes/left-4-dead-2-versus.json (the survivors' notes' names).
Solves: plan 103, lane V3. Test question A-L4D2-03 ("tips for playing as the hunter in versus", Speed)
attached "Surviving Hunters and Jockeys in versus" instead of "Playing as the Hunter".
Does not: Cover meaning search (no vectors are built here).
"""

import tempfile
import unittest

from backend.knowledge.knowledge_base_service import close_connection, resolve_corpus_db_path, retrieve_knowledge_context
from kb_real_library_support import HEADER_RE, LEFT_4_DEAD_2, build_real_library


class PlayingAsTheInfectedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.settings = build_real_library(cls._tmp.name)

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
        return [m.group(1) for m in HEADER_RE.finditer(result.text_block or "")]

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
