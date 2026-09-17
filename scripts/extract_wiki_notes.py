#!/usr/bin/env python3
"""
Title: Wiki note reader (maintainer tool)
Purpose: Turn one fetched wiki page into note-shaped records by cutting the page's own
         tactics/use section to length, with no word changed and no sentence added. This is
         the D111 "trim only" rule (docs/planning/58-phase-1-notes-shown-and-wiki-extracts.md
         Section 8, item 2): an AI may never write a sentence into a wiki note. It may only cut.
Used for: Reading a sample page per wiki for the maintainer before any note enters
          data/kb/strategy_seed.json (that file is never written by this script -- it prints).
Solves: Every wiki note shipped before this phase was an AI's own rewrite of a page, which is
        slow (about a day per game) and adds AI-invented wording between the wiki and the
        player. This script keeps the wiki's sentences and drops everything else: templates,
        references, citation markers, edit links, image captions and furniture headings.
Does not: Fetch pages (see fetch_wiki_live_pages.py / fetch_wiki_dump_pages.py, which this
          script reads the output of), pick which pages or games matter, write into the seed,
          or run at plugin build/runtime. Nothing under py_modules/ imports it.

    python scripts/extract_wiki_notes.py --page build/wiki-live/hollowknightwiki/hornet.txt \\
        --game-id 12

    python scripts/extract_wiki_notes.py --page build/dumps/some-dump/Some_Page.wikitext \\
        --game-id 12 --section-type boss

Prints one JSON note record (the nine strategy_seed.json fields) and one sidecar record
(revision id, the heading it read from, the character count) to stdout. Pass --out to also
write both to a scratch JSON file -- still never data/kb/strategy_seed.json.

The verbatim guarantee: every sentence the note keeps, and every label/value pair a table row
or infobox fact becomes, must appear (after whitespace-only normalising) in the page text this
script read. `verify_verbatim` is the reusable check; a failure refuses to print a note and
says which fragment was not found on the page, rather than shipping a maybe-rewritten note.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import importlib.util
import json
import re
import sys
import urllib.parse
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------------------
# The nine fields a strategy_seed.json row carries (data/kb/strategy_seed.json). section_id
# is left null here -- Appendix A says that field is for the caller (whoever merges this
# note into the seed) to assign, since only they know the next free id.
# ---------------------------------------------------------------------------------------
NOTE_FIELDS = (
    "section_id",
    "game_id",
    "section_type",
    "name",
    "card",
    "source_url",
    "source_license",
    "source_version",
    "crawled_at",
)

# Headings that hold tactics or use, in the order the reader prefers them (plan 58 phase 1,
# Section 5 "Lane B, in words"). Matched case-insensitively, exact first then substring, so
# "Tips and tricks" or "Combat strategy" still hit without over-matching unrelated headings.
SECTION_HEADING_PRIORITY = [
    "strategy",
    "strategies",
    "tactics",
    "tips",
    "behavior",
    "behaviour",
    "combat",
    "weaknesses",
    "usage",
    "how to",
    "walkthrough",
]
# Only used when nothing above appears. It is usually the page's lead description rather than
# tactics, so a note built from it is weaker -- the reason is printed for a person to check.
FALLBACK_SECTION_HEADING = "overview"

# Guessing section_type (boss/enemy/area/item/mechanic/quest/dungeon -- the values already in
# strategy_seed.json) from the page's own words. Always printed for a person to check; never
# trusted silently. Checked in this order because "boss" pages often also say "enemy" in body
# text describing other foes on the same page.
_SECTION_TYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("boss", ("boss",)),
    ("enemy", ("enemy", "enemies", "creature", "monster")),
    ("area", ("area", "location", "level", "region", "stage")),
    ("item", ("item", "weapon", "vehicle", "equipment")),
    ("quest", ("quest", "mission")),
]
DEFAULT_SECTION_TYPE = "mechanic"

# Guessing section_type from the page's OWN category assignments (a live page's MediaWiki
# categories, or a dump page's [[Category:...]] lines) -- tried before the body-word guess
# above, since the page's own classification beats a guess from prose. There is no
# "character" bucket in the five existing section_type values, so a character category maps
# to "mechanic" for now (the same default the body-word guess already falls back to).
_CATEGORY_TYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("boss", ("boss",)),
    ("enemy", ("enemy", "enemies")),
    ("item", ("item", "weapon", "vehicle")),
    ("area", ("level", "area", "stage", "track", "board", "course")),
    ("mechanic", ("character",)),
]


def _load_allowed_licences() -> frozenset[str]:
    """Read the publish gate's own allow-list rather than copy it (rule 8's spirit: one
    place decides). publish_corpus.py imports py_modules/backend/services at module load,
    so that folder has to be on sys.path first, same as publish_corpus.py does for itself."""
    py_modules = REPO_ROOT / "py_modules"
    if str(py_modules) not in sys.path:
        sys.path.insert(0, str(py_modules))
    path = REPO_ROOT / "scripts" / "publish_corpus.py"
    spec = importlib.util.spec_from_file_location("publish_corpus_for_wiki_reader", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.ALLOWED_SOURCE_LICENSES


# licence_url substrings -> the canonical source_license string the seed uses. Checked before
# the text patterns because a site's rightsinfo URL is the more reliable of the two.
_LICENCE_URL_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"by-sa/4\.0"), "CC-BY-SA-4.0"),
    (re.compile(r"by-sa/3\.0"), "CC-BY-SA-3.0"),
    (re.compile(r"/by/4\.0"), "CC-BY-4.0"),
]
_LICENCE_TEXT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"attribution[\s-]*share\s*alike\s*4\.0", re.I), "CC-BY-SA-4.0"),
    (re.compile(r"\bby-sa\s*4\.0", re.I), "CC-BY-SA-4.0"),
    (re.compile(r"attribution[\s-]*share\s*alike\s*3\.0", re.I), "CC-BY-SA-3.0"),
    (re.compile(r"\bby-sa\s*3\.0", re.I), "CC-BY-SA-3.0"),
    (re.compile(r"^attribution\s*4\.0", re.I), "CC-BY-4.0"),
]


def canonical_licence(licence_text: str, licence_url: str) -> str | None:
    """Map what a wiki declares about itself to the seed's own licence spelling.

    Returns None when nothing recognisable was declared -- the caller refuses rather than
    guessing, since silence has always meant "all rights reserved" in this project (plan 58
    phase 1, Section 2, on strategywiki.org before its footer was read by hand).
    """
    for pattern, canon in _LICENCE_URL_PATTERNS:
        if pattern.search(licence_url or ""):
            return canon
    for pattern, canon in _LICENCE_TEXT_PATTERNS:
        if pattern.search(licence_text or ""):
            return canon
    return None


# ---------------------------------------------------------------------------------------
# Reading the fetcher's own output back in.
# ---------------------------------------------------------------------------------------

_LIVE_HEADER_LINE_RE = re.compile(r"^#\s*(\w+):\s*(.*)$")


def _read_live_manifest_entry(page_path: Path) -> dict | None:
    manifest_path = page_path.parent / "_manifest.json"
    if not manifest_path.exists():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    for entry in manifest.get("pages", []):
        if entry.get("file") == page_path.name:
            merged = dict(entry)
            merged["licence_url"] = merged.get("licence_url") or manifest.get("site", {}).get("licence_url", "")
            merged["licence_text"] = merged.get("licence_text") or manifest.get("site", {}).get("licence_text", "")
            return merged
    return None


def _parse_live_header(raw: str) -> tuple[dict[str, str], str]:
    """Fallback for when _manifest.json is missing: read the five "# field: value" lines
    fetch_wiki_live_pages.py writes at the top of every <slug>.txt."""
    lines = raw.splitlines()
    meta: dict[str, str] = {}
    body_start = 0
    for i, line in enumerate(lines):
        if not line.strip():
            body_start = i + 1
            continue
        m = _LIVE_HEADER_LINE_RE.match(line)
        if not m:
            body_start = i
            break
        meta[m.group(1)] = m.group(2).strip()
        body_start = i + 1
    body = "\n".join(lines[body_start:])
    return meta, body


def load_live_page(page_path: Path) -> tuple[dict, str]:
    """Returns (metadata, body_text). metadata carries url/title/licence_text/licence_url/
    revid/timestamp/read_on, from _manifest.json when present, else parsed from the header."""
    raw = page_path.read_text(encoding="utf-8")
    entry = _read_live_manifest_entry(page_path)
    if entry:
        header_meta, body = _parse_live_header(raw)
        meta = {
            "title": entry.get("title") or header_meta.get("source", ""),
            "url": entry.get("url", ""),
            "revid": entry.get("revid"),
            "timestamp": entry.get("timestamp", ""),
            "categories": entry.get("categories") or [],
            "licence_text": entry.get("licence_text", ""),
            "licence_url": entry.get("licence_url", ""),
            "crawled_at": entry.get("read_on", ""),
        }
        return meta, body
    print(f"[warn] no _manifest.json next to {page_path.name}; reading its own header only "
          "(title will be guessed from the filename)", file=sys.stderr)
    header_meta, body = _parse_live_header(raw)
    licence_match = re.match(r"^(.*?)\s*(https?://\S+)?$", header_meta.get("licence", ""))
    revid_match = re.match(r"(\d+)", header_meta.get("revision", ""))
    meta = {
        "title": page_path.stem.replace("-", " ").title(),
        "url": header_meta.get("source", ""),
        "revid": revid_match.group(1) if revid_match else None,
        "timestamp": header_meta.get("revision", ""),
        "licence_text": licence_match.group(1).strip() if licence_match else "",
        "licence_url": (licence_match.group(2) or "") if licence_match else "",
        "crawled_at": header_meta.get("read", ""),
    }
    return meta, body


def _rebuild_page_url(manifest: dict, siteinfo: dict, title: str) -> str:
    """A dump has no fullurl the way the live API hands one back, so this rebuilds it from
    the wiki's own declared article path (fetch_wiki_dump_pages.py now records server and
    articlepath from the snapshot's siteinfo). Guessing "/wiki/Title" off the dump's api.php
    address is wrong often enough to matter: hollowknight.wiki's own articlepath is "/w/$1",
    not "/wiki/$1", and strategywiki.org's api.php lives under "/w/api.php", not its root."""
    # MediaWiki leaves "(" ")" and "/" unescaped in its own article URLs (real example:
    # https://hollowknight.wiki/w/Hornet_(Hollow_Knight)) -- quoting them would build a
    # URL nobody's server actually serves.
    quoted_title = urllib.parse.quote(title.replace(" ", "_"), safe="()/")
    server = str(siteinfo.get("server") or "")
    articlepath = str(siteinfo.get("articlepath") or "")
    if server and articlepath:
        if server.startswith("//"):
            server = "https:" + server
        elif not server.startswith("http"):
            server = "https://" + server
        return server.rstrip("/") + articlepath.replace("$1", quoted_title)
    # Older manifest with no server/articlepath recorded -- fall back to stripping a
    # trailing api.php script path and guessing the common "/wiki/$1" convention.
    original_url = re.sub(r"/(w/)?api\.php$", "", (manifest.get("original_url") or "")).rstrip("/")
    if not original_url:
        return ""
    print("[warn] this dump's manifest has no recorded articlepath; guessed '/wiki/$1' -- "
          "confirm the resulting source_url resolves", file=sys.stderr)
    return f"{original_url}/wiki/{quoted_title}"


