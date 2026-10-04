"""Title: Trimming the saved try order to what this Deck's Ollama still holds

Purpose: A model taken off the Deck outside the plugin (`ollama rm` in a terminal) never went
through the Remove button, so its name stayed in the saved try orders. This file holds the one
step that notices: given a read of the Deck's installed models, it drops the saved names that
neither the Deck nor a saved PC still has.
Used for: ollama_local_setup_rpc.py (`fetch_ollama_catalog_metadata`, every time the AI models
screen opens or refreshes), which hands in its own way of reading the Deck's models.
Solves: Moved out of ollama_local_setup_rpc.py unchanged so that file stays under its size limit.
Does not: Decide whether Ollama is the Deck's own (the caller has already checked), or remove any
model anywhere. The list reader is passed in, so tests that replace it in the caller still work.

How it works:
1. Read the Deck's installed models with the time limit below. An empty answer (Ollama off, a
   timeout, an empty store) proves nothing and changes nothing.
2. Models being downloaded right now keep their place.
3. Work out which saved names are missing from the Deck; only then ask the saved PCs (and the PC
   address the screen sends along). Keep any name one of them still has, and drop nothing at all
   while any of them gave no answer (the saved order is one list for whichever computer answers).
4. Save just the two order keys and log what was dropped. Never raises.
"""

import asyncio
import logging
from typing import Any, Callable

from backend.ollama_routing import prune_routing_orders_to_installed
from backend.services.local_ollama_setup_service import DEFAULT_BASE
from backend.services.ollama_pc_models import ask_known_pcs

logger = logging.getLogger("bonsai")

DECK_LIST_TIMEOUT_SECONDS = 8.0


async def prune_saved_orders_to_installed(
    plugin: Any, list_deck_tags: Callable[[str], list[str]], pc_ip: str = ""
) -> None:
    """Drop saved try-order entries for models no longer on this Deck's own Ollama.

    A model removed outside the plugin (`ollama rm` in a terminal, plan 76 row PULL-TRY-ORDER-01)
    never went through delete_ollama_model, so its tag stayed in the saved orders. The AI models
    screen reads the installed list every time it opens; this uses that read. It prunes only when
    the read answered with at least one model: an unreachable Ollama, a timeout and an empty
    store all come back as an empty list and change nothing. The caller has already checked that
    Ollama is the Deck's own, which is the Ollama this list belongs to. ``pc_ip`` is the PC address
    the screen holds (it is not in the settings), asked next to the saved hosts. Never raises.
    """
    try:
        installed = await asyncio.wait_for(
            asyncio.to_thread(lambda: list_deck_tags(DEFAULT_BASE)), timeout=DECK_LIST_TIMEOUT_SECONDS
        )
        if not installed:
            return
        # A download in progress is not installed yet and must not lose its place.
        st = dict(getattr(plugin, "_local_ollama_setup_state", {}) or {})
        downloading: set[str] = set()
        if st.get("phase") == "running" and not st.get("done", True):
            downloading = {str(t).strip() for t in (st.get("pull_tags") or [])}
        current = await plugin.load_settings()
        order_patch, pruned = prune_routing_orders_to_installed(current, installed, downloading)
        if order_patch:
            # Only now ask the saved PCs: a name one of them still has is not this Deck's to drop.
            pc_names, pc_silent = await ask_known_pcs(current, [str(pc_ip or "")])
            if pc_silent:
                # A known PC gave no answer: it might hold a name the Deck lacks, so drop nothing.
                await plugin._maybe_app_log(
                    "local_setup.routing_prune_skipped",
                    "saved try order left alone: a known PC did not answer",
                    fields={"would_prune": ",".join(pruned), "pc_unreachable": True},
                )
                return
            order_patch, pruned = prune_routing_orders_to_installed(current, [*installed, *pc_names], downloading)
        if not order_patch:
            return
        await plugin.save_settings(order_patch)
        await plugin._maybe_app_log(
            "local_setup.routing_prune",
            "saved try order dropped models that are not installed",
            fields={"pruned": ",".join(pruned), "installed_count": len(installed)},
        )
    except Exception:
        logger.exception("pruning the saved try orders failed; they were left as they were")
