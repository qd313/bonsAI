"""Title: Knowledge-base attribution notices

Purpose: Output-side notes telling the user a reply came from the model's own training
knowledge rather than the local knowledge base -- one pair for the notes (Strategy/Expert
only), one pair for the tip sheet (any Ask mode).
Used for: Post-generation step in run_game_ai_request (game_ai_request.py), run once the KB
attach/coverage/domain signals for the turn are known -- alongside the destructive-advice safety
notice this copies the shape of.
Solves: Without these, a reply built entirely from the model's general knowledge read
identically to one grounded in a note or a tip, so the player had no way to tell which kind of
answer they were looking at.
Does not: Decide whether to run the knowledge-base search, judge answer quality, or change what
was asked. It only reads signals the retrieval step already produced -- `kb_attached` (did
something actually reach the model this turn), `kb_coverage_status` (does the corpus have
strategy notes for this game at all), `kb_domain` (was this turn routed to the notes or the tip
sheet), `kb_unavailable_reason` and `kb_notes` (why nothing attached) -- and appends one fixed
line per case. See destructive_advice_guard.py for the sibling check/append pair this mirrors.
The call site decides which of the two lines below wins when both would otherwise fire; see the
comment at that call site in game_ai_request.py.
"""

from __future__ import annotations

import re

# Wording decided 1 September, locked 2026-09-07 -- do not reword without the same process.
_NOT_IN_NOTES_LINE = "Not in my notes — this answer is from the model's own knowledge."

# Same footer shape as destructive_advice_guard._NOTICE (blank line, rule, then the line) but
# italic rather than bold: this is a quiet attribution note, not a safety warning.
_NOTICE = f"\n\n—\n*{_NOT_IN_NOTES_LINE}*"

# Strategy and Expert are the only Ask modes that declare themselves an explicit game ask (see
# `_DECLARED_GAME_ASK_MODES` in knowledge_base_service.py). Speed never shows this line even on
# a turn where the other two signals would otherwise qualify.
_ELIGIBLE_ASK_MODES = frozenset({"strategy", "expert"})

# `summarize_kb_coverage` (knowledge_base_service.py) returns this status only when the corpus
# has strategy sections for the resolved game. Its other statuses -- kb_off, corpus_missing,
# no_app, no_sections, app_unresolved, corpus_error (see transparency_service.py's
# kb_coverage_chip_label) -- all mean the game is not covered, or the library is off, or nothing
# is running, so none of them should show this line.
_COVERED_STATUS = "sections"


def should_show_not_in_notes_notice(
    *, ask_mode: str, kb_attached: bool, kb_coverage_status: str
) -> bool:
    """True when the notes cover this game but nothing in them matched the question this turn.

    ``kb_attached`` is `build_knowledge_base_transparency`'s `kb_attached` field -- whether a
    note actually reached the model. ``kb_coverage_status`` is
    `kb_coverage_to_transparency`'s `kb_coverage_status` field -- whether the corpus has
    anything for this game at all. Both are already computed once per turn in
    run_game_ai_request; this just reads them.
    """
    mode = (ask_mode or "").strip().lower()
    if mode not in _ELIGIBLE_ASK_MODES:
        return False
    if kb_attached:
        return False
    return kb_coverage_status == _COVERED_STATUS


def append_not_in_notes_notice(response_text: str, should_show: bool) -> str:
    """Append the fixed attribution line when `should_show`; unchanged otherwise.

    Appends after whatever is already in `response_text` -- including a destructive-advice
    safety notice, if one was appended first -- so the two footers stack in the order their
    callers add them rather than this function reordering anything.
    """
    if not should_show:
        return response_text
    return (response_text or "").rstrip() + _NOTICE


# --- "No tip for this" (D86 lane F, 2026-09-07) ---------------------------------------------
#
# Same shape as the notice above, for the other half of the corpus: a turn routed to the tip
# sheet (`kb_domain == "compat"`, `should_retrieve_knowledge`'s troubleshooting branch) where
# nothing attached. Wording decided in the wave-three plan; do not reword without the same
# process the sibling line above used.
_NO_TIP_FOR_THIS_LINE = "No tip for this — this answer is from the model's own knowledge."

_NO_TIP_NOTICE = f"\n\n—\n*{_NO_TIP_FOR_THIS_LINE}*"

