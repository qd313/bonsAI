"""Unit tests for chat_sum_up_job.py -- the Session tab's own *Sum up this chat* button.

Orchestration only: whether the job accepts, refuses or does nothing, what it leaves in the
chat file and the background status, and that Stop leaves no trace. What the summary call
itself does with a real model is chat_summary_service.py's own job and already covered by
tests/test_chat_summary_service.py, so ``write_chat_summary`` is faked here with a controlled
``SummaryOutcome`` rather than a real (or fake-network) model call.
"""

import asyncio
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.chat_slot_service import (  # noqa: E402
    append_turn,
    create_slot,
    load_slot,
)
from backend.services.chat_summary_service import (  # noqa: E402
    SummaryOutcome,
    reset_last_memory_allowance,
)
from main import Plugin  # noqa: E402

_FIXED_MODEL_AND_WINDOW = ("test-model", 16384, "http://127.0.0.1:11434/api/chat")


def _seed_chat(settings_dir: str, *, turns: int, label: str = "chat") -> str:
    """A chat with ``turns`` question/answer pairs, long enough that a real ``plan_summary``
    call (the default memory allowance, since no real Ask has planned one this session) says
    it has outgrown its room once ``turns`` is large."""
    slot = create_slot(settings_dir, label=label)
    sid = slot["id"]
    for i in range(turns):
        append_turn(settings_dir, sid, role="user", text=f"question number {i}")
        append_turn(settings_dir, sid, role="assistant", text=f"answer number {i} " * 20)
    return sid


def _slow_write_returning(gate: asyncio.Event, outcome: SummaryOutcome):
    """A ``write_chat_summary`` stand-in that signals ``gate`` the moment it starts, then sits
    past any test's own patience -- for a test that needs to catch the job mid-flight, either to
    find it busy from outside or to Stop it, before letting it finish with ``outcome``."""

    async def _write(*_a, **_k):
        gate.set()
        await asyncio.sleep(5)
        return outcome

    return _write


class ChatSlotJobTestCase(unittest.IsolatedAsyncioTestCase):
    """Shared setup for a test that needs a real Plugin talking to a real (temp-dir) chat-slot
    store -- reused by tests/test_chat_can_sum_up.py's own RPC-level tests rather than copied,
    since both need exactly this: a fresh settings dir, a Plugin pointed at it, and a clean slate
    for chat_summary_service's per-model allowance memory."""

    async def asyncSetUp(self) -> None:
        reset_last_memory_allowance()
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = tmp.name
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin = Plugin()


