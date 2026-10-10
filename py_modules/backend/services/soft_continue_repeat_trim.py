"""Title: Trimming text a continued answer says a second time

Purpose: When a long answer hits its length limit, the plugin hands the model the answer so far and
asks it to carry on (a soft continue). A small model often does not carry on: it starts its next
piece by writing again something it already wrote, either the sentence it was cut in the middle of
or a whole stretch of earlier paragraphs. Glued on as it came, the answer then says the same thing
twice. This drops that restated start of the piece once, so the answer carries on from where it
stopped. Nothing is dropped from a clean join.
Used for: ``join_continued_piece``, called from ollama_chat_stream._stream_ollama_chat_once on each
later piece of a soft continue: both what the screen is shown while the piece streams and the words
it hands back, which ollama_service.post_ollama_chat stitches into the saved answer. So the person
never sees the restated text appear; the live view holds back the first words of a piece until they
are known not to be a restatement.
Solves: Plan 87 lane B5, roadmap entry "After an answer is cut and continued, the saved text
repeats whole paragraphs across the join" (Deck 2026-10-08, plan 83, row P81-CONTINUE-ONE-MARK: a
4067-character answer in 4 pieces held the same paragraphs twice; another answer repeated one
sentence at its one join).
The rule (words are compared, so a changed line break or space does not hide a repeat):
  1. Only the very start of the piece is looked at: its first words, after any status lines and
     blank space. The longest run of them that is also in the answer so far, word for word, is the
     candidate.
  2. If that run reaches the end of the answer so far (the piece restates the tail), it is dropped
     when it is at least ``MIN_REPEAT_CHARS`` (40) characters and ``MIN_REPEAT_WORDS`` (5) words, or,
     when it starts where a sentence or line starts in the answer so far (a cut sentence being
     started again), at least ``MIN_RESTART_CHARS`` (12) characters and ``MIN_RESTART_WORDS`` (3)
     words. The last word of the answer so far may be a half-typed one ("Act Thr" then "Act Three"):
     only the missing letters are taken from the piece.
  3. If the run ends before the end of the answer so far (the piece restates a stretch from the
     middle), it is dropped back to the last sentence or line end inside it, and only when that is at
     least ``MIN_STRETCH_CHARS`` (80) characters and ``MIN_STRETCH_WORDS`` (12) words: longer than
     rule 2 because here nothing ties the run to the cut. A restated stretch that does not end on a
     sentence is kept.
  4. A piece that is nothing but restated words is dropped whole.
  Never trimmed: anything when the answer so far ends inside an ordinary code block; a run that starts
  inside a code block of the answer so far; and the part of a run from an ordinary code block on.
  Hidden-block (spoiler) marks are ordinary words here: the cut never leaves a block half open.
Does not: look past the start of the piece (a repeat later inside one piece is the model's own),
touch a piece that has fewer than three words yet, or merge the hidden-block marker (that is
soft_continue_spoiler_join, which runs first).
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import NamedTuple

from backend.services.response_verify import (
    _fence_chunk_is_closed,
    _fence_opener_is_spoiler,
    _split_fenced_segments,
)
from backend.services.soft_continue_spoiler_join import drop_repeated_spoiler_opener
from backend.services.strategy_spoiler_policy import move_midline_fence_openers_to_line_start

MIN_REPEAT_CHARS = 40
MIN_REPEAT_WORDS = 5
MIN_RESTART_CHARS = 12
MIN_RESTART_WORDS = 3
MIN_STRETCH_CHARS = 80
MIN_STRETCH_WORDS = 12

_STATUS_TAG_RE = re.compile(r"<bonsai-status>(?:(?!</bonsai-status>).)*</bonsai-status>", re.IGNORECASE | re.DOTALL)
_LEAD_RE = re.compile(r"\A(?:\s*<bonsai-status>(?:(?!</bonsai-status>).)*</bonsai-status>)*\s*", re.IGNORECASE | re.DOTALL)
_WORD_RE = re.compile(r"\S+")
_SENTENCE_END_RE = re.compile(r"[.!?:…][\"'”’)\]*_]*\Z")


class _Word(NamedTuple):
    text: str
    start: int
    end: int


class _PrefixIndex(NamedTuple):
    text: str
    words: list
    by_text: dict
    plain_fences: list  # (start, end) of ordinary code blocks
    ends_in_plain_fence: bool


def _words(text: str) -> list[_Word]:
    return [_Word(m.group(), m.start(), m.end()) for m in _WORD_RE.finditer(text)]


def _plain_fence_ranges(text: str) -> tuple[list[tuple[int, int]], bool]:
    """Ranges of ordinary (not hidden-block) code blocks in ``text``; True when the last is open."""
    if "```" not in text and "~~~" not in text:
        return [], False
    fixed = move_midline_fence_openers_to_line_start(text)
    if len(fixed) != len(text):
        # The repair moved characters, so offsets would not line up; read the text as it is.
        fixed = text
    segments = _split_fenced_segments(fixed + "\n")
    ranges: list[tuple[int, int]] = []
    pos = 0
    open_at_end = False
    for index, (kind, chunk) in enumerate(segments):
        if kind == "fence" and not _fence_opener_is_spoiler(chunk):
            ranges.append((pos, pos + len(chunk)))
            if index == len(segments) - 1 and not _fence_chunk_is_closed(chunk):
                open_at_end = True
        pos += len(chunk)
    return ranges, open_at_end


@lru_cache(maxsize=8)
def _index_prefix(visible_prefix: str) -> _PrefixIndex:
    words = _words(visible_prefix)
    by_text: dict[str, list[int]] = {}
    for i, w in enumerate(words):
        by_text.setdefault(w.text, []).append(i)
    ranges, open_at_end = _plain_fence_ranges(visible_prefix)
    return _PrefixIndex(visible_prefix, words, by_text, ranges, open_at_end)


def _starts_a_sentence(text: str, pos: int) -> bool:
    before = text[:pos].rstrip(" \t")
    return before == "" or before.endswith("\n") or bool(_SENTENCE_END_RE.search(before))


def _word_ends_a_sentence(core: str, words: list[_Word], i: int) -> bool:
    """True when word ``i`` ends a sentence or is last on its line."""
    if _SENTENCE_END_RE.search(words[i].text):
        return True
    if i + 1 < len(words):
        return "\n" in core[words[i].end : words[i + 1].start]
    return False


def _first_plain_fence_at(core: str) -> int:
    """Where the first ordinary code block in ``core`` begins, or -1."""
    if "```" not in core and "~~~" not in core:
        return -1
    fixed = move_midline_fence_openers_to_line_start(core)
    if len(fixed) != len(core):
        fixed = core
    pos = 0
    for kind, chunk in _split_fenced_segments(fixed + "\n"):
        if kind == "fence" and not _fence_opener_is_spoiler(chunk):
            return pos
        pos += len(chunk)
    return -1


class _Run(NamedTuple):
    count: int  # whole words of the piece matched (a still-arriving last word counts)
    partial: int  # letters of one more piece word the answer so far has (it was cut inside it)
    reached: bool  # the run ends where the answer so far ends
    start_word: int  # index in the answer so far's words where the run starts


def _best_run(index: _PrefixIndex, core: str, words: list[_Word], growing: bool) -> "_Run | None":
    """The longest run of the piece's first words that is also in the answer so far.

    A run that reaches the end of the answer so far beats a longer one that does not. ``growing``:
    the piece is still streaming, so its own last word may be unfinished and only has to start the
    same way.
    """
    pw = index.words
    last_open = not index.text[-1:].isspace()
    piece_open = growing and not core[-1:].isspace()
    best: "_Run | None" = None
    starts = index.by_text.get(words[0].text, ())
    if piece_open and len(words) == 1:
        # The very first word is still arriving: any word that starts the same way may be its match.
        starts = [i for i, w in enumerate(pw) if w.text.startswith(words[0].text)]
    for j in starts:
        if any(a <= pw[j].start < b for a, b in index.plain_fences):
            continue
        k = 0
        while j + k < len(pw) and k < len(words) and pw[j + k].text == words[k].text:
            k += 1
        partial = 0
        at = j + k
        if k < len(words) and at < len(pw):
            if at == len(pw) - 1 and last_open and words[k].text.startswith(pw[at].text):
                partial = len(pw[at].text)
            elif piece_open and k == len(words) - 1 and pw[at].text.startswith(words[k].text):
                k += 1
        run = _Run(k, partial, j + k == len(pw) or partial > 0, j)
        if best is None or (run.reached, run.count, run.partial) > (best.reached, best.count, best.partial):
            best = run
    return best if best and (best.count or best.partial) else None


def _lead_tags(piece: str, lead_len: int) -> str:
    return "".join(_STATUS_TAG_RE.findall(piece[:lead_len]))


def _glue_rest(visible_prefix: str, rest: str) -> str:
    """The text after a cut, with the line breaks between it and the answer so far kept sane."""
    stripped = rest.lstrip()
    if not stripped:
        return ""
    if not visible_prefix[-1:].isspace():
        return rest
    had_paragraph_break = "\n\n" in rest[: len(rest) - len(stripped)]
    have = visible_prefix[len(visible_prefix.rstrip()) :].count("\n")
    return ("\n" * max(0, 2 - have) if had_paragraph_break else "") + stripped


def trim_repeated_start(prefix: str, piece: str, *, final: bool = True) -> str:
    """``piece`` without a start that repeats text already in ``prefix`` (see the module header).

    ``prefix`` is the answer so far (raw, status lines allowed), ``piece`` the next piece. While the
    piece is still streaming (``final`` False) its first words are held back as long as they could
    still turn out to be a restatement, so the repeat is never drawn and then taken away again.
    """
    if not prefix or not piece:
        return piece
    visible_prefix = _STATUS_TAG_RE.sub("", prefix)
    if not visible_prefix.strip():
        return piece
    lead_len = _LEAD_RE.match(piece).end()
    core = piece[lead_len:]
    words = _words(core)
    if not words:
        return piece
    index = _index_prefix(visible_prefix)
    if index.ends_in_plain_fence:
        return piece
    run = _best_run(index, core, words, growing=not final)
    if run is None:
        return piece
    count, reached = run.count, run.reached
    partial = run.partial
    run_end = words[count - 1].end if count else 0
    if partial:
        run_end = words[count].start + partial
    # Never trim from an ordinary code block onward.
    fence_at = _first_plain_fence_at(core[:run_end])
    if fence_at >= 0:
        count = sum(1 for w in words[:count] if w.end <= fence_at)
        if count == 0:
            return piece
        reached, partial, run_end = False, 0, words[count - 1].end
    first_start = words[0].start
    run_chars = run_end - first_start
    run_words = count + (1 if partial else 0)
    whole_piece = partial == 0 and count == len(words)

    cut = -1
    if reached:
        anchored = _starts_a_sentence(index.text, index.words[run.start_word].start)
        if run_chars >= MIN_REPEAT_CHARS and run_words >= MIN_REPEAT_WORDS:
            cut = run_end
        elif anchored and run_chars >= MIN_RESTART_CHARS and run_words >= MIN_RESTART_WORDS:
            cut = run_end
    elif run_chars >= MIN_STRETCH_CHARS and run_words >= MIN_STRETCH_WORDS:
        if whole_piece:
            cut = len(core)
        else:
            for i in range(count - 1, MIN_STRETCH_WORDS - 2, -1):
                end = words[i].end
                if end - first_start < MIN_STRETCH_CHARS:
                    break
                if _word_ends_a_sentence(core, words, i) and core[:end].count("```") % 2 == 0:
                    cut = end
                    break
    if cut < 0:
        # Streaming: all of it so far could still turn into a restatement, so show none of it yet.
        return _lead_tags(piece, lead_len) if (not final and whole_piece) else piece
    return _lead_tags(piece, lead_len) + _glue_rest(visible_prefix, core[cut:])


def join_continued_piece(prefix: str, piece: str, *, final: bool = True) -> str:
    """The next piece of a continued answer, ready to be glued onto ``prefix``.

    First the hidden-block opener the model writes again is merged (soft_continue_spoiler_join),
    then a restated start is trimmed. The only call the stream code makes.
    """
    return trim_repeated_start(prefix, drop_repeated_spoiler_opener(prefix, piece), final=final)
