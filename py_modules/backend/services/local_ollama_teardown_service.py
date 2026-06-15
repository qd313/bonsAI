"""Remove local Ollama models and user-prefix install when clearing bonsAI plugin data."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


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

    from backend.services.local_ollama_setup_service import (
        DEFAULT_BASE,
        _env_for_host_system_tools,
        list_installed_ollama_tags,
        resolve_ollama_executable,
        run_ollama_rm,
        terminate_setup_started_ollama_serve,
    )

    terminate_setup_started_ollama_serve()

    env = _env_for_host_system_tools()
    try:
        subprocess.run(
            ["systemctl", "--user", "stop", "ollama"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
            env=env,
        )
    except Exception as exc:
        summary["errors"].append(f"systemctl stop: {exc}")

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

    return summary