def load_dump_page(page_path: Path) -> tuple[dict, str]:
    """Reads a .wikitext page written by fetch_wiki_dump_pages.py, plus its sibling
    manifest.json for the licence, revision and the snapshot's own capture date."""
    raw = page_path.read_text(encoding="utf-8")
    manifest_path = page_path.parent / "manifest.json"
    manifest: dict = {}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    entry = next((p for p in manifest.get("pages", []) if p.get("file") == page_path.name), {})
    siteinfo = manifest.get("siteinfo") or {}
    rights = siteinfo.get("rightsinfo") or {}
    title = entry.get("title") or page_path.stem.replace("_", " ")
    url = _rebuild_page_url(manifest, siteinfo, title)
    # A dump is a snapshot from a past date, not read today -- crawled_at has to be that
    # date or every rebuild would relabel old wiki text as read today (docs/knowledge-base.md,
    # "Source attribution"). publicdate is the archive.org item's own capture date.
    crawled_at = str(manifest.get("publicdate", ""))[:10]
    if not crawled_at:
        crawled_at = _dt.date.today().isoformat()
        print(f"[warn] {page_path.name}: dump manifest has no publicdate; using today "
              "for crawled_at -- check this against the archive.org item by hand", file=sys.stderr)
    meta = {
        "title": title,
        "url": url,
        "revid": entry.get("revision_id"),
        "timestamp": entry.get("timestamp", ""),
        "categories": extract_wikitext_categories(raw),
        "licence_text": rights.get("text", ""),
        "licence_url": rights.get("url", "") or manifest.get("item_licenseurl", ""),
        "crawled_at": crawled_at,
    }
    body = wikitext_to_plain(raw)
    return meta, body


