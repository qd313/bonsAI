import json
import re
from typing import Optional, Tuple
from urllib.parse import urlparse

DEFAULT_OLLAMA_HOST = "127.0.0.1"
DEFAULT_OLLAMA_PORT = 11434

TEXT_MODELS_TO_TRY = ["llama3:latest", "llama3", "gemma4:latest", "gemma4", "gemma3:latest"]
VISION_MODELS_TO_TRY = [
    "llava:latest",
    "llava",
    "bakllava:latest",
    "bakllava",
    "qwen2.5vl:latest",
    "qwen2.5vl",
    "moondream:latest",
    "moondream",
]


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


def select_ollama_models(requires_vision: bool) -> list[str]:
    """Return the ordered model fallback list for text or vision request paths."""
    return list(VISION_MODELS_TO_TRY if requires_vision else TEXT_MODELS_TO_TRY)


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
