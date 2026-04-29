"""Background local Ollama install + Tier-1 pull helpers (Linux / Steam Deck)."""

from __future__ import annotations

import asyncio
import json
import ipaddress
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable, Optional

from refactor_helpers import normalize_ollama_base, tier1_foss_recommended_pull_tags

OLLAMA_OFFICIAL_INSTALL_SH = "https://ollama.com/install.sh"
DEFAULT_BASE = normalize_ollama_base("127.0.0.1:11434")[2]
MAX_LOG_TAIL_LINES = 120

_DEBUG_SESSION = "c0ee30"
_AGENT_LOG_NAME = "debug-c0ee30.log"


def _agent_debug_log_path_candidates() -> list[Path]:
    """Prefer writable paths — plugin install dir is often root‑owned and rejects new files."""
    paths: list[Path] = []
    try:
        paths.append(Path(__file__).resolve().parents[3] / _AGENT_LOG_NAME)
    except Exception:
        pass
    xh = os.environ.get("XDG_STATE_HOME")
    if xh:
        paths.append(Path(xh) / "bonsAI" / _AGENT_LOG_NAME)
    paths.append(Path.home() / ".local/state/bonsAI" / _AGENT_LOG_NAME)
    paths.append(Path("/tmp") / _AGENT_LOG_NAME)
    return paths


def _agent_debug_ndjson(
    *,
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict[str, Any],
) -> None:
    # #region agent log
    line_obj: dict[str, Any] = {
        "sessionId": _DEBUG_SESSION,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
    }
    for lp in _agent_debug_log_path_candidates():
        try:
            lp.parent.mkdir(parents=True, exist_ok=True)
            with open(lp, "a", encoding="utf-8") as f:
                f.write(json.dumps(line_obj, ensure_ascii=False) + "\n")
            return
        except Exception:
            continue
    # #endregion agent log


def _fs_probe(path: str) -> dict[str, Any]:
    parent = str(Path(path).resolve().parent if path != "/" else "/")
    pw: bool | None
    if os.path.isdir(parent):
        pw = os.access(parent, os.W_OK)
    else:
        pw = None
    return {
        "path": path,
        "exists": os.path.lexists(path),
        "is_dir": os.path.isdir(path),
        "parent": parent,
        "parent_is_dir": os.path.isdir(parent),
        "parent_w_ok": pw,
    }


_LD_STRIP_KEYS = frozenset(
    (
        # Decky/Python may inherit Steam runtime paths → wrong libreadline for /usr/bin/bash
        # (e.g. "undefined symbol: rl_trim_arg_from_keyseq").
        # For ``ollama`` we re-inject ~/.local/lib/ollama only (see `_env_for_ollama_cli`).
        "LD_LIBRARY_PATH",
        "LD_PRELOAD",
        "ORIG_LD_LIBRARY_PATH",
    ),
)

_OLLAMA_SERVE_PROC: Optional[subprocess.Popen] = None
_OLLAMA_SERVE_STARTED_BY_SETUP = False


def _env_for_host_system_tools() -> dict[str, str]:
    """Child env without loader overrides so distro bash, systemd, and Ollama use OS libs."""
    return {k: v for k, v in os.environ.items() if isinstance(v, str) and k not in _LD_STRIP_KEYS}


def _ollama_bundle_lib_dir(ollama_bin: str) -> Optional[Path]:
    """Tarball layout: ``~/.local/bin/ollama`` + ``~/.local/lib/ollama`` (bundled GGML/CUDA bits)."""
    try:
        p = Path(ollama_bin).resolve()
        cand = p.parent.parent / "lib" / "ollama"
        if cand.is_dir():
            return cand
    except Exception:
        pass
    return None


def _env_for_ollama_cli(ollama_bin: str) -> dict[str, str]:
    """Host env stripped of Steam ``LD_*`` pollution, plus Ollama's lib dir prepended."""
    env = dict(_env_for_host_system_tools())
    lib = _ollama_bundle_lib_dir(ollama_bin)
    if lib is not None:
        prev = env.get("LD_LIBRARY_PATH", "")
        env["LD_LIBRARY_PATH"] = str(lib) if not prev else f"{lib}:{prev}"
    return env


