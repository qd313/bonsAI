#!/usr/bin/env python3
"""
Title: Live wiki page fetcher (maintainer tool)
Purpose: Read named pages from a live MediaWiki site through its own API, as rendered text,
         together with the revision id, the revision date and the licence the site declares
         for itself, so a strategy card can cite exactly what was read and when.
Used for: Sourcing cards for data/kb/strategy_seed.json when the live wiki answers a plain
          request from the maintainer's machine. On 2026-09-05 every tranche source did,
          Fandom included; only the in-IDE fetcher is refused (HTTP 402). Companion to
          fetch_wiki_dump_pages.py, which does the same job from an archive.org dump.
Solves: A card that cites a wiki must carry source_url, source_license and crawled_at the
        day it is written (docs/knowledge-base.md, "Source attribution"). This writes all
        three next to the text so none of them is guessed later.
Does not: Run on device or at plugin build time. Nothing under py_modules/ imports it. It
          does not follow links, fetch images, or write anything into the seed.

    python scripts/fetch_wiki_live_pages.py --api https://combineoverwiki.net/api.php \
        --titles "Gonarch|Nihilanth" --out build/wiki-live/combineoverwiki

    python scripts/fetch_wiki_live_pages.py --api https://doomwiki.org/w/api.php --search "marauder"

Each page becomes <out>/<slug>.txt with a short provenance header, and <out>/_manifest.json
collects url / revid / revision date / licence for every page fetched. Pages that do not
exist are listed at the end and in the manifest as missing; the exit code stays 0 so a
batch with one bad title still yields the other pages.

Table header cells and Fandom portable-infobox labels come through marked "!! ", and their
data cells / values "|| " -- scripts/extract_wiki_notes.py reads those two markers to build a
labelled "Label: value" line without guessing which cell was which.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) bonsAI-kb-author/1.0 "
    "(https://github.com/qd313/bonsAI; strategy-card sourcing; polite, low volume)"
)

# Rendered-page furniture that is not article text. Matched against every class attribute.
_SKIP_CLASS = re.compile(
    r"navbox|\btoc\b|mw-editsection|noprint|\breference\b|mw-references|catlinks|printfooter|"
    r"mw-indicators|hatnote|\bthumb\b|gallery|cite_note|mw-jump|sidebar|metadata|ambox|"
    r"portable-infobox-hidden|global-navigation|page-header__actions|mw-parser-output-hidden"
)
# Not skipped on purpose: Fandom's "wds-tabber" boxes. Character pages (Fallout companions,
# GTA people) keep their whole body inside one, so skipping it returned an empty page
# on 2026-09-05; the tab labels come through as a short line of text, which is harmless.
_BLOCK_TAGS = {"p", "div", "section", "article", "aside", "br", "tr", "ul", "ol", "dl", "blockquote", "pre"}
_HEADING = re.compile(r"h([1-6])")

# scripts/extract_wiki_notes.py needs to tell a table's header cells from its data cells to
# build a labelled "Label: value" line, and needs the same for Fandom's div-based portable
# infobox (its facts are not a <table> at all -- see _INFOBOX_LABEL_CLASS below). Both kinds
# of label get the same "!! " marker and both kinds of value get "|| ", mirroring wikitext's
# own "!!" header / "||" data cell syntax so the marker means one thing everywhere in the text.
_INFOBOX_LABEL_CLASS = re.compile(r"\bpi-data-label\b")
_INFOBOX_VALUE_CLASS = re.compile(r"\bpi-data-value\b")


class _TextExtractor(HTMLParser):
    """Rendered HTML -> plain text that keeps headings, list bullets and table rows."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self._stack: list[bool] = []  # True when the element is skipped
        self._skip_depth = 0
        self._heading: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        cls = " ".join(v or "" for k, v in attrs if k == "class")
        # A <figure> (typeof="mw:File" / "mw:File/Thumb") is always image or video furniture,
        # never article prose -- but modern MediaWiki (1.41+) marks it with that `typeof`
        # attribute, not a "thumb" class, so _SKIP_CLASS's class-only check missed it. Two
        # real scraps this let through: an image's <figcaption> text ("Charm Notch icon") and
        # a <video>'s browsers-without-video-support fallback link, a bare file URL, both
        # glued into the middle of a real sentence on the Charms page.
        skip = (
            tag in ("script", "style", "noscript", "figure", "figcaption")
            or bool(_SKIP_CLASS.search(cls))
        )
        self._stack.append(skip)
        if skip:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        # Fandom's portable-infobox renders each fact's label as an <h3 class="pi-data-label">
        # -- real heading level 3, styled as one. Treating it as a heading filled the section
        # list with one fake entry per stat (Health, Damage, ...) ahead of the real "Strategy"
        # heading, so it is read as a label instead whenever this class is present.
        is_infobox_label = bool(_INFOBOX_LABEL_CLASS.search(cls))
        is_infobox_value = bool(_INFOBOX_VALUE_CLASS.search(cls))
        m = _HEADING.fullmatch(tag)
        if m and not is_infobox_label:
            self.out.append("\n\n" + "=" * int(m.group(1)) + " ")
            self._heading = tag
        elif is_infobox_label:
            self.out.append("\n!! ")
        elif is_infobox_value:
            self.out.append("\n|| ")
        elif tag == "li":
            self.out.append("\n- ")
        elif tag == "th":
            self.out.append(" !! ")
        elif tag == "td":
            self.out.append(" || ")
        elif tag in _BLOCK_TAGS:
            self.out.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if not self._stack:
            return
        skipped = self._stack.pop()
        if skipped:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if self._skip_depth:
            return
        if tag == self._heading:
            self.out.append("\n")
            self._heading = None
        elif tag in _BLOCK_TAGS:
            self.out.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        self.out.append(data)

    def text(self) -> str:
        raw = "".join(self.out)
        raw = re.sub(r"[ \t\xa0]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip() + "\n"


def api_get(api: str, params: dict[str, str], *, retries: int = 3) -> dict:
    params = dict(params, format="json")
    url = api + "?" + urllib.parse.urlencode(params)
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:  # noqa: PERF203
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise SystemExit(f"API request failed after {retries} tries: {url}\n  {last}")


def site_info(api: str) -> dict:
    data = api_get(api, {"action": "query", "meta": "siteinfo", "siprop": "general|rightsinfo"})
    general = data.get("query", {}).get("general", {})
    rights = data.get("query", {}).get("rightsinfo", {})
    return {
        "sitename": general.get("sitename", ""),
        "server": general.get("server", ""),
        "generator": general.get("generator", ""),
        "licence_text": (rights.get("text") or "").strip(),
        "licence_url": (rights.get("url") or "").strip(),
    }


def resolve_page(api: str, title: str) -> dict | None:
    """Canonical title, full URL, latest revision id, date and categories -- after redirects.

    Categories never appear in the rendered text render_page() produces -- MediaWiki puts
    them in the page footer's "catlinks" box, which _SKIP_CLASS already drops as furniture
    on purpose. scripts/extract_wiki_notes.py reads a page's own categories (boss, enemy,
    item, ...) to guess its section_type before falling back to guessing from body words, so
    they have to come from here instead.
    """
    data = api_get(
        api,
        {
            "action": "query",
            "prop": "revisions|info|categories",
            "titles": title,
            "rvprop": "ids|timestamp",
            "inprop": "url",
            "cllimit": "max",
            "clshow": "!hidden",
            "redirects": "1",
        },
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if "missing" in page or "invalid" in page:
            return None
        rev = (page.get("revisions") or [{}])[0]
        categories = [
            c.get("title", "").split(":", 1)[-1]
            for c in page.get("categories", [])
            if c.get("title")
        ]
        return {
            "title": page.get("title", title),
            "url": page.get("fullurl", ""),
            "revid": rev.get("revid"),
            "timestamp": rev.get("timestamp", ""),
            "categories": categories,
        }
    return None


def render_page(api: str, revid: int) -> str:
    data = api_get(
        api,
        {"action": "parse", "oldid": str(revid), "prop": "text", "disableeditsection": "1", "disablelimitreport": "1"},
    )
    html = data.get("parse", {}).get("text", {}).get("*", "")
    parser = _TextExtractor()
    parser.feed(html)
    return parser.text()


def slugify(title: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-").lower()
    return slug[:80] or "page"


def search(api: str, term: str, limit: int = 12) -> list[str]:
    data = api_get(api, {"action": "query", "list": "search", "srsearch": term, "srlimit": str(limit)})
    return [hit.get("title", "") for hit in data.get("query", {}).get("search", [])]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api", required=True, help="the wiki's api.php URL")
    parser.add_argument("--titles", default="", help="pipe-separated page titles (redirects are followed)")
    parser.add_argument("--search", default="", help="print the wiki's top matches for this term and exit")
    parser.add_argument("--out", default="build/wiki-live", help="output directory")
    parser.add_argument("--pause", type=float, default=0.8, help="seconds between page requests")
    args = parser.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

    info = site_info(args.api)
    print(f"[site] {info['sitename']} ({info['generator']}) licence: {info['licence_text'] or '(none declared)'} {info['licence_url']}")

    if args.search:
        for hit in search(args.api, args.search):
            print("  ", hit)
        return 0

    titles = [t.strip() for t in args.titles.split("|") if t.strip()]
    if not titles:
        parser.error("--titles or --search is required")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    today = _dt.date.today().isoformat()
    manifest_path = out / "_manifest.json"
    manifest: dict = {"site": info, "api": args.api, "pages": []}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["site"] = info
        except json.JSONDecodeError:
            pass
    already = {p.get("requested") for p in manifest.get("pages", [])}

    missing: list[str] = []
    for title in titles:
        page = resolve_page(args.api, title)
        if not page or not page.get("revid"):
            print(f"[missing] {title}")
            missing.append(title)
            manifest["pages"] = [p for p in manifest["pages"] if p.get("requested") != title]
            manifest["pages"].append({"requested": title, "missing": True, "read_on": today})
            continue
        text = render_page(args.api, int(page["revid"]))
        slug = slugify(page["title"])
        header = (
            f"# source: {page['url']}\n"
            f"# site: {info['sitename']}\n"
            f"# revision: {page['revid']} ({page['timestamp']})\n"
            f"# licence: {info['licence_text'] or '(none declared)'} {info['licence_url']}\n"
            f"# read: {today}\n\n"
        )
        (out / f"{slug}.txt").write_text(header + text, encoding="utf-8")
        entry = {
            "requested": title,
            "title": page["title"],
            "url": page["url"],
            "revid": page["revid"],
            "timestamp": page["timestamp"],
            "categories": page.get("categories", []),
            "licence_text": info["licence_text"],
            "licence_url": info["licence_url"],
            "read_on": today,
            "chars": len(text),
            "file": f"{slug}.txt",
        }
        manifest["pages"] = [p for p in manifest["pages"] if p.get("requested") != title]
        manifest["pages"].append(entry)
        flag = "" if title not in already else " (refreshed)"
        print(f"[ok] {page['title']!r} rev {page['revid']} {page['timestamp'][:10]} {len(text)} chars -> {slug}.txt{flag}")
        time.sleep(args.pause)

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if missing:
        print(f"[done] {len(titles) - len(missing)} fetched, {len(missing)} missing: {', '.join(missing)}")
    else:
        print(f"[done] {len(titles)} fetched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
