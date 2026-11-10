"""Title: Deck knowledge-base read-back (parsing, and the wording it looks for)

Purpose: Test the part of scripts/deck_kb_readback.py that runs in Python: picking the newest "notes for this
    answer" line out of the plugin log, and the words the script looks for (the log line's middle, and the
    two footer lines). Also runs the page script's own node tests, so they are part of the Python suite.
Used for: scripts/deck_kb_readback.py, the one-call read-back a Deck driver runs for the knowledge-base rows.
Solves: A reworded log line or footer would make the read-back print "nothing found" on the Deck, which looks
    like a failed check. These tests fail on the PC first, naming the line that moved.
Does not: Touch the Deck or the real log folder: every case uses a pretend log folder made for the test.
"""

import importlib.util
import os
import shutil
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.knowledge import kb_not_in_notes_notice  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("deck_kb_readback", ROOT / "scripts" / "deck_kb_readback.py")
readback = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(readback)

_ATTACHED = {"kb_attached": True, "kb_sources": [{"title": "x"}]}
_NOTES = [{"name": "Exploder", "kind": "enemy", "domain": "strategy", "card": "y"}]


class LogLineTests(unittest.TestCase):
    def test_the_marker_is_in_the_line_the_back_end_writes(self):
        line = kb_not_in_notes_notice.kb_attach_log_line(
            _ATTACHED, _NOTES, not_in_notes_shown=False, no_close_match_shown=False
        )
        self.assertIn(readback.ATTACH_MARKER, line)

    def test_the_footer_words_the_page_script_looks_for_are_the_back_ends_words(self):
        self.assertTrue(kb_not_in_notes_notice._NO_CLOSE_MATCH_LINE.startswith("No close match in my notes"))
        self.assertTrue(kb_not_in_notes_notice._NOT_IN_NOTES_LINE.startswith("Not in my notes"))
        self.assertIn("No close match in my notes", readback.READBACK_JS)
        self.assertIn("Not in my notes", readback.READBACK_JS)

    def test_the_newest_attach_line_in_a_log_is_the_one_returned(self):
        old = "2026-11-09 10:00:01 INFO ask_ollama: notes for this answer: 1 note attached (A); no footer line added"
        new = "2026-11-09 10:05:09 INFO ask_ollama: notes for this answer: no notes attached; 'Not in my notes' line"
        text = f"{old}\nunrelated line\n{new}\nanother unrelated line\n"
        self.assertEqual(readback.last_attach_line(text), new)

    def test_a_log_with_no_attach_line_gives_nothing(self):
        self.assertIsNone(readback.last_attach_line("one line\nanother line\n"))

    def test_a_very_long_line_is_cut(self):
        line = "x " + readback.ATTACH_MARKER + " " + "n" * 5000
        self.assertLessEqual(len(readback.last_attach_line(line)), readback.LOG_LINE_MAX)


class LogFolderTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="bonsai-readback-")
        self.addCleanup(shutil.rmtree, self.dir, ignore_errors=True)

    def _write(self, name, text, age_seconds):
        path = os.path.join(self.dir, name)
        Path(path).write_text(text, encoding="utf-8")
        stamp = time.time() - age_seconds
        os.utime(path, (stamp, stamp))

    def test_the_newest_file_with_an_attach_line_wins(self):
        self._write("2026-11-08.log", f"a {readback.ATTACH_MARKER} from yesterday\n", 90000)
        self._write("2026-11-09.log", f"b {readback.ATTACH_MARKER} from today\n", 10)
        found = readback.newest_attach_line(self.dir)
        self.assertEqual(found["file"], "2026-11-09.log")
        self.assertIn("from today", found["line"])

    def test_a_newest_file_without_the_line_falls_back_to_the_one_before(self):
        self._write("2026-11-08.log", f"a {readback.ATTACH_MARKER} yesterday's\n", 90000)
        self._write("2026-11-09.log", "nothing about notes yet\n", 10)
        self.assertEqual(readback.newest_attach_line(self.dir)["file"], "2026-11-08.log")

    def test_an_empty_or_missing_folder_gives_nothing(self):
        self.assertIsNone(readback.newest_attach_line(self.dir))
        self.assertIsNone(readback.newest_attach_line(os.path.join(self.dir, "no-such-folder")))


class PageScriptNodeTests(unittest.TestCase):
    @unittest.skipIf(shutil.which("node") is None, "node is not installed")
    def test_deck_kb_readback_page_script_suite(self):
        if not (ROOT / "node_modules" / "jsdom").exists():
            self.skipTest("jsdom is not installed (run the install step first)")
        run = subprocess.run(
            ["node", "--test", "scripts/deck_kb_readback.test.mjs"],
            cwd=ROOT, capture_output=True, text=True, timeout=600,
        )
        self.assertEqual(run.returncode, 0, run.stdout[-3000:] + run.stderr[-1500:])


if __name__ == "__main__":
    unittest.main()
