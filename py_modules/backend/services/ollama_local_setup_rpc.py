"""Title: Installing AI models onto the Deck itself

Purpose: When the AI runs on the Deck rather than a PC, something has to install Ollama
there in the first place, pull the starter set of models, let a person pull more by
name, delete one, and price a model's download before it starts. This file is that: the
Deck-side installer and every RPC around pulling, deleting and pricing models. Each
stays a method of the same name on the plugin class in main.py; the method's body is
now a one-line hand-off to the function here.

Used for: start_local_ollama_setup, get_local_ollama_setup_status,
cancel_local_ollama_setup, pull_ollama_models, merge_pulled_tags_into_routing_orders,
delete_ollama_model, fetch_ollama_catalog_metadata, fetch_pull_model_catalog.

Solves: Keeps the Deck-side install/pull/delete machinery -- the one-at-a-time lock, the
background task, the try-order bookkeeping -- out of main.py.

Does not: Cover the two small autostart-toggle RPCs (apply_ollama_local_autostart,
get_ollama_local_autostart_status) -- those stay on the Plugin class itself because a
test patches the names main.py imports them under, and moving them would only be a
cosmetic win. Does not run `ollama pull`/`ollama rm` itself, or talk to the registry --
`local_ollama_setup_service.py`, `ollama_catalog_service.py` and
`pull_model_catalog_service.py` do that.
"""

import asyncio
from typing import Any

from backend.services.async_background_job import (
    make_local_ollama_setup_hooks,
    new_asyncio_cancel_event,
)
from backend.services.local_ollama_setup_service import (
    new_local_ollama_setup_state,
    run_local_setup,
    run_ollama_rm_async,
)
from backend.services.ollama_catalog_service import (
    fetch_catalog_metadata,
    is_valid_ollama_pull_tag,
    normalize_ollama_pull_tags,
)
from backend.ollama_routing import (
    is_valid_setup_pull_profile,
    is_vision_capable_tag,
    merge_pulled_tag,
    remove_tag_from_routing_orders,
)
from backend.services.pull_model_catalog_service import (
    fetch_pull_model_catalog as fetch_pull_model_catalog_service,
)

import decky

logger = decky.logger


async def start_local_ollama_setup(self, data: Any = None):
    """Install/start Ollama on this Linux host and pull Tier-1 FOSS tags (runs in background)."""
    prof = ""
    if isinstance(data, dict):
        prof = str(data.get("profile", data.get("Profile", "")) or "").strip()
    elif isinstance(data, str):
        prof = data.strip()
    settings = await self.load_settings()
    if not settings.get("ollama_local_on_deck"):
        out = {
            "accepted": False,
            "reason": "Enable «Ollama on this Deck» in Ollama → Where AI runs first.",
        }
        await self._maybe_app_log(
            "local_setup.start",
            "setup rejected",
            fields={"profile": prof, "accepted": False, "reason": "local_off"},
        )
        return out
    if not is_valid_setup_pull_profile(prof):
        out = {
            "accepted": False,
            "reason": 'Invalid profile: use "tier1_essentials", "tier2_multimodal", or "update_installed".',
        }
        await self._maybe_app_log(
            "local_setup.start",
            "setup rejected",
            fields={"profile": prof, "accepted": False, "reason": "invalid_profile"},
        )
        return out

    async with self._local_ollama_setup_lock:
        existing = self._local_ollama_setup_task
        if existing is not None and not existing.done():
            out = {"accepted": False, "reason": "Setup already running."}
            await self._maybe_app_log(
                "local_setup.start",
                "setup rejected",
                fields={"profile": prof, "accepted": False, "reason": "busy"},
            )
            return out

        self._local_ollama_cancel_event = new_asyncio_cancel_event()
        new_st = new_local_ollama_setup_state()
        new_st.update(
            {
                "phase": "running",
                "done": False,
                "error": "",
                "accepted": True,
                "profile": prof,
            }
        )
        self._local_ollama_setup_state = new_st

        setup_loop = asyncio.get_running_loop()
        on_stage, on_verbose_line = make_local_ollama_setup_hooks(self, setup_loop)

        async def runner() -> None:
            assert self._local_ollama_cancel_event is not None
            await run_local_setup(
                profile=prof,
                state=self._local_ollama_setup_state,
                logger=logger,
                cancel_event=self._local_ollama_cancel_event,
                on_stage=on_stage,
                on_verbose_line=on_verbose_line,
            )

        self._local_ollama_setup_task = asyncio.create_task(runner())

    await self._maybe_app_log(
        "local_setup.start",
        "setup accepted",
        fields={"profile": prof, "accepted": True},
    )
    return {"accepted": True}


async def get_local_ollama_setup_status(self):
    """Return last status for the local Ollama installer (plain JSON dict)."""
    return dict(self._local_ollama_setup_state)


async def cancel_local_ollama_setup(self):
    """Request cancellation of an in-progress setup (best-effort)."""
    ce = getattr(self, "_local_ollama_cancel_event", None)
    if isinstance(ce, asyncio.Event):
        ce.set()
    return {"cancel_requested": True}


