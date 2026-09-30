"""Size limits on everything the Ollama address sends back (security review 0.6.0, finding 6).

Each test stands in for a fake Ollama that never stops talking, and checks two things: the reply is
cut at the limit (reading stops, the connection is closed, the caller gets its usual error), and
nothing below the limit changes (a long real answer still arrives whole).
"""

import io
import json
import time
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

from backend import ollama_reply_limits as limits
from backend.ollama_reply_limits import OllamaReplyTooLarge
from backend.services import (
    local_ollama_setup_service,
    ollama_embed_service,
    ollama_health_probe,
    ollama_preload_service,
    ollama_stop_service,
    response_verify,
    token_accounting_service,
)
from backend.services.ollama_service import post_ollama_chat
from fake_ollama_stream import ndjson_response


class _EndlessBody:
    """A fake reply whose body never ends. Counts what was handed out and whether it was closed."""

    def __init__(self, filler: bytes = b"x"):
        self.filler = filler
        self.served = 0
        self.closed = False

    def read(self, n: int = -1) -> bytes:
        if n is None or n < 0:
            raise AssertionError("an unbounded read() on the Ollama address")
        self.served += n
        return self.filler * n

    def close(self) -> None:
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass


class _EndlessStream:
    """A fake streamed reply. Serves ``piece`` forever through read1 and counts what it served."""

    def __init__(self, piece: bytes):
        self.piece = piece
        self.served = 0
        self.closed = False

    def read1(self, n: int) -> bytes:
        self.served += len(self.piece)
        return self.piece

    def close(self) -> None:
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass


class CappedReadTests(unittest.TestCase):
    def test_a_reply_past_the_cap_is_cut_closed_and_reported(self) -> None:
        body = _EndlessBody()
        with self.assertRaises(OllamaReplyTooLarge):
            limits.read_capped(body, limit=1000, what="test reply")
        self.assertTrue(body.closed)
        self.assertLessEqual(body.served, 1001)

    def test_the_cut_logs_exactly_one_line(self) -> None:
        lg = MagicMock()
        with self.assertRaises(OllamaReplyTooLarge):
            limits.read_capped(_EndlessBody(), limit=10, what="test reply", logger=lg)
        self.assertEqual(lg.warning.call_count, 1)

    def test_a_reply_of_exactly_the_cap_passes(self) -> None:
        raw = limits.read_capped(io.BytesIO(b"a" * 1000), limit=1000)
        self.assertEqual(len(raw), 1000)

    def test_a_normal_reply_is_returned_untouched(self) -> None:
        payload = {"models": [{"name": f"m{i}", "size": i} for i in range(5000)]}
        got = limits.read_json_capped(io.BytesIO(json.dumps(payload).encode("utf-8")))
        self.assertEqual(got, payload)

    def test_the_error_body_is_cut_and_never_raises(self) -> None:
        err = urllib.error.HTTPError("http://x/api/chat", 500, "boom", None, io.BytesIO(b"e" * 500_000))  # type: ignore[arg-type]
        self.assertEqual(len(limits.read_error_body(err)), limits.MAX_ERROR_BODY_BYTES)

        class _Broken:
            def read(self, n: int = -1):
                raise OSError("gone")

        self.assertEqual(limits.read_error_body(_Broken()), "")

    def test_the_caps_are_generous(self) -> None:
        # Real biggest shapes: a model list of a few hundred KB, a vector batch of about 1 MB.
        self.assertGreaterEqual(limits.MAX_REPLY_BODY_BYTES, 16 * 1024 * 1024)
        self.assertGreaterEqual(limits.MAX_STREAM_LINE_BYTES, 1024 * 1024)
        self.assertGreaterEqual(limits.MAX_STREAM_ANSWER_CHARS, 8_000_000)


