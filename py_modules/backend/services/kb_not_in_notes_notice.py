"""Title: Knowledge-base attribution notices

Purpose: Output-side notes telling the user a reply came from the model's own training
knowledge rather than the local knowledge base -- both about the notes (Strategy/Expert only).
A third line for the tip sheet ("No tip for this") was retired by the maintainer on 2026-09-27:
four cut-offs were measured and none made it appear without losing right tips.
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
`tip_sheet_turn_came_back_empty` below is not a line of its own: the call site uses it to keep
"Not in my notes" off a turn whose search looked in the tip sheet, never in the notes.
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
    *, ask_mode: str, kb_attached: bool, kb_coverage_status: str, kb_notes: str = ""
) -> bool:
    """True when the notes cover this game but nothing in them matched the question this turn.

    ``kb_attached`` is `build_knowledge_base_transparency`'s `kb_attached` field -- whether a
    note actually reached the model. ``kb_coverage_status`` is
    `kb_coverage_to_transparency`'s `kb_coverage_status` field -- whether the corpus has
    anything for this game at all. Both are already computed once per turn in
    run_game_ai_request; this just reads them.

    ``kb_notes`` is the same result's `kb_notes` field. When it reads "dropped for room" (see
    `_BUDGET_DROPPED_NOTE` below), a note or tip WAS found and the context budget cut it before
    it reached the model -- so `kb_attached` is False, but "nothing in my notes" would be a false
    claim. On a tip turn the notes were not even searched. Plan 74 lane 5: no line either way.
    """
    mode = (ask_mode or "").strip().lower()
    if mode not in _ELIGIBLE_ASK_MODES:
        return False
    if kb_attached:
        return False
    if (kb_notes or "").strip() == _BUDGET_DROPPED_NOTE:
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


# --- Was this a tip-sheet turn that came back empty? ------------------------------------------
#
# This used to decide a third line, "No tip for this", retired by the maintainer on 2026-09-27
# (four cut-offs measured in plan 70, none made it appear without losing right tips). The check
# itself stays for one job: "Not in my notes" must not appear on a turn whose search went to the
# tip sheet, because the notes were never searched that turn. The inputs and the answer are the
# same as before the line was retired, so "Not in my notes" behaves exactly as it did.

# `should_retrieve_knowledge` (knowledge_base_service.py) returns this domain only for a
# troubleshooting-shaped question. It is never "compat" while the local knowledge base setting
# is off.
_COMPAT_DOMAIN = "compat"

# `run_game_ai_request` (game_ai_request.py) writes this exact string into `kb_notes` when a
# compat card was found and scored, but the context budget cut it before it reached the model.
_BUDGET_DROPPED_NOTE = "dropped_by_context_budget"

# `retrieve_knowledge_context` (knowledge_base_service.py) writes this exact string into its
# result's ``notes`` -- and so into ``kb_transparency["kb_notes"]`` -- whenever the tip sheet is
# what actually answered the turn, including a turn `_reroute_to_game_tip_if_it_fits` sent there
# (plan 70, helper E2) even though `should_retrieve_knowledge` had already locked the turn's
# `kb_domain` to "strategy" before the question was even read. `kb_domain` is computed once,
# before retrieval runs, and is never updated after a reroute -- so a rerouted turn's `kb_domain`
# still reads "strategy" everywhere downstream. Checking `kb_notes` alongside `kb_domain` is the
# same fix `transparency_service.py`'s "Source: shared troubleshooting tips" line already uses
# for this exact staleness (see its own `kb_domain == "compat" or kb_notes == "compat_tips"`).
_COMPAT_TIPS_RESOLUTION = "compat_tips"


def tip_sheet_turn_came_back_empty(
    *, kb_attached: bool, kb_domain: str, kb_unavailable_reason: str = "", kb_notes: str = ""
) -> bool:
    """True when this turn was routed to the tip sheet and nothing from it reached the model.

    All four are fields of `build_knowledge_base_transparency`'s result, already computed once
    per turn in run_game_ai_request. A missing corpus (``kb_unavailable_reason``) and a tip the
    context budget trimmed (``kb_notes``) both return False, as they always have.
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


