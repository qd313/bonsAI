"""Deterministic input sanitization and README-documented magic phrases for Ask payloads.

Lane results drive transparency ``sanitizer_action`` / ``reason_codes`` and may block before Ollama is called.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Literal, Optional

# Documented in README / docs; match is trim + casefold, exact equality.
COMMAND_DISABLE_SANITIZE = "bonsai:disable-sanitize"
COMMAND_ENABLE_SANITIZE = "bonsai:enable-sanitize"

# Hard cap for Ollama user message size (characters).
MAX_USER_QUESTION_CHARS = 16_000


def normalize_command_input(text: str) -> str:
    """Normalize text for sanitizer command comparison (trim + casefold)."""
    return (text or "").strip().casefold()


def classify_sanitizer_command(text: str) -> Optional[Literal["disable", "enable"]]:
    """Return disable/enable if ``text`` is exactly a known command; else ``None``."""
    key = normalize_command_input(text)
    if key == COMMAND_DISABLE_SANITIZE.casefold():
        return "disable"
    if key == COMMAND_ENABLE_SANITIZE.casefold():
        return "enable"
    return None


def confirmation_message_for_command(kind: Literal["disable", "enable"]) -> str:
    """User-visible confirmation after a sanitizer keyword command (no Ollama)."""
    if kind == "disable":
        return (
            "Input sanitization is disabled for future asks. "
            f"Send {COMMAND_ENABLE_SANITIZE} (exact line, Ask field) to turn it back on. "
            "See README for details."
        )
    return (
        "Input sanitization is enabled again for future asks. "
        f"Send {COMMAND_DISABLE_SANITIZE} (exact line) to disable. "
        "See README for details."
    )


@dataclass
class SanitizeResult:
    """Outcome of applying the sanitizer lane to a user question."""

    action: Literal["pass", "clean", "block"]
    text: str
    reason_codes: list[str] = field(default_factory=list)
    user_message: str = ""


def _strip_nul(text: str) -> str:
    return text.replace("\x00", "")


def deterministic_normalize(question: str) -> tuple[str, list[str]]:
    """NFC, remove NUL and most C0 controls, collapse whitespace, trim; return (text, reasons)."""
    reasons: list[str] = []
    if not question:
        return "", reasons
    s = _strip_nul(question)
    if s != question:
        reasons.append("nul_removed")
    # NFC for stable comparison and transport
    s = unicodedata.normalize("NFC", s)
    # Replace C0 controls except tab/newline with space
    def _repl_ctrl(ch: str) -> str:
        o = ord(ch)
        if ch in "\t\n\r":
            return ch
        if o < 32 or o == 0x7F:
            return " "
        return ch

    s = "".join(_repl_ctrl(c) for c in s)
    # Collapse horizontal whitespace runs; normalize newlines to space for a single-line payload
    s = re.sub(r"[\t\r\n]+", " ", s)
    s = re.sub(r" {2,}", " ", s).strip()
    if len(s) > MAX_USER_QUESTION_CHARS:
        s = s[:MAX_USER_QUESTION_CHARS]
        reasons.append("truncated")
    return s, reasons


def _is_low_signal_gibberish(text: str) -> bool:
    """Conservative heuristic: very long runs of one character, or extremely low symbol diversity."""
    if len(text) < 12:
        return False
    if len(set(text)) <= 2 and len(text) >= 24:
        return True
    # Same ASCII letter repeated (e.g. keyboard mash)
    if re.fullmatch(r"(.)\1{39,}", text, flags=re.DOTALL):
        return True
    alnum = sum(1 for c in text if c.isalnum())
    if len(text) >= 48 and alnum > 0:
        unique = len({c.lower() for c in text if c.isalnum()})
        if unique / max(alnum, 1) < 0.08:
            return True
    return False


def should_block_after_normalize(text: str) -> tuple[bool, str]:
    """Return (blocked, user_message). Only run on normalized text."""
    if not text.strip():
        return True, "That message is empty after cleanup. Try a short question about your game or the Deck."
    if len(text) > MAX_USER_QUESTION_CHARS:
        return True, f"That message is too long (max {MAX_USER_QUESTION_CHARS} characters after cleanup)."
    if _is_low_signal_gibberish(text):
        return (
            True,
            "That input looks like random characters rather than a question. "
            "Try rephrasing, or disable sanitization with the command documented in README if you truly need raw text.",
        )
    return False, ""


def apply_input_sanitizer_lane(question: str, user_disabled: bool) -> SanitizeResult:
    """
    Apply the full lane when ``user_disabled`` is false; otherwise minimal NUL strip + trim.

    Model-assisted rewrite is not implemented (v1); ``rewrite_candidate`` is unused.
    """
    if user_disabled:
        t = _strip_nul(question).strip()
        return SanitizeResult(action="pass", text=t, reason_codes=["user_lane_disabled"])

    cleaned, reasons = deterministic_normalize(question)
    blocked, msg = should_block_after_normalize(cleaned)
    if blocked:
        return SanitizeResult(action="block", text=cleaned, reason_codes=reasons, user_message=msg)

    if reasons:
        return SanitizeResult(action="clean", text=cleaned, reason_codes=reasons)
    return SanitizeResult(action="pass", text=cleaned, reason_codes=[])
