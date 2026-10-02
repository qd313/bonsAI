"""Title: A fake streamed answer from Ollama, for back-end tests

Purpose: One stand-in for the HTTP response `urllib.request.urlopen` returns while Ollama streams
an answer: it replays a list of NDJSON lines through `read1`, the same read call the real stream
uses, and works as a context manager the way the real response does.
Used for: tests/test_ollama_service.py (the answer's own stream), tests/test_chat_summary_service.py and
tests/test_chat_summary_title.py (plan 68's summary call, which reuses the answer's streamed call; they
also share the stand-in plugin and the one-line reply below).
Solves: The same 20-line fake class was written out in each of those files (a back-end-test
duplication scripts/ratchet.py's duplicate_lines_be_tests counts); plan 68's summary tests added a
third copy before it was lifted here.
Does not: Pause, fail, or time out -- a test that needs a slow or broken response still builds
its own, because what it is testing is exactly that difference.
"""
from __future__ import annotations

import json
import threading


def ndjson_response(lines: list[str]):
    """A fake urlopen response that replays ``lines`` as NDJSON, one line each, then ends."""
    body = ("\n".join(lines) + "\n").encode("utf-8")
    idx = {"i": 0}

    class _Rsp:
        def read1(self, n: int):
            chunk = body[idx["i"] : idx["i"] + n]
            idx["i"] += len(chunk)
            return chunk

        def close(self) -> None:
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            pass

    return _Rsp()


class FakePlugin:
    """The handful of attributes ``write_chat_summary`` reads and sets on ``plugin`` -- the same
    ones the real Plugin class carries for the answer's own streamed call."""

    def __init__(self):
        self._abort_current_ollama_chat = threading.Event()
        self._chat_resp_ready_evt = None
        self._active_ollama_chat_http_response = None
        self._active_ollama_chat_pc_ip = None
        self._active_ollama_chat_model = None

    def _abort_ollama_chat_check(self) -> bool:
        return self._abort_current_ollama_chat.is_set()


def one_line_reply(text: str):
    """A fake streamed reply holding ``text`` as the whole assistant message."""
    return ndjson_response([json.dumps({"message": {"role": "assistant", "content": text}, "done": True})])
