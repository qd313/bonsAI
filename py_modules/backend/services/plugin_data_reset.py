"""Reset Decky-persisted plugin data to sanitized defaults (new-install behavior)."""

from __future__ import annotations

import os
import shutil
from typing import Any, Callable

LoadSettingsFn = Callable[[str, Any, Any], dict]
SaveSettingsFn = Callable[..., dict]
SanitizeFn = Callable[[Any], dict]


def reset_plugin_disk_and_defaults(
    *,
    settings_path: str,
    settings_dir: str,
    runtime_dir: str,
    log_dir: str,
    sanitize_func: SanitizeFn,
    load_settings: LoadSettingsFn,
    save_settings: SaveSettingsFn,
    logger: Any,
) -> dict:
    """Remove settings.json, clear runtime and log files, then write fresh defaults.

    Does not touch Desktop notes or other paths outside Decky's plugin dirs. RPC callers should reload
    sanitized settings into memory after this returns so UI and backend state match disk.
    """
    try:
        os.remove(settings_path)
    except FileNotFoundError:
        pass

    if os.path.isdir(runtime_dir):
        shutil.rmtree(runtime_dir)
    os.makedirs(runtime_dir, exist_ok=True)

    if os.path.isdir(log_dir):
        for name in os.listdir(log_dir):
            fp = os.path.join(log_dir, name)
            try:
                if os.path.isfile(fp) or os.path.islink(fp):
                    os.remove(fp)
            except OSError:
                logger.warning("reset_plugin_disk: could not remove %s", fp)

    defaults = load_settings(settings_path, sanitize_func, logger)
    return save_settings(
        path=settings_path,
        settings_dir=settings_dir,
        incoming={},
        current=defaults,
        sanitize_func=sanitize_func,
        logger=logger,
    )
