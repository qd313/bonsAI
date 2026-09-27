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

Split 2026-09-24 (plan 65): turning a row into a `KnowledgeCard` and rendering the block of
cards lives in knowledge_base_cards.py, resolving which game a question is about lives in
knowledge_base_game_match.py, the keyword search and RRF fusion live in
knowledge_base_search.py, and the suggested-question chips plus corpus coverage live in
knowledge_base_chips.py. Everything those files export is re-imported here so every existing
caller keeps working unchanged.

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
import time
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

from backend.services.knowledge_base_schema import (
    CORPUS_MANIFEST_FILENAME,
    DEFAULT_EMBEDDING_MODEL,
    TRUST_TIER_FALLBACK,
    corpus_embedding_compatible,
    corpus_has_usable_compat_vectors,
    corpus_has_usable_section_vectors,
    load_manifest_from_path,
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
from backend.services.settings_service import sanitize_ollama_keep_alive

from backend.services.knowledge_base_cards import (
    KnowledgeCard,
    _BLOCK_SENTINEL,
    _COMPAT_GAME_TITLE,
    _compat_row_to_card,
    _format_block,
    _get_connection,
    _section_row_to_card,
    _trust_tier_for_row,
    close_connection,
    lookup_game_genres,
)
from backend.services.knowledge_base_game_match import (
    _expand_query,
    _question_without_game_name,
    _resolve_game_id,
    resolve_title_from_question,
)
from backend.services.knowledge_base_search import (
    BM25_RELEVANCE_FLOOR,
    COMPAT_TOPIC_RECALL_K,
    RRF_W_TOPIC,
    EmbeddingDimensionMismatch,
    TYPE_RECALL_K,
    _attached_keyword_score,
    _best_meaning_score,
    _compat_fallback,
    _compat_tips_for_topics,
    _compat_topic_of,
    _dot_similarity,
    _fts_match_query,
    _genre_fallback,
    _merge_preferred_first,
    _search_compat_patterns,
    _search_sections,
    _section_types_named,
    _sections_of_type,
    _COMPAT_BM25,
    _FTS_MAX_TOKENS,
    _FTS_STOPWORDS,
)
from backend.services.knowledge_base_chips import (
    KbCoverageSummary,
    SessionRagChipCandidate,
    SessionRagChipCandidatesResult,
    StackedContext,
    _COMPAT_CHIP_TEMPLATES,
    _curtail_section_to_chip,
    kb_coverage_to_transparency,
    session_rag_chip_candidates_to_rpc,
    stack_context_blocks,
    suggest_chip_candidates,
    summarize_kb_coverage,
)

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
#
# **Bug found 2026-09-25, fixed 2026-09-26 (plan 70, helper C):** the number above was written
# down rounded to four decimal places, and then set as the floor verbatim -- so the floor sat
# exactly ON the junk ceiling it was measured from, not above it. The check only turns a score
# away when it is strictly *less than* the floor (see ``meaning_floor_rejected`` below), so a
# junk phrase that reproduces that same rounded score, or a fresh one that lands a hair above
# it, is not "below the cut-off" and still gets a tip. Measured again on the twelve junk
# phrases of ``scripts/measure_kb_floor_holdout.py`` against the corpus this repo ships:
# "what time is it" now reads 0.50439822695..., which happens to round to the same 0.5044 but
# is a whisker under the old floor by luck, not by design -- any small, ordinary difference in
# corpus build or embedding model would have put it back on the wrong side. The floor is moved
# to 0.5050, six ten-thousandths above the junk ceiling instead of sitting on it, which still keeps
# every tuning-row right tip: the weakest one measured on this corpus today is 0.5804 (question
# V2-C-08, "I can play alone but online kicks me out straight away"), 75 thousandths of margin.
COMPAT_MEANING_FLOOR = 0.5050

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
    # `top_card_keyword_score` is the strongest BM25 score among every card that attached this
    # turn (see `_attached_keyword_score`), which is 0.0 only when none of them were ever
    # ranked by the keyword half and every one was found by meaning alone.
    #
    # **Both are absent, not low, whenever there was nothing to measure**: Speed mode, no embed
    # model reachable, a corpus baked without vectors, and an empty candidate pool all end here
    # with `best_meaning` None. A reader that treats None as "weak" would print a warning on
    # every turn of a Deck with no embed model, which is the opposite of what these are for.
    best_meaning: Optional[float] = None
    top_card_keyword_score: float = 0.0
    # HONESTY-TEXT-GAME-01, part two (plan 56 lane K, 2026-09-16). Same cosine as
    # `best_meaning`, measured a second time against the question with the resolved game's own
    # name stripped out -- see `_question_without_game_name`. Filled in only when a game reached
    # retrieval because the question named it (`text_resolved_title`, not a running game) and the
    # meaning half ran; None otherwise, on the same "nothing was measured" reading `best_meaning`
    # uses. should_show_no_close_match_notice reads this instead of `best_meaning` for its ceiling
    # check whenever it is present, because a game's own name repeated in every one of its own
    # cards can inflate the raw score but not this one.
    best_meaning_without_game_name: Optional[float] = None


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


# --- Fusion constants (RRF_W_FTS / RRF_W_VEC are mutated directly by scripts/eval_kb_embed_models.py's
# weight sweep, which is why _fuse_cards_by_rrf stays in this module rather than moving with
# the rest of the keyword search to knowledge_base_search.py -- see that script's own note.)
#
# Locked 2026-08-09 by PR2 bake-off on the deepened 119-section / 124-tip seed against
# kb_eval_v2 (140 labeled rows; tune 104 / holdout 36). Holdout top-3 could not separate RRF
# from keyword (overlapping CIs). Equal weights stay; do not "tune" from a later peek at
# holdout. Report: docs/archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md
RRF_K = 60
RRF_W_FTS = 1.0
RRF_W_VEC = 1.0

# --- Rank a generic "Starting out in <game>" note below a specific one (D-plan 70, helper B,
# bug 2, 2026-09-25) -- MEASUREMENT ONLY, off by default -----------------------------------------
#
# Found on the Deck: Black Mesa "how do i cross the electrified water" attaches and uses the
# right card (Crossing the electrified waste pools), but two generic notes ("Starting out in
# Black Mesa", "The opening tram ride and where it leads") are listed ahead of it and the shown
# block names the generic one first (docs/test-evidence/plan64-BLACKMESA-WATER.json). Nothing in
# the fusion above ranks a generic note any differently from a specific one today.
#
# Mutated directly the same way `RRF_W_FTS` / `RRF_W_VEC` above are, by a throwaway measurement
# script rather than a real caller -- this switch has no production wiring yet on purpose. The
# real build is wave two, once helper E's corpus work gives every card its own "kind" (a
# "starting out" card marked as such, not guessed from its name) -- keying this off the kind
# instead of the name is that lane's job, not this one's. Until then this stays OFF so the numbers
# for the wave-one report can be taken without changing anything a player sees.
DEMOTE_STARTING_OUT_NOTES = False

# Guessed from the name only -- every "Starting out in ..." card the seed corpus has today
# (data/kb/strategy_seed.json) starts exactly this way, including the ones with a longer subtitle
# ("Starting out in DOOM Eternal: the combat loop"). Wave two replaces this with the card's own
# kind once one exists.
_STARTING_OUT_NAME_PREFIX = "starting out in"

# A question that is itself asking how to begin should still get the generic note first --
# demoting it there would be exactly backwards. Kept short and literal on purpose, per the brief:
# widen this list only with a measured phrase, not a guess.
_START_INTENT_PHRASES = ("where do i start", "how do i get started", "beginner tips", "new to")


def _is_starting_out_card(card: KnowledgeCard) -> bool:
    """True for a generic "Starting out in <game>" note, guessed from its own name."""
    return (card.name or "").strip().lower().startswith(_STARTING_OUT_NAME_PREFIX)


def _question_asks_how_to_start(question: str) -> bool:
    """True when the question itself is asking how to begin -- see `_START_INTENT_PHRASES`."""
    q = (question or "").strip().lower()
    return any(phrase in q for phrase in _START_INTENT_PHRASES)


def _fuse_cards_by_rrf(
    cards: list[KnowledgeCard],
    query_vector: list[float],
    vectors_by_id: dict[int, list[float]],
    *,
    question: str = "",
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

    ``question`` only matters while `DEMOTE_STARTING_OUT_NOTES` is on (see the module comment
    above this function) -- it decides whether THIS question is itself asking how to start, in
    which case a generic note is not demoted. Every caller today leaves it blank, which reads the
    same as "not asking how to start" -- harmless while the switch stays off, which it does by
    default.
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

    # Measurement-only demotion (see DEMOTE_STARTING_OUT_NOTES above): off by default, so this
    # never changes the sort a real caller sees until something turns the switch on. A demoted
    # card ranks below every non-demoted one regardless of its fused score -- "below a specific
    # note", not "docked a few points" -- but keeps its own score order among other demoted
    # cards, and among non-demoted cards nothing changes at all.
    if DEMOTE_STARTING_OUT_NOTES and not _question_asks_how_to_start(question):
        demoted = [1 if _is_starting_out_card(card) else 0 for card in pool]
        order = sorted(range(len(pool)), key=lambda i: (demoted[i], -scores[i], i))
    else:
        order = sorted(range(len(pool)), key=lambda i: (-scores[i], i))
    return [pool[i] for i in order[:top_k]]


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
    # Same, with the resolved game's own name stripped from the question first -- see
    # KnowledgeRetrievalResult.best_meaning_without_game_name.
    best_meaning_without_game_name: Optional[float] = None
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

        # Plan 70, helper E2 (2026-09-26): a resolved game's own tips get a chance on every
        # question, not only ones already routed to the tip sheet -- see
        # _reroute_to_game_tip_if_it_fits for the measured gap this closes.
        game_tip_override, forced_tip_id = _reroute_to_game_tip_if_it_fits(
            conn,
            game_id=game_id,
            expanded_question=expanded,
        )
        if game_tip_override:
            domain = "compat"

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
            # Plan 70, helper P (2026-09-26): a general tip search only ever returns a shared
            # tip (app_id NULL) or the resolved game's own -- see
            # _compat_app_id_filter_clause's docstring for the wrong-game tip this closes.
            own_app_keys = tuple(_compat_app_keys_for_game(conn, game_id)) if game_id is not None else ()
            cards = _search_compat_patterns(
                conn, query=expanded, top_k=fts_k, own_app_keys=own_app_keys
            )
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
                own_app_keys=own_app_keys,
            )
            preferred_ids |= {
                c.section_id
                for c in cards + topic_cards
                if _compat_topic_of(conn, c.section_id) in compat_topics
            }
            # D29: a resolved game's own tips (Fallout 4's launch option, Deep Rock Galactic:
            # Survivor's UI-scale quirk, ...) join the pool preferred the same way a routed
            # topic's tips are -- see _compat_tips_for_app_keys's own docstring for why this
            # reuses preferred_ids rather than a stronger, unmeasured weight.
            if game_id is not None:
                game_tips = _compat_tips_for_app_keys(
                    conn,
                    app_keys=own_app_keys,
                    exclude_ids={c.section_id for c in cards + topic_cards},
                    top_k=COMPAT_TOPIC_RECALL_K,
                )
                topic_cards = topic_cards + game_tips
                preferred_ids |= {c.section_id for c in game_tips}
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
                    keep_alive=sanitize_ollama_keep_alive(settings.get("ollama_keep_alive")),
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

                # HONESTY-TEXT-GAME-01, part two (plan 56 lane K, 2026-09-16). Only when the
                # game reached retrieval because the question named it -- a running game's own
                # name in the question is not the failure this measures, see
                # `_question_without_game_name` and `KnowledgeRetrievalResult` for the fuller
                # account. Wrapped in its own try/except so a second embed call that fails
                # (timeout, dimension mismatch) never touches retrieval or the primary score --
                # it just leaves this at None, the same "nothing measured" reading everywhere
                # else here.
                if text_resolved_title and vectors_by_id:
                    stripped_question = _question_without_game_name(question, text_resolved_title)
                    if stripped_question:
                        try:
                            stripped_vectors = embed_texts(
                                pc_ip,
                                [format_embed_query(stripped_question, model=DEFAULT_EMBEDDING_MODEL)],
                                model=DEFAULT_EMBEDDING_MODEL,
                                timeout_s=3.0,
                                keep_alive=sanitize_ollama_keep_alive(settings.get("ollama_keep_alive")),
                            )
                            best_meaning_without_game_name = _best_meaning_score(
                                vectors_by_id, stripped_vectors[0]
                            )
                        except (OllamaEmbedError, EmbeddingDimensionMismatch, IndexError, ValueError):
                            best_meaning_without_game_name = None

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
                fallback_text = _compat_fallback(conn, question, own_app_keys=own_app_keys)
            elif not implicit_strategy_route:
                fallback_text = _genre_fallback(conn, game_id)

        # The tip that earned the reroute is shown first, not merely somewhere in the pool --
        # see _reroute_to_game_tip_if_it_fits. A reorder alone is not enough: Speed mode's
        # top_k of 1 had already trimmed the winning tip out of `cards` before this line ran,
        # because ordinary compat ranking (the routed topic, the fused keyword/vector score)
        # has no idea this particular tip is the whole reason the turn is here at all.
        # Fetched fresh rather than trusted to survive in `cards` -- it may have been cut.
        if game_tip_override and forced_tip_id is not None:
            forced_card = next(
                (c for c in cards if c.section_id == forced_tip_id), None
            ) or _compat_tip_card_by_pattern_id(conn, forced_tip_id)
            if forced_card is not None:
                cards = [forced_card] + [c for c in cards if c.section_id != forced_tip_id]
                cards = cards[:top_k]

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
            # -- so a later reader (Show details) can tell the two
            # apart instead of reading one "no_hit" for both.
            no_hit_label = "routed_nothing_fit" if routed_nothing_fit else "no_hit"
            return KnowledgeRetrievalResult(
                attached=False,
                notes=f"{no_hit_label} ({resolution})",
                retrieval_method=retrieval_method,
                best_meaning=best_meaning,
                best_meaning_without_game_name=best_meaning_without_game_name,
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
            best_meaning_without_game_name=best_meaning_without_game_name,
            # The best keyword score among every card that attached, not just cards[0] (the
            # fusion winner) -- see _attached_keyword_score for why that distinction matters.
            top_card_keyword_score=_attached_keyword_score(cards),
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
