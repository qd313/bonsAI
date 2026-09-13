#!/usr/bin/env python3
"""
Title: Card-name collision probe
Purpose: Ask the shipped retrieval, once per card, for that card by its own name, and
         record which card actually comes back first.
Used for: Finding cards that are shadowed by a sibling -- a category-named card beating
          its own members, or two cards in one game fighting over a word.
Solves: A lexical name-vs-name check misses the real cases. "Causing chaos" shadows
        "Kaos mode and Revolution mode" and the two names share no substring at all; the
        collision lives in the card body, which only the real search sees.
Does not: Score anything against the eval fixture, or change any card. Read-only probe.

    python scripts/probe_card_name_collisions.py --out build/card-name-collisions.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py_modules"))

from backend.services import knowledge_base_service as kb  # noqa: E402

CARD_RE = re.compile(r"^\[([^/]+?) / ([^:]+?): (.+?)\]", re.MULTILINE)


def ranked_names(text_block: str) -> list[str]:
    return [m.group(3).strip() for m in CARD_RE.finditer(text_block or "")]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(REPO / "build" / "knowledge-base-embed-bakeoff"))
    ap.add_argument("--seed", default=str(REPO / "data" / "kb" / "strategy_seed.json"))
    ap.add_argument("--out", default=str(REPO / "build" / "card-name-collisions.json"))
    a = ap.parse_args()

    seed = json.loads(Path(a.seed).read_text(encoding="utf-8"))
    games = {g["game_id"]: g for g in seed["games"]}
    settings = {"use_local_knowledge_base": True, "rag_corpus_path": os.path.abspath(a.corpus)}

    rows = []
    sections = seed["sections"]
    for i, sec in enumerate(sections, 1):
        g = games.get(sec["game_id"], {})
        res = kb.retrieve_knowledge_context(
            settings,
            ask_mode="strategy",
            question=sec["name"],
            app_id=str(g.get("app_id") or ""),
            app_name=str(g.get("canonical_title") or ""),
            shortcut_name="" if g.get("app_id") else str(g.get("canonical_title") or ""),
            domain="strategy",
        )
        names = ranked_names(res.text_block)
        pos = names.index(sec["name"]) + 1 if sec["name"] in names else 0
        rows.append({
            "section_id": sec["section_id"],
            "game": g.get("canonical_title", "?"),
            "section_type": sec["section_type"],
            "name": sec["name"],
            "rank": pos,               # 1 = found itself first; 0 = not returned at all
            "returned": names,
            "shadowed_by": names[0] if names and names[0] != sec["name"] else "",
        })
        print(f"  {i:3}/{len(sections)}  rank={pos}  {g.get('canonical_title','?')} / {sec['name']}",
              flush=True)

    Path(a.out).write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nwrote {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
