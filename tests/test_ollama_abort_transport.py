"""Unit tests for the Stop-button transport helpers (backend.services.ollama_service).

`abort_background_game_ai` decides *when* to abort — that is plugin-level and stays in main.py.
These two helpers are *how*: close the live HTTP handle from another thread, and ask Ollama to
unload without blocking the UI. Both were inline in the RPC with no test.
"""

import threading
import unittest
from unittest import mock

from backend.services import ollama_stop_service
from backend.services.ollama_service import close_ollama_chat_response, spawn_ollama_stop_thread


class RecordingLogger:
    def __init__(self):
        self.info_calls = []
        self.warning_calls = []
        self.exception_calls = []

    def info(self, *args, **kwargs):
        self.info_calls.append(args)

    def warning(self, *args, **kwargs):
        self.warning_calls.append(args)

    def exception(self, *args, **kwargs):
        self.exception_calls.append(args)


class FakeResponse:
    def __init__(self, raises=None):
        self.raises = raises
        self.closed = False

    def close(self):
        if self.raises is not None:
            raise self.raises
        self.closed = True


class TestCloseOllamaChatResponse(unittest.TestCase):
    def test_none_response_is_a_no_op(self):
        log = RecordingLogger()
        self.assertIs(close_ollama_chat_response(None, log), False)
        self.assertEqual(log.info_calls, [])
        self.assertEqual(log.warning_calls, [])

    def test_closes_a_live_response(self):
        log = RecordingLogger()
        resp = FakeResponse()
        self.assertIs(close_ollama_chat_response(resp, log), True)
        self.assertTrue(resp.closed)
        self.assertEqual(len(log.info_calls), 1)

    def test_close_failure_is_logged_not_raised(self):
        """Stop must still complete if the handle is already dead — a common race."""
        log = RecordingLogger()
        resp = FakeResponse(raises=OSError("already closed"))
        self.assertIs(close_ollama_chat_response(resp, log), False)
        self.assertEqual(len(log.warning_calls), 1)

    def test_a_response_that_raises_on_close_does_not_propagate_any_exception_type(self):
        log = RecordingLogger()
        for exc in (ValueError("x"), RuntimeError("y"), AttributeError("z")):
            self.assertIs(close_ollama_chat_response(FakeResponse(raises=exc), log), False)


class TestSpawnOllamaStopThread(unittest.TestCase):
    def test_calls_the_abort_helper_with_the_host_and_model(self):
        seen = {}

        def fake_abort(*, pc_ip_field, model_name, logger):
            seen["pc_ip_field"] = pc_ip_field
            seen["model_name"] = model_name

        log = RecordingLogger()
        with mock.patch.object(ollama_stop_service, "best_effort_abort_ollama_inference", fake_abort):
            spawn_ollama_stop_thread("192.168.1.50", "qwen2.5:7b", log).join(timeout=5)
        self.assertEqual(seen, {"pc_ip_field": "192.168.1.50", "model_name": "qwen2.5:7b"})

    def test_non_string_model_becomes_none(self):
        seen = {}

        def fake_abort(*, pc_ip_field, model_name, logger):
            seen["model_name"] = model_name

        log = RecordingLogger()
        with mock.patch.object(ollama_stop_service, "best_effort_abort_ollama_inference", fake_abort):
            spawn_ollama_stop_thread("host", object(), log).join(timeout=5)
        self.assertIsNone(seen["model_name"])

    def test_helper_failure_is_logged_not_raised(self):
        """A background thread that raises would be silently lost; it must be logged instead."""

        def boom(**_kwargs):
            raise RuntimeError("unload failed")

        log = RecordingLogger()
        with mock.patch.object(ollama_stop_service, "best_effort_abort_ollama_inference", boom):
            spawn_ollama_stop_thread("host", "model", log).join(timeout=5)
        self.assertEqual(len(log.exception_calls), 1)

    def test_thread_is_a_named_daemon(self):
        """Daemon so a slow unload cannot block plugin shutdown."""
        log = RecordingLogger()
        with mock.patch.object(ollama_stop_service, "best_effort_abort_ollama_inference", lambda **_k: None):
            thread = spawn_ollama_stop_thread("host", "model", log)
        self.assertIsInstance(thread, threading.Thread)
        self.assertTrue(thread.daemon)
        self.assertEqual(thread.name, "bonsai-ollama-stop")
        thread.join(timeout=5)

    def test_returns_before_the_helper_finishes(self):
        """Stop must return to the UI immediately; the unload can take seconds."""
        release = threading.Event()
        started = threading.Event()

        def slow(**_kwargs):
            started.set()
            release.wait(timeout=5)

        log = RecordingLogger()
        with mock.patch.object(ollama_stop_service, "best_effort_abort_ollama_inference", slow):
            thread = spawn_ollama_stop_thread("host", "model", log)
            self.assertTrue(started.wait(timeout=5))
            self.assertTrue(thread.is_alive(), "spawn blocked until the unload finished")
            release.set()
            thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
