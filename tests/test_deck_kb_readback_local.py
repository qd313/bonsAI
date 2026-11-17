"""Title: Deck knowledge-base read-back, local mode for the stand-in (paths, page choice, what it prints)

Purpose: Test the local mode that scripts/deck_kb_readback.py gained for the Windows stand-in: the plugin log is
    found under a Decky folder you name (any capital letters), the right Quick Access page is picked when several
    never answer, the library is read from the path given, and the printed object says it came from this PC.
    The default (Deck) way of running it is checked to be unchanged: no "source" key, the first matching page only.
Used for: scripts/deck_kb_readback.py --local, run directly on this PC by the stand-in's driver (plan 105, lane T2).
Solves: Steam on Windows lists pages that never answer, and the Deck's way of picking the first Quick Access page
    would hang or read the wrong window there. These tests fail on the PC first.
Does not: Touch the real homebrew folder, the real plugin log or library, or any real debugging port: every path is
    a pretend folder made for the test, and the page list, the connection and the page read are stand-ins.
"""

import contextlib
import importlib.util
import io
import json
import os
import shutil
import socket
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("deck_kb_readback_local", ROOT / "scripts" / "deck_kb_readback.py")
rb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rb)

ATTACH = "INFO notes for this answer: 1 note attached (Exploder); they are the first"
PANEL = {"answerShown": True, "finished": True, "streaming": False, "turns": 2, "turnList": [{"question": "q"}]}


class FakeSock:
    def close(self):
        pass


class WithFolders(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="bonsai-readback-")
        self.addCleanup(shutil.rmtree, self.dir, ignore_errors=True)
        self.home = os.path.join(self.dir, "homebrew")
        self.logs = os.path.join(self.home, "logs", "bonsAI")
        os.makedirs(self.logs)
        Path(self.logs, "a.log").write_text("noise\n" + ATTACH + "\n", encoding="utf-8")
        self.corpus = os.path.join(self.dir, "corpus folder", "corpus.db")
        os.makedirs(os.path.dirname(self.corpus))
        con = sqlite3.connect(self.corpus)
        con.execute("CREATE TABLE sections (section_id INTEGER, section_type TEXT, name TEXT)")
        con.execute("INSERT INTO sections VALUES (7, 'boss', 'Exploder')")
        con.commit()
        con.close()

    def run_main(self, argv, **patches):
        out = io.StringIO()
        with mock.patch.object(sys, "argv", ["deck_kb_readback.py"] + argv), contextlib.redirect_stdout(out):
            for name, value in patches.items():
                patcher = mock.patch.object(rb, name, value)
                patcher.start()
                self.addCleanup(patcher.stop)
            with self.assertRaises(SystemExit) as stop:
                rb.main()
        return stop.exception.code, out.getvalue()


class LogFolderTests(WithFolders):
    def test_the_plugin_log_folder_is_found_under_the_decky_folder(self):
        self.assertEqual(rb.find_log_dir(self.home), (self.logs, True))

    def test_a_folder_in_other_capital_letters_is_found_too(self):
        other = os.path.join(self.dir, "other")
        os.makedirs(os.path.join(other, "logs", "bonsai"))
        path, found = rb.find_log_dir(other)
        self.assertTrue(found)
        self.assertEqual(os.path.basename(path).lower(), "bonsai")

    def test_no_log_folder_is_reported_not_found_and_names_the_place_looked(self):
        empty = os.path.join(self.dir, "empty")
        os.makedirs(empty)
        self.assertEqual(rb.find_log_dir(empty), (os.path.join(empty, "logs", "bonsAI"), False))
        self.assertEqual(rb.find_log_dir(os.path.join(self.dir, "missing"))[1], False)

    def test_the_newest_attach_line_is_read_from_that_folder(self):
        self.assertEqual(rb.newest_attach_line(self.logs)["line"], ATTACH)


