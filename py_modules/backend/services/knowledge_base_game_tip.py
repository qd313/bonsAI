"""Title: Finding a game's own tip for a question

Purpose: A few games ship a tip of their own in the knowledge base (Deep Rock Galactic:
Survivor's Render Scale fix for blurry text, Fallout 4's launch option for mods). This file
decides, for one Ask made while such a game runs, whether that game's own tip should be
the note the AI gets, even when nothing else routed the question to the tips at all.

Used for: knowledge_base_service.retrieve_knowledge_context calls
`_reroute_to_game_tip_if_it_fits()` on every question, and reads the per-game tip helpers
here (`_compat_app_keys_for_game`, `_compat_tips_for_app_keys`, `_compat_tip_card_by_pattern_id`).

Solves: The tip sat in the installed library and was never searched when the question
did not already look like a troubleshooting one, and a strategy question must not have a
display tip stapled onto it for sharing one stray word. This file owns the cut-offs
that keep those two apart.

Does not: Search the rest of the tips, rank or blend notes, or format the block the AI
reads -- knowledge_base_search.py and knowledge_base_service.py own those. Moved out of
knowledge_base_service.py unchanged in plan 81 so the service file stays under its growth limit.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Optional

from backend.services.knowledge_base_cards import KnowledgeCard, _compat_row_to_card
from backend.services.knowledge_base_search import (
    COMPAT_TOPIC_RECALL_K,
    _COMPAT_BM25,
    _FTS_MAX_TOKENS,
    _FTS_STOPWORDS,
)


def _compat_app_keys_for_game(conn: sqlite3.Connection, game_id: int) -> list[str]:
    """The key(s) a per-game tip's ``app_id`` column would carry for this resolved game.

    A title's own Steam AppID when it has one, else the ``igdb_id`` strategy_seed.json
    already gives a title Steam never assigned one to (Ocarina of Time, played through an
    emulator shortcut) -- the same per-game key the corpus's own `games` table uses either
    way, so a per-game tip never needs a Steam AppID a title does not have.
    """
    row = conn.execute(
        "SELECT app_id, igdb_id FROM games WHERE game_id = ?", (game_id,)
    ).fetchone()
    if not row:
        return []
    return [str(v).strip() for v in (row["app_id"], row["igdb_id"]) if str(v or "").strip()]


def _compat_tips_for_app_keys(
    conn: sqlite3.Connection,
    *,
    app_keys: list[str],
    exclude_ids: set[int],
    top_k: int,
) -> list[KnowledgeCard]:
    """A resolved game's own tips (D29 / Phase 4 track 3's per-game field), whether or not

    they share a word with the Ask -- the same recall-path shape as the routed-topic pull
    just above it in the compat branch, and preferred the same way (RRF_W_TOPIC, not a new
    weight) per planning/18-phase4-track3-per-game-compat-tips.md: measure before adding a
    second weight, and reuse ``preferred_ids`` rather than a new mechanism until then.
    """
    if not app_keys:
        return []
    placeholders = ",".join("?" for _ in app_keys)
    try:
        rows = conn.execute(
            "SELECT pattern_id, topic, platforms, card, source_url, source_license "
            f"FROM compat_patterns WHERE app_id IN ({placeholders}) ORDER BY pattern_id",
            app_keys,
        ).fetchall()
    except sqlite3.OperationalError:
        # A library built before schema v4 has no per-game ``app_id`` column. Since plan 70's
        # reroute calls this on every question, raising here emptied the whole answer's notes
        # on such a library, strategy questions included -- no tips is the right answer.
        return []
    out: list[KnowledgeCard] = []
    for row in rows:
        if int(row["pattern_id"]) in exclude_ids:
            continue
        out.append(_compat_row_to_card(row))
        if len(out) >= top_k:
            break
    return out


# --- Per-game tip reroute floor (plan 70, helper E2, 2026-09-26) --------------------------
#
# Scoped to one resolved game's own tiny tip set (usually a single row), NOT the whole tip
# sheet -- BM25_RELEVANCE_FLOOR (1.0) is calibrated for that far bigger, more competitive pool
# and is nowhere near strict enough here: measured on tests/fixtures/kb_eval_v2.json's tune +
# holdout strategy rows for the four games that ship a per-game tip today (Deep Rock Galactic:
# Survivor, Fallout 4, GTA San Andreas, Ocarina of Time), against the release corpus
# (2026.09.26), 18 strategy rows scored above 1.0 against a game's own tip on nothing more than
# one incidental shared word ("how to get more xp" against Deep Rock Galactic: Survivor's
# Render Scale tip, "I run out of puff after a short sprint, can I fix that" against GTA San
# Andreas's launch-option tip, scoring as high as 5.197 -- above two of the three genuine Deck
# questions this fix exists for).
#
# _game_tip_query_terms fixed the biggest source of that noise first: turning an apostrophe
# into a space split "there's" into "there" + "s", and the orphan "s" (or "t" from "can't")
# then matched a stray "s"/"t" token inside unrelated card text -- 9 of the 18 false
# candidates were nothing but that. _GAME_TIP_TEMPLATE_WORDS drops the rest: ordinary verbs
# that happen to sit in almost every tip's own boilerplate sentence ("starts the game", "runs
# on...", "text gets hard to read", "fixes... unconfirmed") and inflated a score against a
# question that shares only that one generic word. With both fixes, the worst remaining
# strategy score across every tune/holdout row for these four games is 3.341 ("stay"/"way"
# against Ocarina of Time's Ship of Harkinian tip); the weakest of the three real Deck
# questions this fix must attach is 4.910. GAME_TIP_REROUTE_FLOOR sits at the midpoint with
# margin on both sides. A thin sample on the genuine side (three hand-written Deck questions,
# no compat-domain row for any of these four games exists in kb_eval_v2.json to measure
# against) -- re-measure before moving this number.
GAME_TIP_REROUTE_FLOOR = 4.0

# See GAME_TIP_REROUTE_FLOOR's comment for the measurement behind this list.
_GAME_TIP_TEMPLATE_WORDS = frozenset(
    """
    fix fixes fixed fixing run runs running ran get gets getting got
    start starts starting started
    """.split()
)


def _game_tip_query_terms(query: str) -> list[str]:
    """Tokens for the per-game tip reroute probe only -- see GAME_TIP_REROUTE_FLOOR.

    Deletes apostrophes before splitting on non-word characters, the same way
    ``compat_topic_router._normalize`` does, rather than ``_fts_match_query``'s plain
    ``\\w+`` split, which turns "there's" into "there" + a bare "s" term. That bare term is
    exactly what this function must not produce: scoped to one game's tiny tip set, a
    single-letter FTS term matches almost any short card by accident, with no bigger
    candidate pool around it to dilute the coincidence.
    """
    q = str(query or "").lower().replace("'", "").replace("’", "")
    tokens = [
        t
        for t in re.findall(r"[a-z0-9]+", q)
        if t not in _FTS_STOPWORDS and t not in _GAME_TIP_TEMPLATE_WORDS
    ]
    return tokens[:_FTS_MAX_TOKENS]


def _game_tip_keyword_scores(
    conn: sqlite3.Connection, *, pattern_ids: list[int], query: str
) -> dict[int, float]:
    """Keyword relevance for each of a resolved game's own tips, keyed by pattern_id.

    Scoped to ``pattern_ids`` rather than the whole tip sheet -- see
    ``GAME_TIP_REROUTE_FLOOR``'s comment for why that, and this function's own term list, are
    what keep this safe for a strategy question that happens to share a stray word with some
    unrelated tip. Empty when there is nothing to search.
    """
    if not pattern_ids:
        return {}
    tokens = _game_tip_query_terms(query)
    if not tokens:
        return {}
    fts_q = " OR ".join(f'"{tok}"' for tok in tokens)
    placeholders = ",".join("?" for _ in pattern_ids)
    sql = (
        f"SELECT p.pattern_id, -{_COMPAT_BM25} AS relevance FROM compat_patterns_fts f "
        "JOIN compat_patterns p ON p.pattern_id = f.rowid "
        f"WHERE compat_patterns_fts MATCH ? AND p.pattern_id IN ({placeholders})"
    )
    try:
        rows = conn.execute(sql, (fts_q, *pattern_ids)).fetchall()
    except sqlite3.Error:
        return {}
    return {int(row["pattern_id"]): float(row["relevance"]) for row in rows}


def _compat_tip_card_by_pattern_id(
    conn: sqlite3.Connection, pattern_id: int
) -> Optional[KnowledgeCard]:
    """One tip by its own row id, read fresh rather than trusted to still be in a card list --
    see the reorder step in retrieve_knowledge_context that calls this."""
    row = conn.execute(
        "SELECT pattern_id, topic, platforms, card, source_url, source_license "
        "FROM compat_patterns WHERE pattern_id = ?",
        (pattern_id,),
    ).fetchone()
    return _compat_row_to_card(row) if row else None


def _reroute_to_game_tip_if_it_fits(
    conn: sqlite3.Connection,
    *,
    game_id: Optional[int],
    expanded_question: str,
) -> tuple[bool, Optional[int]]:
    """Should this turn use the resolved game's own tips even though nothing routed it there?

    D29's per-game tips (Fallout 4's F4SE launch option, Deep Rock Galactic: Survivor's Render
    Scale fix, ...) used to reach an answer only once ``should_retrieve_knowledge()`` had
    already called the question troubleshooting -- and Strategy mode locks the domain before
    the question is even read, while neither the phrase gate nor the topic router recognised
    two of the three real Deck questions this was measured against
    (docs/test-evidence/plan70-R-R4-try2.json): "the text on screen looks blurry" matches no
    gamescope rule without the word "scaling" or "resolution", and "what launch options should
    I use" matches no rule at all. The tips sat in the installed library and were never
    searched.

    This checks the resolved game's own small tip set -- and only those, never the whole tip
    sheet -- against ``GAME_TIP_REROUTE_FLOOR``, a keyword floor measured for exactly this
    narrow pool (see its own comment for why it is not ``BM25_RELEVANCE_FLOOR``). A strategy
    question ("how do I beat the dreadnought") shares no real vocabulary with a display-scaling
    tip, so it is not rerouted and its own strategy notes are untouched.

    Keyword only, deliberately: a meaning-search rescue was measured too, but every one of the
    three real questions this fix exists for is a keyword hit, and running it would cost a
    second embed call on every Strategy/Expert Ask for a game with a tip, not only a matching
    one -- doubling the round trip test_hybrid_retrieval_keeps_the_embed_model_loaded_like_the_
    answer_model already pins at one call. Left for a future lane if a real paraphrase turns up
    that keyword alone cannot catch.

    Returns ``(reroute, forced_tip_id)``. ``forced_tip_id`` is the one tip that actually
    cleared the floor, not merely "one of this game's tips" -- a game with more than one tip
    cannot have an unrelated one dragged along for sharing a title.
    """
    if game_id is None:
        return False, None
    app_keys = _compat_app_keys_for_game(conn, game_id)
    if not app_keys:
        return False, None
    own_tips = _compat_tips_for_app_keys(
        conn, app_keys=app_keys, exclude_ids=set(), top_k=COMPAT_TOPIC_RECALL_K
    )
    tip_ids = [c.section_id for c in own_tips]
    if not tip_ids:
        return False, None

    keyword_scores = _game_tip_keyword_scores(conn, pattern_ids=tip_ids, query=expanded_question)
    if not keyword_scores:
        return False, None
    best_id = max(keyword_scores, key=keyword_scores.get)
    if keyword_scores[best_id] >= GAME_TIP_REROUTE_FLOOR:
        return True, best_id
    return False, None
