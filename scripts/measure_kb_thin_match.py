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

    python scripts/kb/build_rag_db.py --seed --out ./build/knowledge-base
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
    p.add_argument(
        "--line-gate", default="",
        help="Instead of the sweep: ask the line gate's set (see LINE GATE below) and write every "
             "ask to this path.")
    p.add_argument(
        "--compare", default="",
        help="With --line-gate: an earlier --line-gate file; print line before / after per group.")
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


# --- LINE GATE (plan 98 lane L) ------------------------------------------------------------------
#
# Does the "No close match" line show on each ask, and why? The set is the one the 2026-10-03
# measurement used (287 questions with a recorded right note): every Strategy row of kb_eval_v2.json
# with an expected note and a Steam app id (243), plus every Strategy case of kb_answer_eval.json
# with an expected card (44). Each is asked twice: with its game running (the app id), and with
# nothing running and the game's name typed at the end ("... in Hades"). A "right-note ask" is one
# whose expected note really attached on that ask. Then the questions the line exists for: the
# four device sentences above, the 2026-10-24 Deck readings, two junk phrases, and the two Deck
# answers the screen's line-removal was built for.
TONIGHT = [
    ("Who is the final boss called Zorblax in this game", "2321470", "tonight"),
    ("How do I defeat the boss named Grimthak in this game", "2321470", "tonight"),
    ("How do I buy a house in this game", "2321470", "tonight"),
    ("In Hades, how do I beat the boss called the Bone Hydra", "", "tonight"),
    ("thank you very much", "2321470", "junk"),
    ("what time is it", "2321470", "junk"),
    ("what does the shotgun do in half life 2", "", "old-false-line"),
    ("what should i know about the boss past the crystal spike area in hollow knight, "
     "the one that looks just like me", "", "old-false-line"),
]
ANSWER_FIXTURE = os.path.join(ROOT, "tests", "fixtures", "kb_answer_eval.json")


def _game_titles(settings: dict) -> dict[str, str]:
    import sqlite3

    with sqlite3.connect(kb.resolve_corpus_db_path(settings)) as db:
        return {str(a): str(t) for a, t in db.execute(
            "select app_id, canonical_title from games where app_id is not null")}


def line_probe(settings: dict, question: str, *, app_id: str, pc_ip: str) -> dict:
    """One ask through the real path, then the real footer decision on what it attached."""
    from backend.answer.transparency_service import build_knowledge_base_transparency
    from backend.knowledge import kb_not_in_notes_notice as notice
    from backend.knowledge.kb_attached_notes import _parse_kb_attached_notes

    text_title = "" if app_id.strip() else kb.resolve_title_from_question(settings, question)
    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=True, ask_mode="strategy", question=question, app_id=app_id,
        app_name="", text_resolved_title=text_title)
    if not gate:
        return {"routed": False, "attached": [], "line": False, "method": "-"}
    res = kb.retrieve_knowledge_context(
        settings, ask_mode="strategy", question=question, app_id=app_id, app_name="",
        shortcut_name="", text_resolved_title=text_title, domain=domain, pc_ip=pc_ip)
    tr = build_knowledge_base_transparency(
        attached=res.attached, trust_tier=res.trust_tier, sources=res.sources, notes=res.notes,
        timing_ms=res.timing_ms, unavailable_reason=res.unavailable_reason,
        retrieval_method=res.retrieval_method, kb_domain=domain, best_meaning=res.best_meaning,
        top_card_keyword_score=res.top_card_keyword_score,
        best_meaning_without_game_name=res.best_meaning_without_game_name)
    notes = _parse_kb_attached_notes(
        res.text_block or "", kb_domain=domain, sources=res.sources,
        attached_ids=getattr(res, "attached_ids", None)) if res.attached else []
    line = notice.should_show_no_close_match_notice_for_turn(
        ask_mode="strategy", kb_transparency=tr,
        kb_coverage_transparency={"kb_coverage_status": "sections"},
        text_resolved_title=text_title, question_for_kb_search=question, kb_attached_notes=notes)
    game = text_title or next((n.get("game_title") for n in notes if n.get("game_title")), "")
    # The rule's own helpers when it has them (generic words left out, endings folded the way
    # the keyword search folds them); the plain word split before it did.
    words = notice._content_words(question) - notice._content_words(game)
    subject_of = getattr(notice, "_question_subject_words", None)
    stems = getattr(notice, "_word_stems", lambda ws: set(ws))
    subject = sorted(subject_of(question, game) if subject_of else words)
    in_notes: set[str] = set()
    for n in notes:
        in_notes |= notice._content_words(str(n.get("name") or ""))
        in_notes |= notice._content_words(str(n.get("card") or ""))
    note_stems = stems(in_notes)
    in_notes = {w for w in words if stems({w}) & note_stems}
    return {
        "routed": True, "method": res.retrieval_method, "domain": domain, "route": res.notes,
        "attached": [str(n.get("name") or "") for n in notes], "game": game,
        "keyword_score": round(float(res.top_card_keyword_score or 0.0), 4),
        "best_meaning": res.best_meaning,
        "meaning_without_game": res.best_meaning_without_game_name,
        "subject_words": subject, "subject_in_notes": sorted(set(subject) & in_notes),
        "all_words_in_notes": sorted(in_notes),
        "line": bool(line),
    }


