"""Title: Suggested-question chips and corpus coverage for the running game

Purpose: Two things the rest of the plugin asks the knowledge base for that
are not "search for this question" -- a set of ready-made question chips to
show under the running game (so a player who does not know what to ask can
still tap something), and a plain coverage count ("does the corpus know
anything about this game at all") used to decide whether an honesty line is
owed on a reply. Also holds `stack_context_blocks()`, the shared shape that
records what actually survived once the knowledge block and a Proton log are
stacked together under one byte budget.

Used for: `suggest_chip_candidates()` is called once per running game to
build the RAG chip row. `summarize_kb_coverage()` backs the "not in my
notes" honesty line in kb_not_in_notes_notice.py.
`session_rag_chip_candidates_to_rpc()` is the RPC-facing serializer for the
first.

Solves: A chip carousel built from raw section names read "How do I beat
Praetorian?" six times over once one title's card count skewed toward one
kind -- `_list_game_sections_for_chips()` round-robins across kinds instead
of taking the first N by kind. Coverage reporting used to conflate "nothing
is running" with "a game is running but the corpus has nothing for it";
`summarize_kb_coverage()` tells those two apart.

Does not: Run the search used for an actual Ask -- see
knowledge_base_search.py. This file only reads how many cards a game has and
what their names and kinds are.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from typing import Any, Optional

from backend.services.knowledge_base_cards import _get_connection, close_connection
from backend.services.knowledge_base_game_match import _resolve_game_id
from backend.services.knowledge_base_schema import resolve_corpus_db_path

_CHIP_TEXT_MAX_LEN = 80

# Section types surfaced first for session preset chips (boss / stuck-style). This is the
# order kinds are *drawn* in, one at a time — see _list_game_sections_for_chips — not a
# priority that lets an earlier kind take every slot. Kinds absent from this tuple still
# appear, after the ones listed.
_CHIP_SECTION_TYPE_ORDER = ("boss", "dungeon", "encounter", "area", "quest", "enemy", "item")

# Insertion order is the display order for compat chips — see _compat_chip_candidates.
# Note "deck" is textually identical to a static carousel seed (src/data/presets.ts), so it is
# ordered after "proton"; de-duplicating the two lists properly needs the seed list shared
# across the TS/Python boundary and is tracked separately under roadmap Bugs.
_COMPAT_CHIP_TEMPLATES: dict[str, str] = {
    "proton": "Any known Proton issues for this game?",
    "controller": "Any Steam Input issues for this game?",
    "deck": "How well does this game run on Deck?",
}

# Generic compat chips are capped so they cannot crowd out entity-named candidates.
_MAX_COMPAT_CHIP_CANDIDATES = 2


@dataclass
class SessionRagChipCandidate:
    text: str
    category: str
    prefer_ask_mode: Optional[str] = None
    domain: str = ""


@dataclass
class SessionRagChipCandidatesResult:
    ok: bool
    reason: str = ""
    candidates: list[SessionRagChipCandidate] = field(default_factory=list)


@dataclass
class KbCoverageSummary:
    """Corpus coverage for the running game — distinct from Ask-turn KB attachment."""

    status: str
    section_count: int = 0
    reason: str = ""


def _count_game_sections(conn: sqlite3.Connection, game_id: int) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM sections WHERE game_id = ?",
        (game_id,),
    ).fetchone()
    return int(row["n"] or 0)


def summarize_kb_coverage(
    settings: dict,
    *,
    app_id: str,
    app_name: str,
    shortcut_name: str = "",
    text_resolved_title: str = "",
) -> KbCoverageSummary:
    """Return how many strategy sections the offline corpus has for this game.

    ``text_resolved_title`` is the same D19 text-resolved title game_ai_request.py already
    hands to the prompt and to ``should_retrieve_knowledge`` when nothing is running -- a game
    named in the question itself. Until this was threaded through here too, a question like
    "black mesa how do i tame a horse" with nothing running fell straight into the "no_app"
    branch below, so the honesty lines (kb_not_in_notes_notice.py) could never fire for it even
    though a note did attach: the one case where a person is most likely leaning on the model's
    own memory was the one case where they were never told either way.
    """
    if settings.get("use_local_knowledge_base") is not True:
        return KbCoverageSummary(status="kb_off")

    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return KbCoverageSummary(status="corpus_missing")

    # Nothing running at all (desktop context) is a different fact from "a game is running
    # but the corpus has no entry for it" -- conflating the two under one status made Show
    # details claim a match failure when there was no game to match against in the first
    # place. Same emptiness test D19 already uses just above this call site (game_ai_request.py)
    # to decide whether text-resolution from the question is the only path into the corpus --
    # a resolved text title counts as "not nothing" here for the same reason it does there.
    if (
        not str(app_id or "").strip()
        and not str(app_name or "").strip()
        and not str(text_resolved_title or "").strip()
    ):
        return KbCoverageSummary(status="no_app")

    try:
        conn = _get_connection(db_path)
        game_id, _ = _resolve_game_id(
            conn,
            app_id=app_id,
            app_name=app_name,
            shortcut_name=shortcut_name,
            text_resolved_title=text_resolved_title,
        )
        if game_id is None:
            return KbCoverageSummary(status="app_unresolved")
        count = _count_game_sections(conn, game_id)
        if count <= 0:
            return KbCoverageSummary(status="no_sections", section_count=0)
        return KbCoverageSummary(status="sections", section_count=count)
    except sqlite3.Error as exc:
        return KbCoverageSummary(status="corpus_error", reason=str(exc))


def kb_coverage_to_transparency(summary: KbCoverageSummary) -> dict[str, Any]:
    return {
        "kb_coverage_status": summary.status,
        "kb_coverage_section_count": int(summary.section_count or 0),
        "kb_coverage_reason": summary.reason or "",
    }


def _truncate_chip_text(text: str, max_len: int = _CHIP_TEXT_MAX_LEN) -> str:
    t = " ".join((text or "").split())
    if len(t) <= max_len:
        return t
    cut = t[: max_len - 1].rsplit(" ", 1)[0]
    return (cut or t[: max_len - 1]).rstrip("?., ") + "?"


def _curtail_section_to_chip(section_type: str, name: str) -> str:
    st = (section_type or "").strip().lower()
    n = (name or "").strip()
    if not n:
        return ""
    if st == "boss":
        return _truncate_chip_text(f"How do I beat {n}?")
    if st == "dungeon":
        return _truncate_chip_text(f"How do I get through {n}?")
    if st in ("encounter", "area", "quest"):
        return _truncate_chip_text(f"Tips for {n} in this game?")
    # Phrased to read for a singular or a plural card name alike -- the seed has "Exploder"
    # next to "ReDead and Gibdo", and "Nitra" next to "Bottles".
    if st == "enemy":
        return _truncate_chip_text(f"How do I deal with {n}?")
    if st == "item":
        return _truncate_chip_text(f"How do I use {n}?")
    return _truncate_chip_text(f"What should I know about {n}?")


def _list_game_sections_for_chips(
    conn: sqlite3.Connection,
    game_id: int,
    *,
    limit: int = 6,
) -> list[tuple[str, str]]:
    """One card per kind, then a second from each, until ``limit`` — not the first N by kind.

    Strict kind-priority let one kind take every slot. It looked fine while no title had more
    than a handful of cards of one kind, then the Phase 4 cards took Ocarina of Time to six
    boss cards and the whole chip pool became six *"How do I beat X?"* — its items and enemies
    unreachable, and six boss names offered up in a carousel a player is only browsing.

    Round-robin costs nothing where kinds are already lopsided: Left 4 Dead 2 keeps its
    seventeen `mechanic` cards feeding the pool once the other kinds run dry, so it returns
    the same six chips it did before, reordered.
    """
    order_cases = " ".join(
        f"WHEN lower(section_type) = '{st}' THEN {i}"
        for i, st in enumerate(_CHIP_SECTION_TYPE_ORDER)
    )
    # No LIMIT: the interleave below needs every kind's cards, and a game's section count is
    # tens of rows, not thousands.
    sql = (
        "SELECT section_type, name FROM sections WHERE game_id = ? "
        f"ORDER BY CASE {order_cases} ELSE 99 END, section_id"
    )
    by_kind: dict[str, list[tuple[str, str]]] = {}
    for row in conn.execute(sql, (game_id,)).fetchall():
        section_type = str(row["section_type"] or "")
        by_kind.setdefault(section_type, []).append((section_type, str(row["name"] or "")))

    out: list[tuple[str, str]] = []
    queues = list(by_kind.values())
    while len(out) < limit and any(queues):
        for queue in queues:
            if not queue:
                continue
            out.append(queue.pop(0))
            if len(out) >= limit:
                break
    return out


def _compat_chip_candidates(
    conn: sqlite3.Connection,
    *,
    limit: int = _MAX_COMPAT_CHIP_CANDIDATES,
) -> list[SessionRagChipCandidate]:
    """Curated compat chips this corpus actually has patterns for, capped and ordered.

    Capped because these are generic by construction — they read identically for every game,
    so an unbounded tail of them crowds out the entity-named candidates. Ordered by
    ``_COMPAT_CHIP_TEMPLATES`` insertion order rather than ``pattern_id`` so the chips a user
    sees do not shuffle when corpus row order changes.
    """
    topics = {
        str(row["topic"] or "").strip().lower()
        for row in conn.execute("SELECT topic FROM compat_patterns").fetchall()
    }
    out: list[SessionRagChipCandidate] = []
    for key, template in _COMPAT_CHIP_TEMPLATES.items():
        if len(out) >= max(0, limit):
            break
        if key not in topics:
            continue
        text = _truncate_chip_text(template)
        if not text:
            continue
        out.append(
            SessionRagChipCandidate(
                text=text,
                category="troubleshooting",
                domain="compat",
            )
        )
    return out


def suggest_chip_candidates(
    settings: dict,
    *,
    app_id: str,
    app_name: str,
    shortcut_name: str = "",
) -> SessionRagChipCandidatesResult:
    """Return curtailed preset-chip prompts from the offline KB for the running game."""
    if settings.get("use_local_knowledge_base") is not True:
        return SessionRagChipCandidatesResult(ok=False, reason="kb_off")

    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return SessionRagChipCandidatesResult(ok=False, reason="corpus_missing")

    try:
        conn = _get_connection(db_path)
        game_id, resolution = _resolve_game_id(
            conn,
            app_id=app_id,
            app_name=app_name,
            shortcut_name=shortcut_name,
        )

        candidates: list[SessionRagChipCandidate] = []
        seen: set[str] = set()

        if game_id is not None:
            for section_type, name in _list_game_sections_for_chips(conn, game_id):
                text = _curtail_section_to_chip(section_type, name)
                if not text or text in seen:
                    continue
                seen.add(text)
                candidates.append(
                    SessionRagChipCandidate(
                        text=text,
                        category="strategy",
                        prefer_ask_mode="strategy",
                        domain="strategy",
                    )
                )

        # A session RAG chip must name something the corpus knows about *this* game. Without a
        # single section, every chip we could return is a generic compat template that reads
        # the same for every title — indistinguishable from a static seed, so the carousel is
        # better served by its own seeds. Reported as {ok: false}, which the frontend already
        # treats as "use static seeds" without logging an error.
        if not candidates:
            note = "app_unresolved" if game_id is None else "no_sections"
            return SessionRagChipCandidatesResult(ok=False, reason=note)

        for compat in _compat_chip_candidates(conn):
            if compat.text in seen:
                continue
            seen.add(compat.text)
            candidates.append(compat)

        _ = resolution
        return SessionRagChipCandidatesResult(ok=True, candidates=candidates)
    except sqlite3.Error as exc:
        close_connection(db_path)
        return SessionRagChipCandidatesResult(ok=False, reason=f"corpus_error:{exc}")


def session_rag_chip_candidates_to_rpc(result: SessionRagChipCandidatesResult) -> dict[str, Any]:
    """Serialize chip candidates for Decky RPC."""
    return {
        "ok": result.ok,
        "reason": result.reason,
        "candidates": [
            {
                "text": c.text,
                "category": c.category,
                "prefer_ask_mode": c.prefer_ask_mode,
                "domain": c.domain,
            }
            for c in result.candidates
        ],
    }


@dataclass
class StackedContext:
    text: str = ""
    # Which blocks actually reached the model. Proton logs take budget first and can be
    # capped at 96 KiB against a 100 KiB ceiling, so the knowledge block can be starved down
    # to a fragment or to nothing at all.
    proton_attached: bool = False
    knowledge_attached: bool = False


def stack_context_blocks(
    *,
    proton_text: str,
    knowledge_text: str,
    max_total_bytes: int = 100 * 1024,
) -> StackedContext:
    """Stack Proton logs then knowledge cards under a shared byte budget.

    Returns what survived, not just the text. Callers were recording ``kb_attached=True`` from
    the retrieval result and then stacking, so transparency could claim the knowledge base was
    attached and cite its sources when stacking had dropped the block entirely.

    A block is reported attached only if it went in whole. A truncated block is a fragment
    whose sources no longer describe its contents, which is the same lie in a smaller form.
    """
    result = StackedContext()
    parts: list[str] = []
    budget = max_total_bytes
    for label, block in (
        ("proton", proton_text),
        ("knowledge", knowledge_text),
    ):
        chunk = (block or "").strip()
        if not chunk:
            continue
        encoded = chunk.encode("utf-8")
        if len(encoded) > budget:
            if budget <= 0:
                break
            chunk = encoded[:budget].decode("utf-8", errors="ignore") + "\n[…truncated]"
            parts.append(chunk)
            break
        parts.append(chunk)
        budget -= len(encoded)
        if label == "proton":
            result.proton_attached = True
        else:
            result.knowledge_attached = True
        if budget <= 0:
            break
    result.text = "\n\n".join(parts)
    return result
