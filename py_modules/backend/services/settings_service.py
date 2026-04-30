import json
import os
from typing import Any, Callable

from backend.services.ai_character_service import (
    sanitize_ai_character_accent_intensity,
    sanitize_ai_character_custom_text,
    sanitize_ai_character_enabled,
    sanitize_ai_character_preset_id,
    sanitize_ai_character_random,
)
from backend.services.capabilities import legacy_grandfather_capabilities, sanitize_capabilities
from backend.services.model_policy import reconcile_model_policy_tier


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


def sanitize_ask_mode(
    value: Any,
    valid_modes: set[str],
    default_mode: str,
) -> str:
    """Validate main-tab Ask mode strings and fall back to the configured default."""
    if isinstance(value, str) and value in valid_modes:
        return value
    return default_mode


def sanitize_desktop_debug_note_auto_save(value: Any) -> bool:
    """Only explicit true enables daily chat auto-save."""
    return value is True


def sanitize_desktop_ask_verbose_logging(value: Any) -> bool:
    """Only explicit true enables verbose Ask trace append to Desktop notes."""
    return value is True


def sanitize_attach_proton_logs_when_troubleshooting(value: Any) -> bool:
    """Only explicit true attaches local Proton/Steam log excerpts on troubleshooting-style Asks."""
    return value is True


def sanitize_preset_chip_fade_animation_enabled(value: Any) -> bool:
    """Staggered preset-chip fades are on unless the user explicitly saves ``false``."""
    return value is not False


def sanitize_input_sanitizer_user_disabled(value: Any) -> bool:
    """Only explicit ``true`` means the user disabled the sanitizer lane (keyword command)."""
    return value is True


def sanitize_show_debug_tab(value: Any) -> bool:
    """Only explicit ``true`` shows the Debug tab; default is hidden."""
    return value is True


def sanitize_ollama_local_on_deck(value: Any) -> bool:
    """Explicit ``true`` routes Ask to localhost Ollama; omitted / ``None`` defaults off (LAN field applies)."""
    if value is None:
        return False
    return value is True


def sanitize_model_allow_high_vram_fallbacks(value: Any) -> bool:
    """Only explicit ``true`` appends large-model tails to Ollama fallback chains."""
    return value is True


REQUEST_TIMEOUT_RECONCILE_STEP_SECONDS = 10

OLLAMA_KEEP_ALIVE_OPTIONS = frozenset(
    {
        "0s",
        "15s",
        "30s",
        "1m",
        "2m",
        "3m",
        "5m",
        "15m",
        "30m",
        "45m",
        "60m",
        "120m",
        "240m",
    }
)
DEFAULT_OLLAMA_KEEP_ALIVE = "5m"


def sanitize_ollama_keep_alive(value: Any) -> str:
    """Validate Ollama keep_alive duration tokens and fall back to the plugin default."""
    if isinstance(value, str) and value in OLLAMA_KEEP_ALIVE_OPTIONS:
        return value
    return DEFAULT_OLLAMA_KEEP_ALIVE


def _reconcile_latency_warning_before_timeout(
    latency: int,
    timeout: int,
    *,
    min_latency: int,
    max_latency: int,
    max_timeout: int,
) -> tuple[int, int]:
    """Ensure latency warning is strictly less than request timeout (matches frontend)."""
    if latency < timeout:
        return latency, timeout
    t = timeout
    while latency >= t and t < max_timeout:
        t = min(max_timeout, t + REQUEST_TIMEOUT_RECONCILE_STEP_SECONDS)
    if latency < t:
        return latency, t
    w = latency
    while w >= t and w > min_latency:
        w -= 5
    if w >= t:
        w = max(min_latency, min(max_latency, t - 5))
    return w, t


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


def sanitize_latency_timeouts_custom_enabled(value: Any) -> bool:
    """Only explicit true lets stored warning/timeout values apply to Ollama and UI (defaults when false)."""
    return value is True


