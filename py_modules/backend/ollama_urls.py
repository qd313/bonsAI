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
Ollama -- it only builds the address, it never tries it. It also never turns
an https:// address into a plain http one behind the person's back: it refuses
it with a plain message instead (see OllamaAddressRefused). See
ollama_connectivity for whether an address is this same machine.
"""

from typing import Tuple
from urllib.parse import urlparse

from backend.constants import DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_PORT


HTTPS_NOT_SUPPORTED_MESSAGE = (
    "bonsAI can only talk to Ollama over http for now. Use an http:// address."
)
"""What a person is told when they type an https:// Ollama address. The screen shows the same
words (src/utils/ollamaAddress.ts), so the field and the back end never disagree."""


class OllamaAddressRefused(ValueError):
    """The typed address is one bonsAI will not use. ``str()`` is the plain message to show."""


def is_https_ollama_address(raw: str) -> bool:
    """True when the typed address starts with https:// (any case, leading spaces ignored)."""
    return (raw or "").strip().lower().startswith("https://")


def normalize_ollama_base(raw: str) -> Tuple[str, int, str]:
    """Normalize user-provided host input into host/port/base-url tuple values.

    Raises OllamaAddressRefused for an https:// address: the plugin only speaks plain http to
    Ollama, and quietly sending an "https" address as http would send the questions unencrypted
    to a server the person believed was secured.
    """
    candidate = (raw or "").strip()
    if is_https_ollama_address(candidate):
        raise OllamaAddressRefused(HTTPS_NOT_SUPPORTED_MESSAGE)
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