async def _require_local_ollama_on_deck(self) -> tuple[bool, dict[str, Any] | None]:
    settings = await self.load_settings()
    if not settings.get("ollama_local_on_deck"):
        return False, {
            "accepted": False,
            "ok": False,
            "reason": "Enable «Ollama on this Deck» in Ollama → Where AI runs first.",
            "error": "local_off",
        }
    return True, None


async def _start_custom_ollama_pull(self, pull_tags: list[str]) -> dict[str, Any]:
    """Start downloading AI models onto the Deck itself.

    In: the list of model names the person picked. Out: a small dictionary
    saying whether the download was started, or why it was not.

    "Accepted" means started, not finished. Downloads are gigabytes and take
    many minutes, so this answers immediately and the screen watches the
    progress separately. The steps:

     1. Refuse unless running the AI on this Deck is switched on, since
        there is nowhere to put the models otherwise.
     2. Tidy the names, and refuse if nothing usable is left.
     3. Ask Ollama's library which of the names really exist. If none do,
        refuse and name a couple that would have worked -- a typed model
        name is the usual reason to be here.
     4. Only one download at a time: refuse as busy if one is running.
     5. Start it in the background and answer straight away.

    What can go wrong: if only SOME of the names are real, the bad ones are
    dropped, a note is written to the log, and the rest download anyway. The
    person is not told, so someone who mistypes one name of several gets a
    successful-looking download that quietly skips it.
    """
    ok_gate, gate_out = await _require_local_ollama_on_deck(self)
    if not ok_gate:
        return gate_out or {"accepted": False, "reason": "local_off"}

    tags = normalize_ollama_pull_tags(pull_tags)
    if not tags:
        return {"accepted": False, "reason": "No valid model tags to pull."}

    from backend.services.ollama_catalog_service import partition_pull_tags_by_registry

    registry_ok, registry_bad = await asyncio.to_thread(partition_pull_tags_by_registry, tags)
    if registry_bad and not registry_ok:
        bad_list = ", ".join(registry_bad[:6])
        return {
            "accepted": False,
            "reason": (
                f"Tag(s) not on Ollama library: {bad_list}. "
                "Try qwen2.5vl:3b or gemma4:e2b-it-qat."
            ),
            "error": "invalid_registry_tag",
            "invalid_tags": registry_bad,
        }
    if registry_bad:
        await self._maybe_app_log(
            "local_setup.start",
            "skipped invalid registry tags",
            fields={"invalid_tags": registry_bad[:12]},
        )
    tags = registry_ok

    async with self._local_ollama_setup_lock:
        existing = self._local_ollama_setup_task
        if existing is not None and not existing.done():
            return {"accepted": False, "reason": "Setup already running.", "error": "busy"}

        self._local_ollama_cancel_event = new_asyncio_cancel_event()
        new_st = new_local_ollama_setup_state()
        new_st.update(
            {
                "phase": "running",
                "done": False,
                "error": "",
                "accepted": True,
                "profile": "custom",
                "pull_tags": list(tags),
                "total_pull_steps": len(tags),
            }
        )
        self._local_ollama_setup_state = new_st

        setup_loop = asyncio.get_running_loop()
        on_stage, on_verbose_line = make_local_ollama_setup_hooks(self, setup_loop)

        async def runner() -> None:
            assert self._local_ollama_cancel_event is not None
            await run_local_setup(
                profile="custom",
                state=self._local_ollama_setup_state,
                logger=logger,
                cancel_event=self._local_ollama_cancel_event,
                on_stage=on_stage,
                on_verbose_line=on_verbose_line,
            )

        self._local_ollama_setup_task = asyncio.create_task(runner())

    await self._maybe_app_log(
        "local_setup.start",
        "custom pull accepted",
        fields={"profile": "custom", "accepted": True, "tag_count": len(tags)},
    )
    return {"accepted": True, "pull_tags": tags}


async def pull_ollama_models(self, tags: Any = None):
    """Pull one or more Ollama tags on this Deck (background, reuses setup service)."""
    raw = tags if isinstance(tags, list) else []
    return await _start_custom_ollama_pull(self, raw)


