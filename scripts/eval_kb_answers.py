#!/usr/bin/env python3
"""Title: Knowledge-base answer eval

Purpose: Measure what the Deck's own model writes FROM the cards, not whether the cards were
         found. Runs the real Ask pipeline (``run_game_ai_request`` -> retrieval -> prompt ->
         Ollama -> fence parsing -> safety guard) on the maintainer PC with the Deck's model tag,
         and scores each reply with four judge-free checks per fixture case:
         facts kept (``must_mention``), nothing the card contradicts (``must_not_say``), spoiler
         fence only where the rules allow (``expect_fence``), and a Strategy first turn ending
         with the branch menu (``expect_branches``). Decision D45.
Used for: docs/testing.md row KB-ANSWER-01; the before/after gate for every prompt change in
          docs/planning/30-kb-answer-quality-plan.md (W4 prompt diet, W6 spoiler tiers, D54).
Solves: The search half of the knowledge base is measured to the decimal
        (scripts/eval_kb_embed_models.py); the answer half had one on-Deck data point. Every
        prompt edit so far shipped on feel.
Does not: Judge with a second model, touch the Deck, or write settings anywhere except its own
          work directory. Sampling is stochastic at the shipped temperature, so it runs each case
          several times and reports rates, never a single verdict.

Two-turn pairs (plan 48, D98): ``--pairs`` runs the fixture's ``followup_pairs`` instead of
``cases`` -- a first question, then a bare follow-up, asked in order against the same process, so
the follow-up sees whatever the plugin's own follow-up memory (kb_followup_memory) remembered from
the turn before. ``--followup-shape`` selects a measurement-only fix for the bug that memory alone
does not close (the right note ranks first, but a better-matching wrong note is still in the pile
and the model writes about that instead): ``tell_subject`` adds one sentence to the prompt naming
the carried-over subject; ``narrow_notes`` drops every attached card but that subject's own.
Neither is shipped -- ``baseline`` (the default) is exactly today's code and is the third column
either shape is measured against.

Usage:
  python scripts/eval_kb_answers.py                          # every case, 3 samples, baseline prompt
  python scripts/eval_kb_answers.py --only A-DRG-01 --samples 1
  python scripts/eval_kb_answers.py --label after-w4         # report suffix for a before/after pair
  python scripts/eval_kb_answers.py --no-write-report        # console only
  python scripts/eval_kb_answers.py --pairs --followup-shape tell_subject --samples 3

Needs: Ollama on this PC with the Deck's chat model and ``nomic-embed-text`` pulled, and a built
corpus at --corpus (``python scripts/build_rag_db.py --seed --out ./build/knowledge-base``).
"""
from __future__ import annotations

import argparse
import asyncio
import itertools
import json
import logging
import os
import re
import sys
import time
import types
import urllib.error
import urllib.request
from dataclasses import dataclass, field, replace
from datetime import date
from pathlib import Path
from typing import Any, Callable, Optional

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "py_modules"))

# Neither module touches `decky` at import time (confirmed 2026-09-06), so these are safe to
# import eagerly, unlike `main` / `game_ai_request` / `ollama_prompts` below which are deferred
# until after install_fake_decky() runs.
from backend.services.ai_character_service import VALID_PRESET_IDS  # noqa: E402
from backend.services.ollama_service import estimate_prompt_tokens  # noqa: E402

DEFAULT_OLLAMA = "http://127.0.0.1:11434"
DEFAULT_MODEL = "gemma4:e2b-it-qat"  # what the Deck loads (measured 2026-09-01)
DEFAULT_CORPUS = ROOT / "build" / "knowledge-base"
DEFAULT_FIXTURE = ROOT / "tests" / "fixtures" / "kb_answer_eval.json"
DEFAULT_WORK_DIR = ROOT / "build" / "kb-answer-eval" / "work"
REPORT_DIR = ROOT / "docs" / "archive" / "research"
JSON_DIR = ROOT / "build" / "kb-answer-eval"

SPOILER_FENCE_RE = re.compile(r"```\s*bonsai-spoiler", re.I)
PAYLOAD_RE = re.compile(r"payload_bytes=(\d+)")
PROMPT_EVAL_RE = re.compile(r"prompt_eval=(\d+)")
# ``ollama_service.prompt_window_warning``'s own line: "...prompt ~2800 tokens + num_predict...".
_WINDOW_WARNING_TOKENS_RE = re.compile(r"prompt ~(\d+) tokens")


def _extract_window_warning(log_lines: list[str]) -> tuple[bool, Optional[int]]:
    """True plus the warning's own prompt-token estimate when D46's ``prompt_window_warning``
    fired somewhere in ``log_lines``; else False and None so the caller falls back to
    ``estimate_prompt_tokens`` on the captured system prompt."""
    for line in log_lines:
        if "drops its start silently" not in line:
            continue
        m = _WINDOW_WARNING_TOKENS_RE.search(line)
        if m:
            return True, int(m.group(1))
    return False, None


# --- environment: the plugin outside Decky ----------------------------------------------------

class _ListHandler(logging.Handler):
    """Keeps every backend log line so a sample can read its own payload size afterwards."""

    def __init__(self) -> None:
        super().__init__()
        self.records: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self.records.append(self.format(record))
        except Exception:  # pragma: no cover - logging must never break the run
            pass


