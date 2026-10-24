import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent / "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import growth_limit  # noqa: E402 -- needs the path line above


class ApplyRecordTests(unittest.TestCase):
    def test_a_newly_over_800_file_is_added_at_its_current_size(self):
        result = growth_limit.apply_record({"a.ts": 801}, {})
        self.assertEqual(result.limits, {"a.ts": {"limit": 801}})
        self.assertEqual(result.added, ["a.ts"])
        self.assertEqual(result.refused, [])

    def test_a_file_at_or_under_800_gets_no_entry(self):
        result = growth_limit.apply_record({"a.ts": 800, "b.ts": 10}, {})
        self.assertEqual(result.limits, {})
        self.assertEqual(result.added, [])

    def test_a_grown_listed_file_is_refused_and_kept_at_its_old_limit(self):
        existing = {"big.py": {"limit": 850}}
        result = growth_limit.apply_record({"big.py": 852}, existing)
        # The whole point: --record never raises. The entry is untouched.
        self.assertEqual(result.limits, {"big.py": {"limit": 850}})
        self.assertEqual(result.refused, [("big.py", 852, 850)])
        self.assertEqual(result.lowered, [])
        self.assertEqual(result.added, [])

    def test_a_grown_file_keeps_its_reason_when_refused(self):
        existing = {"big.py": {"limit": 850, "reason": "known backlog", "date": "2026-01-01"}}
        result = growth_limit.apply_record({"big.py": 852}, existing)
        self.assertEqual(result.limits["big.py"], existing["big.py"])

    def test_a_shrunk_listed_file_is_lowered_and_loses_its_reason(self):
        existing = {"big.py": {"limit": 900, "reason": "old reason", "date": "2026-01-01"}}
        result = growth_limit.apply_record({"big.py": 850}, existing)
        self.assertEqual(result.limits, {"big.py": {"limit": 850}})
        self.assertEqual(result.lowered, [("big.py", 900, 850)])

    def test_a_file_shrunk_to_the_general_cap_or_under_is_dropped(self):
        existing = {"big.py": {"limit": 900}}
        result = growth_limit.apply_record({"big.py": 800}, existing)
        self.assertEqual(result.limits, {})
        self.assertEqual(result.dropped, ["big.py"])

    def test_an_unchanged_listed_file_is_kept_exactly_as_it_was(self):
        existing = {"big.py": {"limit": 900, "reason": "why", "date": "2026-01-01"}}
        result = growth_limit.apply_record({"big.py": 900}, existing)
        self.assertEqual(result.limits, existing)
        self.assertEqual(result.added, [])
        self.assertEqual(result.lowered, [])
        self.assertEqual(result.refused, [])

    def test_a_file_that_disappeared_is_simply_not_in_the_new_limits(self):
        existing = {"gone.py": {"limit": 900}}
        result = growth_limit.apply_record({}, existing)
        self.assertEqual(result.limits, {})


class FindViolationsTests(unittest.TestCase):
    def test_unlisted_file_crossing_800_fails(self):
        self.assertEqual(
            growth_limit.find_violations({"a.ts": 801}, {}),
            [("a.ts", 801, 800, None)],
        )

    def test_unlisted_file_at_exactly_800_passes(self):
        self.assertEqual(growth_limit.find_violations({"a.ts": 800}, {}), [])

    def test_listed_file_over_its_own_recorded_limit_fails(self):
        self.assertEqual(
            growth_limit.find_violations({"big.py": 852}, {"big.py": {"limit": 850}}),
            [("big.py", 852, 850, None)],
        )

    def test_listed_file_over_its_own_limit_carries_its_reason(self):
        limits = {"big.py": {"limit": 850, "reason": "why", "date": "2026-01-01"}}
        self.assertEqual(
            growth_limit.find_violations({"big.py": 852}, limits),
            [("big.py", 852, 850, "why")],
        )

    def test_listed_file_at_or_under_its_own_limit_passes(self):
        self.assertEqual(growth_limit.find_violations({"big.py": 850}, {"big.py": {"limit": 850}}), [])
        self.assertEqual(growth_limit.find_violations({"big.py": 840}, {"big.py": {"limit": 850}}), [])

    def test_listed_file_shrunk_back_under_the_general_cap_still_passes(self):
        self.assertEqual(growth_limit.find_violations({"big.py": 400}, {"big.py": {"limit": 850}}), [])


class ViolationMessageTests(unittest.TestCase):
    def test_message_says_what_to_do_with_raise_not_record(self):
        msg = growth_limit._violation_message("src/big.tsx", 852, 850)
        self.assertIn("src/big.tsx", msg)
        self.assertIn("852", msg)
        self.assertIn("850", msg)
        self.assertIn("new file", msg)
        self.assertIn("--raise src/big.tsx", msg)
        self.assertIn("--reason", msg)
        self.assertNotIn("--record", msg)

    def test_message_includes_the_reason_when_there_is_one(self):
        msg = growth_limit._violation_message("src/big.tsx", 852, 850, "known backlog")
        self.assertIn("known backlog", msg)


