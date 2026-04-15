"""Append-only markdown notes under ~/Desktop/BonsAI_notes/ with path confinement."""

from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Optional

# Entries use UTC ISO-8601 timestamps (suffix Z) for deterministic, locale-independent logs.
_MAX_STEM_LEN = 80


def sanitize_note_stem(name: str) -> str:
    """Return a safe single path segment for a note file (no directories or traversal)."""
    raw = (name or "").strip()
    if not raw:
        raise ValueError("Note name is required.")
    if "/" in raw or "\\" in raw or "\x00" in raw:
        raise ValueError("Note name cannot contain path separators.")
    s = unicodedata.normalize("NFC", raw)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^\w\-.]+", "_", s, flags=re.UNICODE)
    s = s.strip("._-")
    if not s:
        raise ValueError("Note name is empty after sanitization.")
    if len(s) > _MAX_STEM_LEN:
        s = s[:_MAX_STEM_LEN]
    return s


def resolve_bonsai_notes_dir(home: str) -> str:
    """Return the absolute notes directory path: <home>/Desktop/BonsAI_notes."""
    base = (home or "").strip()
    if not base:
        raise ValueError("Home directory is not available.")
    return os.path.normpath(os.path.join(base, "Desktop", "BonsAI_notes"))


def _is_path_under(parent_real: str, child_candidate: str) -> bool:
    """True if child_candidate is parent_real or a path inside it (after realpath)."""
    parent_real = os.path.normcase(os.path.normpath(parent_real))
    child_real = os.path.normcase(os.path.normpath(child_candidate))
    try:
        common = os.path.commonpath([parent_real, child_real])
    except ValueError:
        return False
    return common == parent_real


def append_markdown_note(*, notes_dir: str, stem: str, question: str, response: str) -> dict[str, Any]:
    """
    Append a timestamped Q&A block to <stem>.md under notes_dir.

    Creates notes_dir if needed. Rejects paths that escape notes_dir (symlinks handled via realpath).
    """
    q = (question or "").strip()
    r = (response or "").strip()
    if not q:
        raise ValueError("Question text is required.")
    if not r:
        raise ValueError("Response text is required.")

    safe_stem = sanitize_note_stem(stem)
    os.makedirs(notes_dir, exist_ok=True)
    notes_real = os.path.realpath(notes_dir)
    target_path = os.path.normpath(os.path.join(notes_real, f"{safe_stem}.md"))
    if not _is_path_under(notes_real, target_path):
        raise ValueError("Resolved path escapes the notes directory.")
    target_real = os.path.realpath(target_path)
    if not _is_path_under(notes_real, target_real):
        raise ValueError("Resolved path escapes the notes directory.")

    ts = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    block = (
        f"\n## {ts}\n\n"
        f"### Question\n\n"
        f"{q}\n\n"
        f"### Response\n\n"
        f"{r}\n\n"
        f"---\n"
    )

    with open(target_path, "a", encoding="utf-8") as f:
        f.write(block)

    return {"ok": True, "path": target_path}


def append_desktop_debug_note_sync(
    home: str,
    stem: str,
    question: str,
    response: str,
) -> dict[str, Any]:
    """Sync entry point for plugin RPC; returns {ok, path} or {ok: False, error}."""
    try:
        notes_dir = resolve_bonsai_notes_dir(home)
        return append_markdown_note(
            notes_dir=notes_dir,
            stem=stem,
            question=question,
            response=response,
        )
    except (OSError, ValueError) as exc:
        return {"ok": False, "error": str(exc)}


def _daily_chat_stem_utc() -> str:
    """File stem for one chat log per UTC calendar day."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return sanitize_note_stem(f"bonsai-chat-{day}")


def _sanitize_screenshot_paths(raw: Any) -> list[str]:
    """Keep plain path strings only (no control characters)."""
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        s = item.strip()
        if not s or "\x00" in s:
            continue
        out.append(s)
    return out


def append_desktop_chat_event_sync(
    home: str,
    event: str,
    *,
    question: str = "",
    response_text: str = "",
    screenshot_paths: Optional[list[str]] = None,
) -> dict[str, Any]:
    """
    Append a single Ask or AI response block to the daily chat file (UTC day, append-only).

    event: "ask" | "response"
    """
    ev = (event or "").strip().lower()
    if ev not in ("ask", "response"):
        return {"ok": False, "error": "Invalid event type."}
    q = (question or "").strip()
    r = (response_text or "").strip()
    paths = _sanitize_screenshot_paths(screenshot_paths or [])

    try:
        notes_dir = resolve_bonsai_notes_dir(home)
        stem = _daily_chat_stem_utc()
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

        if ev == "ask":
            if not q:
                raise ValueError("Question text is required.")
            lines = [
                f"\n### Ask — {ts}\n\n",
                f"{q}\n\n",
            ]
            if paths:
                lines.append("**Attached screenshots:**\n\n")
                for p in paths:
                    lines.append(f"- `{p}`\n")
                lines.append("\n")
            lines.append("---\n")
            block = "".join(lines)
        else:
            if not r:
                raise ValueError("Response text is required.")
            block = (
                f"\n### AI response — {ts}\n\n"
                f"{r}\n\n"
                f"---\n"
            )

        os.makedirs(notes_dir, exist_ok=True)
        notes_real = os.path.realpath(notes_dir)
        target_path = os.path.normpath(os.path.join(notes_real, f"{stem}.md"))
        if not _is_path_under(notes_real, target_path):
            raise ValueError("Resolved path escapes the notes directory.")
        target_real = os.path.realpath(target_path)
        if not _is_path_under(notes_real, target_real):
            raise ValueError("Resolved path escapes the notes directory.")

        with open(target_path, "a", encoding="utf-8") as f:
            f.write(block)

        return {"ok": True, "path": target_path}
    except (OSError, ValueError) as exc:
        return {"ok": False, "error": str(exc)}