# ---------------------------------------------------------------------------------------
# Wikitext -> the same plain-text shape fetch_wiki_live_pages.py already produces, so one
# section parser and one table/label parser work for both fetchers.
# ---------------------------------------------------------------------------------------

_REF_RE = re.compile(r"<ref\b[^>]*/\s*>|<ref\b[^>]*>.*?</ref>", re.I | re.S)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_BOLD_ITALIC_RE = re.compile(r"'{2,5}")
_EXTERNAL_LINK_LABELLED_RE = re.compile(r"\[https?://\S+\s+([^\]]+)\]")
_EXTERNAL_LINK_BARE_RE = re.compile(r"\[https?://\S+\]")
_PIPED_LINK_RE = re.compile(r"\[\[([^\]|]*)\|([^\]]*)\]\]")
_PLAIN_LINK_RE = re.compile(r"\[\[([^\]]*)\]\]")
_CATEGORY_LINK_RE = re.compile(r"\[\[\s*category\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]", re.I)


def extract_wikitext_categories(raw: str) -> list[str]:
    """[[Category:Bosses]] lines, read straight off the raw wikitext (before any stripping)
    so guess_section_type can prefer the page's own classification over a guess from body
    words -- the same job fetch_wiki_live_pages.py's categories query does for a live page."""
    return [m.group(1).strip() for m in _CATEGORY_LINK_RE.finditer(raw)]


