"""Plan 92, lane N3: the questions a person asked in their saved chats, for the Search tab.

The Search tab builds its word buttons and its matches from one list: every chat, with the questions the
person typed in it. ``list_chat_slot_questions`` (chat_slot_rpc.py, contract C6) answers that list, read
only, from the same store the chat list uses. These tests pin the shape the screen reads.
"""

import asyncio
import os
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import chat_slot_rpc  # noqa: E402
from backend.services.chat_slot_service import append_turn, create_slot, slot_path  # noqa: E402

_OWN_GAME = "backend.services.game_ai_request._chat_own_game_title"


class _FakePlugin:
    def __init__(self, directory: str):
        self._dir = directory
        self._chat_slots_store_lock = asyncio.Lock()

    def _chat_slots_settings_dir(self) -> str:
        return self._dir

    async def load_settings(self):
        return {}


def _run(directory: str) -> dict:
    return asyncio.run(chat_slot_rpc.list_chat_slot_questions(_FakePlugin(directory)))


class ListChatSlotQuestionsTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = tmp.name
        patcher = patch(_OWN_GAME, return_value="")
        self.own_game = patcher.start()
        self.addCleanup(patcher.stop)

    def test_an_empty_store_gives_an_empty_list_not_an_error(self):
        self.assertEqual(_run(self.tmp), {"ok": True, "chats": []})

    def test_only_the_persons_own_turns_come_back(self):
        sid = create_slot(self.tmp, label="Hollow Knight help")["id"]
        append_turn(self.tmp, sid, role="user", text="Where do I find the Mantis Claw?", app_name="Hollow Knight")
        append_turn(self.tmp, sid, role="assistant", text="In the Mantis Village.", app_name="Hollow Knight")
        chats = _run(self.tmp)["chats"]
        self.assertEqual(len(chats), 1)
        self.assertEqual(chats[0]["slot_id"], sid)
        self.assertEqual(chats[0]["label"], "Hollow Knight help")
        texts = [q["text"] for q in chats[0]["questions"]]
        self.assertEqual(texts, ["Where do I find the Mantis Claw?"])

    def test_the_display_text_is_preferred_to_the_composed_prompt(self):
        sid = create_slot(self.tmp, label="x")["id"]
        append_turn(
            self.tmp,
            sid,
            role="user",
            text="[Strategy follow-up] I'm at: the City of Tears",
            display_text="I'm at: the City of Tears",
            app_name="Hollow Knight",
        )
        append_turn(self.tmp, sid, role="user", text="How do I beat the Mantis Lords?", app_name="Hollow Knight")
        questions = _run(self.tmp)["chats"][0]["questions"]
        self.assertEqual([q["text"] for q in questions], ["I'm at: the City of Tears", "How do I beat the Mantis Lords?"])

    def test_each_question_carries_its_turn_id_game_and_time(self):
        sid = create_slot(self.tmp, label="x")["id"]
        append_turn(self.tmp, sid, role="user", text="What does the Dream Nail do?", app_id="367520", app_name="Hollow Knight")
        question = _run(self.tmp)["chats"][0]["questions"][0]
        self.assertEqual(question["app_id"], "367520")
        self.assertEqual(question["game_title"], "Hollow Knight")
        self.assertTrue(question["turn_id"])
        self.assertIsInstance(question["created_at"], int)
        self.assertEqual(set(question), {"turn_id", "text", "created_at", "app_id", "game_title"})

    def test_a_question_asked_with_no_game_running_gets_the_chats_own_game(self):
        # The Deck's Hollow Knight test chat: Hollow Knight is not installed there, so no turn carries a name.
        self.own_game.return_value = "Hollow Knight"
        sid = create_slot(self.tmp, label="x")["id"]
        append_turn(self.tmp, sid, role="user", text="How do I beat the Mantis Lords?")
        append_turn(self.tmp, sid, role="user", text="Is Hades easier?", app_name="Hades")
        questions = _run(self.tmp)["chats"][0]["questions"]
        self.assertEqual([q["game_title"] for q in questions], ["Hollow Knight", "Hades"])

    def test_the_chats_own_game_is_worked_out_once_per_chat(self):
        self.own_game.return_value = "Hollow Knight"
        sid = create_slot(self.tmp, label="x")["id"]
        for text in ("one one", "two two", "three three"):
            append_turn(self.tmp, sid, role="user", text=text)
        _run(self.tmp)
        self.assertEqual(self.own_game.call_count, 1)

    def test_no_game_anywhere_is_an_empty_string(self):
        sid = create_slot(self.tmp, label="x")["id"]
        append_turn(self.tmp, sid, role="user", text="hello there")
        self.assertEqual(_run(self.tmp)["chats"][0]["questions"][0]["game_title"], "")

    def test_chats_follow_the_index_order_and_questions_run_oldest_first(self):
        clock = iter(range(1_000, 2_000))
        with patch("backend.services.chat_slot_service.time.time", side_effect=lambda: next(clock)):
            first = create_slot(self.tmp, label="older chat")["id"]
            append_turn(self.tmp, first, role="user", text="first question")
            second = create_slot(self.tmp, label="newer chat")["id"]
            append_turn(self.tmp, second, role="user", text="alpha question")
            append_turn(self.tmp, second, role="user", text="beta question")
        chats = _run(self.tmp)["chats"]
        self.assertEqual([c["label"] for c in chats], ["newer chat", "older chat"])
        self.assertEqual([q["text"] for q in chats[0]["questions"]], ["alpha question", "beta question"])
        self.assertGreater(chats[0]["updated_at"], chats[1]["updated_at"])

    def test_a_chat_file_that_is_gone_is_skipped_not_fatal(self):
        keep = create_slot(self.tmp, label="kept")["id"]
        append_turn(self.tmp, keep, role="user", text="a real question")
        gone = create_slot(self.tmp, label="lost")["id"]
        os.remove(slot_path(self.tmp, gone))
        chats = _run(self.tmp)["chats"]
        self.assertEqual([c["slot_id"] for c in chats], [keep])

    def test_it_only_reads(self):
        sid = create_slot(self.tmp, label="x")["id"]
        append_turn(self.tmp, sid, role="user", text="a question")
        before = {name: os.path.getmtime(os.path.join(root, name)) for root, _d, files in os.walk(self.tmp) for name in files}
        _run(self.tmp)
        after = {name: os.path.getmtime(os.path.join(root, name)) for root, _d, files in os.walk(self.tmp) for name in files}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
