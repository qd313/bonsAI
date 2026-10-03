"""Title: Which models a saved PC still has, for the saved try order

Purpose: The try order bonsAI saves is one list, used by whichever computer answers: this
Deck's own Ollama or a PC on the network. When a model is taken off the Deck, its name must
not leave that list if a PC the person also uses still has the same model, or the PC loses
the model's place the next time the AI is pointed there. This file asks the PCs the plugin
knows about which models they have, and says which names are safe to drop.
Used for: ollama_local_setup_rpc.py (after "ollama rm", and when the models list is read and
the Deck's own list no longer holds a saved name); `prune_orders_after_pc_listing()` is for the
moment the plugin lists a PC's models (see its note on what calls it).
Solves: Removing a model on the Deck dropped its name from both saved orders without asking
whether a PC had it too (roadmap Bugs, found by reading the code in plan 79).
Does not: Remove a model anywhere, and (apart from `prune_orders_after_pc_listing`) write the
saved order itself or talk to this Deck's own Ollama (the caller does). It cannot see a PC address that was only typed on the
Ollama tab: the plugin keeps that on the screen side, not in its settings, so only the saved
hosts (`named_ollama_hosts`) are asked.

How it works:
1. `saved_pc_hosts()` takes the saved hosts and leaves out any that point at this Deck itself
   or use https (the plugin speaks plain http only).
2. `tags_on_saved_pcs()` asks each one for `/api/tags` at the same time, each with a short
   time limit, and returns every model name any of them answered with. A PC that does not
   answer adds nothing: an unreachable PC proves nothing about what it has, so its names are
   not protected.

3. `prune_after_connection_test()` is what main.py's test_ollama_connection calls with each answer;
   `prune_orders_after_pc_listing()` is the clean-up for a model taken off a PC (the plugin cannot
   remove one there; it only sees the PC's list). Given a list a PC just answered with, it drops
   saved try-order names that neither that PC, this Deck's own Ollama, nor another saved PC has.

Gotchas:
- Never raises. Any failure reads as "that PC has nothing to say".
- A tag may be spelled `llama3` in the saved order and `llama3:latest` by Ollama; the match
  uses the same rule as the rest of the try-order code (`tag_in_names`).
"""

import asyncio
import logging
from typing import Any, Iterable

from backend.ollama_routing import prune_routing_orders_to_installed, tag_in_names
from backend.ollama_urls import is_https_ollama_address, normalize_ollama_base
from backend.services.local_ollama_setup_service import (
    DEFAULT_BASE,
    is_loopback_ollama_host,
    list_installed_ollama_tags,
)

logger = logging.getLogger("bonsai")

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



async def prune_orders_after_pc_listing(plugin: Any, pc_models: Iterable[str]) -> list[str]:
    """Drop saved try-order names a PC's fresh model list shows are gone, unless another machine has them.

    In: the plugin (for its settings and log) and the model names a PC answered with just now.
    Out: the names dropped (empty when nothing changed). An empty list prunes nothing: an
    unreachable PC reads the same as a PC with no models. This Deck's own Ollama and the other saved
    PCs are asked too, because the order is one list. When this Deck's own list cannot be read,
    nothing is pruned (a Deck-only name would otherwise be lost just because its Ollama was off). A download in progress on the Deck keeps its place. Never raises.
    """
    try:
        listed = [str(t).strip() for t in pc_models if str(t).strip()]
        if not listed:
            return []
        current = await plugin.load_settings()
        patch, pruned = prune_routing_orders_to_installed(current, listed)
        if not patch:
            return []
        deck = await _tags_of(DEFAULT_BASE)
        if not deck:
            # This Deck's own Ollama did not answer (off, unreachable, or nothing installed): a
            # name only the Deck holds cannot be told apart from a name gone everywhere, so keep all.
            return []
        others = await tags_on_saved_pcs(current)
        state = dict(getattr(plugin, "_local_ollama_setup_state", {}) or {})
        downloading: set[str] = set()
        if state.get("phase") == "running" and not state.get("done", True):
            downloading = {str(t).strip() for t in (state.get("pull_tags") or [])}
        patch, pruned = prune_routing_orders_to_installed(current, [*listed, *deck, *others], downloading)
        if not patch:
            return []
        await plugin.save_settings(patch)
        await plugin._maybe_app_log(
            "local_setup.routing_prune",
            "saved try order dropped models a PC no longer has",
            fields={"pruned": ",".join(pruned), "pc_model_count": len(listed)},
        )
        return pruned
    except Exception:
        logger.exception("pruning the saved try orders after a PC listing failed; they were left as they were")
        return []


async def prune_after_connection_test(plugin: Any, address: str, result: dict[str, Any]) -> list[str]:
    """Called with every connection-test answer: prune only for a reachable PC that listed models.

    The test also runs against this Deck's own Ollama (loopback), which is not a PC, so a loopback
    address is skipped. Never raises.
    """
    try:
        models = result.get("models") if isinstance(result, dict) else None
        if not (isinstance(result, dict) and result.get("reachable") and isinstance(models, list) and models):
            return []
        host, _port, _base = normalize_ollama_base(address)
        if is_loopback_ollama_host(host):
            return []
        return await prune_orders_after_pc_listing(plugin, models)
    except Exception:
        return []
