#!/usr/bin/env python3
"""
Title: Load-order checker against LOOT's list (maintainer tool, this PC only)
Purpose: Read a Bethesda game's plugins.txt (Fallout 4 or Skyrim Special Edition) and print what
         LOOT's rule list says about it: a plugin that needs another which is missing, two plugins
         marked as not working together that are both switched on, and a plugin told to load after
         another that comes after it. It also says how many rules it could not check.
Used for: Trying the load-order data on a real file before anything on the Deck reads it, and as the
          model for how the Deck's check will word its findings. It reads the JSON files under
          data/kb/load_order/ (made by scripts/kb/fetch_loot_masterlist.py), not the library.
Solves: Plan 101 chose the words ("X needs Y, which I could not find", "X and Z are marked as not
        working together and both are on", "X is told to load after Y but loads before it") and a
        rule that a finding is only ever what LOOT's list says, never a fact about the person's game.
        This keeps the words and the rule in one place that a test can hold.
Does not: Say a load order is safe, say mods work together, or give a verdict of any kind. It never
          opens a plugin or any game file, and never reads Nexus Mods. A rule whose condition it does not
          read (a plugin's version, a file's fingerprint, whether a file exists), or that names a file
          outside the plugin list, is counted as not checked, not guessed. LOOT's messages (cleaning,
          patches, versions) are not read at all.

    python scripts/kb/check_load_order.py --game skyrimse --plugins path/to/plugins.txt

A line of plugins.txt that starts with * is switched on; a line without one is switched off. A file
with no starred line at all (a loadorder.txt, which only gives the order) is read as all switched on,
and the output says so.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = next(p for p in Path(__file__).resolve().parents if (p / "main.py").is_file())
PY_MODULES = REPO_ROOT / "py_modules"
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

from backend.knowledge.knowledge_base_schema import (  # noqa: E402
    load_order_is_pattern_name as is_pattern_name,
    load_order_name_key,
    load_order_pattern_matches,
)

DATA_DIR = REPO_ROOT / "data" / "kb" / "load_order"
GAME_LABELS = {"fallout4": "Fallout 4", "skyrimse": "Skyrim Special Edition"}

# The game's own files that the game always loads first and plugins.txt may leave out.
IMPLICIT_MASTERS = {
    "fallout4": ["Fallout4.esm", "DLCRobot.esm", "DLCworkshop01.esm", "DLCCoast.esm", "DLCworkshop02.esm",
                 "DLCworkshop03.esm", "DLCNukaWorld.esm"],
    "skyrimse": ["Skyrim.esm", "Update.esm", "Dawnguard.esm", "HearthFires.esm", "Dragonborn.esm"],
}
_PLUGIN_ENDINGS = (".esp", ".esm", ".esl")
_TOKEN = re.compile(r'\s*(?:active\("((?:[^"\\]|\\.)*)"\)|(\()|(\))|\b(not|and|or)\b)')


def parse_plugins(text: str, game: str) -> tuple[list[dict[str, Any]], list[str]]:
    """The plugins in load order as ``{name, active, in_file}``, the game's own masters first, and any notes.

    A master the file leaves out is added as switched on and not ``in_file``, so a rule that needs it is not
    reported missing and the counts only speak of what the file lists.
    """
    rows: list[tuple[str, bool]] = []
    for raw in text.lstrip(chr(0xFEFF)).splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        rows.append((line.lstrip("*").strip(), line.startswith("*")))
    notes: list[str] = []
    if rows and not any(active for _, active in rows):
        rows = [(name, True) for name, _ in rows]
        notes.append("No line has a star, so I took every plugin in the file as switched on.")
    plugins: list[dict[str, Any]] = []
    seen: set[str] = set()
    listed = {name.lower() for name, _ in rows}
    implicit = [m for m in IMPLICIT_MASTERS.get(game, []) if m.lower() not in listed]
    for name, active, in_file in [(m, True, False) for m in implicit] + [(n, a, True) for n, a in rows]:
        if name.lower() not in seen:
            seen.add(name.lower())
            plugins.append({"name": name, "active": active, "in_file": in_file})
    return plugins, notes


class _Unreadable(Exception):
    """A condition holds something this script does not read."""


def evaluate_condition(condition: str, active_names: list[str]) -> bool:
    """True or False for a condition made only of active("..."), not, and, or and brackets.

    Raises _Unreadable for anything else (a version, a fingerprint, whether a file exists).
    """
    tokens: list[tuple[str, str]] = []
    text, pos = condition.strip(), 0
    while pos < len(text):
        match = _TOKEN.match(text, pos)
        if not match:
            raise _Unreadable
        arg, opener, closer, word = match.groups()
        tokens.append(("active", arg) if arg is not None else ("(", "") if opener else (")", "") if closer else (word, ""))
        pos = match.end()
    index = 0

    def peek() -> str:
        return tokens[index][0] if index < len(tokens) else ""

    def take() -> tuple[str, str]:
        nonlocal index
        if index >= len(tokens):
            raise _Unreadable
        index += 1
        return tokens[index - 1]

    def atom() -> bool:
        kind, arg = take()
        if kind == "not":
            return not atom()
        if kind == "(":
            value = either()
            if take()[0] != ")":
                raise _Unreadable
            return value
        if kind != "active":
            raise _Unreadable
        if is_pattern_name(arg):
            try:
                compiled = re.compile(arg, re.IGNORECASE)
            except re.error:
                raise _Unreadable from None
            return any(compiled.fullmatch(n) for n in active_names)
        return arg.lower() in {n.lower() for n in active_names}

    def both() -> bool:
        value = atom()
        while peek() == "and":
            take()
            value = atom() and value
        return value

    def either() -> bool:
        value = both()
        while peek() == "or":
            take()
            value = both() or value
        return value

    result = either()
    if index != len(tokens):
        raise _Unreadable
    return result


def _matching_entries(entries: list[dict[str, Any]], plugin: str) -> list[dict[str, Any]]:
    key = load_order_name_key(plugin)
    found = [e for e in entries if not e["isPattern"] and load_order_name_key(e["name"]) == key]
    return found + [e for e in entries if e["isPattern"] and load_order_pattern_matches(e["name"], plugin)]


def _resolve(item_name: str, plugins: list[dict[str, Any]]) -> list[dict[str, Any]] | None:
    """The listed plugins an item names (a name or a pattern); None if it names no plugin at all."""
    if is_pattern_name(item_name):
        try:
            compiled = re.compile(item_name, re.IGNORECASE)
        except re.error:
            return None
        return [p for p in plugins if compiled.fullmatch(p["name"])]
    if not item_name.lower().endswith(_PLUGIN_ENDINGS):
        return None
    return [p for p in plugins if p["name"].lower() == item_name.lower()]


def check(data: dict[str, Any], plugins_text: str, game: str) -> dict[str, Any]:
    """Run LOOT's rules over a plugins.txt; returns the findings, the counts and the list's date."""
    plugins, notes = parse_plugins(plugins_text, game)
    position = {p["name"].lower(): i for i, p in enumerate(plugins)}
    active_names = [p["name"] for p in plugins if p["active"]]
    findings: list[tuple[int, str]] = []
    seen: set[Any] = set()
    unchecked: set[Any] = set()
    with_entry = 0
    for plugin in (p for p in plugins if p["active"]):
        matches = _matching_entries(data["entries"], plugin["name"])
        with_entry += bool(matches and plugin["in_file"])
        for entry in matches:
            for kind in ("requires", "incompatible", "after"):
                for item in entry[kind]:
                    applies = _applies(item, active_names)
                    listed = _resolve(item["name"], plugins) if applies else []
                    if applies is None or listed is None:
                        unchecked.add((plugin["name"].lower(), entry["name"], kind, item["name"], item.get("condition")))
                    elif applies:
                        for key, text in _findings_for(kind, plugin, item, listed, position):
                            if key not in seen:
                                seen.add(key)
                                findings.append((position[plugin["name"].lower()], text))
    return {
        "game": game,
        "list_date": data["header"]["commit_date"],
        "commit": data["header"]["commit"],
        "plugin_count": sum(p["in_file"] for p in plugins),
        "no_entry_count": sum(p["active"] and p["in_file"] for p in plugins) - with_entry,
        "findings": [text for _, text in sorted(findings, key=lambda f: f[0])],
        "unchecked": len(unchecked),
        "notes": notes,
    }


def _applies(item: dict[str, Any], active_names: list[str]) -> bool | None:
    """Whether a rule item applies here: True, False, or None when its condition cannot be read."""
    if item.get("constraint"):
        return None
    if not item.get("condition"):
        return True
    try:
        return evaluate_condition(item["condition"], active_names)
    except _Unreadable:
        return None


def _findings_for(kind, plugin, item, listed, position) -> list[tuple[Any, str]]:
    """``(key, sentence)`` for what LOOT's list says about one rule item of one switched-on plugin.

    The key tells a repeat from a new finding (two plugins that each list the other say it once).
    Nothing is returned when the rule holds.
    """
    name = plugin["name"]
    if kind == "requires":
        if any(p["active"] for p in listed):
            return []
        wanted = f"a plugin matching {item['name']}" if is_pattern_name(item["name"]) else item["name"]
        text = (f"{name} needs {wanted}, which is in your list but switched off." if listed
                else f"{name} needs {wanted}, which I could not find.")
        return [(("requires", name.lower(), item["name"].lower()), text)]
    others = [p["name"] for p in listed if p["active"] and p["name"].lower() != name.lower()]
    if kind == "incompatible":
        return [(("incompatible", frozenset((name.lower(), o.lower()))),
                 f"{name} and {o} are marked as not working together and both are on.") for o in others]
    return [(("after", name.lower(), o.lower()), f"{name} is told to load after {o} but loads before it.")
            for o in others if position[o.lower()] > position[name.lower()]]


def render(report: dict[str, Any]) -> str:
    """The checker's whole output: what the list says, then what was not checked, then the limits."""
    date = report["list_date"]
    out = [
        f"{GAME_LABELS.get(report['game'], report['game'])}: {report['plugin_count']} "
        f"plugin{'' if report['plugin_count'] == 1 else 's'} read, "
        f"against LOOT's list of {date} (commit {report['commit'][:12]}).",
        *report["notes"],
        "",
        f"LOOT's list of {date} says:",
    ]
    out += [f"  - {line}" for line in report["findings"]] or ["  - Nothing that applies among the rules I could check."]
    out += [
        "",
        f"Rules not checked: {report['unchecked']}. Each depends on something this script does not read "
        "(a plugin's version, a file's fingerprint, whether a file exists, or a file that is not in the plugin list).",
        f"Switched-on plugins with no entry in this list: {report['no_entry_count']}. "
        "LOOT's messages (cleaning, patches, versions) were not read.",
        "This is only what LOOT's list says. bonsAI has not checked your own game.",
    ]
    return "\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Print what LOOT's list says about a plugins.txt")
    parser.add_argument("--game", required=True, choices=sorted(GAME_LABELS))
    parser.add_argument("--plugins", required=True, type=Path, help="the game's plugins.txt")
    parser.add_argument("--data", type=Path, default=DATA_DIR, help="folder holding <game>.json")
    args = parser.parse_args(argv)
    data_path = args.data / f"{args.game}.json"
    if not data_path.is_file():
        raise SystemExit(f"No rule file at {data_path}. Run scripts/kb/fetch_loot_masterlist.py first.")
    if not args.plugins.is_file():
        raise SystemExit(f"No plugins file at {args.plugins}.")
    data = json.loads(data_path.read_text(encoding="utf-8"))
    text = args.plugins.read_text(encoding="utf-8", errors="replace")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stdout.write(render(check(data, text, args.game)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
