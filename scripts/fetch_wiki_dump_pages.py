#!/usr/bin/env python3
"""
Title: WikiTeam dump page extractor
Purpose: Pull named pages out of an archive.org WikiTeam MediaWiki dump, offline and
         reproducibly, together with the licence that dump declares for itself.
Used for: Sourcing strategy cards for data/kb/strategy_seed.json when the live wiki is
          unreachable, which is the normal case here -- Fandom answers this network with
          HTTP 402. See docs/planning/15-corpus-licensing-attribution-plan.md (ATTR-1.2).
Solves: A card that cites a wiki has to cite a licence, and the licence has to be the one
        that wiki declared at the snapshot date rather than one carried over from a
        sibling wiki. This reads rightsinfo out of the snapshot itself.
Does not: Run at plugin build time or on device. Nothing under py_modules/ imports it.
          It does not render wikitext, follow redirects, or fetch images.

Needs the `zstandard` package for .zst dumps and 7-Zip on PATH for .7z dumps. Both are
maintainer-host tools; neither is a plugin runtime dependency.

    python scripts/fetch_wiki_dump_pages.py --dump wiki-cyberpunk.fandom.com-20260618 \
        --list-titles --out build/dumps

    python scripts/fetch_wiki_dump_pages.py --dump wiki-cyberpunk.fandom.com-20260618 \
        --titles "Adam Smasher|Sandevistan" --out build/dumps
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

METADATA_URL = "https://archive.org/metadata/{identifier}"
DOWNLOAD_URL = "https://archive.org/download/{identifier}/{name}"
USER_AGENT = "bonsAI-corpus-tooling/0.1 (offline game-help corpus; contact via repo)"

# A history dump repeats every revision of every page; a current dump carries only the
# latest. Prefer current -- it is the same text for our purposes and an order of magnitude
# smaller (Fallout: 471 MB history, no current; Cyberpunk: 7 MB current).
_DUMP_PREFERENCE = ("-current.xml.zst", "-history.xml.zst", "-current.xml.7z", "-history.xml.7z")


def _get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def pick_dump_file(files: list[dict]) -> str:
    names = [f["name"] for f in files]
    for suffix in _DUMP_PREFERENCE:
        for name in names:
            if name.endswith(suffix):
                return name
    raise SystemExit(f"no XML dump file among: {names}")


def snapshot_licence(identifier: str, files: list[dict]) -> dict:
    """Read the wiki's own rightsinfo from this snapshot, not from a sibling wiki.

    Falls back to the archive.org item's licenceurl when a dump predates dumpMeta/
    (the pre-wikiteam3 items have no siteinfo.json at all).
    """
    siteinfo = next((f["name"] for f in files if f["name"].endswith("dumpMeta/siteinfo.json")), "")
    if not siteinfo:
        return {}
    url = DOWNLOAD_URL.format(identifier=identifier, name=siteinfo)
    try:
        data = _get_json(url)
    except Exception as error:  # pragma: no cover - network shape, reported not raised
        return {"error": str(error)}
    query = data.get("query", data)
    general = query.get("general", {})
    return {
        "rightsinfo": query.get("rightsinfo", {}),
        "sitename": general.get("sitename", ""),
        "generator": general.get("generator", ""),
        # scripts/extract_wiki_notes.py needs these to rebuild a page's own URL -- guessing
        # "/wiki/Title" off the API path is wrong often enough to matter (hollowknight.wiki's
        # own articlepath is "/w/$1", not "/wiki/$1"; strategywiki.org's api.php lives under
        # "/w/api.php", which is not its article root either).
        "server": general.get("server", ""),
        "articlepath": general.get("articlepath", ""),
    }


def ensure_local(identifier: str, name: str, cache_dir: Path) -> Path:
    """Download once, reuse after. Dumps are large and the picking of page titles is iterative."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    target = cache_dir / name.split("/")[-1]
    if target.exists() and target.stat().st_size > 0:
        print(f"  cached {target.name} ({target.stat().st_size / 1e6:.1f} MB)")
        return target
    url = DOWNLOAD_URL.format(identifier=identifier, name=name)
    print(f"  downloading {url}")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    partial = target.with_suffix(target.suffix + ".part")
    with urllib.request.urlopen(request, timeout=600) as response, partial.open("wb") as handle:
        shutil.copyfileobj(response, handle, length=1 << 20)
    partial.replace(target)
    print(f"  saved {target.name} ({target.stat().st_size / 1e6:.1f} MB)")
    return target


def _seven_zip() -> str:
    for candidate in ("7z", "7za", r"C:\Program Files\7-Zip\7z.exe"):
        if shutil.which(candidate) or Path(candidate).exists():
            return candidate
    raise SystemExit("7-Zip not found; needed for .7z dumps")


