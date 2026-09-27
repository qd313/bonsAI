"""Title: Actually stopping the AI when Stop is pressed

Purpose: When someone presses Stop mid-answer, this is the chain that makes the AI really
stop, not just the UI -- while leaving the model loaded, so the next question starts warm (the
maintainer's call, 2026-09-26). Closing the live network connection is the stop: Ollama cancels a
request once its client goes away. Nothing is unloaded on a normal Stop.

Used for: `spawn_ollama_stop_thread()` is what the Stop-button RPC calls; it runs
`best_effort_abort_ollama_inference()` on a background thread so Stop returns to the screen
right away. `close_ollama_chat_response()` is called separately, from the Stop RPC and from the
thread that is actually blocked reading the stream, to unblock it and end the connection.

Solves: Until 2026-09-26 every Stop also unloaded the model (network unload, then `ollama stop`,
then ending the AI worker processes), because a network unload could report success while work
already running kept going. That cost a cold load on the next question, every time. The unload
chain is now a safety net only: on the Deck's own Ollama, the worker's processor use is watched
after Stop, and the chain fires only if the worker stays busy for the whole watch
(`RUNNER_BUSY_WATCH_SECONDS`) with no newer question started. A worker that goes quiet once --
the normal case, within a second or two of the connection closing -- ends the watch and the
model stays loaded. A remote Ollama is never unloaded: it cannot be watched from here, and a
network unload was never the thing that stopped its work.

Does not: Decide *when* Stop should fire -- that is `abort_background_game_ai` in main.py.
This is only the "how".
"""

import json
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Optional

from backend.ollama_connectivity import (
    guess_ollama_cli_paths,
    is_loopback_ollama_base,
    ollama_http_base_from_pc_ip_field,
)


def _ollama_http_base_from_pc_ip_field(pc_ip: str) -> str:
    return ollama_http_base_from_pc_ip_field(pc_ip)


def _is_loopback_ollama_base(base_http: str) -> bool:
    return is_loopback_ollama_base(base_http)


def _guess_ollama_cli_paths() -> list[str]:
    return guess_ollama_cli_paths()


def close_ollama_chat_response(response: Any, logger: Any) -> bool:
    """Close a live /api/chat response from another thread to unblock its blocking `read()`.

    This is how Stop actually stops: the streaming read sits in `read()` on the worker thread and
    nothing else will wake it. Closing the handle from the RPC thread makes that read raise, which
    is the intended path — hence the broad except. Returns True if the close succeeded.
    """
    if response is None:
        return False
    try:
        response.close()
        logger.info("closed active urllib HTTP response (cross-thread unblock read)")
        return True
    except Exception as exc:
        logger.warning("close active HTTP response failed: %s", exc)
        return False


def spawn_ollama_stop_thread(
    pc_ip_field: str,
    model_name: Optional[str],
    logger: Any,
    *,
    newer_request_started: Optional[Callable[[], bool]] = None,
) -> threading.Thread:
    """Run the after-Stop watch off the event loop and without waiting for it.

    Deliberately fire-and-forget: Stop must return to the UI immediately, and the watch lasts a
    few seconds normally, up to about ``RUNNER_BUSY_WATCH_SECONDS`` for a worker that will not
    quiet down. ``newer_request_started`` tells the watch when the player has asked again, so it
    never mistakes the new question's work for the stopped one's. Returns the thread so callers
    (and tests) can join it; production ignores it.
    """

    def _stop_bg() -> None:
        try:
            best_effort_abort_ollama_inference(
                pc_ip_field=pc_ip_field,
                model_name=model_name if isinstance(model_name, str) else None,
                logger=logger,
                newer_request_started=newer_request_started,
            )
        except Exception:
            logger.exception("after-Stop watch failed")

    thread = threading.Thread(target=_stop_bg, name="bonsai-ollama-stop", daemon=True)
    thread.start()
    return thread


