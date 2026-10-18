#!/usr/bin/env python3
"""Title: Knowledge-base thin-match measurement

Purpose: Find out whether a note that DID attach can be told apart from one that attached only
         because something in the corpus scored well by accident -- so the "not in my notes"
         line can key off how good the match was instead of only off whether anything attached.
Used for: The maintainer's 2026-09-07 call, "change what the line keys off". Run before the
          line is changed, so the rule that ships is the one the numbers picked.
Solves: The line today shows only when nothing attached, and something nearly always attaches,
         so it almost never shows. Raising the attach floor high enough to fix that costs
         twenty or more correct notes (see STRATEGY_MEANING_FLOOR's comment). This measures the
         other route: leave the note attached and say the match was thin.
Does not: Change any threshold, edit the service, or touch the Deck. It reads the corpus and
          prints tables.

Two candidate signals are measured, because the floor comment already rules out the obvious one
on its own -- two of the four device sentences score 0.6349 and 0.6369, inside the range of
genuinely right notes:

  meaning     the strongest cosine in the candidate pool (KnowledgeRetrievalResult.best_meaning)
  keyword     whether the winning card was ranked by the keyword search at all, or was found by
              meaning alone (KnowledgeRetrievalResult.top_card_keyword_score == 0)

For each rule the table reports the two numbers that decide it: how many rows that got their
RIGHT note would be warned about anyway (the cost, a false alarm on a good answer), and how many
rows that got a WRONG note would be warned about (the win).

Run on the maintainer PC with Ollama up and a built corpus:

    python scripts/build_rag_db.py --seed --out ./build/knowledge-base
    python scripts/measure_kb_thin_match.py --json runs/plan48-thin-match.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "py_modules"))

from backend.knowledge import knowledge_base_service as kb  # noqa: E402

FIXTURE = os.path.join(ROOT, "tests", "fixtures", "kb_eval_v2.json")
CARD_HEADER_RE = re.compile(r"^\[.*\(trust: [^)]+\)\s*$", re.M)

# The four questions that caused the line to be built, from plan 47's device evening. Every one
# is about a game the notes cover and about a subject the notes do not hold at all.
DEVICE_SENTENCES = [
    ("how do i tame a horse", "362890", "Black Mesa"),
    ("where do i buy a house", "620", "Portal 2"),
    ("qqqq zzzz wwww", "1145360", "Hades"),
    ("how do i beat the bone hydra in hades", "1145360", "Hades"),
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Measure thin-match signals on the note path.")
    p.add_argument("--corpus", default=os.path.join(ROOT, "build", "knowledge-base"))
    p.add_argument("--pc-ip", default="127.0.0.1")
    p.add_argument("--json", default="", help="Write the per-row detail to this path.")
    return p.parse_args()


def probe(settings: dict, question: str, *, app_id: str, pc_ip: str) -> dict:
    """Run one question through the real path and report what attached and how well it matched."""
    text_title = ""
    if not app_id.strip():
        text_title = kb.resolve_title_from_question(settings, question)
    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=True,
        ask_mode="strategy",
        question=question,
        app_id=app_id,
        app_name="",
        text_resolved_title=text_title,
    )
    if not gate:
        return {"attached": [], "best_meaning": None, "keyword_score": 0.0, "routed": False}
    res = kb.retrieve_knowledge_context(
        settings,
        ask_mode="strategy",
        question=question,
        app_id=app_id,
        app_name="",
        shortcut_name="",
        text_resolved_title=text_title,
        domain=domain,
        pc_ip=pc_ip,
    )
    names = [
        re.sub(r"^\[.*: (.*?)\].*$", r"\1", h.strip())
        for h in CARD_HEADER_RE.findall(res.text_block or "")
    ]
    return {
        "attached": names,
        "best_meaning": res.best_meaning,
        "keyword_score": res.top_card_keyword_score,
        "routed": True,
    }


def sweep(rows: list[dict]) -> None:
    """Print what each candidate rule would cost and win, on rows that attached something."""
    scored = [r for r in rows if r["attached"] and r["verdict"] in ("right", "wrong")]
    rights = [r for r in scored if r["verdict"] == "right"]
    wrongs = [r for r in scored if r["verdict"] == "wrong"]
    device = [r for r in rows if r["kind"] == "device" and r["attached"]]

    print()
    print("=== rows that attached a note and have a recorded answer ===")
    print("  right: %d    wrong: %d" % (len(rights), len(wrongs)))
    print("  the four device sentences that attached anything: %d of 4" % len(device))

    def warned(rs: list[dict], test) -> int:
        return sum(1 for r in rs if test(r))

    print()
    print("--- rule: warn when the best meaning score is below T ---")
    print("      T  | warned on a RIGHT note (cost) | warned on a WRONG note (win) | device 4")
    for t in (0.53, 0.55, 0.57, 0.59, 0.61, 0.63, 0.64, 0.65, 0.67, 0.70):
        test = lambda r, t=t: r["best_meaning"] is not None and r["best_meaning"] < t
        print("   %5.2f  | %28d | %27d | %d of %d" % (
            t, warned(rights, test), warned(wrongs, test), warned(device, test), len(device)))

    print()
    print("--- rule: warn when the winning note was found by meaning alone ---")
    test_kw = lambda r: r["keyword_score"] == 0.0
    print("            | warned on a RIGHT note (cost) | warned on a WRONG note (win) | device 4")
    print("   no keyword| %28d | %27d | %d of %d" % (
        warned(rights, test_kw), warned(wrongs, test_kw), warned(device, test_kw), len(device)))

    print()
    print("--- rule: both, warn only when there is no keyword support AND meaning is below T ---")
    print("      T  | warned on a RIGHT note (cost) | warned on a WRONG note (win) | device 4")
    for t in (0.57, 0.60, 0.63, 0.65, 0.67, 0.70, 0.75):
        test = lambda r, t=t: r["keyword_score"] == 0.0 and (
            r["best_meaning"] is not None and r["best_meaning"] < t)
        print("   %5.2f  | %28d | %27d | %d of %d" % (
            t, warned(rights, test), warned(wrongs, test), warned(device, test), len(device)))

    print()
    print("--- the four device sentences, one by one ---")
    for r in device:
        print("   %-40s meaning %-8s keyword %-8.3f -> %s" % (
            r["query"][:40],
            ("%.4f" % r["best_meaning"]) if r["best_meaning"] is not None else "none",
            r["keyword_score"],
            ", ".join(r["attached"])[:52]))


def main() -> int:
    args = parse_args()
    settings = {
        "use_local_knowledge_base": True,
        "rag_hybrid_retrieval_enabled": True,
        "rag_corpus_path": args.corpus,
    }
    if not kb.resolve_corpus_db_path(settings):
        print("no corpus at %s -- build one first" % args.corpus)
        return 2

    with open(FIXTURE, encoding="utf-8") as fh:
        fx = json.load(fh)
    default_split = fx.get("default_split")

    # Both splits. This script is run by the one running the session, not by a lane, and its
    # question is "can these two numbers tell a good match from a bad one at all" -- which needs
    # every row there is. Whatever rule comes out of it is then judged on the held-back rows
    # alone by measure_kb_floor_holdout.py, the same way the attach floor was.
    notes = [q for q in fx["queries"] if q.get("domain") == "strategy"]

    rows: list[dict] = []
    for row in notes:
        out = probe(settings, row["query"], app_id=str(row.get("app_id") or ""), pc_ip=args.pc_ip)
        want = str(row.get("expect_section") or "").strip()
        if not want:
            verdict = "unscored"
        elif not out["attached"]:
            verdict = "nothing"
        elif any(want.lower() == n.lower() for n in out["attached"]):
            verdict = "right"
        else:
            verdict = "wrong"
        rows.append({
            "id": row["id"], "kind": "note", "split": row.get("split") or default_split,
            "query": row["query"], "expect_section": want or None, "verdict": verdict, **out,
        })

    for question, app_id, game in DEVICE_SENTENCES:
        out = probe(settings, question, app_id=app_id, pc_ip=args.pc_ip)
        rows.append({
            "id": "DEVICE-" + question[:20], "kind": "device", "split": "device",
            "query": question, "game": game, "expect_section": None,
            "verdict": "should-attach-nothing", **out,
        })

    sweep(rows)

    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({"rows": rows}, fh, indent=2)
        print()
        print("wrote %s" % args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
