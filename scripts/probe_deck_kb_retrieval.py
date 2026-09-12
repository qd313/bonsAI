#!/usr/bin/env python3
"""Title: Deck knowledge-base retrieval probe

Purpose: Report how many corpus cards actually attach to an Ask, per Ask mode, against the
         corpus installed on this Deck — the number the Show details ladder never prints.
Used for: docs/testing.md rows KB-ASKMODE-01 (card count per mode) and KB-RRF-01 (whether the
          vector half changes which cards are found, not merely their order). Named in the
          KB-ASKMODE-01 row as the way that row is run.
Solves: The transparency ladder shows retrieval method, trust tier, notes and timings, but no
        card count (transparency_service.py, the `kb` chip). So "Speed 1 / Strategy 3 /
        Expert 5" cannot be checked from the screen at all, and the 2026-08-17 QA pass read as
        a pass until the counts were measured here — all three modes attach 1 card for a
        typical boss question, and Expert attaches FEWER than Strategy for some questions
        because it carries the implicit-route relevance floor. Both are open roadmap bugs.
Does not: Write to settings or touch the corpus. Read-only apart from the embedding call
          retrieval itself makes (nomic-embed-text), which is the same call a real Ask makes,
          and — only when `--with-chat-before-search` is passed — one short, throwaway chat
          completion used purely to reproduce the order a real question pays for (see that
          flag's help and docs/knowledge-base.md, "Time budget for a game question").

Run from the maintainer PC with the Deck online:

    ssh deck@$DECK_IP 'python3 -' < scripts/probe_deck_kb_retrieval.py
    ssh deck@$DECK_IP 'python3 - --app-id 620 --app-name "Portal 2" --question "how do gels work"' \
        < scripts/probe_deck_kb_retrieval.py

`--pool` additionally prints the FTS candidate pool at floor 0.0, which is what distinguishes
"the corpus has nothing to say" from "BM25 could not find what is sitting right there".
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request

PLUGIN_DIR = "/home/deck/homebrew/plugins/bonsAI"
SETTINGS_PATH = "/home/deck/homebrew/settings/bonsAI/settings.json"

# Mirrors main.py's own sys.path setup, which is why backend imports are `backend.services.X`.
sys.path.insert(0, PLUGIN_DIR)
sys.path.insert(0, os.path.join(PLUGIN_DIR, "py_modules"))

from backend.services import knowledge_base_service as kb  # noqa: E402
# Both already load transitively through knowledge_base_service -> ollama_embed_service, so
# importing them here adds no new dependency the Deck does not already have on this path.
from backend.ollama_connectivity import ollama_http_base_from_pc_ip_field  # noqa: E402
from backend.ollama_urls import build_ollama_chat_url  # noqa: E402

# Card headers rendered by `_card_lines`: "[Game / type: Name] (trust: tier)".
CARD_HEADER_RE = re.compile(r"^\[.*\(trust: [^)]+\)\s*$", re.M)

# --- Time budget for a game question, with a game running -----------------------------------
#
# See docs/knowledge-base.md, "Time budget for a game question", for the on-device readings
# behind these numbers and why a one-off warm-up does not explain them away.
#
# Strategy and Expert both run the meaning search; the budget is 1.0 s — what the wave-two Deck
# evening's own row already expected ("at or under 1.0 s on the second and third questions").
# Speed must not run the meaning search at all, so any measured time there is over budget.
SEARCH_BUDGET_MS = {
    "speed": 0.0,
    "strategy": 1000.0,
    "expert": 1000.0,
}

# `embed_ms` is 0.0, never None, when the meaning search did not run (knowledge_base_service.py,
# the `embed_ms = 0.0` initialiser before the `nomic_ready and (...)` gate).
_NO_SEARCH_RAN = 0.0

# No clean on-device reading of just "time to the first word" exists yet — the one full-reply
# reading in evidence (69 s, runs/plan46-R2-strategy-half.json) was taken during a prompt-overflow
# bug since fixed, so it is not a fair number to hold today's answers to. This budget borrows the
# app's own existing slow-reply warning as a stand-in (`DEFAULT_LATENCY_WARNING_SECONDS` in
# src/data/bonsaiSettingsSchema.ts) until a real first-word reading replaces it.
FIRST_WORD_BUDGET_MS = 60_000.0


def search_time_verdict(embed_ms: float, mode: str) -> str:
    """Classify a measured meaning-search time against the budget for `mode`. Pure: takes the
    number the retrieval result already reports (`res.timing_ms["embed_ms"]`), returns a verdict
    string, touches nothing else."""
    mode_key = (mode or "").strip().lower()
    if mode_key == "speed":
        if embed_ms is None or embed_ms <= _NO_SEARCH_RAN:
            return "PASS - no meaning search ran, as Speed requires"
        return (
            "OVER BUDGET - meaning search ran in Speed mode (%.0f ms); Speed should not run it "
            "at all" % embed_ms
        )
    budget = SEARCH_BUDGET_MS.get(mode_key, SEARCH_BUDGET_MS["strategy"])
    if embed_ms is None or embed_ms <= _NO_SEARCH_RAN:
        return "PASS - no meaning search ran"
    if embed_ms <= budget:
        return "PASS - %.0f ms (budget %.0f ms)" % (embed_ms, budget)
    return "OVER BUDGET - %.0f ms (budget %.0f ms)" % (embed_ms, budget)


# --- Reproducing the order a real question pays for ------------------------------------------
#
# runs/plan48-R6-time-budget.json: this probe read 23-38 ms and printed PASS while a real Ask on
# the same Deck, minutes apart, read 1067 ms for the same step and would have printed OVER
# BUDGET. The difference is not a fresh process (two separate probe runs both read fast — same
# evidence file) — it is that a real Ask always runs the chat model for the *previous* question
# right before the embedding call for the *next* one, and this probe never asks the chat model at
# all. `--with-chat-before-search` makes it do so, once, immediately before a reading that needs
# the meaning search; without that flag, a reading that would otherwise say PASS is downgraded to
# NOT VERIFIED instead, because it has not paid the cost a real question pays and cannot speak for
# the device.
def real_ask_search_verdict(embed_ms: float, mode: str, *, chat_ran_first: bool) -> str:
    """Wrap `search_time_verdict` with whether a chat completion ran immediately before this
    reading was taken — the order a real second-or-later question pays for. Pure, like
    `search_time_verdict`: takes the same number plus one flag, returns a verdict string.

    Only a genuine "inside budget" PASS depends on that order, so only that case is downgraded.
    "No meaning search ran" is a fact about this reading regardless of what ran before it, and an
    OVER BUDGET reading is already the worse news either way — neither is touched."""
    verdict = search_time_verdict(embed_ms, mode)
    if chat_ran_first or "no meaning search ran" in verdict:
        return verdict
    if verdict.startswith("PASS"):
        return (
            "NOT VERIFIED - " + verdict + " -- taken without a chat call first, so this does "
            "not reproduce what a real question pays for and cannot clear the device. Pass "
            "--with-chat-before-search to check for real."
        )
    return verdict


# The standard Tier-2 ask model (py_modules/backend/ollama_routing.py:96) — used only when
# settings.json has no saved try order to read a model from, which a fresh install would not.
DEFAULT_ASK_MODEL_FALLBACK = "gemma4:e2b-it-qat"


def ask_model_from_settings(settings: dict) -> str:
    """The model a real Ask would try first, read from the Deck's own settings rather than
    hard-coded. `text_model_routing_order` (main.py, `merge_pulled_tags_into_routing_orders`) is
    the person's own saved try order; its first entry is what a real Ask reaches for first."""
    order = settings.get("text_model_routing_order")
    if isinstance(order, list):
        for tag in order:
            t = str(tag or "").strip()
            if t:
                return t
    return DEFAULT_ASK_MODEL_FALLBACK


