"""Title: The notes search imports on a PC that has no Decky host module

Purpose: Pin that `backend.knowledge.knowledge_base_service` can be imported in a fresh process with no
`decky` module at all (the way scripts/measure_kb_thin_match.py and the other PC measuring scripts run
it), and that with the mod-rule switch off the load-order reader is not even loaded.
Used for: knowledge_base_service.py and kb_mod_rule_block.py (which it imports).
Solves: The mod step imported a reader that does `import decky` at the top, so every PC script that
imported the service stopped with "No module named 'decky'". The full test set never showed it because
other test files put a stand-in `decky` in place first; only a fresh process sees the truth.
Does not: Test what the step does (test_kb_mod_rule_block.py).
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

_PROGRAM = """
import sys
assert "decky" not in sys.modules
import backend.knowledge.knowledge_base_service as service
assert "decky" not in sys.modules, "something put a decky module in place"
assert "backend.knowledge.rag_corpus_load_order" not in sys.modules, "the reader was loaded with the switch off"
print("imported")
"""


class ServiceImportsWithoutDeckyTests(unittest.TestCase):
    def test_the_service_imports_in_a_fresh_process_with_no_decky_module(self):
        env = dict(os.environ)
        env["PYTHONPATH"] = os.pathsep.join([str(REPO_ROOT), str(REPO_ROOT / "py_modules")])
        with tempfile.TemporaryDirectory() as empty_folder:  # not tests/, which holds the stand-in decky
            done = subprocess.run(
                [sys.executable, "-c", _PROGRAM], env=env, cwd=empty_folder, capture_output=True, text=True, timeout=120
            )
        self.assertEqual(done.returncode, 0, done.stderr[-1500:])
        self.assertIn("imported", done.stdout)


if __name__ == "__main__":
    unittest.main()
