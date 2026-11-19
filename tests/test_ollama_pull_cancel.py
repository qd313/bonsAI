"""Title: Cancel on a model download is heard even while Ollama prints nothing

Purpose: `ollama pull` prints nothing while it looks the model up or while the connection stalls. The download
used to look at the Cancel flag only when a line arrived, so Cancel on the card sat on "Stopping" until Ollama
spoke again. These tests pin the level the Deck shows: the download call returns "Cancelled." within about a
second of the flag being set, with the program gone, though the program never printed a line.
Used for: run_ollama_pull in local_ollama_setup_service.py and ollama_pull_cancel_watch.py.
Does not: Run a real Ollama (a Python sleeper stands in for `ollama pull`).
"""

from __future__ import annotations

import subprocess
import sys
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub  # noqa: E402

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402

_REAL_POPEN = subprocess.Popen
_SILENT_SLEEPER = "import time; time.sleep(60)"
_SHORT_TALKER = "print('pulling manifest', flush=True); print('success', flush=True)"
_FAILING = "import sys; print('boom', flush=True); sys.exit(3)"


def _pull(program: str, cancel_after: float | None) -> tuple[tuple[bool, str], float, "subprocess.Popen[str]", list[str]]:
    """Run run_ollama_pull against a stand-in program; returns (result, seconds taken, the process, log lines)."""
    cancel = threading.Event()
    made: list[subprocess.Popen] = []
    lines: list[str] = []

    def popen(cmd, *args, **kwargs):
        proc = _REAL_POPEN([sys.executable, "-c", program], *args, **kwargs)
        made.append(proc)
        return proc

    if cancel_after is not None:
        threading.Timer(cancel_after, cancel.set).start()
    S = setup.__name__
    with patch(f"{S}.ensure_ollama_cli_home_ready", return_value=True), patch(f"{S}.subprocess.Popen", side_effect=popen):
        started = time.monotonic()
        result = setup.run_ollama_pull("/x/ollama", "tiny:1b", lines.append, cancel.is_set)
        taken = time.monotonic() - started
    return result, taken, made[0], lines


class ACancelIsHeardWithoutAnyOutput(unittest.TestCase):
    def test_a_silent_download_ends_within_two_seconds_of_a_cancel(self):
        result, taken, proc, _lines = _pull(_SILENT_SLEEPER, cancel_after=0.3)
        self.addCleanup(lambda: proc.poll() is None and proc.kill())
        self.assertEqual(result, (False, "Cancelled."))
        self.assertLess(taken, 2.0, "the download kept waiting for a line after Cancel")
        self.assertIsNotNone(proc.poll(), "the download program was left running after Cancel")

    def test_a_finished_download_is_still_a_success(self):
        result, _taken, _proc, lines = _pull(_SHORT_TALKER, cancel_after=None)
        self.assertEqual(result, (True, ""))
        self.assertIn("success", lines)

    def test_a_failed_download_still_says_why(self):
        (ok, text), _taken, _proc, _lines = _pull(_FAILING, cancel_after=None)
        self.assertFalse(ok)
        self.assertNotEqual(text, "Cancelled.")
        self.assertTrue(text)


if __name__ == "__main__":
    unittest.main()
