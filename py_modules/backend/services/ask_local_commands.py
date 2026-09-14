"""Title: Ask local command detection

Purpose: Detect local-only command kinds before Ollama runs.
Used for: Sanitizer, shortcut-setup, and VAC-check keyword classification in Ask flow.
Solves: A single LocalAskCommandKinds aggregate over the three command matchers.
Does not: Execute commands or format responses — see dedicated *_commands services.
       Does not hold the shared trim/casefold rules either — those are in ask_command_text,
       which the three matchers import directly so this file can import them.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.services.input_sanitizer_service import classify_sanitizer_command
from backend.services.shortcut_setup_commands import classify_shortcut_setup_command
from backend.services.vac_check_commands import parse_vac_check_command


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
    return LocalAskCommandKinds(
        sanitizer=classify_sanitizer_command(text) is not None,
        shortcut=classify_shortcut_setup_command(text) is not None,
        vac=parse_vac_check_command(text) is not None,
    )