def install_fake_decky(work_dir: Path) -> tuple[types.ModuleType, _ListHandler]:
    """Same stub the Python tests use, with real directories so the plugin can write."""
    if "fcntl" not in sys.modules:  # Windows has no fcntl; the plugin only uses flock()
        _fcntl = types.ModuleType("fcntl")
        _fcntl.LOCK_EX = 2
        _fcntl.LOCK_NB = 4
        _fcntl.LOCK_UN = 8
        _fcntl.flock = lambda *_a, **_k: False
        sys.modules["fcntl"] = _fcntl

    # Unix-only modules the plugin imports at module level (screenshot_media reads pwd for the
    # Deck user's home). The PC never reaches that code path, so an empty stub is enough.
    for name in ("pwd", "grp"):
        if name in sys.modules:
            continue
        try:
            __import__(name)
        except ImportError:
            stub = types.ModuleType(name)
            entry = types.SimpleNamespace(pw_name="deck", pw_dir=str(work_dir), pw_uid=1000, gr_name="deck")
            stub.getpwuid = lambda *_a, **_k: entry
            stub.getpwnam = lambda *_a, **_k: entry
            stub.getgrgid = lambda *_a, **_k: entry
            stub.getgrnam = lambda *_a, **_k: entry
            sys.modules[name] = stub

    settings_dir = work_dir / "settings"
    runtime_dir = work_dir / "runtime"
    log_dir = work_dir / "logs"
    for d in (settings_dir, runtime_dir, log_dir):
        d.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("bonsai-answer-eval")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for h in list(logger.handlers):
        logger.removeHandler(h)
    fmt = logging.Formatter("[%(asctime)s][%(levelname)s]: %(message)s")
    capture = _ListHandler()
    capture.setFormatter(fmt)
    logger.addHandler(capture)
    fh = logging.FileHandler(log_dir / "answer-eval.log", encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    decky = types.ModuleType("decky")
    decky.DECKY_PLUGIN_SETTINGS_DIR = str(settings_dir)
    decky.DECKY_PLUGIN_RUNTIME_DIR = str(runtime_dir)
    decky.DECKY_PLUGIN_LOG_DIR = str(log_dir)
    decky.HOME = str(work_dir)
    decky.logger = logger
    sys.modules["decky"] = decky
    return decky, capture


def write_harness_settings(
    settings_dir: Path,
    *,
    corpus_dir: Path,
    corpus_version: str,
    model: str,
    voice_preset_id: str = "",
    think_effort: str = "off",
) -> Path:
    """The settings.json the plugin will load. Everything else takes the fresh-install default.

    ``think_effort`` matches the fresh-install default ("off") unless a device-shaped run asks
    for more — the maintainer's own Deck runs "medium". ``voice_preset_id`` turns on the
    character voice for a device-shaped run; an id outside ``VALID_PRESET_IDS`` is a typo, not a
    run worth measuring, so it raises rather than silently running voice-off.
    """
    if voice_preset_id and voice_preset_id not in VALID_PRESET_IDS:
        raise ValueError(
            f"unknown --voice preset id {voice_preset_id!r}; valid ids: {', '.join(sorted(VALID_PRESET_IDS))}"
        )
    payload = {
        "use_local_knowledge_base": True,
        "rag_corpus_path": str(corpus_dir),
        "rag_corpus_version": corpus_version,
        "text_model_routing_order": [model],
        "ai_character_enabled": bool(voice_preset_id),
        "show_developer_tab": False,
        "input_sanitizer_user_disabled": False,
        "capabilities": {},
        # Gemma is open-weight, not OSI open source; the default tier (open_source_only) would
        # drop it and the routing fallback then picks whatever is installed first.
        "model_policy_tier": "open_weight",
        "ask_think_effort": think_effort,
    }
    if voice_preset_id:
        payload["ai_character_preset_id"] = voice_preset_id
    path = settings_dir / "settings.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


# --- prompt variants (hook for W4 / W6 / D54 experiments) ------------------------------------

PromptVariant = Callable[[str], str]


def _variant_baseline(prompt: str) -> str:
    return prompt


# The two fence-format sentences of the first-turn spoiler policy (ollama_prompts.py,
# _strategy_spoiler_policy_block). Sentence B is the prime suspect for the baseline misfires: a
# 2B model reads "every bonsai-spoiler block must appear above the branch fence" as a requirement
# that such a block exists, and fencing a harmless opening line satisfies it cheaply.
_FENCE_SENTENCE_A = (
    "Put unavoidably spoilery detail only inside ```bonsai-spoiler ... ``` fences "
    "(opening line exactly ```bonsai-spoiler).\n"
)
_FENCE_SENTENCE_B = (
    "On this first turn, every ```bonsai-spoiler block must appear **above** the opening "
    "```bonsai-strategy-branches line; the branch fence must still close the reply — no characters "
    "after its closing ```.\n"
)
_ENTITY_RE = re.compile(r"NAMED-ENTITY CONSENT: The user asked about “([^”]+)” by name")


def _variant_drop_fence_placement(prompt: str) -> str:
    """Experiment 1: remove only sentence B (the placement rule) on every first turn."""
    return prompt.replace(_FENCE_SENTENCE_B, "")


def _variant_fence_subtractive(prompt: str) -> str:
    """Experiment 2: on low-narrative and named-entity turns, replace both fence-format sentences
    with one plain 'do not fence' line; story-title turns with no entity are left unchanged."""
    low = "LOW-SPOILER-RISK CONTEXT:" in prompt
    m = _ENTITY_RE.search(prompt)
    if not low and not m:
        return prompt
    if low:
        line = (
            "Do not use ```bonsai-spoiler fences in this reply: nothing about this title's bosses, "
            "enemies or waves is a story spoiler.\n"
        )
    else:
        entity = m.group(1)
        line = (
            f"Do not put anything about “{entity}” inside a ```bonsai-spoiler fence. Only if you must "
            "mention a story event the user did not ask about, wrap that one thing in "
            "```bonsai-spoiler ... ``` and place it above the branch fence.\n"
        )
    out = prompt.replace(_FENCE_SENTENCE_A, line, 1)
    out = out.replace(_FENCE_SENTENCE_B, "")
    return out


_KB_BLOCK_HEADER_MARKER = "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---"

# The short-orientation-then-menu sentence of the first-turn Strategy block
# (ollama_prompts.py, build_system_prompt's non-followup strategy_block). D86, plan 48 lane D:
# nobody has measured whether giving the note's tactics first, ahead of the same branch menu,
# reads better than today's brief orientation. This sentence only exists on a first-turn Strategy
# reply, so finding it already narrows to the right turn shape without a separate ask-mode check.
# As of 2026-09-07 the SHIPPED sentence is _ANSWER_FIRST_SENTENCE below. The orientation one is
# the old shape, kept only so it can still be measured.
_ORIENTATION_MENU_SENTENCE = (
    "After a brief orientation (no spoilers beyond what is needed to branch), you MUST end the "
    "reply with exactly one fenced block so the UI can show choices. "
)
_ANSWER_FIRST_SENTENCE = (
    "Lead with the note's tactics in plain text first — skip the orientation — then you "
    "MUST end the reply with exactly one fenced block so the UI can show choices. "
)


def _variant_orientation_first(prompt: str) -> str:
    """Put the OLD orientation-first sentence back, so the shape that shipped before 2026-09-07
    can still be measured against the one that ships now. This ran the other way round until the
    maintainer took tactics-first on the numbers; the direction is reversed rather than the
    variant deleted, because a before-and-after nobody can re-run is a number nobody can check.

    Originally: on a Strategy first turn that has both a knowledge-base note attached
    and a named thing the user asked about, swap the short-orientation-then-menu sentence for one
    that gives the note's tactics first, then the same menu. Everything else about the reply
    (the menu fence itself, the spoiler policy, the rest of the turn) is untouched.

    Both conditions are read off the finished prompt text, the same way the two fence variants
    above key off it: the knowledge-base block header (``_KB_BLOCK_HEADER_MARKER``) only appears
    when a note actually attached (knowledge_base_service._format_block returns nothing otherwise),
    and the named-entity line (``_ENTITY_RE``) only appears when the user named the thing
    (ollama_prompts._strategy_spoiler_low_risk_addendum). A Speed turn never builds the first-turn
    strategy block at all, so the target sentence is simply absent and this is a no-op — no
    separate ask-mode check is needed.
    """
    if _KB_BLOCK_HEADER_MARKER not in prompt:
        return prompt
    if not _ENTITY_RE.search(prompt):
        return prompt
    return prompt.replace(_ANSWER_FIRST_SENTENCE, _ORIENTATION_MENU_SENTENCE, 1)


VARIANTS: dict[str, PromptVariant] = {
    "baseline": _variant_baseline,
    "drop_fence_placement": _variant_drop_fence_placement,
    "fence_subtractive": _variant_fence_subtractive,
    "orientation_first": _variant_orientation_first,
}


def _build_prompt_wrapper(
    real_build: Callable[..., str],
    *,
    kb_placement: str,
    variant_fn: Optional[PromptVariant],
) -> Callable[..., str]:
    """Wrap ``build_system_prompt`` the same way ``--variant`` already does: swap the module-level
    name in ``main`` for a function that calls through to the real one. ``--kb-placement`` adds a
    ``knowledge_block_placement`` kwarg (only when it differs from the function's own "early"
    default, so a real_build that predates the parameter still works); ``--variant`` still runs
    last, as a text substitution on the finished prompt.
    """

    def _wrapped(*a: Any, **kw: Any) -> str:
        if kb_placement != "early":
            kw.setdefault("knowledge_block_placement", kb_placement)
        out = real_build(*a, **kw)
        if variant_fn is not None:
            out = variant_fn(out)
        return out

    return _wrapped


# --- fixture ---------------------------------------------------------------------------------

@dataclass
class Case:
    id: str
    app_id: str
    app_name: str
    ask_mode: str
    question: str
    expect_card: Optional[str]
    must_mention: list[list[str]]
    must_not_say: list[list[str]]  # claim groups: each inner list is one wrong claim's phrasings
    expect_fence: Optional[bool]
    expect_branches: Optional[bool]
    expect_attached: Optional[bool]
    note: str


def _parse_must_not_say(raw: Any) -> list[list[str]]:
    """The fixture's ``must_not_say`` accepts two shapes, so a partly-migrated row still loads:
    the old shape, a flat list of strings naming one implicit claim (every string an alternative
    phrasing of the same wrong claim); and the new shape, a list of claim groups, each an explicit
    list of alternative phrasings for one wrong claim. A row can have more than one distinct wrong
    claim under the new shape; the fixture in this repo does not, today."""
    items = list(raw or [])
    if not items:
        return []
    if all(isinstance(x, list) for x in items):
        return [[str(s) for s in group] for group in items]
    return [[str(s) for s in items]]


def load_fixture(path: Path, only: Optional[set[str]]) -> list[Case]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    cases: list[Case] = []
    for row in raw.get("cases") or []:
        cid = str(row.get("id") or "")
        if only and cid not in only:
            continue
        cases.append(
            Case(
                id=cid,
                app_id=str(row.get("app_id") or ""),
                app_name=str(row.get("app_name") or ""),
                ask_mode=str(row.get("ask_mode") or "speed"),
                question=str(row.get("question") or ""),
                expect_card=row.get("expect_card") or None,
                must_mention=[[str(a) for a in group] for group in (row.get("must_mention") or [])],
                must_not_say=_parse_must_not_say(row.get("must_not_say")),
                expect_fence=row.get("expect_fence"),
                expect_branches=row.get("expect_branches"),
                expect_attached=row.get("expect_attached"),
                note=str(row.get("note") or ""),
            )
        )
    if only:
        missing = only - {c.id for c in cases}
        if missing:
            raise SystemExit(f"unknown case id(s): {', '.join(sorted(missing))}")
    return cases


# --- follow-up pairs: a first question, then a bare follow-up (plan 48 D98) --------------------
#
# The fixture's ``cases`` list is one question each, scored in isolation -- nothing before this
# carried a second, dependent turn against the same session. A follow-up bug can only be measured
# with two turns asked in order: name a boss, then ask a bare "what about its second phase" and
# see what the *second* reply is about. ``FollowupPair`` is that: an ordered list of turns run
# against the same process (module-level follow-up memory, kb_followup_memory, is what carries
# state between them -- exactly what a real two-turn Ask does; nothing here re-implements it).
#
# Deliberately a separate top-level fixture key (``followup_pairs``) and a separate dataclass from
# ``Case`` rather than folding "turns" into ``Case`` itself: ``Case`` is depended on by its own
# shape (id/app_id/.../note, one turn) by both ``load_fixture`` and the harness plumbing tests in
# tests/test_eval_kb_answers.py, and changing it would touch code this lane's brief does not list.
# The existing 61 single-question cases run through the untouched ``Case``/``load_fixture``/
# ``run_sample`` path and are unaffected by anything below.


@dataclass
class FollowupTurn:
    question: str
    expect_card: Optional[str]
    must_mention: list[list[str]]
    must_not_say: list[list[str]]
    expect_fence: Optional[bool]
    expect_branches: Optional[bool]
    expect_attached: Optional[bool]
    note: str = ""


@dataclass
class FollowupPair:
    id: str
    app_id: str
    app_name: str
    ask_mode: str
    turns: list[FollowupTurn]
    note: str = ""


def _parse_followup_turn(row: dict) -> FollowupTurn:
    return FollowupTurn(
        question=str(row.get("question") or ""),
        expect_card=row.get("expect_card") or None,
        must_mention=[[str(a) for a in group] for group in (row.get("must_mention") or [])],
        must_not_say=_parse_must_not_say(row.get("must_not_say")),
        expect_fence=row.get("expect_fence"),
        expect_branches=row.get("expect_branches"),
        expect_attached=row.get("expect_attached"),
        note=str(row.get("note") or ""),
    )


def load_followup_pairs(path: Path, only: Optional[set[str]]) -> list[FollowupPair]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    pairs: list[FollowupPair] = []
    for row in raw.get("followup_pairs") or []:
        pid = str(row.get("id") or "")
        if only and pid not in only:
            continue
        turns_raw = list(row.get("turns") or [])
        if len(turns_raw) < 2:
            raise SystemExit(f"followup pair {pid!r} needs at least 2 turns, has {len(turns_raw)}")
        pairs.append(
            FollowupPair(
                id=pid,
                app_id=str(row.get("app_id") or ""),
                app_name=str(row.get("app_name") or ""),
                ask_mode=str(row.get("ask_mode") or "strategy"),
                turns=[_parse_followup_turn(t) for t in turns_raw],
                note=str(row.get("note") or ""),
            )
        )
    if only:
        missing = only - {p.id for p in pairs}
        if missing:
            raise SystemExit(f"unknown followup pair id(s): {', '.join(sorted(missing))}")
    return pairs


# --- tolerant fact/claim matching (plan 48, D86/D88) ------------------------------------------
#
# The old check passed a must_mention/must_not_say alternative only when it appeared as an exact
# phrase in the normalised reply, so "keep the crowd thin" failed against the fixture's own "thin
# the crowd" -- a right answer marked wrong. What follows strips filler words, reduces each
# remaining word to a rough stem (plurals, past tense, -ing), and passes when every content word
# of an alternative appears within a short span of the reply, in any order.

FILLER_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "and", "or", "but", "so", "also", "that", "this", "in", "on", "at", "as", "then",
}

