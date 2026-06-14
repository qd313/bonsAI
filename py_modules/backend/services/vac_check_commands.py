"""Ask keyword: ``bonsai:vac-check`` — Steam Web API GetPlayerBans (no Ollama).

Requires the ``steam_web_api`` capability and a stored Web API key; responses are deterministic markdown.
"""

from __future__ import annotations

from typing import Any, Optional

from backend.services.shortcut_setup_commands import normalize_command_input_with_slash
from backend.services.steam_vac_service import (
    extract_steamid64_from_token,
    format_vac_report_markdown,
    get_player_bans_for_ids,
    split_vac_query_body,
)

COMMAND_VAC_CHECK = "bonsai:vac-check"


def parse_vac_check_command(text: str) -> Optional[str]:
    """
    If ``text`` is a VAC check command, return the argument string after the command
    (may be empty). Otherwise return ``None``.
    """
    raw = (text or "").strip()
    if raw.startswith("/"):
        raw = raw[1:].lstrip()
    low = raw.casefold()
    prefix = COMMAND_VAC_CHECK.casefold()
    if low == prefix:
        return ""
    if not (low.startswith(prefix + " ") or low.startswith(prefix + "\t")):
        return None
    idx = raw.casefold().find(prefix)
    if idx < 0:
        return None
    return raw[idx + len(COMMAND_VAC_CHECK) :].strip()


def response_for_vac_check(
    arg_line: str,
    *,
    api_key: str,
    capability_ok: bool,
) -> str:
    """
    Build markdown response. When ``capability_ok`` is false or ``api_key`` empty,
    return guidance only (no outbound HTTP).
    """
    if not capability_ok:
        return (
            "**Steam Web API is off for bonsAI.**\n\n"
            "Enable **Permissions → Steam Web API**, add your Web API key under **Settings → Connection**, "
            "then run:\n\n"
            "`bonsai:vac-check 7656119…`\n\n"
            "This command skips the AI and queries Valve **GetPlayerBans** for **account-level** ban flags only."
        )

    key = (api_key or "").strip()
    if not key:
        return (
            "**No Steam Web API key saved.**\n\n"
            "Register a key at Steam Web API (see README), paste it under **Settings → Connection → "
            "Steam Web API key**, save, then try again:\n\n"
            "`bonsai:vac-check 7656119…`"
        )

    tokens = split_vac_query_body(arg_line)
    if not tokens:
        return (
            "**Usage:** `bonsai:vac-check` followed by one or more **64-bit SteamIDs** or "
            "**steamcommunity.com/profiles/765…** URLs (space- or comma-separated).\n\n"
            "Vanity `/id/` URLs are not resolved in this build — use a numeric profile link or SteamID finder.\n\n"
            "Example:\n\n`bonsai:vac-check 76561198000000000`"
        )

    ids_ordered: list[str] = []
    skipped: list[tuple[str, str]] = []

    for tok in tokens:
        r = extract_steamid64_from_token(tok)
        if r.steamid64:
            ids_ordered.append(r.steamid64)
        else:
            skipped.append((tok, r.skip_reason or "Could not parse a 64-bit SteamID."))

    if not ids_ordered:
        rows_empty: list[dict[str, Any]] = []
        return format_vac_report_markdown(rows_empty, skipped, [])

    try:
        rows, api_warn = get_player_bans_for_ids(key, ids_ordered)
    except RuntimeError as err:
        return f"**Steam Web API error:** {err}\n\nCheck your key, network, and try again with fewer IDs."

    return format_vac_report_markdown(rows, skipped, api_warn)
