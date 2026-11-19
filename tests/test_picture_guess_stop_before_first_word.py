"""A Stop pressed while the picture guess is waiting for the model's first word ends it at once.

The guess is one short streamed call. Before the model has loaded, or read the picture, it has no reply
to close, so a Stop could only wait. This runs the real guess call against a local server that takes the
request and never answers, presses the real Stop path half a second in, and checks the guess ends as
"stopped" within a second and the server sees its client gone.
"""

import asyncio
import threading
import time
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask.ollama_stop_service import close_stopped_chat_connection  # noqa: E402
from backend.ask.picture_guess import ask_picture_guess  # noqa: E402
from fake_ollama_stream import FakePlugin  # noqa: E402
from silent_ollama_server import SilentOllamaServer  # noqa: E402


class QuietLogger:
    def _rec(self, *_a, **_k):
        pass

    info = warning = debug = exception = _rec


class PictureGuessStopBeforeFirstWord(unittest.IsolatedAsyncioTestCase):
    async def test_a_stop_before_the_first_word_ends_the_guess_as_stopped_within_a_second(self):
        server = SilentOllamaServer()
        self.addCleanup(server.close)
        plugin = FakePlugin()
        task = asyncio.create_task(
            ask_picture_guess(plugin, url=server.url, model_name="m", image_b64="aGk=", keep_alive="5m", window_tokens=4096)
        )
        try:
            self.assertTrue(await asyncio.to_thread(server.got_request.wait, 5))
            await asyncio.sleep(0.5)
            pressed = time.monotonic()
            plugin._abort_current_ollama_chat.set()
            close_stopped_chat_connection(plugin, plugin._chat_resp_ready_evt, QuietLogger())
            outcome = await asyncio.wait_for(task, 3)
        finally:
            if not task.done():
                server.close()
                await asyncio.wait({task}, timeout=5)
        self.assertEqual(outcome.status, "stopped")
        self.assertLess(time.monotonic() - pressed, 1.0)
        self.assertTrue(await asyncio.to_thread(server.client_gone.wait, 1.0), "the AI still has a client")
        self.assertEqual(server.requests_seen, 1)


if __name__ == "__main__":
    unittest.main()