# Negation words the contradiction check (added alongside this) looks for immediately before a
# matched claim word. "no longer" is the one two-word phrase; it is matched as an adjacent pair.
NEGATION_WORDS = {"no", "not", "never", "isn't", "without"}

WINDOW_TOKENS = 8       # how far apart an alternative's content words may sit in the reply
NEGATION_LOOKBACK = 3   # words checked before a matched content word for a preceding negation

_WORD_RE = re.compile(r"[a-z']+")


def _stem(word: str) -> str:
    """A rough stem: enough to fold plurals, past tense and -ing onto the same root as their base
    form (killing/kill, hurts/hurt, limited/limit) without pulling in a real stemmer dependency.
    The length guards keep short words (e.g. "noted", 5 letters) from being cut down far enough to
    collide with an unrelated word -- "noted" must not become "not"."""
    w = word.lower()
    if w.endswith("'s") and len(w) > 3:
        w = w[:-2]
    if w.endswith("ing") and len(w) > 5:
        w = w[:-3]
    elif w.endswith("ed") and len(w) > 5:
        w = w[:-2]
    elif w.endswith("es") and len(w) > 4:
        w = w[:-2]
    elif w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        w = w[:-1]
    return w


def _tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(_norm(text))


def _content_stems(phrase: str) -> list[str]:
    """Stemmed content words of one alternative, filler words dropped. Duplicates and order are
    kept; matching below de-dupes when it builds the set of words it needs to find."""
    return [_stem(tok) for tok in _tokenize(phrase) if tok not in FILLER_WORDS]


def _find_alt_match(reply_stems: list[str], required: list[str]) -> Optional[list[int]]:
    """None if some required stem never appears in reply_stems, or no combination of occurrences
    fits inside WINDOW_TOKENS; else the tightest-fitting combination of matched indices, one per
    required stem (same order as the de-duplicated ``required`` list)."""
    ordered_required = list(dict.fromkeys(required))  # de-dup, keep first-seen order
    if not ordered_required:
        return None
    positions = {r: [i for i, s in enumerate(reply_stems) if s == r] for r in ordered_required}
    if any(not idxs for idxs in positions.values()):
        return None
    best: Optional[list[int]] = None
    best_span: Optional[int] = None
    for combo in itertools.product(*(positions[r] for r in ordered_required)):
        span = max(combo) - min(combo)
        if span > WINDOW_TOKENS:
            continue
        if best_span is None or span < best_span:
            best, best_span = list(combo), span
    return best


def fact_group_hit(reply: str, alternatives: list[str]) -> bool:
    """True when any alternative's content words all appear, in any order, within a short window
    of the reply -- the tolerant replacement for "alternative is a substring of the reply"."""
    reply_stems = [_stem(t) for t in _tokenize(reply)]
    return any(_find_alt_match(reply_stems, _content_stems(alt)) is not None for alt in alternatives)


def _has_negation_before(reply_stems: list[str], idx: int) -> bool:
    """True when a negation word, or the two-word "no longer", sits in the NEGATION_LOOKBACK words
    immediately before position idx."""
    window = reply_stems[max(0, idx - NEGATION_LOOKBACK):idx]
    if any(w in NEGATION_WORDS for w in window):
        return True
    return any(window[i] == "no" and window[i + 1] == "longer" for i in range(len(window) - 1))


# A wrong claim is asserted inside one sentence, so claim matching is done per sentence (see
# claim_group_hit). Split on sentence-ending punctuation followed by whitespace; a newline alone
# also ends a sentence, because replies are written in short paragraphs and bullet lines.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")

# "too" turns a claim into its opposite the way a negation does: "get in close" is advice, but
# "if you get TOO close, it will draw your super shotgun" is a warning against exactly that.
# Measured 2026-09-07: this one word accounted for three of the seven contradiction hits on the
# 61-question set, all of them on a DOOM Eternal reply that was giving the right advice.
# Lookback is 1, not NEGATION_LOOKBACK -- "too" only inverts the word it directly qualifies.
_EXCESS_WORDS = frozenset({"too"})


def _has_excess_before(reply_stems: list[str], idx: int) -> bool:
    """True when "too" sits immediately before position idx, qualifying the matched word."""
    return idx > 0 and reply_stems[idx - 1] in _EXCESS_WORDS


def claim_group_hit(reply: str, alternatives: list[str]) -> bool:
    """True when the wrong claim (any alternative phrasing) is stated in the reply and none of its
    matched words has a negation sitting just before it -- so "there is no day limit" does not trip
    a claim written as "there is a day limit", but "there is still a day limit" does.

    Matched **one sentence at a time**, and never across a sentence break. Measured 2026-09-07 on
    the 61-question set: matching over the whole reply at once produced four false contradictions
    out of seven hits. One was a Black Mesa reply reading "Avoid shooting at the shell. Up close,
    its front legs can deal significant damage" -- the claim "shoot the legs" matched "shooting"
    in one sentence against "legs" in the next, and the reply was in fact saying the opposite of
    the claim in both. A wrong claim is a thing someone asserts in a sentence, so the sentence is
    the right unit, and a false contradiction is far more costly here than a missed one: it is the
    number this project quotes about whether its answers can be trusted.

    Still not caught, deliberately, and covered by a known-miss test: a claim stated across two
    sentences, and "not only is there a day limit". The judge column is the second opinion on both.
    """
    for sentence in _SENTENCE_SPLIT_RE.split(reply):
        stems = [_stem(t) for t in _tokenize(sentence)]
        for alt in alternatives:
            match = _find_alt_match(stems, _content_stems(alt))
            if match is None:
                continue
            if any(_has_negation_before(stems, i) or _has_excess_before(stems, i) for i in match):
                continue
            return True
    return False


# --- judge column: a second model's opinion, report-only (plan 48, D86 call 4) -----------------
#
# A second model reads the same note and reply the fixed checks above just scored, and answers the
# same two yes/no questions in its own words: does the reply contradict the note, and does it state
# each fact group. This is a column in the report and one summary line, nothing else -- it is never
# read by SampleResult.all_ok or by any Rate the fixed checks feed, and it only runs at all when
# --judge names a model. The point is to learn whether the judge agrees with the fixed checks often
# enough to be trusted with more than reporting, not to let it decide anything yet.

JUDGE_TIMEOUT_S = 90.0


def _judge_prompt(note_text: str, reply_text: str, fact_groups: list[list[str]]) -> str:
    facts_lines = "\n".join(
        f"{i + 1}. " + " / ".join(alts) for i, alts in enumerate(fact_groups)
    ) or "(no facts listed for this question)"
    return (
        "You are checking one written answer against the reference note it was supposed to be "
        "based on. Reply with JSON only, in exactly this shape and nothing else:\n"
        '{"contradicts_note": true or false, "facts_stated": [true or false, ...]}\n\n'
        f"REFERENCE NOTE (what the answer should agree with):\n{note_text}\n\n"
        f"WRITTEN ANSWER (what you are checking):\n{reply_text}\n\n"
        "contradicts_note: does the written answer say anything that reverses or contradicts a "
        "fact in the reference note? Answer true or false.\n"
        f"facts_stated: for each of the {len(fact_groups)} facts below (each line lists a few "
        "interchangeable ways of saying the same fact), does the written answer state that fact in "
        f"any words at all? Answer one true or false per line, in order, as a JSON array of exactly "
        f"{len(fact_groups)} values.\n"
        f"{facts_lines}\n"
    )


