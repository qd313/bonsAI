"""Title: Finding and ranking notes inside one game (or the tip sheet)

Purpose: Once knowledge_base_service.py knows which game a question is about
(or that it is a troubleshooting question), this file is where the actual
search happens -- a keyword pass over the corpus's full-text index, a rescue
pass for questions that name a card by kind rather than by name ("the boss",
"this level"), and a routed pass over the troubleshooting tip sheet. It is
also where "nothing here is close enough" gets measured -- the falling back
to a generic genre or compat card when a real search finds nothing at all.

Used for: knowledge_base_service.py's retrieval entry point calls
`_search_sections()` / `_search_compat_patterns()` first, then
`_sections_of_type()` / `_compat_tips_for_topics()` to rescue a kind or topic
the keyword pass missed, before blending that with whatever the
meaning-search half found.

Solves: A plain keyword search misses a paraphrase that shares no words with
the note that answers it, and a bare kind word ("the boss") that names no
specific card at all. `_fts_match_query()` also drops pure function-word
questions ("what is the best thing to do here") rather than let them match
whichever card happens to repeat "the" the most.

Does not: Blend the keyword ranking with the meaning-search ranking -- the
fusion function stays in knowledge_base_service.py because
scripts/eval_kb_embed_models.py's weight sweep mutates its RRF_W_FTS /
RRF_W_VEC constants directly on that module, and moving the function away
from them would leave the sweep changing numbers nothing reads any more.
Also does not decide whether the meaning-search half runs at all, or judge
whether its best score clears the "does this actually fit" floor -- both
belong to knowledge_base_service.py's retrieval entry point, because that
also depends on the embed model being reachable, which this file has no way
to check.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Optional

from backend.services.knowledge_base_cards import (
    KnowledgeCard,
    _compat_row_to_card,
    _row_relevance,
    _section_row_to_card,
)

# Column weights, highest first. sections_fts is (name, card); compat_patterns_fts is
# (topic, platforms, card). A card whose *title* matches the Ask is a better hit than one
# that mentions the words somewhere in its body.
_SECTIONS_BM25 = "bm25(sections_fts, 10.0, 1.0)"
_COMPAT_BM25 = "bm25(compat_patterns_fts, 5.0, 2.0, 1.0)"

# Relevance is -bm25(...), so bigger is a better match (FTS5's bm25 is negative, and more
# negative means better; flipping the sign once here keeps every comparison downstream the
# obvious direction).
#
# Kept LOOSE after PR2: the holdout gate did not justify tightening. Off-topic Asks still
# score ≤0.75 on the seed; genuine hits remain well above 1.0. Stopword-only queries are
# _fts_match_query's job, not the floor's.
BM25_RELEVANCE_FLOOR = 1.0

# --- Compat tips: routed topic + vector recall (D22, 2026-08-18) ---------------------------
#
# D16 works out which topic a troubleshooting question is about. Until now that answer was
# thrown away -- `match_compat_corpus_topics` had no caller outside its own module -- and the
# search ran across the whole tip sheet, which is how "the game only responds to the touchpad
# and ignores the sticks" came back with a gamescope tip about screen resolution that happens
# to contain the word "ignores".
#
# Measured 2026-08-18 on corpus 2026.08.16, and the measurement moved the design: for three of
# the four KB-ROUTER-01 sentences the on-topic tips were not ranked low, they were **absent** --
# 0 of 8 storage tips, 0 of 10 steam_input tips, 0 of 2 emudeck tips reached the candidate list
# at all, because the question shares no word with them. A ranking preference cannot promote a
# card that was never a candidate, so the topic first has to open a recall path.
COMPAT_TOPIC_RECALL_K = 6

# D22 locks this as a **preference, not a filter**: on-topic tips get a bonus, nothing is
# excluded, and a genuinely better match on another topic can still win. The router guesses,
# and a filter turns every wrong guess into an empty result; questions that span two topics
# ("my controller stops working after sleep" is steam_input *and* power) have no single right
# topic to filter on.
#
# Flat, not rank-based, because "the router matched this topic" is a yes/no fact -- there is no
# meaningful ordering *within* the matched set for it to express. Rank order comes from the
# keyword and vector lists, which is where ordering information actually lives.
#
# The weight is small on purpose and the reason is arithmetic: with RRF_K = 60, the whole FTS
# ordering from rank 1 to rank 30 spans 1/61 - 1/90 = 0.0053, while list *membership* is worth
# 1/61 = 0.0164. A topic bonus at full weight would be three times the entire keyword ordering
# and would behave as the hard filter D22 rejected. Swept on the tune split 2026-08-18.
RRF_W_TOPIC = 0.30

# **The compat path deliberately has no vector recall pass**, unlike strategy sections. It was
# built, measured and removed on 2026-08-18, for a structural reason and a measured one.
#
# Structural: the only doors into compat retrieval are `question_targets_compat_corpus` -- which
# returns True only when a non-weak topic matched -- and the troubleshooting-log path. So
# reaching this code almost always means a topic matched, which means topic recall has already
# put candidates in the pool. A vector pass could then only add *off-topic* candidates, which is
# the opposite of what D22 asks for. Across the 40 compat fixture rows, **zero** reach retrieval
# with no routed topic.
#
# Measured: on the tune split it cost a case and gained none -- 27/27 without it, 26/27 with it,
# and 4/4 on the KB-ROUTER-01 sentences either way. Shipping it anyway would have been symmetry
# with the strategy path for its own sake. Detail:
# docs/audit/rag-compat-topic-preference-2026-08-18.md.

TYPE_RECALL_K = 3


# Function words only. Every one of these matches somewhere in almost every card, so under an
# OR query they do not narrow anything — they just hand a score to whatever card repeats them
# most. Measured on the seed corpus: the query "the a of and to it is" returned eight cards
# scoring 1.9-5.2, above several genuine compat hits, which is why the relevance floor alone
# cannot fix this.
#
# Deliberately excludes words that carry meaning on a Deck: run, boot, load, save, off, out,
# down, up, no, not, crash, fix, work. Grow this list only with evidence — a wrongly-dropped
# term is invisible, it just quietly stops matching.
_FTS_STOPWORDS = frozenset(
    """
    a an and are as at be been being but by can could did do does doing for from had has have
    how i if in into is it its just me my of on or our so some such than that the their them
    then there these they this those to was we were what when where which while who why will
    with would you your
    """.split()
)

# Raised from 12. With function words gone, 12 was cutting into the content of an ordinary
# two-sentence question; the tail of a long question is now searched rather than dropped.
_FTS_MAX_TOKENS = 24


def _fts_match_query(query: str) -> str:
    """Build the FTS5 OR expression, keeping only discriminative terms.

    Returns "" when the question is nothing but function words. That is deliberate: there is
    no such thing as a good match for "what is the best thing to do here", and returning
    nothing sends the caller to the genre/compat fallback instead of injecting whichever
    cards happened to repeat "the" most often.
    """
    q = (query or "").strip()
    if not q:
        return ""
    tokens = [t for t in re.findall(r"\w+", q) if t.lower() not in _FTS_STOPWORDS]
    tokens = tokens[:_FTS_MAX_TOKENS]
    if not tokens:
        return ""
    return " OR ".join(f'"{tok}"' for tok in tokens)


def _search_compat_patterns(
    conn: sqlite3.Connection,
    *,
    query: str,
    top_k: int,
) -> list[KnowledgeCard]:
    fts_q = _fts_match_query(query)
    if not fts_q:
        return []
    # ORDER BY the *same* weighted expression that is selected. "ORDER BY rank" is the
    # unweighted bm25, so ordering by it would leave the column weights affecting the floor
    # only and silently do nothing to ranking.
    sql = (
        "SELECT p.pattern_id, p.topic, p.platforms, p.card, p.source_url, p.source_license, "
        f"-{_COMPAT_BM25} AS relevance "
        "FROM compat_patterns_fts f "
        "JOIN compat_patterns p ON p.pattern_id = f.rowid "
        "WHERE compat_patterns_fts MATCH ? "
        f"ORDER BY {_COMPAT_BM25} LIMIT ?"
    )
    try:
        rows = conn.execute(sql, (fts_q, top_k)).fetchall()
    except sqlite3.Error:
        return []
    return [
        _compat_row_to_card(row)
        for row in rows
        if float(row["relevance"]) >= BM25_RELEVANCE_FLOOR
    ]


# A section's type (`boss`, `area`, `mechanic`) is shown to the model but is not in the FTS
# index, which indexes (name, card) only -- so "how do i beat the boss" returned **0** candidates
# on a title whose one boss card was right there, and the vector half did not rescue it either
# (measured 2026-08-18). The player who does not know the boss's name is the player who needs the
# card most.
#
# Chosen over indexing the type in FTS because it needs no schema change and no corpus rebuild,
# so it ships to an installed corpus rather than waiting for one. It is also easy to reverse: the
# alternative -- adding `section_type` to `sections_fts` -- makes a bare "boss" match every boss
# card at BM25 rank, which is right for a one-boss title and noisy for a twelve-boss one.
_TYPE_WORDS: dict[str, tuple[str, ...]] = {
    "boss": ("boss", "bosses", "bossfight"),
    "area": ("area", "areas", "level", "levels", "stage", "stages", "zone", "zones", "biome", "biomes", "map", "maps"),
    "dungeon": ("dungeon", "dungeons", "temple", "temples"),
    "quest": ("quest", "quests", "mission", "missions", "sidequest"),
    "encounter": ("encounter", "encounters", "fight", "fights"),
    "mechanic": ("mechanic", "mechanics", "system", "systems"),
}


def _section_types_named(question: str) -> list[str]:
    """Section types the question asks for generically -- "the boss", "this level"."""
    tokens = {t.lower() for t in re.findall(r"\w+", question or "")}
    return [
        section_type
        for section_type, words in _TYPE_WORDS.items()
        if tokens.intersection(words)
    ]


def _sections_of_type(
    conn: sqlite3.Connection,
    *,
    game_id: int,
    section_types: list[str],
    exclude_ids: set[int],
    top_k: int,
) -> list[KnowledgeCard]:
    """A game's cards of the named types, whether or not they share a word with the question."""
    if not section_types:
        return []
    placeholders = ",".join("?" for _ in section_types)
    rows = conn.execute(
        "SELECT s.section_id, s.game_id, g.canonical_title, s.section_type, s.name, s.card, "
        "s.source_url, s.source_license, s.source_version, s.crawled_at "
        "FROM sections s JOIN games g ON g.game_id = s.game_id "
        f"WHERE s.game_id = ? AND s.section_type IN ({placeholders}) "
        "ORDER BY s.section_id",
        [game_id, *section_types],
    ).fetchall()
    out: list[KnowledgeCard] = []
    for row in rows:
        if int(row["section_id"]) in exclude_ids:
            continue
        out.append(_section_row_to_card(row))
        if len(out) >= top_k:
            break
    return out


