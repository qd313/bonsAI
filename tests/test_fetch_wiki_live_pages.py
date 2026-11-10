"""Title: Live wiki page fetcher -- table and infobox markers

Purpose: Pin the "!! label" / "|| value" markers _TextExtractor emits for table header/data
cells and for Fandom's div-based portable infobox, added for scripts/kb/extract_wiki_notes.py
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

import unittest
from pathlib import Path
from unittest import mock

from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_fetcher():
    return load_script("fetch_wiki_live_pages")


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
    """scripts/kb/extract_wiki_notes.py's guess_section_type prefers a page's own categories
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


class PlainPageFallbackTests(unittest.TestCase):
    """Palworld's own wiki refuses the page-render call (HTTP 403); the plain page still loads.

    Every network call here is stubbed -- no real request is made.
    """

    PLAIN_HTML = (
        "<html><head><title>Lamball - Palworld Wiki</title></head><body>"
        '<nav class="global-navigation">Sign in | Explore</nav>'
        '<div class="page-header__actions">Edit</div>'
        '<div class="mw-content-text"><div class="mw-parser-output">'
        "<p>Lamball is a Neutral Pal.</p><h2>Drops</h2><ul><li>Wool</li></ul>"
        "</div></div>"
        '<footer>Community content is available under CC BY-SA</footer>'
        "</body></html>"
    )

    def _refused(self, *_a, **_k):
        raise fetcher.ApiRefused("HTTP 403")

    def test_a_refused_render_call_falls_back_to_the_plain_page(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._refused), mock.patch.object(
            fetcher, "fetch_plain_html", return_value=self.PLAIN_HTML
        ) as plain:
            text = fetcher.render_page("https://x.example/api.php", 77, "https://x.example/wiki/Lamball")
        self.assertIn("Lamball is a Neutral Pal.", text)
        self.assertIn("Wool", text)
        self.assertNotIn("Sign in", text)
        self.assertNotIn("Community content", text)
        self.assertNotIn("Lamball - Palworld Wiki", text)
        # The same revision is asked for, not whatever is newest.
        self.assertIn("oldid=77", plain.call_args.args[0])

    def test_a_page_with_no_article_box_is_read_whole_rather_than_empty(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._refused), mock.patch.object(
            fetcher, "fetch_plain_html", return_value="<html><body><p>Only text.</p></body></html>"
        ):
            text = fetcher.render_page("https://x.example/api.php", 5, "https://x.example/wiki/Only")
        self.assertIn("Only text.", text)

    def test_a_working_render_call_is_still_the_first_choice(self):
        payload = {"parse": {"text": {"*": "<p>From the API.</p>"}}}
        with mock.patch.object(fetcher, "api_get", return_value=payload), mock.patch.object(
            fetcher, "fetch_plain_html"
        ) as plain:
            text = fetcher.render_page("https://x.example/api.php", 5, "https://x.example/wiki/Page")
        self.assertIn("From the API.", text)
        plain.assert_not_called()

    def test_a_refusal_with_no_page_address_is_not_swallowed(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._refused):
            with self.assertRaises(SystemExit):
                fetcher.render_page("https://x.example/api.php", 5)

    def test_if_the_plain_page_fails_too_the_run_stops_with_a_clear_message(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._refused), mock.patch.object(
            fetcher, "fetch_plain_html", side_effect=SystemExit("plain page failed")
        ):
            with self.assertRaises(SystemExit) as ctx:
                fetcher.render_page("https://x.example/api.php", 5, "https://x.example/wiki/Page")
        self.assertIn("plain page failed", str(ctx.exception))

    def test_a_403_is_not_retried_three_times(self):
        err = fetcher.urllib.error.HTTPError("https://x.example/api.php", 403, "Forbidden", {}, None)
        with mock.patch.object(fetcher.urllib.request, "urlopen", side_effect=err) as opened, mock.patch.object(
            fetcher.time, "sleep"
        ) as slept:
            with self.assertRaises(fetcher.ApiRefused):
                fetcher.api_get("https://x.example/api.php", {"action": "parse"})
        self.assertEqual(opened.call_count, 1)
        slept.assert_not_called()

    def test_other_http_errors_are_still_retried(self):
        err = fetcher.urllib.error.HTTPError("https://x.example/api.php", 503, "Busy", {}, None)
        with mock.patch.object(fetcher.urllib.request, "urlopen", side_effect=err) as opened, mock.patch.object(
            fetcher.time, "sleep"
        ):
            with self.assertRaises(SystemExit):
                fetcher.api_get("https://x.example/api.php", {"action": "parse"}, retries=3)
        self.assertEqual(opened.call_count, 3)