def run_short_chat_before_search(pc_ip: str, model: str, timeout_s: float = 120.0) -> float:
    """POST one short, throwaway `/api/chat` completion and return its wall time in milliseconds.

    Simulates the chat generation a real previous Ask already paid for, so whatever it leaves
    behind is already paid before the embedding call that follows is timed. Raises on any HTTP,
    JSON or shape problem — the caller decides whether an unreachable chat model should stop the
    reading or just leave it unverified."""
    url = build_ollama_chat_url(ollama_http_base_from_pc_ip_field(pc_ip))
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with one word: ready"}],
            "stream": False,
            "think": False,
            "options": {"num_predict": 8},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        resp.read()
    return round((time.perf_counter() - t0) * 1000, 2)


def first_word_verdict(reply_ms):
    """Classify a measured time from pressing Ask to the first word landing on screen. Pure, same
    shape as `search_time_verdict`. This probe never times a full reply itself (the one throwaway
    chat call `--with-chat-before-search` can make is 8 tokens, only to prime the search timing —
    see the module docstring), so `reply_ms` is supplied by hand — see `--reply-ms` — by someone
    timing a real Ask on the device."""
    if reply_ms is None:
        return "not measured"
    if reply_ms <= FIRST_WORD_BUDGET_MS:
        return "PASS - %.1f s (budget %.0f s)" % (reply_ms / 1000.0, FIRST_WORD_BUDGET_MS / 1000.0)
    return "OVER BUDGET - %.1f s (budget %.0f s)" % (
        reply_ms / 1000.0,
        FIRST_WORD_BUDGET_MS / 1000.0,
    )


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--question", default="how do i beat the glyphid dreadnought")
    p.add_argument("--app-id", default="2321470")
    p.add_argument("--app-name", default="Deep Rock Galactic: Survivor")
    p.add_argument("--shortcut-name", default="")
    p.add_argument(
        "--pc-ip",
        default="127.0.0.1",
        help="Ollama host for embeddings. The frontend supplies this at Ask time, so it is not "
             "in settings.json; 127.0.0.1 is right when Ollama runs on the Deck.",
    )
    p.add_argument("--modes", default="speed,strategy,expert")
    p.add_argument("--pool", action="store_true", help="also dump the FTS candidate pool")
    p.add_argument(
        "--reply-ms",
        type=float,
        default=None,
        help="Milliseconds from pressing Ask to the first word landing on screen, timed by hand "
             "on the device (this probe does not itself ask the chat model). Prints the time "
             "budget's verdict for that reading; omit to skip the check.",
    )
    p.add_argument(
        "--with-chat-before-search",
        action="store_true",
        help="Before timing a mode that runs the meaning search, first run one short, throwaway "
             "chat completion (model read from settings.json's saved try order) so the timing "
             "reflects what a real second-or-later question pays, not a cold-free reading no "
             "real Ask gets. Costs real time and memory on the Deck, so it is opt-in. Without "
             "it, a reading that would say PASS prints NOT VERIFIED instead — see "
             "docs/knowledge-base.md, 'Time budget for a game question'.",
    )
    return p.parse_args()


