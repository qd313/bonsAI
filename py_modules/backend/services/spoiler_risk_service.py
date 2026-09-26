"""Title: Guessing how spoiler-heavy a reply's topic is, for the "Show details" chip

Purpose: Some replies touch things a player might not want to know yet -- a
boss's weak point, how a story ends. This file works out a rough low / medium
/ high guess at how likely a reply's topic is to spoil something, purely so
the "Show details" chip under a reply can show it. It is only ever a
read-only guess shown after the fact -- see Does not, below, for the actual
system that decides what a reply says or hides.
Used for: building the spoiler-risk line inside every reply's "Show details"
chip, and captured as part of the record kept about how a reply was put
together.
Solves: without one shared way to work this out, the number shown to a person
could be guessed differently in different places, and could drift out of
step with the real masking decision made elsewhere when the reply was
written.
Does not: hide or change any part of a reply -- see the real spoiler-masking
system for that. It is also not fully wired up yet: this file can blend its
own guess with a short tag the AI model would add to its own reply
(`<bonsai-spoiler-risk>`), but no prompt today ever asks the model to add
that tag, so in the shipped product this blend never actually happens --
every band shown today comes from the guess alone. The blending code is
real, tested, and ready for the day a prompt asks for the tag; it is simply
not connected to one yet, which was confirmed by reading `ollama_prompts.py`,
not assumed.
"""

from __future__ import annotations

import re
from typing import Any, Literal, Optional

from backend.services.spoiler_title_profiles import resolve_title_spoiler_profile
from backend.services.ollama_prompts import (
    extract_strategy_asked_entity,
    kb_text_covers_asked_entity,
)
from backend.services.ask_topic_instructions import question_matches_troubleshooting_log_context

SpoilerRiskBand = Literal["low", "med", "high"]

_MODEL_TAG_RE = re.compile(
    r"<bonsai-spoiler-risk>\s*(low|med|medium|high)\s*</bonsai-spoiler-risk>",
    re.IGNORECASE,
)
_KB_SECTION_TYPE_RE = re.compile(r"\[[^\]]+?/\s*([^:\]]+)\s*:", re.IGNORECASE)

_HIGH_SPOILER_SECTION_TYPES = frozenset(
    {
        "boss",
        "dungeon",
        "quest",
        "area",
        "ending",
        "story",
        "puzzle",
        "secret",
    }
)
_LOW_SPOILER_SECTION_TYPES = frozenset({"tip", "compat", "control", "mechanic", "starting_out"})


def spoiler_risk_chip_label(band: SpoilerRiskBand) -> str:
    """User-facing chip label (≤ ~18 chars)."""
    return f"Spoiler risk: {band}"


def parse_bonsai_spoiler_risk_tag(text: str) -> Optional[SpoilerRiskBand]:
    """Return a closed ``<bonsai-spoiler-risk>`` band when present; ignore incomplete tags."""
    raw = text or ""
    match = _MODEL_TAG_RE.search(raw)
    if not match:
        return None
    token = (match.group(1) or "").strip().lower()
    if token == "medium":
        return "med"
    if token in ("low", "med", "high"):
        return token  # type: ignore[return-value]
    return None


def extract_kb_section_types_from_text(kb_text: str) -> list[str]:
    """Pull section_type tokens from KB block card headers."""
    seen: list[str] = []
    for match in _KB_SECTION_TYPE_RE.finditer(kb_text or ""):
        st = str(match.group(1) or "").strip().lower()
        if st and st not in seen:
            seen.append(st)
    return seen


def build_spoiler_risk_signals(
    *,
    ask_mode: str,
    app_id: str,
    question: str,
    game_genres: str = "",
    kb_text: str = "",
    asked_entity: str = "",
    kb_entity_match: bool = False,
    title_profile: str = "",
    app_name: str = "",
    kb_domain: str = "",
) -> dict[str, Any]:
    """Collect inputs for band scoring before or after the model reply.

    `app_name` matters only when no `title_profile` is supplied: profile resolution falls back
    to the title name when the AppID is absent or unlisted, so omitting it silently downgrades
    a name-matched title to `unknown`.

    `kb_domain` is this turn's own knowledge-base routing decision (``"compat"`` for the shared
    troubleshooting tip sheet, ``"strategy"`` for a game's notes, ``""`` when nothing was
    retrieved) -- see the `is_troubleshooting` comment below for why it is read here too, not
    only the word list.
    """
    entity = (asked_entity or "").strip() or extract_strategy_asked_entity(question)
    kb_match = bool(kb_entity_match) or kb_text_covers_asked_entity(kb_text, entity)
    profile = (title_profile or "").strip() or resolve_title_spoiler_profile(app_id, app_name)
    return {
        "ask_mode": str(ask_mode or "speed").strip().lower(),
        "app_id": str(app_id or "").strip(),
        "app_name": str(app_name or "").strip(),
        "game_genres": str(game_genres or "").strip(),
        "asked_entity": entity,
        "kb_entity_match": kb_match,
        "kb_section_types": extract_kb_section_types_from_text(kb_text),
        "title_profile": profile,
        # A troubleshooting question (crashes, Proton, stutter, ...) is not about game content
        # at all, so it must not inherit the Ask mode's spoiler bump below -- see the comment
        # on that bump in compute_heuristic_spoiler_risk_score. The word list alone missed a
        # real one: "my deck fan gets very loud while sitting idle" got a troubleshooting tip
        # attached (kb_domain == "compat") but names no listed crash/Proton/stutter keyword, so
        # it still read "med" on the Deck (docs/test-evidence/plan70-L1-8-HELPER-M.json). This
        # turn's own KB routing already decided the question is a troubleshooting one whenever
        # it routed to the shared tip sheet, whatever words it used to get there, so that
        # decision counts here too -- it is a stronger, wording-independent signal, not a
        # replacement for the word list (a troubleshooting question with nothing installed to
        # match, e.g. no corpus, still has only the words to go on).
        "is_troubleshooting": (
            question_matches_troubleshooting_log_context(question)
            or str(kb_domain or "").strip().lower() == "compat"
        ),
    }


