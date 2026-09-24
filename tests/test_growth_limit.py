import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent / "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import growth_limit  # noqa: E402 -- needs the path line above


class ComputeLimitsTests(unittest.TestCase):
    def test_only_files_over_the_general_cap_get_a_recorded_limit(self):
        sizes = {"a.ts": 799, "b.ts": 800, "c.ts": 801, "d.py": 950}
        self.assertEqual(growth_limit.compute_limits(sizes), {"c.ts": 801, "d.py": 950})

    def test_nothing_over_the_cap_records_nothing(self):
        self.assertEqual(growth_limit.compute_limits({"a.ts": 10, "b.py": 800}), {})


class FindViolationsTests(unittest.TestCase):
    def test_unlisted_file_crossing_800_fails(self):
        self.assertEqual(
            growth_limit.find_violations({"a.ts": 801}, {}),
            [("a.ts", 801, 800)],
        )

    def test_unlisted_file_at_exactly_800_passes(self):
        self.assertEqual(growth_limit.find_violations({"a.ts": 800}, {}), [])

    def test_listed_file_over_its_own_recorded_limit_fails(self):
        self.assertEqual(
            growth_limit.find_violations({"big.py": 852}, {"big.py": 850}),
            [("big.py", 852, 850)],
        )

    def test_listed_file_at_or_under_its_own_limit_passes(self):
        self.assertEqual(growth_limit.find_violations({"big.py": 850}, {"big.py": 850}), [])
        self.assertEqual(growth_limit.find_violations({"big.py": 840}, {"big.py": 850}), [])

    def test_listed_file_shrunk_back_under_the_general_cap_still_passes(self):
        # A later split brought it under 800; a stale recorded limit above 800 does not punish it.
        self.assertEqual(growth_limit.find_violations({"big.py": 400}, {"big.py": 850}), [])

    def test_adding_a_comment_only_line_does_not_move_the_code_line_count(self):
        # This test does not touch code_line_count.py directly (that module already excludes
        # comments); it only checks that find_violations reacts to the code-line number it is
        # given, not to some other measure, so an unchanged code-line count never trips it.
        sizes_before = {"big.py": 850}
        sizes_after_a_comment_only_edit = {"big.py": 850}
        limits = {"big.py": 850}
        self.assertEqual(growth_limit.find_violations(sizes_before, limits), [])
        self.assertEqual(growth_limit.find_violations(sizes_after_a_comment_only_edit, limits), [])


class ViolationMessageTests(unittest.TestCase):
    def test_message_says_what_to_do(self):
        msg = growth_limit._violation_message("src/big.tsx", 852, 850)
        self.assertIn("src/big.tsx", msg)
        self.assertIn("852", msg)
        self.assertIn("850", msg)
        self.assertIn("new file", msg)
        self.assertIn("--record", msg)


class LimitsFileRoundTripTests(unittest.TestCase):
    def test_save_then_load_round_trips(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                growth_limit.save_limits({"src/big.tsx": 900, "py_modules/foo.py": 810})
                self.assertEqual(
                    growth_limit.load_limits(),
                    {"src/big.tsx": 900, "py_modules/foo.py": 810},
                )

    def test_load_missing_file_is_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "does_not_exist.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                self.assertEqual(growth_limit.load_limits(), {})

    def test_saved_file_uses_lf_newlines(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "growth_limits.json"
            with patch.object(growth_limit, "LIMITS_JSON", path):
                growth_limit.save_limits({"a.py": 900})
                raw = path.read_bytes()
                self.assertNotIn(b"\r\n", raw)


class CommandTests(unittest.TestCase):
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

    def test_check_json_output_names_the_file(self):
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


if __name__ == "__main__":
    unittest.main()
