"""Title: Joining a continued answer onto a hidden block it was cut off inside

Purpose: When a long answer hits its length limit, the plugin hands the model the answer so far and
asks it to carry on (a soft continue). If the limit fell inside a hidden (spoiler) block, the model
usually starts its next piece by opening that block again. Glued on as it came, the saved answer
then carries the block's opening marker twice. This drops that repeated opening marker, so the
next piece simply continues the block it was cut off inside. When the limit fell while the marker
itself was being typed ("```bons"), the next piece's whole marker finishes the half one instead.
Used for: ollama_chat_stream._stream_ollama_chat_once, on each later piece of a soft continue: both
what the screen is shown while it streams and the words it hands back, which
ollama_service.post_ollama_chat stitches into the answer that is saved.
Solves: Plan 81 helper I, 2026-10-03: every saved answer on the Deck with a doubled opening marker
at a joining point was a long guide cut off inside a hidden block (roadmap entry "Some saved answers
have a hidden block's markers written twice").
Does not: touch a piece when the answer so far is outside a hidden block (a new block is the
model's own choice), touch any other kind of block, or touch a marker that is not the first thing
the piece writes. A doubling the model writes inside one piece is the model's own and is left to
the chat memory's guard (chat_memory_service) and the screen.
"""

from __future__ import annotations

import re

from backend.services.response_verify import (
    _fence_chunk_is_closed,
    _fence_opener_is_spoiler,
    _split_fenced_segments,
)
from backend.services.strategy_spoiler_policy import move_midline_fence_openers_to_line_start

# The piece's first words: optional blank space and status lines, then a hidden block's opening
# marker alone on its line, or with the block's text after it on the same line. The status line
# matters: with the Deck's model (gemma4:e2b-it-qat) nearly every continued piece starts with one,
# "<bonsai-status>Continuing the guide</bonsai-status>", and the marker right after it (2026-10-03).
# Not the label-between-backticks mark ("```bonsai-spoiler```"): inside a block that one closes it.
_LEADING_SPOILER_OPENER_RE = re.compile(
    r"\A((?:[ \t\r\n]*<bonsai-status>(?:(?!</bonsai-status>).)*</bonsai-status>)*[ \t\r\n]*)"
    r"```bonsai-spoiler(?!`)[ \t]*(\n?)",
    re.IGNORECASE | re.DOTALL,
)
_STATUS_LINE_RE = re.compile(r"<bonsai-status>(?:(?!</bonsai-status>).)*</bonsai-status>", re.IGNORECASE | re.DOTALL)
_SPOILER_OPENER = "```bonsai-spoiler"
# The answer so far ends half way through typing that marker: three backticks and at least the
# "b", on a line of its own or glued to a word (the covers give such a marker a line of its own).
_HALF_TYPED_OPENER_TAIL_RE = re.compile(r"(?<!`)(```b[a-z-]{0,13})\Z", re.IGNORECASE)


def _ends_inside_hidden_block(text: str) -> bool:
    """True when ``text`` ends inside a hidden block that has no closing marker yet."""
    if "bonsai-spoiler" not in text:
        return False
    # The answer so far is read the way the finished-answer cover reads it (an opener glued to a
    # word counts as on its own line), and its last line as finished: the next piece starts after it.
    segments = _split_fenced_segments(move_midline_fence_openers_to_line_start(text) + "\n")
    if not segments:
        return False
    kind, chunk = segments[-1]
    return kind == "fence" and _fence_opener_is_spoiler(chunk) and not _fence_chunk_is_closed(chunk)


def drop_repeated_spoiler_opener(prefix: str, piece: str) -> str:
    """``piece`` without a leading hidden-block opener when ``prefix`` ends inside such a block.

    ``prefix`` is the answer so far, ``piece`` the next piece's words. A piece that so far holds
    only the marker comes back unchanged; the same call on a later, longer copy of it decides.
    """
    m = _LEADING_SPOILER_OPENER_RE.match(piece or "") if prefix else None
    if m is None:
        return piece
    rest = piece[m.end() :]
    if not m.group(2) and not rest:
        # Nothing after the marker yet: it may still grow into another label. Wait for more.
        return piece
    lead = m.group(1)
    half = _HALF_TYPED_OPENER_TAIL_RE.search(prefix)
    if half and _SPOILER_OPENER.startswith(half.group(1).lower()):
        # The limit fell while the marker itself was being typed ("```bons") and the next piece
        # types it again in full. Glued, the half marker opens an ordinary block with the whole
        # one as text inside it, and the hidden words show in plain view. Finish the half marker
        # instead (status lines stay where they are; the screen never shows them).
        tags = "".join(_STATUS_LINE_RE.findall(lead))
        return tags + _SPOILER_OPENER[len(half.group(1)) :] + "\n" + rest
    if not _ends_inside_hidden_block(prefix):
        return piece
    if "\n" not in lead and not prefix.endswith("\n"):
        # Glued to the last cut-off word: keep the next piece on a line of its own, as the screen
        # showed it while the marker was still there.
        lead += "\n"
    return lead + rest
