"""Title: Reply language resolver

Purpose: Detect Steam client language and resolve Ask reply-language settings.
Used for: System prompt language hints and sanitize_reply_language in settings_service.
Solves: config.vdf parsing, follow-system vs forced English, and effective language labels.
Does not: Translate model output post-hoc or change Steam client language settings.
"""

from __future__ import annotations

import os
import re
from typing import Optional

from backend.services.proton_troubleshooting_logs import steam_roots_for_home

REPLY_LANGUAGE_FOLLOW_SYSTEM = "follow_system"
REPLY_LANGUAGE_ALWAYS_ENGLISH = "en"
DEFAULT_REPLY_LANGUAGE_OVERRIDE = REPLY_LANGUAGE_FOLLOW_SYSTEM
DEFAULT_EFFECTIVE_REPLY_LANGUAGE = "english"

# Steam client ``config.vdf`` Language values (canonical lowercase codes).
STEAM_LANGUAGE_CODES: frozenset[str] = frozenset(
    {
        "english",
        "french",
        "german",
        "italian",
        "korean",
        "spanish",
        "schinese",
        "tchinese",
        "russian",
        "thai",
        "japanese",
        "portuguese",
        "polish",
        "danish",
        "dutch",
        "finnish",
        "norwegian",
        "swedish",
        "hungarian",
        "czech",
        "romanian",
        "turkish",
        "arabic",
        "brazilian",
        "bulgarian",
        "greek",
        "ukrainian",
        "latam",
        "vietnamese",
        "indonesian",
    }
)

# Human-readable names for prompt injection and UI (English labels).
STEAM_LANGUAGE_DISPLAY_NAMES: dict[str, str] = {
    "english": "English",
    "french": "French",
    "german": "German",
    "italian": "Italian",
    "korean": "Korean",
    "spanish": "Spanish",
    "schinese": "Simplified Chinese",
    "tchinese": "Traditional Chinese",
    "russian": "Russian",
    "thai": "Thai",
    "japanese": "Japanese",
    "portuguese": "Portuguese",
    "polish": "Polish",
    "danish": "Danish",
    "dutch": "Dutch",
    "finnish": "Finnish",
    "norwegian": "Norwegian",
    "swedish": "Swedish",
    "hungarian": "Hungarian",
    "czech": "Czech",
    "romanian": "Romanian",
    "turkish": "Turkish",
    "arabic": "Arabic",
    "brazilian": "Brazilian Portuguese",
    "bulgarian": "Bulgarian",
    "greek": "Greek",
    "ukrainian": "Ukrainian",
    "latam": "Latin American Spanish",
    "vietnamese": "Vietnamese",
    "indonesian": "Indonesian",
}

_LANGUAGE_VDF_RE = re.compile(
    r'"Language"\s+"([^"]+)"',
    re.IGNORECASE,
)

_OVERRIDE_ALIASES: dict[str, str] = {
    "follow_system": REPLY_LANGUAGE_FOLLOW_SYSTEM,
    "follow-system": REPLY_LANGUAGE_FOLLOW_SYSTEM,
    "system": REPLY_LANGUAGE_FOLLOW_SYSTEM,
    "en": REPLY_LANGUAGE_ALWAYS_ENGLISH,
    "english": REPLY_LANGUAGE_ALWAYS_ENGLISH,
}


def normalize_steam_language_code(raw: str | None) -> str:
    """Map a Steam ``Language`` value to a canonical code; unknown → ``english``."""
    code = (raw or "").strip().lower()
    if not code:
        return DEFAULT_EFFECTIVE_REPLY_LANGUAGE
    if code in STEAM_LANGUAGE_CODES:
        return code
    return DEFAULT_EFFECTIVE_REPLY_LANGUAGE


def sanitize_reply_language(value: object) -> str:
    """Validate persisted reply-language override."""
    if not isinstance(value, str):
        return DEFAULT_REPLY_LANGUAGE_OVERRIDE
    raw = value.strip().lower()
    if not raw:
        return DEFAULT_REPLY_LANGUAGE_OVERRIDE
    if raw in _OVERRIDE_ALIASES:
        return _OVERRIDE_ALIASES[raw]
    if raw == REPLY_LANGUAGE_FOLLOW_SYSTEM:
        return REPLY_LANGUAGE_FOLLOW_SYSTEM
    if raw == REPLY_LANGUAGE_ALWAYS_ENGLISH:
        return REPLY_LANGUAGE_ALWAYS_ENGLISH
    if raw in STEAM_LANGUAGE_CODES:
        return raw
    return DEFAULT_REPLY_LANGUAGE_OVERRIDE


def parse_language_from_config_vdf(text: str) -> Optional[str]:
    """Extract Steam client Language from config.vdf text."""
    match = _LANGUAGE_VDF_RE.search(text or "")
    if not match:
        return None
    return match.group(1).strip()


def detect_steam_client_language(home: str | None = None) -> str:
    """Read Steam client preferred language from the first readable ``config.vdf``."""
    home_rp = os.path.realpath(os.path.expanduser(home or os.environ.get("HOME", "~")))
    for root in steam_roots_for_home(home_rp):
        config_path = os.path.join(root, "config", "config.vdf")
        try:
            if not os.path.isfile(config_path):
                continue
            with open(config_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read(64 * 1024)
            raw = parse_language_from_config_vdf(text)
            if raw:
                return normalize_steam_language_code(raw)
        except OSError:
            continue
    return DEFAULT_EFFECTIVE_REPLY_LANGUAGE


def resolve_effective_reply_language(
    override: object,
    *,
    home: str | None = None,
) -> str:
    """Resolve the language code used for Ask replies (always a Steam language code)."""
    sanitized = sanitize_reply_language(override)
    if sanitized == REPLY_LANGUAGE_FOLLOW_SYSTEM:
        return detect_steam_client_language(home)
    if sanitized == REPLY_LANGUAGE_ALWAYS_ENGLISH:
        return "english"
    return sanitized


def language_display_name(code: str) -> str:
    """English UI label for a Steam language code."""
    normalized = normalize_steam_language_code(code)
    return STEAM_LANGUAGE_DISPLAY_NAMES.get(normalized, normalized.title())


def reply_language_snapshot(
    override: object,
    *,
    home: str | None = None,
) -> dict[str, str]:
    """Snapshot for RPC / transparency: override, detected client lang, effective code + label."""
    sanitized = sanitize_reply_language(override)
    steam_client = detect_steam_client_language(home)
    effective = resolve_effective_reply_language(sanitized, home=home)
    return {
        "override": sanitized,
        "steam_client_language": steam_client,
        "effective": effective,
        "display_name": language_display_name(effective),
    }