# `should_retrieve_knowledge` (knowledge_base_service.py) returns this domain only for a
# troubleshooting-shaped question -- a game running (or named) is not required, unlike the
# notes' `_COVERED_STATUS` check above. It is never "compat" while the local knowledge base
# setting is off, so checking the domain alone already keeps this line off in that case; the
# `kb_unavailable_reason` check below covers the other "never" case the brief names, a missing
# corpus.
_COMPAT_DOMAIN = "compat"

# `run_game_ai_request` (game_ai_request.py) writes this exact string into `kb_notes` when a
# compat card was found and scored, but the context budget cut it before it reached the model --
# a real tip existed for this turn, it just did not fit. That is a different fact from "no tip
# fit", so it must not trigger this line.
_BUDGET_DROPPED_NOTE = "dropped_by_context_budget"

# The floor lane C is building (D87, knowledge_base_service.py) stamps `kb_notes` with this
# exact prefix when it decided nothing in the routed candidate pool was a real match. It is not
# tested for separately below: once that lane lands, a compat turn where it fired is *also* a
# compat turn with nothing attached and no budget-dropped tip, so the broader checks below
# already return True for it. Kept as a named constant so the two are visibly meant to line up,
# and so a later, stricter reading of this line (requiring the floor's own verdict rather than
# the broader "nothing attached" signal) has something to key off without re-deriving it.
_FLOOR_REJECTED_NOTE_PREFIX = "routed_nothing_fit"


def should_show_no_tip_for_this_notice(
    *, kb_attached: bool, kb_domain: str, kb_unavailable_reason: str = "", kb_notes: str = ""
) -> bool:
    """True when this turn was routed to the tip sheet and nothing from it reached the model.

    ``kb_domain`` is `build_knowledge_base_transparency`'s `kb_domain` field. ``kb_attached`` is
    the same field's `kb_attached`. ``kb_unavailable_reason`` and ``kb_notes`` are that same
    dict's fields, read only to rule out a missing corpus and a budget-dropped tip -- see the
    module comments above for what each rules out. All four are already computed once per turn
    in run_game_ai_request; this just reads them.

    This already fires correctly once lane C's floor lands and starts writing
    "routed_nothing_fit (...)" into ``kb_notes`` for a floor-rejected turn -- that case is a
    compat turn with nothing attached and no budget-dropped tip, which the checks below already
    catch. Until it lands, the same checks catch the plainer "no_hit (...)" case instead, which
    reads the same to a person: nothing from the tip sheet reached them.
    """
    if kb_attached:
        return False
    if (kb_domain or "").strip().lower() != _COMPAT_DOMAIN:
        return False
    if (kb_unavailable_reason or "").strip():
        return False
    if (kb_notes or "").strip() == _BUDGET_DROPPED_NOTE:
        return False
    return True


def append_no_tip_for_this_notice(response_text: str, should_show: bool) -> str:
    """Append the fixed "no tip for this" line when `should_show`; unchanged otherwise.

    Same stacking rule as `append_not_in_notes_notice`: appends after whatever is already in
    `response_text`, in whichever order the caller adds the footers.
    """
    if not should_show:
        return response_text
    return (response_text or "").rstrip() + _NO_TIP_NOTICE


# --- "No close match in my notes" (D88, 2026-09-07) -----------------------------------------
#
# The third line, and the only one of the three that fires on a turn where a note DID reach the
# model. The other two say "nothing came from the notes"; this one says "something did, and it
# was a stretch".
#
# **Why it exists.** The "not in my notes" line above shows only when nothing attached, and
# something nearly always attaches -- ten Strategy questions about covered games, gibberish
# included, all attached a note (plan 47's device evening). Fixing that by raising the attach
# floor was measured and refused: catching the four questions that caused this would cost twenty
# or more correct notes elsewhere (see STRATEGY_MEANING_FLOOR in knowledge_base_service.py). The
# maintainer's call on 2026-09-07 was to change what the line keys off instead -- keep the note,
# and say the match was thin. Nothing is taken away from anybody; a sentence is added.
#
# Wording approved by the maintainer 2026-09-07, through the same process as the two lines above.
# **The comma is theirs and is deliberate** -- the draft used a dash, to match the siblings, and
# they asked for a comma instead. Do not "fix" it to a dash or a semicolon on the grounds that the
# other two use a dash; that difference was chosen.
_NO_CLOSE_MATCH_LINE = (
    "No close match in my notes, this answer leans on the model's own knowledge."
)