def _compat_topic_of(conn: sqlite3.Connection, pattern_id: int) -> str:
    """The tip sheet's topic for one tip. Cards carry the topic as their ``name`` already, but
    reading it back from the column keeps the preference set honest if that ever changes."""
    row = conn.execute(
        "SELECT topic FROM compat_patterns WHERE pattern_id = ?", (pattern_id,)
    ).fetchone()
    return str(row["topic"]) if row else ""


def _merge_preferred_first(
    cards: list[KnowledgeCard],
    topic_cards: list[KnowledgeCard],
    preferred_ids: set[int],
    *,
    top_k: int,
) -> list[KnowledgeCard]:
    """Keyword-only ordering: on-topic tips first, everything else in BM25 order behind them.

    The no-embed equivalent of the RRF_W_TOPIC bonus. Still a preference and not a filter --
    off-topic keyword hits keep their places, they just queue behind tips the router believes
    are about the right thing. Without cosine there is nothing to order the recalled tips by,
    so they hold their pattern_id order.
    """
    if not preferred_ids:
        return cards[:top_k]
    pool = list(cards) + [c for c in topic_cards if c.section_id not in {x.section_id for x in cards}]
    preferred = [c for c in pool if c.section_id in preferred_ids]
    rest = [c for c in pool if c.section_id not in preferred_ids]
    return (preferred + rest)[:top_k]


