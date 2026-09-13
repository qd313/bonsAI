"""Title: Ollama model routing

Purpose: Select Ollama model tags and fallback chains from settings and policy tiers.
Used for: Ask mode routing, essentials lists, and high-VRAM optional tails in main and services.
Solves: Centralized tag deduplication and tier-aware model pick logic for chat requests.
Does not: Call Ollama HTTP APIs or build prompts — see ollama_service and ollama_prompts.
"""

from typing import Any

from backend.constants import OLLAMA_TAB_WHERE_AI_RUNS


def _dedupe_preserve_order(tags: list[str]) -> list[str]:
    """Deduplicate Ollama model tags while keeping first occurrence order."""
    seen: set[str] = set()
    out: list[str] = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


# --- Essentials routing: one FOSS multimodal default, short tails for legacy + Tier 2 open-weight.
# Ask mode (speed/strategy/expert) differs by prompt and token budget only — not separate tag lists.
_TEXT_FOSS_ESSENTIALS = [
    "qwen2.5vl:3b",
    "qwen2.5:3b",
]

# Tier 2 one-model multimodal preset + long-tail open-weight fallbacks.
_TEXT_OPEN_WEIGHT_ESSENTIALS = [
    "gemma4:e2b-it-qat",
    "gemma4:e2b",
    "gemma4:latest",
]

# Appended only when Settings "high VRAM fallbacks" is on (may OOM or exceed 16GB depending on quant/host).
_TEXT_HIGH_VRAM_SPEED: list[str] = [
    "qwen2.5:32b",
]
_TEXT_HIGH_VRAM_STRATEGY: list[str] = [
    "qwen3.5:32b",
    "qwen2.5:32b",
    "gemma4:31b",
    "gemma3:27b",
]
_TEXT_HIGH_VRAM_DEEP: list[str] = [
    "qwen2.5:32b",
    "qwen3.5:32b",
    "gemma4:31b",
    "gemma3:27b",
]

_VISION_FOSS_ESSENTIALS = [
    "qwen2.5vl:3b",
    "qwen3.5:4b",
    "llava:7b",
]

_VISION_OPEN_WEIGHT_ESSENTIALS = [
    "gemma4:e2b-it-qat",
    "gemma4:e2b",
    "gemma3:4b",
]

_VISION_HIGH_VRAM_SPEED: list[str] = [
    "gemma4:31b",
    "gemma3:27b",
]
_VISION_HIGH_VRAM_STRATEGY: list[str] = [
    "gemma4:31b",
    "gemma3:27b",
    "qwen3.5:32b",
    "qwen3-vl",
    "qwen3-vl:30b-a3b",
]
_VISION_HIGH_VRAM_DEEP: list[str] = [
    "internvl3.5:38b",
    "internvl2.5:38b",
    "gemma4:31b",
    "gemma3:27b",
    "qwen3-vl",
    "qwen3-vl:30b-a3b",
    "qwen3.5:32b",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]

# Deck essentials — one Tier-1 FOSS multimodal pull. Keep in sync with README and deckEssentialsTags.ts.
TIER1_ESSENTIALS_PULL_TAGS = ("qwen2.5vl:3b",)

# Tier-2 one-model multimodal preset (registry may fall back to gemma4:e2b in setup service).
TIER2_MULTIMODAL_PULL_TAGS = ("gemma4:e2b-it-qat",)
TIER2_MULTIMODAL_PULL_FALLBACK_TAG = "gemma4:e2b"

# Tags moved to the tail of ``select_ollama_models`` chains (still tryable as last resort).
DEPRIORITIZED_OLLAMA_TAGS = frozenset(
    {
        "qwen2.5:1.5b",
        "qwen2.5:7b",
        "qwen2.5:14b",
        "qwen2.5:latest",
        "qwen2.5",
        "tinyllama",
        "orca-mini",
        "vicuna",
        "llava:7b",
        "llava:latest",
        "llava",
        "gemma3:4b",
        "gemma3:1b",
        "gemma3:latest",
        "gemma3:27b",
        "gemma4:31b",
        "qwen2.5:32b",
        "qwen3.5:32b",
        "qwen3-vl:30b-a3b",
        "internvl3.5:38b",
        "internvl2.5:38b",
        "llama3.2:3b",
        "llama3.2:1b",
        "llama3:latest",
        "llama3",
    }
)

