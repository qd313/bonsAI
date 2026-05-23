"""Proof-of-concept llama.cpp HTTP provider (maintainer / dev-gated only).

Not a shippable Ollama replacement. See ``docs/spikes/llama-cpp-provider.md``.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Optional

# OpenAI-compatible chat completions path used by many llama.cpp servers.
DEFAULT_LLAMA_CPP_CHAT_PATH = "/v1/chat/completions"


def llama_cpp_base_from_env() -> Optional[str]:
    """Read ``BONSAI_LLAMACPP_BASE`` from the environment (no hardcoded hosts)."""
    raw = (os.environ.get("BONSAI_LLAMACPP_BASE") or "").strip()
    return raw or None


def build_llama_cpp_chat_url(base: str) -> str:
    b = base.rstrip("/")
    return f"{b}{DEFAULT_LLAMA_CPP_CHAT_PATH}"


def parity_matrix() -> dict[str, str]:
    """Documented API parity vs the Ollama ``/api/chat`` path."""
    return {
        "chat_completions": "partial — OpenAI-style JSON, not Ollama NDJSON",
        "streaming": "unknown — POC uses non-streaming POST",
        "vision": "out of scope",
        "model_pull": "out of scope",
        "keep_alive": "n/a",
        "tdp_json_contract": "same prompt tail; apply path unchanged",
    }


def post_llama_cpp_chat_poc(
    base: str,
    model: str,
    messages: list,
    timeout_seconds: int,
    logger: Any,
) -> dict:
    """Single non-streaming completion for maintainer eval (env-gated in ``main.py``)."""
    url = build_llama_cpp_chat_url(base)
    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "max_tokens": 500,
        "temperature": 0.4,
    }
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        data = json.loads(raw)
        choices = data.get("choices") if isinstance(data, dict) else None
        text = ""
        if isinstance(choices, list) and choices:
            msg = choices[0].get("message") if isinstance(choices[0], dict) else {}
            if isinstance(msg, dict):
                text = str(msg.get("content") or "")
        return {
            "success": bool(text.strip()),
            "response": text.strip() or "No response text.",
            "model": model,
            "provider": "llama_cpp_poc",
        }
    except urllib.error.HTTPError as exc:
        body_txt = exc.read().decode("utf-8", errors="replace")[:600]
        logger.warning("llama_cpp_poc: HTTP %s %s", exc.code, body_txt[:200])
        return {
            "success": False,
            "response": f"llama.cpp request failed (HTTP {exc.code}).",
            "provider": "llama_cpp_poc",
        }
    except Exception as exc:
        logger.warning("llama_cpp_poc: %s", exc)
        return {
            "success": False,
            "response": "llama.cpp request failed. Check BONSAI_LLAMACPP_BASE and server logs.",
            "provider": "llama_cpp_poc",
        }
