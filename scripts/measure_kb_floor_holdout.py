#!/usr/bin/env python3
"""Title: Knowledge-base floor measurement, held-back rows

Purpose: Judge the "none of these fit" floor on the rows the lane that built it was not allowed
         to see -- the 41 held-back troubleshooting rows of tests/fixtures/kb_eval_v2.json, the
         24 blind problem sentences inside them, a set of junk phrases, and the four device
         sentences that caught the notes hole on 2026-09-07.
Used for: Plan 48 section 7, the tips and notes table the retire-or-keep and ship-or-stop calls
          are written from. Run by the one running the session, never by a lane -- reading these
          rows is what the lane's blindness rule forbids.
Solves: The lane reports its own tuning-row table, which cannot say whether a floor generalises.
        Before this, "wrong tips attached went down" was only ever measured on rows the tuner
        could see, which is the failure mode plan 47's tip lane was built to avoid.
Does not: Change any threshold, edit the service, write a report into docs/, or touch the Deck.
          It reads the corpus and prints a table.

Run on the maintainer PC with Ollama up and a built corpus:

    python scripts/kb/build_rag_db.py --seed --out ./build/knowledge-base
    python scripts/measure_kb_floor_holdout.py
    python scripts/measure_kb_floor_holdout.py --json runs/plan48-floor-after.json --label after
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

# Phrases that should attach nothing. The first six are the set the 2026-08-28 second-signal
# audit measured; the rest were written 2026-09-07 because only two of those six reach the
# search at all, so the junk end of that table rested on two points (D87).
JUNK = [
    "please repeat that",
    "one sentence",
    "thank you very much",
    "four hours",
    "what time is it",
    "our team",
    "ok thanks",
    "never mind",
    "what did you say",
    "hello there",
    "that is great",
    "sounds good to me",
]

# The four the device run caught on 2026-09-07: questions about games the notes cover, whose
# subject is not in the notes at all. Every one attached notes before the floor existed.
DEVICE_SENTENCES = [
    ("how do i tame a horse", "362890", "Black Mesa"),
    ("where do i buy a house", "620", "Portal 2"),
    ("qqqq zzzz wwww", "1145360", "Hades"),
    ("how do i beat the bone hydra in hades", "1145360", "Hades"),
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Measure the floor on held-back rows.")
    p.add_argument("--corpus", default=os.path.join(ROOT, "build", "knowledge-base"))
    p.add_argument("--pc-ip", default="127.0.0.1")
    p.add_argument("--label", default="", help="Free-text label for the run, printed and stored.")
    p.add_argument("--json", default="", help="Write the per-row detail to this path.")
    p.add_argument(
        "--compare", default="",
        help="A JSON file from an earlier run. Prints the row-level diff, which is the part that "
             "actually decides whether a floor is worth keeping -- the summary buckets cannot show "
             "a bad attachment removed from a row that records no expected answer.",
    )
    return p.parse_args()


def print_comparison(before_path: str, after_rows: list[dict]) -> None:
    """Row-level before/after. The buckets hide the wins; this does not."""
    with open(before_path, encoding="utf-8") as fh:
        before_doc = json.load(fh)
    before = {r["id"]: r for r in before_doc.get("rows", before_doc)}
    after = {r["id"]: r for r in after_rows}

    stopped: list[dict] = []
    started: list[dict] = []
    lost_right: list[dict] = []
    gained_right: list[dict] = []
    for rid, a in after.items():
        b = before.get(rid)
        if b is None or b["attached"] == a["attached"]:
            continue
        if b["attached"] and not a["attached"]:
            (lost_right if b["verdict"] == "right" else stopped).append(
                {"id": rid, "query": a["query"], "was": b["attached"], "wanted": b.get("expect_section") or b.get("expect_topic")}
            )
        elif a["attached"] and not b["attached"]:
            (gained_right if a["verdict"] == "right" else started).append(
                {"id": rid, "query": a["query"], "now": a["attached"]}
            )

    print()
    print("=== compared against %s ===" % before_path)
    print("  bad attachments removed (this is the win) : %d" % len(stopped))
    print("  RIGHT answers lost (this is the cost)     : %d" % len(lost_right))
    print("  right answers gained                      : %d" % len(gained_right))
    print("  new attachments that are not right        : %d" % len(started))
    for label, rows in (("REMOVED", stopped), ("LOST A RIGHT ANSWER", lost_right),
                        ("NEWLY ATTACHED", started)):
        for r in rows:
            print("    [%s] %-46s was/now: %s" % (
                label, r["query"][:46], ", ".join(r.get("was") or r.get("now") or []) or "-"))


def attached(settings: dict, question: str, *, mode: str, app_id: str, app_name: str,
             pc_ip: str) -> tuple[list[str], str]:
    """Card names this question attaches, and the domain it routed to."""
    text_title = ""
    if not app_id.strip() and not app_name.strip():
        text_title = kb.resolve_title_from_question(settings, question)
    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=True,
        ask_mode=mode,
        question=question,
        app_id=app_id,
        app_name=app_name,
        text_resolved_title=text_title,
    )
    if not gate:
        return [], "(not routed)"
    res = kb.retrieve_knowledge_context(
        settings,
        ask_mode=mode,
        question=question,
        app_id=app_id,
        app_name=app_name,
        shortcut_name="",
        text_resolved_title=text_title,
        domain=domain,
        pc_ip=pc_ip,
    )
    names = [
        re.sub(r"^\[.*: (.*?)\].*$", r"\1", h.strip())
        for h in CARD_HEADER_RE.findall(res.text_block or "")
    ]
    return names, str(domain or "")


def topic_of_row(row: dict) -> str:
    return str(row.get("expect_topic") or "").strip()


def main() -> int:
    args = parse_args()
    settings = {
        "use_local_knowledge_base": True,
        "rag_hybrid_retrieval_enabled": True,
        "rag_corpus_path": args.corpus,
    }
    db_path = kb.resolve_corpus_db_path(settings)
    if not db_path:
        print("no corpus at %s -- build one first" % args.corpus)
        return 2
    conn = kb._get_connection(db_path)

    with open(FIXTURE, encoding="utf-8") as fh:
        fx = json.load(fh)
    default_split = fx.get("default_split")

    holdout_tips = [
        q for q in fx["queries"]
        if (q.get("split") or default_split) == "holdout" and q.get("domain") == "compat"
    ]
    blind = [q for q in holdout_tips if str(q.get("id", "")).startswith("V2-W2-SYM-")]

    detail: list[dict] = []
    right = wrong = nothing = 0
    # Only 17 of the 41 held-back troubleshooting rows carry an `expect_topic`, and NONE of the
    # 24 blind problem sentences do -- they were written by someone who had not seen the tips, so
    # nobody ever recorded which tip they ought to reach. Scoring those against an empty topic
    # would mark every attachment "wrong" and report a made-up 0-out-of-24. They are counted
    # separately, on the only thing that is actually known about them: whether anything attached.
    unscored_attached = unscored_nothing = 0

    for row in holdout_tips:
        names, domain = attached(
            settings, row["query"], mode="speed",
            app_id=str(row.get("app_id") or ""), app_name="", pc_ip=args.pc_ip,
        )
        want = topic_of_row(row)
        if not want:
            verdict = "unscored-attached" if names else "unscored-nothing"
            if names:
                unscored_attached += 1
            else:
                unscored_nothing += 1
        elif not names:
            verdict = "nothing"
            nothing += 1
        else:
            # A tip's card name IS its topic (`_card_lines` renders "[Tip: <topic>]"), which is
            # the same vocabulary `expect_topic` uses -- so comparing the two directly is right,
            # and no lookup back into the database is needed.
            verdict = "right" if any(want.lower() == n.lower() for n in names) else "wrong"
            if verdict == "right":
                right += 1
            else:
                wrong += 1
        detail.append({
            "id": row["id"], "kind": "holdout-tip", "query": row["query"],
            "expect_topic": want or None, "attached": names, "verdict": verdict,
            "blind": str(row.get("id", "")).startswith("V2-W2-SYM-"),
        })

    # The 175 held-back STRATEGY rows. These are what judge a floor on the note path, and they
    # are the reason this script exists in the form it does: on 2026-09-07 the note floor looked
    # like a net loss when read off the right/wrong/nothing buckets alone (-1 right, no change in
    # wrong), and was very nearly reverted. The row-level diff showed the opposite -- it had
    # removed six confident non-answers and cost one right note. Six of those rows record no
    # expected note, so removing a bad attachment from them moves NO bucket at all. Read
    # `stopped_attaching` below, not just the buckets.
    holdout_notes = [
        q for q in fx["queries"]
        if (q.get("split") or default_split) == "holdout" and q.get("domain") == "strategy"
    ]
    n_right = n_wrong = n_nothing = n_unscored = 0
    for row in holdout_notes:
        aid = str(row.get("app_id") or "")
        names, _ = attached(
            settings, row["query"], mode="strategy",
            app_id=aid, app_name="", pc_ip=args.pc_ip,
        )
        want = str(row.get("expect_section") or "").strip()
        if not want:
            verdict = "unscored-attached" if names else "unscored-nothing"
            n_unscored += 1
        elif not names:
            verdict = "nothing"
            n_nothing += 1
        elif any(want.lower() == n.lower() for n in names):
            verdict = "right"
            n_right += 1
        else:
            verdict = "wrong"
            n_wrong += 1
        detail.append({
            "id": row["id"], "kind": "holdout-note", "query": row["query"],
            "expect_section": want or None, "attached": names, "verdict": verdict,
            "blind": False,
        })

    junk_attached = 0
    for phrase in JUNK:
        names, domain = attached(settings, phrase, mode="speed", app_id="", app_name="",
                                 pc_ip=args.pc_ip)
        if names:
            junk_attached += 1
        detail.append({
            "id": "JUNK:" + phrase, "kind": "junk", "query": phrase,
            "expect_topic": None, "attached": names,
            "verdict": "wrong" if names else "nothing", "blind": False,
        })

    device_attached = 0
    for phrase, app_id, app_name in DEVICE_SENTENCES:
        names, domain = attached(settings, phrase, mode="strategy", app_id=app_id,
                                 app_name=app_name, pc_ip=args.pc_ip)
        if names:
            device_attached += 1
        detail.append({
            "id": "DEVICE:" + phrase, "kind": "device-note", "query": phrase,
            "expect_topic": None, "attached": names,
            "verdict": "wrong" if names else "nothing", "blind": False,
        })

    blind_reaching = sum(
        1 for d in detail if d["kind"] == "holdout-tip" and d["blind"] and d["attached"]
    )
    scored = right + wrong + nothing

    label = (" [%s]" % args.label) if args.label else ""
    print("Held-back troubleshooting rows%s" % label)
    print("  rows                       : %d" % len(holdout_tips))
    print("  of those, scoreable        : %d (the rest record no expected tip)" % scored)
    print("    right tip attached       : %d" % right)
    print("    wrong tip attached       : %d" % wrong)
    print("    nothing attached         : %d" % nothing)
    print("  rows with no expected tip  : %d" % (unscored_attached + unscored_nothing))
    print("    attached something       : %d" % unscored_attached)
    print("    attached nothing         : %d" % unscored_nothing)
    print()
    print("Of those, the 24 blind problem sentences")
    print("  reach a tip          : %d of %d" % (blind_reaching, len(blind)))
    print("  (none of them record which tip is right, so whether it FITS is a human read --")
    print("   the per-row detail in the JSON is what to read)")
    print()
    print("Junk phrases that should attach nothing")
    print("  attached something   : %d of %d" % (junk_attached, len(JUNK)))
    print()
    print("Device sentences about covered games with no note on the subject")
    print("  attached something   : %d of %d" % (device_attached, len(DEVICE_SENTENCES)))
    for d in detail:
        if d["kind"] == "device-note":
            print("    %-40s -> %s" % (d["query"][:40], ", ".join(d["attached"]) or "(nothing)"))

    print()
    print("Held-back strategy rows (the note path)")
    print("  rows                       : %d" % len(holdout_notes))
    print("    right note attached      : %d" % n_right)
    print("    wrong note attached      : %d" % n_wrong)
    print("    nothing attached         : %d" % n_nothing)
    print("    no expected note         : %d  <- a bad attachment removed here moves NO bucket" % n_unscored)

    if args.compare:
        print_comparison(args.compare, detail)

    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)) or ".", exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({
                "label": args.label,
                "corpus": db_path,
                "summary": {
                    "holdout_rows": len(holdout_tips),
                    "scoreable": right + wrong + nothing,
                    "right": right, "wrong": wrong, "nothing": nothing,
                    "unscored_attached": unscored_attached,
                    "unscored_nothing": unscored_nothing,
                    "blind_reaching": blind_reaching, "blind_total": len(blind),
                    "junk_attached": junk_attached, "junk_total": len(JUNK),
                    "device_attached": device_attached, "device_total": len(DEVICE_SENTENCES),
                },
                "rows": detail,
            }, fh, indent=1)
        print("\nwrote %s" % args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
