"""Title: Finding the right game notes for a question

Purpose: The knowledge base is a set of game notes kept on the Deck so the
AI can answer from them instead of guessing -- a short write-up on a boss, a
system, or a common problem, stored offline so it works without the
internet. This file searches those notes for the ones that actually answer
the question in front of it, works out which game they should even be
searched within, and decides when nothing found is a good enough match to
hand to the AI at all.

Used for: Every Ask, when the knowledge base is turned on -- game_ai_request
calls `retrieve_knowledge_context()` to get the block of notes to add before
the question goes to the AI. `suggest_chip_candidates()` also reads this
same corpus to build the suggested-question chips shown for the running
game.

Solves: A plain word search over a pile of notes finds a wrong-game boss
with the same name, misses a paraphrase that shares no words with the note
that actually answers it, and cannot tell "found something" from "found
something that actually fits." This file layers a second, meaning-based
search on top of plain keyword search, blends the two rankings together,
and -- the part measured hardest and most recently -- refuses to attach a
note at all when nothing in the pool is a real match, rather than stapling
the closest wrong answer onto the reply.

Does not: Draw the knowledge base screens, or manage downloading and
installing the notes onto the Deck -- see KnowledgeBaseSection and
rag_corpus_download_service. This file only searches a copy already
installed.

How it works:

    your question, plus whichever game is running (or one you named)
                                 |
                                 v
             should this search the notes at all, and about what kind of
             thing -- strategy notes, or troubleshooting tips?
             (`should_retrieve_knowledge()`)
                                 |
                +----------------+----------------+
                |                                 |
          strategy notes                   troubleshooting tips
     (`_search_sections()`, scoped        (`_search_compat_patterns()`,
      to the resolved game --              plus extra tips for whatever
      `_resolve_game_id()`)                 topic the question is about)
                |                                 |
                +----------------+----------------+
                                 |
                    keyword search result: which notes
                    share actual words with the question?
                                 |
                    meaning search, when it can run: which
                    notes MEAN the same thing, even sharing
                    no words at all? (`_vector_recall_sections()`)
                                 |
                                 v
             the two rankings are blended into one
             (`_fuse_cards_by_rrf()`)
                                 |
                                 v
             does the strongest match actually clear the
             "does this genuinely fit" floor?
                    |                          |
                   no                         yes
                    |                          |
            attach nothing,             trim to fit the size
            say so plainly              budget (`_format_block()`),
                                         hand to the AI

Which game a note is searched within matters as much as the search itself:
`_resolve_game_id()` tries, in order, the game Steam is actually running,
then a name or nickname the corpus already knows for it, then, only as a
last resort, a title the question itself names -- so an unrelated game
running in the background can never win over one you actually named.

Gotchas:
 - The single most important thing this file does is know when to say
   nothing. Early measurement found that a keyword search over a pile of
   notes nearly always finds *something* -- ten strategy questions asked
   about real games, including gibberish, attached a note to every single
   one, among them three weapon notes offered up for a boss that does not
   exist in that game. The floor comments on STRATEGY_MEANING_FLOOR and
   COMPAT_MEANING_FLOOR record exactly how that number was chosen and what
   it still lets through -- read them before changing either constant.
 - Almost every constant near the top of this file (RRF_K, the relevance and
   meaning floors, the vector recall settings) carries a long comment
   explaining a real measurement behind its value, not a guess. Change one
   only against a fresh measurement of its own, not a hunch -- the comments
   say, in more than one place, why retuning one on instinct broke something
   else last time.
 - A note found only through meaning search, not keyword search, is not
   automatically trusted more or less than one found by keyword -- the two
   rankings are fused together (`_fuse_cards_by_rrf()`) rather than one
   overriding the other.
"""

from __future__ import annotations

import os
import re
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

from backend.services.knowledge_base_schema import (
    CORPUS_MANIFEST_FILENAME,
    DEFAULT_EMBEDDING_MODEL,
    TRUST_TIER_FALLBACK,
    TRUST_TIER_WIKI_NO_PATCH,
    TRUST_TIER_WIKI_VERIFIED,
    corpus_embedding_compatible,
    corpus_has_usable_compat_vectors,
    corpus_has_usable_section_vectors,
    load_manifest_from_path,
    normalize_alias,
    resolve_corpus_db_path,
    unpack_embedding_vector,
)
from backend.services.ollama_embed_service import (
    OllamaEmbedError,
    embed_texts,
    format_embed_query,
    nomic_embed_available,
)
from backend.services.compat_topic_router import (
    match_compat_corpus_topics,
    question_targets_compat_corpus,
)
from backend.services.ollama_prompts import question_matches_troubleshooting_log_context

HYBRID_FTS_SHORTLIST_K = 30
# "keyword_hybrid_disabled" is distinct from "keyword_embed_unavailable" on purpose
# (Decision 5): one means the maintainer turned hybrid off, the other means the embed model
# or the corpus could not support it. Collapsing them would send someone hunting for a broken
# Ollama install when they had flipped a Developer toggle. The literal and its labels land
# here in PR1; the setting that produces it is PR2 Stage 6.
RetrievalMethod = Literal[
    "keyword",
    "hybrid",
    "keyword_embed_unavailable",
    "keyword_hybrid_disabled",
]
_CONN_LOCK = threading.Lock()
_CONN_BY_PATH: dict[str, sqlite3.Connection] = {}

# --- Fusion and floor constants ------------------------------------------------------------
#
# Locked 2026-08-09 by PR2 bake-off on the deepened 119-section / 124-tip seed against
# kb_eval_v2 (140 labeled rows; tune 104 / holdout 36). Holdout top-3 could not separate RRF
# from keyword (overlapping CIs). Equal weights stay; do not "tune" from a later peek at
# holdout. Report: docs/archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md
RRF_K = 60
RRF_W_FTS = 1.0
RRF_W_VEC = 1.0

# Relevance is -bm25(...), so bigger is a better match (FTS5's bm25 is negative, and more
# negative means better; flipping the sign once here keeps every comparison downstream the
# obvious direction).
#
# Kept LOOSE after PR2: the holdout gate did not justify tightening. Off-topic Asks still
# score ≤0.75 on the seed; genuine hits remain well above 1.0. Stopword-only queries are
# _fts_match_query's job, not the floor's.
BM25_RELEVANCE_FLOOR = 1.0

