"""Title: A Cancel stops the voice engine's image pull and build while they run

Purpose: The voice engine is made by two long podman steps. These pin, with a fake process (no podman needed),
that a Cancel pressed while either step runs ends it within moments, removes the build container it started and
leaves nothing running, that the time limit does the same, and that the install_whisper_cli path (the one the
starter set and the voice install's own button both use) gives the build container a name and passes the
cancel flag down to it.
Used for: voice_stoppable_run.py, voice_engine_build_service._run_whisper_container_build,
voice_transcription_service.install_whisper_cli.
Does not: Run podman or touch the network.
"""

from __future__ import annotations

import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_engine_build_service as build  # noqa: E402
from backend.voice import voice_stoppable_run as stoppable  # noqa: E402
from backend.voice import voice_transcription_service as service  # noqa: E402


class FakeProcess:
    """A podman process that runs until it is ended (or, with `finishes_after` polls, ends by itself)."""

    def __init__(self, cmd, *, finishes_after=None, on_poll=None, **_kw):
        self.cmd = list(cmd)
        self.returncode = None
        self.ended_by = ""
        self._polls = 0
        self._finishes_after = finishes_after
        self._on_poll = on_poll

    def communicate(self, timeout=None):
        if self.returncode is not None:
            return "", ""
        self._polls += 1
        if self._on_poll:
            self._on_poll(self._polls)
        if self._finishes_after is not None and self._polls > self._finishes_after:
            self.returncode = 0
            return "out", "err"
        time.sleep(0.001)
        raise subprocess.TimeoutExpired(self.cmd, timeout or 0)

    def poll(self):
        return self.returncode

    def terminate(self):
        self.ended_by = "terminate"
        self.returncode = -15

    def kill(self):
        self.ended_by = "kill"
        self.returncode = -9

    def wait(self, timeout=None):
        return self.returncode


class Recorder:
    """Stands in for subprocess.Popen and subprocess.run inside voice_stoppable_run."""

    def __init__(self, **proc_kw):
        self.proc_kw = proc_kw
        self.procs: list[FakeProcess] = []
        self.runs: list[list[str]] = []

    def popen(self, cmd, **kw):
        proc = FakeProcess(cmd, **self.proc_kw)
        self.procs.append(proc)
        return proc

    def run(self, cmd, **_kw):
        self.runs.append(list(cmd))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    def patched(self):
        return (
            patch.object(stoppable.subprocess, "Popen", side_effect=self.popen),
            patch.object(stoppable.subprocess, "run", side_effect=self.run),
        )


def _run(rec, **kw):
    p1, p2 = rec.patched()
    with p1, p2:
        return stoppable.run_stoppable(["podman", "run", "x"], env={}, poll_seconds=0.01, **kw)


class TheStepIsLookedAtWhileItRuns(unittest.TestCase):
    def test_a_step_that_finishes_returns_its_output_like_subprocess_run(self):
        rec = Recorder(finishes_after=3)
        out = _run(rec, timeout=5, cancel_event=threading.Event())
        self.assertEqual((out.returncode, out.stdout, out.stderr), (0, "out", "err"))
        self.assertEqual(rec.runs, [])

    def test_a_cancel_during_the_build_removes_the_container_ends_the_process_and_raises_quickly(self):
        cancel = threading.Event()
        rec = Recorder(on_poll=lambda n: cancel.set() if n == 3 else None)
        started = time.monotonic()
        with self.assertRaises(RuntimeError) as caught:
            _run(rec, timeout=1800, cancel_event=cancel, podman="/usr/bin/podman", container_name="bonsai-whisper-build-ab12")
        self.assertLess(time.monotonic() - started, 2)
        self.assertEqual(str(caught.exception), "Binary install cancelled.")
        self.assertEqual(rec.runs, [["/usr/bin/podman", "rm", "-f", "bonsai-whisper-build-ab12"]])
        self.assertEqual(rec.procs[0].ended_by, "terminate")
        self.assertIsNotNone(rec.procs[0].poll(), "the podman process must not be left running")

    def test_a_cancel_during_the_image_pull_ends_the_pull_and_removes_no_container(self):
        cancel = threading.Event()
        rec = Recorder(on_poll=lambda n: cancel.set() if n == 2 else None)
        with self.assertRaises(RuntimeError):
            _run(rec, timeout=900, cancel_event=cancel)
        self.assertEqual(rec.runs, [])
        self.assertEqual(rec.procs[0].ended_by, "terminate")

    def test_a_cancel_already_set_never_lets_the_step_run_on(self):
        cancel = threading.Event()
        cancel.set()
        rec = Recorder()
        with self.assertRaises(RuntimeError):
            _run(rec, timeout=900, cancel_event=cancel)
        self.assertEqual(rec.procs[0].poll(), -15)

    def test_the_time_limit_ends_the_step_and_removes_its_container_too(self):
        rec = Recorder()
        with self.assertRaises(subprocess.TimeoutExpired):
            _run(rec, timeout=0.05, cancel_event=None, podman="p", container_name="c1")
        self.assertEqual(rec.runs, [["p", "rm", "-f", "c1"]])
        self.assertIsNotNone(rec.procs[0].poll())

    def test_a_process_that_ignores_terminate_is_killed(self):
        rec = Recorder()
        cancel = threading.Event()
        cancel.set()
        p1, p2 = rec.patched()
        with p1, p2, patch.object(FakeProcess, "wait", side_effect=[subprocess.TimeoutExpired("x", 5), None]):
            with self.assertRaises(RuntimeError):
                stoppable.run_stoppable(["podman", "pull", "x"], env={}, timeout=5, cancel_event=cancel, poll_seconds=0.01)
        self.assertEqual(rec.procs[0].ended_by, "kill")