def terminate_setup_started_ollama_serve() -> None:
    """Stop ``ollama serve`` subprocess we spawned for setup (Deck cancel / teardown)."""
    global _OLLAMA_SERVE_PROC, _OLLAMA_SERVE_STARTED_BY_SETUP
    proc = _OLLAMA_SERVE_PROC
    started = _OLLAMA_SERVE_STARTED_BY_SETUP
    _OLLAMA_SERVE_PROC = None
    _OLLAMA_SERVE_STARTED_BY_SETUP = False
    if not started or proc is None:
        return
    try:
        proc.terminate()
        proc.wait(timeout=10)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def ensure_ollama_server_listening_before_pull(
    shell_log: Callable[[str], None],
    ollama_bin: str,
    cancelled: Callable[[], bool],
    *,
    max_listen_probe_iterations: int = 90,
) -> bool:
    """
    ``ollama pull`` requires the HTTP API. User-prefix tarball installs do not register systemd;
    start ``ollama serve`` in the background when port 11434 is down.
    """
    global _OLLAMA_SERVE_PROC, _OLLAMA_SERVE_STARTED_BY_SETUP
    if probe_ollama_http_ok(DEFAULT_BASE, timeout_seconds=2.5):
        _agent_debug_ndjson(
            hypothesis_id="H7-ollama-serve",
            location="ensure_ollama_server_listening_before_pull",
            message="daemon already reachable",
            data={"already_up": True},
        )
        return True

    shell_log("[bonsAI] No Ollama server on localhost:11434 — starting ``ollama serve`` (needed for pulls) …")
    env = _env_for_ollama_cli(ollama_bin)
    try:
        _OLLAMA_SERVE_PROC = subprocess.Popen(
            [ollama_bin, "serve"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=env,
            start_new_session=True,
        )
        _OLLAMA_SERVE_STARTED_BY_SETUP = True
        _agent_debug_ndjson(
            hypothesis_id="H7-ollama-serve",
            location="ensure_ollama_server_listening_before_pull",
            message="spawned ollama serve",
            data={
                "pid": getattr(_OLLAMA_SERVE_PROC, "pid", None),
                "bundle_lib": str(_ollama_bundle_lib_dir(ollama_bin) or ""),
            },
        )
    except Exception as exc:
        _agent_debug_ndjson(
            hypothesis_id="H7-ollama-serve",
            location="ensure_ollama_server_listening_before_pull",
            message="spawn failed",
            data={"error": repr(exc)[:240]},
        )
        shell_log(f"[bonsAI] Could not start ollama serve: {exc}")
        return False

    for i in range(max_listen_probe_iterations):
        if cancelled():
            terminate_setup_started_ollama_serve()
            return False
        proc = _OLLAMA_SERVE_PROC
        if proc is not None and proc.poll() is not None:
            shell_log(f"[bonsAI] ollama serve exited early (code {proc.returncode}). Check disk and drivers.")
            terminate_setup_started_ollama_serve()
            _agent_debug_ndjson(
                hypothesis_id="H7-ollama-serve",
                location="ensure_ollama_server_listening_before_pull",
                message="serve died",
                data={"returncode": proc.returncode},
            )
            return False
        if probe_ollama_http_ok(DEFAULT_BASE, timeout_seconds=1.5):
            _agent_debug_ndjson(
                hypothesis_id="H7-ollama-serve",
                location="ensure_ollama_server_listening_before_pull",
                message="listening",
                data={"attempts": i + 1},
            )
            shell_log("[bonsAI] Ollama API is reachable on localhost:11434.")
            return True
        time.sleep(0.5)

    shell_log("[bonsAI] Ollama server did not become ready in time. Try ``ollama serve`` from Konsole.")
    terminate_setup_started_ollama_serve()
    _agent_debug_ndjson(
        hypothesis_id="H7-ollama-serve",
        location="ensure_ollama_server_listening_before_pull",
        message="probe timeout",
        data={"timed_out_s": round(0.5 * max_listen_probe_iterations, 1)},
    )
    return False


def recover_loopback_ollama_listening(
    shell_log: Callable[[str], None],
    *,
    max_listen_probe_iterations: int = 40,
) -> bool:
    """
    Best-effort start of localhost Ollama (systemd user unit, then ``ollama serve``) before a probe retry.

    Intended for Connection Test failures on **127.0.0.1** / localhost only — not LAN hosts.
    """
    if probe_ollama_http_ok(DEFAULT_BASE, timeout_seconds=2.5):
        return True
    try_restart_ollama_user_service(shell_log)
    time.sleep(1.0)
    if probe_ollama_http_ok(DEFAULT_BASE, timeout_seconds=2.5):
        return True

    _prepend_home_local_bin_to_environ(shell_log)
    ollama_bin = resolve_ollama_executable()
    if not ollama_bin:
        shell_log("[bonsAI] ``ollama`` not found on PATH — use Starter setup to install.")
        return False

    return ensure_ollama_server_listening_before_pull(
        shell_log,
        ollama_bin,
        lambda: False,
        max_listen_probe_iterations=max_listen_probe_iterations,
    )


def _bash_exe() -> str:
    """Prefer distro ``/usr/bin/bash`` so we do not pick a shim from a mutated ``PATH``."""
    if sys.platform.startswith("win"):
        return "bash"
    if os.access("/usr/bin/bash", os.X_OK):
        return "/usr/bin/bash"
    found = shutil.which("bash")
    return found if found else "bash"


def _append_log(lines: list[str], msg: str) -> None:
    for part in msg.splitlines() or ["(empty line)"]:
        lines.append(part)
        if len(lines) > MAX_LOG_TAIL_LINES:
            del lines[:-MAX_LOG_TAIL_LINES]


def probe_ollama_http_ok(base_http: str, timeout_seconds: float = 2.5) -> bool:
    """Return True when Ollama responds on ``/api/version``."""
    url = f"{base_http}/api/version"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            return 200 <= (resp.status or 0) < 300
    except Exception:
        return False


def is_loopback_ollama_host(host: str) -> bool:
    """True when ``host`` identifies the local Ollama machine (loopback or ``localhost`` hostname)."""
    h = (host or "").strip()
    if not h:
        return False
    try:
        return bool(ipaddress.ip_address(h).is_loopback)
    except ValueError:
        pass
    return h.casefold() == "localhost"


def resolve_ollama_executable() -> Optional[str]:
    """Return path to ``ollama`` CLI if present on PATH."""
    return shutil.which("ollama")


def _prefer_user_prefix_ollama_install_linux() -> bool:
    """SteamOS/immutable-root systems keep ``/usr`` and ``/usr/local`` read-only → official ``install.sh`` cannot work."""
    if sys.platform.startswith("win"):
        return False
    probe = Path("/usr/local/lib/.bonsai_write_probe_rm_ok")
    try:
        probe.write_text("")
        probe.unlink(missing_ok=True)
        return False
    except OSError:
        return True


def _ollama_linux_download_stem() -> str:
    u = shutil.which("uname")
    mach = ""
    try:
        r = subprocess.run([u or "uname", "-m"], capture_output=True, text=True, timeout=5)
        mach = (r.stdout or "").strip()
    except Exception:
        mach = ""
    if mach in ("x86_64", "amd64"):
        return "ollama-linux-amd64"
    if mach in ("aarch64", "arm64"):
        return "ollama-linux-arm64"
    raise RuntimeError(f"Unsupported Linux machine type for Ollama: {mach or 'unknown'}.")


def _prepend_home_local_bin_to_environ(shell_log: Callable[[str], None]) -> None:
    lb = Path.home() / ".local" / "bin"
    lbs = str(lb)
    paths = os.environ.get("PATH", "")
    paths_split = paths.split(":") if paths else []
    if lbs not in paths_split:
        os.environ["PATH"] = lbs + (":" + paths if paths else "")
        shell_log(f"[bonsAI] Prepended ~/.local/bin to PATH ({lbs}).")


def run_tarball_user_local_install(shell_log: Callable[[str], None]) -> tuple[bool, str]:
    """Download official Ollama tarball into ``~/.local`` (writable) when ``/usr`` is immutable."""
    child_env = _env_for_host_system_tools()
    home = Path.home()
    dst = home / ".local"
    lb = dst / "bin"
    lb.mkdir(parents=True, exist_ok=True)
    stem = _ollama_linux_download_stem()
    base = "https://ollama.com/download"
    zst_url = f"{base}/{stem}.tar.zst"
    tgz_url = f"{base}/{stem}.tgz"
    bash_w = _bash_exe()
    have_zstd = shutil.which("zstd") is not None
    shell_log(f"[bonsAI] Immutable /usr — installing Ollama user prefix under {dst} …")
    if have_zstd:
        inner = f'set -e; mkdir -p "{lb}" && curl -fsSL "{zst_url}" | zstd -d | tar -xf - -C "{dst}"'
    else:
        inner = f'set -e; mkdir -p "{lb}" && curl -fsSL "{tgz_url}" | tar -xzf - -C "{dst}"'
        shell_log("[bonsAI] zstd not found; using .tgz fallback (slower/larger download).")

    _agent_debug_ndjson(
        hypothesis_id="H5-steam-ro-tarball",
        location="run_tarball_user_local_install:before",
        message="immutable root path detected; extracting to HOME/.local",
        data={"prefer_user_prefix": True, "have_zstd": bool(have_zstd), "stem": stem},
    )

    cmd = [bash_w, "-lc", inner]
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
            env=child_env,
        )
        stderr = completed.stderr.strip() if completed.stderr else ""
        stdout = completed.stdout.strip() if completed.stdout else ""
        ox = lb / "ollama"
        if ox.is_file():
            try:
                os.chmod(str(ox), 0o755)
            except OSError:
                pass
        _agent_debug_ndjson(
            hypothesis_id="H6-tarball-result",
            location="run_tarball_user_local_install:after",
            message="user-prefix installer finished",
            data={
                "returncode": completed.returncode,
                "stderr_head": stderr[:900],
                "stdout_head": stdout[:400],
                "binary_exists": ox.is_file(),
                "runId": "immutable-root",
            },
        )
        if stdout:
            shell_log(stdout)
        if stderr:
            shell_log(stderr)
        if completed.returncode != 0:
            return False, stderr or stdout or "user-prefix tarball install exited non-zero"
        if not ox.is_file():
            return False, f"No ollama binary at {ox} after extract."
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Ollama download/extract timed out (try Desktop Konsole on good Wi‑Fi)."
    except Exception as exc:
        return False, str(exc)