class PagePickingTests(unittest.TestCase):
    PAGES = [
        {"title": "QuickAccess dead", "webSocketDebuggerUrl": "ws://127.0.0.1:1/devtools/page/dead"},
        {"title": "QuickAccess no panel", "webSocketDebuggerUrl": "ws://127.0.0.1:1/devtools/page/bare"},
        {"title": "QuickAccess_uid4", "webSocketDebuggerUrl": "ws://127.0.0.1:1/devtools/page/live"},
    ]

    def patched(self, pages, answers, waits=None):
        def ws_connect(url, wait=10):
            if waits is not None:
                waits.append(wait)
            if url.endswith("/dead"):
                raise socket.timeout("timed out")
            return FakeSock()

        def evaluate(sock, script):
            return answers[self.last_url]

        def connecting(url, wait=10):
            self.last_url = url.rsplit("/", 1)[1]
            return ws_connect(url, wait)

        stack = contextlib.ExitStack()
        stack.enter_context(mock.patch.object(rb, "matching_pages", lambda port=8080, word="QuickAccess", wait=10: pages))
        stack.enter_context(mock.patch.object(rb, "ws_connect", connecting))
        stack.enter_context(mock.patch.object(rb, "evaluate", evaluate))
        self.addCleanup(stack.close)

    def test_a_silent_page_is_skipped_and_the_first_page_with_the_panel_is_read(self):
        waits = []
        self.patched(self.PAGES, {"bare": {"error": "bonsAI panel is not open"}, "live": dict(PANEL)}, waits)
        result, title = rb.read_panel_local("script")
        self.assertEqual(result["turns"], 2)
        self.assertEqual(title, "QuickAccess_uid4")
        self.assertEqual(waits, [rb.LOCAL_PAGE_WAIT] * 3, "each page is given only a short wait")

    def test_a_page_that_answers_without_the_panel_is_used_only_when_none_has_it(self):
        self.patched(self.PAGES[:2], {"bare": {"error": "bonsAI panel is not open"}})
        result, title = rb.read_panel_local("script")
        self.assertEqual(result["error"], "bonsAI panel is not open")
        self.assertEqual(title, "QuickAccess no panel")

    def test_no_page_answering_is_one_plain_sentence_with_the_counts(self):
        self.patched(self.PAGES[:1], {})
        with self.assertRaisesRegex(SystemExit, r"1 page\(s\) matched but none answered within 4 s \(1 silent\)"):
            rb.read_panel_local("script")

    def test_no_matching_page_says_the_menu_may_be_closed(self):
        self.patched([], {})
        with self.assertRaisesRegex(SystemExit, "no Quick Access page"):
            rb.read_panel_local("script")

    def test_the_deck_way_still_takes_the_first_matching_page_and_nothing_else(self):
        seen = []
        with mock.patch.object(rb, "matching_pages", lambda port=8080, word="QuickAccess", wait=10: self.PAGES), \
                mock.patch.object(rb, "ws_connect", lambda url, wait=10: seen.append((url, wait)) or FakeSock()):
            rb.connect_qa()
        self.assertEqual(seen, [(self.PAGES[0]["webSocketDebuggerUrl"], 10)])


class MainTests(WithFolders):
    def local_argv(self, *extra):
        return ["--local", "--json", "--turns", "1", "--decky-home", self.home, "--corpus", self.corpus, *extra]

    def test_local_mode_reads_the_named_folders_and_says_where_it_read(self):
        calls = []

        def panel(script, port, word):
            calls.append((port, word))
            return dict(PANEL), "QuickAccess_uid4"

        code, out = self.run_main(self.local_argv("--port", "9999", "--page", "Big"), read_panel_local=panel)
        self.assertEqual(code, 0)
        self.assertEqual(calls, [(9999, "Big")])
        result = json.loads(out)
        self.assertEqual(result["source"], {"machine": "local", "platform": sys.platform, "logDir": self.logs, "logDirFound": True, "port": 9999, "page": "QuickAccess_uid4"})
        self.assertEqual(result["attachLine"]["line"], ATTACH)
        self.assertEqual(result["turnList"][0]["attached"], [{"name": "Exploder", "numbers": [7], "kinds": ["boss"]}])

    def test_the_decky_home_setting_is_used_when_no_folder_is_named(self):
        with mock.patch.dict(os.environ, {"DECKY_HOME": self.home}):
            code, out = self.run_main(["--local", "--json"], read_panel_local=lambda script, port, word: (dict(PANEL), "p"))
        self.assertEqual(json.loads(out)["source"]["logDir"], self.logs)

    def test_a_missing_log_folder_still_prints_and_says_it_was_not_found(self):
        empty = os.path.join(self.dir, "empty")
        os.makedirs(empty)
        code, out = self.run_main(["--local", "--json", "--decky-home", empty], read_panel_local=lambda script, port, word: (dict(PANEL), "p"))
        result = json.loads(out)
        self.assertFalse(result["source"]["logDirFound"])
        self.assertIsNone(result["attachLine"])

    def test_a_panel_that_is_not_open_exits_1_in_local_mode_too(self):
        code, out = self.run_main(["--local", "--json", "--decky-home", self.home], read_panel_local=lambda script, port, word: ({"error": "bonsAI panel is not open"}, "p"))
        self.assertEqual(code, 1)
        self.assertEqual(json.loads(out)["error"], "bonsAI panel is not open")

    def test_a_decky_folder_without_local_is_refused(self):
        with mock.patch.object(sys, "argv", ["x", "--decky-home", self.home]):
            with self.assertRaisesRegex(SystemExit, "only for --local"):
                rb.main()

    def test_the_deck_way_prints_no_source_key_and_reads_the_default_log_folder(self):
        seen = []
        code, out = self.run_main(
            ["--json"],
            connect_qa=lambda port, word: ("sock", seen.append((port, word)))[0],
            evaluate=lambda sock, script: dict(PANEL),
            newest_attach_line=lambda log_dir=rb.LOG_DIR: {"file": "x", "line": log_dir},
        )
        result = json.loads(out)
        self.assertNotIn("source", result)
        self.assertEqual(result["attachLine"]["line"], rb.LOG_DIR)
        self.assertEqual(seen, [(8080, "QuickAccess")])


if __name__ == "__main__":
    unittest.main()
