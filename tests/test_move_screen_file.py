"""Title: Screen-file mover (node tests, run from the Python suite)

Purpose: Run scripts/move_screen_file.test.mjs with Node's own test runner, so the check that the
    mover rewrites every kind of reference and refuses unsafe moves is part of `npm run test:py`.
Used for: scripts/move_screen_file.mjs (the command that moves screen files for the folder-per-feature step).
Solves: vitest only collects src/**/*.test.{ts,tsx}; a test for a script under scripts/
    would otherwise run nowhere.
Does not: Move any real file -- every case works in a throwaway git repo that it deletes afterwards.
"""

import os
import shutil
import subprocess
import sys
import unittest
from pathlib import Path


class MoveScreenFileNodeTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_move_screen_file_suite(self):
        here = Path(__file__).resolve().parent.parent
        if not (here / "node_modules" / "ts-morph").exists():
            self.skipTest("ts-morph is not installed (run the install step first)")
        run = subprocess.run(
            ["node", "--test", "scripts/move_screen_file.test.mjs"],
            cwd=here, capture_output=True, text=True, timeout=600,
            env={**os.environ, "PYTHON": sys.executable},
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])
