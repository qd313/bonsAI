#!/usr/bin/env python3
"""
Title: LOOT rule-list fetcher (maintainer tool)
Purpose: Read LOOT's published rule lists for Fallout 4 and Skyrim Special Edition from GitHub at a
         named commit, keep only the plugins that carry a rule, and write one small JSON file per
         game under data/kb/load_order/ with a header naming the repository, the commit, its date,
         the licence and the day it was read.
Used for: Making data/kb/load_order/fallout4.json and skyrimse.json, which scripts/kb/build_rag_db.py
          turns into the library's load_order tables. Run by the maintainer, never by the plugin.
Solves: The rules (what a plugin needs, what it must load after, what it is marked as not working
        with) are free to use (CC0-1.0) but arrive as a 1 MB YAML file with web links, other
        languages and file fingerprints that the check on the Deck neither needs nor may carry.
        This keeps the rules and leaves the rest, and stops with a plain reason if a web link or
        the wrong licence slips through.
Does not: Run on the Deck or at plugin run time, read Nexus Mods (every link to it is dropped and
          the run stops if one survives), keep messages in other languages, "dirty edit" notes,
          file fingerprints or web links, or judge whether any rule is right.

    python scripts/kb/fetch_loot_masterlist.py --date-read 2026-11-15

The commits are pinned below (the lists change almost daily, so a library says which one it holds).
Pass --fallout4-commit / --skyrimse-commit (a short or full hash, or a branch name) to read another.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())
OUT_DIR = REPO_ROOT / "data" / "kb" / "load_order"

LICENCE = "CC0-1.0"
LICENCE_FILE_MARK = "CC0 1.0 Universal"
USER_AGENT = "bonsAI-kb-author/1.0 (load-order rules; polite, low volume)"

# game key -> (GitHub repository under loot/, pinned commit read on 2026-11-02 / plan 101).
GAMES: dict[str, tuple[str, str]] = {
    "fallout4": ("fallout4", "4c7858a84bc65b34904b53c5e6252d3f6f9b1247"),
    "skyrimse": ("skyrimse", "f37b59d04fb28f438a71159216bffb5fb3f9af73"),
}

_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_URL_RE = re.compile(r"https?://|nexusmods", re.IGNORECASE)
_PLACEHOLDER_RE = re.compile(r"\{(\d+)\}")


def has_link(text: str) -> bool:
    """True when ``text`` still holds a web address (any http link, or a mention of Nexus Mods)."""
    return bool(_URL_RE.search(text))


def strip_links(text: str) -> str:
    """Markdown ``[words](address)`` becomes ``words``; the address is dropped."""
    return _LINK_RE.sub(r"\1", text)


def is_pattern_name(name: str) -> bool:
    """LOOT's own rule: a name with any of ``: \\ * ? |`` is a regular expression, else a file name."""
    return any(ch in name for ch in ':\\*?|')