def _strip_balanced(text: str, open_marker: str, close_marker: str, *, max_passes: int = 8) -> str:
    """Removes {{templates}} and other balanced markers, innermost first, so a template that
    contains another template does not leave the outer braces behind."""
    pattern = re.compile(re.escape(open_marker) + r"[^" + re.escape(open_marker) + re.escape(close_marker) + r"]*" + re.escape(close_marker))
    for _ in range(max_passes):
        new_text = pattern.sub("", text)
        if new_text == text:
            return new_text
        text = new_text
    return text


def _drop_file_links(text: str) -> str:
    """[[File:...]] / [[Image:...]] carry captions, not article prose (image captions are
    explicitly out of scope -- Section 5). Bracket-depth aware so a caption that itself has
    a [[wikilink]] in it does not truncate the removal early."""
    out = []
    i = 0
    lower = text.lower()
    while i < len(text):
        if lower.startswith("[[file:", i) or lower.startswith("[[image:", i):
            depth = 0
            j = i
            while j < len(text):
                if text[j : j + 2] == "[[":
                    depth += 1
                    j += 2
                    continue
                if text[j : j + 2] == "]]":
                    depth -= 1
                    j += 2
                    if depth == 0:
                        break
                    continue
                j += 1
            i = j
            continue
        out.append(text[i])
        i += 1
    return "".join(out)


def _strip_cell_attrs(cell: str) -> str:
    """A wikitext cell can carry attributes before its text (``align="center"|value``).
    Only strip on a plain "|" with no piped wikilink, so ``[[Page|label]]`` is untouched."""
    if "|" in cell and not cell.strip().startswith("[["):
        return cell.split("|")[-1]
    return cell


def _convert_wikitext_tables(text: str) -> str:
    """{| ... |} -> the same "!! label" / "|| value" marker lines the live fetcher emits,
    all of one row's cells joined onto one line (a real <tr>'s cells land on one line there
    too -- see fetch_wiki_live_pages.py), so extract_headings/body_to_units need only one
    table reader for both fetchers."""
    lines = text.splitlines()
    out: list[str] = []
    in_table = 0
    row_cells: list[tuple[str, str]] = []

    def flush_row() -> None:
        nonlocal row_cells
        if row_cells:
            out.append(" ".join(f"{marker} {cell} " for marker, cell in row_cells))
        row_cells = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("{|"):
            in_table += 1
            flush_row()
            continue
        if stripped.startswith("|}"):
            flush_row()
            in_table = max(0, in_table - 1)
            continue
        if not in_table:
            out.append(line)
            continue
        if stripped.startswith("|-"):
            flush_row()
            continue
        if stripped.startswith("!"):
            for cell in re.split(r"!!|\n!", stripped.lstrip("!")):
                cell = _strip_cell_attrs(cell).strip()
                if cell:
                    row_cells.append(("!!", cell))
            continue
        if stripped.startswith("|") and not stripped.startswith("|}"):
            for cell in re.split(r"\|\|", stripped.lstrip("|")):
                cell = _strip_cell_attrs(cell).strip()
                if cell:
                    row_cells.append(("||", cell))
            continue
        # Cell content continued on its own line (no leading |/!) -- keep it with the
        # most recent cell rather than losing it.
        if row_cells and stripped:
            marker, cell = row_cells[-1]
            row_cells[-1] = (marker, f"{cell} {stripped}")
    flush_row()
    return "\n".join(out)


