"""Title: Opening a web request that hands over its socket as soon as it exists

Purpose: `urllib.request.urlopen` does not return until the server has sent its reply headers. A server
that is busy (Ollama loading a model, or reading a long question, before its first word) sends those
headers late, so for that whole time the caller holds nothing it could close. This opens a plain-http
request the same way urllib does (same redirects, proxy rules and error types), but reports the
connection's socket the moment it is connected, before the request is even sent. Another thread can then
shut that socket and the blocked call returns at once.
Used for: the streamed chat call to Ollama, so Stop can end a question that has not produced a word yet.
Solves: a Stop pressed during a cold model load that left the Deck's AI busy until the first word.
Does not: shut the socket (`abort_blocked_read.shut_socket` does), decide when to stop, or speak https
(the plugin only talks plain http to Ollama, and `ollama_urls.py` refuses an https address).
"""

from __future__ import annotations

import http.client
import urllib.request
from typing import Any, Callable


class _ReportingConnection(http.client.HTTPConnection):
    """An ordinary connection that tells `on_socket_open` about its socket right after it connects."""

    def __init__(self, *args: Any, on_socket_open: Callable[[Any], None], **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._on_socket_open = on_socket_open

    def connect(self) -> None:
        super().connect()
        self._on_socket_open(self.sock)


class _ReportingHandler(urllib.request.HTTPHandler):
    def __init__(self, on_socket_open: Callable[[Any], None]) -> None:
        super().__init__()
        self._on_socket_open = on_socket_open

    def http_open(self, req: urllib.request.Request) -> Any:
        def make(host: str, **kwargs: Any) -> _ReportingConnection:
            return _ReportingConnection(host, on_socket_open=self._on_socket_open, **kwargs)

        return self.do_open(make, req)


def open_reporting_socket(req: urllib.request.Request, timeout: float, on_socket_open: Callable[[Any], None]) -> Any:
    """Like `urllib.request.urlopen(req, timeout=timeout)`, with `on_socket_open(sock)` called once connected.

    The hook runs on the calling thread, before the request goes out. If it raises, the request fails
    with that error, so callers keep the hook to a plain assignment.
    """
    return urllib.request.build_opener(_ReportingHandler(on_socket_open)).open(req, timeout=timeout)
