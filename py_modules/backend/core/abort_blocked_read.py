"""Title: Waking a download read that is stuck waiting for data that never comes

Purpose: A download reads from its connection in a loop and looks at the Cancel flag between reads. A read
on a connection that went quiet does not return, so Cancel waited for the read's time limit. This holds the
download's live response so that, from another thread, the connection's socket can be shut down; that makes
the blocked read return at once, and the loop's next look at the flag ends the download. Also reads with a
call that returns as soon as any data has arrived, so a slow trickle still lets the loop look at the flag.
Used for: the knowledge library download; the voice download can use the same two helpers.
Solves: a Cancel that sat on "Stopping the download" for up to two minutes on a stalled connection.
Does not: end the download itself (the reader does, when it sees the flag), close the response (closing from
another thread can wait on the reader's own lock), or help while a connection is still being opened (before
any response exists). Every step is best effort: if the socket cannot be reached nothing happens, never a crash.
"""

from __future__ import annotations

import socket
import sys
import threading
from typing import Any, Optional


def read_some(resp: Any, size: int) -> bytes:
    """Up to `size` bytes, returning as soon as any have arrived (plain `read` waits for all of them)."""
    read1 = getattr(resp, "read1", None)
    return read1(size) if callable(read1) else resp.read(size)


def shut_response_socket(resp: Any) -> bool:
    """Shut the response's socket down for reading and writing. True when a socket was found and shut."""
    try:
        sock = resp.fp.raw._sock  # urllib's response -> buffered reader -> socket stream -> socket
    except Exception:
        return False
    if sock is None:
        return False
    shut = False
    try:
        sock.shutdown(socket.SHUT_RDWR)  # an SSL socket's shutdown does the same on its plain socket
        shut = True
    except Exception:
        pass
    if sys.platform == "win32":
        # Windows does not wake a read that is already blocked when its socket is only shut down; the
        # read returns when the socket itself is closed. (This PC is where the tests run; the Deck is
        # Linux, where the shutdown above is what wakes the read. Closing the socket's number under a
        # blocked read is not safe on Linux, so this is not done there.)
        try:
            sock._real_close()
            shut = True
        except Exception:
            pass
    return shut


class LiveResponse:
    """Where a download registers the response it is reading, so a Cancel can wake that read."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._resp: Optional[Any] = None
        self._aborted = False

    def register(self, resp: Any) -> None:
        with self._lock:
            self._resp = resp
            if self._aborted:  # the Cancel came before this response existed
                shut_response_socket(resp)

    def clear(self) -> None:
        with self._lock:
            self._resp = None

    def abort(self) -> None:
        with self._lock:
            self._aborted = True
            if self._resp is not None:
                shut_response_socket(self._resp)
