"""Title: WikiTeam dump page extractor -- server and article path

Purpose: Pin that snapshot_licence() and licence_from_archive() also carry the wiki's own
"server" and "articlepath" out of its siteinfo, added so scripts/extract_wiki_notes.py can
rebuild a dump page's real URL instead of guessing "/wiki/Title".
Used for: fetch_wiki_dump_pages.py.
Solves: A real run against the strategywiki.org archive.org dump built the URL
"https://strategywiki.org/w/api.php/wiki/Mega_Man_2/Air_Man" -- not a real page -- because
the only address recorded was the dump's api.php address, which is not the wiki's article
root. The wiki's own siteinfo already says how to build the URL correctly; this makes the
fetcher record it instead of the reader having to guess.
Does not: Hit the network. _get_json is monkeypatched with a canned payload.
"""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent


def _load_fetcher():
    path = REPO_ROOT / "scripts" / "fetch_wiki_dump_pages.py"
    spec = importlib.util.spec_from_file_location("fetch_wiki_dump_pages", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


fetcher = _load_fetcher()

_CANNED_SITEINFO = {
    "query": {
        "general": {
            "sitename": "StrategyWiki",
            "generator": "MediaWiki 1.41.4",
            "server": "//strategywiki.org",
            "articlepath": "/wiki/$1",
        },
        "rightsinfo": {"url": "https://creativecommons.org/licenses/by-sa/4.0/", "text": "Attribution-ShareAlike 4.0"},
    }
}


class SnapshotLicenceTests(unittest.TestCase):
    def test_server_and_articlepath_are_carried_through(self):
        files = [{"name": "strategywiki.org_w-20250828-dumpMeta/siteinfo.json"}]
        with mock.patch.object(fetcher, "_get_json", return_value=_CANNED_SITEINFO):
            info = fetcher.snapshot_licence("wiki-strategywiki.org_w-20250828", files)
        self.assertEqual(info["server"], "//strategywiki.org")
        self.assertEqual(info["articlepath"], "/wiki/$1")
        self.assertEqual(info["rightsinfo"]["url"], "https://creativecommons.org/licenses/by-sa/4.0/")

    def test_no_siteinfo_file_returns_empty(self):
        self.assertEqual(fetcher.snapshot_licence("some-item", [{"name": "other-file.xml"}]), {})


if __name__ == "__main__":
    unittest.main()