# Omit from curated Pull Models catalog (manual ``ollama pull`` still allowed).
BLOCKED_PULL_CATALOG_TAGS = frozenset(
    {
        "qwen3-vl:30b-a3b",
        "internvl3.5:38b",
        "internvl2.5:38b",
    }
)

# Legacy small-chat families (any ``:tag`` variant).
_DEPRIORITIZED_OLLAMA_BASES = frozenset({"tinyllama", "orca-mini", "vicuna", "phi"})

_VALID_SETUP_PULL_PROFILES = frozenset(
    {"tier1_essentials", "tier2_multimodal", "update_installed"}
)


def ollama_tag_is_deprioritized(tag: str) -> bool:
    """True when a model tag should sort after safer FOSS/backbone tags in fallback chains."""
    t = (tag or "").strip().lower()
    if not t:
        return False
    if t in DEPRIORITIZED_OLLAMA_TAGS:
        return True
    base = t.split(":", 1)[0]
    return base in _DEPRIORITIZED_OLLAMA_BASES


def sort_models_deprioritized_last(tags: list[str]) -> list[str]:
    """Preserve order within primary and deprioritized groups; deprioritized tags trail the list."""
    primary: list[str] = []
    tail: list[str] = []
    for tag in tags:
        if ollama_tag_is_deprioritized(tag):
            tail.append(tag)
        else:
            primary.append(tag)
    return primary + tail


def setup_recommended_pull_tags(profile: str) -> list[str]:
    """Tags to ``ollama pull`` for local Deck essentials presets (see ``_VALID_SETUP_PULL_PROFILES``)."""
    prof = (profile or "").strip()
    if prof == "tier1_essentials":
        return list(TIER1_ESSENTIALS_PULL_TAGS)
    if prof == "tier2_multimodal":
        return list(TIER2_MULTIMODAL_PULL_TAGS)
    return []


def tier1_foss_recommended_pull_tags(profile: str) -> list[str]:
    """Deprecated alias — use ``setup_recommended_pull_tags``."""
    return setup_recommended_pull_tags(profile)


def is_valid_setup_pull_profile(profile: Any) -> bool:
    """True when ``profile`` is a recognized local-Ollama pull preset."""
    return isinstance(profile, str) and profile.strip() in _VALID_SETUP_PULL_PROFILES


def _text_safe_chain(mode: str) -> list[str]:
    del mode  # Ask mode differs by prompt only; same essentials chain for all modes.
    return _dedupe_preserve_order(_TEXT_FOSS_ESSENTIALS + _TEXT_OPEN_WEIGHT_ESSENTIALS)


def _vision_safe_chain(mode: str) -> list[str]:
    del mode
    return _dedupe_preserve_order(_VISION_FOSS_ESSENTIALS + _VISION_OPEN_WEIGHT_ESSENTIALS)


TEXT_MODELS_BY_MODE = {
    "speed": _text_safe_chain("speed"),
    "strategy": _text_safe_chain("strategy"),
    "expert": _text_safe_chain("expert"),
}
_VALID_ASK_MODES = frozenset(TEXT_MODELS_BY_MODE.keys())


def select_ollama_models(
    requires_vision: bool,
    ask_mode: str = "speed",
    high_vram_fallbacks: bool = False,
) -> list[str]:
    """Return shipped essentials chain (legacy/tests). User order uses ``resolve_routing_order``."""
    del high_vram_fallbacks  # High-VRAM gating lives in user routing order + settings toggle.
    mode = ask_mode if ask_mode in _VALID_ASK_MODES else "speed"
    base = _vision_safe_chain(mode) if requires_vision else _text_safe_chain(mode)
    return sort_models_deprioritized_last(base)