class TheBuildUsesIt(unittest.TestCase):
    def test_the_build_container_has_a_name_and_the_cancel_flag_reaches_the_stop(self):
        cancel = threading.Event()
        seen: dict = {}

        def fake_run_stoppable(cmd, **kw):
            seen["cmd"], seen["kw"] = list(cmd), kw
            return subprocess.CompletedProcess(cmd, 0, "", "")

        with patch.object(build, "run_stoppable", side_effect=fake_run_stoppable):
            build._run_whisper_container_build("/usr/bin/podman", {}, "/bin-dir", "script", cancel)
        cmd, kw = seen["cmd"], seen["kw"]
        name = cmd[cmd.index("--name") + 1]
        self.assertTrue(name.startswith("bonsai-whisper-build-"))
        self.assertEqual(kw["container_name"], name)
        self.assertEqual(kw["podman"], "/usr/bin/podman")
        self.assertIs(kw["cancel_event"], cancel)
        self.assertEqual(kw["timeout"], 1800)
        self.assertIn("--rm", cmd)

    def test_a_failing_build_still_raises_its_first_error_text(self):
        failing = subprocess.CompletedProcess([], 2, "", "cmake exploded")
        with patch.object(build, "run_stoppable", return_value=failing):
            with self.assertRaisesRegex(RuntimeError, "cmake exploded"):
                build._run_whisper_container_build("p", {}, "/b", "s")


class InstallWhisperCliGivesBothStepsTheFlag(unittest.TestCase):
    def test_a_cancel_set_during_the_real_build_step_ends_it_and_install_raises(self):
        cancel = threading.Event()
        rec = Recorder(on_poll=lambda n: cancel.set() if n == 2 and "run" in rec.procs[-1].cmd else None)

        def fake_pull_then_build(cmd, **kw):
            # The pull answers at once; the build step goes through the real stoppable runner with a fake process.
            if "pull" in cmd:
                return subprocess.CompletedProcess(cmd, 0, "", "")
            return real_run_stoppable(cmd, **{**kw, "poll_seconds": 0.01})

        real_run_stoppable = stoppable.run_stoppable
        p1, p2 = rec.patched()
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as settings:
            with (
                p1,
                p2,
                patch.object(service.shutil, "which", return_value="/usr/bin/podman"),
                patch.object(service, "run_stoppable", side_effect=fake_pull_then_build),
                patch.object(build, "run_stoppable", side_effect=fake_pull_then_build),
            ):
                with self.assertRaisesRegex(RuntimeError, "Binary install cancelled."):
                    service.install_whisper_cli(root, settings, {}, cancel)
        self.assertEqual(len(rec.runs), 1)
        self.assertEqual(rec.runs[0][:3], ["/usr/bin/podman", "rm", "-f"])
        self.assertTrue(rec.runs[0][3].startswith("bonsai-whisper-build-"))


if __name__ == "__main__":
    unittest.main()
