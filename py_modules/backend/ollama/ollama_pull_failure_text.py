"""Title: Turning a failed model download's raw output into one plain sentence

Purpose: When `ollama pull` fails, its last output is mostly a spinner redrawing the same words. This
cleans that output up (escape codes, spinner frames and back-to-back repeats dropped) and puts the one
sentence a person can act on first, then the command's own words.

Used for: run_ollama_pull (local_ollama_setup_service.py), which imports it under its old name
`_format_ollama_pull_failure`.

Solves: Keeps this self-contained piece of wording out of the Ollama setup file, which is at its size limit.
Moved here unchanged from local_ollama_setup_service.py on 2026-11-17 (plan 105, lane D3).

Does not: Run anything or read any file; it only rewrites the text it is given.
"""

from __future__ import annotations

import re

_ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\].*?\x07")


def strip_ansi_escape_sequences(text: str) -> str:
    return _ANSI_ESCAPE_RE.sub("", text or "")


"""Braille spinner frames Ollama draws while it works. Ordinary characters, so the ANSI strip
leaves them; a failure after ten redraws otherwise repeats one word ten times."""
_SPINNER_FRAME_RE = re.compile(r"[⠀-⣿]+")
_REPEATED_BLANKS_RE = re.compile(r"\s{2,}")
"""A phrase repeated back to back, which is what a redraw looks like once the spinner frame
between the copies is gone. Ollama redraws with a carriage return rather than a newline, so the
repeats sit inside one line and splitting on lines does not see them. Bounded to 38 characters so
the backtracking stays cheap on the 480-character tail this is used on."""
_REPEATED_PHRASE_RE = re.compile(r"(?<!\S)(\S.{1,38}?\S)(?:\s+\1)+(?!\S)")


def format_ollama_pull_failure(tag: str, code: int, tail_lines: list[str]) -> str:
    """Human-readable pull failure: what to do about it first, the raw output after.

    The order matters now, and it did not before. Until the pull picker grew a field for typing
    any model name, every pull came from a curated list, so a tag that does not exist was nearly
    unreachable and almost nobody saw this line. Measured on the Deck 2026-09-05 (PULL-CUSTOM-02):
    a made-up name produced a message opening with ``ollama pull ... failed with exit code 1. Last
    output: pulling manifest ⠋ pulling manifest ⠙ pulling manifest ⠹ ...`` and ending with the one
    sentence a person can act on. Spinner frames first, the answer last.

    So the advice leads, the command's own words follow, and the spinner frames are dropped —
    they are animation, repeated once per redraw, and carry nothing.
    """
    # Ollama animates progress by redrawing the same line with a different spinner frame, so the
    # tail is mostly the same words over and over. Strip the frames (ordinary characters, so the
    # ANSI strip leaves them) and then drop consecutive repeats, which is what a redraw is.
    cleaned: list[str] = []
    for raw_line in strip_ansi_escape_sequences("\n".join(tail_lines)).splitlines():
        line = _REPEATED_BLANKS_RE.sub(" ", _SPINNER_FRAME_RE.sub("", raw_line)).strip()
        if line and (not cleaned or cleaned[-1] != line):
            cleaned.append(line)
    tail_text = _REPEATED_PHRASE_RE.sub(r"\1", " ".join(cleaned))
    tail_snip = tail_text[-480:] if tail_text else ""

    low = tail_text.casefold()
    advice = ""
    if "id_ed25519" in low and "no such file" in low:
        advice = (
            "Ollama’s ~/.ollama folder is missing keys (often after Clear all data). "
            "Tap Install Ollama on the Ollama tab, or run ``ollama serve`` once in Konsole."
        )
    elif "manifest" in low and ("not exist" in low or "does not exist" in low):
        advice = f"Tag «{tag}» is not on the Ollama library — try gemma4:e2b-it-qat or qwen3.5:4b."

    detail = f"ollama pull {tag} failed with exit code {code}"
    if tail_snip:
        detail += f". Last output: {tail_snip}"
    return f"{advice} {detail}" if advice else detail
