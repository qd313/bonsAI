"""Title: The workshop setting (Python helper and its JavaScript twin)

Purpose: Pin how scripts find the workshop folder: the BONSAI_WORKSHOP environment variable wins, then
    a BONSAI_WORKSHOP= line in .env, then the folder named bonsAI-workshop next to the repo. A missing
    folder must stop with one plain sentence. Every case runs in temp folders, never in the real
    workshop. The JavaScript twin (scripts/lib/workshop.mjs) is tested by scripts/workshop.test.mjs,
    which one test below runs with Node's own test runner so it is part of `npm run test:py`.
Used for: scripts/lib/workshop.py, scripts/lib/workshop.mjs.
Solves: Two copies of the same lookup (one per language) drifting apart, or a script quietly writing
    Deck evidence into a wrong folder because the workshop was not found.
Does not: Touch the real workshop or the real .env of the repo.
"""

import importlib.util
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_workshop():
    spec = importlib.util.spec_from_file_location("workshop_under_test", REPO_ROOT / "scripts" / "lib" / "workshop.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


workshop = _load_workshop()


class WorkshopLookupTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.base = Path(self._tmp.name).resolve()
        self.repo = self.base / "BonsAI"
        self.repo.mkdir()

    def make_dir(self, *parts):
        path = self.base.joinpath(*parts)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def test_default_is_the_folder_next_to_the_repo(self):
        expected = self.make_dir("bonsAI-workshop")
        self.assertEqual(workshop.workshop_root(self.repo, {}), expected)

    def test_environment_variable_beats_env_file_and_default(self):
        self.make_dir("bonsAI-workshop")
        from_file = self.make_dir("from-file")
        from_env = self.make_dir("from-env")
        (self.repo / ".env").write_text(f"BONSAI_WORKSHOP={from_file}\n", encoding="utf-8")
        self.assertEqual(workshop.workshop_root(self.repo, {"BONSAI_WORKSHOP": str(from_env)}), from_env)

    def test_env_file_beats_default(self):
        self.make_dir("bonsAI-workshop")
        from_file = self.make_dir("from-file")
        (self.repo / ".env").write_text(
            f"# a comment\nDECK_IP=1.2.3.4\nexport BONSAI_WORKSHOP=\"{from_file}\"\n", encoding="utf-8"
        )
        self.assertEqual(workshop.workshop_root(self.repo, {}), from_file)

    def test_blank_setting_falls_through_to_the_default(self):
        expected = self.make_dir("bonsAI-workshop")
        (self.repo / ".env").write_text("BONSAI_WORKSHOP=\n", encoding="utf-8")
        self.assertEqual(workshop.workshop_root(self.repo, {"BONSAI_WORKSHOP": "  "}), expected)

    def test_missing_folder_says_so_in_one_plain_sentence(self):
        with self.assertRaises(workshop.WorkshopNotFound) as caught:
            workshop.workshop_root(self.repo, {})
        message = str(caught.exception)
        self.assertIn("the workshop repo was not found at", message)
        self.assertIn(str(self.base / "bonsAI-workshop"), message)
        self.assertIn("clone qd313/bonsAI-workshop next to this repo, or set BONSAI_WORKSHOP in .env", message)
        self.assertNotIn("\n", message)

    def test_setting_that_points_nowhere_is_an_error_not_a_fallback(self):
        self.make_dir("bonsAI-workshop")
        missing = self.base / "nowhere"
        with self.assertRaises(workshop.WorkshopNotFound) as caught:
            workshop.workshop_root(self.repo, {"BONSAI_WORKSHOP": str(missing)})
        self.assertIn(str(missing), str(caught.exception))

    def test_relative_setting_is_refused(self):
        with self.assertRaises(workshop.WorkshopNotFound) as caught:
            workshop.workshop_root(self.repo, {"BONSAI_WORKSHOP": "bonsAI-workshop"})
        self.assertIn("absolute folder path", str(caught.exception))

    def test_a_working_copy_finds_the_workshop_and_env_of_the_main_checkout(self):
        copy = self.make_dir("BonsAI", ".claude", "worktrees", "some-lane")
        expected = self.make_dir("bonsAI-workshop")
        self.assertEqual(workshop.workshop_root(copy, {}), expected)
        elsewhere = self.make_dir("elsewhere")
        (self.repo / ".env").write_text(f"BONSAI_WORKSHOP={elsewhere}\n", encoding="utf-8")
        self.assertEqual(workshop.workshop_root(copy, {}), elsewhere)

    def test_the_three_folders(self):
        root = self.make_dir("bonsAI-workshop")
        self.assertEqual(workshop.evidence_dir(self.repo, {}), root / "test-evidence")
        self.assertEqual(workshop.walks_dir(self.repo, {}), root / "checks")
        self.assertEqual(workshop.research_dir(self.repo, {}), root / "archive" / "research")


class WorkshopNodeTwinTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_javascript_helper_suite(self):
        run = subprocess.run(
            ["node", "--test", "scripts/workshop.test.mjs"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])

    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_overnight_run_suite(self):
        run = subprocess.run(
            ["node", "--test", "scripts/deck_overnight_run.test.mjs"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=300,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])


if __name__ == "__main__":
    unittest.main()
