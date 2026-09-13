"""Title: Ollama local autostart

Purpose: Write, turn on/off, and report a per-user startup entry that starts the
    Deck's local Ollama when the Deck starts, with the loaded-model limit raised to
    two so the answering model and the note-searching model can both stay in memory.
Used for: ``apply_ollama_local_autostart`` / ``get_ollama_local_autostart_status``
    RPCs (main.py), called from the Ollama tab's "Start the AI with the Deck" toggle.
Solves: The Deck had no startup entry for Ollama at all -- it only kept running
    because someone started it by hand on 30 August. This makes turning the setting
    on actually add one, and turning it off actually remove it.
Does not:
    - Never uses sudo and never touches a system-wide (``/etc``) unit -- per-user
      (``systemctl --user``) only.
    - Never writes outside the caller's own home folder -- refuses instead
      (see ``_path_within_home``, proven by a test with a fake home).
    - Never stops, kills, or restarts an Ollama process the plugin did not start
      itself, in either direction (turning the entry on or off).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any

from backend.services.local_ollama_setup_service import (
    DEFAULT_BASE,
    _env_for_host_system_tools,
    probe_ollama_http_ok,
)

UNIT_NAME = "bonsai-ollama-autostart.service"
_OLLAMA_BIN_RELATIVE = Path(".local") / "bin" / "ollama"
_SYSTEMD_USER_DIR_RELATIVE = Path(".config") / "systemd" / "user"

# The environment the running copy uses today (checked on-device 2026-09-12), copied
# verbatim except OLLAMA_MAX_LOADED_MODELS. The others decide how Ollama uses the
# Deck's graphics (Vulkan GPU offload, flash attention, parallel request count) --
# changing them would change how answers behave, so this entry leaves them exactly
# as measured. Only the model limit changes: raising it from 1 to 2 lets the
# answering model and the note-searching (embedding) model both stay loaded, which
# is what turns a ~700ms swap on every question into ~24ms (measured
# runs/plan48-R6-deck-model-eviction.json).
_AUTOSTART_ENV: dict[str, str] = {
    "OLLAMA_VULKAN": "1",
    "OLLAMA_IGPU_ENABLE": "1",
    "OLLAMA_FLASH_ATTENTION": "0",
    "OLLAMA_NUM_PARALLEL": "1",
    "OLLAMA_MAX_LOADED_MODELS": "2",
}


def _path_within_home(path: Path, home: Path) -> bool:
    """Mirrors ``local_ollama_teardown_service._path_within_home`` -- same rule, own module."""
    try:
        path.resolve().relative_to(home.resolve())
        return True
    except ValueError:
        return False


def _ollama_bin_path(home: Path) -> Path:
    return home / _OLLAMA_BIN_RELATIVE


def _systemd_user_dir(home: Path) -> Path:
    return home / _SYSTEMD_USER_DIR_RELATIVE


def _unit_path(home: Path) -> Path:
    return _systemd_user_dir(home) / UNIT_NAME


def _unit_file_contents(ollama_bin: Path) -> str:
    env_lines = "\n".join(f'Environment="{key}={value}"' for key, value in _AUTOSTART_ENV.items())
    return (
        "[Unit]\n"
        "Description=bonsAI local Ollama autostart\n"
        "\n"
        "[Service]\n"
        f"ExecStart={ollama_bin} serve\n"
        f"{env_lines}\n"
        "Restart=on-failure\n"
        "\n"
        "[Install]\n"
        "WantedBy=default.target\n"
    )


def _systemctl_available() -> bool:
    return shutil.which("systemctl") is not None


def _run_systemctl(args: list[str], *, timeout: float = 15.0) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["systemctl", "--user", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env=_env_for_host_system_tools(),
    )


def _dir_writable(path: Path) -> bool:
    probe = path / ".bonsai_autostart_write_probe"
    try:
        probe.write_text("", encoding="utf-8")
        probe.unlink()
        return True
    except OSError:
        return False


def _unit_enabled(home: Path) -> bool:
    if not _systemctl_available():
        return False
    try:
        result = _run_systemctl(["is-enabled", UNIT_NAME])
    except Exception:
        return False
    return result.stdout.strip() == "enabled"


def _ollama_answering() -> bool:
    return probe_ollama_http_ok(DEFAULT_BASE, timeout_seconds=2.0)


def get_ollama_local_autostart_status() -> dict[str, Any]:
    """Report installed/enabled/running plus a plain reason for the tab to show.

    ``reason`` explains the first "no" in that order -- an Ollama that was never
    installed blocks everything below it, so there is no point reporting the
    startup entry's state on top of it.
    """
    home = Path.home()
    ollama_bin = _ollama_bin_path(home)
    unit_path = _unit_path(home)
    installed = unit_path.is_file()
    enabled = installed and _unit_enabled(home)
    running = _ollama_answering()

    reason = ""
    if not ollama_bin.is_file():
        reason = "The local AI isn't installed on this Deck yet."
    elif not installed:
        reason = "Off. Turn on “Start the AI with the Deck” to add it."
    elif not enabled:
        reason = "The startup entry exists but is not turned on."
    elif not running:
        reason = "Nothing is answering questions right now."

    return {
        "installed": installed,
        "enabled": enabled,
        "running": running,
        "reason": reason,
    }


def _remove_autostart(home: Path) -> dict[str, Any]:
    unit_path = _unit_path(home)
    if not unit_path.is_file():
        return {"ok": True, "changed": False, "message": "The startup entry was already off."}
    if not _path_within_home(unit_path, home):
        # Defense in depth: the path is built from fixed relative segments above and
        # can never actually land outside home, but a refusal here is cheap and this
        # is the rule a test proves rather than trusts.
        return {"ok": False, "changed": False, "reason": "Refused: the startup entry was outside the home folder."}

    if _systemctl_available():
        try:
            _run_systemctl(["disable", UNIT_NAME])
        except Exception:
            pass
    try:
        unit_path.unlink()
    except OSError as exc:
        return {"ok": False, "changed": False, "reason": f"Could not remove the startup entry: {exc}"}
    if _systemctl_available():
        try:
            _run_systemctl(["daemon-reload"])
        except Exception:
            pass
    return {
        "ok": True,
        "changed": True,
        "message": "Startup entry removed. Anything already running was left alone.",
    }


def _install_autostart(home: Path) -> dict[str, Any]:
    ollama_bin = _ollama_bin_path(home)
    if not ollama_bin.is_file():
        return {"ok": False, "changed": False, "reason": "The local AI isn't installed on this Deck yet."}
    if not _path_within_home(ollama_bin, home):
        return {"ok": False, "changed": False, "reason": "Refused: the AI program is not under the home folder."}

    # Checked before touching the filesystem, so a Deck with no per-user startup
    # services never gets an empty startup folder created on it for nothing.
    if not _systemctl_available():
        return {"ok": False, "changed": False, "reason": "This Deck doesn't have per-user startup services."}

    systemd_dir = _systemd_user_dir(home)
    if not _path_within_home(systemd_dir, home):
        return {"ok": False, "changed": False, "reason": "Refused: the startup folder is not under the home folder."}
    try:
        systemd_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return {"ok": False, "changed": False, "reason": "The Deck's startup folder can't be written to."}
    if not _dir_writable(systemd_dir):
        return {"ok": False, "changed": False, "reason": "The Deck's startup folder can't be written to."}

    unit_path = _unit_path(home)
    try:
        unit_path.write_text(_unit_file_contents(ollama_bin), encoding="utf-8")
    except OSError as exc:
        return {"ok": False, "changed": False, "reason": f"Could not write the startup entry: {exc}"}

    try:
        _run_systemctl(["daemon-reload"])
        _run_systemctl(["enable", UNIT_NAME])
    except Exception as exc:
        return {"ok": False, "changed": False, "reason": f"Could not turn the startup entry on: {exc}"}

    if _ollama_answering():
        # Something is already using the AI's port -- may be mid-question. Leave it
        # completely alone; the raised model limit takes effect from the next boot.
        return {
            "ok": True,
            "changed": True,
            "message": (
                "Something is already answering questions, so it was left alone. "
                "The change takes effect the next time the Deck starts."
            ),
        }

    try:
        _run_systemctl(["start", UNIT_NAME])
    except Exception:
        pass
    return {
        "ok": True,
        "changed": True,
        "message": "Started now, and will start automatically from now on.",
    }


def apply_ollama_local_autostart(enabled: bool) -> dict[str, Any]:
    """Turn the per-user startup entry on or off. See module header for the rules.

    No platform check here on purpose: a machine with no ``systemctl`` (including a
    non-Linux dev box) already refuses inside ``_install_autostart`` with the same
    plain reason a Deck without per-user startup services would get.
    """
    home = Path.home()
    if not enabled:
        return _remove_autostart(home)
    return _install_autostart(home)
