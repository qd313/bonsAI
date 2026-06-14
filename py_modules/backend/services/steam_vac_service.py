"""Steam Web API helpers for VAC / ban status lookups (GetPlayerBans)."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional

STEAM_API_GET_PLAYER_BANS = "https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/"
VAC_CACHE_TTL_SECONDS = 600.0
VAC_CACHE_MAX_ENTRIES = 256
STEAMID64_RE = re.compile(r"\b(7656119[0-9]{10})\b")
# Community profile numeric id in URL path
PROFILE_URL_RE = re.compile(r"(?i)steamcommunity\.com/profiles/(7656119[0-9]{10})")


@dataclass(frozen=True)
class ParsedSteamIdResult:
    """Result of parsing one user token into a 64-bit SteamID."""

    steamid64: Optional[str]
    skip_reason: Optional[str] = None


@dataclass(frozen=True)
class VacCacheEntry:
    expires_at: float
    player: dict[str, Any]


# Process-local TTL cache: dampens repeated GetPlayerBans traffic when users resend the same keyword Ask.
_vac_cache: dict[str, VacCacheEntry] = {}


def _cache_prune(now: float) -> None:
    if len(_vac_cache) <= VAC_CACHE_MAX_ENTRIES:
        return
    # Drop expired first, then oldest by arbitrary iteration order
    dead = [k for k, e in _vac_cache.items() if e.expires_at <= now]
    for k in dead:
        _vac_cache.pop(k, None)
    while len(_vac_cache) > VAC_CACHE_MAX_ENTRIES:
        _vac_cache.pop(next(iter(_vac_cache)), None)


def extract_steamid64_from_token(token: str) -> ParsedSteamIdResult:
    """
    Resolve one user-provided token to a 64-bit SteamID when possible.
    Supports bare 64-bit ids and standard profile URLs containing /profiles/765...
    """
    t = (token or "").strip()
    if not t:
        return ParsedSteamIdResult(None)

    low = t.casefold()
    if "/id/" in low or "steamcommunity.com/id/" in low:
        return ParsedSteamIdResult(
            None,
            skip_reason="Vanity URLs (/id/…) need ResolveVanityURL; paste the numeric /profiles/765… URL or 64-bit SteamID instead.",
        )

    m = PROFILE_URL_RE.search(t)
    if m:
        return ParsedSteamIdResult(m.group(1))

    m = STEAMID64_RE.search(t.replace(" ", ""))
    if m:
        return ParsedSteamIdResult(m.group(1))

    digits = "".join(ch for ch in t if ch.isdigit())
    if len(digits) == 17 and digits.startswith("7656119"):
        return ParsedSteamIdResult(digits)

    return ParsedSteamIdResult(None, skip_reason=f"Unrecognized SteamID format: {t[:48]}{'…' if len(t) > 48 else ''}")


def split_vac_query_body(body: str) -> list[str]:
    """Split comma- or whitespace-separated tokens from the Ask line after the command."""
    s = (body or "").strip()
    if not s:
        return []
    parts: list[str] = []
    for chunk in s.replace(",", " ").split():
        chunk = chunk.strip()
        if chunk:
            parts.append(chunk)
    return parts


def _fetch_bans_uncached(api_key: str, steamids: list[str], *, timeout_seconds: float = 18.0) -> dict[str, Any]:
    q = urllib.parse.urlencode({"key": api_key, "steamids": ",".join(steamids)})
    url = f"{STEAM_API_GET_PLAYER_BANS}?{q}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as he:
        code = he.code
        if code == 403:
            raise RuntimeError("Steam Web API returned 403 (check API key and domain allow-list on the key).") from he
        if code == 429:
            raise RuntimeError("Steam Web API rate-limited (429). Wait and try again with fewer IDs.") from he
        raise RuntimeError(f"Steam Web API HTTP error ({code}).") from he
    except urllib.error.URLError as err:
        raise RuntimeError(f"Network error calling Steam Web API: {err.reason!s}") from err
    try:
        return json.loads(raw)
    except json.JSONDecodeError as err:
        raise RuntimeError("Steam Web API returned non-JSON.") from err


def _players_by_id(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    players = payload.get("players")
    if not isinstance(players, list):
        return out
    for p in players:
        if isinstance(p, dict):
            sid = p.get("SteamId") or p.get("steamid")
            if isinstance(sid, str) and sid.isdigit():
                out[sid] = p
    return out


def get_player_bans_for_ids(
    api_key: str,
    steamid64_list: list[str],
    *,
    now: Optional[float] = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Return (rows for User-facing table, warning strings).
    Rows are ordered like steamid64_list; missing API rows are still listed with a note.
    """
    tnow = now if now is not None else time.time()
    _cache_prune(tnow)

    unique_ordered: list[str] = []
    seen: set[str] = set()
    for sid in steamid64_list:
        if sid not in seen:
            seen.add(sid)
            unique_ordered.append(sid)

    warnings: list[str] = []
    resolved: dict[str, dict[str, Any]] = {}
    to_fetch: list[str] = []

    for sid in unique_ordered:
        ent = _vac_cache.get(sid)
        if ent is not None and ent.expires_at > tnow:
            resolved[sid] = ent.player
        else:
            to_fetch.append(sid)

    batch_size = 90
    for i in range(0, len(to_fetch), batch_size):
        chunk = to_fetch[i : i + batch_size]
        payload = _fetch_bans_uncached(api_key, chunk)
        by_id = _players_by_id(payload)
        exp = tnow + VAC_CACHE_TTL_SECONDS
        for sid in chunk:
            pl = by_id.get(sid)
            if pl is None:
                resolved[sid] = {
                    "SteamId": sid,
                    "_bonsai_missing": True,
                }
                warnings.append(f"No ban row returned for SteamID {sid[-4:]}… (invalid id or API gap).")
            else:
                resolved[sid] = pl
                _vac_cache[sid] = VacCacheEntry(expires_at=exp, player=dict(pl))

    rows: list[dict[str, Any]] = []
    for sid in unique_ordered:
        rows.append(resolved.get(sid, {"SteamId": sid, "_bonsai_missing": True}))

    return rows, warnings


