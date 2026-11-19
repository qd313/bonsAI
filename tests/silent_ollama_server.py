"""Title: A local stand-in for an Ollama that takes the question and never answers

Purpose: Listens on a free local port, reads each chat request in full, then says nothing at all, the way
Ollama does while it loads a model or reads a long question before its first word. It records how many
requests arrived and when each client went away, so a test can tell whether a Stop really let go of the
connection.
Used for: tests/test_ollama_chat_hears_stop_before_first_word.py and the Stop-before-first-word tests.
Solves: the same raw-socket server being written out in each test that needs a server that never replies.
Does not: speak HTTP back, stream words, or answer a second request any differently from the first.
"""
from __future__ import annotations

import socket
import threading
import time


class SilentOllamaServer:
    def __init__(self) -> None:
        self._listener = socket.socket()
        self._listener.bind(("127.0.0.1", 0))
        self._listener.listen(8)
        self.port = self._listener.getsockname()[1]
        self.url = f"http://127.0.0.1:{self.port}/api/chat"
        self.requests_seen = 0
        self.client_gone_at: list[float] = []
        self.got_request = threading.Event()
        self.client_gone = threading.Event()
        self._conns: list[socket.socket] = []
        self._stopping = False
        threading.Thread(target=self._accept_loop, daemon=True).start()

    def _accept_loop(self) -> None:
        while not self._stopping:
            try:
                conn, _ = self._listener.accept()
            except OSError:
                return
            self._conns.append(conn)
            threading.Thread(target=self._hold, args=(conn,), daemon=True).start()

    def _hold(self, conn: socket.socket) -> None:
        buf = b""
        try:
            while b"\r\n\r\n" not in buf:
                piece = conn.recv(65536)
                if not piece:
                    break
                buf += piece
            head, _, body = buf.partition(b"\r\n\r\n")
            want = 0
            for line in head.split(b"\r\n"):
                if line.lower().startswith(b"content-length:"):
                    want = int(line.split(b":", 1)[1])
            while len(body) < want:
                piece = conn.recv(65536)
                if not piece:
                    break
                body += piece
            self.requests_seen += 1
            self.got_request.set()
            while conn.recv(65536):  # nothing is ever sent; this returns only when the client is gone
                pass
        except OSError:
            pass
        self.client_gone_at.append(time.monotonic())
        self.client_gone.set()

    def close(self) -> None:
        self._stopping = True
        try:
            self._listener.close()
        except OSError:
            pass
        for conn in self._conns:
            try:
                conn.close()
            except OSError:
                pass
