"""Ollama model tag validation and registry metadata fetch for Pull Models UI."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from typing import Any

OLLAMA_TAG_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}(:[a-z0-9._-]{1,32})?$")
REGISTRY_HOST = "registry.ollama.ai"
REGISTRY_BASE = f"https://{REGISTRY_HOST}"
MAX_MANIFEST_BYTES = 1_048_576
PER_REQUEST_TIMEOUT_S = 5.0
TOTAL_WALL_CLOCK_S = 8.0


def is_valid_ollama_pull_tag(tag: Any) -> bool:
    if not isinstance(tag, str):
        return False
    t = tag.strip()
    if not t or len(t) > 96:
        return False
    return OLLAMA_TAG_RE.fullmatch(t) is not None


def normalize_ollama_pull_tags(raw: Any) -> list[str]:
    if not isinstance(raw, (list, tuple)):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        t = item.strip()
        if not is_valid_ollama_pull_tag(t) or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def split_ollama_tag(tag: str) -> tuple[str, str]:
    """Return (model_name, variant) for registry manifest URL."""
    if ":" in tag:
        name, variant = tag.split(":", 1)
        return name.strip(), variant.strip() or "latest"
    return tag.strip(), "latest"


def _fetch_manifest_size_bytes(name: str, variant: str) -> tuple[int | None, bool]:
    url = f"{REGISTRY_BASE}/v2/library/{name}/manifests/{variant}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Accept": "application/vnd.docker.distribution.manifest.v2+json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=PER_REQUEST_TIMEOUT_S) as resp:
            host = (getattr(resp, "url", None) or url).split("/")[2] if resp else REGISTRY_HOST
            if host != REGISTRY_HOST:
                return None, False
            raw = resp.read(MAX_MANIFEST_BYTES + 1)
            if len(raw) > MAX_MANIFEST_BYTES:
                return None, False
            data = json.loads(raw.decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError, ValueError):
        return None, False

    layers = data.get("layers")
    if not isinstance(layers, list):
        return None, False
    total = 0
    for layer in layers:
        if not isinstance(layer, dict):
            continue
        try:
            total += int(layer.get("size") or 0)
        except (TypeError, ValueError):
            continue
    return total, True


def fetch_catalog_metadata(tags: list[str]) -> dict[str, Any]:
    """Fetch live manifest sizes from registry.ollama.ai; offline on any failure."""
    started = time.monotonic()
    valid_tags = normalize_ollama_pull_tags(tags)
    if not valid_tags:
        return {"source": "offline", "error": "no_tags", "tags": {}, "fetched_at": None}

    results: dict[str, dict[str, Any]] = {}
    any_live = False
    last_error = ""

    for tag in valid_tags:
        if time.monotonic() - started > TOTAL_WALL_CLOCK_S:
            last_error = "timeout"
            break
        name, variant = split_ollama_tag(tag)
        if not is_valid_ollama_pull_tag(name) or not variant:
            continue
        size_bytes, exists = _fetch_manifest_size_bytes(name, variant)
        if exists and size_bytes is not None:
            any_live = True
            results[tag] = {"size_bytes": size_bytes, "exists": True}
        else:
            results[tag] = {"size_bytes": None, "exists": False}

    if not any_live:
        return {
            "source": "offline",
            "error": last_error or "registry_unavailable",
            "tags": results,
            "fetched_at": None,
        }

    return {
        "source": "live",
        "error": "",
        "tags": results,
        "fetched_at": int(time.time()),
    }


def partition_pull_tags_by_registry(tags: list[str]) -> tuple[list[str], list[str]]:
    """Split tags into registry-published vs missing manifest (offline → all valid)."""
    valid_tags = normalize_ollama_pull_tags(tags)
    if not valid_tags:
        return [], []
    meta = fetch_catalog_metadata(valid_tags)
    if meta.get("source") != "live":
        return valid_tags, []
    tag_meta = meta.get("tags") if isinstance(meta.get("tags"), dict) else {}
    ok: list[str] = []
    bad: list[str] = []
    for tag in valid_tags:
        entry = tag_meta.get(tag)
        if isinstance(entry, dict) and entry.get("exists"):
            ok.append(tag)
        else:
            bad.append(tag)
    return ok, bad