def seven_zip_members(path: Path) -> list[str]:
    listing = subprocess.run(
        [_seven_zip(), "l", "-ba", "-slt", str(path)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return re.findall(r"^Path = (.+)$", listing, flags=re.MULTILINE)


def _seven_zip_member(path: Path, suffix: str) -> str:
    """Pre-wikiteam3 .7z dumps bundle the XML next to index.html and Special:Version.html.

    `7z e -so` with no member name concatenates all of them, which is not XML. Naming the
    member is the whole fix -- the first attempt here died on a stray page of JavaScript.
    """
    members = [m for m in seven_zip_members(path) if m.endswith(suffix)]
    if not members:
        raise SystemExit(f"no {suffix} member in {path.name}: {seven_zip_members(path)}")
    return members[0]


def open_stream(path: Path):
    """Yield a binary file-like over the decompressed XML, whatever the container is."""
    if path.name.endswith(".zst"):
        import zstandard

        handle = path.open("rb")
        # max_window_size: wikiteam3 writes long-distance-matching frames.
        decompressor = zstandard.ZstdDecompressor(max_window_size=2**31)
        return decompressor.stream_reader(handle), handle
    if path.name.endswith(".7z"):
        process = subprocess.Popen(
            [_seven_zip(), "e", "-so", str(path), _seven_zip_member(path, ".xml")],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        return process.stdout, process
    return path.open("rb"), None


def licence_from_archive(path: Path) -> dict:
    """Read siteinfo.json out of a .7z dump, for items that predate the dumpMeta/ layout."""
    if not path.name.endswith(".7z"):
        return {}
    try:
        member = _seven_zip_member(path, "siteinfo.json")
    except SystemExit:
        return {}
    raw = subprocess.run(
        [_seven_zip(), "e", "-so", str(path), member],
        capture_output=True,
        check=True,
    ).stdout
    try:
        data = json.loads(raw.decode("utf-8", "replace"))
    except ValueError:
        return {}
    query = data.get("query", data)
    general = query.get("general", {})
    return {
        "rightsinfo": query.get("rightsinfo", {}),
        "sitename": general.get("sitename", ""),
        "generator": general.get("generator", ""),
        "server": general.get("server", ""),
        "articlepath": general.get("articlepath", ""),
        "source": f"{path.name}::{member}",
    }


def _strip_namespace(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def scan(path: Path, wanted: set[str]) -> tuple[list[str], dict[str, dict], str]:
    """One streaming pass: collect every title, and the last revision text of wanted ones.

    A history dump lists revisions oldest-first within a page, so overwriting as we go
    leaves the newest -- the same text a current dump would have given us.
    """
    stream, owner = open_stream(path)
    titles: list[str] = []
    found: dict[str, dict] = {}
    truncated = ""
    try:
        title = ""
        keep = False
        revision: dict[str, str] = {}
        try:
            for event, element in ET.iterparse(stream, events=("start", "end")):
                tag = _strip_namespace(element.tag)
                if event == "start":
                    if tag == "page":
                        title, keep, revision = "", False, {}
                    continue
                if tag == "title" and not title:
                    title = element.text or ""
                    titles.append(title)
                    keep = title in wanted
                elif tag == "revision":
                    if keep:
                        revision = {
                            "text": (element.findtext("{*}text") or ""),
                            "timestamp": (element.findtext("{*}timestamp") or ""),
                            "revision_id": (element.findtext("{*}id") or ""),
                        }
                    # A history dump of a busy wiki holds thousands of revisions per page;
                    # without this the whole page subtree stays resident.
                    element.clear()
                elif tag == "page":
                    if keep and revision:
                        found[title] = revision
                    element.clear()
        except ET.ParseError as error:
            # Several pre-wikiteam3 items end mid-page -- the dump run was interrupted and
            # never got its closing tag. Everything parsed before that point is still valid
            # wikitext, so keep it and say so rather than losing the whole snapshot.
            truncated = str(error)
    finally:
        try:
            stream.close()
        except Exception:
            pass
        if hasattr(owner, "close"):
            owner.close()
        if hasattr(owner, "wait"):
            owner.wait()
    return titles, found, truncated


def _safe_name(title: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", title)[:120]


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dump", required=True, help="archive.org item identifier")
    parser.add_argument("--titles", default="", help="pipe-separated exact page titles")
    parser.add_argument("--list-titles", action="store_true", help="write every title seen")
    parser.add_argument("--out", default="build/dumps", help="output directory")
    args = parser.parse_args(argv)

    metadata = _get_json(METADATA_URL.format(identifier=args.dump))
    if not metadata.get("metadata"):
        raise SystemExit(f"no such archive.org item: {args.dump}")
    files = metadata.get("files", [])
    item = metadata["metadata"]

    out_dir = Path(args.out) / args.dump
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "dump": args.dump,
        "original_url": item.get("originalurl", ""),
        "publicdate": item.get("publicdate", ""),
        "item_licenseurl": item.get("licenseurl", ""),
        "siteinfo": snapshot_licence(args.dump, files),
    }
    print(f"{args.dump}: item licence {manifest['item_licenseurl'] or '(none)'}")
    rights = manifest["siteinfo"].get("rightsinfo") if manifest["siteinfo"] else None
    if rights:
        print(f"  snapshot rightsinfo: {rights.get('text')} <{rights.get('url')}>")

    name = pick_dump_file(files)
    manifest["dump_file"] = name
    local = ensure_local(args.dump, name, Path(args.out) / "_cache")

    if not manifest["siteinfo"]:
        manifest["siteinfo"] = licence_from_archive(local)
        rights = manifest["siteinfo"].get("rightsinfo")
        if rights:
            print(f"  snapshot rightsinfo (from archive): {rights.get('text')} <{rights.get('url')}>")

    wanted = {t for t in args.titles.split("|") if t}
    titles, found, truncated = scan(local, wanted)
    manifest["truncated"] = truncated
    print(f"  {len(titles)} pages in dump, {len(found)}/{len(wanted)} wanted titles matched")
    if truncated:
        print(f"  WARNING: dump ends mid-stream ({truncated}); read what parsed, nothing after")

    if args.list_titles:
        (out_dir / "titles.txt").write_text("\n".join(titles), encoding="utf-8")

    pages = []
    for title, revision in sorted(found.items()):
        path = out_dir / f"{_safe_name(title)}.wikitext"
        path.write_text(revision["text"], encoding="utf-8")
        pages.append(
            {
                "title": title,
                "file": path.name,
                "revision_id": revision["revision_id"],
                "timestamp": revision["timestamp"],
            }
        )
    manifest["pages"] = pages
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    missing = sorted(wanted - set(found))
    if missing:
        print(f"  MISSING: {missing}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
