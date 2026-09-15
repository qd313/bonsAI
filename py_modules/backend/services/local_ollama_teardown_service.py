"""Title: Removing the AI engine the plugin installed on your Deck

Purpose: When the AI engine (Ollama) is installed and running right on the Deck itself
rather than on a separate PC, and you use Clear all plugin data, this is what actually
removes it: every downloaded model, the engine program itself, and its cache -- so the
Deck is left clean rather than still carrying gigabytes of files the plugin can no longer
see.
Used for: The Clear all plugin data action, and only when this Deck actually has a local
install to remove -- checked first by asking whether the setting says so, and, failing
that, by checking whether the usual install locations exist on disk.
Solves: Doing the cleanup in the right order -- stop the engine, then remove each
downloaded model one at a time, then remove the program and its cache directories -- and
skipping it cleanly on Windows and on any Deck where nothing was installed this way.
Does not: Install or set up the AI engine -- that is a different file
(local_ollama_setup_service). It also never removes a system-wide Ollama install (one
under /usr) -- only the kind this plugin itself installed under the home folder.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Any

from backend.services.local_ollama_setup_service import (
    DEFAULT_BASE,
    _env_for_host_system_tools,
    _stop_local_ollama_listener,
    list_installed_ollama_tags,
    resolve_ollama_executable,
    run_ollama_rm,
    terminate_setup_started_ollama_serve,
)


def should_teardown_local_ollama_on_clear(settings: dict[str, Any] | None) -> bool:
    """True when clear-plugin-data should purge local Ollama state on this Deck."""
    if isinstance(settings, dict) and settings.get("ollama_local_on_deck") is True:
        return True
    if sys.platform.startswith("win"):
        return False
    home = Path.home()
    if (home / ".ollama").exists():
        return True
    if (home / ".local" / "bin" / "ollama").is_file():
        return True
    if (home / ".local" / "lib" / "ollama").is_dir():
        return True
    return False


def _path_within_home(path: Path, home: Path) -> bool:
    try:
        path.resolve().relative_to(home.resolve())
        return True
    except ValueError:
        return False


def teardown_local_ollama_for_plugin_reset(logger: Any) -> dict[str, Any]:
    """
    Best-effort cleanup when ``ollama_local_on_deck`` was enabled before ``clear_plugin_data``.

    Removes installed model tags, ``~/.ollama`` (or ``$OLLAMA_MODELS`` when under home), user-prefix
    Ollama binary under ``~/.local``, and ``~/.bonsai/cache``. Does not remove system-wide ``/usr``
    Ollama installs.
    """
    summary: dict[str, Any] = {"removed_tags": [], "errors": []}
    if sys.platform.startswith("win"):
        return summary

    terminate_setup_started_ollama_serve()

    env = _env_for_host_system_tools()
    _stop_local_ollama_listener(env)

    ollama_bin = resolve_ollama_executable()
    tags = list_installed_ollama_tags(DEFAULT_BASE)
    if ollama_bin and tags:
        for tag in tags:
            ok, err = run_ollama_rm(ollama_bin, tag)
            if ok:
                summary["removed_tags"].append(tag)
            elif err:
                summary["errors"].append(f"{tag}: {err}")
    elif tags and not ollama_bin:
        summary["errors"].append("ollama_not_found_for_rm")

    home = Path.home()
    models_env = (os.environ.get("OLLAMA_MODELS") or "").strip()
    models_path = Path(models_env).expanduser() if models_env else home / ".ollama"
    if models_path.exists():
        if _path_within_home(models_path, home):
            shutil.rmtree(models_path, ignore_errors=True)
            summary["removed_models_dir"] = str(models_path)
        else:
            summary["errors"].append(f"skipped_models_dir_outside_home:{models_path}")
            try:
                logger.warning("teardown: skipped OLLAMA_MODELS outside home: %s", models_path)
            except Exception:
                pass

    local_bin = home / ".local" / "bin" / "ollama"
    local_lib = home / ".local" / "lib" / "ollama"
    if local_bin.is_file():
        try:
            local_bin.unlink()
            summary["removed_user_prefix_bin"] = str(local_bin)
        except OSError as exc:
            summary["errors"].append(f"unlink_bin: {exc}")
    if local_lib.is_dir():
        shutil.rmtree(local_lib, ignore_errors=True)
        summary["removed_user_prefix_lib"] = str(local_lib)

    cache_dir = home / ".bonsai" / "cache"
    if cache_dir.exists() and _path_within_home(cache_dir, home):
        shutil.rmtree(cache_dir, ignore_errors=True)
        summary["cleared_bonsai_cache"] = True

    _stop_local_ollama_listener(env)

    return summary
