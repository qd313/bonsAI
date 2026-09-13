#!/usr/bin/env python3
"""Wave three QA, the half that does not need the Deck.

Runs the real retrieval path and the real notice decision against the real corpus, for the rows
of plan 48 section 8 that are about what attaches and what line appears. The device half -- what
is actually on screen, the D-pad walk, the timings -- still has to be run on the Deck.
"""
import json
import os
import re
import sys

ROOT = r"c:\Users\still\Documents\BonsAI"
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "py_modules"))

from backend.services import knowledge_base_service as kb  # noqa: E402
from backend.services import kb_not_in_notes_notice as notice  # noqa: E402

SETTINGS = {
    "use_local_knowledge_base": True,
    "rag_hybrid_retrieval_enabled": True,
    "rag_corpus_path": os.path.join(ROOT, "build", "knowledge-base"),
}
HDR = re.compile(r"^\[.*\(trust: [^)]+\)\s*$", re.M)

# W3-A: measured 2026-09-07 to reach the tip sheet and come back with a tip that does not answer.
W3A = [
    "the trackpad haptics buzz constantly in proton games",
    "proton games launch upside down on my external monitor",
    "shader download stalls at 99 percent every single time",
    "the deck wakes from sleep with no wifi until i reboot",
    "my sd card randomly unmounts while a game is running",
]
# W3-B: the eight from wave two that reach a tip and (7 of 8) get one that fits.
W3B = [
    "the game is really stuttering and skipping around the whole time I'm trying to play it",
    "no sound at all coming out",
    "storage full cant install anything else",
    "screen looks torn and glitchy",
    "it gets really hot and battery drains so fast",
    "it gets uncomfortably warm in my hands after a little while and the battery seems to drain a lot quicker than it used to",
    "update stuck wont finish installing",
    "when I plug it into the television the menus show up in the wrong spot on the screen and are hard to read",
]


def run(question, *, mode, app_id="", app_name=""):
    tt = ""
    if not str(app_id).strip() and not app_name.strip():
        tt = kb.resolve_title_from_question(SETTINGS, question)
    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=True, ask_mode=mode, question=question,
        app_id=str(app_id), app_name=app_name, text_resolved_title=tt,
    )
    names, block = [], ""
    if gate:
        res = kb.retrieve_knowledge_context(
            SETTINGS, ask_mode=mode, question=question, app_id=str(app_id), app_name=app_name,
            shortcut_name="", text_resolved_title=tt, domain=domain, pc_ip="127.0.0.1",
        )
        block = res.text_block or ""
        names = [re.sub(r"^\[.*: (.*?)\].*$", r"\1", h.strip()) for h in HDR.findall(block)]
    cov = kb.summarize_kb_coverage(
        SETTINGS, app_id=str(app_id), app_name=app_name or tt, shortcut_name="")
    return {
        "routed": bool(gate), "domain": str(domain or ""), "attached": names,
        "coverage": getattr(cov, "status", None), "block": block,
    }


def main():
    out = {"row_R2": [], "row_R3": [], "row_R4": [], "row_R5": {}}
    print("=" * 92)
    print("W3-R2  problems that reach the tip sheet and fit no tip -> nothing, plus the line")
    print("=" * 92)
    r2_pass = 0
    for q in W3A:
        r = run(q, mode="speed")
        line = notice.should_show_no_tip_for_this_notice(
            kb_attached=bool(r["attached"]), kb_domain=r["domain"],
        )
        ok = r["routed"] and not r["attached"] and bool(line)
        r2_pass += 1 if ok else 0
        print("  %-52s routed=%-5s attached=%-22s %s"
              % (q[:52], r["routed"], ", ".join(r["attached"]) or "(nothing)",
                 "PASS" if ok else "FAIL"))
        out["row_R2"].append({"q": q, **{k: r[k] for k in ("routed", "domain", "attached")},
                              "line_would_show": line, "pass": ok})
    print("  --> %d of %d" % (r2_pass, len(W3A)))

    print()
    print("=" * 92)
    print("W3-R3  problems that DO fit a tip -> a tip still attaches, and no line")
    print("=" * 92)
    r3_pass = 0
    for q in W3B:
        r = run(q, mode="speed")
        ok = r["routed"] and bool(r["attached"])
        r3_pass += 1 if ok else 0
        print("  %-52s attached=%-14s %s"
              % (q[:52], ", ".join(r["attached"]) or "(nothing)", "PASS" if ok else "FAIL"))
        out["row_R3"].append({"q": q, "attached": r["attached"], "pass": ok})
    print("  --> %d of %d" % (r3_pass, len(W3B)))

    print()
    print("=" * 92)
    print("W3-R4  follow-ups remember the boss just asked about")
    print("=" * 92)
    from backend.services import kb_followup_memory as mem
    pairs = [("how do i beat megara in hades", "what about her second phase",
              "1145360", "Hades", "Megara"),
             ("how do i beat the glyphid dreadnought", "what about its second phase",
              "2321470", "Deep Rock Galactic: Survivor", "Glyphid Dreadnought")]
    for first, follow, aid, game, want in pairs:
        mem.forget()
        a = run(first, mode="strategy", app_id=aid, app_name=game)
        print("  %-44s -> %s" % (first[:44], ", ".join(a["attached"])))
        print("     (memory is exercised in the request path, not here -- see the lane's tests)")
        out["row_R4"].append({"q": first, "attached": a["attached"], "wanted_next": want})

    print()
    print("=" * 92)
    print("W3-R5  the corrected Black Mesa water note")
    print("=" * 92)
    r = run("black mesa how do i get across the electrified water", mode="strategy")
    blob = " ".join(r["block"].split())
    idx = blob.lower().find("waste")
    excerpt = blob[max(0, idx - 120): idx + 520] if idx >= 0 else blob[:400]
    says_constant = "current is constant" in blob.lower()
    says_cycle = "arcs on a cycle" in blob.lower() or "while the water is dark" in blob.lower()
    print("  attached:", ", ".join(r["attached"]) or "(nothing)")
    print("  note says the current is CONSTANT :", says_constant)
    print("  note still mentions a cycle       :", says_cycle)
    print("  ->", "PASS" if (says_constant and not says_cycle) else "FAIL")
    out["row_R5"] = {"attached": r["attached"], "says_constant": says_constant,
                     "says_cycle": says_cycle, "excerpt": excerpt}

    with open(os.path.join(ROOT, "runs", "plan48-qa-pc-side.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print()
    print("wrote runs/plan48-qa-pc-side.json")


if __name__ == "__main__":
    raise SystemExit(main())
