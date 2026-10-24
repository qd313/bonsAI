"""Title: Typing "remember …" to keep a note without asking the AI

Purpose: Typing ``remember no spoilers past the City of Tears`` (or ``note: …``) in the Ask box is
not a question for the AI. It is a command: bonsAI answers on the spot with "Keep this as a note?"
and the screen draws the same card a keepable question gets, with the words after the prefix as the
note. This file recognizes the command and hands back the words that follow the prefix.

Used for: ``ask_local_commands.py`` (is this line a note command) and
``ask_local_command_handlers.py`` (build the reply and the offer).

Solves: Gives the "remember …" prefix one definition for the back end. The screen keeps a mirror of
it (``src/features/ask/flow/localOnlyAskCommands.ts``) only so an empty Ollama address does not block the line.

Does not: Save anything (the card's Keep button does), decide the note's game, or shape the note's
text (``user_note_offer.py`` does).
"""

from __future__ import annotations

import re
from typing import Optional

# "remember …", "remember that …", "remember: …"; or "note: …". The colon is required after "note"
# so an ordinary question that starts with the word ("note that ...") still goes to the AI.
_NOTE_COMMAND = re.compile(
    r"^\s*(?:remember\b(?:\s*[:,\-–—]\s*|\s+that\b\s*[:,]?\s*|\s+)?|note\s*:\s*)(?P<words>.*)$",
    re.IGNORECASE | re.DOTALL,
)


def parse_note_command(text: str) -> Optional[str]:
    """The words after ``remember`` / ``note:``, or None when ``text`` is not a note command.

    An empty string means the prefix was typed with nothing after it. A leading slash is not
    stripped: this is a sentence a person types, not a ``bonsai:`` command.
    """
    match = _NOTE_COMMAND.match(text or "")
    if match is None:
        return None
    return match.group("words").strip()