def is_ollama_model_missing_error(status: object, body: str) -> bool:
    """True when Ollama reports the requested model tag is not installed (try next fallback)."""
    if isinstance(status, int) and status == 404:
        return True
    b = (body or "").lower()
    if "not found" in b and "model" in b:
        return True
    if "does not exist" in b and "model" in b:
        return True
    return False


def filter_models_to_installed(
    models: list[str], installed: list[str]
) -> tuple[list[str], list[str]]:
    """Keep routing order but drop tags not present on the Ollama host (``/api/tags``)."""
    if not installed:
        return list(models), []
    inst = set(installed)
    matched = [m for m in models if m in inst]
    skipped = [m for m in models if m not in inst]
    return matched, skipped


HIGH_VRAM_SIZE_GB_THRESHOLD = 15.0
MAX_MODEL_ROUTING_ORDER_LEN = 16
HOST_FALLBACK_TAIL_CAP = 5

# Vision-capable hints for backend routing (UI uses pull catalog ``vision`` tag).
_VISION_TAG_SUBSTRINGS = ("llava", "vision", "vl", "internvl", "moondream", "bakllava")
_VISION_KNOWN_TAGS = frozenset(
    {
        "qwen2.5vl:3b",
        "qwen2.5vl",
        "qwen2.5vl:latest",
        "qwen3.5:4b",
        "llava:7b",
        "llava",
        "llava:latest",
        "gemma4:e2b-it-qat",
        "gemma4:e2b",
        "gemma3:4b",
        "qwen3-vl",
        "qwen3-vl:30b-a3b",
    }
)


def _all_known_high_vram_tags() -> frozenset[str]:
    tags: set[str] = set()
    for lst in (
        _TEXT_HIGH_VRAM_SPEED,
        _TEXT_HIGH_VRAM_STRATEGY,
        _TEXT_HIGH_VRAM_DEEP,
        _VISION_HIGH_VRAM_SPEED,
        _VISION_HIGH_VRAM_STRATEGY,
        _VISION_HIGH_VRAM_DEEP,
    ):
        tags.update(lst)
    return frozenset(tags)


_KNOWN_HIGH_VRAM_TAGS = _all_known_high_vram_tags()


def default_text_routing_seed() -> list[str]:
    """Shipped essentials order for text-only asks (mode-independent)."""
    return _text_safe_chain("speed")


def default_vision_routing_seed() -> list[str]:
    """Shipped essentials order for vision asks (mode-independent)."""
    return _vision_safe_chain("speed")


def is_high_vram_tag(tag: str, size_gb: float | None = None) -> bool:
    """True when tag is in maintainer heavy set or catalog size meets threshold."""
    t = (tag or "").strip()
    if not t:
        return False
    if t in _KNOWN_HIGH_VRAM_TAGS:
        return True
    if size_gb is not None and size_gb >= HIGH_VRAM_SIZE_GB_THRESHOLD:
        return True
    return False


def is_vision_capable_tag(tag: str) -> bool:
    """Best-effort vision membership for routing lists (unknown tags allowed with UI warn)."""
    t = (tag or "").strip().lower()
    if not t:
        return False
    if t in _VISION_KNOWN_TAGS:
        return True
    base = t.split(":", 1)[0]
    if base in _VISION_KNOWN_TAGS:
        return True
    return any(hint in t for hint in _VISION_TAG_SUBSTRINGS)


def build_initial_routing_order(requires_vision: bool, installed: list[str]) -> list[str]:
    """Defaults intersect installed on top, remaining installed appended (picker rule A)."""
    seed = default_vision_routing_seed() if requires_vision else default_text_routing_seed()
    inst = [t for t in installed if (t or "").strip()]
    inst_set = set(inst)
    head = [t for t in seed if t in inst_set]
    tail = [t for t in inst if t not in head]
    if requires_vision:
        tail = [t for t in tail if is_vision_capable_tag(t)]
    return _dedupe_preserve_order(head + tail)[:MAX_MODEL_ROUTING_ORDER_LEN]


