"""Title: Live wiki page fetcher -- table and infobox markers

Purpose: Pin the "!! label" / "|| value" markers _TextExtractor emits for table header/data
cells and for Fandom's div-based portable infobox, added for scripts/extract_wiki_notes.py
to read (plan 58 phase 1, "Lane B, in words": "Info boxes and tab boxes are read, not
skipped... A table row becomes one labelled line").
Used for: fetch_wiki_live_pages.py's _TextExtractor.
Solves: Before this, <th> and <td> both rendered as the same " | " marker, so a reader could
not tell a table's header cells from its data cells to build "Label: value" -- and Fandom's
portable infobox is not a <table> at all (it's <h3 class="pi-data-label">, a real heading
level, which polluted section-heading detection with one fake heading per stat).
Does not: Hit the network. Feeds static HTML straight to the parser, offline.
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_fetcher():
    path = REPO_ROOT / "scripts" / "fetch_wiki_live_pages.py"
    spec = importlib.util.spec_from_file_location("fetch_wiki_live_pages", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


fetcher = _load_fetcher()


def _render(html: str) -> str:
    parser = fetcher._TextExtractor()
    parser.feed(html)
    return parser.text()


class TableMarkerTests(unittest.TestCase):
    def test_header_cell_marked_bang_bang(self):
        text = _render("<table><tr><th>Attack</th><th>Damage</th></tr></table>")
        self.assertIn("!! Attack", text)
        self.assertIn("!! Damage", text)

    def test_data_cell_marked_pipe_pipe(self):
        text = _render("<table><tr><td>Jab</td><td>3%</td></tr></table>")
        self.assertIn("|| Jab", text)
        self.assertIn("|| 3%", text)

    def test_header_and_data_use_different_markers(self):
        text = _render("<table><tr><th>Attack</th></tr><tr><td>Jab</td></tr></table>")
        self.assertNotEqual(
            text.count("!!"), 0,
            "header cell should carry the '!!' marker so a reader can tell it from data",
        )
        # A td must never render as "!!" -- that would make a reader treat a value as a label.
        self.assertNotIn("!! Jab", text)


class InfoboxMarkerTests(unittest.TestCase):
    def test_pi_data_label_is_marked_not_treated_as_a_heading(self):
        html = (
            '<aside class="portable-infobox">'
            '<div class="pi-item pi-data">'
            '<h3 class="pi-data-label">Health</h3>'
            '<div class="pi-data-value">800</div>'
            "</div></aside>"
        )
        text = _render(html)
        self.assertIn("!! Health", text)
        self.assertIn("|| 800", text)
        # Before this fix an <h3> always opened a level-3 heading marker ("=== "), which
        # would have shown up here and confused section selection with a fake heading.
        self.assertNotIn("=== Health", text)

    def test_a_genuine_h3_heading_elsewhere_still_works(self):
        text = _render("<h3>Phase two</h3><p>Do the thing.</p>")
        self.assertIn("=== Phase two", text)


if __name__ == "__main__":
    unittest.main()
