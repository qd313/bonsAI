"""The streamed chat call lets go of its connection when Stop comes before any word has arrived.

Ollama sends its reply headers only when the first word is ready, so a cold model load kept the call
blocked, holding nothing to close. The call now reports its socket as soon as it is connected. These tests
run the real call against a local server that takes the question and never answers: the hook gets a live
socket before any reply exists, shutting that socket from another thread ends the call within a second,
and with the Stop flag set the result is the usual "cancelled" reply, not a failure.
"""

import threading
import time
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask.ollama_chat_stream import _stream_ollama_chat_once  # noqa: E402
from backend.core.abort_blocked_read import shut_socket  # noqa: E402
from silent_ollama_server import SilentOllamaServer  # noqa: E402


class QuietLogger:
    def _rec(self, *_a, **_k):
        pass

    info = warning = debug = exception = _rec


def run_call(url, stop_flag, hook, results):
    results["reply"] = _stream_ollama_chat_once(
        url, "m", [{"role": "user", "content": "hi"}], 30, QuietLogger(), {"num_predict": 50},
        "speed", "5m", stop_flag.is_set, None, None, None,
        requested_window_tokens=4096, on_connection_opened=hook,
    )
    results["ended_at"] = time.monotonic()


class StopBeforeTheFirstWord(unittest.TestCase):
    def setUp(self):
        self.server = SilentOllamaServer()
        self.addCleanup(self.server.close)
        self.stop_flag = threading.Event()
        self.sockets = []
        self.results = {}

    def start_call(self):
        thread = threading.Thread(
            target=run_call, args=(self.server.url, self.stop_flag, self.sockets.append, self.results), daemon=True
        )
        thread.start()
        self.assertTrue(self.server.got_request.wait(5), "the server never saw the question")
        return thread

    def test_the_socket_is_handed_over_before_any_reply_exists(self):
        thread = self.start_call()
        self.assertIsNotNone(self.sockets[0], "no socket was reported while the server was still silent")
        self.assertTrue(thread.is_alive(), "the call ended although the server never answered")
        self.assertNotIn("reply", self.results)
        self.stop_flag.set()
        shut_socket(self.sockets[0])
        thread.join(5)

    def test_shutting_the_socket_ends_the_call_as_cancelled_within_a_second(self):
        thread = self.start_call()
        self.stop_flag.set()
        stopped_at = time.monotonic()
        shut_socket(self.sockets[0])
        thread.join(5)
        self.assertFalse(thread.is_alive(), "the call stayed blocked after its socket was shut")
        self.assertLess(self.results["ended_at"] - stopped_at, 1.0)
        self.assertTrue(self.results["reply"].get("cancelled"), self.results["reply"])
        self.assertTrue(self.server.client_gone.wait(1), "the server still sees its client")

    def test_the_hook_is_cleared_when_the_call_is_over(self):
        thread = self.start_call()
        self.stop_flag.set()
        shut_socket(self.sockets[0])
        thread.join(5)
        self.assertIsNone(self.sockets[-1], "the socket was left recorded after the call ended")

    def test_without_a_stop_a_dropped_connection_is_still_an_error_not_a_cancel(self):
        thread = self.start_call()
        shut_socket(self.sockets[0])
        thread.join(5)
        reply = self.results["reply"]
        self.assertFalse(reply.get("success"))
        self.assertFalse(reply.get("cancelled"))


if __name__ == "__main__":
    unittest.main()
