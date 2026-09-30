"""Title: Failure replies for the streamed Ollama call

Purpose: When the one streamed call to Ollama goes wrong, the person sees a plain sentence
instead of a stack trace: "Request stopped", "Ollama returned HTTP 500", "Could not reach Ollama",
"Ollama did not respond within N seconds", and so on. This file builds those small result
dicts, so the streaming file can say "return the stopped reply" in one line instead of spelling
out the same dict in five places.

Used for: `ollama_chat_stream.py`, which returns one of these from each place its request can end
early or fail.

Solves: The same "stopped" dict was written out five times, and the failure wording made the
streaming file long enough to hide the actual streaming steps.

Does not: Decide when a failure happened, log anything, or retry. It only shapes the reply. Every
function returns a fresh dict each time, so a caller can add keys to it without touching another.
"""

import socket
from typing import Any

from backend.constants import OLLAMA_TAB_WHERE_AI_RUNS


def cancelled_reply() -> dict:
    """The reply for a request the person stopped: not a success, marked ``cancelled``."""
    return {
        "success": False,
        "response": "Request stopped (connection closed).",
        "cancelled": True,
    }


def http_error_reply(status: Any, body: str, model_name: str, thinking_unsupported: bool) -> dict:
    """The reply for an HTTP error status from Ollama.

    The error body is kept in ``body`` for the caller and the log; it is not copied into the
    sentence the person reads.
    """
    return {
        "success": False,
        "response": (
            f"Ollama returned HTTP {status} for model '{model_name}'. "
            "Check the host Ollama log; the full error body is not copied into the chat UI."
        ),
        "status": status,
        "body": body,
        "thinking_unsupported": thinking_unsupported,
    }


def url_error_reply(reason: Any, model_name: str, timeout_seconds: int) -> dict:
    """The reply for a connection that failed: a timeout while connecting, or no route to the host."""
    if isinstance(reason, (TimeoutError, socket.timeout)):
        return {
            "success": False,
            "response": (
                f"Ollama did not respond within {timeout_seconds} seconds. "
                "Check that Ollama is running and your PC IP is correct."
            ),
        }
    return {
        "success": False,
        "response": (
            f"Could not reach Ollama at the configured host for model '{model_name}'. "
            "Verify PC IP, firewall, and that Ollama is listening."
        ),
    }


def timed_out_reply(model_name: str, timeout_seconds: int) -> dict:
    """The reply for a request that connected but did not finish in time; marked ``timed_out``."""
    return {
        "success": False,
        "timed_out": True,
        "response": (
            f"Ollama did not finish within {timeout_seconds} seconds for model '{model_name}'. "
            "On Steam Deck this usually means inference is on CPU — configure Ollama to use the GPU, "
            f"or pull a smaller model in {OLLAMA_TAB_WHERE_AI_RUNS} (e.g. qwen2.5:1.5b for Speed mode)."
        ),
    }


def request_failed_reply(model_name: str) -> dict:
    """The reply for any other error: points the person at the plugin log, where the detail is."""
    return {
        "success": False,
        "response": f"Ollama request failed for model '{model_name}'. Check the Deck plugin log.",
    }
