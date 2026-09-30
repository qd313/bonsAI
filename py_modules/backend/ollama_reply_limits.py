"""Title: A size limit on everything the Ollama address sends back

Purpose: One place that knows how much data bonsAI will accept from the Ollama address, and the
one small function that reads a reply without ever taking more than that. Anything past the limit
is cut off, the connection is closed, one line goes to the log, and the caller gets a plain
error it already knows how to handle.
Used for: every back-end call to the Ollama address that reads a whole reply body (the health
check, the model list, the embeddings, the warm-up, the unload, the token counts, the second-pass
check), the error body of a failed chat request, and the line and answer limits in the streamed
chat reply (`ollama_chat_stream.py`).
Solves: The address is whatever the person typed, so it can be a fake Ollama (security review
0.6.0, finding 6). A bare `resp.read()` on a reply that never ends, or a streamed line that never
reaches a newline, fills the Deck's memory. The limits below are far above anything a real Ollama
sends, so no real answer, model list or embedding is ever cut.
Does not: Touch the downloads from the internet (those have their own size limits), or decide what
a caller does with the error -- it only raises `OllamaReplyTooLarge`, an ordinary exception the
callers' existing `except Exception` paths already turn into "Ollama did not answer".

The numbers, and why:
- A whole reply body: 16 MiB. The biggest real replies are the installed-model list (about 1 KB
  per model, so a few hundred KB even for a big collection) and a batch of embeddings (about 15 KB
  per 768-number vector). Both are well under 2 MiB, so this leaves at least 8x headroom.
- The error body of a failed request: 64 KiB. Only the first few hundred characters are ever used.
- One streamed line: 1 MiB. A real line carries one small piece of the answer, a few hundred bytes.
- One streamed answer (its text and its thinking text together): 8,000,000 characters. A real
  answer is capped by the model's own token budget, a few tens of thousands of characters at most.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

MAX_REPLY_BODY_BYTES = 16 * 1024 * 1024
MAX_ERROR_BODY_BYTES = 64 * 1024
MAX_STREAM_LINE_BYTES = 1024 * 1024
MAX_STREAM_ANSWER_CHARS = 8_000_000

_logger = logging.getLogger(__name__)


class OllamaReplyTooLarge(Exception):
    """The Ollama address sent back more than any real Ollama would."""


def close_quietly(resp: Any) -> None:
    """Close a reply (or an HTTP error) and ignore any trouble closing it."""
    try:
        resp.close()
    except Exception:
        pass


def note_reply_too_large(what: str, limit: int, unit: str = "bytes", logger: Optional[logging.Logger] = None) -> str:
    """Log the one line for a cut-off reply and return the plain message for the caller."""
    (logger or _logger).warning(
        "ollama reply too large: %s went past the limit of %d %s; stopped reading and closed the connection",
        what,
        limit,
        unit,
    )
    return (
        "The reply from the Ollama address was far larger than any real Ollama sends, so bonsAI "
        "stopped reading it. Check that the address points at your own Ollama."
    )


def read_capped(
    resp: Any,
    limit: int = MAX_REPLY_BODY_BYTES,
    what: str = "reply",
    logger: Optional[logging.Logger] = None,
) -> bytes:
    """Read a whole reply body, but never more than ``limit`` bytes.

    Reads one byte past the limit so a reply of exactly ``limit`` bytes still passes. When the
    reply is bigger: closes it, logs one line, and raises ``OllamaReplyTooLarge``.
    """
    raw = resp.read(limit + 1)
    if raw is not None and len(raw) > limit:
        close_quietly(resp)
        raise OllamaReplyTooLarge(note_reply_too_large(what, limit, logger=logger))
    return raw or b""


def read_json_capped(
    resp: Any,
    limit: int = MAX_REPLY_BODY_BYTES,
    what: str = "reply",
    logger: Optional[logging.Logger] = None,
    errors: str = "strict",
) -> Any:
    """``json.loads`` of a capped read. ``errors`` is the decoding mode the caller always used."""
    return json.loads(read_capped(resp, limit, what, logger).decode("utf-8", errors))


def read_error_body(exc: Any, limit: int = MAX_ERROR_BODY_BYTES) -> str:
    """The body of an HTTP error as text, cut at ``limit`` bytes. Never raises, never logs."""
    try:
        return (exc.read(limit) or b"").decode("utf-8", errors="replace")
    except Exception:
        return ""
