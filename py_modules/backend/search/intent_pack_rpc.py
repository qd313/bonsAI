"""Title: The settings-search-pack call the screen makes

Purpose: Hands the Settings search box the list of search packs (the extra words that let a
search find a setting by another name). `get_intent_packs` on the plugin class in main.py calls
the function here; the screen only reads the list, it has no panel to change it.

Used for: The one RPC the screen calls for packs: get_intent_packs.

Solves: Keeps this RPC body out of main.py.

Does not: Decide what a pack is or how it is stored on disk -- that is
`intent_pack_service.py`. This file only loads the store and calls that service.
"""

from backend.search.intent_pack_service import pack_summaries


async def get_intent_packs(self):
    """Return intent pack summaries and full entries for unified search indexing."""
    store = self._load_intent_pack_store()
    return {
        "schema_version": store.get("schema_version"),
        "summaries": pack_summaries(store),
        "packs": store.get("packs") or [],
    }