_NO_CLOSE_MATCH_NOTICE = f"\n\n—\n*{_NO_CLOSE_MATCH_LINE}*"

# Measured 2026-09-07 by scripts/measure_kb_thin_match.py over all 361 Strategy rows of
# tests/fixtures/kb_eval_v2.json plus the four device sentences that caused the line, running the
# real pipeline end to end.
#
# The obvious rule -- "warn when the best meaning score is low" -- does not work on its own, and
# the numbers say so plainly. To warn on all four device sentences it needs 0.64 or higher, which
# also warns on 43 of the 188 rows that attach their RIGHT note. Nearly one right answer in four
# would carry a warning. That is the same wall STRATEGY_MEANING_FLOOR's comment already documents:
# raw closeness does not separate "really about this" from "shares enough words to score high".
#
# What does separate them is a second signal: whether the KEYWORD search ranked the winning note
# at all, or whether only the meaning search found it. A note that no word in the question points
# at, chosen purely because a machine judged it vaguely similar, is exactly the thin case.
#
# Requiring both -- no keyword support AND a meaning score under 0.65 -- gives, on the rows above:
#
#   warned on a right note (the cost)      11 of 188   about one in seventeen
#   warned on a wrong note (a win)          3 of 35
#   warned on a row with no recorded
#     right answer (also a win, and
#     invisible to any bucket count)       12          e.g. "how to save the game" answered with a
#                                                      note about Girlfriends, "how to have a baby"
#                                                      with one about raising a skill
#   the four device sentences               3 of 4     "where do i buy a house" is the miss: the
#                                                      keyword half really did rank a card for it
#
# Read the third row before judging the first. Twelve of the fifteen catches are on rows the test
# set records no right answer for, so they move no counter at all -- the same blind spot that
# nearly caused the attach floor to be reverted on 2026-09-07.
#
# Held-back rows only, for a check that generalises: 5 of 89 right notes warned, 0 of 24 wrong.
# The rule costs little and wins little on rows that all have a right answer somewhere, which is
# expected -- the questions it is FOR are the ones with no right answer at all, and the test set
# barely holds any.
_THIN_MATCH_MEANING_CEILING = 0.65

# A note the keyword search never ranked carries this score. `top_card_keyword_score` is the
# winning card's own BM25 score, and a card the keyword half found always has one above zero.
_NO_KEYWORD_SUPPORT = 0.0

# --- Question-minus-game-name overlap (HONESTY-TEXT-GAME-01, plan 56 lane J, 2026-09-16) -----
#
# Device evening 2026-09-15: nothing running, "black mesa how do i tame a horse". The question
# names the game, so `_resolve_game_id` (knowledge_base_service.py) scopes the keyword search to
# Black Mesa's own section rows -- every one of which repeats "Black Mesa" in its own title. That
# alone was enough for the keyword search to return a nonzero score for three cards, none of them
# about a horse, because the check above used to treat any nonzero score as proof of a real
# match. It is not, when the only word the query and the card share is the game's own name.
#
# The fix below does not touch retrieval or the score itself -- the three cards still attach
# exactly as before. It adds one more thing this function checks before trusting a nonzero score:
# strip the game's own name and a short list of filler words from the question, and see whether
# anything is left that also shows up in the titles of what attached. "Houndeye" and "the opening
# tram ride" share nothing with "tame a horse"; a question asking "how do i beat the gonarch"
# shares that exact word with a card titled "Gonarch". Only the first case may now turn a nonzero
# score back into "no real support" and let the line through.
#
# ``kb_source_titles`` and ``kb_game_name`` both default to empty, and an empty
# ``kb_source_titles`` always trusts the score outright (see `_keyword_score_reflects_the_question`
# below) -- every call site and every test that predates this fix keeps its old behaviour
# unchanged. The call site in game_ai_request.py only fills them in for the one case this was
# ever about: the game was resolved from the question text because nothing was running, so the
# game's own name really did just get typed as part of the question.
_QUESTION_FILLER_WORDS = frozenset(
    {
        "a", "an", "the", "i", "my", "me", "do", "does", "did", "is", "are", "was", "were",
        "to", "of", "for", "in", "on", "at", "and", "or", "it", "its", "this", "that", "you",
        "your", "how", "what", "when", "where", "why", "which", "who", "can", "could", "would",
        "should", "with", "about", "from", "into", "get", "got", "out", "up", "down", "will",
        "so", "if", "then", "there", "am", "be", "been", "being",
    }
)