# PROVISIONAL (PR2 6d owns the final value). A higher bar for the D17 implicit route -- an Ask
# made while a game happens to be running, which never declared itself to be about that game.
#
# The evidence is genuinely weaker there, so it should have to clear more. Measured on the seed
# corpus 2026-08-06, per-game scoped: "what time do the shops close on a sunday" scores 2.72
# against Left 4 Dead 2 (FTS5 runs the porter stemmer, so "time" matches "timing" in an
# unrelated card), while "how do I beat the tank" scores 5.28 and a named boss scores 10+.
#
# Two data points on a two-card-per-game corpus is not a tuning basis and this number will
# move once the seed is deepened. It is here because shipping D17 with a known noise source
# is worse than shipping a constant that says out loud it is a guess.
IMPLICIT_ROUTE_RELEVANCE_FLOOR = 4.0

# The Ask modes in which the user declared the Ask to be about the game. Anything else is the
# D17 implicit route -- an Ask that merely happened while a game was running.
#
# Expert belongs here and was missing until 2026-08-18, because the test was written as
# `!= "strategy"`: it asked for Strategy by name rather than for the thing Strategy stands for.
# That left the two mode-keyed knobs disagreeing about what Expert means -- _budget_for_mode
# gives Expert the LARGEST card budget (5) while the flag put it on the STRICTEST relevance bar
# (4.0 against 1.0). Measured on device 2026-08-17, DRG Survivor (2321470), "what class should
# i pick": Strategy attached 2 cards, Expert attached 1, because "Upgrades and overclocks"
# scores bm25 2.13 and died at the 4.0 floor. The mode a stuck player picks for maximum depth
# was the one hiding the most corpus.
#
# Keep this the one definition of "explicit route". VECTOR_RECALL_FLOOR's gate reads the same
# flag, so a mode listed here gets the loose floor and the vector recall pass together, and
# they cannot drift apart again.
_DECLARED_GAME_ASK_MODES = frozenset({"strategy", "expert"})

# --- Vector recall pass --------------------------------------------------------------------
#
# The vector half searches for itself instead of re-ranking whatever BM25 handed it. Before
# this, every candidate came from one FTS query and vectors were loaded for that shortlist
# only, so a semantically perfect card sharing no keyword with the question was unreachable --
# when BM25 returned nothing, no embedding was computed at all. Measured on device 2026-08-17
# against corpus 2026.08.16: "how do i kill the big armoured bug boss" returned 0 candidates
# with DRG Survivor's Glyphid Dreadnought card sitting in the corpus. Phase 7's locked ranking
# blend asks for exactly this -- "when FTS is empty/weak, meaning fallback ... vector/ANN list
# into RRF" (docs/knowledge-base.md).
#
# Brute force over one game's sections (5-13 cards across the 13-title corpus), so it needs no
# ANN index. Phase 7's sqlite-vss item is the version of this that matters at catalog scale.
#
# Cap of 3 bounds what a *wrong* recall costs: an Ask that is not about the game at all can add
# at most three cards to the pool, and Strategy's budget only spends three. It is not a
# recall limit in practice -- in the floor measurement the correct card sat at vector rank 1
# for 10 of 15 paraphrased questions and within rank 3 for 14 of them (the exception already
# had three keyword candidates of its own).
VECTOR_RECALL_K = 3

# Cosine floor for admitting a card the keyword half never found. MEASURED, not guessed -- and
# the measurement says the two distributions overlap, so no floor separates them cleanly. Full
# table: docs/audit/rag-vector-recall-floor-2026-08-18.md (15 paraphrased questions with a
# known answer, 12 off-topic Asks, 4 titles, corpus 2026.08.16, nomic-embed-text):
#
#   correct card, paraphrased question   0.519 .. 0.738
#   best card for an off-topic Ask       0.435 .. 0.593
#
# Precision on this path is carried by the route gate rather than by the floor: the pass runs
# only when the user declared the Ask to be about the game (see IMPLICIT_ROUTE_RELEVANCE_FLOOR
# and the vector_recall_ready branch). A card at cosine 0.52 is weaker evidence than a keyword
# hit and stronger than nothing, which is why this stays its own number instead of borrowing
# BM25_RELEVANCE_FLOOR (D28, decision 2026-08-22): raising the keyword floor to fix this would
# have pushed against D25, so only this half moves.
#
# RAISED 0.50 -> 0.515, 2026-08-23 (D28 implementation), against a fresh local repro run on
# corpus 2026.08.22's actual seed cards with the real nomic-embed-text model (script not
# committed -- same embed calls and prefixes as embed_texts/format_embed_query/
# format_embed_document, so the numbers match production). Two ordinary phrases asked in
# Strategy mode against Deep Rock Galactic: Survivor supplied a card through this pass alone,
# with the keyword half finding nothing:
#
#   "one sentence"           Praetorian            0.5034
#   "please repeat that"     Glyphid Dreadnought    0.5308
#                             Nitra                 0.5116
#                             Dreadnought Twins      0.5104
#
# Re-measuring the seven V2-PARA-* strategy rows from kb_eval_v2.json against their real
# target cards on the same corpus found genuine hits as low as 0.4302 (Megaera -- misspelled
# "Megara" in the corpus at the time this was measured, fixed 2026-09-15 -- already unrescued
# under 0.50) and as high as 0.6971, with one -- Mind Flayer, V2-PARA-S04 -- at 0.5169, just
# above "one sentence"'s noise score. **No single floor separates all six noise phrases from
# all seven genuine hits; the two ranges overlap, same finding as the original 2026-08-18
# measurement.** 0.515 was chosen to sit between "one sentence" (0.5034, now excluded) and
# Mind Flayer (0.5169, the lowest genuine score this change must not break) -- it fully fixes
# "one sentence", but only partially fixes "please repeat that": Dreadnought Twins (0.5104)
# drops out, Glyphid Dreadnought (0.5308) and Nitra (0.5116) still clear it and still attach.
# D28 says explicitly not to expect this to clean every case -- re-measure rather than assume.
VECTOR_RECALL_FLOOR = 0.515

