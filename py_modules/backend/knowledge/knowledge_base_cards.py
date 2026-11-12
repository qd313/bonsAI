"""Title: Turning a corpus row into a note the model can read

Purpose: The knowledge base keeps its game notes and troubleshooting tips as
plain database rows. This file is where a row becomes a `KnowledgeCard` --
the one shape every other piece of knowledge-base code passes around -- and
where a set of cards becomes the actual block of text handed to the AI,
complete with a trust label and a source list.

Used for: Every search result in knowledge_base_search.py turns its rows into
`KnowledgeCard`s here. knowledge_base_service.py calls `_format_block()` once
a search has settled on which cards to attach, and holds the database
connections (`_get_connection()` / `close_connection()`) every other
knowledge-base file reads through: one per corpus file per thread, never
shared between threads (see `_get_connection` for the crash that rule fixes).

Solves: Two different corpus tables (`sections`, `compat_patterns`) need to
look identical to the rest of the pipeline, and the label describing how much
to trust a block of cards has to reflect the *weakest* card inside it, not
whichever one happened to be first -- both were bugs here before (see
`_lowest_trust_tier` and `_trust_tier_for_row`'s docstrings for the measured
cases).

Does not: Decide which cards are relevant, or run any search --
knowledge_base_search.py does that and hands its results here only to be
shaped and rendered.
"""

from __future__ import annotations

import sqlite3
import threading
from dataclasses import dataclass, replace
from typing import Optional

from backend.knowledge.knowledge_base_schema import (
    TRUST_TIER_FALLBACK,
    TRUST_TIER_WIKI_NO_PATCH,
    TRUST_TIER_WIKI_VERIFIED,
    resolve_corpus_db_path,
)

_CONN_LOCK = threading.Lock()
# Bumped by close_connection(). A thread whose connection was opened under an older number
# closes it and opens a fresh one on its next read, so a re-installed corpus is never read
# through a handle to the old file.
_GENERATION_BY_PATH: dict[str, int] = {}
# Every connection still open, with the thread that owns it, so close_connection() can close
# the ones whose thread has ended (nothing else will) and leave live threads' to their owners.
_OPEN_BY_PATH: dict[str, list[tuple[threading.Thread, sqlite3.Connection]]] = {}
_LOCAL = threading.local()


