"""Title: Third-party licences file (node tests, run from the Python suite)

Purpose: Run scripts/third_party_licenses.test.mjs with Node's own test runner, so the
    checks on the licences file are part of `npm run test:py`.
Used for: scripts/third_party_licenses.mjs (run after rollup by `npm run build`).
Solves: vitest only collects src/**/*.test.{ts,tsx}; a test for a script under scripts/
    would otherwise run nowhere. No new dependency: node:test ships with Node.
Does not: Check the real bundle -- `npm run build` does that every time it runs.
"""

from __future__ import annotations

import shutil
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TEST_FILE = REPO_ROOT / "scripts" / "third_party_licenses.test.mjs"


@unittest.skipIf(shutil.which("node") is None, "node is not installed")
class ThirdPartyLicencesNodeTests(unittest.TestCase):
    def test_node_suite_passes(self) -> None:
        proc = subprocess.run(
            ["node", "--test", str(TEST_FILE)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout[-4000:] + proc.stderr[-2000:])


if __name__ == "__main__":
    unittest.main()