def run_official_linux_install(shell_log: Callable[[str], None]) -> tuple[bool, str]:
    """Install Ollama via official ``install.sh``. Returns (ok, stderr_or_message)."""
    if _prefer_user_prefix_ollama_install_linux():
        ok, err = run_tarball_user_local_install(shell_log)
        if ok:
            _prepend_home_local_bin_to_environ(shell_log)
        return ok, err

    uid = getattr(os, "getuid", lambda: -1)()
    euid = getattr(os, "geteuid", lambda: -1)()
    sudo_nopass_rc: int | None = None
    if hasattr(os, "getuid") and os.name != "nt":
        try:
            r = subprocess.run(
                ["sudo", "-n", "/usr/bin/true"],
                capture_output=True,
                text=True,
                timeout=5,
                env=_env_for_host_system_tools(),
                check=False,
            )
            sudo_nopass_rc = r.returncode
        except Exception as e:
            sudo_nopass_rc = -1
            _agent_debug_ndjson(
                hypothesis_id="H1-root-sudo-nopasswd",
                location="run_official_linux_install:pre-subprocess",
                message="sudo -n probe exception",
                data={"error_type": type(e).__name__, "repr": repr(e)[:160]},
            )
    _agent_debug_ndjson(
        hypothesis_id="H1-nonroot",
        location="run_official_linux_install:pre-subprocess",
        message="effective user ids",
        data={"uid": uid, "euid": euid, "running_as_root": euid == 0, "sudo_nopass_rc": sudo_nopass_rc},
    )
    tgt = "/usr/local/lib/ollama"
    _agent_debug_ndjson(
        hypothesis_id="H2-usrlocal-write",
        location="run_official_linux_install:fs-probe",
        message="targets for installer",
        data={
            "/usr/local": _fs_probe("/usr/local"),
            "/usr/local/lib": _fs_probe("/usr/local/lib"),
            tgt: _fs_probe(tgt),
        },
    )
    bash_w = _bash_exe()
    inner = f'curl -fsSL "{OLLAMA_OFFICIAL_INSTALL_SH}" | sh'
    child_env = _env_for_host_system_tools()
    use_sudo_nopass = (
        os.name != "nt"
        and euid != 0
        and sudo_nopass_rc == 0
        and shutil.which("sudo") is not None
    )
    if use_sudo_nopass:
        cmd = ["sudo", "-n", bash_w, "-lc", inner]
        shell_log(f"[bonsAI] Running install with sudo -n → {OLLAMA_OFFICIAL_INSTALL_SH}")
        _agent_debug_ndjson(
            hypothesis_id="H4-sudo-install-branch",
            location="run_official_linux_install:cmd",
            message="using sudo -n for curl|sh into /usr/local",
            data={"via_sudo_nopass": True},
        )
    else:
        cmd = [bash_w, "-lc", inner]
        shell_log(f"[bonsAI] Running: curl ... | sh  ({OLLAMA_OFFICIAL_INSTALL_SH})")
        if sudo_nopass_rc is not None and sudo_nopass_rc != 0:
            shell_log("[bonsAI] Hint: sudo -n unavailable; install needs root — may fail unless you use Desktop Konsole.")
        _agent_debug_ndjson(
            hypothesis_id="H4-sudo-install-branch",
            location="run_official_linux_install:cmd",
            message="install without sudo -n wrapper",
            data={"via_sudo_nopass": False, "sudo_nopass_rc": sudo_nopass_rc},
        )
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
            env=child_env,
        )
        stdout = completed.stdout.strip() if completed.stdout else ""
        stderr = completed.stderr.strip() if completed.stderr else ""
        _agent_debug_ndjson(
            hypothesis_id="H3-install-result",
            location="run_official_linux_install:post-subprocess",
            message="installer finished",
            data={
                "via_sudo_nopass": use_sudo_nopass,
                "runId": "post-fix",
                "returncode": completed.returncode,
                "stderr_head": stderr[:900],
                "stdout_head": stdout[:400],
                "env_stripped_ld": all(k not in child_env for k in ("LD_LIBRARY_PATH", "LD_PRELOAD")),
            },
        )
        if stdout:
            shell_log(stdout)
        if stderr:
            shell_log(stderr)
        if completed.returncode != 0:
            return False, stderr or stdout or "install script exited non-zero"
        _prepend_home_local_bin_to_environ(shell_log)
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Installation timed out (try installing Ollama from Desktop Konsole)."
    except Exception as exc:
        return False, str(exc)


