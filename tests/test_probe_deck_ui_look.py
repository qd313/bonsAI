"""Title: Deck look check (node tests, run from the Python suite)

Purpose: Run scripts/probe_deck_ui_look.test.mjs with Node's own test runner, so the look check's
    exemptions (Steam's own language dropdown on About) are part of `npm run test:py`.
Used for: scripts/probe_deck_ui_look.py (the look check the Deck drivers run on every tab).
Solves: vitest only collects src/**/*.test.{ts,tsx}; a test for a script under scripts/
    would otherwise run nowhere.
Does not: Touch the Deck -- every case runs the probe's page script against a pretend page.
"""

import shutil
import subprocess
import unittest
from pathlib import Path


class ProbeDeckUiLookNodeTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_probe_deck_ui_look_suite(self):
        here = Path(__file__).resolve().parent.parent
        if not (here / "node_modules" / "jsdom").exists():
            self.skipTest("jsdom is not installed (run the install step first)")
        run = subprocess.run(
            ["node", "--test", "scripts/probe_deck_ui_look.test.mjs"],
            cwd=here, capture_output=True, text=True, timeout=600,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])