def card_names(text_block: str) -> list[str]:
    return [h.strip() for h in CARD_HEADER_RE.findall(text_block or "")]


def main() -> int:
    args = parse_args()
    with open(SETTINGS_PATH, "r", encoding="utf-8") as fh:
        settings = json.load(fh)

    db_path = kb.resolve_corpus_db_path(settings)
    if not db_path:
        print("no corpus installed — `rag_corpus_path` is unset or corpus.db is missing")
        return 2

    print("corpus     :", db_path)
    print("kb enabled :", settings.get("use_local_knowledge_base"))
    print("hybrid     :", settings.get("rag_hybrid_retrieval_enabled") is not False)
    print("question   :", repr(args.question))
    print("game       : %s / %s" % (args.app_id or "(none)", args.app_name or "(none)"))
    print()

    # D19 (game_ai_request.py:296-298): with nothing running, a title the *question* names is
    # the only way into the strategy corpus -- and the caller has to resolve it. This probe
    # omitted that until 2026-08-22, so every KB-NEWTITLE-01 case read as gate=False here while
    # working in the product. Resolved only when Steam gives neither an AppID nor a name, so a
    # running game always wins.
    text_resolved_title = ""
    if not str(args.app_id or "").strip() and not str(args.app_name or "").strip():
        text_resolved_title = kb.resolve_title_from_question(settings, args.question)
    print("from text  :", text_resolved_title or "(none)")

    conn = kb._get_connection(db_path)
    game_id, resolution = kb._resolve_game_id(
        conn,
        app_id=args.app_id,
        app_name=args.app_name or text_resolved_title,
        shortcut_name=args.shortcut_name,
    )
    print("resolved   : game_id=%s via %s" % (game_id, resolution or "(unresolved)"))
    if game_id is not None:
        rows = conn.execute(
            "SELECT section_type, name FROM sections WHERE game_id=? ORDER BY section_type, name",
            (game_id,),
        ).fetchall()
        print("corpus has : %d section(s) for this title" % len(rows))
        for r in rows:
            print("               [%s] %s" % (r["section_type"], r["name"]))
    print()

    if args.pool and game_id is not None:
        expanded = kb._expand_query(args.question, args.app_name, game_resolved=True)
        print("FTS candidate pool (floor 0.0, shortlist %d) — the ceiling on every mode below:"
              % kb.HYBRID_FTS_SHORTLIST_K)
        print("  expanded query: %r" % expanded)
        pool = kb._search_sections(
            conn, game_id=game_id, query=expanded,
            top_k=kb.HYBRID_FTS_SHORTLIST_K, min_relevance=0.0,
        )
        if not pool:
            print("  EMPTY — no card is reachable for this phrasing, whatever the mode budget is.")
        for c in pool:
            print("  bm25=%6.2f  %s" % (c.bm25_score, c.name))
        print()

    ask_model = ""
    if args.with_chat_before_search:
        ask_model = ask_model_from_settings(settings)
        print("chat model : %s (from settings' saved try order, or the Tier-2 fallback)" % ask_model)
        print()

    print("%-9s %-7s %-9s %-8s %s" % ("MODE", "BUDGET", "FLOOR", "ATTACHED", "CARDS"))
    for mode in [m.strip() for m in args.modes.split(",") if m.strip()]:
        top_k, _max_bytes = kb._budget_for_mode(mode)
        # `implicit_route` in retrieve_knowledge_context tests for Strategy by name, so every
        # other mode — Expert included — gets the stricter floor. That asymmetry is the point.
        floor = "1.0 expl" if mode == "strategy" else "4.0 impl"
        gate, domain = kb.should_retrieve_knowledge(
            use_local_knowledge_base=bool(settings.get("use_local_knowledge_base")),
            ask_mode=mode,
            question=args.question,
            app_id=args.app_id,
            app_name=args.app_name,
            text_resolved_title=text_resolved_title,
        )
        if not gate:
            print("%-9s %-7d %-9s %-8s gate=False (domain routing declined)"
                  % (mode, top_k, floor, "-"))
            continue

        # Speed never runs the meaning search (see SEARCH_BUDGET_MS above), so priming it with a
        # chat call would cost real Deck time for a reading the flag cannot change the meaning of.
        chat_ran_first = False
        if args.with_chat_before_search and mode != "speed":
            try:
                chat_ms = run_short_chat_before_search(args.pc_ip, ask_model)
                print("            chat warm-up: %.0f ms (model=%s)" % (chat_ms, ask_model))
                chat_ran_first = True
            except Exception as exc:  # noqa: BLE001 - reported, not fatal to the rest of the probe
                print("            chat warm-up FAILED (%s) — this mode's reading stays unverified"
                      % exc)

        res = kb.retrieve_knowledge_context(
            settings,
            ask_mode=mode,
            question=args.question,
            app_id=args.app_id,
            app_name=args.app_name,
            shortcut_name=args.shortcut_name,
            text_resolved_title=text_resolved_title,
            domain=domain,
            pc_ip=args.pc_ip,
        )
        names = card_names(res.text_block)
        # Greedy up to the LAST ": " — game titles contain colons ("Deep Rock Galactic: Survivor"),
        # so a lazy match keeps half the title and drops the section type.
        short = [re.sub(r"^\[.*: (.*?)\].*$", r"\1", n) for n in names]
        print("%-9s %-7d %-9s %-8d %s" % (mode, top_k, floor, len(names), ", ".join(short) or "-"))
        print("            method=%s trust=%s notes=%s sources=%d%s"
              % (res.retrieval_method, res.trust_tier, res.notes or "-", len(res.sources),
                 "  [budget-truncated]" if "omitted to fit budget" in (res.text_block or "") else ""))
        embed_ms = (res.timing_ms or {}).get("embed_ms")
        print("            search time: %s"
              % real_ask_search_verdict(embed_ms, mode, chat_ran_first=chat_ran_first))

    print()
    print("first word : %s" % first_word_verdict(args.reply_ms))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
