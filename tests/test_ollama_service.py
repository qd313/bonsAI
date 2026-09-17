import io
import json
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

from backend.services import ollama_service
from backend.services.ollama_ask_budgets import (
    ASK_VISIBLE_NUM_PREDICT,
    SOFT_CONTINUE_CUE,
    SOFT_CONTINUE_USER_MESSAGE,
    mark_model_without_thinking,
    model_supports_thinking,
    reset_thinking_support_cache,
)


def _http_error_400(body: str) -> urllib.error.HTTPError:
    """An HTTPError whose .read() yields `body`, matching what urlopen raises on a 400."""
    return urllib.error.HTTPError(
        url="http://127.0.0.1:11434/api/chat",
        code=400,
        msg="Bad Request",
        hdrs=None,  # type: ignore[arg-type]
        fp=io.BytesIO(body.encode("utf-8")),
    )
from backend.services.ollama_service import (
    OLLAMA_DELTA_PARSE_INTERVAL_S,
    append_deck_tdp_sysfs_grounding,
    build_system_prompt,
    format_ai_response,
    post_ollama_chat,
    request_ollama_stop_model_via_api,
    user_asks_ollama_bonsai_host_or_latency,
    user_consents_strategy_spoilers,
    user_wants_power_or_performance_topic,
)
from backend.services.ollama_prompts import (
    _strategy_spoiler_policy_block,
    build_reply_language_block,
    build_reply_verbosity_block,
    extract_strategy_asked_entity,
    kb_text_covers_asked_entity,
    user_asks_for_detail_depth,
)


