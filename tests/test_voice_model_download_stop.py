"""Plan 106, lane R2 (security review item 1): a stop is heard by the speech model download.

The curl download used to run as one blocking call with a 15 minute limit and never looked at the cancel flag, so
turning Internet downloads off during the voice step kept downloading and then installed the file anyway. Now curl is
looked at every half second, a stop ends it and removes the `.part` file, and the flag is checked once more right
before the file is installed.
"""

import os
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_model_download_service as svc  # noqa: E402
from backend.voice import voice_stoppable_run  # noqa: E402


class _CurlThatNeverFinishes:
    """Stands in for the curl process: writes a partial file, then runs until it is ended."""

    instances: list = []

    def __init__(self, cmd, **_kwargs):
        self.ended = False
        self.returncode = None
        with open(cmd[cmd.index("-o") + 1], "wb") as part:
            part.write(b"x" * 4096)
        _CurlThatNeverFinishes.instances.append(self)

    def poll(self):
        return self.returncode

    def communicate(self, timeout=None):
        if self.ended:
            return "", ""
        time.sleep(min(timeout or 0.05, 0.05))
        raise voice_stoppable_run.subprocess.TimeoutExpired("curl", timeout or 0)

    def terminate(self):
        self.ended, self.returncode = True, -15

    kill = terminate

    def wait(self, timeout=None):
        return self.returncode


class TheSpeechModelDownloadHearsAStop(unittest.TestCase):
    def test_a_stop_ends_curl_within_a_second_and_removes_the_part_file(self):
        _CurlThatNeverFinishes.instances = []
        cancel = threading.Event()
        with tempfile.TemporaryDirectory() as d:
            part = os.path.join(d, "ggml.bin.part")
            threading.Timer(0.2, cancel.set).start()
            started = time.monotonic()
            with patch.object(svc.shutil, "which", return_value="curl"), patch.object(
                voice_stoppable_run.subprocess, "Popen", _CurlThatNeverFinishes
            ), patch.object(voice_stoppable_run, "POLL_SECONDS", 0.05):
                with self.assertRaises(RuntimeError) as ctx:
                    svc._download_model_file("https://example.invalid/x", part, cancel, None, 1_000_000)
            self.assertLess(time.monotonic() - started, 3)
            self.assertEqual(str(ctx.exception), "Download cancelled.")
            self.assertTrue(_CurlThatNeverFinishes.instances[0].ended)
            self.assertFalse(os.path.exists(part))

    def test_a_stop_that_comes_while_the_file_is_checked_installs_nothing(self):
        cancel = threading.Event()
        state = svc.new_voice_install_state()

        def fake_download(url, tmp_path, cancel_event, on_progress=None, max_bytes=None):
            with open(tmp_path, "wb") as fh:
                fh.write(b"good bytes")

        def check_then_stop(tmp_path, spec):
            cancel.set()  # the stop arrives after the download, during the check

        with tempfile.TemporaryDirectory() as d, patch.object(
            svc, "_download_model_file", fake_download
        ), patch.object(svc, "_check_downloaded_model", check_then_stop):
            with self.assertRaises(RuntimeError):
                svc.download_voice_model(d, d, "tiny.en", state, cancel)
            installed = [f for _root, _dirs, files in os.walk(d) for f in files]
        self.assertEqual(installed, [])
        self.assertEqual(state["phase"], "failed")
        self.assertEqual(state["error"], "Download cancelled.")


if __name__ == "__main__":
    unittest.main()
