"""Shared model-selection and Ollama URL normalization helpers used by ``main`` and backend services.

Keeps tier/mode tag lists in one place so Python tests and RPC routing stay consistent.
"""

import json
import re
from typing import Any, Optional, Tuple
from urllib.parse import urlparse

DEFAULT_OLLAMA_HOST = "127.0.0.1"
DEFAULT_OLLAMA_PORT = 11434


def _dedupe_preserve_order(tags: list[str]) -> list[str]:
    """Deduplicate Ollama model tags while keeping first occurrence order."""
    seen: set[str] = set()
    out: list[str] = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


# --- Text: FOSS-first (matches model_policy Tier 1 families), then open-weight fallbacks.
# Default chains target ~16GB VRAM at common Ollama quants; no 27B+ / 30B+ class in "safe" lists.
#
# Speed: smallest / lowest-latency FOSS first (fastest intent turnaround on modest GPUs).
_TEXT_FOSS_SPEED = [
    "qwen2.5:1.5b",
    "qwen2.5:3b",
    "qwen2.5:7b",
    "qwen2.5",
    "qwen2.5:latest",
]
# Strategy: rolling "latest" FOSS first, then stronger midsize FOSS fallbacks.
_TEXT_FOSS_STRATEGY = [
    "qwen2.5:latest",
    "qwen2.5:14b",
    "qwen2.5:7b",
    "qwen2.5",
    "qwen2.5:3b",
    "qwen2.5:1.5b",
]
# Expert: strongest FOSS that typically fits ~16GB before smaller FOSS (no :32b in safe list).
_TEXT_FOSS_DEEP = [
    "qwen2.5:14b",
    "qwen2.5:7b",
    "qwen2.5:latest",
    "qwen2.5",
    "qwen2.5:3b",
    "qwen2.5:1.5b",
]

