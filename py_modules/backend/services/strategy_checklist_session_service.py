"""Persist per-game Strategy checklist state across QAM close and plugin reload."""

from __future__ import annotations

import json
import os
import time
from typing import Any

SESSION_FILENAME = "strategy_checklist_session.json"
SCHEMA_VERSION = 1
NONE_APP_BUCKET = "__none__"
MAX_ITEMS = 12
MAX_TITLE_LEN = 120
MAX_LABEL_LEN = 200
MAX_APP_BUCKETS = 32


def session_path(settings_dir: str) -> str:
    return os.path.join(settings_dir, SESSION_FILENAME)


def _empty_store() -> dict[str, Any]:
    return {"version": SCHEMA_VERSION, "by_app_id": {}}


def _normalize_app_id(app_id: str | None) -> str:
    aid = (app_id or "").strip()
    return aid if aid else NONE_APP_BUCKET


def _normalize_items(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for i, item in enumerate(raw[:MAX_ITEMS]):
        if not isinstance(item, dict):
            continue
        iid = str(item.get("id", "") or "").strip()
        lab = str(item.get("label", "") or "").strip()
        if not lab:
            continue
        if not iid:
            iid = str(i + 1)
        out.append({"id": iid, "label": lab[:MAX_LABEL_LEN]})
    return out


def _normalize_checked_ids(raw: Any, valid_ids: set[str]) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for x in raw:
        cid = str(x or "").strip()
        if not cid or cid not in valid_ids or cid in seen:
            continue
        seen.add(cid)
        out.append(cid)
    return out


def sanitize_session_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    title = str(raw.get("title", "") or "").strip()
    if not title:
        return None
    items = _normalize_items(raw.get("items"))
    if len(items) < 2:
        return None
    valid_ids = {it["id"] for it in items}
    checked_ids = _normalize_checked_ids(raw.get("checked_ids"), valid_ids)
    app_name = str(raw.get("app_name", "") or "").strip()[:80]
    return {
        "app_name": app_name,
        "title": title[:MAX_TITLE_LEN],
        "items": items,
        "checked_ids": checked_ids,
        "updated_at": int(raw.get("updated_at") or time.time()),
    }


def sanitize_session_store(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return _empty_store()
    by_app: dict[str, Any] = {}
    src = raw.get("by_app_id")
    if isinstance(src, dict):
        for key, entry in list(src.items())[:MAX_APP_BUCKETS]:
            if not isinstance(key, str):
                continue
            bucket = _normalize_app_id(key)
            sanitized = sanitize_session_entry(entry)
            if sanitized is not None:
                by_app[bucket] = sanitized
    return {"version": SCHEMA_VERSION, "by_app_id": by_app}


def load_session_store(path: str, logger: Any = None) -> dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return sanitize_session_store(data)
    except FileNotFoundError:
        return _empty_store()
    except Exception as exc:
        if logger is not None:
            logger.warning("load_strategy_checklist_session: failed to read %s: %s", path, exc)
        return _empty_store()


def save_session_store(path: str, store: dict[str, Any], *, settings_dir: str, logger: Any = None) -> dict[str, Any]:
    sanitized = sanitize_session_store(store)
    try:
        os.makedirs(settings_dir, exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
        return sanitized
    except OSError as exc:
        if logger is not None:
            logger.exception("save_strategy_checklist_session: failed to write %s", path)
        raise RuntimeError(f"Failed to save strategy checklist session: {exc}") from exc


def get_session_entry(store: dict[str, Any], app_id: str | None) -> dict[str, Any] | None:
    bucket = _normalize_app_id(app_id)
    by_app = store.get("by_app_id")
    if not isinstance(by_app, dict):
        return None
    entry = by_app.get(bucket)
    return dict(entry) if isinstance(entry, dict) else None


def upsert_session_entry(
    store: dict[str, Any],
    *,
    app_id: str | None,
    app_name: str = "",
    title: str,
    items: list[dict[str, str]],
    checked_ids: list[str] | None = None,
) -> dict[str, Any]:
    base = sanitize_session_store(store)
    bucket = _normalize_app_id(app_id)
    norm_items = _normalize_items(items)
    if len(norm_items) < 2:
        return base
    valid_ids = {it["id"] for it in norm_items}
    checked = _normalize_checked_ids(checked_ids or [], valid_ids)
    entry = {
        "app_name": str(app_name or "").strip()[:80],
        "title": str(title or "").strip()[:MAX_TITLE_LEN],
        "items": norm_items,
        "checked_ids": checked,
        "updated_at": int(time.time()),
    }
    by_app = dict(base.get("by_app_id") or {})
    by_app[bucket] = entry
    if len(by_app) > MAX_APP_BUCKETS:
        # Drop oldest buckets by updated_at
        ordered = sorted(
            by_app.items(),
            key=lambda kv: int((kv[1] or {}).get("updated_at") or 0) if isinstance(kv[1], dict) else 0,
            reverse=True,
        )
        by_app = dict(ordered[:MAX_APP_BUCKETS])
    return {"version": SCHEMA_VERSION, "by_app_id": by_app}


def clear_session_entry(store: dict[str, Any], app_id: str | None = None) -> dict[str, Any]:
    base = sanitize_session_store(store)
    if app_id is None:
        return _empty_store()
    bucket = _normalize_app_id(app_id)
    by_app = dict(base.get("by_app_id") or {})
    by_app.pop(bucket, None)
    return {"version": SCHEMA_VERSION, "by_app_id": by_app}


def reset_session_file(path: str, settings_dir: str, logger: Any = None) -> None:
    try:
        os.remove(path)
    except FileNotFoundError:
        pass
    save_session_store(path, _empty_store(), settings_dir=settings_dir, logger=logger)


def rpc_entry_to_store_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize frontend RPC body into a session entry fragment."""
    if not isinstance(payload, dict):
        return None
    title = str(payload.get("title", "") or "").strip()
    items = payload.get("items")
    if not title or not isinstance(items, list):
        return None
    norm_items = _normalize_items(items)
    if len(norm_items) < 2:
        return None
    valid_ids = {it["id"] for it in norm_items}
    checked = _normalize_checked_ids(payload.get("checked_ids") or payload.get("checkedIds"), valid_ids)
    return {
        "app_name": str(payload.get("app_name") or payload.get("appName") or "").strip()[:80],
        "title": title[:MAX_TITLE_LEN],
        "items": norm_items,
        "checked_ids": checked,
        "updated_at": int(time.time()),
    }


def normalize_ask_checklist_state(raw: Any) -> dict[str, Any] | None:
    """Sanitize optional Ask payload checklist state for prompt injection."""
    if not isinstance(raw, dict):
        return None
    frag = rpc_entry_to_store_payload(raw)
    if frag is None:
        return None
    return {
        "title": frag["title"],
        "items": frag["items"],
        "checked_ids": frag["checked_ids"],
    }
