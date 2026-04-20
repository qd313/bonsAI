import json
import re
from typing import Optional, Tuple
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

# Open-weight (Tier 2+); midsize tags only for 16GB-friendly defaults.
_TEXT_OPEN_WEIGHT_SAFE = [
    "llama3:latest",
    "llama3",
    "gemma4:latest",
    "gemma4",
    "gemma3:latest",
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
_VISION_FOSS_SPEED = [
    "llava:7b",
    "llava:latest",
    "llava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]
_VISION_FOSS_STRATEGY = [
    "qwen2.5vl:latest",
    "qwen2.5vl",
    "llava:7b",
    "llava:latest",
    "llava",
]
_VISION_FOSS_DEEP = [
    "qwen2.5vl:latest",
    "qwen2.5vl",
    "llava:7b",
    "llava:latest",
    "llava",
]

_VISION_OPEN_WEIGHT_SAFE = [
    "gemma4:2b",
    "gemma4:4b",
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
    it continues to the next tag (see ``ask_ollama`` in ``main.py``).
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
    return base


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