def _open(db_path: str) -> sqlite3.Connection:
    # immutable=1, not just mode=ro: the shipped corpus is written once on the
    # maintainer PC and never mutated on device. It tells SQLite to skip WAL/locking
    # machinery entirely, which is what makes reads safe on an exFAT SD card where
    # lock files are unreliable. The builder now checkpoints and VACUUMs before
    # shipping, so there is no -wal alongside the file to ignore.
    # check_same_thread=False only so close_connection() can close a connection whose thread has
    # ended; no live thread ever reads through another's (see _get_connection).
    conn = sqlite3.connect(f"file:{db_path}?mode=ro&immutable=1", uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _forget(db_path: str, conn: sqlite3.Connection) -> None:
    """Drop one connection from the open list (caller holds _CONN_LOCK) and close it."""
    held = _OPEN_BY_PATH.get(db_path, [])
    _OPEN_BY_PATH[db_path] = [(th, c) for th, c in held if c is not conn]
    try:
        conn.close()
    except sqlite3.Error:
        pass


def _get_connection(db_path: str) -> sqlite3.Connection:
    """This thread's own read-only connection to the corpus at ``db_path``.

    One connection per thread, never shared. Until 2026-11-11 every thread read through one
    shared connection, opened with ``check_same_thread=False`` and guarded only while it was
    being opened. The answer screen asks for its tap-to-define words, chips and notes at the
    same moment, each in its own worker thread, so two reads ran on one connection at once,
    and a database error in one read closed the connection under the others. On the Deck
    (2026-11-11) that crashed the plugin's whole back end inside SQLite 41 s after load; every
    button then timed out, Install Ollama included. With a connection per thread there is
    nothing to share, and only the owning thread closes its own while that thread is alive.
    """
    conns: dict[str, tuple[int, sqlite3.Connection]] = getattr(_LOCAL, "conns", None) or {}
    _LOCAL.conns = conns
    with _CONN_LOCK:
        generation = _GENERATION_BY_PATH.get(db_path, 0)
        held = conns.get(db_path)
        if held is not None and held[0] == generation:
            return held[1]
        if held is not None:
            _forget(db_path, held[1])
        conn = _open(db_path)
        conns[db_path] = (generation, conn)
        _OPEN_BY_PATH.setdefault(db_path, []).append((threading.current_thread(), conn))
        return conn


def close_connection(db_path: str) -> None:
    """Close the corpus at ``db_path`` for everyone, without pulling a connection from under a read.

    This thread's own connection and any left by a thread that has ended are closed now.
    A live thread's connection is closed by that thread itself, at the start of its next
    read, because its number is now out of date.
    """
    conns: dict[str, tuple[int, sqlite3.Connection]] = getattr(_LOCAL, "conns", None) or {}
    with _CONN_LOCK:
        _GENERATION_BY_PATH[db_path] = _GENERATION_BY_PATH.get(db_path, 0) + 1
        mine = conns.pop(db_path, None)
        if mine is not None:
            _forget(db_path, mine[1])
        for owner, conn in list(_OPEN_BY_PATH.get(db_path, [])):
            if not owner.is_alive():
                _forget(db_path, conn)
        if not _OPEN_BY_PATH.get(db_path):
            _OPEN_BY_PATH.pop(db_path, None)


def release_thread_connections() -> None:
    """Close every corpus connection this thread holds; its next read opens a fresh one."""
    conns: dict[str, tuple[int, sqlite3.Connection]] = getattr(_LOCAL, "conns", None) or {}
    with _CONN_LOCK:
        for db_path, (_gen, conn) in list(conns.items()):
            _forget(db_path, conn)
            if not _OPEN_BY_PATH.get(db_path):
                _OPEN_BY_PATH.pop(db_path, None)
        conns.clear()


def read_in_own_thread(fn, /, *args, **kwargs):
    """Run one whole library read in a worker thread, then close that thread's connections.

    For reads handed to ``asyncio.to_thread``: the worker goes back to a shared pool, so a
    connection left open there would hold the corpus file until the pool thread happens to
    read again (on Windows the file then cannot be deleted). Opening the read-only file again
    on the next read costs a few milliseconds.
    """
    try:
        return fn(*args, **kwargs)
    finally:
        release_thread_connections()


def _trust_tier_for_compat_row(row: sqlite3.Row) -> str:
    if row["source_url"]:
        return TRUST_TIER_WIKI_NO_PATCH
    return TRUST_TIER_FALLBACK


def _trust_tier_for_row(row: sqlite3.Row) -> str:
    """Both wiki tiers require a wiki. ``source_version`` alone is not evidence of one.

    Ordering fault found on device 2026-08-22: this tested ``source_version`` first, and the seed
    writes a *build* tag there (``seed-1.1``) for maintainer-authored cards that have no source at
    all. Those 24 cards were reported to the user -- and to the model, which is told the tier --
    as ``wiki_verified``, the strongest claim available, while the 59 cards with a real wiki URL
    got the weaker ``wiki_no_patch`` because they carry no revision. No card in the corpus had
    both, so the top tier was reachable *only* by the fault. Requiring the URL first is what the
    tier names have always meant.
    """
    if not row["source_url"]:
        return TRUST_TIER_FALLBACK
    if row["source_version"]:
        return TRUST_TIER_WIKI_VERIFIED
    return TRUST_TIER_WIKI_NO_PATCH


# Weakest first. The block header states one tier for everything inside it, so it has to be
# the weakest claim present, not the strongest.
_TRUST_TIER_RANK = {
    TRUST_TIER_FALLBACK: 0,
    TRUST_TIER_WIKI_NO_PATCH: 1,
    TRUST_TIER_WIKI_VERIFIED: 2,
}


@dataclass
class KnowledgeCard:
    section_id: int
    game_id: int
    game_title: str
    section_type: str
    name: str
    card: str
    source_url: str
    source_license: str
    source_version: Optional[str]
    crawled_at: Optional[str]
    trust_tier: str
    # -bm25(...) at retrieval time; bigger is a better keyword match. Defaulted so callers
    # that build a card outside a search (tests, fallbacks) need not supply one.
    bm25_score: float = 0.0


def _lowest_trust_tier(cards: list[KnowledgeCard]) -> str:
    """Weakest tier among ``cards``.

    Was ``cards[0].trust_tier``, so a block holding one wiki_verified card and two
    fallback_no_source cards was labelled wiki_verified — the label overstated two thirds of
    its own contents, and the model was told to trust them accordingly.
    """
    if not cards:
        return TRUST_TIER_FALLBACK
    return min(cards, key=lambda c: _TRUST_TIER_RANK.get(c.trust_tier, 0)).trust_tier


# The `game_title` every shared troubleshooting tip card carries. Named here, not inlined,
# because `_format_block`'s `sources` list builds each entry's title as
# f"{c.game_title} — {c.name}" (this value, for a tip) while game_ai_request.py's
# `_parse_kb_attached_notes` used to rebuild that same key from the parsed text block instead --
# where a tip's header never writes the game title at all (`_card_lines` writes "[Tip: Name]"
# only), so that side always rebuilt "" and the two keys never matched. See docs/roadmap.md,
# "A shared troubleshooting tip that has a source page never gets it shown."
_COMPAT_GAME_TITLE = "Shared troubleshooting"


def _row_relevance(row: sqlite3.Row) -> float:
    """Read the selected ``relevance`` column when the query supplied one."""
    try:
        return float(row["relevance"])
    except (IndexError, KeyError, TypeError, ValueError):
        return 0.0


def _compat_row_to_card(row: sqlite3.Row) -> KnowledgeCard:
    return KnowledgeCard(
        section_id=int(row["pattern_id"]),
        game_id=0,
        game_title=_COMPAT_GAME_TITLE,
        section_type="tip",
        name=str(row["topic"] or ""),
        card=str(row["card"] or ""),
        source_url=str(row["source_url"] or ""),
        source_license=str(row["source_license"] or ""),
        source_version=None,
        crawled_at=None,
        trust_tier=_trust_tier_for_compat_row(row),
        bm25_score=_row_relevance(row),
    )


def _label_own_game_tips(
    conn: sqlite3.Connection, cards: list[KnowledgeCard]
) -> list[KnowledgeCard]:
    """Give each of a game's own tips that game's title in place of ``_COMPAT_GAME_TITLE``.

    ``_compat_row_to_card`` labels every tip shared, because the tip searches that feed it do
    not read ``compat_patterns.app_id``. Relabelled once here, just before ``_format_block``,
    rather than in each of those searches. Found on the Deck by plan 70: Show details credited
    Deep Rock Galactic: Survivor's Render Scale tip as "Shared troubleshooting — display".
    ``app_id`` holds a Steam AppID or, for a title Steam never numbered, its ``igdb_id``.
    Cards come back unchanged on a library built before that column existed.
    """
    tip_ids = [c.section_id for c in cards if c.game_title == _COMPAT_GAME_TITLE]
    if not tip_ids:
        return cards
    placeholders = ",".join("?" for _ in tip_ids)
    try:
        rows = conn.execute(
            "SELECT p.pattern_id, g.canonical_title FROM compat_patterns p "
            "JOIN games g ON p.app_id IN (g.app_id, g.igdb_id) "
            f"WHERE p.app_id IS NOT NULL AND p.pattern_id IN ({placeholders})",
            tip_ids,
        ).fetchall()
    except sqlite3.OperationalError:
        return cards
    titles = {int(r["pattern_id"]): str(r["canonical_title"] or "") for r in rows}
    return [
        replace(c, game_title=titles[c.section_id])
        if c.game_title == _COMPAT_GAME_TITLE and titles.get(c.section_id)
        else c
        for c in cards
    ]


def _section_row_to_card(row: sqlite3.Row, *, bm25_score: float = 0.0) -> KnowledgeCard:
    """Build a card from a `sections` row. Sibling of ``_compat_row_to_card``.

    ``bm25_score`` is a keyword score the caller measured, so it is passed rather than read:
    the vector recall pass finds cards no FTS query ranked and leaves it at 0.0.
    """
    return KnowledgeCard(
        section_id=int(row["section_id"]),
        game_id=int(row["game_id"]),
        game_title=str(row["canonical_title"] or ""),
        section_type=str(row["section_type"] or ""),
        name=str(row["name"] or ""),
        card=str(row["card"] or ""),
        source_url=str(row["source_url"] or ""),
        source_license=str(row["source_license"] or ""),
        source_version=row["source_version"],
        crawled_at=row["crawled_at"],
        trust_tier=_trust_tier_for_row(row),
        bm25_score=bm25_score,
    )


def _omitted_note(count: int) -> str:
    return f"\n[{count} more card(s) omitted to fit budget]"


_BLOCK_HEADER = "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---"
_BLOCK_SENTINEL = "--- End local knowledge base ---"


def _card_lines(card: KnowledgeCard, *, domain: str) -> str:
    if domain == "compat":
        return f"\n[Tip: {card.name}] (trust: {card.trust_tier})\n{card.card}"
    return (
        f"\n[{card.game_title} / {card.section_type}: {card.name}] "
        f"(trust: {card.trust_tier})\n{card.card}"
    )


def _format_block(
    cards: list[KnowledgeCard],
    *,
    fallback_text: Optional[str],
    domain: str,
    max_bytes: int,
) -> tuple[str, str, list[dict[str, str]]]:
    """Render the KB block, dropping whole cards to fit ``max_bytes``.

    The predecessor byte-sliced the finished string. That cut the last card mid-sentence,
    threw away the end sentinel so the model could not tell where the corpus stopped and the
    conversation resumed, and still reported the truncated card in ``sources`` — a citation
    for text that was no longer there.
    """
    header = [_BLOCK_HEADER, f"Domain: {domain}"]

    def _encoded_len(parts: list[str]) -> int:
        return len("\n".join(parts).encode("utf-8"))

    def _fit(reserve_note: bool) -> list[KnowledgeCard]:
        """Longest prefix of ``cards`` that fits alongside the header, sentinel and note."""
        tail = ["\n" + _BLOCK_SENTINEL]
        if reserve_note:
            tail = [_omitted_note(len(cards))] + tail
        kept: list[KnowledgeCard] = []
        body: list[str] = []
        for card in cards:
            candidate = body + [_card_lines(card, domain=domain)]
            if _encoded_len(header + candidate + tail) > max_bytes:
                break
            body = candidate
            kept.append(card)
        return kept

    if cards:
        kept = _fit(reserve_note=False)
        if len(kept) < len(cards):
            # Something is being dropped, so the note is going in and has to fit too.
            kept = _fit(reserve_note=True)
        if not kept:
            # Not even one card fits the mode's budget; say nothing rather than a fragment.
            return "", TRUST_TIER_FALLBACK, []
        lines = header + [_card_lines(c, domain=domain) for c in kept]
        trust = _lowest_trust_tier(kept)
        # Sources describe surviving cards only — a citation for text the model never saw is
        # worse than no citation.
        #
        # Every kept card gets an entry here, whether or not it has a source page -- `url` and
        # `license` are simply "" for a maintainer-authored note or a shared troubleshooting
        # tip. This used to be `if c.source_url`, which dropped those cards from this list
        # entirely: the one place the credit line under a reply (build_attribution_entries,
        # transparency_service.py) reads what actually attached, so a shared tip or a
        # memory-written note had never once named itself there, even though it plainly shaped
        # the reply. See docs/roadmap.md, "The credit line under a reply never names a note
        # with no source page, or a shared tip."
        sources = [
            {
                "title": f"{c.game_title} — {c.name}",
                "url": c.source_url,
                "license": c.source_license or "",
                # When the wiki text behind this card was captured. Several corpus sources
                # are archive.org snapshots years old; a credit that hides that reads as
                # current advice.
                "captured": str(c.crawled_at or ""),
            }
            for c in kept
        ]
        if len(kept) < len(cards):
            lines.append(_omitted_note(len(cards) - len(kept)))
    elif fallback_text:
        lines = header + [
            f"\n[Genre/compat fallback] (trust: {TRUST_TIER_FALLBACK})\n{fallback_text}"
        ]
        trust = TRUST_TIER_FALLBACK
        sources = []
        if _encoded_len(lines + ["\n" + _BLOCK_SENTINEL]) > max_bytes:
            return "", TRUST_TIER_FALLBACK, []
    else:
        return "", TRUST_TIER_FALLBACK, []

    lines.append("\n" + _BLOCK_SENTINEL)
    return "\n".join(lines), trust, sources


def lookup_game_genres(settings: dict, app_id: str) -> str:
    """Return comma-separated Steam genres for AppID from the local KB corpus, if available."""
    aid = str(app_id or "").strip()
    if not aid:
        return ""
    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return ""
    try:
        conn = _get_connection(db_path)
        row = conn.execute(
            "SELECT genres FROM games WHERE app_id = ? LIMIT 1",
            (aid,),
        ).fetchone()
        if row and row["genres"]:
            return str(row["genres"]).strip()
    except Exception:
        return ""
    return ""
