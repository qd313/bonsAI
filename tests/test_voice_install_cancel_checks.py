"""Title: A Cancel is heard by the test reads that run around the voice engine build

Purpose: The voice install runs a short test read of the engine program before the build (to see whether the
engine already there still works) and after it (to prove the new one runs on this CPU). Both were plain blocking
calls of up to 60 seconds, so a Cancel pressed meanwhile was not heard until they ended. These pin, with a real
process that just sleeps, that a Cancel ends such a read within a couple of seconds, that the install then ends with
the phase "cancelled" at once, that a Cancel that came in between two steps stops the install before the next step
starts, and that a read with no cancel flag (a recording start) still runs as the plain blocking call it always was.

Used for: voice_engine_build_service._whisper_inference_ok, voice_transcription_service.install_whisper_cli and
_voice_binary_ready_for_inference, voice_rpc.install_voice_engine.
Does not: Build anything, run podman or touch the network.
"""

from __future__ import annotations

import asyncio
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

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.voice import voice_engine_build_service as build  # noqa: E402
from backend.voice import voice_rpc  # noqa: E402
from backend.voice import voice_stoppable_run as stoppable  # noqa: E402
from backend.voice import voice_transcription_service as service  # noqa: E402

ALLOWED = {"capabilities": {"microphone_access": True, "internet_downloads": True}, "voice_stt_model": "tiny.en"}
_real_popen = subprocess.Popen


def _sleeping_popen(cmd, **kw):
    """A real process that sleeps in place of the engine program's test read."""
    return _real_popen([sys.executable, "-c", "import time; time.sleep(30)"], **kw)


def _model_file(folder: str) -> str:
    path = os.path.join(folder, "model.bin")
    with open(path, "wb") as handle:
        handle.write(b"x")
    return path


class TheTestReadHearsACancel(unittest.TestCase):
    def test_a_cancel_ends_the_read_within_a_couple_of_seconds_and_raises_the_cancel_error(self):
        cancel = threading.Event()
        threading.Timer(0.4, cancel.set).start()
        started = time.monotonic()
        with tempfile.TemporaryDirectory() as folder, mock.patch.object(stoppable.subprocess, "Popen", _sleeping_popen):
            with self.assertRaisesRegex(RuntimeError, "Binary install cancelled."):
                build._whisper_inference_ok("whisper-cli", {}, _model_file(folder), cancel)
        self.assertLess(time.monotonic() - started, 3)

    def test_a_read_with_no_flag_is_still_the_plain_blocking_call(self):
        ran = subprocess.CompletedProcess([], 0, "", "")
        with tempfile.TemporaryDirectory() as folder:
            with mock.patch.object(build.subprocess, "run", return_value=ran) as plain, mock.patch.object(
                build, "run_stoppable"
            ) as stoppable_run:
                self.assertTrue(build._whisper_inference_ok("whisper-cli", {}, _model_file(folder)))
        plain.assert_called_once()
        stoppable_run.assert_not_called()

    def test_a_failed_read_with_a_flag_that_is_not_set_is_false_not_an_error(self):
        bad = subprocess.CompletedProcess([], 3, "", "")
        with tempfile.TemporaryDirectory() as folder, mock.patch.object(build, "run_stoppable", return_value=bad):
            self.assertFalse(build._whisper_inference_ok("whisper-cli", {}, _model_file(folder), threading.Event()))


def _patch_install_steps(stack, root, usable, **replace):
    """Stand in for everything slow in install_whisper_cli; returns the mocks of the steps tests look at."""
    model = _model_file(root)
    keep = {
        "voice_model_path": mock.patch.object(service, "voice_model_path", return_value=model),
        "which": mock.patch.object(service.shutil, "which", return_value="/usr/bin/podman"),
        "pull": mock.patch.object(service, "run_stoppable", return_value=subprocess.CompletedProcess([], 0, "", "")),
        "usable": mock.patch.object(service, "whisper_binary_usable", side_effect=usable),
        "server": mock.patch.object(service, "whisper_server_binary_usable", return_value=None),
        "safe": mock.patch.object(service, "_voice_bin_is_cpu_safe", return_value=False),
        "mark": mock.patch.object(service, "_voice_bin_mark_cpu_safe"),
        "env": mock.patch.object(service, "voice_whisper_runtime_env", return_value={}),
        "host_env": mock.patch.object(service, "_env_for_host_system_tools", return_value={}),
        "build": mock.patch.object(service, "_build_whisper_cli_in_container", return_value="/bin/whisper-cli"),
    }
    keep.update(replace)
    return {name: stack.enter_context(patcher) for name, patcher in keep.items()}


