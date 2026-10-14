"""Title: Focus-pattern checker (node tests, run from the Python suite)

Purpose: Run scripts/check_focus_patterns.test.mjs with Node's own test runner, so the check that the
    focus-pattern gate catches move handlers spread onto a Decky Button is part of `npm run test:py`.
Used for: scripts/check-focus-patterns.mjs (the focus gate every lane runs before a commit).
Solves: vitest only collects src/**/*.test.{ts,tsx}; a test for a script under scripts/
    would otherwise run nowhere.
Does not: Check the real src tree -- run `node scripts/check-focus-patterns.mjs` for that.
"""

import shutil
import subprocess
import unittest
from pathlib import Path


class FocusPatternCheckerNodeTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_focus_pattern_checker_suite(self):
        here = Path(__file__).resolve().parent.parent
        run = subprocess.run(
            ["node", "--test", "scripts/check_focus_patterns.test.mjs"],
            cwd=here, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])
