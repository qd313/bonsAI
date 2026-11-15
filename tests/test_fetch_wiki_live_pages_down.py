"""Title: Live wiki page fetcher -- a wiki that is down is "failed", not "ok"

Purpose: Pin what the fetcher prints, writes and exits with when a wiki answers with an api
error body, an HTTP error, or a page far too short to be a page (plan 104, lane T4).
Used for: fetch_wiki_live_pages.py (api_get, main).
Solves: On 2026-11-14 Combine OverWiki's database was read-only; the fetcher printed
"[ok] ... 1 chars", exited 0 and "--search" printed an empty site line, which a note lane
could have taken for a page.
Does not: Hit the network. Every wiki answer here is canned.
"""

from __future__ import annotations

import io
import json
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from script_loader import load_script

fetcher = load_script("fetch_wiki_live_pages")

DB_READONLY = {"error": {"code": "internal_api_error_DBReadOnlyError", "info": "The database is read-only."}}
SITE = {"query": {"general": {"sitename": "Wiki", "server": "x", "generator": "MediaWiki"}, "rightsinfo": {"text": "CC BY-SA"}}}
REAL = "Bench\n" + "A place to rest and save your progress. " * 5


def _run(argv, responder):
    """Run main() with every api call answered by `responder(params)`; return (exit code, output, out dir files)."""
    buf = io.StringIO()
    with tempfile.TemporaryDirectory() as tmp:
        args = ["fetch", "--api", "https://wiki.test/api.php", "--out", tmp, "--pause", "0", *argv]
        with mock.patch("sys.argv", args), mock.patch.object(fetcher, "api_get", side_effect=lambda api, p, **k: responder(p)), \
                redirect_stdout(buf):
            code = fetcher.main()
        files = sorted(f.name for f in Path(tmp).iterdir())
        manifest = json.loads((Path(tmp) / "_manifest.json").read_text(encoding="utf-8")) if "_manifest.json" in files else {}
    return code, buf.getvalue(), files, manifest


def _answer(page_text_html: str, title="Bench"):
    def respond(p):
        if p.get("meta") == "siteinfo":
            return SITE
        if p.get("prop") == "revisions|info|categories":
            return {"query": {"pages": {"1": {"title": title, "fullurl": "u", "revisions": [{"revid": 5, "timestamp": "2026-01-01T00:00:00Z"}]}}}}
        return {"parse": {"revid": 5, "text": {"*": page_text_html}}}
    return respond


class ApiGetErrorBodyTests(unittest.TestCase):
    def _fake(self, payload):
        resp = mock.MagicMock()
        resp.read.return_value = json.dumps(payload).encode()
        resp.__enter__.return_value = resp
        return resp

    def test_error_body_raises_with_the_wikis_own_message(self):
        with mock.patch("urllib.request.urlopen", return_value=self._fake(DB_READONLY)):
            with self.assertRaises(fetcher.ApiError) as cm:
                fetcher.api_get("https://wiki.test/api.php", {"action": "query"})
        self.assertIn("DBReadOnlyError", str(cm.exception))
        self.assertIn("read-only", str(cm.exception))

    def test_http_500_with_error_body_raises_with_its_message(self):
        err = urllib.error.HTTPError("u", 500, "x", {}, io.BytesIO(json.dumps(DB_READONLY).encode()))
        with mock.patch("urllib.request.urlopen", side_effect=err), mock.patch("time.sleep"):
            with self.assertRaises(fetcher.ApiError) as cm:
                fetcher.api_get("https://wiki.test/api.php", {"action": "query"}, retries=1)
        self.assertIn("HTTP 500", str(cm.exception))
        self.assertIn("DBReadOnlyError", str(cm.exception))


class MainWhenTheWikiIsDownTests(unittest.TestCase):
    def test_one_character_page_is_failed_not_ok_and_not_written(self):
        code, out, files, manifest = _run(["--titles", "Headcrab"], _answer("<p>x</p>", "Headcrab"))
        self.assertIn("[failed]", out)
        self.assertNotIn("[ok]", out)
        self.assertEqual(files, ["_manifest.json"])
        self.assertIn("failed", manifest["pages"][0])
        self.assertEqual(code, 1)

    def test_error_body_while_rendering_is_failed_with_the_wikis_message(self):
        base = _answer("<p>x</p>")

        def respond(p):
            if p.get("action") == "parse":
                raise fetcher.ApiError("internal_api_error_DBReadOnlyError: The database is read-only.")
            return base(p)

        code, out, files, manifest = _run(["--titles", "Bench"], respond)
        self.assertIn("[failed] 'Bench': internal_api_error_DBReadOnlyError", out)
        self.assertEqual(files, ["_manifest.json"])
        self.assertIn("DBReadOnlyError", manifest["pages"][0]["failed"])
        self.assertEqual(code, 1)

    def test_one_failed_among_good_pages_keeps_exit_zero(self):
        good = _answer(f"<p>{REAL}</p>")

        def respond(p):
            if p.get("titles") == "Down":
                raise fetcher.ApiError("HTTP 500")
            return good(p)

        code, out, files, _m = _run(["--titles", "Bench|Down"], respond)
        self.assertEqual(code, 0)
        self.assertIn("[ok] 'Bench'", out)
        self.assertIn("[failed] 'Down'", out)
        self.assertIn("bench.txt", files)

    def test_a_short_but_real_page_is_still_saved(self):
        # The shortest real saved page was 138 characters ("Bench", Hollow Knight).
        code, out, files, _m = _run(["--titles", "Bench"], _answer("<p>" + "x" * 138 + "</p>"))
        self.assertEqual(code, 0)
        self.assertIn("bench.txt", files)

    def test_missing_page_stays_missing_with_exit_zero(self):
        def respond(p):
            if p.get("meta") == "siteinfo":
                return SITE
            return {"query": {"pages": {"-1": {"title": "Nope", "missing": ""}}}}

        code, out, _f, _m = _run(["--titles", "Nope"], respond)
        self.assertIn("[missing] Nope", out)
        self.assertEqual(code, 0)

    def test_search_prints_the_api_error_not_an_empty_line(self):
        def respond(p):
            if p.get("meta") == "siteinfo":
                raise fetcher.ApiError("internal_api_error_DBReadOnlyError: The database is read-only.")
            return {}

        code, out, _f, _m = _run(["--search", "headcrab"], respond)
        self.assertIn("[failed]", out)
        self.assertIn("DBReadOnlyError", out)
        self.assertNotIn("licence: (none declared)", out)
        self.assertNotEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