# --- Second signal: pool margin (roadmap "Card relevance needs a second signal") -----------
#
# The floor above cannot decide relevance alone: junk questions and genuine questions score in
# the same absolute range (twice measured, 2026-08-18 and 2026-08-23), so any floor value sits
# inside the overlap. The second signal is *relative*: how far the best card stands out from
# the rest of that game's cards. A junk question ("please repeat that") is roughly equidistant
# from everything the game knows, so its best card barely beats the pool average; a genuine
# question -- even a paraphrase sharing no word with its card -- singles one card out.
#
# Margin = top-1 cosine minus the mean cosine over ALL of the game's sections with vectors
# (keyword-found cards included: they are part of the pool the question is measured against).
# The recall pass runs only when the best card either stands out from its pool by this much,
# OR clears the floor by this much in absolute terms. One constant, two branches, because the
# measurement (2026-08-28, seed corpus at build/knowledge-base-test, nomic-embed-text with
# production prefixes; D28's six ordinary phrases vs every labeled strategy row in kb_eval_v2
# plus the D25 short questions) found each branch covering the other's blind spot:
#
#   junk phrases that clear the 0.515 floor    margin 0.0312 .. 0.0378, top-1 0.5034 .. 0.5326
#     ("please repeat that" 0.0312/0.5308, "one sentence" 0.0353/0.5034,
#      "what time is it" 0.0378/0.5326)
#   genuine questions, lowest margins first    margin 0.0280 .. 0.1591
#     ("how to play state of emergency" 0.0280 -- but top-1 0.5751, rescued by the absolute
#      branch; "gunner or scout" 0.0412; "first boss underworld roguelike" 0.0490;
#      "the boss" 0.0665; "illithid encounter tactics act one" 0.0771; "gels" 0.1224)
#
# The margin distributions overlap too ("how to play state of emergency" sits *below* every
# junk margin, because a broad question naming its own game is uniformly close to all of that
# game's cards, where junk is uniformly far) -- which is exactly why this is a two-branch
# signal and not another single number. 0.0395 is the midpoint of the margin gap that matters
# (junk max 0.0378 vs "gunner or scout" 0.0412), and the absolute branch it implies,
# 0.515 + 0.0395 = 0.5545, lands almost exactly midway between the highest junk top-1
# (0.5326, +0.0219) and the lowest genuine top-1 that needs it (0.5751, -0.0206).
#
# The other two roadmap candidates were measured and rejected on the same data: content-word
# presence fails outright (all six junk phrases contain content words -- "sentence", "time",
# "repeat", "team", "hours"), and keyword/vector agreement is an anti-signal ("what time is
# it" has keyword hits AND vector hits and is still junk, while genuine paraphrases are
# keyword-blind by construction). Full tables: docs/audit/kb-second-signal-2026-08-28.md.
#
# The gate is ANDed with the floor, not a replacement: "our team" has margin 0.0523 (its best
# card merely stands out from a very unrelated pool) but tops out at cosine 0.4997, so the
# floor still blocks it. Junk now has to clear an absolute bar and a relative one, which are
# different properties, where before it only needed one.
VECTOR_RECALL_POOL_MARGIN = 0.0395

# Below this many vectored sections, "relative to the pool" is not a meaningful statistic --
# with 1 card the margin is identically 0 and the gate would block every recall, and with 2-3
# the mean is dominated by the top card itself. Small pools skip the gate and keep the
# pre-change behaviour (floor only). Every seed game has 7+ vectored sections, so on the
# shipped corpus the gate always runs; this guard exists for minimal or partly-embedded
# corpora.
VECTOR_RECALL_MARGIN_MIN_POOL = 4

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

# --- Meaning floor: "none of these fit" (D87, tips half, 2026-09-07) ---------------------------
#
# A keyword search over 156 tips nearly always finds *something*, and the router's topic recall
# (above) has no floor at all -- so a problem sentence that fits no tip in the sheet still got one
# stapled onto the reply (five of Wave Two's 24 blind problem sentences, measured on device). D87
# widens the fix to a floor rather than leaving it a routing preference.
#
# **Not on the fused rank score** -- the rule 10 cheap check (runs/plan48-laneC-cheap-check.json)
# found that number takes essentially two values on this corpus, about 0.0328 when the router
# missed the topic and about 0.0377 when it hit, with right and wrong tips at both. A floor there
# would separate "the router matched" from "it did not" and nothing else.
#
# **On the meaning score instead**, which is continuous (runs/plan48-laneC-cheap-check-signals.json):
# across the 35 tuning rows of kb_eval_v2.json the weakest right tip scored 0.5649, and the two
# junk phrases that reached the search at all ("one sentence", "what time is it") scored 0.4821
# and 0.5044. A floor just above that junk ceiling keeps every one of the 34 tuning rows that had
# a right tip in its candidate pool (one row's pool never contained the right tip at all, floor
# or no floor).
#
# CAUTION, carried forward and widened before shipping: the brief flagged that only two of six
# original junk phrases reached the search, a thin sample. Eight phrases written fresh for this
# lane (not held-back rows) mostly scored well under the floor, but one -- "my dog needs a walk"
# -- scored 0.5819 against the seed corpus, above both the floor and four tuning rows' own right
# tip. So this floor is a narrow, measured-safe net: it has not cost a real tip on any row
# measured so far, but it is not a general fix for meaning-search false positives -- a phrase
# that happens to share enough vocabulary with a tip still gets one.
COMPAT_MEANING_FLOOR = 0.5044

# --- Meaning floor: "none of these fit" (D87, notes half, 2026-09-07) --------------------------
#
# The "not in my notes" line shipped in wave two could never fire, for the same reason the tip
# sheet needed a floor: a keyword-plus-vector-recall search inside one game's notes nearly always
# finds *something*. Measured on device: ten Strategy questions against covered games -- gibberish
# included ("qqqq zzzz wwww" in Hades) -- every single one attached a note, including three Hades
# weapon notes offered up in answer to "how do i beat the bone hydra in hades", a boss that does
# not exist.
#
# Calibrated on the 186 tuning-split Strategy rows of kb_eval_v2.json (never the 175 held-back
# rows), reproducing the real pipeline end to end (keyword search, type recall, vector recall,
# RRF fusion, the Strategy top-3 budget) rather than reading cosine in isolation: 120 of 186 rows
# attach their right note today, 64 attach a wrong one, 2 attach nothing. This gate is far
# **stricter** than the tips gate -- a roughly-right note is often still useful, so the rule is
# zero tolerance: **no row that attaches its right note today may lose it**. Sweeping every floor
# from 0.40 to 0.80, the highest value with zero such losses is 0.523: the weakest right-attached
# row's best meaning score is 0.5277, the strongest wrong-attached row still under that is 0.5183.
# At 0.523, wrong-attached falls from 64 to 58 (six of Wave Two's real DRG/BG3/GTA:SA rows go
# from "attaches a wrong note" to "attaches nothing"); one point higher already costs two right
# rows.
#
# **This floor does not, on its own, fix the four device sentences named in this lane's brief.**
# Their best meaning scores -- "how do i tame a horse" against Black Mesa 0.6349 (the corpus's
# Houndeye enemy card, an alien creature note the embedding model reads as horse-adjacent),
# "where do i buy a house" against Portal 2 0.5266, "qqqq zzzz wwww" in Hades 0.5326, "how do i
# beat the bone hydra in hades" 0.6369 -- all sit inside the same range as genuinely right notes
# elsewhere in this corpus (as low as 0.5277). A floor high enough to reject all four would have
# to clear roughly 0.64, which on the tuning rows costs 20-30+ right-attached notes for a corpus
# this size -- a clear net loss under the zero-tolerance rule above, so it was not taken. This
# mirrors a limitation already measured and documented on this exact corpus for
# VECTOR_RECALL_FLOOR / VECTOR_RECALL_POOL_MARGIN: raw cosine similarity between a short question
# and a small per-game card set does not cleanly separate "genuinely relevant" from "shares enough
# incidental vocabulary to score high anyway".
STRATEGY_MEANING_FLOOR = 0.523

