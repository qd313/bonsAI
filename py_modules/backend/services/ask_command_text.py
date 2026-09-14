"""Title: Ask command text rules

Purpose: The trim/casefold/leading-slash rules every local Ask command matcher shares.
Used for: Sanitizer, shortcut-setup and VAC-check keyword matching before Ollama runs.
Solves: One place for the matching rules, with no imports, so the command modules do not
        have to import the dispatcher that imports them.
Does not: Classify or execute anything — see ask_local_commands and the *_commands services.
"""

from __future__ import annotations


def normalize_ask_command_input(text: str, *, allow_leading_slash: bool = False) -> str:
    """Trim + casefold; optionally strip one leading slash for paste-friendly matching."""
    s = (text or "").strip()
    if allow_leading_slash and s.startswith("/"):
        s = s[1:].lstrip()
    return s.casefold()


def strip_optional_leading_slash(text: str) -> str:
    """Trim and remove a single leading slash without casefold (VAC arg preservation)."""
    s = (text or "").strip()
    if s.startswith("/"):
        return s[1:].lstrip()
    return s
