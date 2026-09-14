"""Title: Ask payload reading

Purpose: Turn whatever the screen sent into the plain values the Ask path works with.
Used for: Both ways in -- the foreground ask and the background one -- read their payload
          through here, and the ask service sanitizes attachments through here.
Solves: The screen has sent the same field under several names over time (appId, PcIp and
        pcIp and pc_ip, askMode and ask_mode). Reading those variants is not the entry
        point's job, and doing it in one place keeps the two ways in identical.
Does not: Decide anything about the question, or talk to Ollama.

Lifted out of main.py on 2026-09-14 with the rules unchanged. It also holds the one
definition of what an ask mode is, because the reader needs it and two other files used
to reach back into the plugin class for it.
"""

from __future__ import annotations

import os
from typing import Any, Optional, Tuple

from backend.services.settings_service import sanitize_ask_mode
from backend.services.strategy_checklist_session_service import normalize_ask_checklist_state

# The three ways of asking. Kept here rather than on the plugin class because services
# need it and a service reaching back into the entry point is the thing this refactor is
# removing. main.py re-exports it, so Plugin.VALID_ASK_MODES still works.
VALID_ASK_MODES = {"speed", "strategy", "expert"}
DEFAULT_ASK_MODE = "speed"


def coerce_payload_bool(value: Any) -> bool:
    """True only for a real True or one of the three words the screen sends for it."""
    if value is True:
        return True
    if isinstance(value, str) and value.strip().lower() in ("true", "1", "yes"):
        return True
    return False


def sanitize_attachments(raw_attachments: Any) -> list:
    """Keep only valid attachment fields and discard malformed entries."""
    if not isinstance(raw_attachments, list):
        return []
    sanitized: list = []
    for raw in raw_attachments:
        if not isinstance(raw, dict):
            continue
        path = str(raw.get("path", "") or "").strip()
        if not path:
            continue
        name = str(raw.get("name", "") or "").strip()
        source = str(raw.get("source", "unknown") or "unknown").strip().lower()
        app_id = str(raw.get("app_id", "") or "").strip()
        sanitized.append(
            {
                "path": path,
                "name": name or os.path.basename(path),
                "source": source,
                "app_id": app_id,
            }
        )
    return sanitized


def parse_ask_payload(
    question: Any, PcIp: str
) -> Tuple[str, str, str, str, list, str, bool, Optional[dict], Optional[dict]]:
    """Normalize ask payload variants into canonical question/ip/context values."""
    app_id = ""
    app_name = ""
    attachments: list = []
    ask_mode_raw: Any = None
    spoiler_consent_raw: Any = None
    checklist_state_raw: Any = None
    reply_followup_raw: Any = None
    if isinstance(question, dict):
        payload = question
        question = payload.get("question", "")
        PcIp = payload.get("PcIp", payload.get("pcIp", payload.get("pc_ip", PcIp)))
        app_id = str(payload.get("appId", "") or "").strip()
        app_name = str(payload.get("appName", "") or "").strip()
        attachments = sanitize_attachments(payload.get("attachments", []))
        ask_mode_raw = payload.get("askMode", payload.get("ask_mode", ask_mode_raw))
        spoiler_consent_raw = payload.get("spoiler_consent", payload.get("spoilerConsent", spoiler_consent_raw))
        checklist_state_raw = payload.get(
            "strategy_checklist_state", payload.get("strategyChecklistState", checklist_state_raw)
        )
        reply_followup_raw = payload.get("reply_followup", payload.get("replyFollowup", reply_followup_raw))
    normalized_question = str(question or "").strip()
    normalized_pc_ip = str(PcIp or "").strip()
    ask_mode = sanitize_ask_mode(ask_mode_raw, VALID_ASK_MODES, DEFAULT_ASK_MODE)
    spoiler_consent = coerce_payload_bool(spoiler_consent_raw)
    strategy_checklist_state = normalize_ask_checklist_state(checklist_state_raw)
    from backend.services.ollama_prompts import sanitize_reply_followup

    reply_followup = sanitize_reply_followup(reply_followup_raw)
    return (
        normalized_question,
        normalized_pc_ip,
        app_id,
        app_name,
        attachments,
        ask_mode,
        spoiler_consent,
        strategy_checklist_state,
        reply_followup,
    )
