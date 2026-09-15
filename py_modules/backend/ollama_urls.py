"""Title: Turning what someone typed into a real Ollama address

Purpose: A person can type an Ollama address as almost anything -- just a port
number, "host:port", or a full web address. This file turns whatever was typed
(or nothing at all, which means "use the default") into one consistent host,
port and full address, and builds the two web addresses the plugin actually
calls: one to send a chat message, one to turn text into the numbers used for
search.
Used for: every place in the backend that needs to call Ollama, so they all
agree on what a person's typed-in address means, instead of each reading it
slightly differently.
Solves: without one shared way to read the address, "example.com" with no
port, "example.com:9999", and "http://example.com:9999" could each be
understood a little differently depending on which piece of code read them.
Does not: check whether the address actually reaches something running
Ollama -- it only builds the address, it never tries it. See
ollama_connectivity for whether an address is this same machine.
"""

from typing import Tuple
from urllib.parse import urlparse

from backend.constants import DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_PORT


def normalize_ollama_base(raw: str) -> Tuple[str, int, str]:
    """Normalize user-provided host input into host/port/base-url tuple values."""
    candidate = (raw or "").strip()
    if not candidate:
        return DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_PORT, f"http://{DEFAULT_OLLAMA_HOST}:{DEFAULT_OLLAMA_PORT}"

    if "//" not in candidate:
        candidate = f"http://{candidate}"
    parsed = urlparse(candidate)
    host = parsed.hostname or DEFAULT_OLLAMA_HOST
    port = parsed.port or DEFAULT_OLLAMA_PORT
    return host, port, f"http://{host}:{port}"


def build_ollama_chat_url(raw: str) -> str:
    """Build the /api/chat endpoint URL from a normalized Ollama base value."""
    _, _, base = normalize_ollama_base(raw)
    return f"{base}/api/chat"


def build_ollama_embed_url(raw: str) -> str:
    """Build the /api/embed endpoint URL from a normalized Ollama base value."""
    _, _, base = normalize_ollama_base(raw)
    return f"{base}/api/embed"
