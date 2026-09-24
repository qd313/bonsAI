"""Title: Turning a corpus row into a note the model can read

Purpose: The knowledge base keeps its game notes and troubleshooting tips as
plain database rows. This file is where a row becomes a `KnowledgeCard` --
the one shape every other piece of knowledge-base code passes around -- and
where a set of cards becomes the actual block of text handed to the AI,
complete with a trust label and a source list.

Used for: Every search result in knowledge_base_search.py turns its rows into
`KnowledgeCard`s here. knowledge_base_service.py calls `_format_block()` once
a search has settled on which cards to attach, and holds the one shared
database connection (`_get_connection()` / `close_connection()`) every other
knowledge-base file reads through, so there is exactly one open handle per
corpus file rather than one per caller.

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
from dataclasses import dataclass
from typing import Optional

from backend.services.knowledge_base_schema import (
    TRUST_TIER_FALLBACK,
    TRUST_TIER_WIKI_NO_PATCH,
    TRUST_TIER_WIKI_VERIFIED,
    resolve_corpus_db_path,
)

_CONN_LOCK = threading.Lock()
_CONN_BY_PATH: dict[str, sqlite3.Connection] = {}


def _get_connection(db_path: str) -> sqlite3.Connection:
    with _CONN_LOCK:
        conn = _CONN_BY_PATH.get(db_path)
        if conn is None:
            # immutable=1, not just mode=ro: the shipped corpus is written once on the
            # maintainer PC and never mutated on device. It tells SQLite to skip WAL/locking
            # machinery entirely, which is what makes reads safe on an exFAT SD card where
            # lock files are unreliable. The builder now checkpoints and VACUUMs before
            # shipping, so there is no -wal alongside the file to ignore.
            conn = sqlite3.connect(
                f"file:{db_path}?mode=ro&immutable=1", uri=True, check_same_thread=False
            )
            conn.row_factory = sqlite3.Row
            _CONN_BY_PATH[db_path] = conn
        return conn


def close_connection(db_path: str) -> None:
    with _CONN_LOCK:
        conn = _CONN_BY_PATH.pop(db_path, None)
        if conn is not None:
            try:
                conn.close()
            except sqlite3.Error:
                pass


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