def wikitext_to_plain(raw: str) -> str:
    """Minimal wikitext -> plain text: strip refs/comments/templates/HTML, resolve links,
    drop image captions, turn tables into the shared !!/|| marker lines and lists into "- "
    lines. Headings ("== Heading ==") are left as-is; extract_headings() reads both the
    native trailing-marker form here and the live fetcher's own leading-only form."""
    text = _COMMENT_RE.sub("", raw)
    text = _REF_RE.sub("", text)
    text = _drop_file_links(text)
    text = _CATEGORY_LINK_RE.sub("", text)
    text = _strip_balanced(text, "{{", "}}")
    text = _convert_wikitext_tables(text)
    text = _EXTERNAL_LINK_LABELLED_RE.sub(lambda m: m.group(1), text)
    text = _EXTERNAL_LINK_BARE_RE.sub("", text)
    text = _PIPED_LINK_RE.sub(lambda m: m.group(2), text)
    text = _PLAIN_LINK_RE.sub(lambda m: m.group(1), text)
    text = _BOLD_ITALIC_RE.sub("", text)
    text = _HTML_TAG_RE.sub("", text)

    out_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        m = re.match(r"^([*#:]+)\s*(.*)$", stripped)
        if m and stripped and not stripped.startswith(("!!", "||")):
            out_lines.append(f"- {m.group(2)}")
        else:
            out_lines.append(stripped)
    text = "\n".join(out_lines)
    text = re.sub(r"[ \t\xa0]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


# ---------------------------------------------------------------------------------------
# Section finding.
# ---------------------------------------------------------------------------------------

# Matches both heading shapes: wikitext's symmetric "== Title ==" and the live fetcher's
# leading-only "== Title" (see fetch_wiki_live_pages.py's _TextExtractor.text()).
_HEADING_RE = re.compile(r"(?m)^(={1,6})[ \t]*(.*?)[ \t]*(?:\1)?[ \t]*$")


@dataclass
class Heading:
    level: int
    title: str
    line_start: int
    body_start: int
    body_end: int = 0


def extract_headings(text: str) -> list[Heading]:
    raw: list[Heading] = []
    for m in _HEADING_RE.finditer(text):
        title = m.group(2).strip()
        if not title:
            continue
        raw.append(Heading(level=len(m.group(1)), title=title, line_start=m.start(), body_start=m.end()))
    for i, h in enumerate(raw):
        end = len(text)
        for later in raw[i + 1 :]:
            if later.level <= h.level:
                end = later.line_start
                break
        h.body_end = end
    return raw


@dataclass
class SectionChoice:
    heading: Heading | None
    body: str
    reason: str


def select_section(headings: list[Heading], text: str) -> SectionChoice:
    """A heading whose body is blank is skipped in favour of the next candidate -- some GTA
    Wiki mission pages carry a "Walkthrough" heading with nothing written under it (the real
    mission description sits under a different heading, "Mission", not on our list), and an
    empty note would be worse than a lower-priority one that actually has words in it."""

    def nonempty(h: Heading) -> bool:
        return bool(text[h.body_start : h.body_end].strip())

    for keyword in SECTION_HEADING_PRIORITY:
        for h in headings:
            if h.title.strip().lower() == keyword and nonempty(h):
                return SectionChoice(h, text[h.body_start : h.body_end], f"heading matches {h.title!r} exactly")
    for keyword in SECTION_HEADING_PRIORITY:
        for h in headings:
            if keyword in h.title.strip().lower() and nonempty(h):
                return SectionChoice(h, text[h.body_start : h.body_end], f"heading {h.title!r} contains {keyword!r}")
    for h in headings:
        if h.title.strip().lower() == FALLBACK_SECTION_HEADING and nonempty(h):
            return SectionChoice(h, text[h.body_start : h.body_end], f"no tactics/use heading; used the {h.title!r} fallback")
    for h in headings:
        if nonempty(h):
            return SectionChoice(
                h, text[h.body_start : h.body_end],
                f"no tactics/use/overview heading found; used the first non-empty section, {h.title!r} -- check this by hand",
            )
    if headings:
        h = headings[0]
        return SectionChoice(
            h, text[h.body_start : h.body_end],
            f"every section on the page is empty; used {h.title!r} anyway -- check this by hand",
        )
    return SectionChoice(None, text, "the page has no headings at all; used the whole page text -- check this by hand")


def guess_section_type(
    page_title: str, headings: list[Heading], categories: list[str] | None = None
) -> str:
    """The page's own categories win first -- a boss category beats a guess from body words
    every time it's available. categories is None/empty for a wiki this reader hasn't been
    taught to read categories from yet; the body-word guess below still runs for those."""
    for category in categories or []:
        category_lower = category.strip().lower()
        for section_type, keywords in _CATEGORY_TYPE_KEYWORDS:
            if any(keyword in category_lower for keyword in keywords):
                return section_type
    haystack = " ".join([page_title] + [h.title for h in headings]).lower()
    for section_type, keywords in _SECTION_TYPE_KEYWORDS:
        if any(keyword in haystack for keyword in keywords):
            return section_type
    return DEFAULT_SECTION_TYPE


# ---------------------------------------------------------------------------------------
# Section body -> ordered units (sentences and labelled lines), never rewritten.
# ---------------------------------------------------------------------------------------


@dataclass
class Unit:
    kind: str  # "sentence" | "label"
    text: str  # exactly what lands in the card
    checks: list[str] = field(default_factory=list)  # fragments verify_verbatim must find


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_MARKER_CELL_RE = re.compile(r"(!!|\|\|)\s*([^!|]*?)\s*(?=!!|\|\||$)")

# Left-to-right/right-to-left marks and zero-width spaces/joiners, plus a stray byte-order
# mark -- invisible on screen but real characters. Hollow Knight wiki's False Knight page
# opens its "Behaviour and Tactics" section with two of these; trimmed here, at the edge of
# every unit, rather than left to sit at the very start of a printed note.
_INVISIBLE_MARKS_RE = re.compile(r"^[\s​-‏﻿]+|[\s​-‏﻿]+$")


def _clean(s: str) -> str:
    return _INVISIBLE_MARKS_RE.sub("", s)


def _split_sentences(line: str) -> list[str]:
    return [s for s in (_clean(part) for part in _SENTENCE_SPLIT_RE.split(line)) if s]


def _split_marked_cells(line: str) -> list[tuple[str, str]]:
    return [(m.group(1), _clean(m.group(2))) for m in _MARKER_CELL_RE.finditer(line) if _clean(m.group(2))]


def body_to_units(body: str) -> tuple[list[Unit], list[str]]:
    """One pass over the chosen section, in order. A marked table/infobox line becomes one
    or more "Label: value" units; every other non-blank line is prose, split into sentences.
    Nested subheadings inside the chosen section are dropped as furniture (their own title
    text, not their content) and named in `dropped_notes`."""
    units: list[Unit] = []
    dropped_notes: list[str] = []
    header_cells: list[str] = []
    pending_label: str | None = None

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _HEADING_RE.match(line):
            dropped_notes.append(f"dropped a nested subheading: {line!r}")
            continue
        if re.fullmatch(r"[!|\s]*", line) and re.search(r"[!|]", line):
            # A blank table cell (Fandom's stat widgets render one per row, and an unused
            # row is common) -- nothing to keep, nothing to report as dropped.
            continue
        cells = _split_marked_cells(line)
        if cells:
            markers = {m for m, _ in cells}
            if markers == {"!!"} and len(cells) > 1:
                header_cells = [t for _, t in cells]
                continue
            if markers == {"!!"}:
                pending_label = cells[0][1]
                continue
            if markers == {"||"} and pending_label:
                label = pending_label
                pending_label = None
                value = cells[0][1]
                units.append(Unit("label", f"{label}: {value}", [label, value]))
                for extra_marker, extra_text in cells[1:]:
                    units.append(Unit("sentence", extra_text, [extra_text]))
                if len(cells) > 1:
                    dropped_notes.append(
                        f"table row had one label ({label!r}) and {len(cells)} values; "
                        "only the first got a matching label"
                    )
                continue
            if markers == {"||"} and header_cells and len(cells) <= len(header_cells):
                for h, (_, v) in zip(header_cells, cells):
                    units.append(Unit("label", f"{h}: {v}", [h, v]))
                continue
            if markers == {"||"} and len(cells) == 2 and not header_cells and not pending_label:
                # A two-column table with no "!!" header row at all -- common for a simple
                # stat table ("| Health || 800"). Read as label/value; documented as a
                # judgement call since a genuine two-column data table would be misread the
                # same way (there is no header to tell the two shapes apart).
                label, value = cells[0][1], cells[1][1]
                units.append(Unit("label", f"{label}: {value}", [label, value]))
                continue
            labels = [t for m, t in cells if m == "!!"]
            values = [t for m, t in cells if m == "||"]
            if labels and values:
                units.append(Unit("label", f"{labels[0]}: {values[0]}", [labels[0], values[0]]))
                for extra in values[1:]:
                    units.append(Unit("sentence", extra, [extra]))
                if len(values) > 1:
                    dropped_notes.append(
                        f"table row had one label ({labels[0]!r}) and {len(values)} values; "
                        "only the first got a matching label"
                    )
                continue
            if markers == {"||"} and len(cells) == 1:
                # Some stat widgets (Hollow Knight wiki's "Combat Values" box) write the
                # label into the cell's own text ("Hits: 11") rather than a separate header
                # cell -- the page already did the labelling, so keep it as-is.
                solo_label_match = re.match(r"^([^:]{1,60}):\s+(.+)$", cells[0][1])
                if solo_label_match:
                    label, value = _clean(solo_label_match.group(1)), _clean(solo_label_match.group(2))
                    units.append(Unit("label", f"{label}: {value}", [label, value]))
                    continue
            dropped_notes.append(f"could not parse a marked table/infobox line: {line[:80]!r}")
            continue
        list_match = re.match(r"^-\s+(.*)$", line)
        if list_match:
            item = _clean(list_match.group(1))
            if item:
                # Its own line always, like a label -- several list items joined into one
                # flowing sentence would no longer read as the page's own list.
                units.append(Unit("list", f"- {item}", [item]))
            continue
        for sentence in _split_sentences(line):
            units.append(Unit("sentence", sentence, [sentence]))
    return units, dropped_notes


def render_card(units: list[Unit]) -> str:
    lines: list[str] = []
    buffer: list[str] = []

    def flush() -> None:
        if buffer:
            lines.append(" ".join(buffer))
            buffer.clear()

    for u in units:
        if u.kind in ("label", "list"):
            flush()
            lines.append(u.text)
        else:
            buffer.append(u.text)
    flush()
    return "\n".join(lines)


def trim_to_length(units: list[Unit], min_chars: int = 400, max_chars: int = 880) -> tuple[list[Unit], str | None]:
    """Keeps whole units, front to back, stopping once the card would exceed max_chars.
    A single unit longer than max_chars is still kept whole (D111 answer 2: "the reader
    takes its first sentences and says so" -- never mid-sentence, even over the cap)."""
    kept: list[Unit] = []
    for u in units:
        candidate = kept + [u]
        if len(render_card(candidate)) > max_chars and kept:
            break
        kept.append(u)
        if len(render_card(kept)) >= max_chars:
            break
    text = render_card(kept)
    note = None
    if len(text) < min_chars:
        note = f"the matching section is only {len(text)} characters, short of the {min_chars} aim; used all of it"
    elif len(text) > max_chars:
        note = f"the first unit alone is {len(text)} characters, over the {max_chars} cap; kept it whole rather than cut mid-sentence"
    return kept, note


_WS_RE = re.compile(r"\s+")


def _normalize_ws(s: str) -> str:
    return _WS_RE.sub(" ", s).strip()


def verify_verbatim(units: list[Unit], page_text: str) -> tuple[bool, list[str]]:
    """The guarantee, as a function: every fragment the card needs (a whole sentence, or a
    labelled line's label and its value separately) must appear -- after whitespace-only
    normalising -- in the page text this note was built from. Returns (ok, problems); a
    non-empty `problems` names every fragment that failed, so a refusal says exactly which
    words were not found on the page rather than only "no"."""
    normalized_page = _normalize_ws(page_text)
    problems: list[str] = []
    for u in units:
        for fragment in u.checks:
            frag_norm = _normalize_ws(fragment)
            if frag_norm and frag_norm not in normalized_page:
                problems.append(fragment)
    return (not problems, problems)


# ---------------------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------------------


def build_note(
    *,
    page_path: Path,
    page_format: str,
    game_id: int,
    section_type_arg: str | None,
    name_arg: str | None,
    min_chars: int,
    max_chars: int,
    allowed_licences: frozenset[str],
    licence_override: str | None = None,
) -> tuple[dict, dict, list[str]]:
    if page_format == "live":
        meta, body = load_live_page(page_path)
    else:
        meta, body = load_dump_page(page_path)

    licence = canonical_licence(meta.get("licence_text", ""), meta.get("licence_url", ""))
    if licence is None and licence_override:
        # Some Fandom wikis' own API answers a bare "CC-BY-SA" with no version -- the same
        # gap ATTR-5.2 exists for (docs/knowledge-base.md, "Source attribution": "Read the
        # licence from the snapshot, not from the archive.org item"). Where the version was
        # already established from other evidence (an archived siteinfo, or a footer read by
        # hand -- see docs/archive/15-corpus-licensing-attribution-plan.md), pass it here
        # rather than trusting today's live read to repeat it. Still checked against the
        # allow-list below, so a wrong override cannot slip through.
        licence = licence_override
        print(f"[check] licence read from the live site had no version; used --source-license "
              f"{licence!r} instead -- confirm this against the evidence the version came from", file=sys.stderr)
    if licence is None:
        raise SystemExit(
            f"refusing {page_path.name}: no recognised licence "
            f"(declared text={meta.get('licence_text')!r} url={meta.get('licence_url')!r}); "
            "silence has always meant all rights reserved here -- read the wiki's own footer by hand"
        )
    if licence not in allowed_licences:
        raise SystemExit(
            f"refusing {page_path.name}: licence {licence!r} is not on the publish allow-list "
            f"({sorted(allowed_licences)}); scripts/publish_corpus.py would refuse this too"
        )

    headings = extract_headings(body)
    choice = select_section(headings, body)
    section_body = choice.body
    units, dropped_notes = body_to_units(section_body)
    kept, length_note = trim_to_length(units, min_chars, max_chars)
    if length_note:
        dropped_notes.append(length_note)
    dropped_units = units[len(kept) :]
    if dropped_units:
        dropped_notes.append(f"{len(dropped_units)} sentence(s)/line(s) after the cut were not used")

    ok, problems = verify_verbatim(kept, body)
    if not ok:
        raise SystemExit(
            "refusing to print a note: the following did not appear verbatim (whitespace "
            f"aside) in the fetched page -- {problems}"
        )

    card = render_card(kept)
    categories = meta.get("categories") or []
    section_type = section_type_arg or guess_section_type(meta.get("title", ""), headings, categories)
    if not section_type_arg:
        source = "the page's own categories" if categories else "the page's own headings"
        print(f"[check] section_type guessed as {section_type!r} from {source} -- confirm by hand", file=sys.stderr)

    note = {
        "section_id": None,
        "game_id": game_id,
        "section_type": section_type,
        "name": name_arg or meta.get("title", ""),
        "card": card,
        "source_url": meta.get("url", ""),
        "source_license": licence,
        "source_version": None,
        "crawled_at": meta.get("crawled_at", ""),
    }
    sidecar = {
        "revision_id": meta.get("revid"),
        "section_heading": choice.heading.title if choice.heading else None,
        "section_chosen_reason": choice.reason,
        "char_count": len(card),
    }
    return note, sidecar, dropped_notes


def _detect_format(page_path: Path, format_arg: str) -> str:
    if format_arg != "auto":
        return format_arg
    if page_path.suffix == ".wikitext":
        return "dump"
    return "live"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--page", required=True, type=Path, help="the fetched page (.txt from the live fetcher, .wikitext from the dump fetcher)")
    parser.add_argument("--format", choices=["auto", "live", "dump"], default="auto")
    parser.add_argument("--game-id", required=True, type=int)
    parser.add_argument("--section-type", default=None, help="skip the heading-based guess")
    parser.add_argument("--name", default=None, help="override the note's name (default: the page title)")
    parser.add_argument("--min-chars", type=int, default=400)
    parser.add_argument("--max-chars", type=int, default=880)
    parser.add_argument("--out", type=Path, default=None, help="also write {notes, sidecars} JSON here (never the seed)")
    parser.add_argument(
        "--source-license", dest="source_license", default=None,
        help="use this licence when the live site's own answer carries no version (e.g. a "
        "bare 'CC-BY-SA') but the version was already established from other evidence -- "
        "still checked against the publish allow-list, so a wrong value is still refused",
    )
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

    page_format = _detect_format(args.page, args.format)
    allowed = _load_allowed_licences()
    note, sidecar, dropped_notes = build_note(
        page_path=args.page,
        page_format=page_format,
        game_id=args.game_id,
        section_type_arg=args.section_type,
        name_arg=args.name,
        min_chars=args.min_chars,
        max_chars=args.max_chars,
        allowed_licences=allowed,
        licence_override=args.source_license,
    )

    print("=== NOTE RECORD (print only -- never written into data/kb/strategy_seed.json) ===")
    print(json.dumps(note, indent=2, ensure_ascii=False))
    print("=== SIDECAR (revision, heading read, character count) ===")
    print(json.dumps(sidecar, indent=2, ensure_ascii=False))
    if dropped_notes:
        print("=== DROPPED / COULD NOT PARSE ===")
        for line in dropped_notes:
            print(f"  - {line}")

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        payload = {"notes": [note], "sidecars": [sidecar], "dropped": dropped_notes}
        args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[ok] also wrote {args.out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
