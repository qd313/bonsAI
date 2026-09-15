"""Title: Cleaning up what you typed before checking it against a built-in command

Purpose: A few things you can type in the Ask box are not questions at all — they are
commands, like turning word-filtering off, or the anti-cheat safety check. Before the
plugin can tell whether what you typed matches one of those, everyone doing the checking
needs to compare against the same tidied-up text. This file holds the two small cleanup
steps: trim the spaces off both ends and lower-case everything, and, when asked, drop one
leading slash, so a command still matches whether or not you typed it with a "/" in front.
Used for: The three places that check for a built-in command before a question ever
reaches the AI: the word-filter on/off switch, the shortcut-setup helper, and the
anti-cheat (VAC) keyword check.
Solves: Without one shared place for this, those three checks could tidy up the typed
text slightly differently from each other, and a command typed with different spacing or
capital letters might match in one place and silently fail to match in another.
Does not: Decide whether the tidied-up text actually matches a command, or do anything
once it does — that is each caller's own job.
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
