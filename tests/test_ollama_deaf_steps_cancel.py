"""Title: The short waiting steps of the AI setup hear a Cancel

Purpose: Waking Ollama through systemd (up to four calls of 30 seconds each) and the "ollama list" warm-up of
the keys step (60 seconds) never looked at the Cancel flag, so the card said "Stopping" for as long as they
took. These tests pin the level the Deck shows: with Cancel pressed during such a call, the step ends within
about a second, makes no further call, and the run ends as "cancelled".
Used for: try_restart_ollama_user_service in ollama_server_restart.py, _make_ollama_keys and run_local_setup in
local_ollama_setup_service.py.
Does not: Run systemctl or Ollama (a Python sleeper stands in for the slow program).
"""

from __future__ import annotations

import asyncio
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_fake_ai import FakeAI, run_custom_setup  # noqa: E402

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402
from backend.ollama import ollama_server_restart as restart  # noqa: E402

_REAL_POPEN = subprocess.Popen


class _SlowProgram:
    """Replaces subprocess.Popen so every program started is a 60 second sleeper; remembers each one."""

    def __init__(self) -> None:
        self.started: list[subprocess.Popen] = []

    def __call__(self, cmd, *args, **kwargs):
        proc = _REAL_POPEN([sys.executable, "-c", "import time; time.sleep(60)"], *args, **kwargs)
        self.started.append(proc)
        return proc

    def cleanup(self) -> None:
        for proc in self.started:
            if proc.poll() is None:
                proc.kill()


def _cancel_soon(seconds: float = 0.3) -> threading.Event:
    cancel = threading.Event()
    threading.Timer(seconds, cancel.set).start()
    return cancel


class WakingOllamaThroughSystemdHearsACancel(unittest.TestCase):
    def test_a_cancel_ends_the_call_in_progress_and_makes_no_more(self):
        slow = _SlowProgram()
        self.addCleanup(slow.cleanup)
        cancel = _cancel_soon()
        lines: list[str] = []
        with patch(f"{restart.__name__}.subprocess.Popen", side_effect=slow):
            started = time.monotonic()
            restart.try_restart_ollama_user_service(lines.append, cancel.is_set)
            taken = time.monotonic() - started
        self.assertLess(taken, 2.0, "the systemd step kept waiting after Cancel")
        self.assertEqual(len(slow.started), 1, "a further systemctl call was made after Cancel")
        self.assertIsNotNone(slow.started[0].poll(), "the systemctl call was left running")

    def test_without_a_cancel_it_still_tries_every_call(self):
        calls: list[list[str]] = []

        def fake_run(cmd, *args, **kwargs):
            calls.append(list(cmd))
            return subprocess.CompletedProcess(cmd, 0, "", "")

        with patch(f"{restart.__name__}.subprocess.run", side_effect=fake_run):
            restart.try_restart_ollama_user_service(lambda _m: None)
        self.assertEqual(len(calls), 4)


class TheKeysWarmUpHearsACancel(unittest.TestCase):
    def test_a_cancel_during_ollama_list_ends_the_step_quickly(self):
        slow = _SlowProgram()
        self.addCleanup(slow.cleanup)
        cancel = _cancel_soon()
        S = setup.__name__
        with tempfile.TemporaryDirectory() as home:
            key = Path(home) / "id_ed25519"
            with patch(f"{S}.ensure_ollama_server_listening_before_pull", return_value=True), \
                    patch(f"{S}.time.sleep"), patch(f"{S}.subprocess.Popen", side_effect=slow):
                started = time.monotonic()
                ok = setup._make_ollama_keys(lambda _m: None, "/x/ollama", cancel.is_set, key)
                taken = time.monotonic() - started
        self.assertFalse(ok)
        self.assertLess(taken, 2.0, "the warm-up kept waiting after Cancel")
        self.assertIsNotNone(slow.started[0].poll(), "ollama list was left running")


class ASetupRunStopsInTheServiceStep(unittest.TestCase):
    def test_a_stop_during_the_systemd_wake_up_ends_the_run_as_cancelled(self):
        """The Ollama tab's card: Stop while Ollama is being woken, and the run ends as cancelled within a second or two."""
        cancel = asyncio.Event()
        ai = FakeAI(up=False)
        pulled: list[str] = []

        def slow_wake(_log, cancelled=lambda: False):  # a systemctl call that takes 5 s unless it is told about the Cancel
            end = time.monotonic() + 5
            while time.monotonic() < end and not cancelled():
                threading.Event().wait(0.05)

        async def wait_for_run(task):
            await task

        threading.Timer(0.3, cancel.set).start()
        extra = {f"{setup.__name__}.try_restart_ollama_user_service": {"side_effect": slow_wake}}
        started = time.monotonic()
        state = run_custom_setup(ai, lambda *a: pulled.append("x") or (True, ""), cancel, extra=extra, drive=wait_for_run)
        taken = time.monotonic() - started
        self.assertEqual(state["phase"], "cancelled")
        self.assertLess(taken, 2.5, "the run kept waiting in the systemd step after Stop")
        self.assertEqual(pulled, [], "the run went on to download after Stop")
        self.assertEqual(ai.started, 0, "the run started an engine after Stop")


class AStopInTheWarmUpStillLeavesTheAiRunning(unittest.TestCase):
    def test_the_ai_answers_after_a_stop_during_ollama_list(self):
        """Clear all data, then Stop while the keys step runs "ollama list": the run ends cancelled and an AI still answers."""
        ai = FakeAI(up=True)
        cancel = asyncio.Event()
        slow = _SlowProgram()
        self.addCleanup(slow.cleanup)

        def popen(cmd, *args, **kwargs):
            if list(cmd)[1:2] == ["list"]:
                cancel.set()  # Stop lands while the warm-up runs
                return slow(cmd, *args, **kwargs)
            return ai.popen(cmd, *args, **kwargs)

        with tempfile.TemporaryDirectory() as home, patch.dict("os.environ", {"HOME": home, "USERPROFILE": home}):
            state = run_custom_setup(ai, lambda *a: (True, ""), cancel, keys_ready=False,
                                     extra={"subprocess.Popen": {"side_effect": popen}})
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(ai.up, "the Deck's AI was left switched off after Stop")
        self.assertIsNotNone(slow.started[0].poll(), "ollama list was left running")


if __name__ == "__main__":
    unittest.main()