def _english(value: Any) -> str | None:
    """A text that is either plain or a list of {lang, text}; the English one, else None."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and item.get("lang") == "en" and isinstance(item.get("text"), str):
                return item["text"]
    return None


def distil_message(raw: Any) -> dict[str, Any] | None:
    """One message as {type, text, subs, condition}, English only, no links; None if it cannot be kept."""
    if not isinstance(raw, dict):
        return None
    text = _english(raw.get("content"))
    kind = raw.get("type")
    if not text or kind not in ("say", "warn", "error"):
        return None
    text = strip_links(text)
    subs_raw = raw.get("subs") or []
    subs = [strip_links(_english(s) or "") for s in subs_raw] if isinstance(subs_raw, list) else []
    used = {int(n) for n in _PLACEHOLDER_RE.findall(text)}
    for index, sub in enumerate(subs):
        if has_link(sub):
            if index in used:
                return None  # the visible words ARE an address: nothing left to keep
            subs[index] = ""  # only ever the target of a link whose words were kept
    condition = raw.get("condition")
    return {
        "type": kind,
        "text": text,
        "subs": subs,
        "condition": condition if isinstance(condition, str) and condition.strip() else None,
    }


def distil_item(raw: Any) -> dict[str, str] | None:
    """One after / requires / incompatible item as {name, ...optional display, detail, condition, constraint}."""
    if isinstance(raw, str):
        return {"name": raw} if raw.strip() else None
    if not isinstance(raw, dict) or not isinstance(raw.get("name"), str) or not raw["name"].strip():
        return None
    item = {"name": raw["name"]}
    for key in ("display", "detail"):
        value = _english(raw.get(key))
        if value:
            item[key] = strip_links(value)
    for key in ("condition", "constraint"):
        if isinstance(raw.get(key), str) and raw[key].strip():
            item[key] = raw[key]
    return item


def _items(raw: Any) -> list[dict[str, str]]:
    return [i for i in (distil_item(x) for x in (raw or [])) if i] if isinstance(raw, list) else []


def distil_entry(plugin: dict[str, Any]) -> dict[str, Any] | None:
    """One plugin entry, or None when it carries no rule (no after, requires, incompatible or message)."""
    name = plugin.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    messages = [m for m in (distil_message(x) for x in (plugin.get("msg") or [])) if m]
    entry: dict[str, Any] = {"name": name, "isPattern": is_pattern_name(name)}
    if isinstance(plugin.get("group"), str):
        entry["group"] = plugin["group"]
    entry["after"] = _items(plugin.get("after"))
    entry["requires"] = _items(plugin.get("req"))
    entry["incompatible"] = _items(plugin.get("inc"))
    entry["messages"] = messages
    if not (entry["after"] or entry["requires"] or entry["incompatible"] or messages):
        return None
    return entry


def distil_masterlist(parsed: dict[str, Any]) -> dict[str, Any]:
    """The kept part of a parsed masterlist: its groups and the entries that carry a rule.

    Raises ValueError if any kept text still holds a web address (Nexus Mods most of all).
    """
    groups = []
    for g in parsed.get("groups") or []:
        if isinstance(g, dict) and isinstance(g.get("name"), str):
            after = [a for a in (g.get("after") or []) if isinstance(a, str)]
            groups.append({"name": g["name"], "after": after})
    entries = [e for e in (distil_entry(p) for p in parsed.get("plugins") or [] if isinstance(p, dict)) if e]
    kept = {"groups": groups, "entries": entries}
    leftover = _first_link(kept)
    if leftover:
        raise ValueError(f"a web link survived in the kept data: {leftover!r}")
    return kept


def _first_link(value: Any) -> str | None:
    """The first string anywhere inside ``value`` that still holds a link, else None."""
    if isinstance(value, str):
        return value if has_link(value) else None
    if isinstance(value, dict):
        value = list(value.values())
    if isinstance(value, list):
        for part in value:
            found = _first_link(part)
            if found:
                return found
    return None


def make_file_text(game: str, header: dict[str, str], kept: dict[str, Any]) -> str:
    """The JSON file's text: a header, the groups, and one entry per line so a change reads as a diff."""
    head = {"game": game, **header}
    dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))  # noqa: E731
    lines = ["{", f'"header": {dump(head)},', f'"groups": {dump(kept["groups"])},', '"entries": [']
    lines.append(",\n".join(dump(e) for e in kept["entries"]))
    lines += ["]", "}", ""]
    return "\n".join(lines)


def _get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as resp:
        return resp.read()


def resolve_commit(repo: str, ref: str) -> tuple[str, str]:
    """(full hash, commit date as YYYY-MM-DD) of ``ref`` in loot/<repo>, from GitHub's own API."""
    data = json.loads(_get(f"https://api.github.com/repos/loot/{repo}/commits/{ref}"))
    return str(data["sha"]), str(data["commit"]["committer"]["date"])[:10]


def read_game(game: str, ref: str, date_read: str) -> tuple[dict[str, str], dict[str, Any]]:
    """Fetch one game's list at ``ref``; returns (header, kept data). Stops if the licence is not CC0."""
    repo = GAMES[game][0]
    sha, commit_date = resolve_commit(repo, ref)
    raw = "https://raw.githubusercontent.com/loot/%s/%s/" % (repo, sha)
    if LICENCE_FILE_MARK not in _get(raw + "LICENSE").decode("utf-8", "replace"):
        raise SystemExit(f"{repo} at {sha}: the LICENSE file is not '{LICENCE_FILE_MARK}'; nothing written")
    parsed = yaml.load(_get(raw + "masterlist.yaml").decode("utf-8"), Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))
    header = {
        "repository": f"https://github.com/loot/{repo}",
        "commit": sha,
        "commit_date": commit_date,
        "licence": LICENCE,
        "date_read": date_read,
    }
    return header, distil_masterlist(parsed)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch LOOT's rule lists (CC0-1.0) into data/kb/load_order/")
    parser.add_argument("--fallout4-commit", default=GAMES["fallout4"][1])
    parser.add_argument("--skyrimse-commit", default=GAMES["skyrimse"][1])
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument("--date-read", default=_dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%d"))
    args = parser.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    for game, ref in (("fallout4", args.fallout4_commit), ("skyrimse", args.skyrimse_commit)):
        header, kept = read_game(game, ref, args.date_read)
        path = args.out / f"{game}.json"
        path.write_text(make_file_text(game, header, kept), encoding="utf-8", newline="\n")
        print(f"{game}: commit {header['commit'][:12]} of {header['commit_date']}, "
              f"{len(kept['entries'])} entries, {len(kept['groups'])} groups -> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
