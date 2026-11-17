"""Title: Deck question-list script (its own node tests, run as part of the Python suite)

Purpose: Run scripts/deck_ask_rows.test.mjs and scripts/deck_wait_answer.test.mjs with node, so the tests for the
    script that asks a whole list of questions on the Deck, and for the one that only waits for an answer the
    driver sent, are part of the Python suite and fail a landing, not a Deck night.
Used for: scripts/deck_ask_rows.mjs (plan 104, lane T1), the one-call question list a Deck driver runs, and
    scripts/deck_wait_answer.mjs (plan 105, lane T2), which reuses its code.
Solves: Node's built-in test files under scripts/ are not collected by vitest or by the Python runner, so a
    break there would go unseen until a driver tried the script. The same pattern runs the read-back's page tests.
Does not: Touch the Deck. The tests use a stand-in for the Deck tools server (the repo's own fake one) and a
    stand-in function for SSH; nothing is started on the Deck, nothing is asked over SSH, and the evidence files
    they write go to a temporary folder.
"""

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class DeckAskRowsNodeTests(unittest.TestCase):
    def run_suite(self, name):
        run = subprocess.run(
            ["node", "--test", f"scripts/{name}.test.mjs"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])

    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_deck_ask_rows_suite(self):
        self.run_suite("deck_ask_rows")

    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_deck_wait_answer_suite(self):
        self.run_suite("deck_wait_answer")


if __name__ == "__main__":
    unittest.main()
