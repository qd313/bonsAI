"""Title: Deck TDP service

Purpose: Read current Steam Deck TDP and supply the clamp bounds Ask recommendations use.
Used for: TDP Ask recommendations and the preview sandbox hwmon path.
Solves: Clamped watt/MHz bounds, clean subprocess env, and current-cap reads from amdgpu hwmon.
Does not: Write to sysfs, or report sandbox writes. The apply path was removed on
  2026-07-30 (TDP is suggestion-only) and the sandbox write log it fed went with it.
"""

import glob
import os
from typing import Any, Optional

# Safe clamp bounds for TDP / GPU clock recommendations (match Steam Deck class limits in sysfs tooling).
TDP_MIN_W = 3
TDP_MAX_W = 15
GPU_CLK_MIN_MHZ = 200
GPU_CLK_MAX_MHZ = 1600


def sandbox_sysfs_root() -> Optional[str]:
    """Preview sidecar sandbox root; when set, sysfs writes are mocked."""
    raw = (os.environ.get("DECKY_SANDBOX_ROOT") or "").strip()
    return raw or None


_PREVIEW_AMGPU_HWMON = "/sys/class/hwmon/hwmon-amdgpu-preview"


def find_amdgpu_hwmon() -> Optional[str]:
    """Locate the amdgpu hwmon directory holding the Steam Deck power limit."""
    if sandbox_sysfs_root():
        return _PREVIEW_AMGPU_HWMON
    for name_path in sorted(glob.glob("/sys/class/hwmon/hwmon*/name")):
        try:
            with open(name_path) as f:
                if "amdgpu" in f.read().strip().lower():
                    return name_path.rsplit("/", 1)[0]
        except OSError:
            continue
    return None


def read_current_tdp_watts(logger: Any) -> Optional[int]:
    """Read the amdgpu TDP *cap* in watts from power1_cap (microwatts in sysfs on Steam Deck / amdgpu)."""
    hwmon = find_amdgpu_hwmon()
    if not hwmon:
        logger.info("read_current_tdp_watts: no amdgpu hwmon")
        return None
    cap_path = f"{hwmon}/power1_cap"
    try:
        with open(cap_path) as f:
            uw = int(f.read().strip())
    except (OSError, ValueError) as exc:
        logger.info("read_current_tdp_watts: read %s failed: %s", cap_path, exc)
        return None
    watts = max(0, int(round(uw / 1_000_000)))
    logger.info("read_current_tdp_watts: %s -> %dW", cap_path, watts)
    return watts


def clean_env() -> dict:
    """Return a subprocess-safe environment without Decky LD overrides."""
    env = dict(os.environ)
    for key in ("LD_LIBRARY_PATH", "LD_PRELOAD"):
        env.pop(key, None)
    return env
