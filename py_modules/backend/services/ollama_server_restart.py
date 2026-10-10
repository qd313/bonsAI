"""Title: Restarting the Deck's Ollama so an update really takes effect

Purpose: When the Update AI & models button replaces Ollama's program file, the Ollama that is
    already running keeps running the OLD program until it is stopped and started again. This file
    does that stop and start, on the Deck, in the safest order it can, and then reads back which
    version is answering so the tab can say so truthfully.

Used for: the setup run in local_ollama_setup_service.py, right after the program file was
    refreshed. Also holds `try_restart_ollama_user_service()`, the "wake a stopped Ollama" helper
    that the connection test and the setup run already used.

Solves: Found on the Deck 2026-10-09: the program file was the new 0.40.2 while the Ollama that
    answered had run for three days and was still 0.34.1. The tab shows the running server's
    version, so the button looked like it did nothing. Two causes sat behind it. The restart code
    only ever asked for a unit called ``ollama``, but the unit this plugin writes is called
    ``bonsai-ollama-autostart.service``. And the plugin's own process cannot reach the user's
    systemd by default (no session bus variables), so even a right name would not have worked.

Does not:
    - Never stops a process it cannot identify as the Ollama server: only a process named
      ``ollama`` whose first argument is ``serve`` and that belongs to the same user is ever
      signalled. A server started by hand under another account, or by some other program, is
      left running and the result says plainly that the Deck needs a restart.
    - Does not pull models or install anything; it only restarts and reports.

How it works:

    read the new program's version, read the running server's version
        |
        +- same, or nothing running -> nothing to restart
        |
        +- different:
              1. the startup unit exists -> `systemctl --user restart` it (with the session bus
                 variables filled in) and wait for the new version to answer
              2. otherwise, or if that did not work -> find the `ollama serve` process (the one
                 the plugin started itself, else one found by name in /proc), stop it, then start
                 it again (the unit if there is one, else directly with the unit's settings)
              3. no process can be identified -> leave everything alone and say so

Gotchas: `ollama --version` prints the SERVER's version first and the program file's own version on
    a second "client version" line when they differ, so the client line wins when it is there.
"""

from __future__ import annotations

import os
import re
import signal
import subprocess
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable, Optional

from backend.ollama_reply_limits import read_json_capped

# Same value as ollama_local_autostart_service.UNIT_NAME (a test checks they agree). Kept here
# rather than imported because that module imports the setup service, which imports this one.
AUTOSTART_UNIT_NAME = "bonsai-ollama-autostart.service"
# The unit name the official Linux installer registers, tried after ours.
OFFICIAL_UNIT_NAME = "ollama"
BASE_URL = "http://127.0.0.1:11434"

_CLIENT_VERSION_RE = re.compile(r"client version is\s+([0-9A-Za-z][0-9A-Za-z.+\-]*)", re.I)
_PLAIN_VERSION_RE = re.compile(r"ollama version is\s+([0-9A-Za-z][0-9A-Za-z.+\-]*)", re.I)


def _now() -> float:
    return time.monotonic()


def _sleep(seconds: float) -> None:
    time.sleep(seconds)


_LD_KEYS = frozenset(("LD_LIBRARY_PATH", "LD_PRELOAD", "ORIG_LD_LIBRARY_PATH"))


def _host_env() -> dict[str, str]:
    """The plugin's environment without Steam's library overrides (so systemd and Ollama use the
    system's own libraries); the same rule local_ollama_setup_service applies to every child."""
    return {k: v for k, v in os.environ.items() if isinstance(v, str) and k not in _LD_KEYS}


def user_bus_env() -> dict[str, str]:
    """Environment for ``systemctl --user``: the plugin's backend starts without the session bus
    variables (measured on the Deck 2026-09-12), so fill them in from /run/user/<uid> when the
    socket is there."""
    env = _host_env()
    getuid = getattr(os, "getuid", None)
    if getuid is None:
        return env
    runtime_dir = f"/run/user/{getuid()}"
    if not env.get("XDG_RUNTIME_DIR") and os.path.isdir(runtime_dir):
        env["XDG_RUNTIME_DIR"] = runtime_dir
    bus = os.path.join(env.get("XDG_RUNTIME_DIR", runtime_dir), "bus")
    if not env.get("DBUS_SESSION_BUS_ADDRESS") and os.path.exists(bus):
        env["DBUS_SESSION_BUS_ADDRESS"] = f"unix:path={bus}"
    return env


