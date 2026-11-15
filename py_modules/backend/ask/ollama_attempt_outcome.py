"""Title: Reading what one model attempt came back with

Purpose: Two small helpers for the Ask's walk down its list of models: one drops the raw HTTP body
from an attempt's result before it is handed back, and one says whether a failed attempt's body reads
like the graphics chip or memory running out, which is the one failure worth trying a smaller model for
when a picture is attached.
Used for: ollama_ask_service.run_ask_ollama, after every model attempt. Moved out of that file unchanged
(plan 104, lane G1) so it has room under its size limit.
Solves: Keeps the wording of "what counts as out of memory" in one place that can be tested without a
model call.
Does not: Decide whether to try the next model (run_ask_ollama does), call Ollama, or look at anything
but the text it is given.
"""
from __future__ import annotations

_OUT_OF_MEMORY_WORDS = (
    "out of memory",
    "failed to allocate",
    "resource exhausted",
    "cuda error",
    "vulkan",
)


def strip_ollama_http_body(payload: dict) -> dict:
    """A copy of ``payload`` without its ``body`` (the raw HTTP text), which the screen never needs."""
    out = dict(payload)
    out.pop("body", None)
    return out


def body_looks_out_of_memory(body: str) -> bool:
    """True when a failed attempt's ``body`` names memory or the graphics chip running out."""
    body_lower = body.lower()
    return any(s in body_lower for s in _OUT_OF_MEMORY_WORDS)
