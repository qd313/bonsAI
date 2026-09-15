"""Title: Telling local Ollama from a network one

Purpose: Ollama can run right on the Deck, or on another computer the Deck
reaches over the network. This file answers the two questions that come up
because of that: does a given address mean "this same machine", and if the
plugin ever needs to run the `ollama` program itself, where on disk is it.
Used for: deciding, before a request goes out, whether Ollama is local or
remote -- which changes how a connection problem is worded to the user; and
finding the `ollama` program on the Deck's disk when Decky's own list of
program folders does not include the place it is usually installed.
Solves: without this, "is this address the same machine" would be answered by
copied-and-pasted comparisons wherever it came up, and the Deck's usual
install location for `ollama` would need to be remembered in every place that
looks for it.
Does not: send anything over the network itself, or start or stop the Ollama
program -- it only works out which address to use and where the program is.
"""

import ipaddress
import os
import shutil
from typing import Optional
from urllib.parse import urlparse

from backend.constants import (
    DECK_OLLAMA_CLI_PATH,
    DEFAULT_OLLAMA_PCIP,
    LOOPBACK_HOSTNAMES,
)
from backend.ollama_urls import normalize_ollama_base


def is_loopback_ollama_host(host: str) -> bool:
    """True when ``host`` identifies the local Ollama machine (loopback or ``localhost``)."""
    h = (host or "").strip()
    if not h:
        return False
    try:
        return bool(ipaddress.ip_address(h).is_loopback)
    except ValueError:
        pass
    return h.casefold() == "localhost"


def is_loopback_ollama_base(base_http: str) -> bool:
    try:
        h = urlparse(base_http).hostname or ""
        return h in LOOPBACK_HOSTNAMES
    except Exception:
        return False


def ollama_http_base_from_pc_ip_field(pc_ip: str) -> str:
    """Resolve ``http://host:port`` used for Ollama API calls (same as chat URL base)."""
    raw = (pc_ip or "").strip() or DEFAULT_OLLAMA_PCIP
    _, _, base = normalize_ollama_base(raw)
    return base


def guess_ollama_cli_paths() -> list[str]:
    """PATH + typical install paths — Decky's Python PATH often misses ``~/.local/bin``."""
    out: list[str] = []
    seen: set[str] = set()

    def add(candidate: Optional[str]) -> None:
        if not candidate:
            return
        p = os.path.abspath(os.path.expanduser(candidate))
        if not os.path.isfile(p) or not os.access(p, os.X_OK):
            return
        if p in seen:
            return
        seen.add(p)
        out.append(p)

    add(shutil.which("ollama"))
    add(os.path.expanduser("~/.local/bin/ollama"))
    for fixed in (DECK_OLLAMA_CLI_PATH, "/usr/local/bin/ollama", "/usr/bin/ollama"):
        add(fixed)
    return out
