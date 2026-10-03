"""Title: Which models a saved PC still has, for the saved try order

Purpose: The try order bonsAI saves is one list, used by whichever computer answers: this
Deck's own Ollama or a PC on the network. When a model is taken off the Deck, its name must
not leave that list if a PC the person also uses still has the same model, or the PC loses
the model's place the next time the AI is pointed there. This file asks the PCs the plugin
knows about which models they have, and says which names are safe to drop.
Used for: ollama_local_setup_rpc.py (after "ollama rm", and when the models list is read and
the Deck's own list no longer holds a saved name).
Solves: Removing a model on the Deck dropped its name from both saved orders without asking
whether a PC had it too (roadmap Bugs, found by reading the code in plan 79).
Does not: Remove a model anywhere or write the saved order itself, and never talks to this
Deck's own Ollama (the caller does). It cannot see a PC address that was only typed on the
Ollama tab: the plugin keeps that on the screen side, not in its settings, so only the saved
hosts (`named_ollama_hosts`) are asked.

How it works:
1. `saved_pc_hosts()` takes the saved hosts and leaves out any that point at this Deck itself
   or use https (the plugin speaks plain http only).
2. `tags_on_saved_pcs()` asks each one for `/api/tags` at the same time, each with a short
   time limit, and returns every model name any of them answered with. A PC that does not
   answer adds nothing: an unreachable PC proves nothing about what it has, so its names are
   not protected.

Gotchas:
- Never raises. Any failure reads as "that PC has nothing to say".
- A tag may be spelled `llama3` in the saved order and `llama3:latest` by Ollama; the match
  uses the same rule as the rest of the try-order code (`tag_in_names`).
"""

import asyncio
from typing import Any, Iterable

from backend.ollama_routing import tag_in_names
from backend.ollama_urls import is_https_ollama_address, normalize_ollama_base
from backend.services.local_ollama_setup_service import is_loopback_ollama_host, list_installed_ollama_tags

PC_LIST_TIMEOUT_SECONDS = 4.0
"""How long one PC gets to answer. A PC that is switched off must not stall a model removal."""


def saved_pc_hosts(settings: dict[str, Any], extra: Iterable[str] = ()) -> list[str]:
    """The base URLs of the PCs the plugin knows about, this Deck and https addresses left out."""
    raw: list[str] = [str(h).strip() for h in extra if str(h).strip()]
    named = settings.get("named_ollama_hosts")
    if isinstance(named, list):
        for item in named:
            if isinstance(item, dict) and str(item.get("host") or "").strip():
                raw.append(str(item["host"]).strip())
    bases: list[str] = []
    for address in raw:
        try:
            if is_https_ollama_address(address):
                continue
            host, _port, base = normalize_ollama_base(address)
        except Exception:
            continue
        if is_loopback_ollama_host(host) or base in bases:
            continue
        bases.append(base)
    return bases


async def _tags_of(base: str) -> list[str]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(lambda: list_installed_ollama_tags(base, PC_LIST_TIMEOUT_SECONDS)),
            timeout=PC_LIST_TIMEOUT_SECONDS + 1.0,
        )
    except Exception:
        return []


async def tags_on_saved_pcs(settings: dict[str, Any], extra: Iterable[str] = ()) -> set[str]:
    """Every model name any saved PC answered with (empty when none answered)."""
    bases = saved_pc_hosts(settings, extra)
    if not bases:
        return set()
    answers = await asyncio.gather(*(_tags_of(b) for b in bases))
    return {t.strip() for tags in answers for t in tags if t and t.strip()}