def _band_to_score(band: SpoilerRiskBand) -> float:
    if band == "low":
        return 25.0
    if band == "high":
        return 85.0
    return 55.0


def _score_to_band(score: float) -> SpoilerRiskBand:
    if score <= 33.0:
        return "low"
    if score <= 66.0:
        return "med"
    return "high"


def compute_heuristic_spoiler_risk_score(signals: dict[str, Any]) -> float:
    """0–100 score from genre, intent, KB section types, and entity match."""
    score = 35.0

    mode = str(signals.get("ask_mode") or "speed").strip().lower()
    if signals.get("is_troubleshooting"):
        # A troubleshooting question ("my game keeps crashing", "black screen after sleep")
        # is not asking about game content at all. Before this, it inherited the same +8/+15/+25
        # bump every other question gets purely from its Ask mode, so a troubleshooting
        # question with no game running and no notes attached -- nothing left to raise or
        # lower the score -- landed on a flat 43 every time: always "med", never "low", with
        # zero signal actually behind it. Real signals (a resolved title's profile, an
        # attached note's kind) still apply below and can still pull the score back up.
        score -= 10.0
    elif mode == "strategy":
        score += 25.0
    elif mode == "expert":
        score += 15.0
    else:
        score += 8.0

    app_id = str(signals.get("app_id") or "").strip()
    profile = str(signals.get("title_profile") or "").strip() or resolve_title_spoiler_profile(
        app_id, str(signals.get("app_name") or "")
    )
    # One source of truth: an explicitly supplied title_profile wins, and only when the caller
    # supplies none does the AppID table decide. Re-checking the table here as well made an
    # explicit profile unoverridable.
    if profile == "low_narrative":
        score -= 28.0
    elif profile == "protect_progression":
        score += 10.0
    elif str(signals.get("game_genres") or "").strip():
        score += 10.0

    section_types = [str(s).strip().lower() for s in (signals.get("kb_section_types") or []) if s]
    if section_types:
        high_hits = sum(1 for st in section_types if st in _HIGH_SPOILER_SECTION_TYPES)
        low_hits = sum(1 for st in section_types if st in _LOW_SPOILER_SECTION_TYPES)
        if high_hits:
            score += min(22.0, 8.0 * high_hits)
        if low_hits and not high_hits:
            score -= 12.0

    entity = str(signals.get("asked_entity") or "").strip()
    if entity or signals.get("kb_entity_match"):
        score -= 18.0

    return max(0.0, min(100.0, score))


def compute_spoiler_risk_band(
    signals: dict[str, Any],
    *,
    assistant_text: str = "",
) -> SpoilerRiskBand:
    """Blend heuristic score with an optional closed model tag (~60% tag weight)."""
    heuristic = compute_heuristic_spoiler_risk_score(signals)
    model_band = parse_bonsai_spoiler_risk_tag(assistant_text)
    if model_band is None:
        return _score_to_band(heuristic)
    model_score = _band_to_score(model_band)
    blended = 0.6 * model_score + 0.4 * heuristic
    return _score_to_band(blended)


def spoiler_risk_detail_bullets(
    band: SpoilerRiskBand,
    signals: dict[str, Any],
    *,
    model_band: Optional[SpoilerRiskBand] = None,
) -> list[str]:
    """Transparency bullets for the chip body."""
    bullets = [f"Estimated band: {band}"]
    mode = str(signals.get("ask_mode") or "speed")
    bullets.append(f"Ask mode: {mode}")
    genres = str(signals.get("game_genres") or "").strip()
    if genres:
        bullets.append(f"Genres: {genres}")
    profile = str(signals.get("title_profile") or "").strip()
    if profile:
        bullets.append(f"Title profile: {profile}")
    section_types = signals.get("kb_section_types") or []
    if section_types:
        bullets.append("KB sections: " + ", ".join(str(s) for s in section_types))
    entity = str(signals.get("asked_entity") or "").strip()
    if entity:
        bullets.append(f"Named entity: {entity}")
    if signals.get("kb_entity_match"):
        bullets.append("KB covers asked entity")
    if model_band:
        bullets.append(f"Model tag: {model_band}")
    bullets.append("Transparency only — does not change spoiler masking.")
    return bullets


def spoiler_risk_signals_from_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Rebuild scoring inputs from a transparency snapshot dict.

    The normal path takes the nested `spoiler_risk_signals` written by `run_game_ai_request`.
    Everything below it is the degraded path for a snapshot that predates that key or was
    truncated: it recovers the title profile from `app_id`/`app_name` and re-derives the asked
    entity from the question, but cannot recover `game_genres`, `kb_entity_match`, or the KB
    section types — no snapshot key ever carried them flat. A rebuilt band can therefore read
    lower than the one the turn actually showed.
    """
    nested = snapshot.get("spoiler_risk_signals")
    if isinstance(nested, dict):
        return dict(nested)
    return build_spoiler_risk_signals(
        ask_mode=str(snapshot.get("ask_mode") or "speed"),
        app_id=str(snapshot.get("app_id") or ""),
        app_name=str(snapshot.get("app_name") or ""),
        question=str(snapshot.get("text_after_sanitizer") or snapshot.get("raw_question") or ""),
        kb_text="",
        kb_domain=str(snapshot.get("kb_domain") or ""),
    )