def request_ollama_stop_model_via_api(
    base_http: str,
    model_name: str,
    logger: Any,
    *,
    timeout_seconds: float = 20.0,
) -> bool:
    """
    Cancel in-flight generation and unload the model (same idea as CLI ``ollama stop``):

    POST ``/api/generate`` with minimal prompt + ``keep_alive: 0``.

    Builds differ — retry shapes seen upstream (empty prompt, whitespace prompt, ``\"0s\"`` keep-alive).
    """
    mn = str(model_name or "").strip()
    if not mn:
        return False
    url = f"{base_http.rstrip('/')}/api/generate"
    variants: list[dict] = [
        {"model": mn, "prompt": "", "keep_alive": 0, "stream": False},
        {"model": mn, "prompt": " ", "keep_alive": 0, "stream": False},
        {"model": mn, "prompt": "", "keep_alive": "0s", "stream": False},
        {"model": mn, "prompt": "", "keep_alive": 0},
    ]

    last_err: Optional[BaseException] = None
    for body_obj in variants:
        payload = json.dumps(body_obj).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                raw = resp.read(65536)
            try:
                parsed = json.loads((raw or b"{}").decode("utf-8", errors="replace") or "{}")
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict) and parsed.get("error"):
                err_txt = str(parsed.get("error") or "")
                logger.warning(
                    "request_ollama_stop_model_via_api: HTTP 200 but JSON error model=%s err=%s",
                    mn,
                    err_txt[:300],
                )
                last_err = RuntimeError(err_txt or "ollama error in body")
                continue
            logger.info(
                "request_ollama_stop_model_via_api: POST /api/generate unload ok model=%s variant_keys=%s",
                mn,
                sorted(body_obj.keys()),
            )
            return True
        except urllib.error.HTTPError as he:
            last_err = he
            try:
                snippet = he.read().decode("utf-8", errors="replace")[:420]
            except Exception:
                snippet = ""
            logger.warning(
                "request_ollama_stop_model_via_api: HTTP %s model=%s body=%r snippet=%s",
                he.code,
                mn,
                body_obj,
                snippet,
            )
        except urllib.error.URLError as err:
            last_err = err
            logger.warning(
                "request_ollama_stop_model_via_api: URL error model=%r body=%s err=%s",
                mn,
                body_obj,
                err,
            )
        except Exception as exc:
            last_err = exc
            logger.warning(
                "request_ollama_stop_model_via_api: failed model=%s body_obj=%s err=%s",
                mn,
                body_obj,
                exc,
            )

    if last_err is not None:
        logger.warning(
            "request_ollama_stop_model_via_api: all unload variants exhausted model=%s last_err=%s",
            mn,
            last_err,
        )
    return False


