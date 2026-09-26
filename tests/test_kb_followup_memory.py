"""Tests for the knowledge-base follow-up memory (remember/recall/forget, and the phrasing and
search-words helpers built on top of it).
"""

import unittest

from backend.services import kb_followup_memory


class KbFollowupMemoryTests(unittest.TestCase):
    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    def test_remember_then_recall_same_game_returns_the_subject(self):
        kb_followup_memory.remember(
            app_id="2380520", app_name="Hades", text_resolved_title="", subject="Megara"
        )
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="2380520", app_name="Hades", text_resolved_title=""
            ),
            "Megara",
        )

    def test_recall_with_nothing_stored_is_blank(self):
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="2380520", app_name="Hades", text_resolved_title=""
            ),
            "",
        )

    def test_recall_falls_back_to_app_name_when_no_app_id(self):
        kb_followup_memory.remember(
            app_id="", app_name="Hades", text_resolved_title="", subject="Megara"
        )
        self.assertEqual(
            kb_followup_memory.recall(app_id="", app_name="Hades", text_resolved_title=""),
            "Megara",
        )

    def test_recall_falls_back_to_text_resolved_title_when_nothing_is_running(self):
        kb_followup_memory.remember(
            app_id="", app_name="", text_resolved_title="Hades", subject="Megara"
        )
        self.assertEqual(
            kb_followup_memory.recall(app_id="", app_name="", text_resolved_title="Hades"),
            "Megara",
        )

    def test_a_game_change_clears_the_memory(self):
        kb_followup_memory.remember(
            app_id="2380520", app_name="Hades", text_resolved_title="", subject="Megara"
        )
        # Asking about a different game does not see Hades's subject...
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="548430", app_name="Deep Rock Galactic: Survivor", text_resolved_title=""
            ),
            "",
        )
        # ...and the switch clears the old game's memory rather than merely hiding it: asking
        # about Hades again afterwards does not get Megara back.
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="2380520", app_name="Hades", text_resolved_title=""
            ),
            "",
        )

    def test_forget_clears_the_memory(self):
        kb_followup_memory.remember(
            app_id="2380520", app_name="Hades", text_resolved_title="", subject="Megara"
        )
        kb_followup_memory.forget()
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="2380520", app_name="Hades", text_resolved_title=""
            ),
            "",
        )

    def test_remembering_a_blank_subject_stores_nothing(self):
        kb_followup_memory.remember(
            app_id="2380520", app_name="Hades", text_resolved_title="", subject="   "
        )
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="2380520", app_name="Hades", text_resolved_title=""
            ),
            "",
        )

    def test_remembering_with_no_game_identity_stores_nothing(self):
        kb_followup_memory.remember(
            app_id="", app_name="", text_resolved_title="", subject="Megara"
        )
        self.assertEqual(
            kb_followup_memory.recall(app_id="", app_name="", text_resolved_title=""), ""
        )


