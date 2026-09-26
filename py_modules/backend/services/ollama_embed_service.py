"""Title: Ollama embed client

Purpose: Call Ollama /api/embed for knowledge-base hybrid retrieval vectors.
Used for: knowledge_base_service when nomic-embed-text or configured embed model is needed.
Solves: Model availability checks, HTTP embed requests, task-prefix formatting, and structured
    OllamaEmbedError raises.
Does not: Store vectors or query SQLite — only produces embedding arrays for callers.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from typing import Any

from backend.ollama_connectivity import ollama_http_base_from_pc_ip_field
from backend.ollama_urls import build_ollama_embed_url
from backend.services.knowledge_base_schema import DEFAULT_EMBEDDING_MODEL
from backend.services.local_ollama_setup_service import list_installed_ollama_tags


class OllamaEmbedError(Exception):
    """Raised when Ollama embedding fails or returns an invalid payload."""


# --- Task prefixes -------------------------------------------------------------------------
#
# nomic-embed-text is trained asymmetric: queries and documents go into different regions of
# the space unless each carries its task prefix. Omitting them is not a small quality loss —
# it is measuring a configuration the model was not trained for.
#
# This module is the ONLY owner of prefix logic. scripts/eval_kb_embed_models.py imports these
# rather than keeping its own copies: the eval applying prefixes while production did not is
# exactly how the 2026-07-31 bake-off ended up measuring something that was never shipped.
# Branching is by model family so the eval can sweep non-nomic models through one code path.


def format_embed_query(query: str, *, model: str = DEFAULT_EMBEDDING_MODEL) -> str:
    """Prefix a search query for ``model``'s query task. Empty input stays empty."""
    text = str(query or "")
    if not text.strip():
        return text
    m = str(model or "").strip().lower()
    if "nomic" in m:
        return f"search_query: {text}"
    if "mxbai" in m or "bge" in m:
        return f"Represent this sentence for searching relevant passages: {text}"
    if "qwen3-embedding" in m:
        return (
            "Instruct: Given a web search query, retrieve relevant passages that answer the query\n"
            f"Query:{text}"
        )
    if "arctic" in m or "snowflake" in m:
        return f"query: {text}"
    return text


def format_embed_document(text: str, *, model: str = DEFAULT_EMBEDDING_MODEL) -> str:
    """Prefix a corpus card for ``model``'s document task. Empty input stays empty."""
    body = str(text or "")
    if not body.strip():
        return body
    m = str(model or "").strip().lower()
    if "nomic" in m:
        return f"search_document: {body}"
    if "arctic" in m or "snowflake" in m:
        return f"passage: {body}"
    return body


def _model_tag_matches(tags: list[str], model: str) -> bool:
    model_l = str(model or "").strip().lower()
    if not model_l:
        return False
    for tag in tags:
        t = str(tag or "").strip().lower()
        if t == model_l or t.startswith(f"{model_l}:"):
            return True
    return False


# Availability is asked once per Ask and answered by an uncached /api/tags round trip with a
# 3s timeout — on a LAN host that is a visible stall before the model has been called at all.
# The answer only changes when someone installs or removes a model, so a short TTL costs
# nothing and a stale True is already handled: the embed call fails and retrieval degrades to
# keyword_embed_unavailable. Kept short so a fresh `ollama pull` is picked up quickly.
_AVAILABILITY_TTL_SECONDS = 30.0
_AVAILABILITY_LOCK = threading.Lock()
_AVAILABILITY_CACHE: dict[tuple[str, str], tuple[float, bool]] = {}


def reset_embed_availability_cache() -> None:
    """Drop cached availability. For tests and for paths that just changed installed models."""
    with _AVAILABILITY_LOCK:
        _AVAILABILITY_CACHE.clear()


def nomic_embed_available(
    pc_ip: str,
    *,
    model: str = DEFAULT_EMBEDDING_MODEL,
    timeout_seconds: float = 3.0,
) -> bool:
    """Return True when ``model`` is installed on the Ask Ollama host (no pull)."""
    base = ollama_http_base_from_pc_ip_field(pc_ip)
    key = (base, str(model or ""))
    now = time.monotonic()
    with _AVAILABILITY_LOCK:
        cached = _AVAILABILITY_CACHE.get(key)
        if cached is not None and now - cached[0] < _AVAILABILITY_TTL_SECONDS:
            return cached[1]

    tags = list_installed_ollama_tags(base, timeout_seconds=timeout_seconds)
    available = _model_tag_matches(tags, model)

    with _AVAILABILITY_LOCK:
        _AVAILABILITY_CACHE[key] = (time.monotonic(), available)
    return available


def embed_texts(
    pc_ip: str,
    texts: list[str],
    *,
    model: str = DEFAULT_EMBEDDING_MODEL,
    timeout_s: float = 3.0,
    base_http: str = "",
    keep_alive: str = "",
) -> list[list[float]]:
    """Embed one or more strings via ``POST /api/embed``. Raises ``OllamaEmbedError`` on failure.

    ``keep_alive`` is left out of the request body when not given (Ollama then falls back to
    its own 5-minute default) so callers that never had an opinion keep behaving exactly as
    before. Callers that do have one -- knowledge_base_service passes the same "Keep models
    loaded" duration the answer model gets -- keep the note-search model resident as long as
    the answer model, instead of it evicting after 5 minutes of no questions.
    """
    inputs = [str(t or "") for t in texts]
    if not inputs:
        return []
    url = build_ollama_embed_url(base_http or ollama_http_base_from_pc_ip_field(pc_ip))
    payload: dict[str, Any] = {"model": model, "input": inputs[0] if len(inputs) == 1 else inputs}
    if keep_alive:
        payload["keep_alive"] = keep_alive
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="replace")[:200]
        except Exception:
            pass
        raise OllamaEmbedError(f"HTTP {exc.code}: {detail or exc.reason}") from exc
    except Exception as exc:
        raise OllamaEmbedError(str(exc)) from exc

    if not isinstance(data, dict):
        raise OllamaEmbedError("embed response is not a JSON object")
    embeddings = data.get("embeddings")
    if not isinstance(embeddings, list) or len(embeddings) != len(inputs):
        raise OllamaEmbedError("embed response missing embeddings array")
    out: list[list[float]] = []
    for item in embeddings:
        if not isinstance(item, list) or not item:
            raise OllamaEmbedError("embed response contains invalid vector")
        out.append([float(x) for x in item])
    return out
