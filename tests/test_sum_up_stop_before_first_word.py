"""Sum up this chat: a Stop (or the summary's own time limit) before the first word ends the AI's work.

The summary is one streamed call to the same AI as an answer, and it waits for a first word the same
way: a model that is still loading says nothing for a minute or two, and the call held nothing a Stop
could close. These tests run the real button job (the real Stop call, the real summary call) against a
local server that takes the request and never answers. A Stop half a second in makes the server see its
client gone within a second and the job read "cancelled" with no error line and no second request. A
time limit that passes with no word wakes the call and still reads as the timeout it always was.
"""

import asyncio
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.chats import chat_summary_service as summary_service  # noqa: E402
from backend.chats.chat_sum_up_job import SUM_UP_FAILURE_LINE  # noqa: E402
from backend.chats.chat_summary_failure import REASON_TIMED_OUT  # noqa: E402
from backend.chats.chat_summary_service import SummaryOutcome, SummaryPlan, write_chat_summary  # noqa: E402
from fake_ollama_stream import FakePlugin  # noqa: E402
from silent_ollama_server import SilentOllamaServer  # noqa: E402
from test_chat_sum_up_job import ChatSlotJobTestCase, _seed_chat  # noqa: E402


class StopDuringTheSumUpButtonJob(ChatSlotJobTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.server = SilentOllamaServer()
        self.addCleanup(self.server.close)
        for p in (
            patch.object(type(self.plugin), "load_settings", return_value={}),
            patch(
                "backend.chats.chat_sum_up_job._pick_model_and_window",
                return_value=("test-model", 4096, self.server.url),
            ),
            patch("main.spawn_ollama_stop_thread"),
        ):
            p.start()
            self.addCleanup(p.stop)

    async def test_a_stop_before_the_first_word_lets_go_of_the_ai_and_reads_cancelled(self) -> None:
        sid = _seed_chat(self.tmp, turns=60)
        ack = await self.plugin.sum_up_chat_slot(sid, "127.0.0.1")
        self.assertTrue(ack.get("accepted"), ack)
        task = self.plugin._background_task
        try:
            self.assertTrue(await asyncio.to_thread(self.server.got_request.wait, 5), "no summary request arrived")
            await asyncio.sleep(0.5)
            pressed = time.monotonic()
            await self.plugin.abort_background_game_ai()
            self.assertTrue(await asyncio.to_thread(self.server.client_gone.wait, 1.0), "the AI still has a client")
            self.assertLess(self.server.client_gone_at[0] - pressed, 1.0)
        finally:
            self.server.close()
            if task is not None:
                await asyncio.wait({task}, timeout=5)
        state = self.plugin._background_state
        self.assertEqual(state.get("status"), "cancelled")
        self.assertFalse(state.get("error"))
        self.assertNotEqual(state.get("response"), SUM_UP_FAILURE_LINE)
        self.assertEqual(self.server.requests_seen, 1, "a second attempt reached the server")

    async def test_a_stopped_summary_that_reaches_the_job_still_ends_as_cancelled_not_failed(self) -> None:
        """The call's own "stopped" result must not be turned into the failure line under the button."""

        async def stopped(*_a, **_k):
            return SummaryOutcome(status="stopped", summary=None, seconds=0.2, error="")

        sid = _seed_chat(self.tmp, turns=60)
        with patch("backend.chats.chat_sum_up_job.write_chat_summary", stopped):
            ack = await self.plugin.sum_up_chat_slot(sid, "127.0.0.1")
            self.assertTrue(ack.get("accepted"), ack)
            await asyncio.wait_for(self.plugin._background_task, 5)
        state = self.plugin._background_state
        self.assertEqual(state.get("status"), "cancelled")
        self.assertFalse(state.get("error"))
        self.assertFalse(state.get("success"))
        self.assertNotEqual(state.get("response"), SUM_UP_FAILURE_LINE)
        self.assertFalse(state.get("streaming"))


class TheSummarysOwnTimeLimit(unittest.IsolatedAsyncioTestCase):
    async def test_a_deadline_with_no_word_wakes_the_call_and_reads_as_a_timeout(self) -> None:
        server = SilentOllamaServer()
        self.addCleanup(server.close)
        real_stream = summary_service._stream_ollama_chat_once

        def long_socket_wait(url, model, messages, _timeout, *rest, **kw):
            # The socket's own wait is lengthened so only the summary's deadline timer can end the call.
            return real_stream(url, model, messages, 30, *rest, **kw)

        turns = [{"id": f"q{i}", "role": "user", "text": f"question {i}"} for i in range(6)]
        plan = SummaryPlan(needed=True, covered_turns=turns, kept_turns=[], oldest_turns_unread=0, previous=None)
        started = time.monotonic()
        with (
            patch.object(summary_service, "SUMMARY_TIME_LIMIT_SECONDS", 0.8),
            patch.object(summary_service, "_stream_ollama_chat_once", long_socket_wait),
        ):
            try:
                outcome = await asyncio.wait_for(
                    write_chat_summary(
                        FakePlugin(), chat={"turns": turns}, plan=plan, model_name="m", url=server.url,
                        keep_alive="5m", window_tokens=4096, reply_language="english", request_id=1,
                    ),
                    4,
                )
            finally:
                server.close()
        self.assertLess(time.monotonic() - started, 2.5, "the deadline did not end the call")
        self.assertEqual(outcome.status, "timed_out")
        self.assertEqual(outcome.reason, REASON_TIMED_OUT)
        self.assertEqual(outcome.error, "Summary timed out.")


if __name__ == "__main__":
    unittest.main()
