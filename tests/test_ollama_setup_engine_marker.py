"""Title: A setup run that is stopped never ends an engine an earlier run left running

Purpose: On a Deck with no systemd unit, setup starts `ollama serve` itself, and that engine then stays up as
the person's everyday AI. A later setup run reuses it. Stopping that later run (or switching Internet
downloads off, which stops the run) used to end the engine, because setup still remembered "I started it".
Pins the level the Deck shows: after the second run is stopped, the AI still answers.
Used for: local_ollama_setup_service.py (run_local_setup and the "started by setup" marker).
Does not: Start a real engine (tests/ollama_fake_ai.py stands in).
"""

from __future__ import annotations

import asyncio
import unittest
from contextlib import ExitStack
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_fake_ai import FakeAI, run_custom_setup, update_run_that_replaces_the_ai  # noqa: E402

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402

S = "backend.ollama.local_ollama_setup_service"


class AStoppedRunLeavesTheEverydayAiRunning(unittest.TestCase):
    def setUp(self) -> None:
        setup.forget_setup_started_ollama_serve()

    def _run(self, ai: FakeAI, pull, *, cancel_event: asyncio.Event) -> dict:
        return run_custom_setup(ai, pull, cancel_event)

    def test_run_two_reuses_the_engine_run_one_started_and_a_stop_does_not_end_it(self):
        ai = FakeAI(up=False)
        first = self._run(ai, lambda *a: (True, ""), cancel_event=asyncio.Event())
        self.assertEqual(first["phase"], "done")
        self.assertTrue(ai.up)
        self.assertEqual(ai.started, 1)

        second_cancel = asyncio.Event()

        def stopped_pull(*args):
            second_cancel.set()
            return False, "Cancelled."

        second = self._run(ai, stopped_pull, cancel_event=second_cancel)
        self.assertEqual(second["phase"], "cancelled")
        self.assertEqual(ai.started, 1, "run two should have reused the engine")
        self.assertTrue(ai.up, "stopping run two ended the AI the person is using")

    def test_an_engine_the_connection_tests_wake_up_started_is_not_ended_by_a_later_stop(self):
        ai = FakeAI(up=False)
        with ExitStack() as stack:
            stack.enter_context(patch(f"{S}.probe_ollama_http_ok", side_effect=ai.probe))
            stack.enter_context(patch(f"{S}.time.sleep"))
            stack.enter_context(patch("subprocess.Popen", side_effect=ai.popen))
            self.assertTrue(setup.ensure_ollama_server_listening_before_pull(lambda _m: None, "/x/ollama", lambda: False))
        cancel = asyncio.Event()

        def stopped_pull(*args):
            cancel.set()
            return False, "Cancelled."

        state = self._run(ai, stopped_pull, cancel_event=cancel)
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(ai.up, "a Stop ended an engine this run did not start")

    def test_a_stop_still_ends_an_engine_the_stopped_run_started_itself(self):
        ai = FakeAI(up=False)
        cancel = asyncio.Event()

        def stopped_pull(*args):
            cancel.set()
            return False, "Cancelled."

        state = self._run(ai, stopped_pull, cancel_event=cancel)
        self.assertEqual(state["phase"], "cancelled")
        self.assertFalse(ai.up, "an engine started only for the stopped run should not be left behind")


class AStopAfterTheRunReplacedTheAiLeavesAnAiRunning(unittest.TestCase):
    """The restart step stops the person's AI and starts the run's own; a later Stop must not leave nothing."""

    def setUp(self) -> None:
        setup.forget_setup_started_ollama_serve()

    def _update_then_stop(self, ai: FakeAI) -> dict:
        cancel = asyncio.Event()

        def stopped_pull(*args):
            cancel.set()
            return False, "Cancelled."

        return run_custom_setup(ai, stopped_pull, cancel, profile="update_installed", extra=update_run_that_replaces_the_ai(ai))

    def test_a_stop_during_the_model_downloads_leaves_the_replacement_ai_running(self):
        ai = FakeAI(up=True)
        state = self._update_then_stop(ai)
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(ai.started, 1, "the restart step should have started the run's own engine")
        self.assertTrue(ai.up, "the AI the person was using was replaced, then switched off by Stop")


if __name__ == "__main__":
    unittest.main()