async def merge_pulled_tags_into_routing_orders(self, tags: Any = None):
    """Append newly pulled tags to the user's saved text/vision try orders."""
    pulled = normalize_ollama_pull_tags(tags if isinstance(tags, list) else [])
    if not pulled:
        return {"ok": False, "error": "no_tags", "merged": []}

    current = await self.load_settings()
    high_vram = current.get("model_allow_high_vram_fallbacks") is True
    saved_text = current.get("text_model_routing_order")
    saved_vision = current.get("vision_model_routing_order")
    text_order = list(saved_text) if isinstance(saved_text, list) else []
    vision_order = list(saved_vision) if isinstance(saved_vision, list) else []

    # An empty saved list means the user never set a try order, so
    # resolve_routing_order() derives one from installed models
    # (ollama_routing.py:366-370) and a just-pulled tag is already in it.
    # Writing a one-tag list here would replace that derived chain instead of
    # extending it, so empty orders are left alone.
    merged: list[str] = []
    for tag in pulled:
        changed = False
        if text_order:
            text_order = merge_pulled_tag(text_order, tag, high_vram)
            changed = True
        if vision_order and is_vision_capable_tag(tag):
            vision_order = merge_pulled_tag(vision_order, tag, high_vram)
            changed = True
        if changed:
            merged.append(tag)

    if not merged:
        reason = "defaults_in_use" if not text_order and not vision_order else "no_matching_order"
        return {
            "ok": True,
            "merged": [],
            "reason": reason,
            "text_model_routing_order": text_order,
            "vision_model_routing_order": vision_order,
        }

    saved = await self.save_settings(
        {
            "text_model_routing_order": text_order,
            "vision_model_routing_order": vision_order,
        }
    )
    await self._maybe_app_log(
        "local_setup.routing_merge",
        "pulled tags merged into routing order",
        fields={"merged": ",".join(merged)},
    )
    return {
        "ok": True,
        "merged": merged,
        "error": "",
        "text_model_routing_order": saved.get("text_model_routing_order", []),
        "vision_model_routing_order": saved.get("vision_model_routing_order", []),
    }


async def delete_ollama_model(self, tag: str = ""):
    """Remove one installed Ollama model via ``ollama rm`` (argv form)."""
    ok_gate, gate_out = await _require_local_ollama_on_deck(self)
    if not ok_gate:
        return gate_out or {"ok": False, "error": "local_off"}

    t = (tag or "").strip()
    if not is_valid_ollama_pull_tag(t):
        return {"ok": False, "error": "invalid_tag"}

    st = dict(getattr(self, "_local_ollama_setup_state", {}) or {})
    if st.get("phase") == "running" and not st.get("done", True):
        return {"ok": False, "error": "busy"}

    active = getattr(self, "_active_ollama_chat_model", None)
    if isinstance(active, str) and active.strip() and active.strip() == t:
        return {"ok": False, "error": "in_use", "removed": ""}

    ok_rm, err = await run_ollama_rm_async(t)
    if not ok_rm:
        safe_err = (err or "delete_failed")[:160]
        await self._maybe_app_log(
            "local_setup.delete",
            "ollama rm failed",
            fields={"ok": False, "error": safe_err},
        )
        return {"ok": False, "error": safe_err, "removed": ""}

    await self._maybe_app_log(
        "local_setup.delete",
        "ollama rm succeeded",
        fields={"ok": True},
    )
    # A removed model also leaves the saved try orders. remove_tag_from_routing_orders was
    # written for this and never called: on the Deck (plan 64 flow H) qwen2.5:1.5b was removed
    # through its row and the saved text order still read ['qwen2.5:1.5b'], so Ask's first
    # choice was a model no longer there. Only the two order keys are written.
    current = await self.load_settings()
    cleaned = remove_tag_from_routing_orders(current, t)
    order_patch = {
        key: cleaned[key]
        for key in ("text_model_routing_order", "vision_model_routing_order")
        if cleaned.get(key) != current.get(key)
    }
    if order_patch:
        await self.save_settings(order_patch)
    return {"ok": True, "removed": t, "error": ""}


async def fetch_ollama_catalog_metadata(self, tags: Any = None):
    """Live sizes from registry.ollama.ai with offline fallback metadata."""
    ok_gate, gate_out = await _require_local_ollama_on_deck(self)
    if not ok_gate:
        return {**(gate_out or {}), "source": "offline", "tags": {}}

    raw = tags if isinstance(tags, list) else []
    normalized = normalize_ollama_pull_tags(raw)
    try:
        out = await asyncio.wait_for(
            asyncio.to_thread(fetch_catalog_metadata, normalized),
            timeout=10.0,
        )
    except Exception:
        out = {"source": "offline", "error": "fetch_failed", "tags": {}, "fetched_at": None}
    return out


async def fetch_pull_model_catalog(self, opts: Any = None):
    """Living Pull Models overlay (remote JSON + disk cache) for frontend merge."""
    ok_gate, gate_out = await _require_local_ollama_on_deck(self)
    force = False
    if isinstance(opts, dict):
        force = bool(opts.get("force"))
    elif isinstance(opts, bool):
        force = opts
    if not ok_gate:
        return {
            **(gate_out or {}),
            "source": "bundled",
            "entries": [],
            "removed_tags": [],
            "overrides": {},
            "fetched_at": None,
            "updated_at": None,
        }
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(fetch_pull_model_catalog_service, force),
            timeout=12.0,
        )
    except Exception:
        return {
            "source": "bundled",
            "error": "fetch_failed",
            "entries": [],
            "removed_tags": [],
            "overrides": {},
            "fetched_at": None,
            "updated_at": None,
        }