def _content_words(text: str) -> set[str]:
    """Lowercase word tokens with filler words and single characters dropped."""
    return {
        word
        for word in re.findall(r"[a-z0-9']+", (text or "").lower())
        if word not in _QUESTION_FILLER_WORDS and len(word) > 1
    }


def _keyword_score_reflects_the_question(
    *, question: str, kb_game_name: str, kb_source_titles: tuple[str, ...]
) -> bool:
    """False only when a nonzero keyword score can be explained by the game's name alone.

    True -- trust the score, the behaviour before this fix -- whenever there is nothing to check
    it against (no titles were passed) or nothing is left of the question once the game's name
    and the filler words are stripped from it, and whenever what is left DOES turn up in one of
    the titles. False only when the question has real content and none of it appears anywhere in
    what actually attached -- the shape of the Black Mesa horse question above.
    """
    if not kb_source_titles:
        return True
    real_words = _content_words(question) - _content_words(kb_game_name)
    if not real_words:
        return True
    title_words: set[str] = set()
    for title in kb_source_titles:
        title_words |= _content_words(title)
    return bool(real_words & title_words)


def should_show_no_close_match_notice(
    *,
    ask_mode: str,
    kb_attached: bool,
    kb_coverage_status: str,
    kb_domain: str,
    kb_best_meaning: float | None,
    kb_top_card_keyword_score: float,
    question: str = "",
    kb_game_name: str = "",
    kb_source_titles: tuple[str, ...] = (),
) -> bool:
    """True when a note reached the model but nothing in the notes matched the question closely.

    Reads the same two eligibility signals as `should_show_not_in_notes_notice` -- the Ask mode
    and whether the notes cover this game -- plus three from the retrieval result:
    ``kb_domain`` (this is the notes path, not the tip sheet, which has its own floor on a
    different scale), ``kb_best_meaning`` and ``kb_top_card_keyword_score``.

    ``question``, ``kb_game_name`` and ``kb_source_titles`` are optional, and only matter when
    ``kb_top_card_keyword_score`` is nonzero: see `_keyword_score_reflects_the_question` just
    above for why a nonzero score is not always proof of a real match, and what these three do
    about it. Leave them blank to trust the score outright, same as before this parameter existed.

    **``kb_best_meaning`` of None means "nothing was measured", not "a weak match".** Speed mode,
    no embed model reachable, and a corpus baked without meaning vectors all arrive here with
    None. Treating that as weak would print this line on every single turn of a Deck with no
    embed model, which is the opposite of what it is for -- so None returns False.

    This can never collide with either line above: both of those require ``kb_attached`` to be
    False and this requires it to be True, so no tie-break is needed and none is written.
    """
    mode = (ask_mode or "").strip().lower()
    if mode not in _ELIGIBLE_ASK_MODES:
        return False
    if not kb_attached:
        return False
    if kb_coverage_status != _COVERED_STATUS:
        return False
    if (kb_domain or "").strip().lower() == _COMPAT_DOMAIN:
        return False
    has_keyword_support = kb_top_card_keyword_score != _NO_KEYWORD_SUPPORT
    if has_keyword_support and _keyword_score_reflects_the_question(
        question=question, kb_game_name=kb_game_name, kb_source_titles=kb_source_titles
    ):
        return False
    if kb_best_meaning is None:
        return False
    return kb_best_meaning < _THIN_MATCH_MEANING_CEILING


def append_no_close_match_notice(response_text: str, should_show: bool) -> str:
    """Append the fixed "no close match" line when `should_show`; unchanged otherwise.

    Same stacking rule as the two siblings above.
    """
    if not should_show:
        return response_text
    return (response_text or "").rstrip() + _NO_CLOSE_MATCH_NOTICE
