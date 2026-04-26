"""User capability toggles for high-impact plugin actions (Permission Center)."""

from typing import Any

# Fixed keys persisted under settings["capabilities"]; keep in sync with frontend BonsaiSettings.
CAPABILITY_KEYS = (
    "filesystem_write",
    "hardware_control",
    "media_library_access",
    "external_navigation",
)


def sanitize_capabilities(value: Any) -> dict[str, bool]:
    """Normalize capabilities to a full dict; missing keys default to False."""
    raw = value if isinstance(value, dict) else {}
    out: dict[str, bool] = {}
    for key in CAPABILITY_KEYS:
        v = raw.get(key)
        if isinstance(v, bool):
            out[key] = v
        else:
            out[key] = v is True or v == 1
    return out


def legacy_grandfather_capabilities() -> dict[str, bool]:
    """All-on defaults for settings files created before the capabilities block existed."""
    return {k: True for k in CAPABILITY_KEYS}


def capability_enabled(settings: dict, key: str) -> bool:
    """True when settings explicitly enable a capability (unknown keys are denied)."""
    if key not in CAPABILITY_KEYS:
        return False
    caps = settings.get("capabilities")
    if not isinstance(caps, dict):
        return False
    return caps.get(key) is True