class EveryBareReadIsCappedTests(unittest.TestCase):
    """One test per call site: an endless reply is cut, and the caller ends the way it always ends."""

    def test_health_probe_stops_on_an_endless_version_reply(self) -> None:
        body = _EndlessBody()
        with patch("backend.services.ollama_health_probe.urllib.request.urlopen", return_value=body):
            with self.assertRaises(OllamaReplyTooLarge):
                ollama_health_probe.probe_ollama_health("http://x:1", time.time() + 5)
        self.assertTrue(body.closed)
        self.assertLessEqual(body.served, limits.MAX_REPLY_BODY_BYTES + 1)

    def test_health_probe_still_reads_a_normal_host(self) -> None:
        def fake(req, timeout=None):
            url = req.full_url
            if url.endswith("/api/version"):
                return io.BytesIO(b'{"version":"0.5.7"}')
            if url.endswith("/api/tags"):
                return io.BytesIO(b'{"models":[{"name":"a"},{"name":"b"}]}')
            return io.BytesIO(b'{"models":[]}')

        with patch("backend.services.ollama_health_probe.urllib.request.urlopen", side_effect=fake):
            out = ollama_health_probe.probe_ollama_health("http://x:1", time.time() + 5)
        self.assertEqual(out["models"], ["a", "b"])

    def test_health_probe_endless_ps_reply_gives_an_empty_list(self) -> None:
        def fake(req, timeout=None):
            if req.full_url.endswith("/api/ps"):
                return _EndlessBody()
            if req.full_url.endswith("/api/version"):
                return io.BytesIO(b'{"version":"1"}')
            return io.BytesIO(b'{"models":[]}')

        with patch("backend.services.ollama_health_probe.urllib.request.urlopen", side_effect=fake):
            out = ollama_health_probe.probe_ollama_health("http://x:1", time.time() + 5)
        self.assertEqual(out["ps_loaded"], [])

    def test_installed_tag_list_and_sizes_give_empty_on_an_endless_reply(self) -> None:
        for fn, empty in (
            (local_ollama_setup_service.list_installed_ollama_tags, []),
            (local_ollama_setup_service.list_installed_ollama_tag_sizes, {}),
        ):
            body = _EndlessBody()
            with patch(
                "backend.services.local_ollama_setup_service.urllib.request.urlopen", return_value=body
            ):
                self.assertEqual(fn("http://x:1"), empty)
            self.assertTrue(body.closed)

    def test_installed_tag_list_still_reads_a_normal_reply(self) -> None:
        raw = io.BytesIO(b'{"models":[{"name":"a:1","size":5}]}')
        with patch("backend.services.local_ollama_setup_service.urllib.request.urlopen", return_value=raw):
            self.assertEqual(local_ollama_setup_service.list_installed_ollama_tags("http://x:1"), ["a:1"])

    def test_token_accounting_reads_give_empty_on_an_endless_reply(self) -> None:
        for fn in (
            token_accounting_service._read_loaded_windows,
            token_accounting_service._read_model_limits,
        ):
            body = _EndlessBody()
            with patch("backend.services.token_accounting_service.urllib.request.urlopen", return_value=body):
                self.assertEqual(fn("http://x:1"), {})
            self.assertTrue(body.closed)

    def test_embed_raises_its_own_error_on_an_endless_reply(self) -> None:
        body = _EndlessBody()
        with patch("backend.services.ollama_embed_service.urllib.request.urlopen", return_value=body):
            with self.assertRaises(ollama_embed_service.OllamaEmbedError):
                ollama_embed_service.embed_texts("m", ["hello"], base_http="http://x:1")
        self.assertTrue(body.closed)

    def test_embed_error_body_is_read_capped(self) -> None:
        big = io.BytesIO(b"e" * 500_000)
        err = urllib.error.HTTPError("http://x/api/embed", 500, "boom", None, big)  # type: ignore[arg-type]
        with patch("backend.services.ollama_embed_service.urllib.request.urlopen", side_effect=err):
            with self.assertRaises(ollama_embed_service.OllamaEmbedError) as ctx:
                ollama_embed_service.embed_texts("m", ["hello"], base_http="http://x:1")
        self.assertIn("HTTP 500", str(ctx.exception))
        self.assertLessEqual(big.tell(), limits.MAX_ERROR_BODY_BYTES)

    def test_embed_still_reads_a_real_batch(self) -> None:
        vecs = [[0.123456789] * 768 for _ in range(200)]
        raw = io.BytesIO(json.dumps({"embeddings": vecs}).encode("utf-8"))
        with patch("backend.services.ollama_embed_service.urllib.request.urlopen", return_value=raw):
            out = ollama_embed_service.embed_texts("m", ["t"] * 200, base_http="http://x:1")
        self.assertEqual(len(out), 200)

    def test_preload_model_list_read_is_capped(self) -> None:
        body = _EndlessBody()
        lg = MagicMock()
        with patch("backend.services.ollama_preload_service.urllib.request.urlopen", return_value=body):
            ollama_preload_service.preload_ask_model_sync("http://x:1", lg)
        self.assertTrue(body.closed)
        self.assertLessEqual(body.served, limits.MAX_REPLY_BODY_BYTES + 1)

    def test_preload_warm_up_reply_is_capped(self) -> None:
        tags = json.dumps({"models": [{"name": "q:1b", "details": {"parameter_size": "1B"}}]}).encode("utf-8")
        gen = _EndlessBody()
        with patch("backend.services.ollama_preload_service.choose_window_tokens", return_value=0), patch(
            "backend.services.ollama_preload_service.urllib.request.urlopen",
            side_effect=[io.BytesIO(tags), gen],
        ):
            ollama_preload_service.preload_ask_model_sync("http://x:1", MagicMock())
        self.assertTrue(gen.closed)
        self.assertLessEqual(gen.served, limits.MAX_REPLY_BODY_BYTES + 1)

    def test_second_pass_check_passes_quietly_on_an_endless_reply(self) -> None:
        body = _EndlessBody()
        with patch("backend.services.response_verify.urllib.request.urlopen", return_value=body):
            out = response_verify.run_verifier_second_pass(
                chat_url="http://x:1/api/chat", model_name="m", response_text="an answer", has_game=True
            )
        self.assertEqual(out.get("error"), "request_failed")
        self.assertTrue(out.get("passed"))
        self.assertTrue(body.closed)

    def test_unload_error_body_is_read_capped(self) -> None:
        big = io.BytesIO(b"e" * 500_000)
        err = urllib.error.HTTPError("http://x/api/generate", 500, "boom", None, big)  # type: ignore[arg-type]
        with patch("backend.services.ollama_stop_service.urllib.request.urlopen", side_effect=err):
            ok = ollama_stop_service.request_ollama_stop_model_via_api("http://x:1", "m", MagicMock(), timeout_seconds=1.0)
        self.assertFalse(ok)
        self.assertLessEqual(big.tell(), limits.MAX_ERROR_BODY_BYTES * 4)