# Column weights, highest first. sections_fts is (name, card); compat_patterns_fts is
# (topic, platforms, card). A card whose *title* matches the Ask is a better hit than one
# that mentions the words somewhere in its body.
_SECTIONS_BM25 = "bm25(sections_fts, 10.0, 1.0)"
_COMPAT_BM25 = "bm25(compat_patterns_fts, 5.0, 2.0, 1.0)"


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


@dataclass
class KnowledgeRetrievalResult:
    attached: bool
    text_block: str = ""
    trust_tier: str = TRUST_TIER_FALLBACK
    sources: list[dict[str, str]] = field(default_factory=list)
    notes: str = ""
    timing_ms: dict[str, float] = field(default_factory=dict)
    unavailable_reason: str = ""
    retrieval_method: RetrievalMethod = "keyword"
    # How well the winning candidate actually matched, carried out of retrieval so a reader
    # downstream can tell a confident attachment from a thin one. `attached` alone cannot:
    # STRATEGY_MEANING_FLOOR is set at the highest value that loses no row which attaches its
    # right note today, which by construction leaves every thin-but-not-rejected match on the
    # attached side of the line.
    #
    # `best_meaning` is the strongest cosine in the whole candidate pool -- the same number the
    # meaning floor judges, so "did it attach" and "how good was it" cannot drift apart.
    # `top_card_keyword_score` is the winning card's own BM25 score, which is 0.0 when the
    # keyword half never ranked that card and only the meaning half found it.
    #
    # **Both are absent, not low, whenever there was nothing to measure**: Speed mode, no embed
    # model reachable, a corpus baked without vectors, and an empty candidate pool all end here
    # with `best_meaning` None. A reader that treats None as "weak" would print a warning on
    # every turn of a Deck with no embed model, which is the opposite of what these are for.
    best_meaning: Optional[float] = None
    top_card_keyword_score: float = 0.0


def _budget_for_mode(ask_mode: str) -> tuple[int, int]:
    """Return (top_k, max_bytes) adaptive by Ask mode.

    Mode decides a second thing one layer up -- the relevance floor, via
    ``_DECLARED_GAME_ASK_MODES``. Two knobs, same input, and they disagreed once: a mode that
    earns a bigger budget here has to be on the explicit route there, or it gets more room to
    fill and a stricter bar for filling it at the same time.
    """
    mode = (ask_mode or "speed").strip().lower()
    if mode == "expert":
        return 5, 10_240
    if mode == "strategy":
        return 3, 6_144
    return 1, 2_048


def should_retrieve_knowledge(
    *,
    use_local_knowledge_base: bool,
    ask_mode: str,
    question: str,
    app_id: str,
    app_name: str,
    text_resolved_title: str = "",
) -> tuple[bool, str]:
    """Return (should_run, domain) where domain is strategy|compat|empty.

    ``text_resolved_title`` is D19's last resort: a title the *question* names when no game is
    running. The caller resolves it (``resolve_title_from_question``) and must pass "" whenever
    a game is running, so it can never override the game in front of the user.
    """
    if not use_local_knowledge_base:
        return False, ""
    aid = str(app_id or "").strip()
    aname = str(app_name or "").strip()
    mode = (ask_mode or "speed").strip().lower()
    # An explicit Strategy Ask about a running game is unambiguous and wins outright.
    if mode == "strategy" and (aid or aname):
        return True, "strategy"
    # Two gates, deliberately. The prompt-side phrase gate needs the literal word "deck" or
    # "proton", which left 24 of the corpus's 27 topics unreachable by anything a user would
    # type -- measured at 3 of 40 drafted compat questions. The topic router closes that
    # (decision D16). It is kept separate rather than folded into the phrase gate because
    # that gate also drives Proton log attachment, prompt framing and stream tags; widening
    # it would change four behaviours to fix one.
    # A game in context -- one running, or one the question names -- is what makes "crash" and
    # "linux" ambiguous ("the boss crashes into me" beats a boss on a Linux machine). With
    # neither, the router treats them as ordinary troubleshooting words instead of requiring a
    # second, stronger topic alongside them.
    game_in_context = bool(aid or aname or str(text_resolved_title or "").strip())
    if question_matches_troubleshooting_log_context(question) or question_targets_compat_corpus(
        question, game_in_context=game_in_context
    ):
        return True, "compat"
    # D17: game knowledge is not a property of the Ask mode. Strategy cards used to require
    # Strategy mode, so the same question about the same running game got cards in one mode
    # and nothing in Speed or Expert -- Expert being where somebody stuck on a hard fight is
    # most likely to be. Ask mode still decides how *many* cards attach (_budget_for_mode);
    # it no longer decides whether the corpus is consulted at all.
    #
    # Safe to be permissive here for the same reason D16 was: retrieval is scoped to the
    # resolved game and still has to clear BM25_RELEVANCE_FLOOR, so an Ask that is not about
    # the game attaches nothing. An unresolved game attaches nothing either -- see the
    # implicit-route check in retrieve_knowledge_context, which suppresses the generic genre
    # fallback so this does not staple a boilerplate card to every Ask.
    if aid or aname:
        return True, "strategy"
    # D19, last resort. Deliberately below the compat router: "how do I fix proton for portal 2"
    # is a troubleshooting question that happens to name a title, and routing it to strategy
    # would answer the wrong question. Measured on device 2026-08-17 -- `hl2 ravenholm` and
    # `drg survivor what class` returned gate=False in every mode, so all strategy content was
    # unreachable however plainly the user named the game. KB-NEWTITLE-01 documented the
    # opposite as expected behaviour; it was specified and never built.
    if str(text_resolved_title or "").strip():
        return True, "strategy"
    return False, ""


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