def resolve_routing_order(
    requires_vision: bool,
    settings: dict[str, Any],
    installed: list[str],
    *,
    size_gb_by_tag: dict[str, float] | None = None,
) -> list[str]:
    """User-owned try order before model-policy filter; skips inactive high-VRAM when toggle off."""
    high_vram = settings.get("model_allow_high_vram_fallbacks") is True
    key = "vision_model_routing_order" if requires_vision else "text_model_routing_order"
    saved = settings.get(key)
    if isinstance(saved, list) and saved:
        order = [str(t).strip() for t in saved if str(t).strip()]
    else:
        order = build_initial_routing_order(requires_vision, installed)

    sizes = size_gb_by_tag or {}
    tryable: list[str] = []
    for tag in order:
        gb = sizes.get(tag)
        if not high_vram and is_high_vram_tag(tag, gb):
            continue
        tryable.append(tag)
    return _dedupe_preserve_order(tryable)[:MAX_MODEL_ROUTING_ORDER_LEN]


def merge_pulled_tag(
    order: list[str],
    tag: str,
    high_vram_enabled: bool,
    *,
    size_gb: float | None = None,
) -> list[str]:
    """Append pulled tag to bottom, or top when high-VRAM + toggle on."""
    t = (tag or "").strip()
    if not t:
        return list(order)
    base = [x for x in order if x != t]
    if high_vram_enabled and is_high_vram_tag(t, size_gb):
        merged = [t] + base
    else:
        merged = base + [t]
    return _dedupe_preserve_order(merged)[:MAX_MODEL_ROUTING_ORDER_LEN]


def remove_tag_from_routing_orders(settings: dict[str, Any], tag: str) -> dict[str, Any]:
    """Remove one tag from both text and vision routing lists."""
    t = (tag or "").strip()
    if not t:
        return settings
    out = dict(settings)
    for key in ("text_model_routing_order", "vision_model_routing_order"):
        cur = out.get(key)
        if isinstance(cur, list):
            out[key] = [x for x in cur if str(x).strip() != t]
    return out


def build_host_fallback_tail(user_chain: list[str], installed: list[str]) -> list[str]:
    """Remaining installed tags not in user chain, deprioritized, capped."""
    chain_set = set(user_chain)
    remaining = [t for t in installed if t not in chain_set]
    return sort_models_deprioritized_last(remaining)[:HOST_FALLBACK_TAIL_CAP]


def build_effective_models_to_try(
    models_after_policy: list[str],
    installed: list[str],
    *,
    user_chain_before_policy: list[str] | None = None,
) -> tuple[list[str], str]:
    """
    Prefer what is actually installed on the Ollama host.

    When ``/api/tags`` is known, never walk the full curated chain through missing tags —
    use installed chain matches first, then deprioritized host fallback tail (cap 5).
    """
    if not installed:
        return list(models_after_policy), "full_chain"

    inst = set(installed)
    in_chain = [m for m in models_after_policy if m in inst]
    if in_chain:
        return in_chain, "installed_in_policy_chain"

    chain_for_tail = (
        user_chain_before_policy if user_chain_before_policy is not None else models_after_policy
    )
    return build_host_fallback_tail(chain_for_tail, installed), "installed_host_fallback"


def no_installed_routing_models_message(installed: list[str], requires_vision: bool) -> str:
    """Actionable error when the host has models but none match the Ask routing chain."""
    kind = "vision " if requires_vision else ""
    if installed:
        shown = ", ".join(installed[:4])
        if len(installed) > 4:
            shown += f", +{len(installed) - 4} more"
        installed_clause = f"Installed on this host: {shown}. "
    else:
        installed_clause = "Ollama reports no installed models. "
    essential = "qwen2.5vl:3b"
    return (
        f"No {kind}model in bonsAI's routing list is installed on this Ollama host. "
        f"{installed_clause}"
        f"Open {OLLAMA_TAB_WHERE_AI_RUNS} and run Install Tier 1 essentials, or pull {essential} "
        "(one FOSS multimodal model for chat and screenshots). Tier 2 optional: gemma4:e2b-it-qat."
    )
