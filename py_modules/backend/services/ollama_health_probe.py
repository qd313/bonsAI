"""Title: Is Ollama there, and what has it loaded

Purpose: Reads whether an Ollama host answers at all and, if so, what version it is running,
which models it has installed, and which of those are currently loaded into memory. This is
what backs the Connection panel's "is my PC reachable" check.

Used for: `probe_ollama_health()` is called by the Connection panel's RPC. The two smaller
helpers below it shape one loaded-model row each and are exported mainly so tests can check
that shaping on its own.

Solves: One place reads and shapes the three Ollama endpoints the Connection panel needs
(`/api/version`, `/api/tags`, `/api/ps`), so that shaping logic exists once instead of inline
in the RPC handler.

Does not: Decide what the Connection panel does with an unreachable host, or format anything
for display -- it hands back plain data and lets the caller decide.
"""

import json
import time
import urllib.request
from typing import Any, Optional


def vram_weight_share_pct(size_bytes: Any, size_vram_bytes: Any) -> Optional[float]:
    """Approximate share of a loaded model's weights that Ollama reports as GPU-visible.

    Ollama's /api/ps gives `size` (total) and `size_vram` (the part in VRAM). The ratio is a
    rough health signal, not an exact measurement — a model can report `size_vram > size`, which
    is clamped to 100% rather than treated as an error. Returns None when the total is unusable,
    which the UI renders as "unknown" rather than as 0%.
    """
    try:
        total = int(size_bytes or 0)
        in_vram = int(size_vram_bytes or 0)
    except (TypeError, ValueError):
        return None
    if total <= 0 or in_vram < 0:
        return None
    return round(100.0 * min(in_vram, total) / total, 1)


def _loaded_model_snapshots(ps_data: Any) -> list[dict[str, Any]]:
    """Shape /api/ps into the per-model rows the Connection panel shows.

    Deliberately not defensive per row: a malformed payload raises, and `probe_ollama_health`
    turns that into an empty list for the whole endpoint. That is the behavior this code had
    inline in the RPC, and it is the right one — a partly-parsed list of loaded models would be
    more misleading than none.
    """
    out: list[dict[str, Any]] = []
    for m in ps_data.get("models", []) or []:
        size_bytes = int(m.get("size") or 0)
        vram_bytes = int(m.get("size_vram") or 0)
        out.append(
            {
                "name": str(m.get("name") or m.get("model") or "?"),
                "size_bytes": size_bytes,
                "size_vram_bytes": vram_bytes,
                "vram_weight_share_pct_appx": vram_weight_share_pct(size_bytes, vram_bytes),
            }
        )
    return out


def probe_ollama_health(base: str, deadline: float) -> dict[str, Any]:
    """Read /api/version, /api/tags and /api/ps from an Ollama host.

    `deadline` is an absolute `time.time()` value; each request gets whatever is left of it, with
    a 0.25s floor so a already-expired deadline still makes one honest attempt rather than raising
    a confusing negative-timeout error.

    **Version and tags are required** — if either fails this raises, and the caller decides whether
    that means "unreachable" or "try starting the local runtime and retry". /api/ps is optional:
    older Ollama builds do not serve it, so a failure there yields an empty list rather than
    failing a host that is otherwise healthy.
    """
    ver_timeout = max(0.25, deadline - time.time())
    ver_req = urllib.request.Request(f"{base}/api/version", method="GET")
    ver_resp = urllib.request.urlopen(ver_req, timeout=ver_timeout)
    ver_data = json.loads(ver_resp.read().decode("utf-8"))
    version_local = ver_data.get("version", "unknown")

    tags_timeout = max(0.25, deadline - time.time())
    tags_req = urllib.request.Request(f"{base}/api/tags", method="GET")
    tags_resp = urllib.request.urlopen(tags_req, timeout=tags_timeout)
    tags_data = json.loads(tags_resp.read().decode("utf-8"))
    models_local = [m.get("name", "?") for m in tags_data.get("models", [])]

    ps_snapshots: list[dict[str, Any]] = []
    ps_timeout = max(0.25, deadline - time.time())
    try:
        ps_req = urllib.request.Request(f"{base}/api/ps", method="GET")
        ps_resp = urllib.request.urlopen(ps_req, timeout=ps_timeout)
        ps_snapshots = _loaded_model_snapshots(json.loads(ps_resp.read().decode("utf-8")))
    except Exception:
        ps_snapshots = []

    return {"version": version_local, "models": models_local, "ps_loaded": ps_snapshots}