class ChatSumUpJobTests(ChatSlotJobTestCase):
    def _patched(self, *, write_chat_summary=None):
        """Every patch every test in this class needs: a settings load that never touches
        disk, and a fixed model/window so no test needs a real Ollama connection."""
        patches = [
            patch.object(Plugin, "load_settings", return_value={}),
            patch(
                "backend.services.chat_sum_up_job._pick_model_and_window",
                return_value=_FIXED_MODEL_AND_WINDOW,
            ),
        ]
        if write_chat_summary is not None:
            patches.append(
                patch("backend.services.chat_sum_up_job.write_chat_summary", write_chat_summary)
            )
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    async def test_blank_slot_id_is_invalid(self) -> None:
        self._patched()
        result = await self.plugin.sum_up_chat_slot("")
        self.assertEqual(result, {"accepted": False, "status": "invalid"})

    async def test_unknown_slot_id_is_invalid(self) -> None:
        self._patched()
        result = await self.plugin.sum_up_chat_slot("does-not-exist")
        self.assertEqual(result, {"accepted": False, "status": "invalid"})

    async def test_nothing_to_do_on_a_short_chat(self) -> None:
        self._patched()
        sid = _seed_chat(self.tmp, turns=1)
        result = await self.plugin.sum_up_chat_slot(sid)
        self.assertEqual(result, {"accepted": False, "status": "nothing_to_do"})

    async def test_busy_while_an_ask_is_pending(self) -> None:
        self._patched()
        sid = _seed_chat(self.tmp, turns=60)
        gate = asyncio.Event()

        async def _slow_execute(*_a, **_k):
            gate.set()
            await asyncio.sleep(5)
            return {"success": True, "response": "done"}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=_slow_execute):
            with patch.object(Plugin, "_compose_opening_thinking_blurb", return_value=("Thinking…", None)):
                ack = await self.plugin.start_background_game_ai(
                    {"question": "how do I beat this boss", "PcIp": "127.0.0.1:11434"}
                )
                self.assertEqual(ack.get("status"), "pending")
                await asyncio.wait_for(gate.wait(), timeout=2.0)

                result = await self.plugin.sum_up_chat_slot(sid)
                self.assertEqual(result.get("status"), "busy")
                self.assertFalse(result.get("accepted"))

                self.plugin._background_task.cancel()
                try:
                    await self.plugin._background_task
                except asyncio.CancelledError:
                    pass

    async def test_an_ask_is_refused_as_busy_while_a_sum_up_is_pending(self) -> None:
        gate = asyncio.Event()
        outcome = SummaryOutcome(status="written", summary={"text": "notes"}, seconds=1.0, error="")
        self._patched(write_chat_summary=_slow_write_returning(gate, outcome))
        sid = _seed_chat(self.tmp, turns=60)

        ack = await self.plugin.sum_up_chat_slot(sid)
        self.assertEqual(ack.get("status"), "pending")
        await asyncio.wait_for(gate.wait(), timeout=2.0)

        with patch.object(Plugin, "_compose_opening_thinking_blurb", return_value=("Thinking…", None)):
            busy = await self.plugin.start_background_game_ai(
                {"question": "and what about that", "PcIp": "127.0.0.1:11434"}
            )
        self.assertEqual(busy.get("status"), "busy")

        self.plugin._background_task.cancel()
        try:
            await self.plugin._background_task
        except asyncio.CancelledError:
            pass

    async def test_a_written_summary_lands_in_the_chat_file_with_kind_sum_up_and_no_new_turn(
        self,
    ) -> None:
        summary = {
            "text": "The player is exploring the ruins.",
            "covers_through_turn_id": "does-not-matter-here",
            "turns_covered": 60,
            "oldest_turns_unread": 0,
            "hidden_notes_left_out": 0,
            "written_at": "2026-09-25T00:00:00Z",
            "seconds": 4.2,
            "model": "test-model",
        }

        async def _write(*_a, **_k):
            return SummaryOutcome(status="written", summary=summary, seconds=4.2, error="")

        self._patched(write_chat_summary=_write)
        sid = _seed_chat(self.tmp, turns=60)
        before = load_slot(self.tmp, sid)
        turn_count_before = len(before["turns"])

        ack = await self.plugin.sum_up_chat_slot(sid)
        self.assertTrue(ack.get("accepted"))
        self.assertEqual(ack.get("status"), "pending")
        await self.plugin._background_task

        self.assertEqual(self.plugin._background_state.get("status"), "completed")
        self.assertEqual(self.plugin._background_state.get("kind"), "sum_up")
        self.assertEqual(self.plugin._background_state.get("chat_slot_id"), sid)

        after = load_slot(self.tmp, sid)
        self.assertEqual(after["summary"]["text"], summary["text"])
        self.assertEqual(len(after["turns"]), turn_count_before, "the button must save no turn")

    async def test_a_failed_call_finishes_failed_with_the_plain_line(self) -> None:
        async def _write(*_a, **_k):
            return SummaryOutcome(status="failed", summary=None, seconds=0.4, error="boom")

        self._patched(write_chat_summary=_write)
        sid = _seed_chat(self.tmp, turns=60)

        ack = await self.plugin.sum_up_chat_slot(sid)
        await self.plugin._background_task

        self.assertEqual(self.plugin._background_state.get("status"), "failed")
        self.assertEqual(
            self.plugin._background_state.get("response"), "Couldn't sum up the chat this time."
        )
        after = load_slot(self.tmp, sid)
        self.assertIsNone(after["summary"])

    async def test_stop_mid_job_leaves_no_summary_and_no_turn(self) -> None:
        gate = asyncio.Event()
        outcome = SummaryOutcome(
            status="written", summary={"text": "should never be saved"}, seconds=1.0, error=""
        )
        self._patched(write_chat_summary=_slow_write_returning(gate, outcome))
        sid = _seed_chat(self.tmp, turns=60)
        before = load_slot(self.tmp, sid)
        turn_count_before = len(before["turns"])

        ack = await self.plugin.sum_up_chat_slot(sid)
        self.assertTrue(ack.get("accepted"))
        await asyncio.wait_for(gate.wait(), timeout=2.0)

        task = self.plugin._background_task
        await self.plugin.abort_background_game_ai()

        self.assertEqual(self.plugin._background_state.get("status"), "cancelled")
        self.assertEqual(self.plugin._background_state.get("kind"), "sum_up")

        try:
            await task
        except asyncio.CancelledError:
            pass

        after = load_slot(self.tmp, sid)
        self.assertIsNone(after["summary"])
        self.assertEqual(len(after["turns"]), turn_count_before)


if __name__ == "__main__":
    unittest.main()
