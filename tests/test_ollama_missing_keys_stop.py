"""Title: A Stop at the "missing keys" step after Clear all data leaves the AI running

Purpose: After Clear all data the Deck's Ollama can still answer while its key files are gone. Setup then stops
that Ollama, starts a fresh one so the keys are made, and waits for them. A Stop pressed in that gap used to
end the run with nothing running (the stop had been done, the restart was cancelled, and Stop's clean-up ended
the fresh one too). Pins the level the Deck shows: after the Stop the AI still answers.
Used for: ensure_ollama_cli_home_ready and run_local_setup in local_ollama_setup_service.py.
Does not: Start a real engine (tests/ollama_fake_ai.py stands in).
"""

from __future__ import annotations

import asyncio
import os
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_fake_ai import FakeAI, run_custom_setup  # noqa: E402

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402


class AStopWhileTheKeysAreMadeLeavesTheAiRunning(unittest.TestCase):
    def setUp(self) -> None:
        setup.forget_setup_started_ollama_serve()

    def _stop_at_sleep(self, number: int) -> tuple[dict, FakeAI]:
        """The person's Ollama runs, ~/.ollama is gone, and Stop is pressed at the Nth short wait."""
        ai = FakeAI(up=True)
        cancel = asyncio.Event()
        waits = {"n": 0}

        def sleep(_seconds: float) -> None:
            waits["n"] += 1
            if waits["n"] == number:
                cancel.set()

        with tempfile.TemporaryDirectory() as home, patch.dict(os.environ, {"HOME": home, "USERPROFILE": home}):
            self.assertFalse((Path(home) / ".ollama" / "id_ed25519").exists())
            state = run_custom_setup(ai, lambda *a: (True, ""), cancel, sleep=sleep, keys_ready=False)
        return state, ai

    def test_a_stop_while_the_fresh_engine_starts_leaves_the_ai_running(self):
        state, ai = self._stop_at_sleep(1)
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(ai.up, "the Deck's AI was left switched off after Stop")

    def test_a_stop_while_waiting_for_the_keys_leaves_the_ai_running(self):
        state, ai = self._stop_at_sleep(2)
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(ai.up, "the Deck's AI was left switched off after Stop")

    def test_without_a_stop_the_keys_step_still_waits_and_fails_plainly(self):
        ai = FakeAI(up=True)
        with tempfile.TemporaryDirectory() as home, patch.dict(os.environ, {"HOME": home, "USERPROFILE": home}):
            with ExitStack() as stack:
                stack.enter_context(patch(f"{setup.__name__}.time.sleep"))
                stack.enter_context(patch(f"{setup.__name__}.probe_ollama_http_ok", side_effect=ai.probe))
                stack.enter_context(patch("subprocess.Popen", side_effect=ai.popen))
                stack.enter_context(patch("subprocess.run", side_effect=ai.run))
                ok = setup.ensure_ollama_cli_home_ready(lambda _m: None, "/x/ollama", lambda: False)
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
