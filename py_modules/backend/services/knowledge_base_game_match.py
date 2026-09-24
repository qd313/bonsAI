"""Title: Working out which game a question belongs to

Purpose: Every knowledge-base search is scoped to one game -- searching the
whole corpus for "how do I beat the tank" would find Left 4 Dead 2's Tank
card while you are playing something else entirely. This file is where that
game gets decided (Steam's own AppID first, then a nickname, then, only as a
last resort, a title the question itself names), and where a question's
wording is normalised before it reaches the search -- correcting British
spelling so "armour" still finds a card written "armor", and stripping a
resolved game's own name back out of a question so a second meaning-search
measurement is not just measuring the game's name against itself.

Used for: knowledge_base_service.py's retrieval entry point, and the
coverage and chip-suggestion helpers, all resolve the game through
`_resolve_game_id()` before searching or counting anything.
`resolve_title_from_question()` is D19's last resort, tried by the caller
only once nothing is running.

Solves: Word search and title lookups being naive about wording. Without the
British/American mapping, a whole dialect of spelling used no cards at all;
without stripping the game's own name back out, a game repeating its own
name in every one of its cards inflated its own meaning-search score in a
way that had nothing to do with whether the note actually answered the
question.

Does not: Decide whether to search at all, or run the search itself --
knowledge_base_service.py's should-retrieve check and retrieval entry point
own those.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Optional

from backend.services.kb_not_in_notes_notice import _content_words
from backend.services.knowledge_base_cards import _get_connection
from backend.services.knowledge_base_schema import normalize_alias, resolve_corpus_db_path

# D19: a title named in the question is worth as much as a title Steam happens to be running.
# 3 characters minimum, locked -- excluding 3-char aliases would fail `hl2 ravenholm`, which is
# the documented KB-NEWTITLE-01 case this exists to fix.
_MIN_TEXT_TITLE_ALIAS_LEN = 3


def resolve_title_from_question(settings: dict, question: str) -> str:
    """Canonical title the question names outright, or "" (D19).

    **Last resort only.** Callers must not reach for this while a game is running -- a question
    that mentions Portal 2 while Hades is open is still an Ask about Hades, and letting the text
    win would answer the wrong game. The caller enforces that; this function has no way to know.

    Longest alias wins, so `portal 2` beats `portal` and `half life 2` beats `hl2`. Matching is
    on word boundaries over the same normalisation the alias table is built with, so `soh` does
    not fire inside "so here".

    **Known risk, accepted at lock time:** short aliases appear in ordinary sentences -- "this
    game is hades on my battery" resolves Hades. BM25_RELEVANCE_FLOOR still has to be cleared
    for a card to attach, which catches most of it, not all. Widen the denylist only on evidence
    from QA, not pre-emptively.
    """
    text = normalize_alias(question)
    if not text:
        return ""
    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return ""
    try:
        conn = _get_connection(db_path)
        rows = conn.execute(
            "SELECT a.alias_normalized AS alias, g.canonical_title AS title "
            "FROM aliases a JOIN games g ON g.game_id = a.game_id "
            "UNION ALL "
            "SELECT lower(canonical_title) AS alias, canonical_title AS title FROM games"
        ).fetchall()
    except sqlite3.Error:
        return ""

    best_title = ""
    best_len = 0
    for row in rows:
        alias = normalize_alias(str(row["alias"] or ""))
        if len(alias) < _MIN_TEXT_TITLE_ALIAS_LEN or len(alias) <= best_len:
            continue
        if re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", text):
            best_title = str(row["title"] or "")
            best_len = len(alias)
    return best_title


def _resolve_game_id(
    conn: sqlite3.Connection,
    *,
    app_id: str,
    app_name: str,
    shortcut_name: str,
    text_resolved_title: str = "",
) -> tuple[Optional[int], str]:
    """AppID-first, then alias table, then a title the question named (D19).

    The text-resolved title is tried **last** and only carries what the caller handed over, so
    a running game always wins. Its resolution note is prefixed ``text:`` so Show details can
    say the title came from the question rather than from Steam.
    """
    aid = str(app_id or "").strip()
    if aid.isdigit():
        row = conn.execute(
            "SELECT game_id FROM games WHERE app_id = ? LIMIT 1",
            (aid,),
        ).fetchone()
        if row:
            return int(row["game_id"]), f"app_id:{aid}"

    candidates: list[str] = []
    if app_name:
        candidates.append(normalize_alias(app_name))
    if shortcut_name:
        candidates.append(normalize_alias(shortcut_name))
    text_candidate = normalize_alias(text_resolved_title) if text_resolved_title else ""
    if text_candidate:
        # Canonical titles are matched in Python, not SQL, because the two sides normalise
        # differently: `normalize_alias` strips punctuation, `lower(canonical_title)` keeps it,
        # so "The Legend of Zelda: Ocarina of Time" never equalled its own normalised form and
        # OoT silently fell through to the genre fallback. Thirteen rows; the scan is free.
        for row in conn.execute("SELECT game_id, canonical_title FROM games").fetchall():
            if normalize_alias(str(row["canonical_title"] or "")) == text_candidate:
                return int(row["game_id"]), f"text:{text_candidate}"
        candidates.append(text_candidate)
    for cand in candidates:
        if not cand:
            continue
        row = conn.execute(
            "SELECT game_id FROM aliases WHERE alias_normalized = ? LIMIT 1",
            (cand,),
        ).fetchone()
        note_prefix = "text" if cand == text_candidate else "alias"
        if row:
            return int(row["game_id"]), f"{note_prefix}:{cand}"
        row = conn.execute(
            "SELECT game_id FROM games WHERE lower(canonical_title) = ? LIMIT 1",
            (cand,),
        ).fetchone()
        if row:
            return int(row["game_id"]), f"{'text' if cand == text_candidate else 'title'}:{cand}"
    return None, "unresolved"


# Every card in the corpus is written in US English and FTS5's porter stemmer normalises word
# endings, not spelling variants, so `armour` matched nothing while `armor` found the card
# sitting right there (measured 2026-08-18, corpus 2026.08.16).
#
# The query is **widened, never rewritten**: both spellings go in, and _fts_match_query ORs its
# tokens, so a British question reaches a US-spelled card and a card that ever gets written in
# British English still reaches its own question. Substituting one for the other would just move
# the blind spot.
#
# Suffix rules rather than a word list, because the failure is systematic. Word list only where
# a rule would misfire.
_SPELLING_SUFFIX_RULES = (
    ("our", "or"),      # armour, colour, behaviour, favourite, honour, rumour, neighbour
    ("ours", "ors"),
    ("oured", "ored"),
    ("ouring", "oring"),
    ("ise", "ize"),     # customise, optimise, organise, realise, recognise
    ("ised", "ized"),
    ("ising", "izing"),
    ("isation", "ization"),
    ("yse", "yze"),     # analyse, paralyse
    ("ysed", "yzed"),
    ("tre", "ter"),     # centre, metre, theatre, fibre
    ("tres", "ters"),
    ("ence", "ense"),   # defence, offence, licence
    ("ences", "enses"),
    ("logue", "log"),   # dialogue, catalogue
)

_SPELLING_WORDS = {
    "grey": "gray",
    "greyed": "grayed",
    "aluminium": "aluminum",
    "tyre": "tire",
    "tyres": "tires",
    "sulphur": "sulfur",
    "kerb": "curb",
    "plough": "plow",
    "draught": "draft",
    "mould": "mold",
    "moulded": "molded",
    "storey": "story",
    "aeroplane": "airplane",
    "programme": "program",
    "cheque": "check",
    "gaol": "jail",
    "manoeuvre": "maneuver",
    "manoeuvres": "maneuvers",
}

# Rules that would fire on ordinary words. "our" -> "or" must not turn *our* into *or*, and the
# -ence rule must not touch words whose US spelling is also -ence.
_SPELLING_EXEMPT = frozenset(
    {
        "our", "ours", "four", "fours", "hour", "hours", "flour", "flours", "pour", "pours",
        "tour", "tours", "sour", "your", "yours", "detour", "detours", "devour", "labour",
        "rise", "raise", "wise", "else", "sentence", "sentences", "science", "sciences",
        "silence", "silences", "presence", "essence", "absence", "evidence", "sequence",
        "sequences", "influence", "audience", "experience", "experiences", "difference",
        "differences", "reference", "references", "preference", "preferences", "confidence",
        "patience", "violence", "existence", "occurrence", "interference", "convenience",
        "centre",  # handled by the rule; listed nowhere else so the rule owns it
    }
) - {"centre"}


def _us_spelling_variant(token: str) -> str:
    """The US spelling of one British token, or "" when there is nothing to add."""
    low = token.lower()
    if low in _SPELLING_EXEMPT:
        return ""
    mapped = _SPELLING_WORDS.get(low)
    if mapped:
        return mapped
    for british, american in _SPELLING_SUFFIX_RULES:
        if len(low) > len(british) + 1 and low.endswith(british):
            return low[: -len(british)] + american
    return ""


def _add_spelling_variants(question: str) -> str:
    """Append US spellings of any British words, so the query matches either form."""
    extra: list[str] = []
    seen: set[str] = set()
    for token in re.findall(r"\w+", question or ""):
        variant = _us_spelling_variant(token)
        if variant and variant != token.lower() and variant not in seen:
            seen.add(variant)
            extra.append(variant)
    if not extra:
        return question
    return f"{question} {' '.join(extra)}"


def _expand_query(question: str, app_name: str, *, game_resolved: bool = False) -> str:
    """Rule-based query expansion (no LLM).

    The app name is dropped once ``game_resolved`` — the search is already scoped by
    ``game_id``, so the title contributes nothing but BM25 noise, and it inflates exactly the
    cards that happen to repeat the title in their text. On the unresolved path it is the only
    signal narrowing the search, so it goes *first*: appending it put it past the token cap on
    any question of ordinary length, which silently discarded it.
    """
    q = _add_spelling_variants((question or "").strip())
    name = (app_name or "").strip()
    if game_resolved or not name:
        return q
    return " ".join(p for p in (name, q) if p)


def _question_without_game_name(question: str, game_name: str) -> str:
    """``question`` with every whole word of ``game_name`` removed, case-insensitively.

    Tokenises with `_content_words` (kb_not_in_notes_notice.py) so "Black Mesa" strips both
    "black" and "mesa" -- the same split that function already uses to decide whether a keyword
    score reflects the question. Filler words in the question itself ("how", "do", "i", ...) are
    left alone: this rebuilds what a person would still be asking if they had never typed the
    game's name, not just its content words, because that is the sentence
    `retrieve_knowledge_context` measures below. Returns "" when nothing of the question is left
    (it was only the game's name), which the caller reads as "nothing to measure a second time".
    """
    name_words = _content_words(game_name)
    if not name_words:
        return question or ""
    tokens = re.findall(r"[A-Za-z0-9']+", question or "")
    remaining = [tok for tok in tokens if tok.lower() not in name_words]
    return " ".join(remaining)
