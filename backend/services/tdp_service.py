import glob
import os
import subprocess
from typing import Any, Optional


def find_amdgpu_hwmon() -> Optional[str]:
    """Locate the amdgpu hwmon directory used for Steam Deck power limit writes."""
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


def write_sysfs(path: str, value: str, priv_write: str, logger: Any) -> None:
    """Write to sysfs using direct, helper, then sudo fallback write strategies."""
    clean = clean_env()

    # Prefer direct write first because it avoids elevated process overhead.
    try:
        with open(path, "w") as f:
            f.write(value)
        logger.info("_write_sysfs: direct write OK -> %s", path)
        return
    except PermissionError:
        logger.info("_write_sysfs: direct write denied for %s", path)
    except OSError as exc:
        logger.info("_write_sysfs: direct write failed for %s: %s", path, exc)

    # SteamOS helper is the preferred privileged path when direct write is denied.
    if os.path.isfile(priv_write):
        result = subprocess.run(
            [priv_write, path, value],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=clean,
            timeout=5,
        )
        if result.returncode == 0:
            logger.info("_write_sysfs: steamos-priv-write OK -> %s", path)
            return
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        logger.info("_write_sysfs: steamos-priv-write failed (rc=%d): %s", result.returncode, stderr)
    else:
        logger.info("_write_sysfs: steamos-priv-write not found at %s", priv_write)

    # Final non-interactive sudo fallback keeps behavior consistent with legacy path.
    result = subprocess.run(
        ["sudo", "-n", "tee", path],
        input=value.encode(),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        env=clean,
        timeout=5,
    )
    if result.returncode == 0:
        logger.info("_write_sysfs: sudo -n tee OK -> %s", path)
        return
    stderr = result.stderr.decode("utf-8", errors="replace").strip()
    raise OSError(f"All write methods failed for {path}: {stderr}")


def apply_tdp(rec: dict, priv_write: str, logger: Any) -> dict:
    """Apply parsed TDP recommendations and report applied values plus write errors."""
    applied: dict = {"tdp_watts": None, "gpu_clock_mhz": None, "errors": []}

    hwmon = find_amdgpu_hwmon()
    if not hwmon:
        applied["errors"].append("Could not find amdgpu hwmon path in sysfs.")
        logger.error("_apply_tdp: amdgpu hwmon not found")
        return applied

    tdp_w = rec.get("tdp_watts")
    if tdp_w is not None:
        cap_path = f"{hwmon}/power1_cap"
        microwatts = str(int(tdp_w) * 1_000_000)
        try:
            write_sysfs(cap_path, microwatts, priv_write, logger)
            applied["tdp_watts"] = int(tdp_w)
            logger.info("_apply_tdp: wrote %s to %s (%dW)", microwatts, cap_path, tdp_w)
        except Exception as exc:
            msg = f"Failed to write TDP to {cap_path}: {exc}"
            applied["errors"].append(msg)
            logger.error("_apply_tdp: %s", msg)

    gpu_mhz = rec.get("gpu_clock_mhz")
    if gpu_mhz is not None:
        applied["gpu_clock_mhz"] = int(gpu_mhz)
        logger.info("_apply_tdp: GPU clock %d MHz noted (sysfs write not yet implemented)", gpu_mhz)

    return applied