# Open-weight (Tier 2+); prefer Pull Models catalog sizes before generic :latest tags.
_TEXT_OPEN_WEIGHT_SAFE = [
    "llama3.2:3b",
    "llama3.2:1b",
    "llama3:latest",
    "llama3",
    "gemma3:4b",
    "gemma3:1b",
    "gemma3:latest",
    "gemma4:latest",
    "gemma4",
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

# --- Vision: FOSS multimodal first (llava / qwen2.5vl / qwen3-vl small), then open-weight; 16GB-safe defaults.
# Strategy/Expert order matches Speed: try smaller FOSS VL models before heavier qwen2.5vl (Steam Deck / low VRAM).
_VISION_FOSS_SPEED = [
    "llava:7b",
    "llava:latest",
    "llava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]
_VISION_FOSS_STRATEGY = [
    "llava:7b",
    "llava:latest",
    "llava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]
_VISION_FOSS_DEEP = [
    "llava:7b",
    "llava:latest",
    "llava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]

_VISION_OPEN_WEIGHT_SAFE = [
    "gemma3:4b",
    "gemma4:latest",
    "gemma4",
    "llama3.2-vision:11b",
    "llama3.2-vision",
    "llama3.2-vision:latest",
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

# README-aligned minimal local pulls (text + multimodal Tier-1 FOSS). Keep in sync with README quick start.
TIER1_FOSS_STARTER_PULL_TAGS = (
    "qwen2.5:1.5b",
    "llava:7b",
)

# Tags moved to the tail of ``select_ollama_models`` chains (still tryable as last resort).
DEPRIORITIZED_OLLAMA_TAGS = frozenset(
    {
        "qwen2.5:1.5b",
        "tinyllama",
        "orca-mini",
        "vicuna",
        "llava:latest",
        "llava",
        "gemma3:27b",
        "gemma4:31b",
        "qwen2.5:32b",
        "qwen3.5:32b",
        "qwen3-vl:30b-a3b",
        "internvl3.5:38b",
        "internvl2.5:38b",
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

_VALID_SETUP_PULL_PROFILES = frozenset({"starter", "tier1_foss_full", "update_installed"})


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


def tier1_foss_recommended_pull_tags(profile: str) -> list[str]:
    """Tags to ``ollama pull`` for local Tier-1 FOSS-only setups (no open-weight/high-VRAM tails).

    ``starter`` matches README (small text + early vision FOSS tag). ``tier1_foss_full`` dedupes the union
    of ``_TEXT_FOSS_*`` and ``_VISION_FOSS_*`` chains so installs cover every Tier-1 FOSS fallback in
    ``select_ollama_models`` before Tier-2 open-weight alternatives.
    """
    prof = (profile or "").strip()
    if prof == "starter":
        return list(TIER1_FOSS_STARTER_PULL_TAGS)
    if prof == "tier1_foss_full":
        merged: list[str] = []
        for lst in (
            _TEXT_FOSS_SPEED,
            _TEXT_FOSS_STRATEGY,
            _TEXT_FOSS_DEEP,
            _VISION_FOSS_SPEED,
            _VISION_FOSS_STRATEGY,
            _VISION_FOSS_DEEP,
        ):
            merged.extend(lst)
        return _dedupe_preserve_order(merged)
    return []


def is_valid_setup_pull_profile(profile: Any) -> bool:
    """True when ``profile`` is a recognized local-Ollama pull preset."""
    return isinstance(profile, str) and profile.strip() in _VALID_SETUP_PULL_PROFILES


def _text_safe_chain(mode: str) -> list[str]:
    if mode == "speed":
        return _dedupe_preserve_order(_TEXT_FOSS_SPEED + _TEXT_OPEN_WEIGHT_SAFE)
    if mode == "strategy":
        return _dedupe_preserve_order(_TEXT_FOSS_STRATEGY + _TEXT_OPEN_WEIGHT_SAFE)
    if mode == "deep":
        return _dedupe_preserve_order(_TEXT_FOSS_DEEP + _TEXT_OPEN_WEIGHT_SAFE)
    return _dedupe_preserve_order(_TEXT_FOSS_SPEED + _TEXT_OPEN_WEIGHT_SAFE)


def _text_high_vram_tail(mode: str) -> list[str]:
    if mode == "speed":
        return list(_TEXT_HIGH_VRAM_SPEED)
    if mode == "strategy":
        return list(_TEXT_HIGH_VRAM_STRATEGY)
    if mode == "deep":
        return list(_TEXT_HIGH_VRAM_DEEP)
    return []


def _vision_safe_chain(mode: str) -> list[str]:
    if mode == "speed":
        return _dedupe_preserve_order(_VISION_FOSS_SPEED + _VISION_OPEN_WEIGHT_SAFE)
    if mode == "strategy":
        return _dedupe_preserve_order(_VISION_FOSS_STRATEGY + _VISION_OPEN_WEIGHT_SAFE)
    if mode == "deep":
        return _dedupe_preserve_order(_VISION_FOSS_DEEP + _VISION_OPEN_WEIGHT_SAFE)
    return _dedupe_preserve_order(_VISION_FOSS_SPEED + _VISION_OPEN_WEIGHT_SAFE)


def _vision_high_vram_tail(mode: str) -> list[str]:
    if mode == "speed":
        return list(_VISION_HIGH_VRAM_SPEED)
    if mode == "strategy":
        return list(_VISION_HIGH_VRAM_STRATEGY)
    if mode == "deep":
        return list(_VISION_HIGH_VRAM_DEEP)
    return []


TEXT_MODELS_BY_MODE = {
    "speed": _text_safe_chain("speed"),
    "strategy": _text_safe_chain("strategy"),
    "deep": _text_safe_chain("deep"),
}
VISION_MODELS_BY_MODE = {
    "speed": _vision_safe_chain("speed"),
    "strategy": _vision_safe_chain("strategy"),
    "deep": _vision_safe_chain("deep"),
}
_VALID_ASK_MODES = frozenset(TEXT_MODELS_BY_MODE.keys())


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


def select_ollama_models(
    requires_vision: bool,
    ask_mode: str = "speed",
    high_vram_fallbacks: bool = False,
) -> list[str]:
    """Return ordered Ollama model fallbacks. FOSS-first safe chains (~16GB); optional large-model tail.

    The Decky backend tries each name in order; if the host returns a missing-model style error,
    it continues to the next tag (see ``ask_ollama`` in ``main.py``). For screenshot asks, HTTP 500 / OOM-style
    responses also advance to the next vision tag so smaller FOSS models (e.g. ``llava:7b``) run before heavier VL tags.
    """
    mode = ask_mode if ask_mode in _VALID_ASK_MODES else "speed"
    if requires_vision:
        base = _vision_safe_chain(mode)
        if high_vram_fallbacks:
            base = _dedupe_preserve_order(base + _vision_high_vram_tail(mode))
    else:
        base = _text_safe_chain(mode)
        if high_vram_fallbacks:
            base = _dedupe_preserve_order(base + _text_high_vram_tail(mode))
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


def build_effective_models_to_try(
    models_after_policy: list[str],
    installed: list[str],
) -> tuple[list[str], str]:
    """
    Prefer what is actually installed on the Ollama host.

    When ``/api/tags`` is known, never walk the full curated chain through missing tags —
    use installed chain matches first, then any other installed tag as a host fallback
    (e.g. only ``gemma4:latest`` on Deck in Speed mode).
    """
    if not installed:
        return list(models_after_policy), "full_chain"

    inst = set(installed)
    in_chain = [m for m in models_after_policy if m in inst]
    if in_chain:
        return in_chain, "installed_in_policy_chain"

    return list(installed), "installed_host_fallback"


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
    starter = "llava:7b" if requires_vision else "qwen2.5:1.5b"
    return (
        f"No {kind}model in bonsAI's routing list is installed on this Ollama host. "
        f"{installed_clause}"
        f"Open Settings → Connection → Browse models and pull {starter} (recommended on Deck), "
        "or use local setup. Large models such as gemma4:latest often time out on CPU-only inference."
    )


def is_current_tdp_read_intent(question: str) -> bool:
    """True when the user wants to *read* the current TDP cap, not change or recommend one."""
    t = (question or "").strip().lower()
    if not t:
        return False
    if "tdp" not in t and "thermal design power" not in t:
        return False
    excl = (
        "recommend",
        "suggest",
        "set tdp",
        "set my tdp",
        "change ",
        "increase",
        "decrease",
        "lower my",
        "raise my",
        "cap at",
        "best tdp",
        "optimal tdp",
        "should i",
        "should i use",
        "optimize for",
    )
    if any(s in t for s in excl):
        return False
    if re.search(
        r"\b(what|how much)\b.{0,40}\b(tdp|watts?)\b",
        t,
    ) and "current" in t:
        return True
    if re.search(r"\b(what|how much)\b.{0,20}\b(current|the)\b.{0,20}\b(tdp|watts?)\b", t):
        return True
    if re.search(
        r"\b(current|read|right now|present|actual)\b.{0,30}\b(tdp|watts?)\b",
        t,
    ):
        return True
    if re.search(
        r"\b(tdp|watts?)\b.{0,20}\b(is|are|am i|we at|we running)\b",
        t,
    ):
        return True
    if re.search(r"\bwhat tdp (is|am|are|right now)\b", t) or re.search(r"\bhow much tdp\b", t):
        return True
    return "what's" in t and "tdp" in t


def parse_tdp_recommendation(
    text: str,
    tdp_min: int,
    tdp_max: int,
    gpu_min_mhz: int,
    gpu_max_mhz: int,
) -> Optional[dict]:
    """Parse and clamp TDP recommendations from JSON blocks or natural-language fallbacks."""
    rec = None

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not fenced:
        fenced = re.search(r'(\{\s*"tdp_watts"\s*:\s*\d+[^}]*\})', text, re.DOTALL)
    if fenced:
        try:
            rec = json.loads(fenced.group(1))
        except json.JSONDecodeError:
            rec = None

    if rec is None:
        natural = re.search(r"(?:tdp|TDP)\s*(?:to|of|at|:)?\s*(\d+)\s*(?:w|W|watts?)", text)
        if natural:
            rec = {"tdp_watts": int(natural.group(1))}

    if rec is None:
        return None

    tdp = rec.get("tdp_watts")
    gpu = rec.get("gpu_clock_mhz")
    if not isinstance(tdp, (int, float)):
        return None

    result: dict = {"tdp_watts": max(tdp_min, min(tdp_max, int(tdp)))}
    if isinstance(gpu, (int, float)):
        result["gpu_clock_mhz"] = max(gpu_min_mhz, min(gpu_max_mhz, int(gpu)))
    else:
        result["gpu_clock_mhz"] = None
    return result