def format_vac_report_markdown(
    rows: list[dict[str, Any]],
    skipped_tokens: list[tuple[str, str]],
    api_warnings: list[str],
) -> str:
    """Build markdown for Main tab display with confidence / limitation copy."""
    lines: list[str] = [
        "**Steam ban status (GetPlayerBans)**",
        "",
        "> **Limitation:** This reflects **these Steam accounts only**. bonsAI does **not** prove someone was "
        "**your opponent** unless you copied their **verified** 64-bit SteamID (or trusted profile URL) yourself.",
        "",
    ]

    if skipped_tokens:
        lines.append("**Skipped inputs**")
        for tok, reason in skipped_tokens:
            lines.append(f"- `{tok[:64]}{'…' if len(tok) > 64 else ''}` — {reason}")
        lines.append("")

    if not rows:
        lines.append(
            "No valid SteamIDs to query from those tokens. Usage: `bonsai:vac-check 7656119…` (comma- or "
            "space-separated), or **steamcommunity.com/profiles/765…** URLs. Vanity `/id/…` links are not "
            "supported in this build."
        )
        return "\n".join(lines)

    lines.append("| SteamID (64) | VAC | #VAC | Game bans | Days since last ban | Community | Trade |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")

    for pl in rows:
        sid = str(pl.get("SteamId") or pl.get("steamid") or "")
        if pl.get("_bonsai_missing"):
            lines.append(f"| `{sid}` | — | — | — | — | — | — |")
            continue
        vac = pl.get("VACBanned")
        nvac = pl.get("NumberOfVACBans")
        ngame = pl.get("NumberOfGameBans")
        dsb = pl.get("DaysSinceLastBan")
        comm = pl.get("CommunityBanned")
        econ = pl.get("EconomyBan")
        lines.append(
            f"| `{sid}` | {vac} | {nvac} | {ngame} | {dsb} | {comm} | {econ} |"
        )

    if api_warnings:
        lines.append("")
        lines.append("**Notes**")
        for w in api_warnings:
            lines.append(f"- {w}")

    lines.extend(
        [
            "",
            "Interpret bans as **account-level history**, not proof of behavior in **this** match.",
        ]
    )
    return "\n".join(lines)