# --- "No close match in my notes" (D88, 2026-09-07) -----------------------------------------
#
# The second line, and the only one that fires on a turn where a note DID reach the model.
# "Not in my notes" says "nothing came from the notes"; this one says "something did, and it
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
#
# --- Read the note's own text too, not only its title (bug found on the Deck 2026-09-23) -----
#
# Titles alone under-count a real match. A Hollow Knight question that describes a boss instead
# of naming it -- "the boss past the crystal spike area" -- shares no word with the title "Broken
# Vessel", so the check above threw the real match away and printed this line under a reply that
# plainly used that note (docs/test-evidence/plan64-NO-CLOSE-MATCH-HK.json; the same shape hit a
# Half-Life 2 walkthrough reply built on three attached chapter notes,
# docs/test-evidence/plan64-BUSY-DOT-01.json). The note's own text usually has the word the
# title does not: Broken Vessel's card reads "...far west in the Ancient Basin past a gap that
# needs the Crystal Heart..." -- "past" and "crystal" are right there.
#
# ``kb_source_texts`` carries each attached note's own card text, in the same order and the same
# optional, additive spirit as ``kb_source_titles``: empty by default, so every call site and
# every test that predates this fix is unaffected, and it only ever narrows a "no real support"
# verdict back to "trust the score" -- it can never turn a real match into a warning.
_QUESTION_FILLER_WORDS = frozenset(
    {
        "a", "an", "the", "i", "my", "me", "do", "does", "did", "is", "are", "was", "were",
        "to", "of", "for", "in", "on", "at", "and", "or", "it", "its", "this", "that", "you",
        "your", "how", "what", "when", "where", "why", "which", "who", "can", "could", "would",
        "should", "with", "about", "from", "into", "get", "got", "out", "up", "down", "will",
        "so", "if", "then", "there", "am", "be", "been", "being",
        # Ordinal/position words, added with the note-text check below. A real device reply
        # (docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json, "How do I beat the boss at the
        # end of the first area in Hades?") shows why: the wrong Hades notes attached (Temple of
        # Styx, Theseus and Asterius) and the reply named the wrong boss -- a genuine "no close
        # match" case the line must keep catching. Their card text happens to say "...killing
        # Asterius first...", which shares nothing about the question except this one structural
        # word. Counting it as content would have silenced this exact wrong-subject case.
        "first", "last", "next",
    }
)


def _singular_form(word: str) -> str:
    """Strip one trailing "s" from a plural, so "chapters" in a question can match a note that
    only ever says "chapter" -- same one-letter tolerance strategy_entity_extraction.py's
    `_match_known_entity` already uses for the mirror-image case (a plural in the question,
    the card's own name singular). Left alone for "ss" endings ("access") and anything three
    characters or shorter, where stripping the last letter would just invent a different word.
    """
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _content_words(text: str) -> set[str]:
    """Lowercase word tokens with filler words and single characters dropped.

    Each word also contributes its singular form (see `_singular_form`) so a plural in the
    question and a singular in a note's own text -- "chapters" asked, "chapter" written -- still
    count as the same word once compared.
    """
    words = {
        word
        for word in re.findall(r"[a-z0-9']+", (text or "").lower())
        if word not in _QUESTION_FILLER_WORDS and len(word) > 1
    }
    return words | {_singular_form(word) for word in words}