def _compat_tips_for_topics(
    conn: sqlite3.Connection,
    *,
    topics: list[str],
    exclude_ids: set[int],
    top_k: int,
) -> list[KnowledgeCard]:
    """Tips on the topics the router matched, whether or not they share a word with the Ask.

    No FTS MATCH here, and that is the point: three of the four KB-ROUTER-01 sentences share
    no vocabulary with the tips that answer them, so a keyword-gated topic search returns the
    same nothing the unfiltered one did. Ordered by pattern_id for determinism only -- the
    useful ordering comes from fusion, where these compete on cosine like everything else.
    """
    if not topics:
        return []
    placeholders = ",".join("?" for _ in topics)
    rows = conn.execute(
        "SELECT p.pattern_id, p.topic, p.platforms, p.card, p.source_url, p.source_license "
        f"FROM compat_patterns p WHERE p.topic IN ({placeholders}) "
        "ORDER BY p.pattern_id",
        topics,
    ).fetchall()
    out: list[KnowledgeCard] = []
    for row in rows:
        if int(row["pattern_id"]) in exclude_ids:
            continue
        out.append(_compat_row_to_card(row))
        if len(out) >= top_k:
            break
    return out


def _search_sections(
    conn: sqlite3.Connection,
    *,
    game_id: Optional[int],
    query: str,
    top_k: int,
    min_relevance: float = BM25_RELEVANCE_FLOOR,
) -> list[KnowledgeCard]:
    fts_q = _fts_match_query(query)
    if not fts_q:
        return []
    # See _search_compat_patterns on why ORDER BY repeats the weighted expression.
    select_cols = (
        "SELECT s.section_id, s.game_id, g.canonical_title, s.section_type, s.name, s.card, "
        "s.source_url, s.source_license, s.source_version, s.crawled_at, "
        f"-{_SECTIONS_BM25} AS relevance "
        "FROM sections_fts f "
        "JOIN sections s ON s.section_id = f.rowid "
        "JOIN games g ON g.game_id = s.game_id "
    )
    if game_id is not None:
        sql = select_cols + (
            "WHERE sections_fts MATCH ? AND s.game_id = ? " f"ORDER BY {_SECTIONS_BM25} LIMIT ?"
        )
        rows = conn.execute(sql, (fts_q, game_id, top_k)).fetchall()
    else:
        sql = select_cols + ("WHERE sections_fts MATCH ? " f"ORDER BY {_SECTIONS_BM25} LIMIT ?")
        rows = conn.execute(sql, (fts_q, top_k)).fetchall()

    out: list[KnowledgeCard] = []
    for row in rows:
        relevance = _row_relevance(row)
        if relevance < min_relevance:
            continue
        out.append(_section_row_to_card(row, bm25_score=relevance))
    return out