def try_ollama_cli_stop_model(model_name: str, logger: Any, *, timeout_seconds: float = 25.0) -> bool:
    """
    Fallback on the Deck: invoke ``ollama stop <tag>`` if we locate a binary.

    Uses sanitized env via local-setup helpers so Steam-runtime ``LD_*`` does not break the binary.
    """
    mn = str(model_name or "").strip()
    if not mn:
        return False
    candidates = _guess_ollama_cli_paths()
    if not candidates:
        logger.info("try_ollama_cli_stop_model: no ollama binary found — skip CLI stop")
        return False
    try:
        from backend.services.local_ollama_setup_service import _env_for_ollama_cli as _cli_env_for  # noqa: PLC0415
    except Exception as exc:
        logger.warning("try_ollama_cli_stop_model: import env helper failed err=%s", exc)
        return False

    for ob in candidates:
        env = _cli_env_for(ob)
        try:
            proc = subprocess.run(
                [ob, "stop", mn],
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            if proc.returncode == 0:
                logger.info("try_ollama_cli_stop_model: %s stop %s ok", ob, mn)
                return True
            logger.warning(
                "try_ollama_cli_stop_model: %s exited %s stderr=%s",
                ob,
                proc.returncode,
                (proc.stderr or "")[:500],
            )
        except subprocess.TimeoutExpired:
            logger.warning("try_ollama_cli_stop_model: timeout %s stopping model=%s", ob, mn)
            return False
        except Exception as exc:
            logger.warning("try_ollama_cli_stop_model: %s invoke err=%s", ob, exc)
    return False


def _linux_ollama_runner_pids(logger: Any = None, *, limit: int = 24) -> list[int]:
    """Same-UID processes whose command line names an Ollama *runner* (the AI worker)."""
    my_uid = os.getuid()
    my_pid = os.getpid()
    found: list[int] = []
    try:
        entries = sorted(os.listdir("/proc"), key=lambda x: int(x) if x.isdigit() else 10**18)
    except OSError as exc:
        if logger is not None:
            logger.debug("ollama runner scan: list /proc err=%s", exc)
        return found
    for name in entries:
        if not name.isdigit():
            continue
        pid = int(name)
        if pid == my_pid:
            continue
        try:
            with open(os.path.join("/proc", name, "status"), encoding="utf-8") as fh:
                uid_line = None
                for line in fh:
                    if line.startswith("Uid:"):
                        uid_line = line
                        break
            if uid_line is None:
                continue
            proc_uid = int(uid_line.split()[1])
        except (OSError, ValueError):
            continue
        if proc_uid != my_uid:
            continue
        try:
            with open(os.path.join("/proc", name, "cmdline"), "rb") as fh:
                raw = fh.read()
        except OSError:
            continue
        if not raw:
            continue
        cmd_l = raw.replace(b"\x00", b" ").decode("utf-8", "replace").lower()
        if "ollama" not in cmd_l or "runner" not in cmd_l:
            continue
        found.append(pid)
        if len(found) >= limit:
            break
    return found


def try_sigterm_linux_ollama_runner_procs(logger: Any, _model_name: str = "") -> int:
    """
    Linux-only last resort after unload + ``ollama stop``: terminate same-UID processes whose cmdline matches
    an Ollama *runner*. Some builds leave inference workers pegging CPU briefly or longer after CLI stop succeeds.
    Only the safety net in ``best_effort_abort_ollama_inference`` calls this, never a normal Stop.
    """
    if sys.platform != "linux":
        return 0
    killed: list[int] = []
    for pid in _linux_ollama_runner_pids(logger):
        try:
            os.kill(pid, signal.SIGTERM)
            killed.append(pid)
        except OSError as exc:
            logger.debug("sigterm_linux_ollama_runners: kill pid=%s err=%s", pid, exc)
    if killed:
        logger.info(
            "try_sigterm_linux_ollama_runner_procs: sent SIGTERM to %d ollama runner proc(s)",
            len(killed),
        )
    return len(killed)


# The after-Stop watch. A cancelled answer lets go of the processor within a second or two of the
# connection closing; the settle wait covers that. A Stop pressed while the model is still reading
# a long prompt (or still loading) keeps the worker busy until its first word, when the reader sees
# the Stop and closes -- tens of seconds on the Deck at worst -- so the watch runs long enough that
# such a worker goes quiet on its own before the net would ever fire.
STOP_SETTLE_SECONDS = 3.0
RUNNER_SAMPLE_SECONDS = 2.0
RUNNER_BUSY_WATCH_SECONDS = 90.0
# Cores' worth of processor time the AI workers must be using, together, to count as busy. An idle
# loaded model sits near zero; a generating one keeps at least one core fully occupied.
RUNNER_BUSY_CORES = 0.5


def _cpu_ticks_from_stat_text(text: str) -> Optional[int]:
    """User plus system processor ticks from one ``/proc/<pid>/stat`` line.

    The process name sits in brackets and may itself hold spaces or brackets, so the fields are
    read from after the *last* closing bracket: there, index 11 is utime and 12 is stime.
    """
    try:
        fields = text.rsplit(")", 1)[1].split()
        return int(fields[11]) + int(fields[12])
    except (IndexError, ValueError):
        return None


def _proc_cpu_ticks(pid: int) -> Optional[int]:
    try:
        with open(os.path.join("/proc", str(pid), "stat"), encoding="utf-8", errors="replace") as fh:
            return _cpu_ticks_from_stat_text(fh.read())
    except OSError:
        return None


def _clock_ticks_per_second() -> int:
    try:
        return int(os.sysconf("SC_CLK_TCK")) or 100
    except (AttributeError, ValueError, OSError):
        return 100


def sample_linux_ollama_runner_cpu_cores(
    window_seconds: float,
    *,
    platform: Optional[str] = None,
    sleep: Callable[[float], None] = time.sleep,
    logger: Any = None,
) -> Optional[float]:
    """How many cores the Ollama AI workers used, together, over one window.

    ``None`` means it cannot be measured here (not Linux). No workers at all reads as 0.0: there
    is nothing left running to stop. A worker that exits during the window is left out.
    """
    if (platform or sys.platform) != "linux":
        return None
    pids = _linux_ollama_runner_pids(logger)
    if not pids:
        return 0.0
    before = {pid: _proc_cpu_ticks(pid) for pid in pids}
    sleep(window_seconds)
    used = 0
    for pid, start in before.items():
        end = _proc_cpu_ticks(pid)
        if start is not None and end is not None and end >= start:
            used += end - start
    return used / float(_clock_ticks_per_second()) / max(window_seconds, 1e-6)


def _unload_stuck_local_model(base: str, model_name: str, logger: Any) -> None:
    """The pre-2026-09-26 Stop chain, now the safety net only: network unload, then ``ollama
    stop`` (an HTTP unload can return 200 while processor work keeps running), then ending any
    worker process still left."""
    request_ollama_stop_model_via_api(base, model_name, logger)
    try_ollama_cli_stop_model(model_name, logger)
    try_sigterm_linux_ollama_runner_procs(logger, model_name)


def best_effort_abort_ollama_inference(
    *,
    pc_ip_field: str,
    model_name: Optional[str],
    logger: Any,
    newer_request_started: Optional[Callable[[], bool]] = None,
    sample_runner_cpu_cores: Optional[Callable[[float], Optional[float]]] = None,
    sleep: Callable[[float], None] = time.sleep,
) -> str:
    """
    After the user presses Stop (connection closed + threading Event set), make sure the answer's
    work really ended -- without unloading the model.

    Step by step:

    - Remote Ollama (a PC): nothing more. Closing the connection is what cancels its work, and its
      processor cannot be watched from here. Returns ``"left_loaded_remote"``.
    - Local Ollama (the Deck): wait ``STOP_SETTLE_SECONDS``, then sample the AI workers' processor
      use every ``RUNNER_SAMPLE_SECONDS``. The first quiet sample ends the watch with the model
      still loaded (``"left_loaded"``, the normal outcome). A newer question at any point ends it
      too (``"newer_request"``): the busy worker is now doing that question's work.
    - Safety net: only if every sample for ``RUNNER_BUSY_WATCH_SECONDS`` found the workers busy,
      and no newer question started, run the old unload chain (``"unloaded_stuck_runner"``). That
      is the case the unload was first added for -- work that kept running after Stop.
    - If the workers cannot be measured (not Linux), keep the model (``"cannot_measure"``).
    """
    base = _ollama_http_base_from_pc_ip_field(pc_ip_field)
    mn = str(model_name or "").strip() if model_name is not None else ""
    if not mn:
        logger.info("best_effort_abort_ollama_inference: no active model snapshot — nothing to watch.")
        return "no_model"
    if not _is_loopback_ollama_base(base):
        logger.info(
            "best_effort_abort_ollama_inference: remote Ollama host — connection closed, model left loaded (%s)",
            mn,
        )
        return "left_loaded_remote"

    newer = newer_request_started or (lambda: False)
    sampler = sample_runner_cpu_cores or (
        lambda window: sample_linux_ollama_runner_cpu_cores(window, sleep=sleep, logger=logger)
    )
    newer_msg = "best_effort_abort_ollama_inference: a newer question started — watch ended, model left loaded"
    sleep(STOP_SETTLE_SECONDS)
    samples = max(1, int(RUNNER_BUSY_WATCH_SECONDS // RUNNER_SAMPLE_SECONDS))
    last_cores = 0.0
    for _ in range(samples):
        if newer():
            logger.info(newer_msg)
            return "newer_request"
        cores = sampler(RUNNER_SAMPLE_SECONDS)
        if cores is None:
            logger.info("best_effort_abort_ollama_inference: cannot watch the AI worker here — model left loaded (%s)", mn)
            return "cannot_measure"
        if cores < RUNNER_BUSY_CORES:
            logger.info(
                "best_effort_abort_ollama_inference: AI worker quiet after Stop (%.2f cores) — model left loaded (%s)",
                cores,
                mn,
            )
            return "left_loaded"
        last_cores = cores
    if newer():
        logger.info(newer_msg)
        return "newer_request"
    logger.warning(
        "best_effort_abort_ollama_inference: AI worker still busy %.0f s after Stop (%.2f cores) — "
        "unloading %s as a last resort",
        RUNNER_BUSY_WATCH_SECONDS,
        last_cores,
        mn,
    )
    _unload_stuck_local_model(base, mn, logger)
    return "unloaded_stuck_runner"
