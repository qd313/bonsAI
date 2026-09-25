#!/usr/bin/env python3
"""Title: Knowledge-base pinned-chip batch verification

Purpose: Check, against today's library and today's code, what each candidate sentence in the
         wave-three device-evening batch actually does -- so the row can be written true before
         the maintainer is asked to approve pinning it, or the sentence can be dropped.
Used for: docs/archive/48-kb-wave-three-session.md, the lane W3-deckcheck brief. Produces
          runs/plan48-deck-batch-verification.json. Not itself a test; nothing here is asserted,
          only measured and reported.
Solves: Every sentence on the candidate list was drafted before this wave's floor (D87) and its
        three attribution lines (D86, D87, D88) landed. A sentence that no longer reaches the
        code path its row assumes makes that row pass or fail for the wrong reason -- this repo
        has burned a device evening on exactly that once already (plan 47's problem-sentence
        batch, see docs/roadmap.md's knowledge-base bugs). This script runs each candidate
        through the real routing and retrieval entry points -- should_retrieve_knowledge,
        retrieve_knowledge_context, summarize_kb_coverage, and the three
        kb_not_in_notes_notice.should_show_* functions -- the same functions
        game_ai_request.py calls for a live Ask -- against a corpus built fresh for this run, and
        records what actually happens.
Does not: Ask anything of Ollama's chat model (only the embedding call retrieval itself makes),
          change any product code, or write to settings.json. Read-only against the corpus this
          run built under build/knowledge-base/, which is git-ignored and never committed.

Run from the maintainer PC with Ollama serving nomic-embed-text at 127.0.0.1:11434:

    python scripts/measure_kb_batch_verification.py --corpus-dir build/knowledge-base \
        --out runs/plan48-deck-batch-verification.json

Building a fresh corpus first (wave three's own rule -- a number taken on a stale copy is void):

    python scripts/build_rag_db.py --seed --out build/knowledge-base

This script does not rebuild the corpus itself; scripts/eval_kb_embed_models.py's
``_ensure_seed_db`` already owns that staleness check (data/kb/strategy_seed.json,
data/kb/compat_patterns.json, scripts/build_rag_db.py newer than corpus.db means the copy is
void) and this script is not the place to duplicate it. Build (or refresh) the corpus with the
command above before running this one; ``--corpus-dir`` just points at whatever copy is current.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
PY_MODULES = REPO_ROOT / "py_modules"
if str(PY_MODULES) not in sys.path:
    sys.path.insert(0, str(PY_MODULES))

from backend.services import knowledge_base_service as kb  # noqa: E402
from backend.services import kb_followup_memory  # noqa: E402
from backend.services import kb_not_in_notes_notice as notices  # noqa: E402
from backend.services.ollama_prompts import kb_card_names, extract_strategy_asked_entity  # noqa: E402

CORPUS_DB_FILENAME = "corpus.db"

# Card headers rendered by knowledge_base_service's card block, same shape probe_deck_kb_retrieval.py
# already matches: "[Game / type: Name] (trust: tier)" or "[Tip: Name] (trust: tier)".
_CARD_HEADER_RE = re.compile(r"^\[.*\(trust: [^)]+\)\s*$", re.M)


def build_settings(corpus_dir: Path) -> dict:
    """The subset of settings.json the retrieval entry points read. No device settings file is
    involved -- this is a PC-side measurement, not a Deck probe."""
    return {
        "use_local_knowledge_base": True,
        "rag_corpus_path": str(corpus_dir),
        "rag_hybrid_retrieval_enabled": True,
    }


def measure_one(
    settings: dict,
    question: str,
    *,
    ask_mode: str = "speed",
    app_id: str = "",
    app_name: str = "",
    shortcut_name: str = "",
) -> dict[str, Any]:
    """Run one question through the same sequence of calls game_ai_request.py makes for a live
    Ask, and report routing, attachment, and which footer line (if any) would fire.

    Mirrors game_ai_request.py's own order: resolve a text title only when nothing is running
    (D19), gate + route, retrieve, compute coverage against the *running* game only (coverage
    never reads the text-resolved title -- see game_ai_request.py's summarize_kb_coverage call),
    then evaluate the three footer checks exactly as the call site does.
    """
    text_resolved_title = ""
    if not str(app_id or "").strip() and not str(app_name or "").strip():
        text_resolved_title = kb.resolve_title_from_question(settings, question)

    gate, domain = kb.should_retrieve_knowledge(
        use_local_knowledge_base=bool(settings.get("use_local_knowledge_base")),
        ask_mode=ask_mode,
        question=question,
        app_id=app_id,
        app_name=app_name,
        text_resolved_title=text_resolved_title,
    )

    result = None
    if gate:
        result = kb.retrieve_knowledge_context(
            settings,
            ask_mode=ask_mode,
            question=question,
            app_id=app_id,
            app_name=app_name,
            shortcut_name=shortcut_name,
            text_resolved_title=text_resolved_title,
            domain=domain,
            pc_ip="127.0.0.1",
        )

    kb_attached = bool(result.attached) if result is not None else False
    kb_notes = str(result.notes or "") if result is not None else ""
    kb_unavailable_reason = str(result.unavailable_reason or "") if result is not None else ""
    kb_best_meaning = result.best_meaning if result is not None else None
    kb_top_card_keyword_score = float(result.top_card_keyword_score or 0.0) if result is not None else 0.0
    text_block = result.text_block if (result is not None and kb_attached) else ""
    attaches = kb_card_names(text_block)

    coverage = kb.summarize_kb_coverage(
        settings, app_id=app_id, app_name=app_name, shortcut_name=shortcut_name
    )
    coverage_status = coverage.status

    show_no_tip_for_this = notices.should_show_no_tip_for_this_notice(
        kb_attached=kb_attached,
        kb_domain=domain,
        kb_unavailable_reason=kb_unavailable_reason,
        kb_notes=kb_notes,
    )
    show_not_in_notes = notices.should_show_not_in_notes_notice(
        ask_mode=ask_mode,
        kb_attached=kb_attached,
        kb_coverage_status=coverage_status,
    ) and not show_no_tip_for_this
    show_no_close_match = notices.should_show_no_close_match_notice(
        ask_mode=ask_mode,
        kb_attached=kb_attached,
        kb_coverage_status=coverage_status,
        kb_domain=domain,
        kb_best_meaning=kb_best_meaning,
        kb_top_card_keyword_score=kb_top_card_keyword_score,
    )

    line = "none"
    if show_no_tip_for_this:
        line = "no_tip_for_this"
    elif show_not_in_notes:
        line = "not_in_notes"
    elif show_no_close_match:
        line = "no_close_match"

    if not gate:
        routed_to = "neither"
    elif domain == "compat":
        routed_to = "tips"
    elif domain == "strategy":
        routed_to = "notes"
    else:
        routed_to = "neither"

    return {
        "question": question,
        "chars": len(question),
        "ask_mode": ask_mode,
        "app_id": app_id,
        "app_name": app_name,
        "gate": gate,
        "domain": domain,
        "routed_to": routed_to,
        "text_resolved_title": text_resolved_title,
        "kb_coverage_status": coverage_status,
        "attached": kb_attached,
        "attaches": attaches,
        "card_text": text_block.strip(),
        "kb_notes": kb_notes,
        "kb_unavailable_reason": kb_unavailable_reason,
        "kb_best_meaning": kb_best_meaning,
        "kb_top_card_keyword_score": kb_top_card_keyword_score,
        "line": line,
    }


def measure_followup_pair(
    settings: dict,
    *,
    first_question: str,
    followup_question: str,
    app_id: str,
    app_name: str,
    ask_mode: str = "strategy",
) -> dict[str, Any]:
    """Reproduce game_ai_request.py's follow-up-memory sequence (kb_followup_memory.py) for one
    game: ask the first question, remember its subject the way the real call site does, then run
    the follow-up both with and without that memory. ``forget()`` brackets the whole thing so this
    run's use of the module-level memory singleton cannot leak into or out of any other call this
    process makes.
    """
    kb_followup_memory.forget()

    first = measure_one(settings, first_question, ask_mode=ask_mode, app_id=app_id, app_name=app_name)
    first_text_block = ""
    if first["attached"]:
        # Re-run once more to get the raw text block for card-name extraction consistent with
        # game_ai_request.py's own strategy_spoiler_asked_entity call (it reads kb_text, not the
        # already-stripped attaches list, when picking the followup subject).
        result = kb.retrieve_knowledge_context(
            settings,
            ask_mode=ask_mode,
            question=first_question,
            app_id=app_id,
            app_name=app_name,
            shortcut_name="",
            text_resolved_title="",
            domain=first["domain"],
            pc_ip="127.0.0.1",
        )
        if result.attached:
            first_text_block = result.text_block

    asked_entity = extract_strategy_asked_entity(
        first_question, known_entities=kb_card_names(first_text_block)
    )
    followup_subject = asked_entity or next(iter(kb_card_names(first_text_block)), "")
    kb_followup_memory.remember(
        app_id=app_id, app_name=app_name, text_resolved_title="", subject=followup_subject
    )

    # Without memory: the bare follow-up question goes to search unmodified, as it would if the
    # feature did not exist.
    without_memory = measure_one(
        settings, followup_question, ask_mode=ask_mode, app_id=app_id, app_name=app_name
    )

    # With memory: reproduce game_ai_request.py's gate (kb_memory_eligible and kb_domain ==
    # "strategy") and augmentation before retrieval.
    remembered_subject = kb_followup_memory.recall(app_id=app_id, app_name=app_name, text_resolved_title="")
    question_for_kb_search = followup_question
    if remembered_subject and not extract_strategy_asked_entity(followup_question):
        question_for_kb_search = kb_followup_memory.augment_search_words(
            followup_question, remembered_subject=remembered_subject
        )
    with_memory = measure_one(
        settings, question_for_kb_search, ask_mode=ask_mode, app_id=app_id, app_name=app_name
    )
    # The chip / line fields on with_memory describe the augmented search string, not the
    # question the person actually typed -- record what they typed separately.
    with_memory["question_as_typed"] = followup_question
    with_memory["question_sent_to_search"] = question_for_kb_search

    kb_followup_memory.forget()

    return {
        "remembered_subject": followup_subject,
        "first_question": first,
        "follow_up_without_memory": without_memory,
        "follow_up_with_memory": with_memory,
    }


GROUP1_SENTENCES = [
    "the trackpad haptics buzz constantly in proton games",
    "proton games launch upside down on my external monitor",
    "shader download stalls at 99 percent every single time",
    "the deck wakes from sleep with no wifi until i reboot",
    "my sd card randomly unmounts while a game is running",
]

GROUP2_SENTENCES = [
    "the game is really stuttering and skipping around the whole time I'm trying to play it",
    "no sound at all coming out",
    "storage full cant install anything else",
    "screen looks torn and glitchy",
    "it gets really hot and battery drains so fast",
    "it gets uncomfortably warm in my hands after a little while and the battery seems to drain a lot quicker than it used to",
    "update stuck wont finish installing",
    "when I plug it into the television the menus show up in the wrong spot on the screen and are hard to read",
    "thank you very much",
]


def run_group1(settings: dict) -> dict[str, Any]:
    rows = []
    for q in GROUP1_SENTENCES:
        # Speed is the app's default mode, and the meaning search (what the new floor judges)
        # is switched off entirely in Speed mode by design (D62 #2 -- see
        # knowledge_base_service.py's `speed_mode` gate on `nomic_ready`). Strategy is run
        # alongside it so a reader can see whether the floor would reject the tip at all when it
        # is actually allowed to run.
        speed_row = measure_one(settings, q, ask_mode="speed")
        strategy_row = measure_one(settings, q, ask_mode="strategy")
        rows.append(
            {
                "question": q,
                "chars": len(q),
                "in_speed_mode_the_apps_default": speed_row,
                "in_strategy_mode_meaning_search_on": strategy_row,
                "floor_rejects_it_even_with_meaning_search_on": not strategy_row["attached"],
            }
        )
    return {
        "what_this_means": (
            "These five questions used to reach the tip sheet but come back with a tip that "
            "did not answer them. The idea was that this wave's change would now leave them "
            "with nothing attached and a line saying no tip fit -- not silence, and not a wrong "
            "tip. Measured here: on today's library, none of the five reach that state. A tip "
            "still attaches every time, in every mode, and the tips are mostly still not about "
            "what was actually asked -- see each row's attached tip text."
        ),
        "rows": rows,
    }


def run_group2(settings: dict) -> dict[str, Any]:
    rows = [measure_one(settings, q, ask_mode="speed") for q in GROUP2_SENTENCES]
    return {
        "what_this_means": (
            "The first eight questions are meant to bring back a tip about the right problem. "
            "The last one, a plain thank-you, is meant to bring back nothing at all -- if it "
            "attached a tip, that would be a mistake worth flagging on its own. The television "
            "one is a known exception: the roadmap already records it coming back with a tip "
            "about Big Picture Mode versus Desktop Mode, which does not answer a question about "
            "a screen plugged into a TV. Measured again here on the fresh library: it still "
            "does, in every mode, so it still does not belong in the 'attaches the right tip' "
            "bucket."
        ),
        "rows": rows,
    }


def run_group3(settings: dict) -> dict[str, Any]:
    q1 = measure_one(
        settings,
        "how do i tame a horse in black mesa",
        ask_mode="strategy",
        app_id="",
        app_name="",
    )
    q2 = measure_one(
        settings, "qqqq zzzz wwww", ask_mode="strategy", app_id="362890", app_name="Black Mesa"
    )
    # q2 is run against Black Mesa above only as a domain sanity check; the brief's actual case
    # is Hades running -- see q2_hades below. Kept both so a reviewer can see the "no game
    # resolves" shape is not what drives the result.
    q2_hades = measure_one(
        settings, "qqqq zzzz wwww", ask_mode="strategy", app_id="1145360", app_name="Hades"
    )
    q3 = measure_one(
        settings,
        "how do i beat the bone hydra in hades",
        ask_mode="strategy",
        app_id="1145360",
        app_name="Hades",
    )
    control = measure_one(
        settings,
        "how do i beat the glyphid dreadnought",
        ask_mode="strategy",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
    )
    return {
        "what_this_means": (
            "This line only shows up when a note DID attach but was a weak match for the "
            "question. Measured here: with a game actually running (the two Hades questions), "
            "it does. But with nothing running and the game only named in the question (the "
            "Black Mesa horse question), the line can never show up no matter how badly the "
            "question misses -- the app only checks whether a game's notes are covered against "
            "a running or launched game, never against a game a question merely names, so a "
            "text-named game always reads as 'no game to check coverage for' even while a note "
            "from it is attaching. See the report for the file and line this comes from; it is "
            "not something this lane changed or fixed."
        ),
        "how_do_i_tame_a_horse_black_mesa_named_nothing_running": q1,
        "qqqq_zzzz_wwww_hades_running": q2_hades,
        "qqqq_zzzz_wwww_black_mesa_running_sanity_check_only": q2,
        "how_do_i_beat_the_bone_hydra_in_hades_hades_running": q3,
        "well_covered_control_glyphid_dreadnought_drg_running": control,
    }


def run_group4(settings: dict) -> dict[str, Any]:
    pair = measure_followup_pair(
        settings,
        first_question="how do i beat the glyphid dreadnought",
        followup_question="what about its second phase",
        app_id="2321470",
        app_name="Deep Rock Galactic: Survivor",
        ask_mode="strategy",
    )
    device_evidence_path = REPO_ROOT / "runs" / "plan48-R4-followup-memory.json"
    device_evidence = None
    if device_evidence_path.is_file():
        device_evidence = json.loads(device_evidence_path.read_text(encoding="utf-8"))
    return {
        "what_this_means": (
            "This checks a two-question exchange about the Glyphid Dreadnought boss in Deep "
            "Rock Galactic: Survivor. The first question should bring back the right boss's "
            "note. The short follow-up after it, 'what about its second phase', has no boss "
            "name of its own, so this checks which notes come back for it with the new memory "
            "feature on and with it switched off, on this machine, against what the device saw."
        ),
        "measured_here": pair,
        "device_evidence_file": "runs/plan48-R4-followup-memory.json",
        "device_evidence_search_half": (device_evidence or {}).get("search_half"),
    }


def run_group5(settings: dict) -> dict[str, Any]:
    # "how do i beat megaera" (the boss's real spelling in Hades) was tried first and dropped:
    # the corpus's own card is titled "Megara" (missing an e), so the keyword half never ranks
    # it and the meaning half alone lands just under the thin-match ceiling, adding a "no close
    # match" footer that would distract from the thing being shown off. Worth a maintainer look
    # as its own small thing (see report), but not a good demo sentence, so Theseus and Asterius
    # stands in as this wave's clean Hades example instead.
    candidates = [
        ("how do i beat theseus and asterius", "1145360", "Hades"),
        ("how does the excursion funnel work in portal 2", "620", "Portal 2"),
        ("how do i beat the gonarch in black mesa", "362890", "Black Mesa"),
    ]
    rows = []
    for question, app_id, app_name in candidates:
        row = measure_one(settings, question, ask_mode="strategy", app_id=app_id, app_name=app_name)
        rows.append(row)
    return {
        "what_this_means": (
            "A Strategy answer about a named boss or thing now leads with the note's advice "
            "first, instead of a short scene-setting sentence before it. Nobody has read one of "
            "these on the device yet. These three questions each name something the library has "
            "a note for, so pinning them would show the new shape off."
        ),
        "candidates": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus-dir",
        type=Path,
        default=REPO_ROOT / "build" / "knowledge-base",
        help="Directory holding corpus.db (default: build/knowledge-base).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "runs" / "plan48-deck-batch-verification.json",
    )
    args = parser.parse_args()

    db_path = args.corpus_dir / CORPUS_DB_FILENAME
    if not db_path.is_file():
        print(
            f"no corpus at {db_path} -- build one first, e.g.\n"
            f"  python scripts/build_rag_db.py --seed --out {args.corpus_dir}",
            file=sys.stderr,
        )
        return 2

    settings = build_settings(args.corpus_dir)

    conn = kb._get_connection(str(db_path))
    game_count = conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    section_count = conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
    compat_count = conn.execute("SELECT COUNT(*) FROM compat_patterns").fetchone()[0]

    output = {
        "library_measured": {
            "path": str(db_path),
            "mtime": db_path.stat().st_mtime,
            "games": game_count,
            "strategy_sections": section_count,
            "troubleshooting_tips": compat_count,
        },
        "group_1_tips_find_nothing_that_fits": run_group1(settings),
        "group_2_tips_should_attach_the_right_one": run_group2(settings),
        "group_3_no_close_match_line": run_group3(settings),
        "group_4_followup_pair": run_group4(settings),
        "group_5_new_answer_shape_candidates": run_group5(settings),
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