def _gate_asks(titles: dict[str, str]) -> list[dict]:
    """The asks the line gate runs, each with its group and (for a right-note row) its note."""
    with open(FIXTURE, encoding="utf-8") as fh:
        rows = [q for q in json.load(fh)["queries"]
                if q.get("domain") == "strategy" and q.get("expect_section")
                and str(q.get("app_id") or "").strip()]
    with open(ANSWER_FIXTURE, encoding="utf-8") as fh:
        cases = [c for c in json.load(fh)["cases"]
                 if c.get("ask_mode") == "strategy" and c.get("expect_card")]
    base = [(r["id"], r["query"], str(r["app_id"]), r["expect_section"]) for r in rows]
    base += [(c["id"], c["question"], str(c.get("app_id") or ""), c["expect_card"]) for c in cases]
    asks: list[dict] = []
    for rid, q, app_id, want in base:
        if app_id:
            asks.append({"id": rid + "/running", "group": "fixture", "query": q, "app_id": app_id,
                         "want": want})
            title = titles.get(app_id, "")
            if title:
                typed = "%s in %s" % (q.rstrip(" ?.!"), title)
                asks.append({"id": rid + "/typed", "group": "fixture", "query": typed, "app_id": "",
                             "want": want})
        else:
            asks.append({"id": rid + "/typed", "group": "fixture", "query": q, "app_id": "",
                         "want": want})
    for q, app_id, game in DEVICE_SENTENCES:
        asks.append({"id": "device/" + q[:24], "group": "device", "query": q, "app_id": app_id,
                     "want": ""})
    for q, app_id, group in TONIGHT:
        asks.append({"id": group + "/" + q[:24], "group": group, "query": q, "app_id": app_id,
                     "want": ""})
    return asks


def run_line_gate(settings: dict, args: argparse.Namespace) -> int:
    asks = _gate_asks(_game_titles(settings))
    out: list[dict] = []
    for i, ask in enumerate(asks):
        r = line_probe(settings, ask["query"], app_id=ask["app_id"], pc_ip=args.pc_ip)
        r.update(ask)
        r["right_note"] = bool(ask["want"]) and any(
            ask["want"].lower() == n.lower() for n in r["attached"])
        out.append(r)
        if (i + 1) % 100 == 0:
            print("  %d of %d asked" % (i + 1, len(asks)), file=sys.stderr)
    with open(args.line_gate, "w", encoding="utf-8") as fh:
        json.dump({"asks": out}, fh, indent=1)
    before = {}
    if args.compare:
        with open(args.compare, encoding="utf-8") as fh:
            before = {a["id"]: a for a in json.load(fh)["asks"]}

    def group_of(a: dict) -> str:
        if a["group"] == "fixture":
            return "fixture right-note" if a["right_note"] else "fixture other"
        return a["group"]

    print("retrieval method counts: %s" % dict(
        sorted({m: sum(1 for a in out if a["method"] == m) for m in {a["method"] for a in out}}
               .items())))
    print()
    print("%-20s %5s %12s %12s %8s %8s" % ("group", "asks", "line before", "line after",
                                           "gained", "lost"))
    for g in ("fixture right-note", "fixture other", "device", "tonight", "junk",
              "old-false-line"):
        rows = [a for a in out if group_of(a) == g]
        was = [before.get(a["id"], {}).get("line") for a in rows]
        print("%-20s %5d %12s %12d %8s %8s" % (
            g, len(rows), sum(1 for w in was if w) if before else "-",
            sum(1 for a in rows if a["line"]),
            sum(1 for a, w in zip(rows, was) if a["line"] and not w) if before else "-",
            sum(1 for a, w in zip(rows, was) if w and not a["line"]) if before else "-"))
    print()
    print("--- every ask outside the fixture, and every right-note ask whose line changed ---")
    for a in out:
        changed = before and before.get(a["id"], {}).get("line") != a["line"]
        if a["group"] == "fixture" and not changed:
            continue
        print("%s | %s" % (a["id"], a["query"][:70]))
        print("    method=%s keyword=%s meaning=%s attached=[%s]" % (
            a["method"], a.get("keyword_score"), a.get("best_meaning"),
            "; ".join(a["attached"])))
        print("    subject=%s in_notes=%s line %s -> %s" % (
            a.get("subject_words"), a.get("subject_in_notes"),
            before.get(a["id"], {}).get("line", "?"), a["line"]))
    lone = [a for a in out if a["right_note"] and a.get("subject_words")
            and not a.get("subject_in_notes")]
    print()
    print("--- right-note asks with no subject word in any attached note: %d ---" % len(lone))
    for a in lone:
        print("    %s | %s | subject=%s" % (a["id"], a["query"][:60], a["subject_words"]))
    print("\nwrote %s" % args.line_gate)
    return 0


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
    if args.line_gate:
        return run_line_gate(settings, args)

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