def call_judge(
    ollama_base: str,
    judge_model: str,
    note_text: str,
    reply_text: str,
    fact_groups: list[list[str]],
    *,
    timeout_s: float = JUDGE_TIMEOUT_S,
) -> dict[str, Any]:
    """One blocking, non-streaming ``/api/chat`` call. Raises on any HTTP, JSON or shape problem;
    the caller turns that into a per-sample ``judge_error`` string rather than failing the run --
    a judge hiccup must never cost a score, because the judge never feeds one."""
    prompt = _judge_prompt(note_text, reply_text, fact_groups)
    body = json.dumps(
        {
            "model": judge_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": "json",
            "think": False,  # a plain verdict, not a reasoning trace -- keeps the judge quick
            "options": {"temperature": 0},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{ollama_base.rstrip('/')}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    content = ((payload.get("message") or {}).get("content")) or ""
    parsed = json.loads(content)
    facts_raw = parsed.get("facts_stated")
    facts = [bool(v) for v in facts_raw] if isinstance(facts_raw, list) else []
    return {"contradicts_note": bool(parsed.get("contradicts_note")), "facts_stated": facts}


# --- one sample ------------------------------------------------------------------------------

@dataclass
class SampleResult:
    case_id: str
    sample: int
    success: bool
    elapsed_s: float
    model: str
    reply: str
    kb_attached: bool
    cards: list[str]
    card_ok: Optional[bool]
    attached_ok: Optional[bool]
    mention_hits: list[bool]
    mention_ok: Optional[bool]
    notsay_hits: list[str]
    notsay_ok: Optional[bool]
    fence_present: bool
    fence_ok: Optional[bool]
    branches_present: bool
    branches_ok: Optional[bool]
    payload_bytes: Optional[int]
    prompt_eval_tokens: Optional[int]
    system_prompt_chars: Optional[int]
    window_warning: bool = False
    prompt_tokens_est: Optional[int] = None
    error: str = ""
    system_prompt: str = field(default="", repr=False)
    # Judge column (report-only; --judge off by default). None everywhere below means "the judge
    # did not run for this sample" -- never "the judge said no".
    judge_contradicts: Optional[bool] = None
    judge_all_facts_stated: Optional[bool] = None
    judge_error: str = ""
    judge_elapsed_s: Optional[float] = None
    # Follow-up pairs only (plan 48, D98 measurement): whether kb_followup_memory actually added
    # the remembered subject to this turn's search words, and what that subject was. False/"" on
    # every ordinary single-question case -- these are never read by any check or by all_ok.
    followup_used: bool = False
    followup_subject: str = ""

    @property
    def all_ok(self) -> bool:
        # Deliberately excludes every judge_* field: the judge column is report-only and must
        # never move this score, however it turns out to agree with the fixed checks.
        checks = [self.card_ok, self.attached_ok, self.mention_ok, self.notsay_ok, self.fence_ok, self.branches_ok]
        return self.success and all(c is not False for c in checks)


def _norm(text: str) -> str:
    t = (text or "").lower()
    t = t.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    t = t.replace("—", "-").replace("–", "-")
    return " ".join(t.split())


def _card_short_names(headers: list[str]) -> list[str]:
    """``[Game / type: Name] (trust: tier)`` -> ``Name``."""
    out: list[str] = []
    for h in headers:
        m = re.match(r"^\[[^\]]*?:\s*(.+?)\]\s*\(trust:", h)
        out.append(m.group(1).strip() if m else h)
    return out


async def run_turn(
    plugin: Any,
    *,
    case_id: str,
    app_id: str,
    app_name: str,
    ask_mode: str,
    question: str,
    expect_card: Optional[str],
    must_mention: list[list[str]],
    must_not_say: list[list[str]],
    expect_fence: Optional[bool],
    expect_branches: Optional[bool],
    expect_attached: Optional[bool],
    sample_idx: int,
    ollama_base: str,
    retrieval_log: list[Any],
    capture: _ListHandler,
    kb_card_names: Callable[[str], list[str]],
    run_game_ai_request: Callable[..., Any],
    judge_model: str = "",
) -> SampleResult:
    """Run one Ask turn through the real pipeline and score it against its own expectations.

    This is the primitive both a single-question ``Case`` (via ``run_sample`` below) and one turn
    of a ``FollowupPair`` (via ``run_followup_pair``) go through -- the same pipeline call, the
    same six checks, the same judge hook. A pair's second turn runs in the same process right
    after its first with nothing reset in between (unless the caller resets it), so module-level
    state such as ``kb_followup_memory`` carries forward exactly as it does across two real Asks
    in one chat session.
    """
    del retrieval_log[:]
    log_start = len(capture.records)
    snapshots: list[dict] = []

    async def _capture_snapshot(payload: Any) -> None:
        if isinstance(payload, dict):
            snapshots.append(payload)

    plugin._persist_input_transparency = _capture_snapshot  # instance attribute shadows the method

    t0 = time.perf_counter()
    try:
        result = await run_game_ai_request(
            plugin,
            question,
            ollama_base,
            app_id,
            app_name,
            None,
            ask_mode,
        )
        error = ""
    except Exception as exc:  # the pipeline swallows its own errors; this is harness breakage
        result = {"success": False, "response": ""}
        error = f"{type(exc).__name__}: {exc}"
    elapsed = round(time.perf_counter() - t0, 2)

    reply = str(result.get("response") or "")
    success = bool(result.get("success"))

    kb_attached = False
    cards: list[str] = []
    note_text = ""
    if retrieval_log:
        kr = retrieval_log[-1]
        kb_attached = bool(getattr(kr, "attached", False))
        note_text = str(getattr(kr, "text_block", "") or "")
        cards = _card_short_names(kb_card_names(note_text))

    card_ok: Optional[bool] = None
    if expect_card:
        want = _norm(expect_card)
        card_ok = any(want == _norm(c) for c in cards)
    attached_ok: Optional[bool] = None
    if expect_attached is not None:
        attached_ok = kb_attached == bool(expect_attached)

    mention_hits = [fact_group_hit(reply, group) for group in must_mention]
    mention_ok = all(mention_hits) if must_mention else None
    notsay_hits = [" / ".join(group) for group in must_not_say if claim_group_hit(reply, group)]
    notsay_ok = (not notsay_hits) if must_not_say else None

    fence_present = bool(SPOILER_FENCE_RE.search(reply))
    fence_ok = None if expect_fence is None else (fence_present == bool(expect_fence))
    branches_present = isinstance(result.get("strategy_guide_branches"), dict)
    branches_ok = None if expect_branches is None else (branches_present == bool(expect_branches))

    if not success:
        mention_ok = notsay_ok = fence_ok = branches_ok = None

    payload_bytes: Optional[int] = None
    prompt_eval: Optional[int] = None
    for line in capture.records[log_start:]:
        m = PAYLOAD_RE.search(line)
        if m:
            payload_bytes = int(m.group(1))
        m = PROMPT_EVAL_RE.search(line)
        if m:
            prompt_eval = int(m.group(1))
    window_warning, warning_prompt_tokens = _extract_window_warning(capture.records[log_start:])

    system_prompt = ""
    for snap in snapshots:
        sp = snap.get("system_prompt")
        if isinstance(sp, str) and sp:
            system_prompt = sp
            break
    model = ""
    for snap in snapshots:
        for key in ("model", "model_succeeded", "ollama_model"):
            v = snap.get(key)
            if isinstance(v, str) and v:
                model = v
                break
        if model:
            break
    if not model:
        diag = None
        for snap in snapshots:
            diag = snap.get("ask_diagnostics")
            if isinstance(diag, dict):
                break
        if isinstance(diag, dict) and diag.get("model_succeeded"):
            model = str(diag.get("model_succeeded"))

    prompt_tokens_est = warning_prompt_tokens
    if prompt_tokens_est is None and system_prompt:
        # No warning fired: estimate from the same messages shape ollama_service scores, so the
        # column still means something on a run that comfortably fits the window.
        prompt_tokens_est = estimate_prompt_tokens(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": question}]
        )

    judge_contradicts: Optional[bool] = None
    judge_all_facts_stated: Optional[bool] = None
    judge_error = ""
    judge_elapsed_s: Optional[float] = None
    if judge_model and success and note_text:
        jt0 = time.perf_counter()
        try:
            judged = call_judge(ollama_base, judge_model, note_text, reply, must_mention)
            judge_contradicts = judged["contradicts_note"]
            facts = judged["facts_stated"]
            if must_mention and len(facts) == len(must_mention):
                judge_all_facts_stated = all(facts)
        except Exception as exc:  # a judge hiccup is reported, never scored
            judge_error = f"{type(exc).__name__}: {exc}"
        judge_elapsed_s = round(time.perf_counter() - jt0, 2)

    return SampleResult(
        case_id=case_id,
        sample=sample_idx,
        success=success,
        elapsed_s=elapsed,
        model=model,
        reply=reply,
        kb_attached=kb_attached,
        cards=cards,
        card_ok=card_ok,
        attached_ok=attached_ok,
        mention_hits=mention_hits,
        mention_ok=mention_ok,
        notsay_hits=notsay_hits,
        notsay_ok=notsay_ok,
        fence_present=fence_present,
        fence_ok=fence_ok,
        branches_present=branches_present,
        branches_ok=branches_ok,
        payload_bytes=payload_bytes,
        prompt_eval_tokens=prompt_eval,
        system_prompt_chars=len(system_prompt) if system_prompt else None,
        window_warning=window_warning,
        prompt_tokens_est=prompt_tokens_est,
        error=error,
        system_prompt=system_prompt,
        judge_contradicts=judge_contradicts,
        judge_all_facts_stated=judge_all_facts_stated,
        judge_error=judge_error,
        judge_elapsed_s=judge_elapsed_s,
    )


async def run_sample(
    plugin: Any,
    case: Case,
    *,
    sample_idx: int,
    ollama_base: str,
    retrieval_log: list[Any],
    capture: _ListHandler,
    kb_card_names: Callable[[str], list[str]],
    run_game_ai_request: Callable[..., Any],
    judge_model: str = "",
) -> SampleResult:
    """Unchanged signature and behaviour: a thin call-through to ``run_turn`` with this case's own
    fields. Existing single-question cases run this exact path, byte-identically to before
    ``run_turn`` was split out."""
    return await run_turn(
        plugin,
        case_id=case.id,
        app_id=case.app_id,
        app_name=case.app_name,
        ask_mode=case.ask_mode,
        question=case.question,
        expect_card=case.expect_card,
        must_mention=case.must_mention,
        must_not_say=case.must_not_say,
        expect_fence=case.expect_fence,
        expect_branches=case.expect_branches,
        expect_attached=case.expect_attached,
        sample_idx=sample_idx,
        ollama_base=ollama_base,
        retrieval_log=retrieval_log,
        capture=capture,
        kb_card_names=kb_card_names,
        run_game_ai_request=run_game_ai_request,
        judge_model=judge_model,
    )


# --- follow-up shape experiments: measurement-only, never shipped (plan 48, D98) ---------------
#
# D98 found that ranking the right note first is not enough while a better-matching *wrong* note
# is still in the pile -- the search half of follow-up memory (kb_followup_memory, shipped) fixed
# the ranking, but the model still sometimes writes about the sibling note that reads more like
# what was asked. Two candidate fixes, both measured here, neither shipped:
#
#   - "tell_subject" (option 1): the built prompt gets one added sentence naming which thing the
#     question is carrying on from. The notes attached are exactly what today's shipped code
#     attaches -- nothing about retrieval changes.
#   - "narrow_notes" (option 2): the attached notes are narrowed, after retrieval, to only the
#     cards whose title matches the remembered subject -- so a rival note is never in the prompt
#     to begin with. "Only that subject" is defined as an exact (case-insensitive) title match; a
#     subject with no matching card in this turn's pool gets nothing, not a fallback to the
#     unfiltered set, because attaching an unrelated card is the failure this shape exists to rule
#     out. That is also this shape's cost: a genuinely two-card subject or a near-miss title loses
#     everything instead of keeping the close note.
#
# Both are wired through the same monkeypatch machinery the ``--variant``/``--kb-placement`` hooks
# already use above -- neither touches a production file. Selected by ``--followup-shape``;
# "baseline" (the default) installs nothing extra and is exactly today's shipped code, which is
# the third column this flag exists to measure against.

_KB_BLOCK_SENTINEL_MARKER = "--- End local knowledge base ---"  # knowledge_base_service._BLOCK_SENTINEL


@dataclass
class _FollowupCapture:
    """What the shipped follow-up memory (kb_followup_memory) actually did on the turn just run,
    captured mid-call so the shape hooks -- which only ever see the finished prompt text or the
    retrieval result -- know whether to act. Reset before every turn; see ``_reset_followup_capture``.
    """

    remembered_subject: str = ""
    is_followup_turn: bool = False


_followup_capture = _FollowupCapture()


def _reset_followup_capture() -> None:
    _followup_capture.remembered_subject = ""
    _followup_capture.is_followup_turn = False


def _wrap_augment_search_words_for_capture(real_fn: Callable[..., str]) -> Callable[..., str]:
    """Records what the real ``kb_followup_memory.augment_search_words`` did, for the other shape
    hooks to read -- never changes what it returns. Installed for every ``--followup-shape``,
    including "baseline", purely as a diagnostic: it is how a report can say whether a given turn
    actually used the remembered subject at all, independent of which shape (if any) acts on it.
    """

    def _wrapped(question_for_retrieval: str, *, remembered_subject: str) -> str:
        out = real_fn(question_for_retrieval, remembered_subject=remembered_subject)
        if out != question_for_retrieval:
            _followup_capture.remembered_subject = str(remembered_subject or "").strip()
            _followup_capture.is_followup_turn = True
        return out

    return _wrapped


_FOLLOWUP_SUBJECT_NOTE_TEMPLATE = (
    "\nFOLLOW-UP CONTEXT (a system reminder, not something the user typed): this question "
    'carries on from the previous one, which was about "{subject}". Answer this one about '
    "{subject} specifically. This reminder alone is not the user naming {subject} themselves.\n"
)


def _variant_tell_followup_subject(prompt: str) -> str:
    """Shape A ("tell_subject"): add one sentence naming the carried-over subject, right after the
    knowledge-base block header, on a turn ``_wrap_augment_search_words_for_capture`` actually saw
    use the remembered subject. A no-op on any other turn, including every turn under every other
    ``--followup-shape`` value, since only "tell_subject" installs this as a variant."""
    if not _followup_capture.is_followup_turn or not _followup_capture.remembered_subject:
        return prompt
    if _KB_BLOCK_HEADER_MARKER not in prompt:
        return prompt
    note = _FOLLOWUP_SUBJECT_NOTE_TEMPLATE.format(subject=_followup_capture.remembered_subject)
    return prompt.replace(_KB_BLOCK_HEADER_MARKER, _KB_BLOCK_HEADER_MARKER + note, 1)


def _narrow_text_block_to_subject(text_block: str, subject: str) -> tuple[str, list[str]]:
    """Shape B ("narrow_notes"): keep only the card(s) in ``text_block`` whose title equals
    ``subject`` (case-insensitive), dropping every other card. Returns the rebuilt block and the
    list of card titles kept.

    Unchanged when ``subject`` is blank or the block has no card headers at all (a fallback/genre
    card, which is not "about" anything to narrow to). Collapses to ``("", [])`` -- attach nothing
    -- when the block has cards but none of them match: that is the shape's whole point (a rival
    note must never survive), and the cost is explicit in the module docstring above.
    """
    subj = (subject or "").strip().lower()
    if not subj:
        return text_block, []
    header_re = re.compile(r"\n(\[[^/\]]+/\s*[^:\]]+:\s*([^\]]+)\]\s*\(trust:[^)]*\))")
    matches = list(header_re.finditer(text_block))
    if not matches:
        return text_block, []
    sentinel_idx = text_block.find("\n" + _KB_BLOCK_SENTINEL_MARKER)
    end_of_cards = sentinel_idx if sentinel_idx != -1 else len(text_block)
    chunks: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        name = m.group(2).strip()
        start = m.start()
        stop = matches[i + 1].start() if i + 1 < len(matches) else end_of_cards
        chunks.append((name, text_block[start:stop]))
    kept = [(name, body) for name, body in chunks if name.strip().lower() == subj]
    if not kept:
        return "", []
    preamble = text_block[: matches[0].start()]  # "--- Local knowledge base ... ---\nDomain: ..."
    rebuilt = preamble + "".join(body for _, body in kept) + "\n" + _KB_BLOCK_SENTINEL_MARKER
    return rebuilt, [name for name, _ in kept]


async def run_followup_pair(
    plugin: Any,
    pair: FollowupPair,
    *,
    sample_idx: int,
    ollama_base: str,
    retrieval_log: list[Any],
    capture: _ListHandler,
    kb_card_names: Callable[[str], list[str]],
    run_game_ai_request: Callable[..., Any],
    judge_model: str = "",
) -> list[SampleResult]:
    """Run every turn of one follow-up pair in order, in this process, against ``run_turn`` --
    the same call a real two-turn Ask makes. Nothing here carries state between turns itself;
    ``kb_followup_memory``'s own module-level memory is what does that, exactly as it does for two
    real Asks in the same chat session. Memory is cleared before the first turn so one pair's
    result never depends on what a previous pair, or a previous sample of this same pair, left
    behind.

    Two extra fields are stapled onto each returned ``SampleResult`` (``followup_used`` and
    ``followup_subject``, both default off) so a report can tell "the memory fired on this turn"
    apart from "it did not" without re-deriving it from the reply.
    """
    from backend.services import kb_followup_memory

    kb_followup_memory.forget()
    results: list[SampleResult] = []
    for i, turn in enumerate(pair.turns, start=1):
        _reset_followup_capture()
        r = await run_turn(
            plugin,
            case_id=f"{pair.id}-T{i}",
            app_id=pair.app_id,
            app_name=pair.app_name,
            ask_mode=pair.ask_mode,
            question=turn.question,
            expect_card=turn.expect_card,
            must_mention=turn.must_mention,
            must_not_say=turn.must_not_say,
            expect_fence=turn.expect_fence,
            expect_branches=turn.expect_branches,
            expect_attached=turn.expect_attached,
            sample_idx=sample_idx,
            ollama_base=ollama_base,
            retrieval_log=retrieval_log,
            capture=capture,
            kb_card_names=kb_card_names,
            run_game_ai_request=run_game_ai_request,
            judge_model=judge_model,
        )
        r.followup_used = _followup_capture.is_followup_turn
        r.followup_subject = _followup_capture.remembered_subject
        results.append(r)
    return results


# --- aggregation -----------------------------------------------------------------------------

@dataclass
class Rate:
    hit: int = 0
    of: int = 0

    def add(self, ok: Optional[bool]) -> None:
        if ok is None:
            return
        self.of += 1
        if ok:
            self.hit += 1

    def pct(self) -> str:
        return "n/a" if not self.of else f"{100.0 * self.hit / self.of:.1f}%"

    def frac(self) -> str:
        return "n/a" if not self.of else f"{self.hit}/{self.of}"


@dataclass
class Summary:
    facts = Rate()
    contradictions_clean = Rate()
    fence_no_misfire = Rate()   # expect_fence False: fence absent
    fence_present_when_due = Rate()  # expect_fence True: fence present
    branches_when_due = Rate()  # expect_branches True
    branches_absent_when_not = Rate()  # expect_branches False
    card_attached = Rate()
    attached_control = Rate()
    success = Rate()
    cases_all_pass = Rate()
    # Judge column (report-only): agreement with the fixed checks, over samples where --judge ran
    # and produced a usable verdict. Stays "n/a" (Rate.of == 0) whenever --judge was not passed.
    judge_contradiction_agree = Rate()
    judge_facts_agree = Rate()

    def __init__(self) -> None:
        self.facts = Rate()
        self.contradictions_clean = Rate()
        self.fence_no_misfire = Rate()
        self.fence_present_when_due = Rate()
        self.branches_when_due = Rate()
        self.branches_absent_when_not = Rate()
        self.card_attached = Rate()
        self.attached_control = Rate()
        self.success = Rate()
        self.cases_all_pass = Rate()
        self.judge_contradiction_agree = Rate()
        self.judge_facts_agree = Rate()


def summarize(cases: list[Case], samples: list[SampleResult]) -> Summary:
    s = Summary()
    by_case: dict[str, list[SampleResult]] = {}
    for r in samples:
        by_case.setdefault(r.case_id, []).append(r)
    case_by_id = {c.id: c for c in cases}
    for r in samples:
        c = case_by_id[r.case_id]
        s.success.add(r.success)
        s.facts.add(r.mention_ok)
        s.contradictions_clean.add(r.notsay_ok)
        if c.expect_fence is False:
            s.fence_no_misfire.add(r.fence_ok)
        elif c.expect_fence is True:
            s.fence_present_when_due.add(r.fence_ok)
        if c.expect_branches is True:
            s.branches_when_due.add(r.branches_ok)
        elif c.expect_branches is False:
            s.branches_absent_when_not.add(r.branches_ok)
        s.card_attached.add(r.card_ok)
        s.attached_control.add(r.attached_ok)

        contradiction_agree: Optional[bool] = None
        if r.judge_contradicts is not None and r.notsay_ok is not None:
            contradiction_agree = r.judge_contradicts == (r.notsay_ok is False)
        s.judge_contradiction_agree.add(contradiction_agree)

        facts_agree: Optional[bool] = None
        if r.judge_all_facts_stated is not None and r.mention_ok is not None:
            facts_agree = r.judge_all_facts_stated == r.mention_ok
        s.judge_facts_agree.add(facts_agree)
    for cid, rs in by_case.items():
        s.cases_all_pass.add(all(r.all_ok for r in rs))
    return s


def _mean(values: list[float]) -> Optional[float]:
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def mean_prompt_chars(samples: list[SampleResult]) -> Optional[float]:
    """Mean length of the built system prompt, over samples that captured one.

    Only sample 1 of each case keeps the full prompt text (``run_sample`` reads it off the
    transparency snapshot), so this is a mean over one sample per case, not over every sample.
    It is the cheap stand-in for token count while a prompt change is still being sized: a
    slimming that drops instructions should show up here before it shows up in the answer
    quality checks.
    """
    return _mean([float(r.system_prompt_chars) for r in samples if r.system_prompt_chars])


def window_warning_count(samples: list[SampleResult]) -> tuple[int, int]:
    """(samples that logged D46's prompt-window warning, samples run) — every sample, not
    deduped to one per case, so this is the number a device-shaped run needs to read as zero."""
    return sum(1 for r in samples if r.window_warning), len(samples)


def mean_prompt_tokens(samples: list[SampleResult]) -> Optional[float]:
    """Mean estimated prompt size — the warning's own estimate where it fired, else the harness's
    own ``estimate_prompt_tokens`` reading of the captured system prompt."""
    return _mean([float(r.prompt_tokens_est) for r in samples if r.prompt_tokens_est is not None])


def mean_judge_elapsed_s(samples: list[SampleResult]) -> Optional[float]:
    """Mean seconds the judge call added per sample it actually ran on — None when --judge did not
    run at all, so a report without --judge shows nothing rather than a stray 0.0."""
    return _mean([r.judge_elapsed_s for r in samples if r.judge_elapsed_s is not None])


def _judge_cell(r: SampleResult) -> str:
    """One short per-sample cell for the report table: contradiction / facts, or 'n/a' /
    'err: ...' when the judge did not produce a usable verdict for this sample."""
    if r.judge_error:
        return f"err: {r.judge_error[:40]}"
    if r.judge_contradicts is None and r.judge_all_facts_stated is None:
        return "n/a"
    contra = "n/a" if r.judge_contradicts is None else ("contradicts" if r.judge_contradicts else "clean")
    facts = "n/a" if r.judge_all_facts_stated is None else ("stated" if r.judge_all_facts_stated else "missing")
    return f"{contra} / {facts}"


# --- report ----------------------------------------------------------------------------------

def _flag(ok: Optional[bool]) -> str:
    return "—" if ok is None else ("✅" if ok else "❌")


def _case_cell(rs: list[SampleResult], attr: str) -> str:
    vals = [getattr(r, attr) for r in rs]
    if all(v is None for v in vals):
        return "—"
    hit = sum(1 for v in vals if v)
    of = sum(1 for v in vals if v is not None)
    return f"{hit}/{of}"


def _case_mean(rs: list[SampleResult], attr: str) -> str:
    m = _mean([float(v) for v in (getattr(r, attr) for r in rs) if v is not None])
    return "—" if m is None else str(m)


def write_report(
    path: Path,
    *,
    cases: list[Case],
    samples: list[SampleResult],
    summary: Summary,
    meta: dict[str, Any],
) -> None:
    by_case: dict[str, list[SampleResult]] = {}
    for r in samples:
        by_case.setdefault(r.case_id, []).append(r)

    lines: list[str] = []
    lines.append(f"# Knowledge-base answer eval — {meta['date']}{(' — ' + meta['label']) if meta.get('label') else ''}")
    lines.append("")
    lines.append(
        "What the Deck's model writes **from** the cards, scored without a judge model. "
        "Run by `scripts/eval_kb_answers.py`; the fixture is `tests/fixtures/kb_answer_eval.json` "
        "(decision D45, plan 30 W1). Rates are over samples at the shipped temperature, so one run "
        "moving a point or two is noise; a check moving ten points is a finding."
    )
    lines.append("")
    lines.append("| Setting | Value |")
    lines.append("|---|---|")
    for k in (
        "model", "ollama", "corpus_version", "corpus_sections", "prompt_variant",
        "kb_placement", "voice_preset", "think_effort", "judge_model",
        "samples_per_case", "cases", "run_minutes",
    ):
        lines.append(f"| {k} | `{meta.get(k)}` |")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append("| Check | Rate | Meaning |")
    lines.append("|---|---|---|")
    lines.append(f"| Facts kept | **{summary.facts.pct()}** ({summary.facts.frac()}) | every must-mention group found in the reply |")
    lines.append(f"| No contradiction | **{summary.contradictions_clean.pct()}** ({summary.contradictions_clean.frac()}) | nothing from the must-not-say list appeared |")
    lines.append(f"| Fence not misfired | **{summary.fence_no_misfire.pct()}** ({summary.fence_no_misfire.frac()}) | no spoiler fence where none was due |")
    lines.append(f"| Fence present when due | **{summary.fence_present_when_due.pct()}** ({summary.fence_present_when_due.frac()}) | a fence appeared on a story-beat question |")
    lines.append(f"| Branch menu on Strategy first turn | **{summary.branches_when_due.pct()}** ({summary.branches_when_due.frac()}) | the parser accepted a bonsai-strategy-branches fence |")
    lines.append(f"| No menu on Speed/Expert | **{summary.branches_absent_when_not.pct()}** ({summary.branches_absent_when_not.frac()}) | no stray menu outside Strategy |")
    lines.append(f"| Expected card attached | **{summary.card_attached.pct()}** ({summary.card_attached.frac()}) | retrieval, not the model: the named card was in the block |")
    lines.append(f"| Control: nothing attached | **{summary.attached_control.pct()}** ({summary.attached_control.frac()}) | uncovered-game control |")
    lines.append(f"| Ask succeeded | **{summary.success.pct()}** ({summary.success.frac()}) | pipeline returned a reply |")
    lines.append(f"| Cases with every sample clean | **{summary.cases_all_pass.pct()}** ({summary.cases_all_pass.frac()}) | strictest view |")
    lines.append("")
    elapsed = _mean([r.elapsed_s for r in samples if r.success])
    payloads = _mean([float(r.payload_bytes) for r in samples if r.payload_bytes])
    pev = _mean([float(r.prompt_eval_tokens) for r in samples if r.prompt_eval_tokens])
    prompt_chars = mean_prompt_chars(samples)
    warned, warn_of = window_warning_count(samples)
    prompt_tokens_mean = mean_prompt_tokens(samples)
    lines.append(f"Mean seconds per answer: **{elapsed}**. Mean request payload: **{payloads}** bytes. Mean prompt tokens (Ollama prompt_eval): **{pev}**.")
    lines.append(f"Mean system prompt length: **{prompt_chars}** characters.")
    lines.append(
        f"D46 window warnings: **{warned}/{warn_of}** samples. Mean estimated prompt tokens: **{prompt_tokens_mean}**."
    )
    lines.append("")
    if meta.get("judge_model"):
        judge_elapsed = mean_judge_elapsed_s(samples)
        lines.append(
            "**Judge column, report-only** (model `" + str(meta["judge_model"]) + "`; never scored -- "
            "this is here so the maintainer can see whether the judge is worth trusting with more than "
            "reporting, not because it decides anything): agrees with the fixed contradiction check on "
            f"**{summary.judge_contradiction_agree.pct()}** ({summary.judge_contradiction_agree.frac()}) "
            "of samples where both ran; agrees with the fixed facts check on "
            f"**{summary.judge_facts_agree.pct()}** ({summary.judge_facts_agree.frac()}). "
            f"Mean seconds the judge call added per sample: **{judge_elapsed}**."
        )
        lines.append("")
    lines.append("## Per case")
    lines.append("")
    header = "| Case | Mode | Card attached | Facts | No contradiction | Fence ok | Menu ok | Window warn | Prompt tokens | s/answer |"
    sep = "|---|---|---|---|---|---|---|---|---|---|"
    if meta.get("judge_model"):
        header += " Judge (s1) |"
        sep += "---|"
    lines.append(header)
    lines.append(sep)
    for c in cases:
        rs = by_case.get(c.id) or []
        if not rs:
            continue
        card = _case_cell(rs, "card_ok") if c.expect_card else (_case_cell(rs, "attached_ok") if c.expect_attached is not None else "—")
        row = (
            f"| `{c.id}` | {c.ask_mode} | {card} | {_case_cell(rs, 'mention_ok')} | {_case_cell(rs, 'notsay_ok')} | "
            f"{_case_cell(rs, 'fence_ok')} | {_case_cell(rs, 'branches_ok')} | {_case_cell(rs, 'window_warning')} | "
            f"{_case_mean(rs, 'prompt_tokens_est')} | {_mean([r.elapsed_s for r in rs])} |"
        )
        if meta.get("judge_model"):
            row += f" {_judge_cell(rs[0])} |"
        lines.append(row)
    lines.append("")
    lines.append("## Failures worth reading")
    lines.append("")
    any_fail = False
    for c in cases:
        for r in by_case.get(c.id) or []:
            if r.all_ok:
                continue
            any_fail = True
            reasons: list[str] = []
            if not r.success:
                reasons.append(f"ask failed: {r.error or r.reply[:200]}")
            if r.card_ok is False:
                reasons.append(f"card `{c.expect_card}` not attached (got: {', '.join(r.cards) or 'nothing'})")
            if r.attached_ok is False:
                reasons.append(f"attached={r.kb_attached}, expected {c.expect_attached}")
            if r.mention_ok is False:
                missing = [c.must_mention[i][0] for i, hit in enumerate(r.mention_hits) if not hit]
                reasons.append("missing facts: " + ", ".join(f"`{m}`" for m in missing))
            if r.notsay_ok is False:
                reasons.append("said: " + ", ".join(f"`{s}`" for s in r.notsay_hits))
            if r.fence_ok is False:
                reasons.append("spoiler fence " + ("present, none due" if r.fence_present else "missing, one was due"))
            if r.branches_ok is False:
                reasons.append("branch menu " + ("present, none due" if r.branches_present else "missing"))
            lines.append(f"- **{c.id}** sample {r.sample}: " + "; ".join(reasons))
    if not any_fail:
        lines.append("None.")
    lines.append("")
    lines.append("## One reply per case (sample 1, trimmed to 1,800 characters)")
    lines.append("")
    lines.append("The full text of every sample, plus the system prompt each case received, is in the JSON next to this report.")
    lines.append("")
    for c in cases:
        rs = by_case.get(c.id) or []
        if not rs:
            continue
        r = rs[0]
        lines.append(f"### {c.id} — {c.app_name} — {c.ask_mode}")
        lines.append("")
        lines.append(f"**Q:** {c.question}  ")
        lines.append(f"**Cards:** {', '.join(r.cards) or 'none'}  ")
        lines.append(f"**Checks:** facts {_flag(r.mention_ok)} · contradiction {_flag(r.notsay_ok)} · fence {_flag(r.fence_ok)} · menu {_flag(r.branches_ok)}")
        lines.append("")
        body = r.reply.strip()
        if len(body) > 1800:
            body = body[:1800].rstrip() + " …"
        lines.append("> " + body.replace("\n", "\n> "))
        lines.append("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


# --- main ------------------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ollama", default=DEFAULT_OLLAMA, help="Ollama base URL on this PC")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="chat model tag; default is what the Deck loads")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS, help="directory holding corpus.db + corpus-manifest.json")
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    parser.add_argument("--work-dir", type=Path, default=DEFAULT_WORK_DIR, help="where the fake plugin keeps settings and logs")
    parser.add_argument("--samples", type=int, default=3, help="answers per case")
    parser.add_argument("--only", default="", help="comma-separated case ids")
    parser.add_argument("--variant", default="baseline", choices=sorted(VARIANTS), help="prompt variant hook")
    parser.add_argument(
        "--kb-placement",
        default="early",
        choices=("early", "late"),
        help="where the knowledge-base block splices into the system prompt (D46 follow-up)",
    )
    parser.add_argument(
        "--voice",
        default="",
        help="AI character preset id — turns on the character voice for a device-shaped run",
    )
    parser.add_argument(
        "--think",
        default="off",
        choices=("off", "low", "medium", "high"),
        help="ask_think_effort — off is the fresh-install default; the maintainer's Deck runs medium",
    )
    parser.add_argument(
        "--judge",
        default="",
        help="Ollama model tag for a second, report-only opinion (contradiction + facts stated). "
        "Off by default; never affects any score, only adds a column and a summary line.",
    )
    parser.add_argument("--label", default="", help="suffix for the report filename, e.g. after-w4")
    parser.add_argument("--write-report", action="store_true", default=True)
    parser.add_argument("--no-write-report", action="store_false", dest="write_report")
    parser.add_argument(
        "--pairs",
        action="store_true",
        help="run the fixture's followup_pairs instead of cases -- each pair's turns run in "
        "order against the same session, so a bare follow-up sees whatever the turn before it "
        "left remembered. See FollowupPair / run_followup_pair.",
    )
    parser.add_argument(
        "--followup-shape",
        default="baseline",
        choices=("baseline", "tell_subject", "narrow_notes"),
        help="D98 measurement only, never shipped: which follow-up fix (if any) is active on a "
        "turn that uses the remembered subject. 'baseline' installs nothing extra and is exactly "
        "today's shipped code.",
    )
    args = parser.parse_args()

    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows console
    except Exception:
        pass

    corpus_dir = args.corpus.resolve()
    db = corpus_dir / "corpus.db"
    manifest_path = corpus_dir / "corpus-manifest.json"
    if not db.is_file() or not manifest_path.is_file():
        print(f"no corpus at {corpus_dir}; build one with: python scripts/build_rag_db.py --seed --out {corpus_dir}", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    corpus_version = str(manifest.get("version") or "?")

    # Section count for the report header: same query the embed eval uses. Computed here (before
    # both the cases and the --pairs path need it) rather than after loading cases, since --pairs
    # skips that load entirely.
    import sqlite3  # noqa: E402

    with sqlite3.connect(str(db)) as conn:
        try:
            corpus_sections = conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
        except sqlite3.Error:
            corpus_sections = "?"

    work_dir = args.work_dir.resolve()
    _decky, capture = install_fake_decky(work_dir)
    write_harness_settings(
        work_dir / "settings",
        corpus_dir=corpus_dir,
        corpus_version=corpus_version,
        model=args.model,
        voice_preset_id=args.voice,
        think_effort=args.think,
    )

    # Imported only now: main.py reads `decky` at import time.
    import main as plugin_main  # noqa: E402
    from backend.services import game_ai_request as gar  # noqa: E402
    from backend.services.ollama_prompts import kb_card_names  # noqa: E402

    plugin = plugin_main.Plugin()

    retrieval_log: list[Any] = []
    real_retrieve = gar.retrieve_knowledge_context

    def _recording_retrieve(*a: Any, **kw: Any) -> Any:
        out = real_retrieve(*a, **kw)
        # D98 measurement only (shape "narrow_notes"): drop every card but the remembered
        # subject's own from a turn that actually used it. See _narrow_text_block_to_subject's
        # docstring for what "only that subject" means and what it costs.
        if (
            args.followup_shape == "narrow_notes"
            and _followup_capture.is_followup_turn
            and _followup_capture.remembered_subject
        ):
            narrowed_text, kept_names = _narrow_text_block_to_subject(
                out.text_block, _followup_capture.remembered_subject
            )
            if narrowed_text != out.text_block:
                out = replace(
                    out,
                    text_block=narrowed_text,
                    attached=bool(kept_names),
                    notes=(f"{out.notes} narrowed_to_subject" if out.notes else "narrowed_to_subject"),
                )
        retrieval_log.append(out)
        return out

    gar.retrieve_knowledge_context = _recording_retrieve

    # Diagnostic only, every --followup-shape including "baseline": records whether a turn's own
    # search words actually got the remembered subject appended, without ever changing them. See
    # _wrap_augment_search_words_for_capture.
    from backend.services import kb_followup_memory  # noqa: E402

    kb_followup_memory.augment_search_words = _wrap_augment_search_words_for_capture(
        kb_followup_memory.augment_search_words
    )

    variant_fn = VARIANTS[args.variant] if args.variant != "baseline" else None
    if args.followup_shape == "tell_subject":
        # D98 measurement only (shape "tell_subject"): composed after any --variant, the same
        # order --kb-placement's kwarg and --variant already run in (placement, then variant,
        # then this).
        _base_variant = variant_fn

        def variant_fn(prompt: str, _base=_base_variant) -> str:  # type: ignore[no-redef]
            return _variant_tell_followup_subject(_base(prompt) if _base is not None else prompt)

    if args.kb_placement != "early" or variant_fn is not None:
        plugin_main.build_system_prompt = _build_prompt_wrapper(
            plugin_main.build_system_prompt,
            kb_placement=args.kb_placement,
            variant_fn=variant_fn,
        )

    if args.pairs:
        only = {s.strip() for s in args.only.split(",") if s.strip()} or None
        pairs = load_followup_pairs(args.fixture, only)
        if not pairs:
            print("no followup pairs selected", file=sys.stderr)
            return 2
        print(
            f"corpus {corpus_version} ({corpus_sections} sections) · model {args.model} · "
            f"followup-shape {args.followup_shape} · {len(pairs)} pairs × {args.samples} runs"
        )
        t_run = time.perf_counter()
        pair_results: list[SampleResult] = []
        for pi, pair in enumerate(pairs, 1):
            for si in range(1, args.samples + 1):
                turn_results = asyncio.run(
                    run_followup_pair(
                        plugin,
                        pair,
                        sample_idx=si,
                        ollama_base=args.ollama,
                        retrieval_log=retrieval_log,
                        capture=capture,
                        kb_card_names=kb_card_names,
                        run_game_ai_request=gar.run_game_ai_request,
                        judge_model=args.judge,
                    )
                )
                pair_results.extend(turn_results)
                for ti, r in enumerate(turn_results, 1):
                    words = len(r.reply.split())
                    print(
                        f"[{pi:>2}/{len(pairs)}] {pair.id:<24} s{si} T{ti} {r.elapsed_s:>6.1f}s "
                        f"cards={','.join(r.cards) or 'none'} words={words} "
                        f"followup_used={r.followup_used} subject={r.followup_subject or '-'}"
                    )
        run_minutes = round((time.perf_counter() - t_run) / 60.0, 1)
        print(f"\n{len(pairs)} pairs × {args.samples} runs, {run_minutes} min")

        if args.write_report:
            JSON_DIR.mkdir(parents=True, exist_ok=True)
            stamp = date.today().isoformat()
            suffix = f"-{args.label}" if args.label else ""
            json_path = JSON_DIR / f"kb-followup-pairs-{stamp}{suffix}.json"
            payload = {
                "meta": {
                    "date": stamp,
                    "label": args.label,
                    "model": args.model,
                    "ollama": args.ollama,
                    "corpus_version": corpus_version,
                    "corpus_sections": corpus_sections,
                    "followup_shape": args.followup_shape,
                    "samples_per_pair": args.samples,
                    "pairs": len(pairs),
                    "run_minutes": run_minutes,
                },
                "turns": [
                    {k: v for k, v in r.__dict__.items() if k != "system_prompt"} for r in pair_results
                ],
            }
            json_path.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"Wrote {json_path}")
        return 0

    only = {s.strip() for s in args.only.split(",") if s.strip()} or None
    cases = load_fixture(args.fixture, only)
    if not cases:
        print("no cases selected", file=sys.stderr)
        return 2

    print(
        f"corpus {corpus_version} ({corpus_sections} sections) · model {args.model} · variant {args.variant} · "
        f"kb-placement {args.kb_placement} · voice {args.voice or 'off'} · think {args.think} · "
        f"judge {args.judge or 'off'} · {len(cases)} cases × {args.samples}"
    )
    t_run = time.perf_counter()
    samples: list[SampleResult] = []
    for ci, case in enumerate(cases, 1):
        for si in range(1, args.samples + 1):
            r = asyncio.run(
                run_sample(
                    plugin,
                    case,
                    sample_idx=si,
                    ollama_base=args.ollama,
                    retrieval_log=retrieval_log,
                    capture=capture,
                    kb_card_names=kb_card_names,
                    run_game_ai_request=gar.run_game_ai_request,
                    judge_model=args.judge,
                )
            )
            samples.append(r)
            status = "ok " if r.all_ok else "FAIL"
            print(
                f"[{ci:>2}/{len(cases)}] {case.id:<12} s{si} {status} {r.elapsed_s:>6.1f}s "
                f"cards={len(r.cards)} facts={_flag(r.mention_ok)} nosay={_flag(r.notsay_ok)} "
                f"fence={_flag(r.fence_ok)} menu={_flag(r.branches_ok)} card={_flag(r.card_ok)}"
                + (f" err={r.error}" if r.error else "")
                + (f" judge={_judge_cell(r)}" if args.judge else "")
            )
    run_minutes = round((time.perf_counter() - t_run) / 60.0, 1)

    summary = summarize(cases, samples)
    prompt_chars = mean_prompt_chars(samples)
    warned, warn_of = window_warning_count(samples)
    prompt_tokens_mean = mean_prompt_tokens(samples)
    print()
    print(f"facts {summary.facts.pct()} · no-contradiction {summary.contradictions_clean.pct()} · "
          f"fence-not-misfired {summary.fence_no_misfire.pct()} · fence-when-due {summary.fence_present_when_due.pct()} · "
          f"menu-when-due {summary.branches_when_due.pct()} · card-attached {summary.card_attached.pct()} · "
          f"cases-all-clean {summary.cases_all_pass.pct()} · prompt-chars {prompt_chars} · "
          f"window-warnings {warned}/{warn_of} · prompt-tokens {prompt_tokens_mean} · {run_minutes} min")
    if args.judge:
        judge_elapsed = mean_judge_elapsed_s(samples)
        print(
            f"judge ({args.judge}, report-only, not scored): agrees on contradiction "
            f"{summary.judge_contradiction_agree.pct()} ({summary.judge_contradiction_agree.frac()}) · "
            f"agrees on facts {summary.judge_facts_agree.pct()} ({summary.judge_facts_agree.frac()}) · "
            f"+{judge_elapsed}s/sample"
        )

    if args.write_report:
        stamp = date.today().isoformat()
        suffix = f"-{args.label}" if args.label else ""
        meta = {
            "date": stamp,
            "label": args.label,
            "model": args.model,
            "ollama": args.ollama,
            "corpus_version": corpus_version,
            "corpus_sections": corpus_sections,
            "prompt_variant": args.variant,
            "kb_placement": args.kb_placement,
            "voice_preset": args.voice,
            "think_effort": args.think,
            "judge_model": args.judge,
            "samples_per_case": args.samples,
            "cases": len(cases),
            "run_minutes": run_minutes,
            "prompt_chars_mean": prompt_chars,
            "window_warnings": f"{warned}/{warn_of}",
            "prompt_tokens_mean": prompt_tokens_mean,
        }
        report_path = REPORT_DIR / f"kb-answer-eval-{stamp}{suffix}.md"
        write_report(report_path, cases=cases, samples=samples, summary=summary, meta=meta)
        JSON_DIR.mkdir(parents=True, exist_ok=True)
        json_path = JSON_DIR / f"kb-answer-eval-{stamp}{suffix}.json"
        payload = {
            "meta": meta,
            "summary": {
                "facts": summary.facts.__dict__,
                "contradictions_clean": summary.contradictions_clean.__dict__,
                "fence_no_misfire": summary.fence_no_misfire.__dict__,
                "fence_present_when_due": summary.fence_present_when_due.__dict__,
                "branches_when_due": summary.branches_when_due.__dict__,
                "branches_absent_when_not": summary.branches_absent_when_not.__dict__,
                "card_attached": summary.card_attached.__dict__,
                "attached_control": summary.attached_control.__dict__,
                "success": summary.success.__dict__,
                "cases_all_pass": summary.cases_all_pass.__dict__,
                "judge_contradiction_agree": summary.judge_contradiction_agree.__dict__,
                "judge_facts_agree": summary.judge_facts_agree.__dict__,
            },
            "samples": [
                {k: v for k, v in r.__dict__.items() if k != "system_prompt"}
                | ({"system_prompt": r.system_prompt} if r.sample == 1 else {})
                for r in samples
            ],
        }
        json_path.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {report_path}")
        print(f"Wrote {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
