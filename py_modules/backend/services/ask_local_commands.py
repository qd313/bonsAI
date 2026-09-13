"""Title: Ask local command detection

Purpose: Normalize Ask input and detect local-only command kinds before Ollama runs.
Used for: Sanitizer, shortcut-setup, and VAC-check keyword classification in Ask flow.
Solves: Shared trim/casefold rules and a single LocalAskCommandKinds aggregate.
Does not: Execute commands or format responses — see dedicated *\_commands services.
"""

from __future__ import annotations

from dataclasses import dataclass


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


@dataclass(frozen=True)
class LocalAskCommandKinds:
    sanitizer: bool
    shortcut: bool
    vac: bool

    @property
    def any(self) -> bool:
        return self.sanitizer or self.shortcut or self.vac


def detect_local_ask_commands(text: str) -> LocalAskCommandKinds:
    """Single hook point for sanitizer / shortcut / VAC keyword detection."""
    from backend.services.input_sanitizer_service import classify_sanitizer_command
    from backend.services.shortcut_setup_commands import classify_shortcut_setup_command
    from backend.services.vac_check_commands import parse_vac_check_command

    return LocalAskCommandKinds(
        sanitizer=classify_sanitizer_command(text) is not None,
        shortcut=classify_shortcut_setup_command(text) is not None,
        vac=parse_vac_check_command(text) is not None,
    )