def try_restart_ollama_user_service(shell_log: Callable[[str], None]) -> None:
    """Best-effort systemd user unit start for common SteamOS / Linux layouts."""
    for args in (
        ["systemctl", "--user", "try-restart", "ollama"],
        ["systemctl", "--user", "start", "ollama"],
    ):
        shell_log(f"[bonsAI] Trying: {' '.join(args)}")
        try:
            r = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
                env=_env_for_host_system_tools(),
            )
            if r.stdout.strip():
                shell_log(r.stdout.strip())
            if r.stderr.strip():
                shell_log(r.stderr.strip())
        except Exception as exc:
            shell_log(str(exc))


def run_ollama_pull(
    ollama_bin: str,
    tag: str,
    shell_log: Callable[[str], None],
    cancelled: Callable[[], bool],
) -> tuple[bool, str]:
    """Run ``ollama pull <tag>`` (blocking); fail-fast if return code non-zero."""
    shell_log(f"[bonsAI] ollama pull {tag}")
    if cancelled():
        return False, "Cancelled."
    try:
        proc = subprocess.Popen(
            [ollama_bin, "pull", tag],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=_env_for_ollama_cli(ollama_bin),
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            if cancelled():
                proc.send_signal(signal.SIGTERM)
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                return False, "Cancelled."
            line = line.rstrip("\n")
            if line:
                shell_log(line)
        code = proc.wait()
        if code != 0:
            return False, f"ollama pull {tag} failed with exit code {code}"
        return True, ""
    except Exception as exc:
        return False, str(exc)


async def run_local_setup(
    *,
    profile: str,
    state: dict[str, Any],
    logger: Any,
    cancel_event: asyncio.Event,
) -> None:
    """Populate ``state`` while installing / pulling models. Plain dict for JSON-RPC compatibility."""

    def log(msg: str) -> None:
        _append_log(list(state.setdefault("log_tail", [])), msg)
        try:
            logger.info("local_ollama_setup: %s", msg[:500])
        except Exception:
            pass

    def cancelled() -> bool:
        return cancel_event.is_set()

    try:
        state.setdefault("phase", "running")
        state["stage"] = "check"
        state["done"] = False
        state["error"] = ""
        state["profile"] = profile
        tags = tier1_foss_recommended_pull_tags(profile)
        if not tags:
            raise RuntimeError(f"Unknown pull profile: {profile!r}.")
        state["pull_tags"] = list(tags)
        state["total_pull_steps"] = len(tags)
        models_dir = os.environ.get("OLLAMA_MODELS") or str(Path.home() / ".ollama" / "models")
        log("[bonsAI] Local Ollama setup started.")
        log(f"[bonsAI] Model blobs store: {models_dir} (override with OLLAMA_MODELS).")
        log(f"[bonsAI] Profile {profile!r}: {len(tags)} pull step(s); output streams below when the CLI prints lines.")

        if sys.platform.startswith("win"):
            raise RuntimeError("Local Ollama setup runs on SteamOS/Linux only.")

        ollama_bin = resolve_ollama_executable()
        if not ollama_bin:
            state["stage"] = "install"
            log("[bonsAI] ollama not found on PATH; running official installer…")
            ok, err = await asyncio.to_thread(lambda: run_official_linux_install(log))
            if not ok:
                raise RuntimeError(
                    "Could not install Ollama automatically. "
                    "Open Desktop mode → Konsole — on immutable SteamOS use the user install from README if needed:\n"
                    f'curl -fsSL "{OLLAMA_OFFICIAL_INSTALL_SH}" | sh\n'
                    "Then switch back here and retry. "
                    + (f" Details: {err}" if err else "")
                )

        _prepend_home_local_bin_to_environ(log)

        ollama_bin = resolve_ollama_executable()
        if not ollama_bin:
            raise RuntimeError("Installation finished but ``ollama`` was not found on PATH. Try opening a new shell or reboot.")

        state["stage"] = "service"
        if not probe_ollama_http_ok(DEFAULT_BASE):
            log("[bonsAI] Ollama not responding on localhost:11434; trying user systemd unit…")
            await asyncio.to_thread(lambda: try_restart_ollama_user_service(log))
            await asyncio.sleep(1.0)

        ok_listen = await asyncio.to_thread(lambda: ensure_ollama_server_listening_before_pull(log, ollama_bin, cancelled))
        if not ok_listen:
            raise RuntimeError(
                "Ollama server is not running on localhost:11434 — ``ollama pull`` needs the API. "
                "Opening Desktop Konsole and running ``ollama serve`` once fixes this."
            )

        state["stage"] = "pull"
        for i, tag in enumerate(tags):
            if cancelled():
                raise RuntimeError("Cancelled.")
            state["pull_step"] = i + 1
            state["current_tag"] = tag
            ok, err = await asyncio.to_thread(lambda t=tag: run_ollama_pull(ollama_bin, t, log, cancelled))
            if cancelled():
                raise RuntimeError("Cancelled.")
            if not ok:
                raise RuntimeError(err or f"Failed to pull {tag}")

        state["stage"] = "complete"
        state["phase"] = "done"
        state["done"] = True
        state["current_tag"] = ""
        log("[bonsAI] Local Ollama setup finished.")

    except Exception as exc:
        msg = str(exc)
        log(f"[bonsAI] Setup stopped: {msg}")
        is_cancelled = cancel_event.is_set()
        state["phase"] = "cancelled" if is_cancelled else "failed"
        state["error"] = msg
        state["done"] = True
        if not is_cancelled:
            try:
                logger.exception("local_ollama_setup failed")
            except Exception:
                pass
    finally:
        if cancel_event.is_set():
            terminate_setup_started_ollama_serve()


def new_local_ollama_setup_state() -> dict[str, Any]:
    """Fresh status dict returned from ``get_local_ollama_setup_status`` when idle."""
    return {
        "phase": "idle",
        "stage": "",
        "profile": "",
        "pull_tags": [],
        "pull_step": 0,
        "total_pull_steps": 0,
        "current_tag": "",
        "log_tail": [],
        "error": "",
        "done": True,
        "accepted": False,
        "cancel_requested": False,
    }
