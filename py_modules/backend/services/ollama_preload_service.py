"""Title: Warming one small model before the first question

Purpose: At startup, before anyone has asked anything, this quietly loads one small,
already-installed model into Ollama's memory -- the same model Ask would actually reach for --
so the very first question of a session is not the one that pays to load a model from disk.

Used for: `preload_ask_model_sync()` is called once at boot. `pick_preload_model()` is the
decision it is built on -- which installed model is both small enough and the one Ask would
actually pick -- and is exported on its own so that decision can be tested without a network.

Solves: A boot-time warm that picks the wrong model is worse than no warm at all: it spends
memory loading something no question will touch and leaves the first real question exactly as
slow as before. This file keeps "which model" tied to Ask's own routing order.

Does not: Retry or poll. It runs once, at boot, and a missing host, no eligible model, or the
host declining the warm request are all silent no-ops on purpose -- this is a startup nicety,
never something the plugin should surface as broken.
"""

import json
import re
import urllib.request
from typing import Any, Optional

from backend.ollama_routing import resolve_routing_order
from backend.services.token_accounting_service import choose_window_tokens

# Boot-time preload (roadmap: Speed-mode VRAM preload, developer switch first) only ever warms a
# model at or under this size, so the switch can never accidentally load a big model at startup.
PRELOAD_MAX_PARAMETER_BILLIONS = 3.0


def parse_parameter_size_billions(raw: Any) -> Optional[float]:
    """Parse Ollama's ``details.parameter_size`` (``"3.8B"``, ``"893M"``) into billions of params.

    Anything that does not match returns ``None`` -- an unparsable or missing size is treated as
    unknown, never as "small enough", so preload never guesses at a model it cannot measure.
    """
    if not isinstance(raw, str):
        return None
    match = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([BM])\s*$", raw.strip(), re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    return value if match.group(2).upper() == "B" else value / 1000.0


def _installed_sizes(tags_models: Any) -> "dict[str, Optional[float]]":
    """Installed model name -> billions of parameters, or ``None`` when Ollama did not say."""
    out: "dict[str, Optional[float]]" = {}
    if not isinstance(tags_models, list):
        return out
    for entry in tags_models:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("model")
        if not isinstance(name, str) or not name.strip():
            continue
        details = entry.get("details")
        out[name] = (
            parse_parameter_size_billions(details.get("parameter_size"))
            if isinstance(details, dict)
            else None
        )
    return out


def pick_preload_model(tags_models: Any, try_order: Any = None) -> Optional[str]:
    """The model Ask will actually reach for, when it is small enough to be worth warming.

    **The try order decides which model; the size cap only decides whether to bother.** Warming
    *some* small model is worse than warming none: it spends memory on a model no question will
    touch and leaves the first question exactly as slow as before. Measured on the Deck
    2026-09-05 (PRELOAD-01): the only installed model under the cap was ``qwen2.5:1.5b`` at 1.5B,
    while Ask was routed to ``gemma4:e2b-it-qat`` at 4.6B. Picking "the first small one" would
    have loaded a model that never answers anything.

    So when Ask's first installed model is over ``PRELOAD_MAX_PARAMETER_BILLIONS``, the answer is
    ``None``. Warming nothing is the honest outcome of the roadmap's "models of 3B or under" —
    not warming something else instead.

    ``try_order`` is ``text_model_routing_order`` from settings. With none given (a fresh install
    that has never saved one) this falls back to the first small installed model, skipping
    embedding models: they are small enough to pass any cap and can never answer a question, so
    on this Deck the 137M ``nomic-embed-text`` would otherwise have been a candidate.

    A model whose size Ollama did not report is skipped rather than guessed at.
    """
    sizes = _installed_sizes(tags_models)
    if not sizes:
        return None

    def small_enough(name: str) -> bool:
        size_b = sizes.get(name)
        return size_b is not None and size_b <= PRELOAD_MAX_PARAMETER_BILLIONS

    if isinstance(try_order, list):
        for wanted in try_order:
            if not isinstance(wanted, str) or not wanted.strip():
                continue
            if wanted not in sizes:
                continue  # in the try order but not installed: Ask would fall through it too
            return wanted if small_enough(wanted) else None

    for name in sizes:
        if "embed" in name.lower():
            continue
        if small_enough(name):
            return name
    return None


def preload_ask_model_sync(
    base_http: str,
    logger: Any,
    *,
    timeout_seconds: float = 20.0,
    settings: Any = None,
) -> None:
    """Best-effort warm of a small installed model into Ollama's memory, once, at boot.

    Reads the installed model list from ``GET /api/tags``, picks the model Ask would actually reach
    for when it is at or under ``PRELOAD_MAX_PARAMETER_BILLIONS`` billion parameters
    (``pick_preload_model``), and sends a
    zero-token ``POST /api/generate`` (empty ``prompt``) -- Ollama's documented way to load a
    model into memory without generating anything.

    Never raises. A missing host, no eligible small model installed, or the host declining the
    warm request for lack of memory are all silent no-ops here on purpose: the roadmap entry
    calls for "skip silently -- no error, no toast, no stuck status line," because this is a
    startup nicety, never something the plugin should surface as broken. There is no retry and no
    polling loop behind this; the caller runs it once, at boot, and never again.
    """
    try:
        tags_req = urllib.request.Request(f"{base_http.rstrip('/')}/api/tags", method="GET")
        with urllib.request.urlopen(tags_req, timeout=min(5.0, timeout_seconds)) as resp:
            tags_data = json.loads(resp.read().decode("utf-8"))
        models_list = tags_data.get("models") if isinstance(tags_data, dict) else None
        # Ask's own resolver, so the warm-up and the Ask agree on which model comes first. It
        # covers the case a saved order cannot: an empty order (never set, which is the state on
        # a fresh install and was the state on the maintainer's Deck) still resolves to the
        # order Ask would build for itself from what is installed.
        try_order = None
        if isinstance(settings, dict):
            installed = [
                str(e.get("name") or e.get("model") or "")
                for e in (models_list or [])
                if isinstance(e, dict)
            ]
            try_order = resolve_routing_order(False, settings, [t for t in installed if t])
        model = pick_preload_model(models_list, try_order)
        if not model:
            logger.info("preload_ask_model: no eligible small model installed, skipping")
            return
        warm: dict[str, Any] = {"model": model, "prompt": ""}
        # Load it with the room Ask will ask for. Without num_ctx the server loads at its own
        # default (4,096 on the Deck), and the first Ask -- which asks for more -- reloads the
        # model: measured on the Deck (plan 64 flow H, PRELOAD-01), warm and cold both took 9.8 s
        # to first words, the journal showing a second load 2 s after the press. choose_window_tokens
        # remembers its answer per server and model for the session, so Ask gets the same number.
        window = choose_window_tokens(base_http, model, logger=logger)
        if window > 0:
            warm["options"] = {"num_ctx": window}
        body = json.dumps(warm).encode("utf-8")
        gen_req = urllib.request.Request(
            f"{base_http.rstrip('/')}/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(gen_req, timeout=timeout_seconds) as resp:
            resp.read()
        logger.info("preload_ask_model: warmed %s", model)
    except Exception as exc:
        logger.info("preload_ask_model: skipped (%s)", exc)
