"""A Cancel in the middle of a download that has stalled ends it at once.

The download reads 256 KB at a time and only looks at the Cancel flag between reads, so a connection that
sent a few bytes and then went quiet kept the card on "Stopping the download" until the 120-second limit.
This runs the real download against a small local server that sends its headers and a few bytes and then
stalls, presses Cancel, and checks the card ends within about a second and leaves nothing on disk.
"""

import asyncio
import os
import socket
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_download_service as svc  # noqa: E402


class _Logger:
    def info(self, *_a, **_k):
        pass

    def exception(self, *_a, **_k):
        pass


class _StallingServer:
    """Sends the headers and a few bytes of a large file, then says nothing until stopped."""

    def __init__(self) -> None:
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(4)
        self.port = self.sock.getsockname()[1]
        self.stop = threading.Event()
        self.conns: list = []
        threading.Thread(target=self._serve, daemon=True).start()

    def _serve(self) -> None:
        while not self.stop.is_set():
            try:
                conn, _ = self.sock.accept()
            except OSError:
                return
            self.conns.append(conn)
            try:
                conn.recv(4096)
                conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 5000000\r\n\r\n" + b"z" * 100)
            except OSError:
                pass

    def close(self) -> None:
        self.stop.set()
        for c in self.conns:
            try:
                c.close()
            except OSError:
                pass
        self.sock.close()


class CancelDuringAStalledDownloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancel_wakes_a_read_that_has_no_data_coming(self) -> None:
        server = _StallingServer()
        self.addCleanup(server.close)
        base = f"http://127.0.0.1:{server.port}/lib"
        manifest = {
            "version": "t",
            "chunks": [{"filename": "corpus.db.zlib", "sha256": "ab" * 32, "bytes": 5_000_000}],
            "db_sha256": "cd" * 32,
            "uncompressed_bytes": 1,
            "urls": {"huggingface": f"{base}/manifest.json", "github_release": f"{base}/manifest.json"},
        }
        state = svc.new_rag_corpus_download_state()
        cancel = asyncio.Event()
        with tempfile.TemporaryDirectory() as d, patch.object(
            svc, "fetch_remote_manifest", lambda **_k: manifest
        ), patch.object(svc, "_free_bytes", return_value=0):
            task = asyncio.create_task(
                svc.run_rag_corpus_download(install_dir=d, state=state, logger=_Logger(), cancel_event=cancel)
            )
            for _ in range(40):  # the first bytes have arrived and the read is now blocked
                await asyncio.sleep(0.05)
                if state["bytes_downloaded"] >= 100:
                    break
            self.assertGreaterEqual(state["bytes_downloaded"], 100)
            await asyncio.sleep(0.3)
            self.assertFalse(state["done"])
            t0 = time.monotonic()
            cancel.set()
            await asyncio.wait_for(asyncio.shield(task), timeout=4)
            took = time.monotonic() - t0
            self.assertLess(took, 1.5, "the card kept saying 'Stopping the download' on a stalled connection")
            self.assertEqual(state["phase"], "cancelled")
            self.assertTrue(state["done"])
            # The run only reports cancelled after its worker thread has returned. Nothing may be
            # written afterwards either: a new download could already be using the same folder.
            await asyncio.sleep(0.5)
            left = [f for _r, _ds, files in os.walk(d) for f in files]
        self.assertEqual(left, [])


class _EmptyAfterCancel:
    """A read the Cancel cut short comes back empty, exactly like a finished file does."""

    headers = {"Content-Length": "1000"}

    def __init__(self, cancel: threading.Event):
        self.cancel = cancel

    def read(self, _n):
        self.cancel.set()
        return b""

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


class AnEmptyReadAfterCancelIsNotAFinishedDownload(unittest.TestCase):
    def test_the_half_file_is_not_renamed_into_place(self):
        cancel = threading.Event()
        with tempfile.TemporaryDirectory() as d, patch.object(
            svc, "urlopen_with_ca_fallback", lambda *_a, **_k: _EmptyAfterCancel(cancel)
        ):
            dest = os.path.join(d, "corpus.db.zlib")
            with self.assertRaises(RuntimeError) as ctx:
                svc._download_file("http://x.invalid/a", dest, cancel_event=cancel)
            self.assertEqual(str(ctx.exception), "Cancelled.")
            self.assertFalse(os.path.exists(dest))

    def test_a_response_whose_socket_cannot_be_reached_is_left_alone(self):
        from backend.core.abort_blocked_read import LiveResponse

        holder = LiveResponse()
        holder.abort()
        holder.register(object())  # registered after the Cancel and with no socket: no crash
        holder.abort()


if __name__ == "__main__":
    unittest.main()