def resolve_screenshot_attachment_preset(data: Any, default_preset: str) -> str:
    """Prefer screenshot_attachment_preset; map legacy screenshot_max_dimension when absent."""
    if not isinstance(data, dict):
        return default_preset
    p = data.get("screenshot_attachment_preset")
    if isinstance(p, str) and p in ("low", "mid", "max"):
        return p
    dim = data.get("screenshot_max_dimension")
    try:
        di = int(dim)
    except (TypeError, ValueError):
        return default_preset
    if di == 1920:
        return "mid"
    if di == 3160:
        return "max"
    return "low"


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
    valid_ask_modes: set[str],
    default_ask_mode: str,
) -> dict:
    """Normalize the full settings payload into a bounded, backend-safe settings object."""
    raw = data if isinstance(data, dict) else {}
    latency = clamp_int(
        raw.get("latency_warning_seconds"),
        default_latency_warning_seconds,
        min_latency_warning_seconds,
        max_latency_warning_seconds,
    )
    timeout = clamp_int(
        raw.get("request_timeout_seconds"),
        default_request_timeout_seconds,
        min_request_timeout_seconds,
        max_request_timeout_seconds,
    )
    latency, timeout = _reconcile_latency_warning_before_timeout(
        latency,
        timeout,
        min_latency=min_latency_warning_seconds,
        max_latency=max_latency_warning_seconds,
        max_timeout=max_request_timeout_seconds,
    )
    mp_tier, mp_unlock = reconcile_model_policy_tier(
        raw.get("model_policy_tier"), raw.get("model_policy_non_foss_unlocked")
    )
    screenshot_attachment_preset = resolve_screenshot_attachment_preset(raw, "low")
    return {
        "latency_warning_seconds": latency,
        "request_timeout_seconds": timeout,
        "latency_timeouts_custom_enabled": sanitize_latency_timeouts_custom_enabled(
            raw.get("latency_timeouts_custom_enabled")
        ),
        "unified_input_persistence_mode": sanitize_unified_input_persistence_mode(
            raw.get("unified_input_persistence_mode"),
            valid_persistence_modes,
            default_persistence_mode,
        ),
        "screenshot_attachment_preset": screenshot_attachment_preset,
        "desktop_debug_note_auto_save": sanitize_desktop_debug_note_auto_save(
            raw.get("desktop_debug_note_auto_save")
        ),
        "desktop_ask_verbose_logging": sanitize_desktop_ask_verbose_logging(
            raw.get("desktop_ask_verbose_logging")
        ),
        "attach_proton_logs_when_troubleshooting": sanitize_attach_proton_logs_when_troubleshooting(
            raw.get("attach_proton_logs_when_troubleshooting")
        ),
        "preset_chip_fade_animation_enabled": sanitize_preset_chip_fade_animation_enabled(
            raw.get("preset_chip_fade_animation_enabled")
        ),
        "input_sanitizer_user_disabled": sanitize_input_sanitizer_user_disabled(
            raw.get("input_sanitizer_user_disabled")
        ),
        "capabilities": sanitize_capabilities(raw.get("capabilities")),
        "ai_character_enabled": sanitize_ai_character_enabled(raw.get("ai_character_enabled")),
        "ai_character_random": sanitize_ai_character_random(raw.get("ai_character_random")),
        "ai_character_preset_id": sanitize_ai_character_preset_id(raw.get("ai_character_preset_id")),
        "ai_character_custom_text": sanitize_ai_character_custom_text(raw.get("ai_character_custom_text")),
        "ai_character_accent_intensity": sanitize_ai_character_accent_intensity(
            raw.get("ai_character_accent_intensity")
        ),
        "ask_mode": sanitize_ask_mode(
            raw.get("ask_mode"),
            valid_ask_modes,
            default_ask_mode,
        ),
        "ollama_keep_alive": sanitize_ollama_keep_alive(raw.get("ollama_keep_alive")),
        "ollama_local_on_deck": sanitize_ollama_local_on_deck(raw.get("ollama_local_on_deck")),
        "show_debug_tab": sanitize_show_debug_tab(raw.get("show_debug_tab")),
        "model_policy_tier": mp_tier,
        "model_policy_non_foss_unlocked": mp_unlock,
        "model_allow_high_vram_fallbacks": sanitize_model_allow_high_vram_fallbacks(
            raw.get("model_allow_high_vram_fallbacks")
        ),
    }


def load_settings(path: str, sanitize_func: Callable[[Any], dict], logger: Any) -> dict:
    """Read settings from disk and return a sanitized settings object on every path.

    If the file exists but has no ``capabilities`` object (legacy installs), all capability
    toggles are grandfathered to True until the user saves explicit values.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            logger.warning("load_settings: expected object in %s, got %s", path, type(data).__name__)
            return sanitize_func({})
        sanitized = sanitize_func(data)
        if "capabilities" not in data or not isinstance(data.get("capabilities"), dict):
            sanitized = {**sanitized, "capabilities": legacy_grandfather_capabilities()}
        return sanitized
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