def _trust_tier_for_compat_row(row: sqlite3.Row) -> str:
    if row["source_url"]:
        return TRUST_TIER_WIKI_NO_PATCH
    return TRUST_TIER_FALLBACK


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


def _load_corpus_manifest(settings: dict) -> Optional[dict[str, Any]]:
    root = str(settings.get("rag_corpus_path") or "").strip()
    if not root:
        return None
    manifest_path = os.path.join(root, CORPUS_MANIFEST_FILENAME)
    if not os.path.isfile(manifest_path):
        return None
    try:
        return load_manifest_from_path(manifest_path)
    except Exception:
        return None


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


def _load_compat_vectors(conn: sqlite3.Connection, pattern_ids: list[int]) -> dict[int, list[float]]:
    if not pattern_ids:
        return {}
    placeholders = ",".join("?" for _ in pattern_ids)
    rows = conn.execute(
        f"SELECT pattern_id, embedding FROM compat_pattern_vectors "
        f"WHERE pattern_id IN ({placeholders}) AND embedding IS NOT NULL",
        pattern_ids,
    ).fetchall()
    out: dict[int, list[float]] = {}
    for row in rows:
        vec = unpack_embedding_vector(bytes(row["embedding"]))
        if vec:
            out[int(row["pattern_id"])] = vec
    return out


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
        game_title="Shared troubleshooting",
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


TYPE_RECALL_K = 3


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


def _load_section_vectors(conn: sqlite3.Connection, section_ids: list[int]) -> dict[int, list[float]]:
    if not section_ids:
        return {}
    placeholders = ",".join("?" for _ in section_ids)
    rows = conn.execute(
        f"SELECT section_id, embedding FROM section_vectors "
        f"WHERE section_id IN ({placeholders}) AND embedding IS NOT NULL",
        section_ids,
    ).fetchall()
    out: dict[int, list[float]] = {}
    for row in rows:
        vec = unpack_embedding_vector(bytes(row["embedding"]))
        if vec:
            out[int(row["section_id"])] = vec
    return out


def _vector_recall_sections(
    conn: sqlite3.Connection,
    *,
    game_id: int,
    query_vector: list[float],
    top_k: int,
    min_similarity: float,
    exclude_ids: set[int],
) -> tuple[list[KnowledgeCard], dict[int, list[float]]]:
    """Rank one game's whole section set by cosine -- the vector half's own recall path.

    Returns ``(recall_cards, vectors_by_id)``: the above-floor cards the keyword shortlist did
    not already contain, plus the vectors for **every** section of the game. The second value
    is what the fusion re-ranks with, so the caller needs exactly one load either way.

    Scoped to the resolved game for the same reason ``_search_sections`` is: the best cosine
    match in the whole corpus for an uncovered title is another game's card, and wrong-game
    advice is worse than none. A game holds 5-13 sections, so scanning all of them costs one
    indexed query and a few hundred dot products.

    **Second signal (pool margin).** Clearing ``min_similarity`` is not enough on its own:
    the whole recall pass returns nothing unless the best card in the game either stands out
    from the pool average by ``VECTOR_RECALL_POOL_MARGIN`` or clears the floor by that same
    amount -- a question that is roughly equidistant from everything the game knows, at a
    score no better than middling, is noise. The margin is computed over every vectored
    section of the game -- ``exclude_ids`` included, since the question is being measured
    against the game, not against the shortlist -- and the gate only suppresses cards this
    pass alone would have supplied; keyword hits and their fusion re-ranking are untouched.

    Raises ``EmbeddingDimensionMismatch`` via ``_dot_similarity`` when the corpus was baked at
    a different dimension; the caller treats that as "disable hybrid for this request".
    """
    rows = conn.execute(
        "SELECT s.section_id, s.game_id, g.canonical_title, s.section_type, s.name, s.card, "
        "s.source_url, s.source_license, s.source_version, s.crawled_at "
        "FROM sections s JOIN games g ON g.game_id = s.game_id "
        "WHERE s.game_id = ?",
        (game_id,),
    ).fetchall()
    if not rows:
        return [], {}

    vectors_by_id = _load_section_vectors(conn, [int(r["section_id"]) for r in rows])
    if not vectors_by_id:
        return [], {}

    similarity_by_id = {
        section_id: _dot_similarity(query_vector, vec)
        for section_id, vec in vectors_by_id.items()
    }
    pool = list(similarity_by_id.values())
    if len(pool) >= VECTOR_RECALL_MARGIN_MIN_POOL:
        top1 = max(pool)
        margin = top1 - (sum(pool) / len(pool))
        if (
            margin < VECTOR_RECALL_POOL_MARGIN
            and top1 < min_similarity + VECTOR_RECALL_POOL_MARGIN
        ):
            return [], vectors_by_id

    scored: list[tuple[float, int, sqlite3.Row]] = []
    for row in rows:
        section_id = int(row["section_id"])
        if section_id in exclude_ids:
            continue
        similarity = similarity_by_id.get(section_id)
        if similarity is None or similarity < min_similarity:
            continue
        scored.append((similarity, section_id, row))

    # Ties broken by section_id so the order is stable run to run.
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [_section_row_to_card(row) for _, _, row in scored[:top_k]], vectors_by_id