class TheInstallEndsAtOnceOnACancelBetweenSteps(unittest.TestCase):
    def _install(self, cancel, usable=lambda *_a: None, **replace):
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as settings:
            mocks = _patch_install_steps(stack, root, usable, **replace)
            self.read = stack.enter_context(mock.patch.object(service, "_whisper_inference_ok", return_value=True))
            try:
                service.install_whisper_cli(root, settings, {}, cancel)
            finally:
                self.builds, self.reads = mocks["build"].call_count, self.read.call_count

    def test_a_cancel_that_came_in_during_the_build_ends_the_install_before_the_test_read_starts(self):
        cancel = threading.Event()
        building = mock.patch.object(service, "_build_whisper_cli_in_container", side_effect=lambda *a, **k: cancel.set() or "dest")
        with self.assertRaisesRegex(RuntimeError, "Binary install cancelled."):
            self._install(cancel, build=building)
        self.assertEqual((self.builds, self.reads), (1, 0))

    def test_a_cancel_that_came_in_during_the_first_check_stops_the_install_before_the_image_pull(self):
        cancel = threading.Event()
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as settings:
            # The engine already there: its test read (stood in here) is what the Cancel lands in.
            pulled = _patch_install_steps(stack, root, lambda *_a: "/bin/whisper-cli")["pull"]
            stack.enter_context(
                mock.patch.object(service, "_whisper_inference_ok", side_effect=lambda *a, **k: cancel.set() or True)
            )
            with self.assertRaisesRegex(RuntimeError, "Binary install cancelled."):
                service.install_whisper_cli(root, settings, {}, cancel)
        pulled.assert_not_called()

    def test_the_first_check_is_given_the_cancel_flag_and_a_recording_start_is_not(self):
        cancel = threading.Event()
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as folder:
            _patch_install_steps(stack, folder, lambda *_a: "/bin/whisper-cli")
            read = stack.enter_context(mock.patch.object(service, "_whisper_inference_ok", return_value=True))
            model = _model_file(folder)
            service._voice_binary_ready_for_inference("r", "s", model)
            service._voice_binary_ready_for_inference("r", "s", model, cancel)
        self.assertEqual([call.args[3] for call in read.call_args_list], [None, cancel])


class StoppedInstallEndsAsCancelledQuickly(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    """The level the person sees: Cancel pressed during a test read, the card says cancelled within a second or two."""

    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings(ALLOWED)
        self.plugin._maybe_app_log = mock.AsyncMock()

    async def _cancel_during(self, usable):
        with contextlib.ExitStack() as stack, tempfile.TemporaryDirectory() as root:
            _patch_install_steps(stack, root, usable)
            stack.enter_context(mock.patch.object(stoppable.subprocess, "Popen", _sleeping_popen))
            model_step = stack.enter_context(mock.patch.object(voice_rpc, "download_voice_model"))
            out = await self.plugin.install_voice_engine("tiny.en")
            self.assertTrue(out["accepted"])
            await asyncio.sleep(0.6)  # the test read is running by now
            self.assertEqual(self.plugin._voice_install_state["phase"], "running")
            started = time.monotonic()
            await self.plugin.cancel_voice_install()
            await asyncio.wait_for(self.plugin._voice_install_task, timeout=5)
        state = self.plugin._voice_install_state
        self.assertEqual((state["phase"], state["error"]), ("cancelled", "Install cancelled."))
        self.assertLess(time.monotonic() - started, 3)
        model_step.assert_not_called()

    async def test_a_cancel_during_the_check_before_anything_is_built(self) -> None:
        await self._cancel_during(lambda *_a: "/bin/whisper-cli")

    async def test_a_cancel_during_the_check_after_the_build(self) -> None:
        # Nothing usable at first, so the first check does not run; after the build the program is there.
        answers = iter([None, None])
        await self._cancel_during(lambda *_a: next(answers, "/bin/whisper-cli"))


if __name__ == "__main__":
    unittest.main()
