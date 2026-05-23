"""Local per-turn Ask feedback (JSONL); no network."""

from __future__ import annotations

import json
import os
import time
from typing import Any


def feedback_log_path(settings_dir: str) -> str:
    return os.path.join(settings_dir, "bonsai_feedback.jsonl")


def append_ask_feedback(
    settings_dir: str,
    *,
    request_id: int | None,
    rating: str,
    question_len: int,
    success: bool | None,
) -> dict[str, Any]:
    """Append one feedback line; ``rating`` is ``up``, ``down``, or ``clear``."""
    rating_norm = (rating or "").strip().lower()
    if rating_norm not in ("up", "down", "clear"):
        return {"ok": False, "error": "Invalid rating."}
    os.makedirs(settings_dir, exist_ok=True)
    path = feedback_log_path(settings_dir)
    row = {
        "ts": time.time(),
        "request_id": request_id,
        "rating": rating_norm,
        "question_len": max(0, int(question_len)),
        "success": success,
    }
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(row, separators=(",", ":")) + "\n")
        return {"ok": True}
    except OSError as exc:
        return {"ok": False, "error": str(exc)}