class ByTitleFallbackTests(unittest.TestCase):
    """Mario Wiki and the Smash wiki refuse a render by revision number (403) but answer one by title."""

    API = "https://x.example/api.php"

    def _api(self, by_title_revid=77):
        def fake(_api, params, **_k):
            if "oldid" in params:
                raise fetcher.ApiRefused("HTTP 403")
            assert params.get("page") == "Boo", params
            return {"parse": {"revid": by_title_revid, "text": {"*": "<p>Boo is a ghost.</p>"}}}
        return fake

    def test_a_refused_by_revision_call_is_asked_again_by_title(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._api()), mock.patch.object(
            fetcher, "fetch_plain_html"
        ) as plain:
            text = fetcher.render_page(self.API, 77, "https://x.example/wiki/Boo", "Boo")
        self.assertIn("Boo is a ghost.", text)
        plain.assert_not_called()

    def test_the_run_prints_one_plain_line_saying_it_asked_by_title(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._api()), mock.patch("builtins.print") as shown:
            fetcher.render_page(self.API, 77, "https://x.example/wiki/Boo", "Boo")
        lines = [str(c.args[0]) for c in shown.call_args_list if c.args]
        self.assertEqual(len([l for l in lines if l.startswith("[fallback]")]), 1)
        self.assertIn("by title", lines[0])

    def test_a_page_whose_revision_moved_is_refused(self):
        with mock.patch.object(fetcher, "api_get", side_effect=self._api(by_title_revid=78)):
            with self.assertRaises(fetcher.RevisionMoved):
                fetcher.render_page(self.API, 77, "https://x.example/wiki/Boo", "Boo")

    def test_a_moved_page_does_not_stop_the_rest_of_the_batch(self):
        pages = {"Boo": {"title": "Boo", "url": "u", "revid": 77, "timestamp": "2026-01-01T00:00:00Z", "categories": []}}
        info = {"sitename": "S", "generator": "g", "licence_text": "L", "licence_url": ""}
        out = Path(REPO_ROOT) / ".scratch" / "by-title-batch"
        argv = ["x", "--api", self.API, "--titles", "Boo", "--out", str(out), "--pause", "0"]
        with mock.patch.object(fetcher, "site_info", return_value=info), mock.patch.object(
            fetcher, "resolve_page", side_effect=lambda _a, t: pages[t]
        ), mock.patch.object(fetcher, "api_get", side_effect=self._api(by_title_revid=78)), mock.patch.object(
            fetcher.sys, "argv", argv
        ):
            self.assertEqual(fetcher.main(), 0)
        manifest = fetcher.json.loads((out / "_manifest.json").read_text(encoding="utf-8"))
        self.assertTrue(manifest["pages"][0].get("refused"))


class VoidTagsDoNotEatThePageTests(unittest.TestCase):
    """Fandom's infobox picture is <figure><a><img ...></a></figure>; <img> has no end tag.

    Cougar, Bison, Grizzly on the Red Dead wiki came back with 9 to 70 characters because the
    unclosed <img> threw the skip bookkeeping off by one, so the figure's skip lasted past
    </figure> and swallowed the rest of the page. Markup below is the wiki's, shortened.
    """

    HTML = (
        '<div class="mw-parser-output"><aside class="portable-infobox">'
        '<figure class="pi-item pi-image" data-source="image">'
        '<a href="/x.png" class="image image-thumbnail"><img src="/x.png" class="pi-image-thumbnail" alt="Puma">'
        "</a></figure>"
        '<div class="pi-item pi-data"><h3 class="pi-data-label">Loot</h3>'
        '<div class="pi-data-value">Cougar Fang <br> Cougar Claw</div></div></aside>'
        "<p><b>Cougars</b> are a species of animal.</p><h2>Description</h2><p>They hunt alone.</p></div>"
    )

    def test_text_after_a_picture_with_an_unclosed_img_is_kept(self):
        text = _render(self.HTML)
        self.assertIn("Cougars are a species of animal.", text)
        self.assertIn("They hunt alone.", text)
        self.assertIn("!! Loot", text)

    def test_a_break_inside_a_value_still_starts_a_new_line(self):
        text = _render(self.HTML)
        self.assertIn("Cougar Fang\nCougar Claw", text)

    def test_a_self_closed_break_behaves_the_same(self):
        self.assertIn("one\ntwo",_render("<p>one<br/>two</p>"))


if __name__ == "__main__":
    unittest.main()