class PerChatMemoryTests(unittest.TestCase):
    """Plan 68 step 2: one remembered subject per chat, not one for the whole process."""

    def setUp(self):
        kb_followup_memory.forget()

    def tearDown(self):
        kb_followup_memory.forget()

    @staticmethod
    def _remember_hades(subject: str, *, chat_id: str = "") -> None:
        kb_followup_memory.remember(
            app_id="2380520",
            app_name="Hades",
            text_resolved_title="",
            subject=subject,
            chat_id=chat_id,
        )

    @staticmethod
    def _recall_hades(*, chat_id: str = "") -> str:
        return kb_followup_memory.recall(
            app_id="2380520", app_name="Hades", text_resolved_title="", chat_id=chat_id
        )

    def test_two_chats_keep_two_different_subjects(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self._remember_hades("Theseus", chat_id="chat-b")
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "Megara")
        self.assertEqual(self._recall_hades(chat_id="chat-b"), "Theseus")

    def test_a_new_chat_id_has_nothing_remembered(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self.assertEqual(self._recall_hades(chat_id="chat-new"), "")

    def test_a_game_change_in_one_chat_does_not_clear_the_other(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self._remember_hades("Theseus", chat_id="chat-b")
        # chat-a asks about a different game -- its own memory changes...
        self.assertEqual(
            kb_followup_memory.recall(
                app_id="548430",
                app_name="Deep Rock Galactic: Survivor",
                text_resolved_title="",
                chat_id="chat-a",
            ),
            "",
        )
        # ...but chat-b's remembered subject is untouched.
        self.assertEqual(self._recall_hades(chat_id="chat-b"), "Theseus")

    def test_the_no_chat_entry_still_works_two_calls_in_a_row(self):
        """scripts/eval_kb_answers.py relies on this: two calls with no chat_id at all remember
        each other, the same as passing chat_id="" explicitly."""
        self._remember_hades("Megara")
        self.assertEqual(self._recall_hades(), "Megara")

    def test_forget_with_a_chat_id_only_forgets_that_chat(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self._remember_hades("Theseus", chat_id="chat-b")
        kb_followup_memory.forget(chat_id="chat-a")
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "")
        self.assertEqual(self._recall_hades(chat_id="chat-b"), "Theseus")

    def test_forget_with_no_argument_forgets_every_chat(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self._remember_hades("Theseus", chat_id="chat-b")
        kb_followup_memory.forget()
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "")
        self.assertEqual(self._recall_hades(chat_id="chat-b"), "")

    def test_seed_loads_a_chats_subject_when_nothing_is_remembered_yet(self):
        kb_followup_memory.seed("chat-a", {"game_key": "appid:2380520", "subject": "Megara"})
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "Megara")

    def test_seed_does_not_overwrite_a_live_record(self):
        self._remember_hades("Megara", chat_id="chat-a")
        # A stale file says something else -- the live, just-asked record must win.
        kb_followup_memory.seed("chat-a", {"game_key": "appid:2380520", "subject": "Theseus"})
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "Megara")

    def test_seed_with_none_does_nothing(self):
        kb_followup_memory.seed("chat-a", None)
        self.assertEqual(self._recall_hades(chat_id="chat-a"), "")

    def test_snapshot_returns_none_when_nothing_is_remembered(self):
        self.assertIsNone(kb_followup_memory.snapshot("chat-a"))

    def test_snapshot_returns_the_remembered_pair(self):
        self._remember_hades("Megara", chat_id="chat-a")
        self.assertEqual(
            kb_followup_memory.snapshot("chat-a"),
            {"game_key": "appid:2380520", "subject": "Megara"},
        )


class LooksLikeFollowupTests(unittest.TestCase):
    def test_what_about_her_second_phase_reads_as_a_followup(self):
        self.assertTrue(kb_followup_memory.looks_like_followup("what about her second phase"))

    def test_what_about_its_second_phase_reads_as_a_followup(self):
        self.assertTrue(kb_followup_memory.looks_like_followup("what about its second phase"))

    def test_how_about_the_next_one_reads_as_a_followup(self):
        self.assertTrue(kb_followup_memory.looks_like_followup("how about the next one"))

    def test_and_the_third_phase_reads_as_a_followup(self):
        self.assertTrue(kb_followup_memory.looks_like_followup("and the third phase"))

    def test_a_short_question_leaning_on_it_reads_as_a_followup(self):
        self.assertTrue(kb_followup_memory.looks_like_followup("how do i beat it"))

    def test_a_fresh_named_question_does_not_read_as_a_followup(self):
        self.assertFalse(
            kb_followup_memory.looks_like_followup("how do i beat the glyphid dreadnought")
        )

    def test_a_long_sentence_that_happens_to_contain_it_is_not_a_followup(self):
        # Long enough that it is plainly spelling out its own question, not riding on the last one.
        long_question = (
            "how do i beat it when it keeps charging at me across the whole arena without "
            "any warning at all"
        )
        self.assertFalse(kb_followup_memory.looks_like_followup(long_question))

    def test_blank_question_is_not_a_followup(self):
        self.assertFalse(kb_followup_memory.looks_like_followup(""))


class AugmentSearchWordsTests(unittest.TestCase):
    def test_adds_the_remembered_subject_to_a_followup_question(self):
        out = kb_followup_memory.augment_search_words(
            "what about her second phase", remembered_subject="Megara"
        )
        self.assertEqual(out, "what about her second phase Megara")

    def test_leaves_a_non_followup_question_unchanged(self):
        out = kb_followup_memory.augment_search_words(
            "how do i beat the glyphid dreadnought", remembered_subject="Megara"
        )
        self.assertEqual(out, "how do i beat the glyphid dreadnought")

    def test_leaves_the_question_unchanged_when_nothing_is_remembered(self):
        out = kb_followup_memory.augment_search_words(
            "what about her second phase", remembered_subject=""
        )
        self.assertEqual(out, "what about her second phase")


if __name__ == "__main__":
    unittest.main()
