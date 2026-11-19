"""Title: A Cancel ends the speech model's second-choice download even when the connection has gone quiet

Purpose: When curl is missing or fails, the speech model is fetched by Python's own download. It looked at the
Cancel flag between reads, but a read on a stalled connection (the very case where curl has just failed) waits up
to 120 seconds, and so did the Cancel. These pin, with a real local server that sends a few bytes and then goes
quiet, that a Cancel ends the download within about a second as "Download cancelled.", leaves no `.part` file, and
is never taken for a finished file.

Used for: voice_model_download_service._download_model_file (the fallback after curl),
abort_blocked_read.abort_when_cancelled.
Does not: Test curl (see test_voice_model_download_stop), reach the network or check the file's hash.
"""

from __future__ import annotations

import os
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import MagicMock, patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.core.abort_blocked_read import LiveResponse, abort_when_cancelled  # noqa: E402
from backend.voice import voice_model_download_service as svc  # noqa: E402


class _SendsAFewBytesThenGoesQuiet(BaseHTTPRequestHandler):
    release = threading.Event()

    def do_GET(self):  # noqa: N802 -- the name http.server looks for
        self.send_response(200)
        self.send_header("Content-Length", str(10_000_000))
        self.end_headers()
        self.wfile.write(b"x" * 2048)
        self.wfile.flush()
        self.release.wait(30)

    def log_message(self, *_args):
        pass


class _Server:
    def __enter__(self):
        _SendsAFewBytesThenGoesQuiet.release = threading.Event()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), _SendsAFewBytesThenGoesQuiet)
        self.httpd.daemon_threads = True
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        return f"http://127.0.0.1:{self.httpd.server_address[1]}/model.bin"

    def __exit__(self, *_exc):
        _SendsAFewBytesThenGoesQuiet.release.set()
        self.httpd.shutdown()
        self.httpd.server_close()


class TheSecondChoiceDownloadHearsACancelOnAStalledConnection(unittest.TestCase):
    def test_a_cancel_after_a_third_of_a_second_ends_the_download_within_about_a_second(self):
        cancel = threading.Event()
        with _Server() as url, tempfile.TemporaryDirectory() as folder:
            part = os.path.join(folder, "ggml.bin.part")
            threading.Timer(0.3, cancel.set).start()
            started = time.monotonic()
            with patch.object(svc.shutil, "which", return_value=None):  # no curl: Python's own download
                with self.assertRaises(RuntimeError) as ctx:
                    svc._download_model_file(url, part, cancel, None, 20_000_000)
            elapsed = time.monotonic() - started
            self.assertEqual(str(ctx.exception), svc.CANCELLED_LINE)
            self.assertLess(elapsed, 2)
            self.assertFalse(os.path.exists(part))

    def test_a_download_that_is_not_cancelled_still_finishes(self):
        class Whole(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                self.send_response(200)
                self.send_header("Content-Length", "5000")
                self.end_headers()
                self.wfile.write(b"y" * 5000)

            def log_message(self, *_args):
                pass

        httpd = ThreadingHTTPServer(("127.0.0.1", 0), Whole)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            with tempfile.TemporaryDirectory() as folder, patch.object(svc.shutil, "which", return_value=None):
                part = os.path.join(folder, "ggml.bin.part")
                svc._download_model_file(f"http://127.0.0.1:{httpd.server_address[1]}/m", part, threading.Event(), None, 20_000_000)
                self.assertEqual(os.path.getsize(part), 5000)
        finally:
            httpd.shutdown()
            httpd.server_close()


class TheWatcherThatWakesABlockedRead(unittest.TestCase):
    def test_a_cancel_aborts_the_live_response_and_the_watcher_ends_with_the_block(self):
        cancel, connection = threading.Event(), LiveResponse()
        with patch.object(connection, "abort") as abort:
            with abort_when_cancelled(cancel, connection):
                cancel.set()
                deadline = time.monotonic() + 2
                while not abort.called and time.monotonic() < deadline:
                    time.sleep(0.01)
        abort.assert_called_once()

    def test_leaving_the_block_without_a_cancel_aborts_nothing_and_stops_the_watcher(self):
        cancel, connection = threading.Event(), MagicMock()
        before = threading.active_count()
        with abort_when_cancelled(cancel, connection):
            pass
        time.sleep(0.05)
        connection.abort.assert_not_called()
        self.assertLessEqual(threading.active_count(), before)


if __name__ == "__main__":
    unittest.main()