def _ask(response, lg=None):
    with patch("backend.services.ollama_chat_stream.urllib.request.urlopen", return_value=response):
        return post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "system", "content": "x"}],
            60,
            [],
            [],
            [],
            [],
            lg or MagicMock(),
            "speed",
            "5m",
            cancel_requested=lambda: False,
        )


class StreamedAnswerLimitTests(unittest.TestCase):
    def test_a_line_that_never_ends_is_cut(self) -> None:
        stream = _EndlessStream(b'{"message":{"content":"' + b"a" * 4000)
        out = _ask(stream)
        self.assertFalse(out.get("success"))
        self.assertIn("larger than any real", out.get("response", ""))
        self.assertTrue(stream.closed)
        self.assertLessEqual(stream.served, limits.MAX_STREAM_LINE_BYTES + 8192)

    def test_an_answer_that_never_finishes_is_cut(self) -> None:
        piece = ('{"message":{"content":"' + "b" * 900 + '"}}\n').encode("utf-8")
        stream = _EndlessStream(piece)
        out = _ask(stream)
        self.assertFalse(out.get("success"))
        self.assertIn("larger than any real", out.get("response", ""))
        self.assertTrue(stream.closed)
        # It stopped soon after the cap, not after some multiple of it.
        self.assertLessEqual(stream.served, (limits.MAX_STREAM_ANSWER_CHARS // 900 + 3) * len(piece))

    def test_the_cut_is_logged_once(self) -> None:
        lg = MagicMock()
        _ask(_EndlessStream(b'{"message":{"content":"' + b"a" * 4000), lg)
        cut_lines = [c for c in lg.warning.call_args_list if "too large" in str(c.args[0])]
        self.assertEqual(len(cut_lines), 1)

    def test_a_long_normal_answer_passes_untouched(self) -> None:
        pieces = ["word " * 10 for _ in range(1000)]  # 50,000 characters in 1,000 lines
        lines = [json.dumps({"message": {"role": "assistant", "content": p}}) for p in pieces]
        lines.append(json.dumps({"message": {"content": ""}, "done": True, "done_reason": "stop"}))
        out = _ask(ndjson_response(lines))
        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("assistant_raw"), "".join(pieces))
        self.assertEqual(len(out.get("assistant_raw")), 50_000)

    def test_a_long_single_line_below_the_line_cap_passes(self) -> None:
        big = "z" * 500_000
        lines = [
            json.dumps({"message": {"content": big}}),
            json.dumps({"message": {"content": ""}, "done": True}),
        ]
        out = _ask(ndjson_response(lines))
        self.assertTrue(out.get("success"))
        self.assertEqual(len(out.get("assistant_raw")), 500_000)

    def test_the_error_body_of_a_failed_chat_is_read_capped(self) -> None:
        big = io.BytesIO(b"e" * 500_000)
        err = urllib.error.HTTPError("http://x/api/chat", 500, "boom", None, big)  # type: ignore[arg-type]
        with patch("backend.services.ollama_chat_stream.urllib.request.urlopen", side_effect=err):
            out = post_ollama_chat(
                "http://127.0.0.1:11434/api/chat",
                "vision:test",
                [{"role": "system", "content": "x"}],
                60,
                [],
                [],
                [],
                [],
                MagicMock(),
                "speed",
                "5m",
                cancel_requested=lambda: False,
            )
        self.assertFalse(out.get("success"))
        self.assertLessEqual(len(out.get("body", "")), limits.MAX_ERROR_BODY_BYTES)


if __name__ == "__main__":
    unittest.main()
