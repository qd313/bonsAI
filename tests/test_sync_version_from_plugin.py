"""Title: Plugin version script (node tests, run from the Python suite)

Purpose: Run scripts/sync_version_from_plugin.test.mjs with Node's own test runner, so the
    check that the version script leaves an unchanged file alone is part of `npm run test:py`.
Used for: scripts/sync-version-from-plugin.mjs (run before `npm test` and `npm run build`).
Solves: vitest only collects src/**/*.test.{ts,tsx}; a test for a script under scripts/
    would otherwise run nowhere.
Does not: Check the real src/pluginVersion.ts -- run the script twice and look at git status.
"""

import shutil
import subprocess
import unittest
from pathlib import Path


class VersionScriptNodeTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_version_script_suite(self):
        here = Path(__file__).resolve().parent.parent
        run = subprocess.run(
            ["node", "--test", "scripts/sync_version_from_plugin.test.mjs"],
            cwd=here, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])
