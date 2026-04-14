import json
import os
from typing import Any, Callable


def clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    """Coerce an arbitrary value to int and clamp it to an inclusive range."""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def sanitize_unified_input_persistence_mode(
    value: Any,
    valid_modes: set[str],
    default_mode: str,
) -> str:
    """Validate persistence mode strings and fall back to the configured default."""
    if isinstance(value, str) and value in valid_modes:
        return value
    return default_mode


def sanitize_screenshot_max_dimension(
    value: Any,
    valid_dimensions: set[int],
    default_dimension: int,
) -> int:
    """Validate screenshot dimension values against the explicit allowed dimension set."""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default_dimension
    if parsed in valid_dimensions:
        return parsed
    return default_dimension


def sanitize_settings(
    data: Any,
    default_latency_warning_seconds: int,
    default_request_timeout_seconds: int,
    min_latency_warning_seconds: int,
    max_latency_warning_seconds: int,
    min_request_timeout_seconds: int,
    max_request_timeout_seconds: int,
    valid_persistence_modes: set[str],
    default_persistence_mode: str,
    valid_screenshot_dimensions: set[int],
    default_screenshot_dimension: int,
) -> dict:
    """Normalize the full settings payload into a bounded, backend-safe settings object."""
    raw = data if isinstance(data, dict) else {}
    return {
        "latency_warning_seconds": clamp_int(
            raw.get("latency_warning_seconds"),
            default_latency_warning_seconds,
            min_latency_warning_seconds,
            max_latency_warning_seconds,
        ),
        "request_timeout_seconds": clamp_int(
            raw.get("request_timeout_seconds"),
            default_request_timeout_seconds,
            min_request_timeout_seconds,
            max_request_timeout_seconds,
        ),
        "unified_input_persistence_mode": sanitize_unified_input_persistence_mode(
            raw.get("unified_input_persistence_mode"),
            valid_persistence_modes,
            default_persistence_mode,
        ),
        "screenshot_max_dimension": sanitize_screenshot_max_dimension(
            raw.get("screenshot_max_dimension"),
            valid_screenshot_dimensions,
            default_screenshot_dimension,
        ),
    }


def load_settings(path: str, sanitize_func: Callable[[Any], dict], logger: Any) -> dict:
    """Read settings from disk and return a sanitized settings object on every path."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            logger.warning("load_settings: expected object in %s, got %s", path, type(data).__name__)
            return sanitize_func({})
        return sanitize_func(data)
    except FileNotFoundError:
        return sanitize_func({})
    except Exception as exc:
        logger.warning("load_settings: failed to read %s: %s", path, exc)
        return sanitize_func({})


def save_settings(
    path: str,
    settings_dir: str,
    incoming: Any,
    current: dict,
    sanitize_func: Callable[[Any], dict],
    logger: Any,
) -> dict:
    """Persist merged settings and return the sanitized payload that was written."""
    payload = incoming if isinstance(incoming, dict) else {}
    merged = {**current, **payload}
    sanitized = sanitize_func(merged)
    try:
        os.makedirs(settings_dir, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(sanitized, f, indent=2, sort_keys=True)
        return sanitized
    except Exception as exc:
        logger.exception("save_settings: failed to write %s", path)
        raise RuntimeError(f"Failed to save settings: {exc}") from exc
