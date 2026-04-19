import json
import re
from typing import Optional, Tuple
from urllib.parse import urlparse

DEFAULT_OLLAMA_HOST = "127.0.0.1"
DEFAULT_OLLAMA_PORT = 11434

TEXT_MODELS_TO_TRY = ["llama3:latest", "llama3", "gemma4:latest", "gemma4", "gemma3:latest"]

# Screenshot / vision model order per Ask mode (UI: Speed / Strategy / Expert).
# Tags are Ollama model names; the host tries each in order until one accepts the chat+images request.
# See docs/roadmap.md (vision preference + planned text preference work).
_VISION_SPEED = [
    "gemma4:2b",
    "gemma4:4b",
    "llava:7b",
    "llama3.2-vision",
    "llava:latest",
    "llava",
    "llama3.2-vision:latest",
]
_VISION_STRATEGY = [
    "gemma4:31b",
    "gemma3:27b",
    "qwen3.5:32b",
    "gemma4:4b",
    "gemma4:2b",
    "llama3.2-vision",
    "llama3.2-vision:latest",
    "llava:7b",
    "llava:latest",
    "llava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
]
_VISION_DEEP = [
    "internvl3.5:38b",
    "internvl2.5:38b",
    "gemma4:31b",
    "gemma3:27b",
    "qwen3-vl",
    "qwen3-vl:30b-a3b",
    "qwen2.5vl:latest",
    "qwen2.5vl",
    "llava:latest",
    "llava",
]

# Ordered fallbacks per Ask mode (main tab). Text lists unchanged here; vision uses mode-specific chains above.
TEXT_MODELS_BY_MODE = {
    "speed": TEXT_MODELS_TO_TRY,
    "strategy": [
        "gemma3:latest",
        "llama3:latest",
        "llama3",
        "gemma4:latest",
        "gemma4",
    ],
    "deep": [
        "gemma4:latest",
        "gemma4",
        "llama3:latest",
        "llama3",
        "gemma3:latest",
    ],
}
VISION_MODELS_BY_MODE = {
    "speed": _VISION_SPEED,
    "strategy": _VISION_STRATEGY,
    "deep": _VISION_DEEP,
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


def select_ollama_models(requires_vision: bool, ask_mode: str = "speed") -> list[str]:
    """Return the ordered model fallback list for text or vision paths and Ask mode."""
    mode = ask_mode if ask_mode in _VALID_ASK_MODES else "speed"
    if requires_vision:
        return list(VISION_MODELS_BY_MODE[mode])
    return list(TEXT_MODELS_BY_MODE[mode])


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
