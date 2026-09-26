"""Unit tests for chat_summary_service.

Uses the real summaries captured on the Deck (docs/test-evidence/plan68-GATE-01.json, copied into
tests/fixtures/plan68_real_summaries.json) as the faked model output wherever a written summary's
exact text matters, rather than invented text (lessons-learned.md section 2: test the shape the
system really produces).
"""

import asyncio
import json
import os
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.chat_memory_service import build_memory_lines
from backend.services.chat_summary_service import (
    MIN_KEPT_TURNS,
    SUMMARY_INPUT_CAP_TOKENS,
    SummaryOutcome,
    SummaryPlan,
    last_memory_allowance_tokens,
    note_memory_allowance_tokens,
    plan_summary,
    reset_last_memory_allowance,
    write_chat_summary,
)
from backend.services.token_accounting_service import reset_token_accounting
from fake_ollama_stream import ndjson_response

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "fixtures", "plan68_real_summaries.json"
)

# A Hollow Knight -style hidden spoiler, matching the shape of the real "wheatley fight" chat's
# own Hollow Knight spoiler block noted in docs/test-evidence/plan68-GATE-01.json (its raw text
# was not captured in the evidence, only that a spoiler was present -- built here to prove the
# same guarantee ``chat_memory_service`` already proves for the ordinary memory).
HOLLOW_KNIGHT_SPOILER_ANSWER = (
    "Focus on dodging the Radiance's beam sweeps and punishing the landing.\n\n"
    "```bonsai-spoiler\n"
    "The Pale King bound the Radiance beneath the Black Egg Temple, and the Hollow Knight is the "
    "vessel that was meant to contain her forever.\n"
    "```\n\n"
    "Keep your soul topped up so you can heal between openings."
)


def _load_real_summaries() -> list[dict]:
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["runs"]


def _chat(n: int) -> list[dict]:
    """``n`` question/answer pairs, oldest first, each with a stable id."""
    turns = []
    for i in range(n):
        turns.append({"id": f"q{i}", "role": "user", "text": f"question number {i}"})
        turns.append(
            {"id": f"a{i}", "role": "assistant", "text": f"answer number {i} " * 20}
        )
    return turns


class _SlowResponse:
    """A response whose first read blocks past the (patched, short) deadline before finishing --
    a stand-in for a model that is still generating when the overall time limit runs out."""

    def __init__(self, sleep_s: float, final_line: bytes):
        self._sleep_s = sleep_s
        self._final_line = final_line
        self._sent = False

    def read1(self, _n: int):
        if not self._sent:
            time.sleep(self._sleep_s)
            self._sent = True
            return self._final_line
        return b""

    def close(self) -> None:
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass


class _StopMidReadResponse:
    """A response that raises the plugin's own abort flag partway through -- a stand-in for the
    person pressing Stop while the summary call is already running."""

    def __init__(self, plugin, final_line: bytes):
        self._plugin = plugin
        self._final_line = final_line
        self._sent = False

    def read1(self, _n: int):
        if not self._sent:
            self._plugin._abort_current_ollama_chat.set()
            self._sent = True
            return self._final_line
        return b""

    def close(self) -> None:
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass


class _FakePlugin:
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


def _ok_response_for(text: str):
    return ndjson_response(
        [json.dumps({"message": {"role": "assistant", "content": text}, "done": True})]
    )


class PlanSummaryTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def test_a_chat_that_fits_has_not_outgrown_its_room(self):
        chat = {"turns": _chat(2)}
        plan = plan_summary(chat, memory_allowance_tokens=2000, model_name="")
        self.assertFalse(plan.needed)

    def test_a_long_chat_has_outgrown_its_room(self):
        chat = {"turns": _chat(60)}
        plan = plan_summary(chat, memory_allowance_tokens=300, model_name="")
        self.assertTrue(plan.needed)

    def test_the_kept_tail_is_never_fewer_than_four_turns(self):
        chat = {"turns": _chat(60)}
        plan = plan_summary(chat, memory_allowance_tokens=8, model_name="")
        self.assertTrue(plan.needed)
        self.assertGreaterEqual(len(plan.kept_turns), MIN_KEPT_TURNS)

    def test_the_question_being_asked_is_not_one_of_the_kept_turns(self):
        # The live question is saved into the chat before the answer starts; the kept tail must
        # still be two FINISHED questions and answers, not one and a half plus the live question.
        turns = _chat(60) + [{"id": "live", "role": "user", "text": "and what about that"}]
        plan = plan_summary({"turns": turns}, memory_allowance_tokens=8, model_name="")
        self.assertTrue(plan.needed)
        self.assertEqual([t["id"] for t in plan.kept_turns], ["q58", "a58", "q59", "a59"])
        self.assertNotIn("live", [t["id"] for t in plan.covered_turns])

    def test_the_kept_tail_grows_with_more_room_rather_than_always_being_four(self):
        chat = {"turns": _chat(60)}
        small = plan_summary(chat, memory_allowance_tokens=40, model_name="")
        big = plan_summary(chat, memory_allowance_tokens=4000, model_name="")
        self.assertEqual(len(small.kept_turns), MIN_KEPT_TURNS)
        self.assertGreater(len(big.kept_turns), len(small.kept_turns))

    def test_a_second_summary_folds_the_first_rather_than_redoing_its_ground(self):
        turns = _chat(10)
        previous = {
            "text": "earlier notes",
            "covers_through_turn_id": "a4",
            "turns_covered": 10,
            "oldest_turns_unread": 0,
            "hidden_notes_left_out": 0,
        }
        chat = {"turns": turns, "summary": previous}
        plan = plan_summary(chat, memory_allowance_tokens=40, model_name="")
        self.assertIs(plan.previous, previous)
        seen_ids = {t["id"] for t in plan.covered_turns} | {t["id"] for t in plan.kept_turns}
        for i in range(5):
            self.assertNotIn(f"q{i}", seen_ids)
            self.assertNotIn(f"a{i}", seen_ids)

    def test_a_very_long_chat_reads_only_its_newest_part(self):
        chat = {"turns": _chat(100)}  # 200 turns, the slot's own cap
        plan = plan_summary(chat, memory_allowance_tokens=300, model_name="")
        self.assertTrue(plan.needed)
        self.assertGreater(plan.oldest_turns_unread, 0)

    def test_the_covered_turns_fit_the_input_cap(self):
        chat = {"turns": _chat(100)}
        plan = plan_summary(chat, memory_allowance_tokens=300, model_name="")
        _lines, _carried, left_out, _hidden, _used, _scanned = build_memory_lines(
            plan.covered_turns, SUMMARY_INPUT_CAP_TOKENS, ""
        )
        self.assertEqual(left_out, 0)


class LastMemoryAllowanceTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_last_memory_allowance()

    def test_an_unseen_model_falls_back_to_the_default(self):
        from backend.services.chat_summary_service import DEFAULT_MEMORY_ALLOWANCE_TOKENS

        self.assertEqual(last_memory_allowance_tokens("nobody:asked"), DEFAULT_MEMORY_ALLOWANCE_TOKENS)

    def test_a_noted_allowance_is_remembered_per_model(self):
        note_memory_allowance_tokens("gemma4:e2b-it-qat", 3500)
        self.assertEqual(last_memory_allowance_tokens("gemma4:e2b-it-qat"), 3500)
        self.assertNotEqual(last_memory_allowance_tokens("other:model"), 3500)


class WriteChatSummaryTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()
        self.plugin = _FakePlugin()

    def _run(self, plan, turns, *, reply_language="english"):
        return asyncio.run(
            write_chat_summary(
                self.plugin,
                chat={"turns": turns},
                plan=plan,
                model_name="gemma4:e2b-it-qat",
                url="http://127.0.0.1:11434/api/chat",
                keep_alive="5m",
                window_tokens=16384,
                reply_language=reply_language,
                request_id=1,
            )
        )

    @staticmethod
    def _plan_for(turns, previous=None):
        """A plan that always needs summing up, with no word-for-word tail -- what every test
        below wants except the one that checks a previous summary is folded in."""
        return SummaryPlan(
            needed=True, covered_turns=turns, kept_turns=[], oldest_turns_unread=0,
            previous=previous,
        )

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_written_summary_keeps_the_real_captured_text(self, mock_urlopen):
        fixture = next(r for r in _load_real_summaries() if r["lang"] == "english")
        turns = _chat(20)
        plan = self._plan_for(turns)
        mock_urlopen.return_value = _ok_response_for(fixture["text"])

        outcome = self._run(plan, turns)

        self.assertEqual(outcome.status, "written")
        self.assertEqual(outcome.summary["text"], fixture["text"].strip())
        self.assertEqual(outcome.summary["model"], "gemma4:e2b-it-qat")
        self.assertEqual(outcome.summary["covers_through_turn_id"], turns[-1]["id"])
        self.assertEqual(outcome.summary["turns_covered"], len(turns))

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_spanish_reply_language_keeps_the_spanish_summary(self, mock_urlopen):
        fixture = next(r for r in _load_real_summaries() if r["lang"] == "spanish")
        turns = _chat(6)
        plan = self._plan_for(turns)
        mock_urlopen.return_value = _ok_response_for(fixture["text"])

        outcome = self._run(plan, turns, reply_language="spanish")

        self.assertEqual(outcome.status, "written")
        self.assertEqual(outcome.summary["text"], fixture["text"].strip())
        body = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        system_text = body["messages"][0]["content"]
        self.assertIn("Spanish", system_text)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_second_summary_carries_the_first_summarys_text_in_the_request(self, mock_urlopen):
        turns = _chat(4)
        previous = {"text": "Player is fighting Wheatley.", "covers_through_turn_id": "a0"}
        plan = self._plan_for(turns, previous=previous)
        mock_urlopen.return_value = _ok_response_for("Notes updated.")

        self._run(plan, turns)

        body = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        user_text = body["messages"][1]["content"]
        self.assertIn("Notes from earlier in this chat:", user_text)
        self.assertIn("Player is fighting Wheatley.", user_text)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_hidden_block_never_reaches_the_request(self, mock_urlopen):
        turns = [
            {"id": "q0", "role": "user", "text": "how do i beat the radiance"},
            {"id": "a0", "role": "assistant", "text": HOLLOW_KNIGHT_SPOILER_ANSWER},
        ]
        plan = self._plan_for(turns)
        mock_urlopen.return_value = _ok_response_for("Notes about Hollow Knight.")

        self._run(plan, turns)

        body = mock_urlopen.call_args[0][0].data.decode("utf-8")
        self.assertNotIn("Pale King", body)
        self.assertNotIn("vessel that was meant to contain her", body)
        self.assertIn("a hidden note was here", body)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_failed_call_is_reported_as_failed_and_saves_nothing(self, mock_urlopen):
        mock_urlopen.side_effect = OSError("connection refused")
        turns = _chat(2)
        plan = self._plan_for(turns)

        outcome = self._run(plan, turns)

        self.assertEqual(outcome.status, "failed")
        self.assertIsNone(outcome.summary)

    @patch("backend.services.chat_summary_service.SUMMARY_TIME_LIMIT_SECONDS", 0.1)
    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_stall_past_the_deadline_is_reported_as_timed_out_not_stopped(self, mock_urlopen):
        mock_urlopen.return_value = _SlowResponse(
            0.4, b'{"message":{"role":"assistant","content":"late"},"done":true}\n'
        )
        turns = _chat(2)
        plan = self._plan_for(turns)

        outcome = self._run(plan, turns)

        self.assertEqual(outcome.status, "timed_out")
        self.assertIsNone(outcome.summary)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_stop_mid_call_is_reported_as_stopped_and_saves_nothing(self, mock_urlopen):
        mock_urlopen.return_value = _StopMidReadResponse(
            self.plugin, b'{"message":{"role":"assistant","content":"partial"},"done":true}\n'
        )
        turns = _chat(2)
        plan = self._plan_for(turns)

        outcome = self._run(plan, turns)

        self.assertEqual(outcome.status, "stopped")
        self.assertIsNone(outcome.summary)

    @patch("backend.services.ollama_chat_stream.urllib.request.urlopen")
    def test_a_summary_run_after_an_earlier_stop_does_not_stop_itself(self, mock_urlopen):
        """The stop-flag trap (plan 68 section 1 / section 9): after a Stop, the abort flag stays
        raised until the next call lowers it. A summary that ran first without lowering it itself
        would report itself as stopped on the very first request."""
        self.plugin._abort_current_ollama_chat.set()
        mock_urlopen.return_value = _ok_response_for("Fine, notes written.")
        turns = _chat(2)
        plan = self._plan_for(turns)

        outcome = self._run(plan, turns)

        self.assertEqual(outcome.status, "written")


if __name__ == "__main__":
    unittest.main()
