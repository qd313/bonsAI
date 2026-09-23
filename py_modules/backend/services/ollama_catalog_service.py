"""Title: Checking a model name before downloading it

Purpose: On the Pull Models screen you can type the name of any Ollama model to download,
not just pick from the list the plugin already knows about. Before that download starts,
this file checks two things: does the name you typed even look like a valid model name,
and does a model by that name actually exist on Ollama's own public catalog. Both checks
happen before any real download begins, so a typo or a model that does not exist fails
fast with a clear reason instead of starting a download that can only fail later.
Used for: Checking a custom model name you type into Pull Models, and, before either an
automatic or a manual model download starts, splitting the requested names into the ones
the catalog confirms exist and the ones it does not recognise.
Solves: Doing this check safely -- a short timeout per name and an overall time limit, and
never reading more of the catalog's reply than a small fixed amount -- and falling back to
"assume it is fine" only when the catalog cannot be reached at all, rather than blocking a
download just because the network is briefly down.
Does not: Actually download or install a model, or manage the models already installed --
see pull_model_catalog_service for the list the Pull Models screen shows by default.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from typing import Any

from backend.tls_ca_fallback import urlopen_with_ca_fallback

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


def _fetch_manifest_size_bytes(name: str, variant: str) -> tuple[int | None, bool, bool]:
    """Return (size_bytes, exists, definite).

    ``definite`` is True whenever the registry itself gave a real answer -- either the manifest
    was found, or the registry said outright that it does not exist. Measured from this machine
    against registry.ollama.ai: a made-up library name and a real name with a made-up tag both
    come back HTTP 404. ``definite`` is False for everything that is NOT a real answer -- a
    network error, a timeout, a redirect off the registry host, some other HTTP status, or a
    reply that does not parse as a manifest -- because none of those tell "not real" apart from
    "could not check". See ``fetch_catalog_metadata``: only a definite answer counts as proof the
    registry was reachable at all.
    """
    url = f"{REGISTRY_BASE}/v2/library/{name}/manifests/{variant}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Accept": "application/vnd.docker.distribution.manifest.v2+json"},
    )
    try:
        with urlopen_with_ca_fallback(req, timeout=PER_REQUEST_TIMEOUT_S) as resp:
            host = (getattr(resp, "url", None) or url).split("/")[2] if resp else REGISTRY_HOST
            if host != REGISTRY_HOST:
                return None, False, False
            raw = resp.read(MAX_MANIFEST_BYTES + 1)
            if len(raw) > MAX_MANIFEST_BYTES:
                return None, False, False
            data = json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # 404 is what a missing repository or a missing tag on a real repository both return
        # (measured, see docstring). Any other status is not a status we have confirmed means
        # "not real", so it stays unknown rather than being treated as a refusal.
        return None, False, exc.code == 404
    except (urllib.error.URLError, json.JSONDecodeError, OSError, ValueError):
        return None, False, False

    layers = data.get("layers")
    if not isinstance(layers, list):
        return None, False, False
    total = 0
    for layer in layers:
        if not isinstance(layer, dict):
            continue
        try:
            total += int(layer.get("size") or 0)
        except (TypeError, ValueError):
            continue
    return total, True, True


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
        size_bytes, exists, definite = _fetch_manifest_size_bytes(name, variant)
        # A definite "no" from the registry is still proof it answered -- the registry was
        # reachable, it just does not have this name. Only "could not tell" should fall back to
        # offline (assume it is fine), not "the registry said no".
        if definite:
            any_live = True
        if exists and size_bytes is not None:
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
