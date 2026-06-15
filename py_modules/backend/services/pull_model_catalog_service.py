"""Fetch and cache the bonsAI Pull Models catalog overlay (living recommendations)."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from backend.services.ollama_catalog_service import OLLAMA_TAG_RE, is_valid_ollama_pull_tag

OVERLAY_REMOTE_URL = (
    "https://raw.githubusercontent.com/cantcurecancer/bonsAI/main/data/pull-model-catalog-overlay.json"
)
ALLOWED_HOSTS = frozenset({"raw.githubusercontent.com"})
MAX_JSON_BYTES = 262_144
FETCH_TIMEOUT_S = 8.0
CACHE_TTL_S = 7 * 24 * 3600
CACHE_DIR = Path.home() / ".bonsai" / "cache"
CACHE_FILE = CACHE_DIR / "pull_model_catalog_overlay.json"

VALID_GROUPS = frozenset({"essentials", "smallest", "stretch", "specialist"})
VALID_LICENSE = frozenset({"foss", "open_weight", "non_foss", "unknown"})
VALID_USE_TAGS = frozenset({"chat", "vision", "ocr", "strategy", "coding"})
RELEASED_YM_RE = re.compile(r"^\d{4}-\d{2}$")


def _empty_overlay() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "updated_at": None,
        "entries": [],
        "removed_tags": [],
        "overrides": {},
    }


def _validate_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    tag = str(raw.get("tag", "")).strip()
    if not is_valid_ollama_pull_tag(tag):
        return None
    params = str(raw.get("params", "")).strip()
    if not params:
        return None
    try:
        size_gb = float(raw.get("sizeGb"))
    except (TypeError, ValueError):
        return None
    if size_gb <= 0:
        return None
    released_ym = str(raw.get("releasedYm", "")).strip()
    if not RELEASED_YM_RE.fullmatch(released_ym):
        return None
    license_text = str(raw.get("license", "")).strip()
    if not license_text:
        return None
    license_class = str(raw.get("licenseClass", "")).strip()
    if license_class not in VALID_LICENSE:
        return None
    group = str(raw.get("group", "")).strip()
    if group not in VALID_GROUPS:
        return None
    tags_raw = raw.get("tags")
    if not isinstance(tags_raw, list) or not tags_raw:
        return None
    tags = [str(t).strip() for t in tags_raw if str(t).strip() in VALID_USE_TAGS]
    if not tags:
        return None
    try:
        rating = int(round(float(raw.get("rating", 0))))
    except (TypeError, ValueError):
        return None
    if rating < 1 or rating > 6:
        return None
    blurb = str(raw.get("blurb", "")).strip()
    if not blurb:
        return None
    return {
        "tag": tag,
        "params": params,
        "sizeGb": size_gb,
        "releasedYm": released_ym,
        "license": license_text,
        "licenseClass": license_class,
        "group": group,
        "tags": tags,
        "rating": rating,
        "blurb": blurb,
    }


def _sanitize_overlay_payload(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return _empty_overlay()
    entries_out: list[dict[str, Any]] = []
    for item in raw.get("entries") if isinstance(raw.get("entries"), list) else []:
        entry = _validate_entry(item)
        if entry:
            entries_out.append(entry)
    removed: list[str] = []
    for item in raw.get("removed_tags") if isinstance(raw.get("removed_tags"), list) else []:
        t = str(item).strip()
        if is_valid_ollama_pull_tag(t) and t not in removed:
            removed.append(t)
    overrides_out: dict[str, Any] = {}
    overrides_raw = raw.get("overrides")
    if isinstance(overrides_raw, dict):
        for tag, patch in overrides_raw.items():
            t = str(tag).strip()
            if not is_valid_ollama_pull_tag(t) or not isinstance(patch, dict):
                continue
            overrides_out[t] = patch
    updated_at = raw.get("updated_at")
    return {
        "schema_version": int(raw.get("schema_version") or 1),
        "updated_at": str(updated_at).strip() if updated_at else None,
        "entries": entries_out,
        "removed_tags": removed,
        "overrides": overrides_out,
    }


def _read_cache() -> dict[str, Any] | None:
    try:
        if not CACHE_FILE.is_file():
            return None
        raw = CACHE_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            return None
        return data
    except (OSError, json.JSONDecodeError, ValueError):
        return None


def _write_cache(overlay: dict[str, Any], fetched_at: int) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(
            json.dumps({"fetched_at": fetched_at, "overlay": overlay}, ensure_ascii=False),
            encoding="utf-8",
        )
    except OSError:
        pass


def _fetch_remote_overlay() -> tuple[dict[str, Any] | None, str]:
    req = urllib.request.Request(OVERLAY_REMOTE_URL, method="GET", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_S) as resp:
            host = (getattr(resp, "url", None) or OVERLAY_REMOTE_URL).split("/")[2]
            if host not in ALLOWED_HOSTS:
                return None, "host_not_allowed"
            raw = resp.read(MAX_JSON_BYTES + 1)
            if len(raw) > MAX_JSON_BYTES:
                return None, "payload_too_large"
            data = json.loads(raw.decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError, ValueError):
        return None, "fetch_failed"
    if not isinstance(data, dict):
        return None, "invalid_json"
    return _sanitize_overlay_payload(data), ""


def _response_from_overlay(
    overlay: dict[str, Any],
    *,
    source: str,
    error: str = "",
    fetched_at: int | None = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "error": error,
        "updated_at": overlay.get("updated_at"),
        "fetched_at": fetched_at,
        "entries": overlay.get("entries") or [],
        "removed_tags": overlay.get("removed_tags") or [],
        "overrides": overlay.get("overrides") or {},
    }


def fetch_pull_model_catalog(force: bool = False) -> dict[str, Any]:
    """Return overlay delta for frontend merge with bundled catalog."""
    now = int(time.time())
    cached = _read_cache()
    if not force and cached:
        fetched_at = cached.get("fetched_at")
        overlay = cached.get("overlay")
        if (
            isinstance(fetched_at, int)
            and now - fetched_at < CACHE_TTL_S
            and isinstance(overlay, dict)
        ):
            return _response_from_overlay(overlay, source="cached", fetched_at=fetched_at)

    remote, err = _fetch_remote_overlay()
    if remote is not None:
        _write_cache(remote, now)
        return _response_from_overlay(remote, source="live", fetched_at=now)

    if cached and isinstance(cached.get("overlay"), dict):
        fetched_at = cached.get("fetched_at")
        return _response_from_overlay(
            cached["overlay"],
            source="cached",
            error=err or "fetch_failed",
            fetched_at=fetched_at if isinstance(fetched_at, int) else None,
        )

    return _response_from_overlay(_empty_overlay(), source="bundled", error=err or "offline")
