"""Stop pressed before the first word ends the ask and lets go of the AI at once.

With the model not loaded, Ollama takes the question and says nothing until its first word, so the
Stop used to find no connection to close and the Deck's AI carried on until it was ready to speak.
These tests run the real ask (the real Stop call, the real model loop) against a local server that
takes the question and never answers: a Stop half a second in makes the server see its client gone
within a second, the ask ends as cancelled within a second, and no second request (a retry, or the
next model in the try order) ever reaches the server. They also pin that an older Stop never shuts a
newer question's socket.
"""

import asyncio
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask import ollama_stop_service as svc  # noqa: E402
from backend.ask.ollama_ask_service import run_ask_ollama  # noqa: E402
from main import Plugin  # noqa: E402
from silent_ollama_server import SilentOllamaServer  # noqa: E402


class QuietLogger:
    def _rec(self, *_a, **_k):
        pass

    info = warning = debug = exception = _rec


class FakeSocket:
    def __init__(self):
        self.shut = False

    def shutdown(self, _how):
        self.shut = True


class StopBeforeTheFirstWord(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.server = SilentOllamaServer()
        self.addCleanup(self.server.close)
        plugin = Plugin()

        async def load_settings():
            return {
                "model_policy_tier": "open_source_only", "model_policy_non_foss_unlocked": False,
                "model_allow_high_vram_fallbacks": False, "screenshot_attachment_preset": "low",
                "ai_character_enabled": False, "ollama_keep_alive": "", "capabilities": {},
            }

        async def no_log(*_a, **_k):
            return None

        plugin.load_settings = load_settings
        plugin._maybe_app_log = no_log
        plugin._build_system_prompt = lambda *a, **k: "system prompt"
        self.plugin = plugin

    async def _ask_and_stop(self):
        with (
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=["gemma4:e2b-it-qat", "gemma4:e2b"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.media.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("main.spawn_ollama_stop_thread"),
            patch("backend.ask.ollama_service.choose_window_tokens", return_value=4096),
        ):
            task = asyncio.create_task(
                run_ask_ollama(self.plugin, "hello", f"127.0.0.1:{self.server.port}", "", "", request_timeout_seconds=30)
            )
            try:
                self.assertTrue(await asyncio.to_thread(self.server.got_request.wait, 5), "no question reached the server")
                await asyncio.sleep(0.5)
                pressed = time.monotonic()
                await self.plugin.abort_background_game_ai()
                result = await asyncio.wait_for(task, 3)
                ended = time.monotonic() - pressed
            finally:
                if not task.done():
                    self.server.close()  # frees the call so the test can fail instead of hang
                    await asyncio.wait({task}, timeout=5)
        return result, ended, pressed

    async def test_the_ask_ends_as_cancelled_within_a_second(self):
        result, ended, _ = await self._ask_and_stop()
        self.assertTrue(result.get("cancelled"), result)
        self.assertLess(ended, 1.0)

    async def test_the_server_sees_its_client_gone_within_a_second(self):
        _, _, pressed = await self._ask_and_stop()
        self.assertTrue(await asyncio.to_thread(self.server.client_gone.wait, 1.0), "the AI still has a client")
        self.assertLess(self.server.client_gone_at[0] - pressed, 1.0)

    async def test_no_second_request_reaches_the_server(self):
        await self._ask_and_stop()
        await asyncio.sleep(0.7)
        self.assertEqual(self.server.requests_seen, 1, f"a retry or the next model asked again after Stop: {self.server.request_lines}")

    async def test_the_socket_slot_is_empty_afterwards(self):
        await self._ask_and_stop()
        self.assertIsNone(getattr(self.plugin, "_active_ollama_chat_socket", None))


class OlderStopLeavesNewerQuestionAlone(unittest.TestCase):
    def test_a_newer_questions_socket_is_never_shut_by_an_older_stop(self):
        plugin = Plugin()
        stopped_evt = threading.Event()
        plugin._chat_resp_ready_evt = threading.Event()  # the player asked again: a fresh event
        plugin._active_ollama_chat_http_response = None
        newer = FakeSocket()
        plugin._active_ollama_chat_socket = newer

        svc.close_stopped_chat_connection(plugin, stopped_evt, QuietLogger(), wait_seconds=0.01)
        self.assertFalse(newer.shut)

    def test_the_stopped_questions_own_socket_is_shut_at_once_with_no_thread(self):
        plugin = Plugin()
        evt = threading.Event()
        plugin._chat_resp_ready_evt = evt
        plugin._active_ollama_chat_http_response = None
        mine = FakeSocket()
        plugin._active_ollama_chat_socket = mine

        self.assertIsNone(svc.close_stopped_chat_connection(plugin, evt, QuietLogger()))
        self.assertTrue(mine.shut)

    def test_a_late_ending_old_call_does_not_clear_a_newer_questions_socket(self):
        plugin = Plugin()
        older = svc.record_chat_socket(plugin)
        older(FakeSocket())
        newer_sock = FakeSocket()
        plugin._active_ollama_chat_socket = newer_sock  # a newer question connected meanwhile
        older(None)
        self.assertIs(plugin._active_ollama_chat_socket, newer_sock)

    def test_a_socket_that_appears_after_stop_is_shut_as_it_appears(self):
        plugin = Plugin()
        plugin._abort_current_ollama_chat.set()
        late = FakeSocket()
        svc.record_chat_socket(plugin)(late)
        self.assertTrue(late.shut)


if __name__ == "__main__":
    unittest.main()