def _fuse_cards_by_rrf(
    cards: list[KnowledgeCard],
    query_vector: list[float],
    vectors_by_id: dict[int, list[float]],
    *,
    top_k: int,
    recall_cards: Optional[list[KnowledgeCard]] = None,
    preferred_ids: Optional[set[int]] = None,
) -> list[KnowledgeCard]:
    """Reciprocal-rank fusion of the keyword ordering with the vector ordering.

    ``cards`` arrives in BM25 order, so a card's index is its FTS rank. Each list contributes
    ``w / (RRF_K + rank)``.

    ``recall_cards`` are cards only the vector pass found (see ``_vector_recall_sections``).
    They join the pool and take an FTS rank one past the end of the keyword list -- the same
    one-step backfill a vectorless card takes in the vector ranking below, and equal for all of
    them, so the vector ordering alone decides their order among themselves. Passing none
    leaves this a pure re-rank of the keyword shortlist, which is what the compat path does.

    Rank fusion replaces a cosine-only sort that appended vectorless cards *after* every
    vector-scored one, so the best keyword hit in the corpus sank below a marginal cosine
    match whenever its vector happened to be missing. Fusion also sidesteps the scale problem
    that made that sort fragile: cosine similarities bunch into a narrow band, so tiny gaps
    between near-identical scores decided the order outright.

    **Cards with no vector are given a rank one past the end of the vector list rather than
    being dropped from it.** Textbook RRF omits absent documents, and omission here would
    quietly rebuild the exile it is supposed to remove: with a 30-card shortlist, the worst
    possible vectored card scores 1/90 + 1/90 = 0.0222 while the #1 keyword hit with no vector
    scores 1/61 = 0.0164, so *having* a vector would outrank *being the best match*. Backfill
    makes the penalty for a missing vector one rank step instead of the whole list.

    ``preferred_ids`` marks cards the caller has a reason to favour that is not a ranking --
    today, tips on the topic D16 routed the question to. Each gets a flat ``RRF_W_TOPIC``
    bonus: a preference, per D22, so a clearly better match without the mark can still win.
    Flat rather than ranked because membership is all the signal there is.

    Raises ``EmbeddingDimensionMismatch`` via ``_dot_similarity`` when the corpus was baked at
    a different dimension; the caller treats that as "disable hybrid for this request".
    """
    pool = list(cards)
    if recall_cards:
        # Deduped against the whole pool as it grows: two recall paths can surface the same
        # card -- a boss card is both "typed boss" and a strong cosine match -- and it was
        # being fused twice, which showed up as the same card listed twice in one block.
        seen = {card.section_id for card in cards}
        for card in recall_cards:
            if card.section_id in seen:
                continue
            seen.add(card.section_id)
            pool.append(card)
    if not pool:
        return []

    fts_missing_rank = len(cards) + 1
    scores = [
        RRF_W_FTS / (RRF_K + (index + 1 if index < len(cards) else fts_missing_rank))
        for index in range(len(pool))
    ]

    by_similarity: list[tuple[float, int]] = []
    vectorless: list[int] = []
    for index, card in enumerate(pool):
        vec = vectors_by_id.get(card.section_id)
        if vec:
            by_similarity.append((_dot_similarity(query_vector, vec), index))
        else:
            vectorless.append(index)

    # Ties broken by FTS position so the fused order is deterministic run to run.
    by_similarity.sort(key=lambda item: (-item[0], item[1]))
    for vec_rank, (_, index) in enumerate(by_similarity, start=1):
        scores[index] += RRF_W_VEC / (RRF_K + vec_rank)

    missing_rank = len(by_similarity) + 1
    for index in vectorless:
        scores[index] += RRF_W_VEC / (RRF_K + missing_rank)

    if preferred_ids:
        for index, card in enumerate(pool):
            if card.section_id in preferred_ids:
                scores[index] += RRF_W_TOPIC / (RRF_K + 1)

    order = sorted(range(len(pool)), key=lambda i: (-scores[i], i))
    return [pool[i] for i in order[:top_k]]


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


# Weakest first. The block header states one tier for everything inside it, so it has to be
# the weakest claim present, not the strongest.
_TRUST_TIER_RANK = {
    TRUST_TIER_FALLBACK: 0,
    TRUST_TIER_WIKI_NO_PATCH: 1,
    TRUST_TIER_WIKI_VERIFIED: 2,
}

_BLOCK_HEADER = "--- Local knowledge base (bonsAI; offline corpus; may be truncated) ---"
_BLOCK_SENTINEL = "--- End local knowledge base ---"


def _lowest_trust_tier(cards: list[KnowledgeCard]) -> str:
    """Weakest tier among ``cards``.

    Was ``cards[0].trust_tier``, so a block holding one wiki_verified card and two
    fallback_no_source cards was labelled wiki_verified — the label overstated two thirds of
    its own contents, and the model was told to trust them accordingly.
    """
    if not cards:
        return TRUST_TIER_FALLBACK
    return min(cards, key=lambda c: _TRUST_TIER_RANK.get(c.trust_tier, 0)).trust_tier


def _omitted_note(count: int) -> str:
    return f"\n[{count} more card(s) omitted to fit budget]"


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
            if c.source_url
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


