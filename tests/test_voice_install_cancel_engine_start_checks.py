"""Title: A Cancel is heard by the "does the engine start" checks of the voice install

Purpose: Before and after the voice engine build, the install runs the engine program with -h to see
whether it starts at all (the speech program, and the server program beside it). Each was a plain
blocking call of up to 15 seconds, twice over for the server check, so a Cancel pressed meanwhile sat
on "Stopping the install". These pin, with a real process that just sleeps, that a Cancel ends such a check
within a couple of seconds and is raised as a Cancel (never turned into "not usable", which would send the
install on to a rebuild), that the install ends as "cancelled" without starting the image fetch, and that a check
with no flag (a recording start, the shared engine) is still the plain blocking call.

Used for: voice_whisper_runtime.whisper_binary_usable and whisper_server_binary_usable,
voice_transcription_service.install_whisper_cli, voice_engine_build_service's check after the build.
Does not: Build anything, run podman or touch the network.
"""

from __future__ import annotations

import contextlib
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_engine_build_service as build  # noqa: E402
from backend.voice import voice_stoppable_run as stoppable  # noqa: E402
from backend.voice import voice_transcription_service as service  # noqa: E402
from backend.voice import voice_whisper_runtime as runtime  # noqa: E402

CANCELLED = "Binary install cancelled."
_real_popen = subprocess.Popen


def _sleeping_popen(cmd, **kw):
    """A real process that sleeps in place of the engine program's -h run."""
    return _real_popen([sys.executable, "-c", "import time; time.sleep(30)"], **kw)


@contextlib.contextmanager
def _engine_present(*, server: bool = False):
    """The engine files 'on disk', as far as the check can tell, without any real program."""
    with tempfile.TemporaryDirectory() as folder:
        server_path = os.path.join(folder, "whisper-server")
        if server:
            with open(server_path, "w", encoding="utf-8") as handle:
                handle.write("x")
            os.chmod(server_path, 0o755)
        with contextlib.ExitStack() as stack:
            stack.enter_context(mock.patch.object(runtime, "resolve_whisper_cli", return_value="whisper-cli"))
            stack.enter_context(mock.patch.object(runtime, "WHISPER_REQUIRED_SONAMES", ()))
            stack.enter_context(mock.patch.object(runtime, "check_voice_engine", return_value="ok"))
            stack.enter_context(mock.patch.object(runtime, "voice_whisper_server_path", return_value=server_path))
            yield folder


def _cancel_soon(delay: float = 0.4) -> threading.Event:
    cancel = threading.Event()
    threading.Timer(delay, cancel.set).start()
    return cancel


class TheCliCheckHearsACancel(unittest.TestCase):
    def test_a_cancel_ends_the_check_within_a_couple_of_seconds_and_is_raised_as_a_cancel(self):
        cancel = _cancel_soon()
        started = time.monotonic()
        with _engine_present(), mock.patch.object(stoppable.subprocess, "Popen", _sleeping_popen):
            with self.assertRaisesRegex(RuntimeError, CANCELLED):
                runtime.whisper_binary_usable("root", "settings", cancel)
        self.assertLess(time.monotonic() - started, 3)

    def test_a_flag_that_is_not_set_leaves_a_working_engine_usable(self):
        ran = subprocess.CompletedProcess([], 0, "usage: x", "")
        with _engine_present(), mock.patch.object(runtime, "run_stoppable", return_value=ran) as run:
            self.assertEqual(runtime.whisper_binary_usable("root", "settings", threading.Event()), "whisper-cli")
        run.assert_called_once()

    def test_without_a_flag_the_check_is_the_plain_blocking_call(self):
        ran = subprocess.CompletedProcess([], 0, "usage: x", "")
        with _engine_present(), mock.patch.object(runtime.subprocess, "run", return_value=ran) as plain, mock.patch.object(
            runtime, "run_stoppable"
        ) as stoppable_run:
            self.assertEqual(runtime.whisper_binary_usable("root", "settings"), "whisper-cli")
        plain.assert_called_once()
        stoppable_run.assert_not_called()


