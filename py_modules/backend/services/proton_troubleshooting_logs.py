"""Discover and read bounded Proton / Steam log excerpts for troubleshooting Ask context."""

from __future__ import annotations

import glob
import os
import re
import sys
from typing import Any, Optional

# Total UTF-8 payload budget for all attached excerpts (between header/footer wrappers).
TOTAL_LOG_BUDGET_BYTES = 96 * 1024
PER_FILE_TAIL_BYTES = 64 * 1024

_LINE_FILTER_RE = re.compile(
    r"(?i)(err|warn|fail|vk_|dxvk|vkd3d|wine|proton|assert|fatal)"
)

_ATTACHMENT_HEADER = (
    "--- Attached local log excerpts (bonsAI; Steam/Proton paths only; may be truncated) ---\n"
)
_ATTACHMENT_FOOTER = "\n--- End attached log excerpts ---"


def steam_roots_for_home(home: str) -> list[str]:
    """Common Steam installation roots for Linux (Deck layout)."""
    return [
        os.path.join(home, ".local", "share", "Steam"),
        os.path.join(home, ".steam", "steam"),
    ]


def path_allowed_for_proton_log(candidate_path: str, app_id: str, home: str) -> bool:
    """True if realpath is an allowed log file for this AppID (anti symlink-escape)."""
    aid = str(app_id or "").strip()
    if not aid.isdigit():
        return False
    try:
        rp = os.path.realpath(candidate_path)
    except OSError:
        return False
    if not os.path.isfile(rp):
        return False

    home_rp = os.path.realpath(os.path.expanduser(home))
    bn = os.path.basename(rp)
    parent_rp = os.path.realpath(os.path.dirname(rp))

    # ~/steam-<appid>.log only (PROTON_LOG=1 style).
    expected_home_log = f"steam-{aid}.log"
    if bn == expected_home_log and parent_rp == home_rp:
        return True

    # compatdata/<appid>/*.log — direct children only (no pfx walk).
    for root in steam_roots_for_home(home_rp):
        try:
            sr = os.path.realpath(root)
        except OSError:
            continue
        compat = os.path.realpath(os.path.join(sr, "steamapps", "compatdata", aid))
        if not compat.startswith(sr + os.sep):
            continue
        if parent_rp == compat and bn.endswith(".log"):
            return True

    return False


def read_file_tail_bytes(path: str, max_bytes: int) -> bytes:
    """Read up to ``max_bytes`` from the end of a file."""
    try:
        with open(path, "rb") as fp:
            fp.seek(0, os.SEEK_END)
            size = fp.tell()
            if size <= max_bytes:
                fp.seek(0)
                return fp.read()
            fp.seek(size - max_bytes)
            return fp.read()
    except OSError:
        return b""


def _maybe_filter_and_truncate(blob: str, budget_bytes: int) -> str:
    raw = blob.encode("utf-8", errors="replace")
    if len(raw) <= budget_bytes:
        return blob
    filtered_lines = [ln for ln in blob.splitlines() if _LINE_FILTER_RE.search(ln)]
    filtered = "\n".join(filtered_lines)
    raw_f = filtered.encode("utf-8", errors="replace")
    if len(raw_f) <= budget_bytes:
        return filtered
    return raw_f[-budget_bytes:].decode("utf-8", errors="replace")


def collect_proton_troubleshooting_logs(app_id: str, *, home: Optional[str] = None) -> dict[str, Any]:
    """Gather log tails for ``app_id`` when running on Linux under ``home``.

    Returns keys: ``text`` (system-prompt block or empty), ``sources``, ``warnings``.
    """
    warnings: list[str] = []
    sources: list[dict[str, Any]] = []

    if sys.platform != "linux":
        warnings.append("Proton log excerpts skipped: not Linux.")
        return {"text": "", "sources": sources, "warnings": warnings}

    expanded_home = os.path.expanduser(home or "~")
    aid = str(app_id or "").strip()
    if not aid.isdigit():
        warnings.append("Proton log excerpts skipped: no numeric Steam AppID.")
        return {"text": "", "sources": sources, "warnings": warnings}

    candidates: list[str] = []
    home_log = os.path.join(expanded_home, f"steam-{aid}.log")
    if os.path.isfile(home_log):
        candidates.append(home_log)

    compat_entries: list[tuple[str, float]] = []
    for steam_root in steam_roots_for_home(expanded_home):
        compat_dir = os.path.join(steam_root, "steamapps", "compatdata", aid)
        pattern = os.path.join(compat_dir, "*.log")
        try:
            for path in glob.glob(pattern):
                if os.path.isfile(path):
                    try:
                        compat_entries.append((path, os.path.getmtime(path)))
                    except OSError:
                        compat_entries.append((path, 0.0))
        except OSError:
            continue

    compat_entries.sort(key=lambda x: -x[1])
    for path, _mt in compat_entries:
        if path not in candidates:
            candidates.append(path)

    parts: list[str] = []
    budget_left = TOTAL_LOG_BUDGET_BYTES

    for cand in candidates:
        if budget_left <= 0:
            break
        if not path_allowed_for_proton_log(cand, aid, expanded_home):
            warnings.append(f"Skipped path outside allowlist: {cand}")
            continue
        chunk_budget = min(PER_FILE_TAIL_BYTES, budget_left)
        raw = read_file_tail_bytes(cand, chunk_budget)
        if not raw:
            continue
        text = raw.decode("utf-8", errors="replace")
        sources.append({"path": cand, "bytes_read": len(raw)})
        header = f"=== {os.path.basename(cand)} ({len(raw)} byte tail) ===\n"
        overhead = len(header.encode("utf-8"))
        if overhead >= budget_left:
            break
        body_budget = budget_left - overhead
        body_bytes = text.encode("utf-8")
        if len(body_bytes) > body_budget:
            body_bytes = body_bytes[-body_budget:]
            text = body_bytes.decode("utf-8", errors="replace")
        block = header + text
        parts.append(block)
        budget_left -= len(block.encode("utf-8"))

    blob = "\n\n".join(parts).strip()
    if not blob:
        warnings.append(
            "No Proton/Steam log files found for this AppID. "
            "Enable PROTON_LOG=1 for steam-<appid>.log in your home directory."
        )
        return {"text": "", "sources": sources, "warnings": warnings}

    trimmed = _maybe_filter_and_truncate(blob, TOTAL_LOG_BUDGET_BYTES)
    body = trimmed.strip()
    full_text = _ATTACHMENT_HEADER + body + _ATTACHMENT_FOOTER if body else ""
    return {"text": full_text, "sources": sources, "warnings": warnings}
