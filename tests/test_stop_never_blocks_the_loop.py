"""Stop pressed before the first word must answer at once, not after a 1.5 second wait.

With no connection to the AI open yet (the model is loading, or reading the question), the Stop
call used to wait up to 1.5 seconds for one to open. That wait ran on the back end's one event loop,
so the status check that brings the "stopped" result, and any new question, queued behind it.
These tests pin that Stop returns and the request reads "cancelled" straight away, that a
connection opening shortly after Stop is still closed, and that a newer question's connection never is.
"""

import asyncio
import threading
import time
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask import ollama_stop_service as svc  # noqa: E402
from backend.ask.background_request_state import pending_background_state  # noqa: E402
from main import Plugin  # noqa: E402


class FakeResponse:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


class QuietLogger:
    def _rec(self, *_args, **_kwargs) -> None:
        pass

    info = warning = debug = exception = _rec


class StopBeforeTheConnectionOpens(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()
        self.request_id = 5
        self.plugin._background_state = pending_background_state(
            request_id=self.request_id,
            question="how do I beat this boss",
            app_id="",
            app_context="none",
            started_at=0.0,
        )
        self.plugin._reset_partial_stream_snapshot(self.request_id)
        # Model call started, connection not open, ready-event never set.
        self.stopped_evt = threading.Event()
        self.plugin._chat_resp_ready_evt = self.stopped_evt
        self.plugin._active_ollama_chat_http_response = None
        self.plugin._active_ollama_chat_pc_ip = ""
        self.plugin._active_ollama_chat_model = None

    async def asyncTearDown(self) -> None:
        self.stopped_evt.set()  # lets any waiting helper thread end

    async def test_stop_returns_at_once_and_the_status_reads_cancelled(self) -> None:
        started = time.monotonic()
        result = await self.plugin.abort_background_game_ai()
        took = time.monotonic() - started

        self.assertEqual(result, {"ok": True})
        self.assertLess(took, 0.3, "Stop waited for a connection that was never going to open")
        self.assertEqual(self.plugin._background_state.get("status"), "cancelled")

    async def test_the_event_loop_keeps_running_while_stop_is_handled(self) -> None:
        ticks = []

        async def ticker() -> None:
            for _ in range(5):
                ticks.append(time.monotonic())
                await asyncio.sleep(0.02)

        tick_task = asyncio.create_task(ticker())
        await asyncio.sleep(0)  # let the first tick happen before Stop starts
        await self.plugin.abort_background_game_ai()
        await tick_task
        gaps = [b - a for a, b in zip(ticks, ticks[1:])]
        self.assertLess(max(gaps), 0.3, "the loop was held while Stop waited")

    async def test_a_connection_that_opens_half_a_second_later_is_closed(self) -> None:
        late = FakeResponse()

        def open_late() -> None:
            time.sleep(0.5)
            self.plugin._active_ollama_chat_http_response = late
            self.stopped_evt.set()

        threading.Thread(target=open_late, daemon=True).start()
        await self.plugin.abort_background_game_ai()
        self.assertFalse(late.closed, "nothing was open at Stop time")
        for _ in range(100):
            if late.closed:
                break
            await asyncio.sleep(0.02)
        self.assertTrue(late.closed, "the late connection was left open")


class LateConnectionGuard(unittest.TestCase):
    def test_a_newer_questions_connection_is_never_closed(self) -> None:
        plugin = Plugin()
        stopped_evt = threading.Event()
        plugin._chat_resp_ready_evt = stopped_evt
        plugin._active_ollama_chat_http_response = None

        thread = svc.close_stopped_chat_connection(plugin, stopped_evt, QuietLogger(), wait_seconds=1.0)
        self.assertIsNotNone(thread)

        # The player asks again: a fresh ready-event, and the new question's own connection.
        newer = FakeResponse()
        plugin._chat_resp_ready_evt = threading.Event()
        plugin._active_ollama_chat_http_response = newer
        stopped_evt.set()
        thread.join(timeout=3)

        self.assertFalse(thread.is_alive())
        self.assertFalse(newer.closed)

    def test_an_open_connection_is_closed_without_a_thread(self) -> None:
        plugin = Plugin()
        evt = threading.Event()
        evt.set()
        plugin._chat_resp_ready_evt = evt
        resp = FakeResponse()
        plugin._active_ollama_chat_http_response = resp

        self.assertIsNone(svc.close_stopped_chat_connection(plugin, evt, QuietLogger()))
        self.assertTrue(resp.closed)


if __name__ == "__main__":
    unittest.main()
