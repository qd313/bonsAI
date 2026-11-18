"""Title: The voice install's stop flag: an install that is stopped ends as "cancelled" and the model step really stops

Purpose: Plan 106, lane F3. The voice install has a stop flag in the back end (`_voice_install_cancel`), set today by
Turning Internet downloads off, Clear all data and the plugin unloading. A stopped install used to end as "failed"
with the raw words "Binary install cancelled.", and the speech-model step ignored the flag while curl ran (it was only
read by the fallback downloader), so a stop during that download did not stop it and the model was installed anyway.
These tests pin: a stop ends the install with the phase "cancelled" (not "failed"); no model download starts after a
stop; a stop during the model download stops curl within a couple of seconds and leaves no half file; a stop that
arrives as the file finishes installs nothing; a second install after a stop starts clean; a real failure is still
"failed".

Also (the screen's Cancel, plan 106 lane F3): the new `cancel_voice_install` call answers "nothing running" when there
is none, stops a running install (which then ends as "cancelled"), is a no-op once the install has ended, and works
with the microphone permission off (stopping a download is always allowed).

Used for: voice_rpc.install_voice_engine, voice_rpc.cancel_voice_install, voice_model_download_service.download_voice_model.
Does not: build the engine or touch the network; every slow step is replaced by a fake.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
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

from backend.voice import voice_model_download_service as models  # noqa: E402
from backend.voice import voice_rpc  # noqa: E402
from backend.voice.voice_transcription_service import new_voice_install_state  # noqa: E402

ALLOWED = {"capabilities": {"microphone_access": True, "internet_downloads": True}, "voice_stt_model": "tiny.en"}


class StoppedVoiceInstall(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings(ALLOWED)
        self.plugin._maybe_app_log = mock.AsyncMock()

    async def _start_install_that_waits(self, release: threading.Event) -> None:
        """Start the real install call with the engine step replaced by one that waits for `release` or a Cancel."""

        def slow_engine(_root, _dir, _state, cancel_event, _on_stage):
            while not (release.is_set() or cancel_event.is_set()):
                time.sleep(0.01)
            if cancel_event.is_set():
                raise RuntimeError("Binary install cancelled.")

        self.model_calls = 0

        def model_step(*_a, **_k):
            self.model_calls += 1

        patcher_a = mock.patch.object(voice_rpc, "install_whisper_cli", slow_engine)
        patcher_b = mock.patch.object(voice_rpc, "download_voice_model", model_step)
        patcher_a.start()
        patcher_b.start()
        self.addCleanup(patcher_a.stop)
        self.addCleanup(patcher_b.stop)
        out = await self.plugin.install_voice_engine("tiny.en")
        self.assertTrue(out["accepted"])

    async def _wait_until_ended(self) -> None:
        task = self.plugin._voice_install_task
        await asyncio.wait_for(task, timeout=5)

    async def test_a_stopped_install_ends_as_cancelled_not_failed(self) -> None:
        release = threading.Event()
        self.addCleanup(release.set)
        await self._start_install_that_waits(release)
        self.assertEqual(self.plugin._voice_install_state["phase"], "running")
        self.plugin._voice_install_cancel.set()
        await self._wait_until_ended()
        state = self.plugin._voice_install_state
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(state["done"])
        self.assertEqual(state["error"], "Install cancelled.")
        # The speech model is never fetched after a Cancel.
        self.assertEqual(self.model_calls, 0)

    async def test_cancel_with_nothing_running_says_so_and_changes_nothing(self) -> None:
        out = await self.plugin.cancel_voice_install()
        self.assertEqual(out, {"cancel_requested": False, "running": False})
        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())

    async def test_the_cancel_call_stops_a_running_install_and_it_ends_as_cancelled(self) -> None:
        release = threading.Event()
        self.addCleanup(release.set)
        await self._start_install_that_waits(release)
        out = await self.plugin.cancel_voice_install()
        self.assertEqual(out, {"cancel_requested": True, "running": True})
        await self._wait_until_ended()
        state = self.plugin._voice_install_state
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(state["error"], "Install cancelled.")
        self.assertEqual(self.model_calls, 0)

    async def test_the_cancel_call_after_the_install_ended_is_a_no_op(self) -> None:
        release = threading.Event()
        release.set()
        await self._start_install_that_waits(release)
        await self._wait_until_ended()
        out = await self.plugin.cancel_voice_install()
        self.assertEqual(out, {"cancel_requested": False, "running": False})
        self.assertFalse(self.plugin._voice_install_cancel.is_set())

    async def test_the_cancel_call_works_with_the_microphone_permission_off(self) -> None:
        release = threading.Event()
        self.addCleanup(release.set)
        await self._start_install_that_waits(release)
        self._write_settings({"capabilities": {"microphone_access": False, "internet_downloads": False}})
        out = await self.plugin.cancel_voice_install()
        self.assertTrue(out["cancel_requested"])
        await self._wait_until_ended()
        self.assertEqual(self.plugin._voice_install_state["phase"], "cancelled")

    async def test_a_stop_as_the_engine_step_finishes_still_skips_the_model_step(self) -> None:
        release = threading.Event()
        await self._start_install_that_waits(release)
        # The stop arrives, then the engine step finishes normally in the same moment.
        self.plugin._voice_install_cancel.set()
        release.set()
        await self._wait_until_ended()
        self.assertEqual(self.plugin._voice_install_state["phase"], "cancelled")
        self.assertEqual(self.model_calls, 0)

    async def test_a_second_install_after_a_stop_starts_clean(self) -> None:
        release = threading.Event()
        self.addCleanup(release.set)
        await self._start_install_that_waits(release)
        self.plugin._voice_install_cancel.set()
        await self._wait_until_ended()
        self.assertEqual(self.plugin._voice_install_state["phase"], "cancelled")
        release.set()
        out = await self.plugin.install_voice_engine("tiny.en")
        self.assertTrue(out["accepted"])
        # A fresh flag and a fresh state: the old Cancel does not stop the new run.
        self.assertFalse(self.plugin._voice_install_cancel.is_set())
        await self._wait_until_ended()
        self.assertEqual(self.model_calls, 1)
        self.assertNotEqual(self.plugin._voice_install_state["phase"], "cancelled")

    async def test_turning_internet_downloads_off_ends_the_install_as_cancelled(self) -> None:
        from backend.core.stop_downloads_when_off import stop_running_downloads_if_turned_off

        release = threading.Event()
        self.addCleanup(release.set)
        await self._start_install_that_waits(release)
        stopped = await stop_running_downloads_if_turned_off(
            self.plugin, {"internet_downloads": True}, {"internet_downloads": False}
        )
        self.assertIn("voice_install", stopped)
        await self._wait_until_ended()
        self.assertEqual(self.plugin._voice_install_state["phase"], "cancelled")
        self.assertEqual(self.model_calls, 0)

    async def test_a_genuine_failure_is_still_failed(self) -> None:
        def broken_engine(*_a, **_k):
            raise RuntimeError("podman pull failed")

        with mock.patch.object(voice_rpc, "install_whisper_cli", broken_engine):
            await self.plugin.install_voice_engine("tiny.en")
            await self._wait_until_ended()
        state = self.plugin._voice_install_state
        self.assertEqual(state["phase"], "failed")
        self.assertIn("podman pull failed", state["error"])


class ModelDownloadStopsWhenStopped(unittest.TestCase):
    """The speech-model step: curl used to run to the end whatever the flag said (up to 15 minutes)."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dest = models.voice_model_path(self.tmp.name, self.tmp.name, "tiny.en")

    def _stand_in_curl(self, seconds: float):
        """`run_stoppable` as the download calls it, with `curl` swapped for a program that writes half a file and keeps running."""
        script = os.path.join(self.tmp.name, "fake_curl.py")
        with open(script, "w", encoding="utf-8") as fh:
            fh.write(
                "\n".join(
                    [
                        "import sys, time",
                        "out = sys.argv[sys.argv.index('-o') + 1]",
                        "open(out, 'wb').write(b'x' * 4096)",
                        f"time.sleep({seconds})",
                        "",
                    ]
                )
            )
        real = models.run_stoppable
        return lambda cmd, **kw: real([sys.executable, script, *cmd[1:]], **kw)

    def test_a_stop_while_curl_runs_ends_it_within_a_couple_of_seconds_and_leaves_no_file(self) -> None:
        cancel = threading.Event()
        state = new_voice_install_state()
        stand_in = self._stand_in_curl(60)
        threading.Timer(1.0, cancel.set).start()
        started = time.monotonic()
        with mock.patch.object(models.shutil, "which", return_value="curl"), mock.patch.object(models, "run_stoppable", stand_in):
            with self.assertRaises(RuntimeError) as ctx:
                models.download_voice_model(self.tmp.name, self.tmp.name, "tiny.en", state, cancel)
        self.assertLess(time.monotonic() - started, 15)
        self.assertEqual(str(ctx.exception), "Download cancelled.")
        self.assertFalse(os.path.exists(self.dest))
        self.assertFalse(os.path.exists(self.dest + ".part"))

    def test_a_stop_that_arrives_as_the_download_finishes_installs_nothing(self) -> None:
        cancel = threading.Event()

        def finishes_then_cancel(_url, tmp_path, cancel_event, *_a, **_k):
            with open(tmp_path, "wb") as fh:
                fh.write(b"y" * 10)
            cancel_event.set()

        spec = dict(models.VOICE_STT_MODEL_SPECS["tiny.en"])
        spec["bytes"] = 10
        spec["sha256"] = hashlib.sha256(b"y" * 10).hexdigest()
        with mock.patch.dict(models.VOICE_STT_MODEL_SPECS, {"tiny.en": spec}), mock.patch.object(
            models, "_download_model_file", finishes_then_cancel
        ):
            with self.assertRaises(RuntimeError):
                models.download_voice_model(self.tmp.name, self.tmp.name, "tiny.en", new_voice_install_state(), cancel)
        self.assertFalse(os.path.exists(self.dest))
        self.assertFalse(os.path.exists(self.dest + ".part"))


if __name__ == "__main__":
    unittest.main()