class TheServerCheckHearsACancel(unittest.TestCase):
    def test_a_cancel_during_the_servers_own_run_ends_it_within_a_couple_of_seconds(self):
        cancel = _cancel_soon()
        started = time.monotonic()
        with _engine_present(server=True), mock.patch.object(runtime, "whisper_binary_usable", return_value="whisper-cli"):
            with mock.patch.object(stoppable.subprocess, "Popen", _sleeping_popen):
                with self.assertRaisesRegex(RuntimeError, CANCELLED):
                    runtime.whisper_server_binary_usable("root", "settings", cancel)
        self.assertLess(time.monotonic() - started, 3)

    def test_the_cli_check_inside_the_server_check_gets_the_same_flag(self):
        cancel = threading.Event()
        ran = subprocess.CompletedProcess([], 0, "usage: x", "")
        with _engine_present(server=True), mock.patch.object(
            runtime, "whisper_binary_usable", return_value="whisper-cli"
        ) as inner, mock.patch.object(runtime, "run_stoppable", return_value=ran):
            runtime.whisper_server_binary_usable("root", "settings", cancel)
        self.assertIs(inner.call_args.args[2], cancel)

    def test_without_a_flag_the_server_check_is_the_plain_blocking_call(self):
        ran = subprocess.CompletedProcess([], 0, "usage: x", "")
        with _engine_present(server=True), mock.patch.object(
            runtime, "whisper_binary_usable", return_value="whisper-cli"
        ) as inner, mock.patch.object(runtime.subprocess, "run", return_value=ran) as plain, mock.patch.object(
            runtime, "run_stoppable"
        ) as stoppable_run:
            runtime.whisper_server_binary_usable("root", "settings")
        plain.assert_called_once()
        stoppable_run.assert_not_called()
        self.assertIsNone(inner.call_args.args[2])


class TheInstallEndsAsCancelledDuringTheChecks(unittest.TestCase):
    """The level the person sees: the install ends as cancelled within a couple of seconds, and no image is fetched."""

    def _install(self, cancel):
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as settings:
            stack.enter_context(mock.patch.object(service, "voice_model_path", return_value=os.path.join(settings, "none")))
            pull = stack.enter_context(mock.patch.object(service, "run_stoppable"))
            stack.enter_context(mock.patch.object(service.shutil, "which", return_value="/usr/bin/podman"))
            stack.enter_context(mock.patch.object(stoppable.subprocess, "Popen", _sleeping_popen))
            started = time.monotonic()
            with self.assertRaisesRegex(RuntimeError, CANCELLED):
                service.install_whisper_cli("root", settings, {}, cancel)
            self.elapsed = time.monotonic() - started
        pull.assert_not_called()

    def test_a_cancel_during_the_cli_check_at_the_start_ends_the_install_without_the_image_fetch(self):
        with _engine_present():
            self._install(_cancel_soon())
        self.assertLess(self.elapsed, 3)

    def test_a_cancel_during_the_server_check_ends_the_install_without_the_image_fetch(self):
        # The speech program's -h run is quick; the server program's own run is the one that sleeps.
        def popen(cmd, **kw):
            if str(cmd[0]).endswith("whisper-server"):
                return _sleeping_popen(cmd, **kw)
            return _real_popen([sys.executable, "-c", "print('usage: x')"], **kw)

        with _engine_present(server=True), mock.patch.object(service, "_voice_binary_ready_for_inference", return_value="x"):
            with mock.patch.object(service, "run_stoppable") as pull:
                cancel = _cancel_soon(0.8)
                with mock.patch.object(stoppable.subprocess, "Popen", popen), mock.patch.object(
                    service.shutil, "which", return_value="/usr/bin/podman"
                ):
                    started = time.monotonic()
                    with self.assertRaisesRegex(RuntimeError, CANCELLED):
                        service.install_whisper_cli("root", "settings", {}, cancel)
                    elapsed = time.monotonic() - started
        pull.assert_not_called()
        self.assertLess(elapsed, 3)


class TheBuildServiceCheckAfterTheBuildHearsTheFlag(unittest.TestCase):
    def test_the_check_after_the_build_is_given_the_install_flag(self):
        cancel = threading.Event()
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as settings:
            stack.enter_context(mock.patch.object(build, "_build_in_staging"))
            stack.enter_context(mock.patch.object(build, "_voice_bin_mark_cpu_safe"))
            usable = stack.enter_context(mock.patch.object(build, "whisper_binary_usable", return_value="/bin/whisper-cli"))
            build._build_whisper_cli_in_container("podman", {}, "root", settings, cancel)
        self.assertIs(usable.call_args.args[2], cancel)


if __name__ == "__main__":
    unittest.main()
