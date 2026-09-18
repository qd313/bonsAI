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
from unittest import mock

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


class FigureIsFurnitureTests(unittest.TestCase):
    """Real case from hollowknight.wiki's Charms page: a <figure typeof="mw:File/Thumb">
    (modern MediaWiki's own markup, not the older class="thumb" _SKIP_CLASS already caught)
    let an image caption and a video's fallback link leak into the middle of real sentences."""

    def test_image_caption_is_dropped(self):
        html = (
            '<h2>Notches</h2>'
            '<figure class="mw-halign-right" typeof="mw:File/Thumb">'
            '<a href="/w/File:Charm_Notch.png"><img src="Charm_Notch.png" /></a>'
            "<figcaption>Charm Notch icon</figcaption></figure>"
            "<p>To equip Charms, Charm Notches are required.</p>"
        )
        text = _render(html)
        self.assertNotIn("Charm Notch icon", text)
        self.assertIn("To equip Charms, Charm Notches are required.", text)

    def test_video_fallback_link_is_dropped(self):
        html = (
            "<h3>Overcharmed</h3>"
            '<figure class="mw-halign-right" typeof="mw:File">'
            '<video src="Overcharmed.webm">'
            '<a href="https://hollowknight.wiki/w/File:Overcharmed.webm">'
            "https://hollowknight.wiki/w/File:Overcharmed.webm</a>"
            "</video><figcaption></figcaption></figure>"
            "<p>If the Knight has free Notches, the Knight can equip more Charms than Notches allow.</p>"
        )
        text = _render(html)
        self.assertNotIn("Overcharmed.webm", text)
        self.assertIn("If the Knight has free Notches", text)


class ResolvePageCategoriesTests(unittest.TestCase):
    """scripts/extract_wiki_notes.py's guess_section_type prefers a page's own categories
    over a guess from body words -- categories never appear in the rendered text (MediaWiki
    puts them in the footer's "catlinks" box, which _SKIP_CLASS already drops), so
    resolve_page has to ask the API for them directly."""

    _CANNED_RESPONSE = {
        "query": {
            "pages": {
                "1": {
                    "title": "Army Dillo",
                    "fullurl": "https://www.mariowiki.com/Army_Dillo",
                    "revisions": [{"revid": 5409928, "timestamp": "2026-07-05T19:33:03Z"}],
                    "categories": [
                        {"title": "Category:Donkey Kong 64 bosses"},
                        {"title": "Category:Armored Kremlings"},
                    ],
                }
            }
        }
    }

    def test_category_prefix_is_stripped(self):
        with mock.patch.object(fetcher, "api_get", return_value=self._CANNED_RESPONSE):
            page = fetcher.resolve_page("https://www.mariowiki.com/api.php", "Army Dillo")
        self.assertEqual(page["categories"], ["Donkey Kong 64 bosses", "Armored Kremlings"])

    def test_a_page_with_no_categories_gets_an_empty_list(self):
        response = {
            "query": {"pages": {"1": {
                "title": "X", "fullurl": "https://example.com/X",
                "revisions": [{"revid": 1, "timestamp": "2026-01-01T00:00:00Z"}],
            }}}
        }
        with mock.patch.object(fetcher, "api_get", return_value=response):
            page = fetcher.resolve_page("https://example.com/api.php", "X")
        self.assertEqual(page["categories"], [])


if __name__ == "__main__":
    unittest.main()