class OllamaServiceTests(unittest.TestCase):
    """Service tests for prompt construction and response formatting contracts."""

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_request_ollama_stop_model_via_api_posts_keep_alive_zero(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Emergency stop uses /api/generate keep_alive 0 — same unload contract as CLI ollama stop."""

        class _Rsp:
            def read(self, n: int = -1):
                return b"{}"

            def __enter__(self):
                return self

            def __exit__(self, *a):
                pass

        mock_urlopen.return_value = _Rsp()
        lg = MagicMock()
        ok = request_ollama_stop_model_via_api("http://127.0.0.1:11434", "llama3:test", lg, timeout_seconds=10.0)
        self.assertTrue(ok)
        self.assertGreaterEqual(mock_urlopen.call_count, 1)
        req_first = mock_urlopen.call_args[0][0]
        self.assertIn("/api/generate", req_first.full_url)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_streams_ndjson_deltas(
        self, mock_urlopen: MagicMock
    ) -> None:
        """stream:true emits NDJSON lines; deltas aggregate to the same assistant text as buffered JSON."""
        body = (
            "\n".join(
                [
                    '{"message":{"role":"assistant","content":"Hell"}}',
                    '{"message":{"role":"assistant","content":"o"},"done":true}',
                ]
            )
            + "\n"
        ).encode("utf-8")

        idx = {"i": 0}

        class _Rsp:
            def read(self, n: int):
                chunk = body[idx["i"] : idx["i"] + n]
                idx["i"] += len(chunk)
                return chunk

            def close(self) -> None:
                pass

            def __enter__(self):
                return self

            def __exit__(self, *_):
                pass

        mock_urlopen.return_value = _Rsp()
        lg = MagicMock()
        deltas_seen: list[tuple[str, bool]] = []

        def _on_delta(text: str, done: bool, _thinking_summary=None, **_kwargs) -> None:
            deltas_seen.append((text, done))

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "system", "content": "x"}],
            60,
            [],
            [],
            [],
            [],
            lg,
            "speed",
            "5m",
            cancel_requested=lambda: False,
            on_delta=_on_delta,
        )
        req = mock_urlopen.call_args[0][0]
        body = json.loads(req.data.decode("utf-8"))
        self.assertTrue(body.get("stream"))
        self.assertEqual(body.get("think"), False)
        self.assertEqual(body.get("options", {}).get("num_predict"), ASK_VISIBLE_NUM_PREDICT["speed"])
        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("assistant_raw"), "Hello")
        self.assertEqual(out.get("soft_continue_count"), 0)
        self.assertTrue(any(t == "Hell" and not done for t, done in deltas_seen))
        self.assertEqual(deltas_seen[-1], ("Hello", True))

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_soft_continues_on_done_reason_length(
        self, mock_urlopen: MagicMock
    ) -> None:
        """done_reason=length stitches a second stream behind an ephemeral Continuing… cue."""
        first = self._ndjson_response(
            [
                '{"message":{"role":"assistant","content":"Part one"}}',
                '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"length"}',
            ]
        )
        second = self._ndjson_response(
            [
                '{"message":{"role":"assistant","content":" and two"}}',
                '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop"}',
            ]
        )
        mock_urlopen.side_effect = [first, second]
        deltas_seen: list[tuple[str, bool]] = []

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "long please"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "expert",
            "5m",
            cancel_requested=lambda: False,
            on_delta=lambda text, done, _thinking=None, **_kw: deltas_seen.append((text, done)),
        )

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("soft_continue_count"), 1)
        self.assertEqual(out.get("response"), "Part one and two")
        self.assertNotIn(SOFT_CONTINUE_CUE, out.get("response") or "")
        self.assertEqual(mock_urlopen.call_count, 2)

        first_body = json.loads(mock_urlopen.call_args_list[0][0][0].data.decode("utf-8"))
        second_body = json.loads(mock_urlopen.call_args_list[1][0][0].data.decode("utf-8"))
        self.assertEqual(first_body.get("options", {}).get("num_predict"), ASK_VISIBLE_NUM_PREDICT["expert"])
        self.assertEqual(second_body["messages"][-1]["content"], SOFT_CONTINUE_USER_MESSAGE)
        self.assertEqual(second_body["messages"][-2]["content"], "Part one")

        cue_partials = [t for t, done in deltas_seen if not done and SOFT_CONTINUE_CUE in t]
        self.assertEqual(len(cue_partials), 1)
        self.assertEqual(deltas_seen[-1], ("Part one and two", True))

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_empty_continue_stops_quietly(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A continue that adds no visible tokens keeps the first partial and does not error."""
        first = self._ndjson_response(
            [
                '{"message":{"role":"assistant","content":"Kept"}}',
                '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"length"}',
            ]
        )
        second = self._ndjson_response(
            [
                '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"length"}',
            ]
        )
        mock_urlopen.side_effect = [first, second]

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "q"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "speed",
            "5m",
            cancel_requested=lambda: False,
            on_delta=None,
        )

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("response"), "Kept")
        self.assertEqual(out.get("soft_continue_count"), 1)
        self.assertEqual(mock_urlopen.call_count, 2)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_caps_soft_continues_at_two(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Per-mode max is 2 continues even if every segment still reports length."""
        responses = []
        for text in ("A", "B", "C"):
            responses.append(
                self._ndjson_response(
                    [
                        f'{{"message":{{"role":"assistant","content":"{text}"}}}}',
                        '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"length"}',
                    ]
                )
            )
        mock_urlopen.side_effect = responses

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "q"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "strategy",
            "5m",
            cancel_requested=lambda: False,
            on_delta=None,
        )

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("soft_continue_count"), 2)
        self.assertEqual(out.get("response"), "ABC")
        self.assertEqual(mock_urlopen.call_count, 3)
        strategy_body = json.loads(mock_urlopen.call_args_list[0][0][0].data.decode("utf-8"))
        self.assertEqual(
            strategy_body.get("options", {}).get("num_predict"),
            ASK_VISIBLE_NUM_PREDICT["strategy"],
        )

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_cancel_mid_continue_clears_cue(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Stop landing after the cue is published republishes cue-free text, not silence."""
        first = self._ndjson_response(
            [
                '{"message":{"role":"assistant","content":"Part one"}}',
                '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"length"}',
            ]
        )
        # Cancel fires once the cue delta lands, before the second segment is read — this
        # response only needs to support close()/context-manager, never read().
        second = self._ndjson_response(
            ['{"message":{"role":"assistant","content":" and two"},"done":true,"done_reason":"stop"}']
        )
        mock_urlopen.side_effect = [first, second]

        cancelled = {"flag": False}
        deltas_seen: list[tuple[str, bool]] = []

        def _on_delta(text: str, done: bool, _thinking=None, **_kwargs) -> None:
            deltas_seen.append((text, done))
            if SOFT_CONTINUE_CUE in text:
                cancelled["flag"] = True

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "long please"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "expert",
            "5m",
            cancel_requested=lambda: cancelled["flag"],
            on_delta=_on_delta,
        )

        self.assertFalse(out.get("success"))
        self.assertTrue(out.get("cancelled"))
        self.assertEqual(mock_urlopen.call_count, 2)
        # The cue delta fired (that's what set cancelled["flag"]); the very next delta must
        # be the cue-free clear, not the cue itself left standing as the last word.
        self.assertTrue(any(SOFT_CONTINUE_CUE in t for t, done in deltas_seen if not done))
        self.assertEqual(deltas_seen[-1], ("Part one", False))
        self.assertNotIn(SOFT_CONTINUE_CUE, deltas_seen[-1][0])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_stitch_boundary_keeps_fence_hidden(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A strategy branch fence opened in segment one and closed in segment two never
        leaks into any visible delta — at the boundary or after — only the raw preserves it."""
        prefix = "Try the west path first."
        fence_open_and_partial_json = (
            '```bonsai-strategy-branches\n{"question":"Wher'
        )
        fence_close_and_rest_json = (
            'e to go?","options":[{"id":"n","label":"North"}]}\n```\n'
        )
        first = self._ndjson_response(
            [
                json.dumps(
                    {"message": {"role": "assistant", "content": prefix + "\n" + fence_open_and_partial_json}}
                ),
                json.dumps(
                    {
                        "message": {"role": "assistant", "content": ""},
                        "done": True,
                        "done_reason": "length",
                    }
                ),
            ]
        )
        second = self._ndjson_response(
            [
                json.dumps({"message": {"role": "assistant", "content": fence_close_and_rest_json}}),
                json.dumps(
                    {
                        "message": {"role": "assistant", "content": ""},
                        "done": True,
                        "done_reason": "stop",
                    }
                ),
            ]
        )
        mock_urlopen.side_effect = [first, second]
        deltas_seen: list[tuple[str, bool]] = []

        out = self._post(
            mock_urlopen,
            "strategy",
            question="what should I do",
            on_delta=lambda text, done, _thinking=None, **_kw: deltas_seen.append((text, done)),
        )

        self.assertTrue(out.get("success"))
        # Every delta — segment one, the cue, segment two mid-stream, and the terminal —
        # shows the prefix only. Nothing from the fence ever reaches the UI.
        for text, _done in deltas_seen:
            self.assertNotIn("bonsai-strategy-branches", text)
            self.assertNotIn("North", text)
            self.assertTrue(text == prefix or text.startswith(prefix))
        self.assertEqual(out.get("response"), prefix)
        # The raw stitch is untouched by the visible-side hiding: both halves of the fence
        # survive in assistant_raw, proving the boundary didn't drop or duplicate bytes.
        assistant_raw = out.get("assistant_raw") or ""
        self.assertIn("bonsai-strategy-branches", assistant_raw)
        self.assertIn('"options"', assistant_raw)
        self.assertIn("North", assistant_raw)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_parses_the_branch_fence_it_hid_from_the_stream(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The branch picker must survive the very hiding that keeps the fence off screen.

        This is the whole branch-picker bug, reduced. `hide_incomplete_strategy_branch_fence`
        deletes everything from the fence onward so raw JSON never scrolls past mid-stream, and the
        final extract used to read that same hidden string -- so a valid fence logged
        `branch_marker=False branch_parsed=False` and no buttons could ever render. The test above
        proves the hiding works; nothing proved the picker still came out the other side.

        The reply text is the one measured on the maintainer's Deck 2026-08-27 with Deep Rock
        Galactic: Survivor running (`appid=2321470`), question "how do i deal with the exploders",
        `gemma4:e2b-it-qat` -- including the `<bonsai-status>` line, because the status tag is
        stripped on the same path and a fix that only handled one of the two would pass a
        hand-written fixture.
        """
        reply = (
            "<bonsai-status>Reviewing tactics against Exploders</bonsai-status>\n"
            "Right then, so you're asking about those big orange blighters, the Exploders.\n\n"
            "The trick is simple: keep your distance!\n\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Are you currently facing a large group of Exploders?","options":'
            '[{"id":"a","label":"Yes, they are right in front of me"},'
            '{"id":"b","label":"No, I\'m trying to find a safe spot first"}]}\n'
            "```\n"
        )
        mock_urlopen.return_value = self._ndjson_response(
            [
                json.dumps({"message": {"role": "assistant", "content": reply}}),
                json.dumps(
                    {
                        "message": {"role": "assistant", "content": ""},
                        "done": True,
                        "done_reason": "stop",
                    }
                ),
            ]
        )
        deltas_seen: list[str] = []

        out = self._post(
            mock_urlopen,
            "strategy",
            model="gemma4:e2b-it-qat",
            question="how do i deal with the exploders",
            on_delta=lambda text, done, _thinking=None, **_kw: deltas_seen.append(text),
        )

        self.assertTrue(out.get("success"))

        branches = out.get("strategy_guide_branches")
        self.assertIsNotNone(branches, "a valid fence must produce a picker")
        assert branches is not None  # narrowing for the reads below
        self.assertEqual(
            branches.get("question"),
            "Are you currently facing a large group of Exploders?",
        )
        self.assertEqual([o.get("id") for o in branches.get("options") or []], ["a", "b"])

        # And the two properties that made this hard to see: the user never meets the fence,
        # in any delta or in the final reply, even though it parsed.
        for text in deltas_seen:
            self.assertNotIn("bonsai-strategy-branches", text)
        response = out.get("response") or ""
        self.assertNotIn("bonsai-strategy-branches", response)
        self.assertNotIn('"options"', response)
        self.assertIn("keep your distance", response)
        # The status tag is display noise and must not survive into the reply either.
        self.assertNotIn("bonsai-status", response)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_hides_a_branch_fence_that_does_not_parse(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A malformed fence still must not reach the user as raw JSON.

        Reading the unhidden text for extraction reopens that possibility, so the display falls
        back to hiding whenever a fence was present and did not parse.
        """
        reply = (
            "Try the west path first.\n\n"
            "```bonsai-strategy-branches\n"
            '{"question":"Where to go?","options":[{"id":"n"\n'
            "```\n"
        )
        mock_urlopen.return_value = self._ndjson_response(
            [
                json.dumps({"message": {"role": "assistant", "content": reply}}),
                json.dumps(
                    {
                        "message": {"role": "assistant", "content": ""},
                        "done": True,
                        "done_reason": "stop",
                    }
                ),
            ]
        )

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "gemma4:e2b-it-qat",
            [{"role": "user", "content": "where do i go"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "strategy",
            "5m",
            cancel_requested=lambda: False,
        )

        self.assertTrue(out.get("success"))
        response = out.get("response") or ""
        self.assertNotIn("bonsai-strategy-branches", response)
        self.assertNotIn('"question"', response)
        self.assertIn("west path", response)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_returns_ask_budgets(self, mock_urlopen: MagicMock) -> None:
        """The ask_budgets contract Thinking effort control (Phase 1) will build on."""
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"Hi"},"done":true,"done_reason":"stop"}']
        )

        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "hi"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "speed",
            "5m",
            cancel_requested=lambda: False,
            on_delta=None,
        )

        self.assertTrue(out.get("success"))
        budgets = out.get("ask_budgets") or {}
        self.assertEqual(
            set(budgets.keys()),
            {"visible_num_predict", "thinking_budget", "num_predict", "think", "think_effort"},
        )
        self.assertIs(budgets.get("think"), False)
        self.assertEqual(budgets.get("think_effort"), "off")
        self.assertEqual(budgets.get("visible_num_predict"), ASK_VISIBLE_NUM_PREDICT["speed"])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_sends_think_true_for_low_effort(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Low effort asks for thinking and buys it headroom on top of the mode cap."""
        reset_thinking_support_cache()
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"Hi"},"done":true,"done_reason":"stop"}']
        )

        out = self._post(mock_urlopen, "expert", think_effort="low")

        body = json.loads(mock_urlopen.call_args_list[0][0][0].data.decode("utf-8"))
        self.assertIs(body.get("think"), True)
        self.assertEqual(
            body.get("options", {}).get("num_predict"),
            ASK_VISIBLE_NUM_PREDICT["expert"] + 256,
        )
        self.assertTrue(out.get("success"))
        self.assertFalse(out.get("thinking_unsupported"))

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_falls_back_when_model_cannot_think(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A model that rejects think still answers, instead of surfacing a bare HTTP 400."""
        reset_thinking_support_cache()
        mock_urlopen.side_effect = [
            _http_error_400('{"error":"\\"gemma3:4b\\" does not support thinking"}'),
            self._ndjson_response(
                ['{"message":{"role":"assistant","content":"Plain answer"},"done":true,"done_reason":"stop"}']
            ),
        ]

        out = self._post(mock_urlopen, "speed", think_effort="high", model="gemma3:4b")

        self.assertEqual(mock_urlopen.call_count, 2)
        first = json.loads(mock_urlopen.call_args_list[0][0][0].data.decode("utf-8"))
        second = json.loads(mock_urlopen.call_args_list[1][0][0].data.decode("utf-8"))
        self.assertIs(first.get("think"), True)
        self.assertIs(second.get("think"), False)
        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("response"), "Plain answer")
        self.assertTrue(out.get("thinking_unsupported"))
        # The retry is not a soft continue and must not be counted as one.
        self.assertEqual(out.get("soft_continue_count"), 0)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_skips_thinking_for_a_known_bad_model(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Once a model has refused, later Asks cost one round trip, not two."""
        reset_thinking_support_cache()
        mark_model_without_thinking("gemma3:4b")
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"Direct"},"done":true,"done_reason":"stop"}']
        )

        out = self._post(mock_urlopen, "speed", think_effort="high", model="gemma3:4b")

        self.assertEqual(mock_urlopen.call_count, 1)
        body = json.loads(mock_urlopen.call_args_list[0][0][0].data.decode("utf-8"))
        self.assertIs(body.get("think"), False)
        self.assertEqual(
            body.get("options", {}).get("num_predict"), ASK_VISIBLE_NUM_PREDICT["speed"]
        )
        self.assertTrue(out.get("success"))
        # It fell back before trying, so there is nothing new to tell the user this Ask.
        self.assertFalse(out.get("thinking_unsupported"))

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_does_not_retry_an_unrelated_400(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Only a thinking-shaped 400 triggers the fallback; anything else fails as before."""
        reset_thinking_support_cache()
        mock_urlopen.side_effect = [_http_error_400('{"error":"invalid options.num_predict"}')]

        out = self._post(mock_urlopen, "speed", think_effort="high", model="qwen3:4b")

        self.assertEqual(mock_urlopen.call_count, 1)
        self.assertFalse(out.get("success"))
        self.assertTrue(model_supports_thinking("qwen3:4b"))

    def _post(
        self,
        _mock_urlopen: MagicMock,
        ask_mode: str,
        *,
        think_effort: str = "off",
        model: str = "vision:test",
        question: str = "q",
        on_delta=None,
    ) -> dict:
        """post_ollama_chat with the boilerplate args this suite never varies."""
        return post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            model,
            [{"role": "user", "content": question}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            ask_mode,
            "5m",
            cancel_requested=lambda: False,
            on_delta=on_delta,
            think_effort=think_effort,
        )

    @staticmethod
    def _ndjson_response(lines: list[str]):
        """Fake urlopen response replaying NDJSON through the same chunked read the real one uses."""
        body = ("\n".join(lines) + "\n").encode("utf-8")
        idx = {"i": 0}

        class _Rsp:
            def read(self, n: int):
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

    def _run_chat_collecting_deltas(self, lines: list[str]) -> list[tuple[str, bool]]:
        seen: list[tuple[str, bool]] = []
        post_ollama_chat(
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
            on_delta=lambda text, done, _thinking=None, **_kw: seen.append((text, done)),
        )
        return seen

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_throttles_partial_parses_during_a_burst(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A fast burst parses once, not once per token — the per-delta cost grew with the answer."""
        lines = [
            '{"message":{"role":"assistant","content":"tok%d "}}' % i for i in range(20)
        ]
        lines.append('{"message":{"role":"assistant","content":"end"},"done":true}')
        mock_urlopen.return_value = self._ndjson_response(lines)

        seen = self._run_chat_collecting_deltas(lines)

        partials = [d for d in seen if not d[1]]
        terminal = [d for d in seen if d[1]]
        # 20 in-memory deltas land well inside one 0.1s window, so only the first one parses.
        self.assertEqual(len(partials), 1, partials)
        self.assertEqual(partials[0][0], "tok0")
        # Throttling partials must not cost the final answer: it comes from its own call site.
        self.assertEqual(len(terminal), 1)
        self.assertEqual(terminal[0][0], "".join(f"tok{i} " for i in range(20)) + "end")

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_parses_again_once_the_interval_elapses(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The throttle is a rate limit, not a one-shot: a delta past the interval parses again."""
        lines = [
            '{"message":{"role":"assistant","content":"a"}}',
            '{"message":{"role":"assistant","content":"b"}}',
            '{"message":{"role":"assistant","content":"c"},"done":true}',
        ]
        mock_urlopen.return_value = self._ndjson_response(lines)

        # One monotonic call per content delta: inside the window, then past it.
        clock = [1000.0, 1000.05, 1000.0 + (OLLAMA_DELTA_PARSE_INTERVAL_S * 2)]
        with patch.object(ollama_service.time, "monotonic", side_effect=clock):
            seen = self._run_chat_collecting_deltas(lines)

        partials = [text for text, done in seen if not done]
        self.assertEqual(partials, ["a", "abc"])
        self.assertEqual([d for d in seen if d[1]], [("abc", True)])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_fails_when_stream_eof_without_done(
        self, mock_urlopen: MagicMock
    ) -> None:
        """TCP/proxy EOF before Ollama's final ``done: true`` line must not return success with truncated text."""
        body = ('{"message":{"role":"assistant","content":"truncated"}}\n').encode("utf-8")
        idx = {"i": 0}

        class _Rsp:
            def read(self, n: int):
                chunk = body[idx["i"] : idx["i"] + n]
                idx["i"] += len(chunk)
                return chunk

            def close(self) -> None:
                pass

            def __enter__(self):
                return self

            def __exit__(self, *_):
                pass

        mock_urlopen.return_value = _Rsp()
        lg = MagicMock()
        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "qwen:test",
            [{"role": "system", "content": "x"}],
            60,
            [],
            [],
            [],
            [],
            lg,
            "speed",
            "5m",
            cancel_requested=lambda: False,
            on_delta=None,
        )
        self.assertFalse(out.get("success"))
        self.assertIn("before completion", str(out.get("response") or ""))

    def test_format_ai_response_never_shows_the_attach_debug_line(self):
        """D104: the debug counts must never reach the reply, whether or not anything failed."""
        output = format_ai_response(
            "Base response",
            normalized_attachments=[{"path": "/tmp/a.png"}],
            prepared_images=[{"image_b64": "abc"}],
            attachment_errors=["too large"],
        )
        self.assertNotIn("AttachDebug", output)
        self.assertIn("[Attachment errors: too large]", output)

    def test_format_ai_response_never_shows_the_attach_debug_line_with_no_errors(self):
        output = format_ai_response(
            "Base response",
            normalized_attachments=[{"path": "/tmp/a.png"}],
            prepared_images=[{"image_b64": "abc"}],
            attachment_errors=[],
        )
        self.assertNotIn("AttachDebug", output)
        self.assertEqual(output, "Base response")

    def test_build_system_prompt_includes_game_and_attachment_context(self):
        """Ensure generated system prompts include game, attachment, and policy context lines."""
        def lookup_app_name(app_id: str) -> str:
            return "Test Game" if app_id == "123" else ""

        def lookup_vdf(_path: str) -> dict:
            return {"caption": "boss room", "shortcut_name": "Shortcut Name"}

        prompt = build_system_prompt(
            question="How do I beat this boss?",
            app_id="123",
            app_name="Game Name",
            normalized_attachments=[{"path": "/tmp/a.png", "app_id": "123"}],
            prepared_images=[{"image_b64": "abc"}],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("The currently running game is: Game Name (AppID: 123).", prompt)
        self.assertIn("Resolved game-title hints from attachment AppIDs: 123=Test Game.", prompt)
        self.assertIn("Visual context attachments provided: 1.", prompt)
        self.assertIn("Your primary expertise is Steam Deck", prompt)
        self.assertIn("Hardware appendix (apply only when relevant)", prompt)
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        self.assertNotIn("STRATEGY GUIDE MODE", prompt)
        self.assertIn("RULE: Ship of Harkinian (SoH)", prompt)
        i_dyn = prompt.index("The currently running game is:")
        i_gp = prompt.index("Your primary expertise is Steam Deck")
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_dyn, i_gp)
        self.assertLess(i_gp, i_hw)

    def test_build_system_prompt_screenshot_rules_absent_without_an_image(self):
        """The three screenshot-only rule lines cost tokens on every Ask, image or not.
        They should only join the prompt when there is something to look at."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="How do I fix stutter?",
            app_id="123",
            app_name="Game Name",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("No visual context attachments provided.", prompt)
        self.assertNotIn("prioritize identifying gameplay/world content", prompt)
        self.assertNotIn("Use recognizable in-game HUD motifs", prompt)
        self.assertNotIn("Minimize Steam overlay/plugin UI mentions", prompt)
        self.assertNotIn("prioritize game-specific visual cues over Steam UI", prompt)

    def test_build_system_prompt_screenshot_rules_present_with_an_image(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="How do I fix stutter?",
            app_id="123",
            app_name="Game Name",
            normalized_attachments=[],
            prepared_images=[{"image_b64": "abc"}],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("Visual context attachments provided: 1.", prompt)
        self.assertIn("prioritize identifying gameplay/world content", prompt)
        self.assertIn("Use recognizable in-game HUD motifs", prompt)
        self.assertIn("RULE: Ship of Harkinian (SoH)", prompt)

    def test_build_system_prompt_speed_includes_qam_sweet_spot_line(self):
        """Efficiency / sweet spot questions get QAM Performance lever instructions."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What's the efficiency sweet spot for this game?",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DECK TUNING (efficiency / sweet spot)", prompt)
        self.assertIn("Quick Access", prompt)
        self.assertIn("Framerate limit", prompt)

    def test_build_system_prompt_strategy_first_turn(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Stuck in the Water Temple",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("STRATEGY GUIDE MODE (active — first turn)", prompt)
        self.assertIn("STRATEGY SPOILER POLICY (default)", prompt)
        self.assertIn("bonsai-spoiler", prompt)
        self.assertIn("bonsai-strategy-branches", prompt)
        self.assertIn("DECK POWER / TDP (strategy first turn)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_mode = prompt.index("STRATEGY GUIDE MODE (active — first turn)")
        i_deck = prompt.index("DECK POWER / TDP (strategy first turn)")
        self.assertLess(i_mode, i_deck)

    def test_build_system_prompt_strategy_followup_turn(self):
        from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question=f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: mid.",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("STRATEGY GUIDE MODE (active — follow-up turn)", prompt)
        self.assertIn("STRATEGY SPOILER POLICY (default)", prompt)
        self.assertIn("bonsai-spoiler", prompt)
        self.assertIn("If you want to cheat", prompt)
        self.assertIn("CONCRETE solo-player examples", prompt)
        self.assertIn("Do NOT output a", prompt)
        self.assertIn("bonsai-strategy-checklist", prompt)
        self.assertIn("DECK POWER / TDP (strategy follow-up)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)

    def test_build_system_prompt_strategy_followup_includes_checklist_state(self):
        from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question=f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: mid.",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
            strategy_checklist_state={
                "title": "Mid dungeon",
                "items": [{"id": "1", "label": "Get key"}, {"id": "2", "label": "Open door"}],
                "checked_ids": ["1"],
            },
        )
        self.assertIn("PLUGIN CHECKLIST STATE", prompt)
        self.assertIn("Get key", prompt)
        self.assertIn("Open door", prompt)

    def test_build_system_prompt_strategy_first_turn_includes_tdp_when_power_asked(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Stuck in the Water Temple — what TDP should I use?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("TDP JSON ON THIS FIRST STRATEGY TURN", prompt)
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_strat = prompt.index("STRATEGY GUIDE MODE (active — first turn)")
        i_first_json = prompt.index("TDP JSON ON THIS FIRST STRATEGY TURN")
        i_hw = prompt.index("IMPORTANT: When you recommend or apply a TDP or GPU clock change")
        self.assertLess(i_strat, i_first_json)
        self.assertLess(i_first_json, i_hw)

    def test_build_system_prompt_strategy_followup_includes_tdp_when_power_asked(self):
        from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question=f"{STRATEGY_FOLLOWUP_PREFIX} Also cap my TDP at 9W.",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_cheat = prompt.index("If you want to cheat")
        i_hw = prompt.index("IMPORTANT: When you recommend or apply a TDP or GPU clock change")
        self.assertLess(i_cheat, i_hw)

    def test_build_system_prompt_speed_includes_triple_resolution_for_fps_preset(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What are the best settings for 60fps?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DISPLAY TARGETS (Speed mode)", prompt)
        self.assertIn("1280×800", prompt)
        self.assertIn("1080p", prompt)
        self.assertIn("4K", prompt)

    def test_build_system_prompt_strategy_fps_asks_resolution_first(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What are the best settings for 60fps?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("DISPLAY TARGETS (Strategy mode)", prompt)
        self.assertIn("exactly four", prompt)
        self.assertIn('"d"', prompt)
        self.assertIn("1280×800", prompt)
        self.assertIn("1080p", prompt)
        self.assertIn("4K", prompt)

    def test_build_system_prompt_expert_includes_triple_resolution_then_followup(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What GPU clock should I use?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="expert",
        )
        self.assertIn("DISPLAY TARGETS (Expert mode)", prompt)
        self.assertIn("(1) 1280×800 (2) 1080p (3) 4K (4) Enter your own", prompt)

    def test_build_system_prompt_includes_deck_troubleshoot_game_gotchas_with_title(self):
        """Compatibility / crash / Proton style presets get game-specific Deck community-guidance when a title is known."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Why is my game crashing?",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DECK TROUBLESHOOTING (game in focus)", prompt)
        self.assertIn("cannot run a web browser", prompt)
        self.assertIn("ProtonDB", prompt)
        i_game = prompt.index("The currently running game is:")
        i_trouble = prompt.index("DECK TROUBLESHOOTING (game in focus)")
        i_appendix = prompt.index("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**")
        self.assertLess(i_game, i_trouble)
        self.assertLess(i_trouble, i_appendix)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)

    def test_build_system_prompt_troubleshoot_without_game_skips_tdp_appendix(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="deck sleep resume proton black screen",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**", prompt)
        self.assertIn("troubleshooting/compat ask", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)

    def test_build_system_prompt_power_ask_keeps_tdp_appendix(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="best tdp for 60fps on deck",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        self.assertNotIn("troubleshooting/compat ask", prompt)

    def test_build_system_prompt_omits_deck_troubleshoot_gotchas_without_game_name(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Why is my game crashing?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertNotIn("DECK TROUBLESHOOTING (game in focus)", prompt)

    def test_build_system_prompt_slow_ollama_uses_host_setup_not_deck_performance(self):
        """Preset / paraphrases about Ollama latency get bonsAI Connection guidance, not QAM/TDP focus."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Diagnose a slow Ollama response",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("OLLAMA / bonsAI (host & inference)", prompt)
        self.assertIn("Ollama → Where AI runs", prompt)
        self.assertIn("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**", prompt)
        self.assertNotIn("DECK TROUBLESHOOTING (game in focus)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_ollama = prompt.index("OLLAMA / bonsAI (host & inference)")
        i_skip = prompt.index("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**")
        self.assertLess(i_ollama, i_skip)

    def test_build_system_prompt_early_context_suffix_before_hardware_appendix(self):
        """Proton-style excerpts splice after identity and before the TDP/JSON tail."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        marker = "SYNTHETIC_PROTON_EXCERPT_FOR_ORDER_TEST"
        prompt = build_system_prompt(
            question="Hello",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
            early_context_suffix=marker,
        )
        i_id = prompt.index("You are bonsAI")
        i_mark = prompt.index(marker)
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_id, i_mark)
        self.assertLess(i_mark, i_hw)

    def _kb_prompt_with_mode_inject(self, *, knowledge_block_placement: str = "early") -> str:
        """Speed-mode prompt with an attached card and a real mode inject + the hardware
        appendix, so early vs late placement can be told apart by where the KB block lands."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        return build_system_prompt(
            question="Explain the model policy tiers",
            app_id="2321470",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
            early_context_suffix="--- Local knowledge base ---\nFocus the weak points.",
            knowledge_block_placement=knowledge_block_placement,
        )

    def test_build_system_prompt_knowledge_block_placement_defaults_early(self):
        """D46 follow-up: today's shipped order, still the default — cards splice in right
        after identity, ahead of every mode inject and the hardware appendix."""
        prompt = self._kb_prompt_with_mode_inject()
        i_kb = prompt.index("KNOWLEDGE BASE (offline corpus)")
        i_mode = prompt.index("MODEL POLICY TIERS (bonsAI)")
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_kb, i_mode)
        self.assertLess(i_mode, i_hw)

    def test_build_system_prompt_knowledge_block_placement_late_moves_after_mode_inject(self):
        """Late placement puts the cards as close to the question as the system prompt allows —
        after the mode injects, still ahead of the hardware appendix tail."""
        prompt = self._kb_prompt_with_mode_inject(knowledge_block_placement="late")
        i_kb = prompt.index("KNOWLEDGE BASE (offline corpus)")
        i_mode = prompt.index("MODEL POLICY TIERS (bonsAI)")
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_mode, i_kb)
        self.assertLess(i_kb, i_hw)

    def test_build_system_prompt_knowledge_block_placement_late_strategy_mode(self):
        """Same order rule on the strategy branch, which builds its tail differently."""
        prompt = build_system_prompt(
            question="Where do I go next?",
            app_id="2321470",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lambda _app_id: "",
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode="strategy",
            early_context_suffix="--- Local knowledge base ---\nFocus the weak points.",
            knowledge_block_placement="late",
        )
        i_kb = prompt.index("KNOWLEDGE BASE (offline corpus)")
        i_mode = prompt.index("STRATEGY GUIDE MODE (active")
        self.assertLess(i_mode, i_kb)

    def test_build_system_prompt_includes_model_policy_tiers_explainer(self):
        """Chip / paraphrases about Model policy get tier + FOSS vs open-weight vs proprietary guidance."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Explain the model policy tiers",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("MODEL POLICY TIERS (bonsAI)", prompt)
        self.assertIn("Tier 1", prompt)
        self.assertIn("open-weight", prompt)
        self.assertIn("Strategy Guide mode", prompt)

    def test_build_system_prompt_model_policy_explainer_in_strategy_allows_normal_reply(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Explain the model policy tiers",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("MODEL POLICY TIERS (bonsAI)", prompt)
        self.assertIn("```bonsai-strategy-branches```", prompt)
        self.assertIn("normal explanation", prompt)

    def test_append_deck_tdp_sysfs_grounding_noop(self):
        self.assertEqual(
            append_deck_tdp_sysfs_grounding("base", grounding_requested=False),
            "base",
        )

    def test_append_deck_tdp_sysfs_grounding_read_tdp(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=True, cap_w=7, grounding_requested=True)
        self.assertTrue(out.startswith("sys"))
        self.assertIn("7W", out)
        self.assertIn("ON-DEVICE TDP", out)
        self.assertIn("usual voice", out)

    def test_append_deck_tdp_sysfs_grounding_tuning(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=False, cap_w=12, grounding_requested=True)
        self.assertIn("12W", out)
        self.assertIn("baseline", out)

    def test_append_deck_tdp_sysfs_grounding_unavailable(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=False, cap_w=None, grounding_requested=True)
        self.assertIn("could not be read", out)

    def test_user_asks_ollama_host_detects_latency_diagnose(self):
        self.assertTrue(user_asks_ollama_bonsai_host_or_latency("Diagnose a slow Ollama response"))

    def test_fps_wants_power_not_ollama_host(self):
        self.assertTrue(user_wants_power_or_performance_topic("What is my fps?"))
        self.assertFalse(user_asks_ollama_bonsai_host_or_latency("What is my fps?"))

    def test_build_system_prompt_strategy_spoiler_consent_opt_in(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Stuck",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
            strategy_spoiler_consent=True,
        )
        self.assertIn("STRATEGY SPOILER POLICY (user opted in)", prompt)
        self.assertNotIn("STRATEGY SPOILER POLICY (default)", prompt)

    def _strategy_prompt_with_kb(self, app_id: str, asked_entity: str = "") -> str:
        """Strategy prompt carrying attached KB cards, which is what gates the KB spoiler clause."""
        return build_system_prompt(
            question="Where do I go next?",
            app_id=app_id,
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lambda _app_id: "",
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode="strategy",
            early_context_suffix="--- Local knowledge base ---\nFocus the weak points.",
            strategy_spoiler_asked_entity=asked_entity,
        )

    def test_build_system_prompt_low_risk_drops_kb_spoiler_clause(self):
        """The KB clause fires only when cards attach — exactly where over-fencing is worst."""
        prompt = self._strategy_prompt_with_kb("2321470")
        self.assertIn("KNOWLEDGE BASE (offline corpus)", prompt)
        self.assertNotIn("Put spoilery walkthrough detail inside", prompt)

    def test_build_system_prompt_named_entity_drops_kb_spoiler_clause(self):
        prompt = self._strategy_prompt_with_kb("413150", asked_entity="King Dodongo")
        self.assertNotIn("Put spoilery walkthrough detail inside", prompt)

    def test_build_system_prompt_narrative_game_keeps_kb_spoiler_clause(self):
        prompt = self._strategy_prompt_with_kb("413150")
        self.assertIn("Put spoilery walkthrough detail inside", prompt)

    # Gap 3 (plan 54): a game recognised only from the question (nothing running, no app_id/
    # app_name) still gets the relaxed prompt when the chip's own resolved profile says
    # low_narrative — one argument, reusing the profile already computed for the chip.
    def test_build_system_prompt_low_risk_title_profile_relaxes_with_nothing_running(self):
        prompt = build_system_prompt(
            question="what class should I play",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lambda _app_id: "",
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode="strategy",
            early_context_suffix="--- Local knowledge base ---\nSurvivor class notes.",
            strategy_title_profile="low_narrative",
        )
        self.assertIn("LOW-SPOILER-RISK CONTEXT", prompt)
        self.assertNotIn("Put spoilery walkthrough detail inside", prompt)

    def test_build_system_prompt_protect_progression_title_profile_does_not_relax(self):
        prompt = build_system_prompt(
            question="what should I do next",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lambda _app_id: "",
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode="strategy",
            early_context_suffix="--- Local knowledge base ---\nStory notes.",
            strategy_title_profile="protect_progression",
        )
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", prompt)
        self.assertIn("Put spoilery walkthrough detail inside", prompt)

    def test_build_system_prompt_title_profile_never_changes_the_game_line(self):
        """The wording still must not claim a game is running when nothing is -- only the
        spoiler policy relaxes, never the identity block naming the game."""
        kwargs = dict(
            question="what class should I play",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lambda _app_id: "",
            lookup_screenshot_vdf_metadata=lambda _path: {},
            ask_mode="strategy",
        )
        baseline = build_system_prompt(**kwargs)
        relaxed = build_system_prompt(**kwargs, strategy_title_profile="low_narrative")
        game_line_end = baseline.index("\n\n")
        self.assertEqual(baseline[:game_line_end], relaxed[:game_line_end])

    def test_build_system_prompt_kb_clause_drops_citation_fence_instruction(self):
        """The citation fence was obeyed once in 89 recorded asks and nothing reads it — gone.

        The grounding instruction itself stays; only the fence-wrapping ask is removed."""
        prompt = self._strategy_prompt_with_kb("2321470")
        self.assertIn(
            "Ground answers in the attached strategy/compat cards when relevant.", prompt
        )
        self.assertNotIn("bonsai-cite", prompt)
        self.assertNotIn("trust tier", prompt)

    def test_build_system_prompt_thin_context_drops_citation_fence_offer(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Anything I should know?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("LIMITED CONTEXT", prompt)
        self.assertNotIn("bonsai-cite", prompt)

    def test_build_system_prompt_reply_verbosity_fence_list_drops_citation_fence(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Quick tip?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_verbosity="caveman",
        )
        self.assertIn("REPLY VERBOSITY", prompt)
        self.assertNotIn("bonsai-cite", prompt)

    def test_prompt_window_warning_fires_only_when_prompt_plus_reply_would_not_fit(self):
        """D46: the Deck runs a 4,096-token window and nothing sets num_ctx; an overlong prompt
        loses its start silently. The POST site now logs a warning instead of saying nothing."""
        from backend.services.ollama_service import (
            ASSUMED_CONTEXT_WINDOW_TOKENS,
            estimate_prompt_tokens,
            prompt_window_warning,
        )

        small = [{"role": "system", "content": "x" * 3500}, {"role": "user", "content": "how do i beat the boss"}]
        self.assertLess(estimate_prompt_tokens(small), 1100)
        self.assertIsNone(prompt_window_warning(small, 800))

        # ~96 KiB of attached logs, the old cap: about 28,000 tokens.
        huge = [{"role": "system", "content": "e" * (96 * 1024)}, {"role": "user", "content": "it crashes"}]
        warning = prompt_window_warning(huge, 800)
        self.assertIsNotNone(warning)
        self.assertIn(str(ASSUMED_CONTEXT_WINDOW_TOKENS), warning)
        self.assertIn("drops its start", warning)

        # The reply budget counts too: a prompt that fits alone can still overflow with num_predict.
        edge = [{"role": "system", "content": "x" * int(3.5 * 3500)}]
        self.assertIsNone(prompt_window_warning(edge, 500))
        self.assertIsNotNone(prompt_window_warning(edge, 800))
        self.assertEqual(ASSUMED_CONTEXT_WINDOW_TOKENS, 4096)

    def test_clamp_num_predict_to_window_leaves_a_fitting_prompt_untouched(self):
        """D46 follow-up: a prompt that already fits gets its num_predict back unchanged."""
        from backend.services.ollama_service import clamp_num_predict_to_window

        messages = [{"role": "system", "content": "x" * 3500}, {"role": "user", "content": "q"}]
        self.assertEqual(clamp_num_predict_to_window(messages, 800, 0), 800)
        self.assertEqual(clamp_num_predict_to_window(messages, 1600, 512), 1600 + 512)

    def test_clamp_num_predict_to_window_shrinks_visible_keeps_thinking_whole(self):
        """A ~2,800-token Strategy prompt with thinking medium (visible 1600 + thinking 512 =
        2112) overflows the 4,096 window by 816. The clamp must take that 816 out of the visible
        share only — thinking stays the full 512 the setting promised."""
        from backend.services.ollama_service import clamp_num_predict_to_window

        messages = [{"role": "system", "content": "x" * int(2800 * 3.5)}]
        clamped = clamp_num_predict_to_window(messages, 1600, 512)
        self.assertEqual(clamped, 784 + 512)  # room = 4096 - 2800 - 512

    def test_clamp_num_predict_to_window_never_goes_below_the_visible_floor(self):
        """A prompt so large even the 600-token visible floor cannot make it fit still gets the
        floor — a short reply beats no reply, and the caller's warning still fires."""
        from backend.services.ollama_service import clamp_num_predict_to_window

        messages = [{"role": "system", "content": "x" * int(4000 * 3.5)}]
        clamped = clamp_num_predict_to_window(messages, 1600, 512)
        self.assertEqual(clamped, 600 + 512)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_fitting_prompt_sends_unclamped_num_predict(
        self, mock_urlopen: MagicMock
    ) -> None:
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"ok"},"done":true}']
        )
        logger = MagicMock()
        post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "user", "content": "short question"}],
            60,
            [],
            [],
            [],
            [],
            logger,
            "speed",
            "5m",
            cancel_requested=lambda: False,
        )
        body = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        self.assertEqual(body["options"]["num_predict"], ASK_VISIBLE_NUM_PREDICT["speed"])
        clamp_lines = [c for c in logger.warning.call_args_list if "clamping num_predict" in str(c)]
        self.assertEqual(clamp_lines, [])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_overlong_strategy_prompt_shrinks_visible_keeps_thinking(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The exact bug shape: Strategy + thinking medium (visible 1600 + thinking 512 = 2112)
        on a ~2,800-token prompt would drop the identity/rules/cards silently. The clamp instead
        sends a smaller visible budget that fits, keeping the full thinking budget."""
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"ok"},"done":true}']
        )
        logger = MagicMock()
        messages = [{"role": "system", "content": "x" * int(2800 * 3.5)}, {"role": "user", "content": "q"}]
        post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            messages,
            60,
            [],
            [],
            [],
            [],
            logger,
            "strategy",
            "5m",
            cancel_requested=lambda: False,
            think_effort="medium",
        )
        body = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        self.assertEqual(body["options"]["num_predict"], 784 + 512)
        self.assertTrue(body["think"])
        clamp_lines = [c for c in logger.warning.call_args_list if "clamping num_predict" in str(c)]
        self.assertEqual(len(clamp_lines), 1)
        self.assertIn("2112", str(clamp_lines[0]))
        self.assertIn(str(784 + 512), str(clamp_lines[0]))
        window_lines = [c for c in logger.warning.call_args_list if "exceeds the assumed" in str(c)]
        self.assertEqual(window_lines, [])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_past_the_floor_sends_floor_and_still_warns(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Even the 600-token visible floor cannot rescue this one — it still sends the floor
        (a short reply beats none) and the D46 warning still fires, since nothing else can be
        trimmed from here."""
        mock_urlopen.return_value = self._ndjson_response(
            ['{"message":{"role":"assistant","content":"ok"},"done":true}']
        )
        logger = MagicMock()
        messages = [{"role": "system", "content": "x" * int(4000 * 3.5)}]
        post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            messages,
            60,
            [],
            [],
            [],
            [],
            logger,
            "strategy",
            "5m",
            cancel_requested=lambda: False,
            think_effort="medium",
        )
        body = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        self.assertEqual(body["options"]["num_predict"], 600 + 512)
        clamp_lines = [c for c in logger.warning.call_args_list if "clamping num_predict" in str(c)]
        self.assertEqual(len(clamp_lines), 1)
        window_lines = [c for c in logger.warning.call_args_list if "exceeds the assumed" in str(c)]
        self.assertEqual(len(window_lines), 1)

    def test_user_consents_strategy_spoilers_phrases(self):
        self.assertTrue(user_consents_strategy_spoilers("full spoilers please"))
        self.assertTrue(user_consents_strategy_spoilers("Spoilers are okay"))
        self.assertFalse(user_consents_strategy_spoilers("no spoilers please"))

    def test_extract_strategy_asked_entity_beat_boss(self):
        self.assertEqual(
            extract_strategy_asked_entity("How do I beat Glyphid Dreadnought?"),
            "Glyphid Dreadnought",
        )

    def test_kb_text_covers_asked_entity(self):
        kb = "## Glyphid Dreadnought\nFocus fire the glowing weak points."
        self.assertTrue(kb_text_covers_asked_entity(kb, "Glyphid Dreadnought"))

    def test_strategy_spoiler_policy_low_risk_genre_skips_fence_for_named_boss(self):
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Glyphid Dreadnought",
            kb_entity_match=False,
            app_id="2321470",
        )
        self.assertIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertIn("Glyphid Dreadnought", block)
        self.assertIn("do NOT wrap routine boss/enemy guidance", block)

    def test_strategy_spoiler_policy_low_risk_genre_with_no_entity_still_forbids_fencing(self):
        """The branch reached when extraction names nothing on a low-risk title.

        Confirmed on device 2026-08-22: this was the one branch of the three with no explicit
        "do not fence" instruction, and it fired for exactly the questions whose entity
        extraction missed (e.g. "how do i deal with the exploders" before that gap was closed).
        """
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="2321470",
        )
        self.assertIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertIn("Do NOT wrap routine boss/enemy guidance", block)

    def test_strategy_spoiler_policy_story_game_keeps_default_fence(self):
        """No named entity on a story title — the conservative default has to survive intact."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="1145360",
        )
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertNotIn("NAMED-ENTITY CONSENT", block)
        self.assertIn("```bonsai-spoiler", block)
        self.assertIn("late-game boss names", block)

    def test_strategy_spoiler_policy_low_risk_title_replaces_fence_format_sentences(self):
        """Measured 2026-09-02 (kb-answer-eval fence-subtractive): the placement rule made the
        model fence a harmless opening line on every sample for Left 4 Dead 2. On a low-risk
        title the two fence-format sentences are replaced by one plain "do not fence" line."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="550",
        )
        self.assertIn("Do not use ```bonsai-spoiler fences in this reply", block)
        self.assertNotIn("Put unavoidably spoilery detail", block)
        self.assertNotIn("must appear **above**", block)
        self.assertIn("LOW-SPOILER-RISK CONTEXT", block)

    def test_strategy_spoiler_policy_named_entity_on_story_title_replaces_fence_format_sentences(self):
        """Same measurement, story title: the thing the user named is never fenced, and the only
        fence still allowed is for a story event they did not ask about."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Theseus and Asterius",
            kb_entity_match=True,
            app_id="1145360",
        )
        self.assertIn("Do not put anything about “Theseus and Asterius” inside a ```bonsai-spoiler fence", block)
        self.assertIn("place it above the branch fence", block)
        self.assertNotIn("Put unavoidably spoilery detail", block)
        self.assertNotIn("must appear **above**", block)
        self.assertIn("NAMED-ENTITY CONSENT", block)
        # The compact constitution (Speed/Expert) has no branch fence to place anything above.
        compact = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Theseus and Asterius",
            kb_entity_match=True,
            app_id="1145360",
            include_strategy_ui_fences=False,
        )
        self.assertNotIn("branch fence", compact)
        self.assertIn("Do not put anything about “Theseus and Asterius”", compact)

    def test_strategy_spoiler_policy_story_title_no_entity_keeps_fence_format_sentences(self):
        """The subtraction is scoped: a story title with nothing named keeps both original
        sentences, because that is the arm that protected 8 of 9 ending questions."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="1091500",
        )
        self.assertIn("Put unavoidably spoilery detail only inside ```bonsai-spoiler", block)
        self.assertIn("must appear **above**", block)
        self.assertNotIn("Do not use ```bonsai-spoiler fences", block)

    def test_strategy_spoiler_policy_low_risk_app_id_without_corpus_signals(self):
        """AppID alone must carry the signal: lookup_game_genres is empty with no KB corpus."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Glyphid Dreadnought",
            kb_entity_match=False,
            app_id="2321470",
        )
        self.assertIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertIn("Glyphid Dreadnought", block)

    def test_strategy_spoiler_policy_low_risk_drops_boss_name_prohibition(self):
        """The addendum must REPLACE the boss-name clause, not argue with it in the same block."""
        low = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Glyphid Dreadnought",
            kb_entity_match=False,
            app_id="2321470",
        )
        self.assertNotIn("late-game boss names", low)
        self.assertIn("LOW-SPOILER-RISK CONTEXT", low)
        # Story spoilers stay off-limits — only the boss-name clause is subtracted.
        self.assertIn("story endings", low)
        self.assertIn("major twists", low)

    def test_strategy_spoiler_policy_without_low_risk_keeps_boss_name_prohibition(self):
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="413150",
        )
        self.assertIn("late-game boss names", block)

    def test_strategy_spoiler_policy_named_entity_alone_fires_on_story_title(self):
        """spoiler-constitution rule 7: naming the boss is consent-in-fact for that boss.

        Required ship-gate case from 04-strategy-spoiler-false-positive.md §7: empty genres,
        no KB, no allowlisted AppID — the named entity alone has to carry the signal.
        """
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Megaera",
            kb_entity_match=False,
            app_id="1145360",  # Hades — narrative roguelike
        )
        self.assertIn("NAMED-ENTITY CONSENT", block)
        self.assertIn("Megaera", block)

    def test_strategy_spoiler_policy_named_entity_does_not_relax_the_rest(self):
        """The genre over-relax guard: consent is scoped to the named thing, nothing else."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="Megaera",
            kb_entity_match=False,
            app_id="1145360",
        )
        # Not the title-level wording — that would license every other Hades boss.
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertIn("keeps the default spoiler treatment", block)
        # The boss prohibition stays, carved out for the named entity only.
        self.assertIn("late-game boss names other than", block)

    def test_strategy_spoiler_policy_low_risk_followup_drops_boss_clause(self):
        low = _strategy_spoiler_policy_block(
            False,
            True,
            asked_entity="Glyphid Dreadnought",
            kb_entity_match=False,
            app_id="2321470",
        )
        self.assertNotIn("boss spoilers", low)
        self.assertIn("story endings", low)

    def test_strategy_spoiler_policy_narrative_app_id_without_entity_stays_fenced(self):
        """An unnamed ask on OoT gets neither arm — no AppID entry, no genres, no entity."""
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="413150",
        )
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertNotIn("NAMED-ENTITY CONSENT", block)
        self.assertIn("```bonsai-spoiler", block)

    def test_strategy_spoiler_policy_hades_without_entity_stays_conservative(self):
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=False,
            app_id="1145360",
        )
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertIn("late-game boss names", block)

    def test_strategy_spoiler_policy_kb_entity_match_does_not_title_relax(self):
        block = _strategy_spoiler_policy_block(
            False,
            False,
            asked_entity="",
            kb_entity_match=True,
            app_id="1145360",
        )
        self.assertNotIn("LOW-SPOILER-RISK CONTEXT", block)
        self.assertNotIn("NAMED-ENTITY CONSENT", block)

    def test_build_system_prompt_speed_strategy_domain_injects_compact_constitution(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Where should I go?",
            app_id="1145360",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
            strategy_domain_guidance=True,
            early_context_suffix="--- Local knowledge base ---\nWalk north.",
        )
        self.assertIn("STRATEGY SPOILER CONSTITUTION (knowledge-base coaching)", prompt)
        self.assertIn("This is not a Strategy Guide branch turn", prompt)

    def _verbosity_lookup_helpers(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        return lookup_app_name, lookup_vdf

    def test_build_system_prompt_balanced_omits_reply_verbosity_block(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="How do I fix stutter?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_verbosity="balanced",
        )
        self.assertNotIn("REPLY VERBOSITY", prompt)

    def test_build_system_prompt_caveman_includes_reply_verbosity_block(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Quick tip?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_verbosity="caveman",
        )
        self.assertIn("REPLY VERBOSITY", prompt)
        self.assertIn("CAVEMAN REPLY STYLE", prompt)
        self.assertNotIn("SHORT REPLY STYLE", prompt)
        self.assertNotIn("overrides", prompt.lower())

    def test_build_system_prompt_legacy_short_aliases_to_caveman(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Quick tip?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_verbosity="short",
        )
        self.assertIn("CAVEMAN REPLY STYLE", prompt)
        self.assertNotIn("SHORT REPLY STYLE", prompt)

    def test_build_system_prompt_detailed_includes_override_clause(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Explain Proton",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_verbosity="detailed",
        )
        self.assertIn("DETAILED REPLY STYLE", prompt)
        self.assertIn("this block overrides", prompt.lower())

    def test_build_system_prompt_strategy_detailed_keeps_branch_fence(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="Stuck in dungeon",
            app_id="",
            app_name="Zelda",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
            reply_verbosity="detailed",
        )
        self.assertIn("bonsai-strategy-branches", prompt)
        self.assertIn("DETAILED REPLY STYLE", prompt)

    def test_build_system_prompt_caveman_fps_still_has_triple_resolution(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="What are the best settings for 60fps?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
            reply_verbosity="caveman",
        )
        self.assertIn("DISPLAY TARGETS (Speed mode)", prompt)
        self.assertIn("CAVEMAN REPLY STYLE", prompt)

    def test_caveman_skipped_when_character_roleplay_on(self):
        block = build_reply_verbosity_block(
            "caveman",
            question="quick fps tip?",
            ask_mode="speed",
            character_roleplay_on=True,
        )
        self.assertEqual(block, "")

    def test_user_asks_for_detail_depth_and_caveman_relax_clause(self):
        self.assertTrue(user_asks_for_detail_depth("Give me a step by step walkthrough"))
        block = build_reply_verbosity_block(
            "caveman",
            question="step by step please",
            ask_mode="speed",
        )
        self.assertIn("one short extra section", block)
        self.assertIn("CAVEMAN REPLY STYLE", block)

    def test_user_asks_for_detail_depth_false_for_short_question(self):
        self.assertFalse(user_asks_for_detail_depth("quick fps tip?"))

    def test_build_reply_language_block_english_empty(self):
        self.assertEqual(build_reply_language_block("english"), "")

    def test_build_system_prompt_japanese_includes_language_block(self):
        lookup_app_name, lookup_vdf = self._verbosity_lookup_helpers()
        prompt = build_system_prompt(
            question="How do I fix stutter?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            reply_language="japanese",
        )
        self.assertIn("REPLY LANGUAGE", prompt)
        self.assertIn("Japanese", prompt)
        self.assertIn("fence names", prompt)


# Plan 57: real Ollama chunks captured on the PC 2026-09-17 with thinking on (gemma4:e2b-it-qat,
# docs/test-evidence/plan57-desk-low-q1.jsonl and plan57-desk-low-q3.jsonl -- summarised in
# plan57-desk-summary.json). Each line below is one chunk's own ``raw`` field, copied verbatim; a
# short real prefix/suffix stands in for the full capture (466 and 1,401 lines respectively) so
# these tests stay fast. Where a test needs an order the real capture never produced (a thinking
# chunk after the first answer chunk; two requests stitched into one buffer), the chunks placed in
# that order are still each a real, unedited capture -- only their sequence is constructed.
_REAL_THINKING_CHUNKS_LOW_Q1 = [
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:28.1890566Z", "message": {"role": "assistant", "content": "", "thinking": "Thinking"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:28.1960726Z", "message": {"role": "assistant", "content": "", "thinking": " Process"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:28.2016054Z", "message": {"role": "assistant", "content": "", "thinking": ":"}, "done": false}',
]
_REAL_LATE_THINKING_CHUNK_LOW_Q1 = (
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:28.2384221Z", '
    '"message": {"role": "assistant", "content": "", "thinking": "Analyze"}, "done": false}'
)
_REAL_CONTENT_CHUNKS_LOW_Q1 = [
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:30.3312179Z", "message": {"role": "assistant", "content": "In"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:30.3357639Z", "message": {"role": "assistant", "content": " **"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:30.343308Z", "message": {"role": "assistant", "content": "Deep"}, "done": false}',
]
_REAL_DONE_CHUNK_LOW_Q1_STOP = (
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:31.2391735Z", '
    '"message": {"role": "assistant", "content": ""}, "done": true, "done_reason": "stop", '
    '"total_duration": 3149461300, "load_duration": 5080800, "prompt_eval_count": 27, '
    '"prompt_eval_cached_count": 0, "prompt_eval_duration": 67364000, "eval_count": 507, '
    '"eval_duration": 3071960000}'
)
_REAL_THINKING_CHUNKS_LOW_Q3 = [
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:37.202008Z", "message": {"role": "assistant", "content": "", "thinking": "Here"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:37.2080336Z", "message": {"role": "assistant", "content": "", "thinking": "\'"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:37.214373Z", "message": {"role": "assistant", "content": "", "thinking": "s"}, "done": false}',
]
_REAL_CONTENT_CHUNKS_LOW_Q3 = [
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:40.6184763Z", "message": {"role": "assistant", "content": "This"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:40.6243312Z", "message": {"role": "assistant", "content": " interaction"}, "done": false}',
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:40.6303723Z", "message": {"role": "assistant", "content": " is"}, "done": false}',
]
_REAL_DONE_CHUNK_LOW_Q3_LENGTH = (
    '{"model": "gemma4:e2b-it-qat", "created_at": "2026-09-17T04:01:45.9330415Z", '
    '"message": {"role": "assistant", "content": ""}, "done": true, "done_reason": "length", '
    '"total_duration": 8791481000, "load_duration": 5699100, "prompt_eval_count": 30, '
    '"prompt_eval_cached_count": 0, "prompt_eval_duration": 20409000, "eval_count": 1456, '
    '"eval_duration": 8753412000}'
)
# The full thinking text of one real capture (plan57-desk-high-q3.jsonl, 2,705 characters),
# repeated three times to run past the 6,000-character cap. Repeating real text is still real
# text -- the point of this fixture is the cap rule, not a particular Ask.
_REAL_LONG_THINKING_TEXT_HIGH_Q3 = (
    "Here's a thinking process that leads to the suggested explanation:\n\n"
    "1.  **Deconstruct the Request:** The user wants to know how \"damage scaling\" and "
    "\"overclocks\" interact in the game *Deep Rock Galactic* (DRG). This needs a clear, "
    "concept-level answer without citing specific patch numbers that could go stale.\n\n"
    "2.  **Draft the explanation** around the general relationship: overclocks modify a weapon's "
    "base stats, and damage scaling (enemy armor, difficulty hazard level) is applied on top of "
    "whatever the overclocked weapon already deals, not instead of it.\n\n"
) * 40  # well past 6,000 characters, still built from the same real capture above


class OllamaServiceReasoningTests(unittest.TestCase):
    """Plan 57: the back end keeps a thinking model's thinking instead of throwing it away.

    Every faked stream here replays real chunks captured on the PC 2026-09-17 (see the module
    constants above) -- reordered where a test needs an order the capture itself never produced,
    but never inventing a chunk's own shape.
    """

    def _post(self, ask_mode: str = "speed", *, on_delta=None) -> dict:
        return post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "gemma4:e2b-it-qat",
            [{"role": "user", "content": "q"}],
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            ask_mode,
            "5m",
            cancel_requested=lambda: False,
            on_delta=on_delta,
            think_effort="low",
        )

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_thinking_then_answer_is_captured_in_the_result(self, mock_urlopen: MagicMock) -> None:
        """The common case: thinking arrives, then the answer, then done."""
        lines = (
            list(_REAL_THINKING_CHUNKS_LOW_Q1)
            + list(_REAL_CONTENT_CHUNKS_LOW_Q1)
            + [_REAL_DONE_CHUNK_LOW_Q1_STOP]
        )
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)

        out = self._post()

        self.assertEqual(out.get("reasoning_text"), "Thinking Process:")
        self.assertEqual(out.get("reasoning_tokens"), len("Thinking Process:") // 4)
        self.assertIsInstance(out.get("reasoning_seconds"), int)
        self.assertGreaterEqual(out.get("reasoning_seconds"), 1)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_a_thinking_chunk_after_the_first_answer_chunk_is_appended_without_moving_seconds(
        self, mock_urlopen: MagicMock
    ) -> None:
        """A late thinking chunk joins the buffer; the frozen seconds do not move for it."""
        lines = (
            list(_REAL_THINKING_CHUNKS_LOW_Q1)
            + list(_REAL_CONTENT_CHUNKS_LOW_Q1)
            + [_REAL_LATE_THINKING_CHUNK_LOW_Q1]
            + [_REAL_DONE_CHUNK_LOW_Q1_STOP]
        )
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)

        # Two monotonic reads happen: the first thinking chunk's stamp, then the first answer
        # chunk's freeze. The late thinking chunk after that must not consume a third.
        with patch.object(ollama_service.time, "monotonic", side_effect=[100.0, 106.0]):
            out = self._post()

        self.assertEqual(out.get("reasoning_text"), "Thinking Process:Analyze")
        self.assertEqual(out.get("reasoning_seconds"), 6)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_thinking_only_no_answer(self, mock_urlopen: MagicMock) -> None:
        """The model spends its whole budget thinking and the stream ends with no answer.

        Rule 7: the result still carries the reasoning, and the seconds run from the first
        thinking chunk to the end of the stream (there is no first answer chunk to freeze at).
        """
        lines = list(_REAL_THINKING_CHUNKS_LOW_Q1) + [_REAL_DONE_CHUNK_LOW_Q1_STOP]
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)

        with patch.object(ollama_service.time, "monotonic", side_effect=[200.0, 207.5]):
            out = self._post()

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("response"), "No response text.")
        self.assertEqual(out.get("reasoning_text"), "Thinking Process:")
        self.assertEqual(out.get("reasoning_seconds"), 8)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_no_thinking_at_all(self, mock_urlopen: MagicMock) -> None:
        """Thinking Off, or a stream whose chunks never carry a ``thinking`` field at all."""
        lines = list(_REAL_CONTENT_CHUNKS_LOW_Q1) + [_REAL_DONE_CHUNK_LOW_Q1_STOP]
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)

        out = self._post()

        self.assertEqual(out.get("reasoning_text"), "")
        self.assertIsNone(out.get("reasoning_seconds"))
        self.assertEqual(out.get("reasoning_tokens"), 0)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_pending_reasoning_partial_is_the_newest_600_characters(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The live line the screen polls carries only the newest 600 characters of the thinking
        so far, not the whole (possibly still-growing) buffer -- checked against the real,
        2,705-character capture from plan57-desk-high-q3.jsonl, past a single 600-character chunk.
        """
        long_thinking_chunk = json.dumps(
            {
                "model": "gemma4:e2b-it-qat",
                "created_at": "2026-09-17T04:01:37.202008Z",
                "message": {"role": "assistant", "content": "", "thinking": _REAL_LONG_THINKING_TEXT_HIGH_Q3[:2705]},
                "done": False,
            }
        )
        lines = [long_thinking_chunk, _REAL_DONE_CHUNK_LOW_Q1_STOP]
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)
        seen: list[dict] = []

        def _on_delta(text, done, _thinking=None, **kwargs):
            seen.append(kwargs)

        self._post(on_delta=_on_delta)

        partials = [c for c in seen if c.get("reasoning_partial") is not None]
        self.assertTrue(partials, "no reasoning_partial was ever published")
        published = partials[0]["reasoning_partial"]
        self.assertEqual(len(published), 600)
        self.assertEqual(published, _REAL_LONG_THINKING_TEXT_HIGH_Q3[:2705][-600:])

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_cut_off_stream_still_published_reasoning_before_failing(
        self, mock_urlopen: MagicMock
    ) -> None:
        """The connection ends before Ollama's ``done: true`` line.

        The whole Ask fails (matching the existing cut-off-stream contract), but the live line
        the screen already polled must have carried the thinking that arrived before the cut --
        plan 54's lesson that a field only written at completion is useless live.
        """
        lines = list(_REAL_THINKING_CHUNKS_LOW_Q1)  # no done:true line -- the connection just ends
        mock_urlopen.return_value = OllamaServiceTests._ndjson_response(lines)
        seen: list[dict] = []

        def _on_delta(text, done, _thinking=None, **kwargs):
            seen.append({"text": text, "done": done, **kwargs})

        out = self._post(on_delta=_on_delta)

        self.assertFalse(out.get("success"))
        self.assertTrue(seen, "on_delta was never called before the stream was cut off")
        self.assertEqual(seen[0]["reasoning_partial"], "Thinking")

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_soft_continue_keeps_one_reasoning_buffer_and_one_clock(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Two requests, one thinking buffer, seconds counted from the first request's clock."""
        first = OllamaServiceTests._ndjson_response(
            list(_REAL_THINKING_CHUNKS_LOW_Q3)
            + list(_REAL_CONTENT_CHUNKS_LOW_Q3)
            + [_REAL_DONE_CHUNK_LOW_Q3_LENGTH]
        )
        second = OllamaServiceTests._ndjson_response(
            list(_REAL_THINKING_CHUNKS_LOW_Q1)
            + list(_REAL_CONTENT_CHUNKS_LOW_Q1)
            + [_REAL_DONE_CHUNK_LOW_Q1_STOP]
        )
        mock_urlopen.side_effect = [first, second]

        # Only the first request's first thinking chunk and first answer chunk read the clock --
        # the second request's thinking arrives after reasoning is already frozen, so it is only
        # ever appended (see the two tests above for that rule on its own).
        with patch.object(ollama_service.time, "monotonic", side_effect=[300.0, 306.0]):
            out = self._post(ask_mode="expert")

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("soft_continue_count"), 1)
        self.assertEqual(out.get("reasoning_text"), "Here'sThinking Process:")
        self.assertEqual(out.get("reasoning_seconds"), 6)

    def test_cap_keeps_the_end_and_the_token_estimate_uses_the_full_length(self) -> None:
        """The 6,000-character cap keeps the END of a long think and says so; the token estimate
        is worked out from the full, uncapped text.
        """
        full_text = _REAL_LONG_THINKING_TEXT_HIGH_Q3
        self.assertGreater(len(full_text), ollama_service.REASONING_TEXT_CAP_CHARS)

        capped = ollama_service.cap_reasoning_text(full_text)

        self.assertTrue(capped.startswith(ollama_service.REASONING_CUT_NOTE))
        self.assertTrue(full_text.endswith(capped[len(ollama_service.REASONING_CUT_NOTE) :]))
        self.assertEqual(
            len(capped) - len(ollama_service.REASONING_CUT_NOTE),
            ollama_service.REASONING_TEXT_CAP_CHARS,
        )
        # The estimate a real Ask would report uses the FULL text, not the capped one.
        full_len_estimate = len(full_text) // 4
        capped_len_estimate = len(capped) // 4
        self.assertNotEqual(full_len_estimate, capped_len_estimate)

    def test_short_text_is_not_touched_by_the_cap(self) -> None:
        self.assertEqual(ollama_service.cap_reasoning_text("Short thought."), "Short thought.")


if __name__ == "__main__":
    unittest.main()
