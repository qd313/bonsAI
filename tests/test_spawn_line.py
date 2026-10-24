"""
Title: Spawn line tests

Purpose: Pins the usage guard in .claude/hooks/spawn-line.py: tokens are weighted by model and by
kind of token, helpers' own transcripts (nested one level down) are counted, a streamed reply that
appears twice counts once, records outside the five-hour window are ignored, and the deny/allow
decision follows the line.

Used for: `npm run test:py`, and `python scripts/verify.py` whenever a Python file changes.

Solves: Before plan 86 the guard counted every token the same, missed helpers' transcripts and never
had a budget, so it could never refuse anything. A change that quietly drops the weighting, the
nested folder or the "unknown never denies" rule would bring that back.

Does not: Read the user's real transcripts (a temp folder is used through BONSAI_PROJECTS_DIR), or
check the real prices against the price list.
"""

import contextlib
import datetime
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HOOK = Path(__file__).resolve().parent.parent / ".claude" / "hooks" / "spawn-line.py"
_spec = importlib.util.spec_from_file_location("spawn_line", HOOK)
sl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sl)

NOW = datetime.datetime.now(datetime.timezone.utc)


def stamp(hours_ago):
    return (NOW - datetime.timedelta(hours=hours_ago)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def record(model, hours_ago, msg_id, inp=0, out=0, write=0, read=0, write_1h=0, kind="assistant"):
    usage = {
        "input_tokens": inp,
        "output_tokens": out,
        "cache_creation_input_tokens": write,
        "cache_read_input_tokens": read,
    }
    if write_1h:
        usage["cache_creation"] = {"ephemeral_5m_input_tokens": write - write_1h, "ephemeral_1h_input_tokens": write_1h}
    message = {"id": msg_id, "usage": usage}
    if model is not None:
        message["model"] = model
    return {"type": kind, "timestamp": stamp(hours_ago), "uuid": f"u-{msg_id}-{hours_ago}", "message": message}


def write_jsonl(path, records, junk=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(r) for r in records]
    if junk:
        lines.insert(0, "not json at all but mentions \"usage\"")
        lines.append("")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


M = 1_000_000


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        patcher = mock.patch.dict(os.environ, {"BONSAI_PROJECTS_DIR": str(self.root)})
        patcher.start()
        self.addCleanup(patcher.stop)
        for name in ("BONSAI_FIVE_HOUR_TOKENS", "BONSAI_SPAWN_LINE"):
            os.environ.pop(name, None)
        self.addCleanup(self.tmp.cleanup)

    def build_window(self):
        """Inside the window: Haiku 1M input ($0.10), Sonnet 1M output ($10), Opus 5.5 1M cache
        read ($0.20) and 1M cache write ($5), Fable 1M input ($10). Total $25.30."""
        proj = self.root / "proj-a"
        write_jsonl(proj / "s1.jsonl", [
            record("claude-haiku-5-5", 1, "m1", inp=M),
            record("claude-sonnet-5-5", 2, "m2", out=M),
            record("claude-opus-5-5", 1, "m3", read=M, write=M),
            # same message id written twice, a partial first snapshot and the full one
            record("claude-fable-5-1", 1, "m4", inp=M // 2),
            record("claude-fable-5-1", 1, "m4", inp=M),
            # outside the window: must not count
            record("claude-fable-5-1", 6, "old", inp=M),
        ])
        # a helper's own transcript, nested one level down
        write_jsonl(proj / "s1" / "subagents" / "agent-abc.jsonl", [
            record("claude-haiku-5-5", 0.5, "h1", inp=0),
        ])
        return 25.30 - 0.0

    def run_hook(self, tool_name, **env):
        payload = json.dumps({"tool_name": tool_name})
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.dict(os.environ, env), mock.patch.object(sys, "stdin", io.StringIO(payload)), \
                mock.patch.object(sys, "argv", ["spawn-line.py"]), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            sl.main()
        return out.getvalue(), err.getvalue()


class Weights(unittest.TestCase):
    def test_each_model_and_kind(self):
        self.assertAlmostEqual(sl.message_cost("claude-haiku-5-5", {"input_tokens": M}), 0.10)
        self.assertAlmostEqual(sl.message_cost("claude-sonnet-5-5", {"output_tokens": M}), 10.0)
        self.assertAlmostEqual(sl.message_cost("claude-opus-5-5", {"cache_read_input_tokens": M}), 0.20)
        self.assertAlmostEqual(sl.message_cost("claude-opus-5-5", {"cache_creation_input_tokens": M}), 5.0)
        self.assertAlmostEqual(sl.message_cost("claude-fable-5-1", {"input_tokens": M}), 10.0)

    def test_one_hour_cache_write_costs_double_input(self):
        usage = {"cache_creation_input_tokens": M, "cache_creation": {"ephemeral_1h_input_tokens": M}}
        self.assertAlmostEqual(sl.message_cost("claude-opus-5-5", usage), 8.0)

    def test_longest_key_wins(self):
        self.assertEqual(sl.prices_for("claude-opus-5-5"), sl.PRICES["opus-5-5"])
        self.assertEqual(sl.prices_for("claude-opus-5"), sl.PRICES["opus-5"])

    def test_unknown_or_missing_model_counts_as_opus_not_cheap(self):
        for model in (None, "", "gpt-whatever", "<synthetic>"):
            self.assertEqual(sl.prices_for(model), sl.FALLBACK_PRICES)
        self.assertGreaterEqual(sl.FALLBACK_PRICES[0], sl.PRICES["opus-5-5"][0])

    def test_garbage_usage_values_are_ignored(self):
        self.assertEqual(sl.message_cost("claude-opus-5-5", {"input_tokens": "lots", "output_tokens": None}), 0)


class Totals(Fixture):
    def test_weighted_total_in_window(self):
        expected = self.build_window()
        total, complete = sl.five_hour_total()
        self.assertTrue(complete)
        self.assertAlmostEqual(total, expected, places=6)

    def test_nested_helper_transcript_is_counted(self):
        proj = self.root / "p"
        write_jsonl(proj / "s" / "subagents" / "agent-x.jsonl", [record("claude-sonnet-5-5", 1, "n1", out=M)])
        total, _ = sl.five_hour_total()
        self.assertAlmostEqual(total, 10.0)

    def test_duplicate_id_across_files_counts_once(self):
        write_jsonl(self.root / "p" / "a.jsonl", [record("claude-sonnet-5-5", 1, "same", out=M)])
        write_jsonl(self.root / "p" / "s" / "subagents" / "b.jsonl", [record("claude-sonnet-5-5", 1, "same", out=M)])
        total, _ = sl.five_hour_total()
        self.assertAlmostEqual(total, 10.0)

    def test_record_without_model_counts_as_opus(self):
        write_jsonl(self.root / "p" / "a.jsonl", [record(None, 1, "nomodel", out=M)])
        total, _ = sl.five_hour_total()
        self.assertAlmostEqual(total, sl.FALLBACK_PRICES[1])

    def test_old_file_is_skipped_by_file_time(self):
        path = self.root / "p" / "old.jsonl"
        write_jsonl(path, [record("claude-sonnet-5-5", 1, "x", out=M)])
        long_ago = (NOW - datetime.timedelta(hours=9)).timestamp()
        os.utime(path, (long_ago, long_ago))
        total, _ = sl.five_hour_total()
        self.assertEqual(total, 0)

    def test_missing_folder_is_unknown(self):
        with mock.patch.dict(os.environ, {"BONSAI_PROJECTS_DIR": str(self.root / "nope")}):
            self.assertIsNone(sl.five_hour_total())

    def test_out_of_time_reports_lower_bound(self):
        self.build_window()
        with mock.patch.object(sl, "TIME_BUDGET_SECONDS", -1.0):
            total, complete = sl.five_hour_total()
        self.assertFalse(complete)
        self.assertEqual(total, 0)


class Decisions(Fixture):
    def test_over_the_line_denies_agent_and_workflow(self):
        self.build_window()  # $25.30 of a $30 budget is about 84 percent, past the 75 default
        for tool in ("Agent", "Workflow"):
            out, _ = self.run_hook(tool, BONSAI_FIVE_HOUR_TOKENS="30")
            self.assertEqual(json.loads(out)["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_under_the_line_allows(self):
        self.build_window()
        out, _ = self.run_hook("Agent", BONSAI_FIVE_HOUR_TOKENS="100")
        self.assertEqual(out, "")

    def test_line_is_adjustable(self):
        self.build_window()
        out, _ = self.run_hook("Agent", BONSAI_FIVE_HOUR_TOKENS="100", BONSAI_SPAWN_LINE="20")
        self.assertIn("deny", out)

    def test_other_tools_never_denied(self):
        self.build_window()
        out, _ = self.run_hook("Bash", BONSAI_FIVE_HOUR_TOKENS="1")
        self.assertEqual(out, "")

    def test_unknown_never_denies(self):
        self.build_window()
        for env in ({}, {"BONSAI_FIVE_HOUR_TOKENS": "abc"}, {"BONSAI_FIVE_HOUR_TOKENS": "0"}, {"BONSAI_FIVE_HOUR_TOKENS": "-5"}):
            out, err = self.run_hook("Agent", **env)
            self.assertEqual(out, "")
            self.assertIn("unknown", err)

    def test_no_transcripts_never_denies(self):
        out, err = self.run_hook("Agent", BONSAI_FIVE_HOUR_TOKENS="1", BONSAI_PROJECTS_DIR=str(self.root / "nope"))
        self.assertEqual(out, "")
        self.assertIn("unknown", err)

    def test_out_of_time_under_the_line_allows_with_a_lower_bound_note(self):
        self.build_window()
        # Out of time before any file is read: total 0, so under the line, allowed, with a note.
        with mock.patch.object(sl, "TIME_BUDGET_SECONDS", -1.0):
            out, err = self.run_hook("Agent", BONSAI_FIVE_HOUR_TOKENS="30")
        self.assertEqual(out, "")
        self.assertIn("lower bound", err)

    def test_real_process_denies_and_survives_garbage_input(self):
        import subprocess
        self.build_window()
        env = dict(os.environ, BONSAI_FIVE_HOUR_TOKENS="30")
        done = subprocess.run([sys.executable, str(HOOK)], input=json.dumps({"tool_name": "Agent"}),
                              capture_output=True, text=True, env=env, timeout=30)
        self.assertEqual(done.returncode, 0)
        self.assertIn("deny", done.stdout)
        for junk in ("", "{not json", "[]", "null"):
            done = subprocess.run([sys.executable, str(HOOK)], input=junk,
                                  capture_output=True, text=True, env=env, timeout=30)
            self.assertEqual(done.returncode, 0)
            self.assertEqual(done.stdout, "")


class Status(Fixture):
    def run_main(self, *argv):
        out = io.StringIO()
        with mock.patch.object(sys, "argv", ["spawn-line.py", *argv]), contextlib.redirect_stdout(out):
            sl.main()
        return out.getvalue()

    def test_status_says_unit_when_uncalibrated_and_when_calibrated(self):
        self.build_window()
        self.assertIn(sl.UNIT, self.run_main("--status"))
        with mock.patch.dict(os.environ, {"BONSAI_FIVE_HOUR_TOKENS": "100"}):
            text = self.run_main("--status")
        self.assertIn("about 25 percent", text)
        self.assertIn(sl.UNIT, text)

    def test_calibrate_arithmetic(self):
        self.build_window()  # $25.30 counted
        text = self.run_main("--calibrate", "10")
        self.assertIn("BONSAI_FIVE_HOUR_TOKENS to 253", text)
        self.assertIn("settings.local.json", text)
        text = self.run_main("--calibrate", "50")
        self.assertIn("BONSAI_FIVE_HOUR_TOKENS to 50.6", text)

    def test_calibrate_rejects_bad_input_and_empty_window(self):
        self.build_window()
        for bad in ("0", "-3", "150", "ten"):
            self.assertNotIn("Set BONSAI_FIVE_HOUR_TOKENS", self.run_main("--calibrate", bad))
        self.assertNotIn("Set BONSAI_FIVE_HOUR_TOKENS", self.run_main("--calibrate"))
        empty = Path(tempfile.mkdtemp())
        with mock.patch.dict(os.environ, {"BONSAI_PROJECTS_DIR": str(empty)}):
            self.assertNotIn("Set BONSAI_FIVE_HOUR_TOKENS", self.run_main("--calibrate", "10"))

    def test_calibrated_budget_round_trips_to_the_same_percent(self):
        self.build_window()
        value = self.run_main("--calibrate", "40").split("BONSAI_FIVE_HOUR_TOKENS to ")[1].split(" ")[0]
        with mock.patch.dict(os.environ, {"BONSAI_FIVE_HOUR_TOKENS": value}):
            self.assertIn("about 40 percent", self.run_main("--status"))


if __name__ == "__main__":
    unittest.main()
