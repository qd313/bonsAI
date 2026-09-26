"""Plan 68 step 2: Plugin.chat_for_request and the chat_summary mark on a finished answer.

chat_for_request is the one loader chat_turns_for_request now reads through too, so these tests
cover both: the request's chat as {id, turns, summary, subject, origin_app_id, origin_app_name},
empty on an unknown request, and how a background request's own chat_summary result value reaches
both the saved turn and the terminal status the screen can paint from before it reloads the chat.
"""

import sys
import tempfile
import types
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

# Unix-only stdlib stub for Windows dev hosts (main.py -> screenshot_media imports pwd). Not part
# of the shared stub above -- run_python_tests.py installs this one process-wide for the whole
# suite, but a lone `python -m unittest` run of just this file needs it too.
if "pwd" not in sys.modules:
    _pwd = types.ModuleType("pwd")
    _pwd.getpwuid = lambda _uid: types.SimpleNamespace(pw_dir="/tmp")
    sys.modules["pwd"] = _pwd

from backend.services.chat_slot_service import (  # noqa: E402
    append_turn,
    create_slot,
    load_slot,
    save_slot_subject,
    save_slot_summary,
    wipe_all_slots,
)
from main import Plugin  # noqa: E402


class ChatForRequestTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = tmp.name
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin = Plugin()
        wipe_all_slots(self.tmp)

    async def test_returns_the_chat_with_its_summary_and_subject(self):
        slot = create_slot(
            self.tmp, first_question="wheatley fight", origin_app_id="620", app_name="Portal 2"
        )
        sid = slot["id"]
        append_turn(self.tmp, sid, role="user", text="wheatley fight")
        summary = {
            "text": "The player is fighting Wheatley.",
            "covers_through_turn_id": "t1",
        }
        subject = {"game_key": "appid:620", "subject": "Wheatley"}
        save_slot_summary(self.tmp, sid, summary)
        save_slot_subject(self.tmp, sid, subject)

        self.plugin._chat_slot_by_request[42] = sid
        chat = self.plugin.chat_for_request(42)

        self.assertEqual(chat["id"], sid)
        self.assertEqual(len(chat["turns"]), 1)
        self.assertEqual(chat["turns"][0]["text"], "wheatley fight")
        self.assertEqual(chat["summary"]["text"], summary["text"])
        self.assertEqual(chat["subject"], subject)
        self.assertEqual(chat["origin_app_id"], "620")
        self.assertEqual(chat["origin_app_name"], "Portal 2")

    async def test_empty_for_an_unknown_request(self):
        self.assertEqual(self.plugin.chat_for_request(999999), {})

    async def test_empty_for_a_non_int_request_id(self):
        self.assertEqual(self.plugin.chat_for_request("not-an-int"), {})

    async def test_empty_when_the_request_has_no_chat_slot(self):
        # Never inserted into _chat_slot_by_request at all -- the ordinary shape of an Ask that
        # did not come from a saved chat.
        self.assertEqual(self.plugin.chat_for_request(7), {})

    async def test_chat_turns_for_request_reads_through_the_same_loader(self):
        slot = create_slot(self.tmp, first_question="how do I parry")
        sid = slot["id"]
        append_turn(self.tmp, sid, role="user", text="how do I parry")
        self.plugin._chat_slot_by_request[5] = sid
        turns = self.plugin.chat_turns_for_request(5)
        self.assertEqual(len(turns), 1)
        self.assertEqual(turns[0]["text"], "how do I parry")

    async def _run_background_ask(self, result: dict, *, chat_slot_id: str):
        async def fake_execute(*_args, **_kwargs):
            return result

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fake_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin, "_compose_opening_thinking_blurb", return_value=("Thinking…", None)
                ):
                    ack = await self.plugin.start_background_game_ai(
                        {
                            "question": "and what about that",
                            "PcIp": "127.0.0.1:11434",
                            "chat_slot_id": chat_slot_id,
                        }
                    )
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task
        return ack

    def _last_assistant_turn(self, sid: str) -> dict:
        loaded = load_slot(self.tmp, sid)
        assert loaded is not None
        assistant_turns = [t for t in loaded["turns"] if t.get("role") == "assistant"]
        return assistant_turns[-1]

    async def test_a_chat_summary_mark_reaches_the_saved_turn_and_the_terminal_state(self):
        """Both "written" and "failed" are real marks that have to ride both the saved turn (so
        a reopened chat still shows the note) and the terminal status (so the screen can paint it
        before the chat reloads)."""
        for mark in ("written", "failed"):
            with self.subTest(mark=mark):
                slot = create_slot(self.tmp, label=f"{mark} chat")
                sid = slot["id"]
                await self._run_background_ask(
                    {
                        "success": True,
                        "response": "An answer.",
                        "elapsed_seconds": 0.01,
                        "chat_summary": mark,
                    },
                    chat_slot_id=sid,
                )
                self.assertEqual(self._last_assistant_turn(sid).get("chat_summary"), mark)
                self.assertEqual(self.plugin._background_state.get("chat_summary"), mark)

    async def test_a_cancelled_result_saves_no_mark_even_if_chat_summary_was_set(self):
        """A stopped answer gets no mark, whatever the executor's result happened to carry --
        the same rule ``reasoning`` already follows on this path.
        """
        slot = create_slot(self.tmp, label="cancelled chat")
        sid = slot["id"]
        await self._run_background_ask(
            {
                "success": False,
                "cancelled": True,
                "response": "Request cancelled.",
                "elapsed_seconds": 0.01,
                "chat_summary": "written",
            },
            chat_slot_id=sid,
        )
        self.assertNotIn("chat_summary", self._last_assistant_turn(sid))
        self.assertIsNone(self.plugin._background_state.get("chat_summary"))

    async def test_no_chat_summary_in_the_result_leaves_the_state_field_none(self):
        slot = create_slot(self.tmp, label="ordinary chat")
        sid = slot["id"]
        await self._run_background_ask(
            {"success": True, "response": "An ordinary answer.", "elapsed_seconds": 0.01},
            chat_slot_id=sid,
        )
        self.assertIsNone(self.plugin._background_state.get("chat_summary"))


if __name__ == "__main__":
    unittest.main()
