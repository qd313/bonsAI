"""Optional Tier-C thinking blurbs via a tiny local Ollama model (fire-and-forget)."""

from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request
from typing import Any, Optional

import decky

from refactor_helpers import normalize_ollama_base

logger = decky.logger

_TINY_THINKING_MODEL = "qwen2.5:1.5b"
_TINY_TIMEOUT_SECONDS = 2.5
_TINY_MAX_CHARS = 120


def _fetch_tiny_thinking_blurb(
    *,
    base_http: str,
    question: str,
    app_name: str,
) -> Optional[str]:
    snippet = (question or "").strip().replace("\n", " ")[:80]
    game = (app_name or "").strip()[:40]
    game_bit = f" (game: {game})" if game else ""
    prompt = (
        "Write one short playful pending-status line (under 100 chars, plain text, no markdown) "
        f"for someone waiting on an AI answer about: {snippet!r}{game_bit}. "
        "Reply with only that line."
    )
    url = f"{base_http.rstrip('/')}/api/generate"
    body = {
        "model": _TINY_THINKING_MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "options": {"num_predict": 48, "temperature": 0.7},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=_TINY_TIMEOUT_SECONDS) as resp:
            raw = resp.read(65536)
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    try:
        parsed = json.loads((raw or b"{}").decode("utf-8", errors="replace") or "{}")
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict) or parsed.get("error"):
        return None
    text = str(parsed.get("response") or "").strip().split("\n", 1)[0].strip()
    if not text:
        return None
    return text[:_TINY_MAX_CHARS]


def spawn_tiny_thinking_blurb(
    plugin: Any,
    request_id: int,
    *,
    question: str,
    app_name: str,
    pc_ip: str,
) -> None:
    """Fire-and-forget tiny-model status; never blocks the main Ask path."""

    async def _run() -> None:
        try:
            _, _, base = normalize_ollama_base(pc_ip)
            loop = asyncio.get_running_loop()
            blurb = await loop.run_in_executor(
                None,
                lambda: _fetch_tiny_thinking_blurb(
                    base_http=base, question=question, app_name=app_name
                ),
            )
            if not blurb:
                return
            active = plugin._active_request_id() if hasattr(plugin, "_active_request_id") else None
            if active != request_id:
                return
            if hasattr(plugin, "_publish_thinking_phase"):
                plugin._publish_thinking_phase(request_id, blurb)
        except Exception:
            logger.exception("spawn_tiny_thinking_blurb failed request_id=%s", request_id)

    try:
        asyncio.get_running_loop().create_task(_run())
    except RuntimeError:
        pass