def _keyword_score_reflects_the_question(
    *,
    question: str,
    kb_game_name: str,
    kb_source_titles: tuple[str, ...] = (),
    kb_source_texts: tuple[str, ...] = (),
) -> bool:
    """False only when a nonzero keyword score can be explained by the game's name alone.

    True -- trust the score, the behaviour before this fix -- whenever there is nothing to check
    it against (neither titles nor texts were passed) or nothing is left of the question once the
    game's name and the filler words are stripped from it, and whenever what is left DOES turn up
    in one of the titles or in one of the notes' own texts (``kb_source_texts`` -- see the module
    comment above this function for why titles alone under-count). False only when the question
    has real content and none of it appears anywhere in what actually attached -- the shape of the
    Black Mesa horse question above.
    """
    if not kb_source_titles and not kb_source_texts:
        return True
    real_words = _content_words(question) - _content_words(kb_game_name)
    if not real_words:
        return True
    attached_words: set[str] = set()
    for title in kb_source_titles:
        attached_words |= _content_words(title)
    for text in kb_source_texts:
        attached_words |= _content_words(text)
    return bool(real_words & attached_words)


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
    kb_source_texts: tuple[str, ...] = (),
    kb_best_meaning_without_game_name: float | None = None,
    kb_notes: str = "",
) -> bool:
    """True when a note reached the model but nothing in the notes matched the question closely.

    Reads the same two eligibility signals as `should_show_not_in_notes_notice` -- the Ask mode
    and whether the notes cover this game -- plus three from the retrieval result:
    ``kb_domain`` (this is the notes path, not the tip sheet, which has its own floor on a
    different scale), ``kb_best_meaning`` and ``kb_top_card_keyword_score``.

    ``kb_notes`` (plan 70, helper P) backs up the ``kb_domain`` check for a turn
    `_reroute_to_game_tip_if_it_fits` (knowledge_base_service.py) sent to the tip sheet even
    though `should_retrieve_knowledge` had already locked `kb_domain` to "strategy" before the
    reroute ran -- `kb_domain` is never updated afterward, so it still reads "strategy" for a
    turn the tip sheet actually answered. Measured on the Deck 2026-09-26
    (docs/test-evidence/plan70-R4-try3.json): Deep Rock Galactic: Survivor's own Render Scale
    tip attached and the answer used it, and this line still printed "No close match in my
    notes" underneath it, judging a tip-sheet turn by the notes' own floor. See
    `_COMPAT_TIPS_RESOLUTION`'s module comment for why `kb_notes` is the reliable signal here --
    the same fix `transparency_service.py` already applies to its own domain-keyed label.
    Blank by default, so a caller that predates this keeps its old behaviour unchanged.

    ``question``, ``kb_game_name``, ``kb_source_titles`` and ``kb_source_texts`` are optional, and
    only matter when ``kb_top_card_keyword_score`` is nonzero: see
    `_keyword_score_reflects_the_question` just above for why a nonzero score is not always proof
    of a real match, and what these four do about it. Leave them blank to trust the score
    outright, same as before this parameter existed.

    ``kb_source_texts`` (the bug found on the Deck 2026-09-23) is each attached note's own card
    text, alongside its title in ``kb_source_titles`` -- a question that describes a boss instead
    of naming it shares nothing with a short title but often shares a word with the note's own
    description of it. See the module comment above `_keyword_score_reflects_the_question` for
    the Hollow Knight and Half-Life 2 replies this was found from.

    **``kb_best_meaning`` of None means "nothing was measured", not "a weak match".** Speed mode,
    no embed model reachable, and a corpus baked without meaning vectors all arrive here with
    None. Treating that as weak would print this line on every single turn of a Deck with no
    embed model, which is the opposite of what it is for -- so None returns False.

    **``kb_best_meaning_without_game_name`` (HONESTY-TEXT-GAME-01, part two, plan 56 lane K)**
    is the same meaning score, measured a second time with the game's own name stripped out of
    the question -- see knowledge_base_service.py's `_question_without_game_name` for how it is
    built. Fixing the keyword half alone (lane J, `f2e358a`) was not enough: a question naming
    its own game can also score high on MEANING purely because every one of that game's own
    cards repeats the game's name, which is exactly the "black mesa how do i tame a horse" case
    this whole line exists for. When this second score was measured (it is None on every turn
    that never had a text-resolved title, or where the meaning half did not run), it -- not the
    raw score -- decides the ceiling check below, because it is the one number a repeated game
    name cannot inflate.

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
    if (kb_notes or "").strip() == _COMPAT_TIPS_RESOLUTION:
        return False
    has_keyword_support = kb_top_card_keyword_score != _NO_KEYWORD_SUPPORT
    if has_keyword_support and _keyword_score_reflects_the_question(
        question=question,
        kb_game_name=kb_game_name,
        kb_source_titles=kb_source_titles,
        kb_source_texts=kb_source_texts,
    ):
        return False
    effective_meaning = (
        kb_best_meaning_without_game_name
        if kb_best_meaning_without_game_name is not None
        else kb_best_meaning
    )
    if effective_meaning is None:
        return False
    return effective_meaning < _THIN_MATCH_MEANING_CEILING


def should_show_no_close_match_notice_for_turn(
    *,
    ask_mode: str,
    kb_transparency: dict,
    kb_coverage_transparency: dict,
    text_resolved_title: str,
    question_for_kb_search: str,
    kb_attached_notes: list,
) -> bool:
    """Wraps `should_show_no_close_match_notice`, building its close-match-only arguments
    (question, game name, source titles, source texts) from a turn's already-computed state
    instead of asking every caller to assemble them by hand.

    HONESTY-TEXT-GAME-01 (plan 56 lane J, part two lane K): those four arguments let the check
    catch a keyword score, and separately a meaning score, that only look like a real match
    because the game's own name was typed as part of the question -- see the module comment
    above `_keyword_score_reflects_the_question`. They are filled in only when
    `text_resolved_title` is the reason a game is in play at all, i.e. nothing was running and
    the question named it (D19) -- a running game's name is not the failure this guards, so
    every other turn leaves them blank and gets the old behaviour unchanged.

    `kb_source_texts` (the bug found on the Deck 2026-09-23) is each attached note's own card
    text, alongside its title in `kb_source_titles` -- a question that describes a boss instead
    of naming it shares nothing with a short title but often shares a word with the note's own
    description of it.

    Moved out of game_ai_request.py (plan 70, growth-limit fix) so that file keeps one call for
    this instead of building these four arguments inline.

    Always passes `kb_transparency`'s own `kb_notes` through -- see
    `should_show_no_close_match_notice`'s own docstring for why a rerouted tip-sheet turn needs
    it alongside `kb_domain`.
    """
    close_match_question = ""
    close_match_game_name = ""
    close_match_source_titles: tuple[str, ...] = ()
    close_match_source_texts: tuple[str, ...] = ()
    if text_resolved_title:
        close_match_question = question_for_kb_search
        close_match_game_name = text_resolved_title
        close_match_source_titles = tuple(
            str(source.get("title") or "")
            for source in (kb_transparency.get("kb_sources") or [])
        )
        close_match_source_texts = tuple(
            str(note.get("card") or "") for note in kb_attached_notes
        )
    return should_show_no_close_match_notice(
        ask_mode=ask_mode,
        kb_attached=bool(kb_transparency.get("kb_attached")),
        kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
        kb_domain=str(kb_transparency.get("kb_domain") or ""),
        kb_best_meaning=kb_transparency.get("kb_best_meaning"),
        kb_top_card_keyword_score=float(
            kb_transparency.get("kb_top_card_keyword_score") or 0.0
        ),
        question=close_match_question,
        kb_game_name=close_match_game_name,
        kb_source_titles=close_match_source_titles,
        kb_source_texts=close_match_source_texts,
        kb_best_meaning_without_game_name=kb_transparency.get(
            "kb_best_meaning_without_game_name"
        ),
        kb_notes=str(kb_transparency.get("kb_notes") or ""),
    )


def append_no_close_match_notice(response_text: str, should_show: bool) -> str:
    """Append the fixed "no close match" line when `should_show`; unchanged otherwise.

    Same stacking rule as the two siblings above.
    """
    if not should_show:
        return response_text
    return (response_text or "").rstrip() + _NO_CLOSE_MATCH_NOTICE