class LimitsFileRoundTripTests(unittest.TestCase):
    def test_save_then_load_round_trips_with_reason_and_date(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                growth_limit.save_limits(
                    {
                        "src/big.tsx": {"limit": 900},
                        "py_modules/foo.py": {"limit": 810, "reason": "reviewed", "date": "2026-09-24"},
                    }
                )
                self.assertEqual(
                    growth_limit.load_limits(),
                    {
                        "src/big.tsx": {"limit": 900},
                        "py_modules/foo.py": {"limit": 810, "reason": "reviewed", "date": "2026-09-24"},
                    },
                )

    def test_load_missing_file_is_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "does_not_exist.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                self.assertEqual(growth_limit.load_limits(), {})

    def test_load_understands_the_old_plain_integer_shape(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            path.write_text(json.dumps({"limits": {"a.ts": 900}}), encoding="utf-8")
            with patch.object(growth_limit, "LIMITS_JSON", path):
                self.assertEqual(growth_limit.load_limits(), {"a.ts": {"limit": 900}})

    def test_saved_file_uses_lf_newlines(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                growth_limit.save_limits({"a.py": {"limit": 900}})
                raw = path.read_bytes()
                self.assertNotIn(b"\r\n", raw)


class CmdRaiseTests(unittest.TestCase):
    def test_raise_requires_a_reason(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 900}):
            captured = io.StringIO()
            with patch("sys.stderr", captured):
                code = growth_limit.cmd_raise("a.ts", None)
            self.assertEqual(code, 2)
            self.assertIn("reason", captured.getvalue())

    def test_raise_requires_a_non_blank_reason(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 900}):
            self.assertEqual(growth_limit.cmd_raise("a.ts", "   "), 2)

    def test_raise_rejects_an_unwatched_path(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 900}):
            captured = io.StringIO()
            with patch("sys.stderr", captured):
                code = growth_limit.cmd_raise("not_watched.ts", "why")
            self.assertEqual(code, 2)
            self.assertIn("not_watched.ts", captured.getvalue())

    def test_raise_writes_the_new_limit_reason_and_date(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path), patch.object(
                growth_limit, "measure", return_value={"a.ts": 900}
            ), patch.object(growth_limit, "datetime") as mock_dt:
                mock_dt.date.today.return_value.isoformat.return_value = "2026-09-24"
                code = growth_limit.cmd_raise("a.ts", "reviewed, feature needs it")
                self.assertEqual(code, 0)
                self.assertEqual(
                    growth_limit.load_limits()["a.ts"],
                    {"limit": 900, "reason": "reviewed, feature needs it", "date": "2026-09-24"},
                )

    def test_after_raising_the_file_passes_check_at_its_new_size(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path), patch.object(
                growth_limit, "measure", return_value={"a.ts": 900}
            ):
                growth_limit.cmd_raise("a.ts", "reviewed")
                self.assertEqual(growth_limit.cmd_check(as_json=True), 0)


class CmdCheckTests(unittest.TestCase):
    def test_check_exits_1_when_something_is_over(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 900}), patch.object(
            growth_limit, "load_limits", return_value={}
        ):
            self.assertEqual(growth_limit.cmd_check(as_json=True), 1)

    def test_check_exits_0_when_nothing_is_over(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 400}), patch.object(
            growth_limit, "load_limits", return_value={}
        ):
            self.assertEqual(growth_limit.cmd_check(as_json=True), 0)

    def test_check_json_names_the_file_and_checked_count(self):
        with patch.object(growth_limit, "measure", return_value={"a.ts": 900}), patch.object(
            growth_limit, "load_limits", return_value={}
        ):
            captured = io.StringIO()
            with patch("sys.stdout", captured):
                growth_limit.cmd_check(as_json=True)
            payload = json.loads(captured.getvalue())
            self.assertEqual(payload["checked"], 1)
            self.assertEqual(len(payload["violations"]), 1)
            self.assertIn("a.ts", payload["violations"][0])

    def test_check_json_lists_files_raised_on_purpose_even_when_passing(self):
        limits = {"a.ts": {"limit": 900, "reason": "reviewed", "date": "2026-09-24"}}
        with patch.object(growth_limit, "measure", return_value={"a.ts": 850}), patch.object(
            growth_limit, "load_limits", return_value=limits
        ):
            captured = io.StringIO()
            with patch("sys.stdout", captured):
                code = growth_limit.cmd_check(as_json=True)
            payload = json.loads(captured.getvalue())
            self.assertEqual(code, 0)
            self.assertEqual(payload["violations"], [])
            self.assertEqual(len(payload["raised"]), 1)
            self.assertEqual(payload["raised"][0]["reason"], "reviewed")


class CmdRecordTests(unittest.TestCase):
    def test_record_refuses_to_raise_a_grown_file_and_check_still_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                growth_limit.save_limits({"big.py": {"limit": 850}})
                with patch.object(growth_limit, "measure", return_value={"big.py": 852}):
                    growth_limit.cmd_record()
                    self.assertEqual(growth_limit.load_limits()["big.py"]["limit"], 850)
                    self.assertEqual(growth_limit.cmd_check(as_json=True), 1)


if __name__ == "__main__":
    unittest.main()
