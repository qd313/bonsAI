"""Title: Knowledge library release is never marked "latest" on GitHub

Purpose: Pin that `scripts/publish_corpus.py --push-github` creates the knowledge library's
GitHub release with `--latest=false`, so the library can never take the "latest" spot that
the plugin's own release needs (the README install link asks GitHub for the latest release).
Used for: scripts/publish_corpus.py push_to_github (the `gh release create` call).
Solves: The library's release was created with no latest flag, so GitHub counted it as the
  newest release. The README install link then pointed at a release with no plugin zip and
  new users got "not found".
Does not: Call GitHub or `gh` for real. It records the command the script would run and
  checks the flag is in it. The GitHub setting that marks the plugin release as latest is
  done by hand by the maintainer.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import publish_corpus  # noqa: E402


class PublishCorpusReleaseNotLatestTests(unittest.TestCase):
    """Runs push_to_github with `gh` replaced by a recorder. `gh release view` reports that the
    release does not exist yet, so the script takes the create path. Nothing leaves the machine."""

    def setUp(self):
        self.publish_corpus = publish_corpus
        self._tmp = tempfile.TemporaryDirectory()
        self.build_dir = Path(self._tmp.name)
        self.manifest = {"version": "2026.10.09", "chunks": [{"filename": "kb-chunk.db.gz"}]}

    def tearDown(self):
        self._tmp.cleanup()

    def _run_push(self, release_exists: bool) -> list[list[str]]:
        calls: list[list[str]] = []

        def fake_run(cmd, *args, **kwargs):
            calls.append(list(cmd))
            if cmd[:3] == ["gh", "release", "view"]:
                return subprocess.CompletedProcess(cmd, 0 if release_exists else 1)
            return subprocess.CompletedProcess(cmd, 0)

        with mock.patch.object(self.publish_corpus.subprocess, "run", side_effect=fake_run):
            self.publish_corpus.push_to_github(self.build_dir, self.manifest)
        return calls

    def test_first_release_is_created_as_not_latest(self):
        calls = self._run_push(release_exists=False)
        creates = [c for c in calls if c[:3] == ["gh", "release", "create"]]
        self.assertEqual(len(creates), 1, f"expected one gh release create, got calls: {calls}")
        self.assertIn("--latest=false", creates[0], f"create command lacks --latest=false: {creates[0]}")

    def test_upload_path_adds_no_latest_flag(self):
        # The upload path re-uploads assets to a release that already exists. It must not
        # set a latest flag either, or a re-run could take the spot back.
        calls = self._run_push(release_exists=True)
        uploads = [c for c in calls if c[:3] == ["gh", "release", "upload"]]
        self.assertEqual(len(uploads), 1, f"expected one gh release upload, got calls: {calls}")
        self.assertFalse(
            any(arg.startswith("--latest") for arg in uploads[0]),
            f"upload command must not set latest: {uploads[0]}",
        )


if __name__ == "__main__":
    unittest.main()