def _genre_fallback(conn: sqlite3.Connection, game_id: Optional[int]) -> Optional[str]:
    genres = ""
    if game_id is not None:
        row = conn.execute("SELECT genres FROM games WHERE game_id = ?", (game_id,)).fetchone()
        if row and row["genres"]:
            genres = str(row["genres"]).lower()
    row = conn.execute(
        "SELECT card FROM genre_patterns ORDER BY pattern_id LIMIT 1"
    ).fetchone()
    if row and "soulslike" in genres:
        pat = conn.execute(
            "SELECT card FROM genre_patterns WHERE genre_tags LIKE '%soulslike%' LIMIT 1"
        ).fetchone()
        if pat:
            return str(pat["card"])
    if row:
        return str(row["card"])
    return None


def _compat_fallback(conn: sqlite3.Connection, question: str) -> Optional[str]:
    tips = _search_compat_patterns(conn, query=question, top_k=1)
    if tips:
        return tips[0].card
    return None


def _attached_keyword_score(cards: list[KnowledgeCard]) -> float:
    """Strongest keyword score among every card that attached this turn.

    Was ``cards[0].bm25_score`` -- only the single highest-fused card's own score -- which let
    ``should_show_no_close_match_notice`` print its warning under a reply the model plainly
    built on a note attached second or third, whenever the fusion winner itself had no keyword
    support. Sighted on a Hollow Knight boss question, 2026-09-18: fusion put "Starting out in
    Hollow Knight" first (meaning-only, no keyword hit), while the reply's fight tactics came
    straight from "Broken Vessel", attached second with a real keyword hit that this function
    would have caught. See docs/roadmap-details.md, "The 'no close match' line reads wrong next
    to a note the reply used".

    0.0 (same as before) when ``cards`` is empty -- the fallback-card path, where nothing
    attached and there is no keyword score to report.
    """
    return max((card.bm25_score for card in cards), default=0.0)


class EmbeddingDimensionMismatch(ValueError):
    """Raised when a stored vector's length does not match the query vector's."""


def _dot_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity for L2-normalized Ollama embeddings (dot product).

    Length is checked rather than zipped. ``zip`` truncates to the shorter sequence, so a
    corpus baked at a different dimension used to yield a plausible-looking score computed
    over a prefix of two unrelated spaces — wrong answers with no error anywhere. Callers
    treat the raise as "disable hybrid for this request".
    """
    if len(a) != len(b):
        raise EmbeddingDimensionMismatch(
            f"embedding dimension mismatch: query {len(a)} vs corpus {len(b)}"
        )
    return sum(x * y for x, y in zip(a, b))


def _best_meaning_score(
    vectors_by_id: dict[int, list[float]], query_vector: list[float]
) -> Optional[float]:
    """Highest cosine similarity across every candidate ``vectors_by_id`` holds a vector for.

    This is what the D87 "none of these fit" floor reads -- the strongest meaning match in the
    whole candidate pool for this turn, not any one card's rank after fusion. ``None`` when
    there is nothing to measure (an empty pool), which the caller reads as "the floor stands
    down": no embed model, Speed mode, and a corpus with no vectors all end here having never
    called this at all, and an empty pool means the same thing one step later.
    """
    if not vectors_by_id:
        return None
    return max(_dot_similarity(query_vector, vec) for vec in vectors_by_id.values())