def retrieve_knowledge_context(
    settings: dict,
    *,
    ask_mode: str,
    question: str,
    app_id: str,
    app_name: str,
    shortcut_name: str = "",
    text_resolved_title: str = "",
    domain: str,
    pc_ip: str = "",
) -> KnowledgeRetrievalResult:
    """Retrieve and format knowledge for early_context_suffix injection."""
    t0 = time.perf_counter()
    db_path = resolve_corpus_db_path(settings)
    if not db_path:
        return KnowledgeRetrievalResult(
            attached=False,
            unavailable_reason="corpus_missing",
            timing_ms={"total_ms": round((time.perf_counter() - t0) * 1000, 2)},
        )

    top_k, max_bytes = _budget_for_mode(ask_mode)
    retrieval_method: RetrievalMethod = "keyword"
    embed_ms = 0.0
    rerank_ms = 0.0
    # D87: true once the meaning floor decided nothing in the candidate pool is a real match.
    # Read downstream to skip the fallback card and to label the no-hit note distinctly from an
    # ordinary "nothing routed at all" -- see COMPAT_MEANING_FLOOR.
    routed_nothing_fit = False
    # The strongest cosine in the candidate pool for this turn, or None when the meaning half
    # never ran (see KnowledgeRetrievalResult.best_meaning for why the difference matters).
    best_meaning: Optional[float] = None
    try:
        conn = _get_connection(db_path)
        t_resolve = time.perf_counter()
        game_id, resolution = _resolve_game_id(
            conn,
            app_id=app_id,
            app_name=app_name,
            shortcut_name=shortcut_name,
            text_resolved_title=text_resolved_title,
        )
        resolve_ms = round((time.perf_counter() - t_resolve) * 1000, 2)

        expanded = _expand_query(
            question,
            app_name or text_resolved_title,
            game_resolved=game_id is not None,
        )
        manifest = _load_corpus_manifest(settings)

        # Compatibility gate. A pre-v3 corpus baked bare documents; querying it with a
        # prefixed vector compares two different spaces and silently degrades ranking, so
        # refuse hybrid outright and say why in the retrieval method.
        variant_ok = corpus_embedding_compatible(manifest, model=DEFAULT_EMBEDDING_MODEL)
        # Maintainer kill-switch. Mirrors `_bool_default_true` in settings_service: a missing
        # key means on, so an older settings.json keeps hybrid rather than silently losing it.
        hybrid_enabled = settings.get("rag_hybrid_retrieval_enabled") is not False
        # D17: strategy cards now attach in any Ask mode, so most strategy retrieval arrives
        # without the user having declared the Ask to be about the game. That weaker evidence
        # gets a higher relevance bar and no genre-card consolation prize -- see
        # IMPLICIT_ROUTE_RELEVANCE_FLOOR and the fallback branch below.
        implicit_route = (ask_mode or "").strip().lower() not in _DECLARED_GAME_ASK_MODES
        # D62 #2: Speed promises the cheap keyword lookup only. Before this, nomic_ready never
        # looked at ask_mode, so Speed paid the same embed round trip as Strategy/Expert
        # whenever the keyword half found anything at all (measured on the Deck: ~1 second
        # added to two of three Speed questions). Strategy and Expert are untouched.
        speed_mode = (ask_mode or "speed").strip().lower() == "speed"

        if domain == "compat":
            has_vectors = corpus_has_usable_compat_vectors(conn, manifest)
            nomic_ready = (
                hybrid_enabled
                and has_vectors
                and variant_ok
                and not speed_mode
                and nomic_embed_available(pc_ip, model=DEFAULT_EMBEDDING_MODEL)
            )
            t_fts = time.perf_counter()
            fts_k = HYBRID_FTS_SHORTLIST_K if nomic_ready else top_k
            cards = _search_compat_patterns(conn, query=expanded, top_k=fts_k)
            # D16 already worked out what this question is about; D22 says use it. The topic
            # opens a recall path (measured: on-topic tips were absent from the keyword
            # candidates, not merely ranked below them) and marks its tips as preferred.
            # Runs whether or not the embed model is installed -- a keyword-only Deck gets the
            # routing fix too, just without the cosine ordering on top.
            preferred_ids: set[int] = set()
            compat_topics = match_compat_corpus_topics(question)
            topic_cards = _compat_tips_for_topics(
                conn,
                topics=compat_topics,
                exclude_ids={c.section_id for c in cards},
                top_k=COMPAT_TOPIC_RECALL_K,
            )
            preferred_ids |= {
                c.section_id
                for c in cards + topic_cards
                if _compat_topic_of(conn, c.section_id) in compat_topics
            }
            fts_ms = round((time.perf_counter() - t_fts) * 1000, 2)
            resolution = "compat_tips"
        else:
            preferred_ids = set()
            section_floor = (
                IMPLICIT_ROUTE_RELEVANCE_FLOOR if implicit_route else BM25_RELEVANCE_FLOOR
            )
            hybrid_eligible = domain == "strategy" and game_id is not None
            has_vectors = hybrid_eligible and corpus_has_usable_section_vectors(conn, manifest)
            nomic_ready = (
                hybrid_enabled
                and has_vectors
                and variant_ok
                and not speed_mode
                and nomic_embed_available(pc_ip, model=DEFAULT_EMBEDDING_MODEL)
            )
            t_fts = time.perf_counter()
            fts_k = HYBRID_FTS_SHORTLIST_K if nomic_ready else top_k
            # Only ever search within the resolved game. An unscoped search returns the best
            # keyword match in the whole corpus, which for an uncovered game means another
            # game's cards -- "how do I beat the tank" while playing something unrelated
            # answered with Left 4 Dead 2's Tank card. Wrong-game advice is worse than none,
            # and the genre fallback below already covers the unresolved case.
            cards = (
                _search_sections(
                    conn,
                    game_id=game_id,
                    query=expanded,
                    top_k=fts_k,
                    min_relevance=section_floor,
                )
                if game_id is not None
                else []
            )
            # "the boss" / "this level": pull the game's cards of that type into the pool.
            # Only on the explicit route -- same trade as the vector recall pass, since a bare
            # type word in a passing Ask is weak evidence that the Ask is about the game.
            # Marked preferred -- conditionally, see below -- for the same reason compat's
            # routed topic is: pool membership alone left DRG's one boss card behind three
            # keyword hits and outside a top-3 budget. Shares RRF_W_TOPIC deliberately: both
            # are the same shape of signal, a flat "this card is what the question asked for
            # by kind, not by name".
            topic_cards = (
                _sections_of_type(
                    conn,
                    game_id=game_id,
                    section_types=_section_types_named(question),
                    exclude_ids={c.section_id for c in cards},
                    top_k=TYPE_RECALL_K,
                )
                if game_id is not None and not implicit_route
                else []
            )
            # Type recall is a rescue, not a ranking: prefer its cards only for kinds the
            # keyword half missed entirely. `_sections_of_type` takes the game's first
            # TYPE_RECALL_K cards of the type by section_id, which is authoring order and
            # carries no relevance, so preferring them unconditionally promotes an arbitrary
            # slice over a real match. Measured 2026-08-19, once Ocarina of Time went from
            # three boss cards to six: "how do i beat the water temple boss" returned Queen
            # Gohma, Volvagia and Twinrova and dropped Morpha, whose card opens "The Water
            # Temple boss". Same bug, milder, on "the forest temple boss keeps flying away".
            #
            # Per kind rather than all-or-nothing: a question naming two types ("the boss in
            # this dungeon") can have keyword hits for one and none for the other, and the
            # half that found nothing still needs rescuing.
            kinds_found_by_keyword = {card.section_type for card in cards}
            preferred_ids = {
                card.section_id
                for card in topic_cards
                if card.section_type not in kinds_found_by_keyword
            }
            fts_ms = round((time.perf_counter() - t_fts) * 1000, 2)

        # Vectors exist but were not used: the user installed a corpus, so "keyword" alone
        # would misreport this as a corpus that never shipped embeddings. The kill-switch is
        # checked first on purpose -- when the maintainer turned hybrid off, saying "embed
        # unavailable" sends them hunting for an Ollama fault that is not there.
        if has_vectors and not hybrid_enabled:
            retrieval_method = "keyword_hybrid_disabled"
        elif has_vectors and not variant_ok:
            retrieval_method = "keyword_embed_unavailable"

        # Whether the vector half gets to search for itself rather than only re-order the
        # keyword shortlist. Two conditions, both load-bearing:
        #
        # - **A resolved game**, because the scan is per-game (`_vector_recall_sections`).
        # - **The explicit route**, i.e. the user declared this Ask to be about the game. The
        #   pass costs an embed round trip (793-900 ms measured on Deck 2026-08-17) and, at a
        #   floor loose enough to catch a paraphrase, will attach *something* to almost any
        #   question. Spending both on an Ask that merely happened while a game was open is
        #   the trade IMPLICIT_ROUTE_RELEVANCE_FLOOR already refused for keyword hits. Keyed
        #   off the same flag deliberately, so widening what counts as explicit (Expert is the
        #   open case) widens both at once and they cannot drift apart.
        vector_recall_ready = domain != "compat" and game_id is not None and not implicit_route

        if nomic_ready and (cards or topic_cards or vector_recall_ready):
            t_embed = time.perf_counter()
            try:
                query_vectors = embed_texts(
                    pc_ip,
                    [format_embed_query(expanded, model=DEFAULT_EMBEDDING_MODEL)],
                    model=DEFAULT_EMBEDDING_MODEL,
                    timeout_s=3.0,
                )
                query_vector = query_vectors[0]
                embed_ms = round((time.perf_counter() - t_embed) * 1000, 2)
                t_rerank = time.perf_counter()
                recall_cards: list[KnowledgeCard] = []
                if domain == "compat":
                    # Vectors for the whole pool, topic-recalled tips included -- cosine is
                    # what orders tips the keyword half never ranked.
                    vectors_by_id = _load_compat_vectors(
                        conn, [c.section_id for c in cards + topic_cards]
                    )
                elif vector_recall_ready and game_id is not None:
                    recall_cards, vectors_by_id = _vector_recall_sections(
                        conn,
                        game_id=game_id,
                        query_vector=query_vector,
                        top_k=VECTOR_RECALL_K,
                        min_similarity=VECTOR_RECALL_FLOOR,
                        exclude_ids={c.section_id for c in cards + topic_cards},
                    )
                else:
                    vectors_by_id = _load_section_vectors(conn, [c.section_id for c in cards])

                # D87: "none of these fit", on both the tips half and the notes half. Below the
                # floor, nothing in this candidate pool is a match worth guessing over, so the
                # whole pool is dropped rather than fused; the fallback card downstream is
                # skipped too (see the fallback_text block below), so this is "attach nothing",
                # not "attach the weakest thing we found". The notes gate is deliberately looser
                # in absolute terms and far stricter in what it may cost -- see
                # STRATEGY_MEANING_FLOOR's comment for why a note it does not catch (four such
                # sentences are named there) was left alone rather than pushed higher.
                best_meaning = _best_meaning_score(vectors_by_id, query_vector)
                meaning_floor = COMPAT_MEANING_FLOOR if domain == "compat" else STRATEGY_MEANING_FLOOR
                meaning_floor_rejected = best_meaning is not None and best_meaning < meaning_floor
                if meaning_floor_rejected:
                    routed_nothing_fit = True
                    cards = []
                else:
                    cards = _fuse_cards_by_rrf(
                        cards,
                        query_vector,
                        vectors_by_id,
                        top_k=top_k,
                        recall_cards=topic_cards + recall_cards,
                        preferred_ids=preferred_ids,
                    )
                rerank_ms = round((time.perf_counter() - t_rerank) * 1000, 2)
                retrieval_method = "hybrid"
            except (OllamaEmbedError, EmbeddingDimensionMismatch, IndexError, ValueError):
                embed_ms = round((time.perf_counter() - t_embed) * 1000, 2)
                cards = _merge_preferred_first(cards, topic_cards, preferred_ids, top_k=top_k)
                retrieval_method = "keyword_embed_unavailable"
        else:
            cards = _merge_preferred_first(cards, topic_cards, preferred_ids, top_k=top_k)

        # D17 routes every Ask made while a covered game runs, not just Strategy-mode ones.
        # The genre fallback is a generic card with no relation to the question, which is a
        # reasonable consolation for "I explicitly asked for strategy and we had nothing" and
        # pure noise stapled to an ordinary Ask that merely happened while a game was open.
        # So the fallback stays for the explicit route only.
        implicit_strategy_route = domain != "compat" and implicit_route

        fallback_text: Optional[str] = None
        # A meaning-floor rejection means "attach nothing", not "attach the weakest thing we
        # found" -- so the fallback card is skipped too, on both branches below.
        if not cards and not routed_nothing_fit:
            if domain == "compat":
                fallback_text = _compat_fallback(conn, question)
            elif not implicit_strategy_route:
                fallback_text = _genre_fallback(conn, game_id)

        text_block, trust, sources = _format_block(
            cards,
            fallback_text=fallback_text,
            domain=domain,
            max_bytes=max_bytes,
        )
        total_ms = round((time.perf_counter() - t0) * 1000, 2)
        if not text_block.strip():
            # D87's distinct signal: "routed_nothing_fit" means a topic (or keyword hit) reached
            # retrieval and the meaning floor turned it away, not that nothing was routed at all
            # -- so a later reader (Show details, the "no tip for this" line) can tell the two
            # apart instead of reading one "no_hit" for both.
            no_hit_label = "routed_nothing_fit" if routed_nothing_fit else "no_hit"
            return KnowledgeRetrievalResult(
                attached=False,
                notes=f"{no_hit_label} ({resolution})",
                retrieval_method=retrieval_method,
                best_meaning=best_meaning,
                timing_ms={
                    "resolve_ms": resolve_ms,
                    "fts_ms": fts_ms,
                    "embed_ms": embed_ms,
                    "rerank_ms": rerank_ms,
                    "total_ms": total_ms,
                },
            )
        return KnowledgeRetrievalResult(
            attached=True,
            text_block=text_block,
            trust_tier=trust,
            sources=sources,
            notes=resolution,
            retrieval_method=retrieval_method,
            best_meaning=best_meaning,
            # cards[0] is the winning card after fusion. Empty only on the fallback-card path,
            # where there is no winning card and so no keyword score to report.
            top_card_keyword_score=cards[0].bm25_score if cards else 0.0,
            timing_ms={
                "resolve_ms": resolve_ms,
                "fts_ms": fts_ms,
                "embed_ms": embed_ms,
                "rerank_ms": rerank_ms,
                "total_ms": total_ms,
            },
        )
    except sqlite3.Error as exc:
        close_connection(db_path)
        return KnowledgeRetrievalResult(
            attached=False,
            unavailable_reason=f"corpus_error:{exc}",
            timing_ms={"total_ms": round((time.perf_counter() - t0) * 1000, 2)},
        )


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