def _run_user_systemctl(args: list[str], timeout: float = 45.0) -> tuple[int, str]:
    """(return code, output text) of ``systemctl --user <args>``; (-1, reason) if it cannot run."""
    try:
        r = subprocess.run(
            ["systemctl", "--user", *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=user_bus_env(),
        )
        return r.returncode, ((r.stdout or "") + (r.stderr or "")).strip()
    except Exception as exc:
        return -1, str(exc)


def try_restart_ollama_user_service(shell_log: Callable[[str], None]) -> None:
    """Best-effort start of the user unit for common SteamOS / Linux layouts (ours, then the
    official installer's). A unit that is not there fails quietly."""
    for unit in (AUTOSTART_UNIT_NAME, OFFICIAL_UNIT_NAME):
        for verb in ("try-restart", "start"):
            shell_log(f"[bonsAI] Trying: systemctl --user {verb} {unit}")
            _rc, text = _run_user_systemctl([verb, unit], timeout=30.0)
            if text:
                shell_log(text)


def fetch_server_version(timeout_seconds: float = 2.5) -> str:
    """The version the running server reports on ``/api/version``; "" when nothing answers."""
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/version", method="GET")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            data = read_json_capped(resp, what="/api/version reply")
        return str(data.get("version") or "").strip() if isinstance(data, dict) else ""
    except Exception:
        return ""


def parse_binary_version(text: str) -> str:
    """Pull the program file's own version out of ``ollama --version`` output."""
    m = _CLIENT_VERSION_RE.search(text or "") or _PLAIN_VERSION_RE.search(text or "")
    return m.group(1) if m else ""


def read_binary_version(ollama_bin: str, env: Optional[dict[str, str]] = None) -> str:
    """The version of the program file on disk ("" if it cannot be read). ``env`` is the setup
    service's Ollama command environment (it carries the bundled library folder)."""
    try:
        r = subprocess.run(
            [ollama_bin, "--version"],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
            env=env,
        )
        return parse_binary_version((r.stdout or "") + "\n" + (r.stderr or ""))
    except Exception:
        return ""


def _unit_installed() -> bool:
    return (Path.home() / ".config" / "systemd" / "user" / AUTOSTART_UNIT_NAME).is_file()


def find_ollama_serve_pids() -> list[int]:
    """Processes of this user that are ``ollama serve`` (read from /proc); [] off Linux."""
    out: list[int] = []
    proc = Path("/proc")
    getuid = getattr(os, "getuid", None)
    if getuid is None or not proc.is_dir():
        return out
    me = getuid()
    try:
        entries = list(proc.iterdir())
    except OSError:
        return out
    for entry in entries:
        if not entry.name.isdigit():
            continue
        try:
            if entry.stat().st_uid != me:
                continue
            argv = (entry / "cmdline").read_bytes().split(b"\0")
        except OSError:
            continue
        if len(argv) >= 2 and os.path.basename(argv[0].decode("utf-8", "replace")) == "ollama" and argv[1] == b"serve":
            out.append(int(entry.name))
    return out


def _send_signal(pid: int, sig: int) -> None:
    try:
        os.kill(pid, sig)
    except OSError:
        pass


def _wait_for(pred: Callable[[], bool], seconds: float) -> bool:
    end = _now() + seconds
    while True:
        if pred():
            return True
        if _now() >= end:
            return False
        _sleep(0.5)


def _unit_environment() -> dict[str, str]:
    """The ``Environment="KEY=value"`` lines of the startup unit, read back from the file so a
    server started without systemd runs with exactly the settings the unit gives it."""
    out: dict[str, str] = {}
    try:
        text = (Path.home() / ".config" / "systemd" / "user" / AUTOSTART_UNIT_NAME).read_text(encoding="utf-8")
    except OSError:
        return out
    for line in text.splitlines():
        m = re.match(r'\s*Environment="?([A-Za-z_][A-Za-z0-9_]*)=(.*?)"?\s*$', line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


class ServeControl:
    """What the setup service lends this file: starting the server as the plugin's own child,
    stopping the child it started earlier, and the environment its commands run in."""

    def __init__(
        self,
        start: Callable[[Optional[dict[str, str]]], bool],
        stop_own: Callable[[], None],
        own_pid: Callable[[], Optional[int]],
        cli_env: Optional[dict[str, str]] = None,
    ) -> None:
        self.start = start
        self.stop_own = stop_own
        self.own_pid = own_pid
        self.cli_env = cli_env


def _stop_pids(pids: list[int]) -> bool:
    """TERM, wait up to 20 s for the server to stop answering, then KILL. True once it is down."""
    for pid in pids:
        _send_signal(pid, signal.SIGTERM)
    if _wait_for(lambda: not fetch_server_version(1.5), 20.0):
        return True
    for pid in pids:
        _send_signal(pid, getattr(signal, "SIGKILL", signal.SIGTERM))
    return _wait_for(lambda: not fetch_server_version(1.5), 8.0)


def restart_server_onto_new_binary(
    shell_log: Callable[[str], None], ollama_bin: str, control: ServeControl, *, wait_seconds: float = 45.0
) -> dict[str, Any]:
    """Make the running server be the program file just installed.

    Out: ``how`` is one of "not-running", "current", "unit", "direct", "unidentified", "failed";
    ``server_version`` and ``binary_version`` are what was read afterwards ("" if unknown);
    ``needs_device_restart`` is True only when a server is still running the old program and it
    could not be safely replaced.
    """
    binary_v = read_binary_version(ollama_bin, control.cli_env)
    old_v = fetch_server_version()
    result: dict[str, Any] = {
        "how": "",
        "server_version": old_v,
        "binary_version": binary_v,
        "needs_device_restart": False,
    }
    if not old_v:
        result["how"] = "not-running"
        return result
    if binary_v and old_v == binary_v:
        result["how"] = "current"
        return result

    shell_log(f"[bonsAI] The running Ollama is {old_v} but the program file is {binary_v or 'newer'}; restarting it.")

    def is_new_answering() -> bool:
        v = fetch_server_version(1.5)
        return bool(v) and (v == binary_v if binary_v else v != old_v)

    def finish(how: str) -> dict[str, Any]:
        result["how"] = how
        result["server_version"] = fetch_server_version()
        return result

    unit_here = _unit_installed()
    if unit_here:
        rc, text = _run_user_systemctl(["restart", AUTOSTART_UNIT_NAME])
        shell_log(f"[bonsAI] systemctl --user restart {AUTOSTART_UNIT_NAME}: exit {rc}" + (f" ({text})" if text else ""))
        if rc == 0 and _wait_for(is_new_answering, wait_seconds):
            return finish("unit")

    pids = list(find_ollama_serve_pids())
    plugin_pid = control.own_pid()
    if plugin_pid is not None and plugin_pid not in pids:
        pids.append(plugin_pid)
    if not pids:
        if is_new_answering():
            return finish("unit")
        shell_log("[bonsAI] No Ollama server process of this user could be identified; leaving it running.")
        result["how"] = "unidentified"
        result["needs_device_restart"] = True
        return result

    shell_log(f"[bonsAI] Stopping the Ollama server (process {', '.join(str(p) for p in pids)}) to start the new one.")
    control.stop_own()
    stopped = _stop_pids([p for p in pids if p != plugin_pid]) if any(p != plugin_pid for p in pids) else True
    if not stopped or fetch_server_version(1.5):
        shell_log("[bonsAI] The old Ollama server did not stop.")
        result["how"] = "failed"
        result["needs_device_restart"] = True
        return result
    if unit_here:
        _rc, _text = _run_user_systemctl(["start", AUTOSTART_UNIT_NAME])
        if _wait_for(is_new_answering, wait_seconds):
            return finish("unit")
    if control.start(_unit_environment() if unit_here else None) and _wait_for(
        is_new_answering, wait_seconds
    ):
        return finish("direct")
    result["how"] = "failed"
    result["server_version"] = fetch_server_version()
    result["needs_device_restart"] = bool(result["server_version"]) and result["server_version"] != binary_v
    return result


def update_result_line(profile: str, tags: list[str], restart: dict[str, Any], *, server_v: str, binary_v: str) -> str:
    """The one plain sentence the tab shows when a setup run ends well. In: the profile that ran,
    the tags it pulled, what the restart reported, and the versions read at the very end."""
    plural = "s" if len(tags) != 1 else ""
    shown = server_v or binary_v
    if profile != "update_installed":
        head = f"Ollama {shown} is ready." if shown else "Setup finished."
        return f"{head} Downloaded {len(tags)} model{plural}." if tags else head
    models = (
        f" {len(tags)} model{plural} refreshed."
        if tags
        else " No models are installed yet; use Browse models to download one."
    )
    how = restart.get("how")
    if server_v and binary_v and server_v != binary_v:
        return f"Updated to {binary_v}; restart the Deck to use it (Ollama {server_v} is still running)." + models
    if not shown:
        return "Update finished." + models
    if how in ("unit", "direct"):
        return f"Updated to Ollama {shown} and restarted it." + models
    if how == "not-running":
        return f"Updated to Ollama {shown}." + models
    return f"Ollama {shown} is up to date." + models


def record_result(
    state: dict[str, Any],
    profile: str,
    tags: list[str],
    restart_info: dict[str, Any],
    ollama_bin: str,
    cli_env: Optional[dict[str, str]] = None,
) -> None:
    """Write the end-of-run facts the tab reads from the setup status: the version now running,
    whether the Deck still needs a restart, and the one plain sentence to show."""
    server_v = fetch_server_version()
    binary_v = read_binary_version(ollama_bin, cli_env)
    state["progress_text"] = ""
    state["ollama_version"] = server_v or binary_v
    state["needs_device_restart"] = bool(restart_info) and bool(server_v and binary_v and server_v != binary_v)
    state["result_line"] = update_result_line(profile, tags, restart_info, server_v=server_v, binary_v=binary_v)
