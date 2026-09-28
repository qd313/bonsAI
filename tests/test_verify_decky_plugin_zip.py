"""Title: The release zip check is strict about licences and runtime data

Purpose: Build small plugin zips and run scripts/verify-decky-plugin-zip.sh on them: a complete
    one passes; one missing LICENSE, NOTICE, the third-party licences file or the data files the
    back end reads fails; one with a program dropped into bin/ fails; one with game notes fails.
Used for: scripts/verify-decky-plugin-zip.sh (run by the release workflow after
    `decky plugin build`, and by scripts/build.sh release).
Solves: The check only looked for the code, so a zip with no NOTICE and no data/ folder passed
    and shipped (plan 74, lane 1, fix 4).
Does not: Run the Decky tool (Linux-only); skipped where bash or unzip is missing.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "verify-decky-plugin-zip.sh"

COMPLETE = {
    "main.py": "# plugin\n",
    "plugin.json": "{}\n",
    "package.json": "{}\n",
    "LICENSE": "Apache\n",
    "NOTICE": "notice\n",
    "README.md": "readme\n",
    "dist/index.js": "// bundle\n",
    "dist/THIRD-PARTY-LICENSES.txt": "licences\n",
    "data/settings-search-targets.json": "[]\n",
    "data/intent-packs/deck-basics.json": "{}\n",
    "bin/README.md": "note\n",
    "py_modules/backend/__init__.py": "",
    "py_modules/backend/services/__init__.py": "",
    "py_modules/backend/services/ollama_service.py": "",
    "py_modules/backend/services/settings_service.py": "",
}


def _bash() -> str | None:
    bash = shutil.which("bash")
    if not bash or "system32" in bash.lower():  # Windows' WSL launcher is not a POSIX shell here
        return None
    return bash


@unittest.skipIf(_bash() is None or shutil.which("unzip") is None, "needs bash and unzip")
class VerifyDeckyPluginZipTests(unittest.TestCase):
    def _run(self, files: dict[str, str]) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as tmp:
            zpath = Path(tmp) / "bonsAI.zip"
            with zipfile.ZipFile(zpath, "w") as zf:
                for rel, body in files.items():
                    zf.writestr(f"bonsAI/{rel}", body)
            return subprocess.run(
                [_bash(), str(SCRIPT), zpath.as_posix()],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=120,
            )

    def test_complete_zip_passes(self) -> None:
        proc = self._run(COMPLETE)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_each_required_file_is_required(self) -> None:
        for rel in (
            "LICENSE",
            "NOTICE",
            "dist/THIRD-PARTY-LICENSES.txt",
            "data/settings-search-targets.json",
            "data/intent-packs/deck-basics.json",
        ):
            with self.subTest(missing=rel):
                files = {k: v for k, v in COMPLETE.items() if k != rel}
                proc = self._run(files)
                self.assertNotEqual(proc.returncode, 0, proc.stdout)
                self.assertIn(rel, proc.stderr)

    def test_a_program_in_bin_is_refused(self) -> None:
        for rel in ("bin/whisper-cli", "bin/main", "bin/sub/thing.so"):
            with self.subTest(extra=rel):
                proc = self._run({**COMPLETE, rel: "\x7fELF"})
                self.assertNotEqual(proc.returncode, 0, proc.stdout)
                self.assertIn(rel, proc.stderr)

    def test_game_notes_are_refused(self) -> None:
        proc = self._run({**COMPLETE, "data/kb/strategy_seed.json": "{}\n"})
        self.assertNotEqual(proc.returncode, 0, proc.stdout)
        self.assertIn("strategy_seed.json", proc.stderr)


if __name__ == "__main__":
    unittest.main()
