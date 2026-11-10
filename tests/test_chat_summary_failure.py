"""Tests for why a chat summary call failed (plan 103 lane B2).

A chat of forty-odd questions once showed "Couldn't sum up the chat this time" after about 68
seconds and the log could not say why: every failure logged the same line, and an HTTP error's
own words never reached the log at all. These tests pin the reason each way a summary call can
end, at the three places a person or the log reader looks: the outcome, the log line, and the
text of the failure the plain-language classifier is given (built by the same reply builders the
streamed call uses, so a reworded builder breaks a test instead of silently falling to "unknown").
"""

import asyncio
import io
import json
import time
import unittest
import urllib.error
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask.ollama_stream_failures import (
    http_error_reply,
    request_failed_reply,
    timed_out_reply,
    url_error_reply,
)
from backend.chats.chat_summary_failure import (
    REASON_CUT_OFF,
    REASON_EMPTY,
    REASON_MODEL_ERROR,
    REASON_NO_ROOM,
    REASON_TIMED_OUT,
    REASON_UNKNOWN,
    REASON_UNREACHABLE,
    explain_failed_call,
)
from backend.chats.chat_summary_service import SummaryPlan, write_chat_summary
from backend.ollama.token_accounting_service import reset_token_accounting
from fake_ollama_stream import FakePlugin, ndjson_response, one_line_reply

_TURNS = [
    {"id": "q0", "role": "user", "text": "how do i beat the first boss", "app_name": "Hades"},
    {"id": "a0", "role": "assistant", "text": "Dash through the fire.", "app_name": "Hades"},
]
_RUNNER_STOPPED = "llama runner process has terminated: exit status 2"


class _Slow:
    """A response whose first read outlasts the (patched, short) time limit."""

    def read1(self, _n):
        time.sleep(0.4)
        return b""

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass


class ExplainFailedCallTests(unittest.TestCase):
    def _why(self, result, **kw):
        return explain_failed_call(result, **kw)[0]

    def test_each_reply_the_stream_builds_gets_its_own_reason(self):
        http = http_error_reply(500, _RUNNER_STOPPED, "m", False)
        http["body"] = _RUNNER_STOPPED
        self.assertEqual(self._why(http), REASON_MODEL_ERROR)
        self.assertEqual(self._why(timed_out_reply("m", 120)), REASON_TIMED_OUT)
        self.assertEqual(self._why(url_error_reply(ConnectionRefusedError(), "m", 120)), REASON_UNREACHABLE)
        self.assertEqual(self._why(url_error_reply(TimeoutError(), "m", 120)), REASON_UNREACHABLE)
        self.assertEqual(self._why(request_failed_reply("m")), REASON_CUT_OFF)
        self.assertEqual(self._why({"success": False, "response": "mystery"}), REASON_UNKNOWN)

    def test_the_servers_own_words_reach_the_detail(self):
        reply = http_error_reply(500, _RUNNER_STOPPED, "m", False)
        reason, detail = explain_failed_call(reply)
        self.assertEqual(reason, REASON_MODEL_ERROR)
        self.assertIn("HTTP 500", detail)
        self.assertIn(_RUNNER_STOPPED, detail)

    def test_a_server_that_says_the_chat_did_not_fit_is_no_room(self):
        body = '{"error":"the input length exceeds the context length"}'
        self.assertEqual(self._why(http_error_reply(400, body, "m", False)), REASON_NO_ROOM)

    def test_a_long_detail_is_cut_and_kept_on_one_line(self):
        reply = http_error_reply(500, "line one\n" + "x" * 900, "m", False)
        _reason, detail = explain_failed_call(reply)
        self.assertNotIn("\n", detail)
        self.assertLessEqual(len(detail), 300)

    def test_a_good_call_with_nothing_left_after_cleaning_is_empty(self):
        reason, detail = explain_failed_call(
            {"success": True, "done_reason": "length", "eval_count": 400},
            reply_was_empty=True, reply_chars=0, kept_chars=0,
        )
        self.assertEqual(reason, REASON_EMPTY)
        self.assertIn("length", detail)


class WriteChatSummaryReasonTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()
        self.plugin = FakePlugin()
        self.plan = SummaryPlan(
            needed=True, covered_turns=_TURNS, kept_turns=[], oldest_turns_unread=0, previous=None
        )

    def _run(self):
        """The summary call, and every line it logged (info and warning), formatted."""
        with patch("backend.chats.chat_summary_service.logger") as log:
            outcome = asyncio.run(
                write_chat_summary(
                    self.plugin, chat={"turns": _TURNS}, plan=self.plan,
                    model_name="gemma4:e2b-it-qat", url="http://127.0.0.1:11434/api/chat",
                    keep_alive="5m", window_tokens=16384, reply_language="english", request_id=1,
                )
            )
        lines = [c.args[0] % c.args[1:] for c in log.info.call_args_list + log.warning.call_args_list]
        return outcome, "\n".join(lines)

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_a_server_error_logs_the_servers_own_words(self, mock_urlopen):
        """The commonest way a loaded Deck fails: the model's runner dies and Ollama answers HTTP
        500. The log used to say only "failed"; the body that names the cause was never written."""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            "http://x/api/chat", 500, "err", {}, io.BytesIO(_RUNNER_STOPPED.encode())
        )

        outcome, log = self._run()

        self.assertEqual((outcome.status, outcome.reason), ("failed", REASON_MODEL_ERROR))
        self.assertIn("chat_summary: failed in", log)
        self.assertIn(REASON_MODEL_ERROR, log)
        self.assertIn(_RUNNER_STOPPED, log)
        self.assertIn("16384", log)  # the window, beside the input estimate

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_an_error_streamed_mid_answer_is_a_model_error_with_its_words(self, mock_urlopen):
        mock_urlopen.return_value = ndjson_response([json.dumps({"error": "model runner has unexpectedly stopped"})])

        outcome, log = self._run()

        self.assertEqual(outcome.reason, REASON_MODEL_ERROR)
        self.assertIn("model runner has unexpectedly stopped", log)

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_a_stream_that_ends_without_finishing_is_cut_off(self, mock_urlopen):
        mock_urlopen.return_value = ndjson_response(
            [json.dumps({"message": {"role": "assistant", "content": "Game: Hades"}})]
        )

        outcome, log = self._run()

        self.assertEqual((outcome.status, outcome.reason), ("failed", REASON_CUT_OFF))
        self.assertIn(REASON_CUT_OFF, log)

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_no_connection_is_unreachable(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError(ConnectionRefusedError())

        outcome, _log = self._run()

        self.assertEqual(outcome.reason, REASON_UNREACHABLE)

    @patch("backend.chats.chat_summary_service.SUMMARY_TIME_LIMIT_SECONDS", 0.1)
    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_running_out_of_time_says_so_in_the_outcome_and_the_log(self, mock_urlopen):
        mock_urlopen.return_value = _Slow()

        outcome, log = self._run()

        self.assertEqual((outcome.status, outcome.reason), ("timed_out", REASON_TIMED_OUT))
        self.assertIn("chat_summary: timed_out in", log)
        self.assertIn("limit", log)

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_an_empty_reply_says_how_the_model_ended(self, mock_urlopen):
        mock_urlopen.return_value = ndjson_response(
            [json.dumps({"message": {"role": "assistant", "content": ""}, "done": True, "done_reason": "length"})]
        )

        outcome, log = self._run()

        self.assertEqual((outcome.status, outcome.reason), ("failed", REASON_EMPTY))
        self.assertIn("length", log)

    @patch("backend.ask.ollama_chat_stream.urllib.request.urlopen")
    def test_a_written_summary_has_no_reason(self, mock_urlopen):
        mock_urlopen.return_value = one_line_reply("Player asked how to beat the first boss.")

        outcome, log = self._run()

        self.assertEqual((outcome.status, outcome.reason), ("written", ""))
        self.assertIn("chat_summary: written in", log)


if __name__ == "__main__":
    unittest.main()
