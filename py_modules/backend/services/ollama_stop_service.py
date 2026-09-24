"""Title: Actually stopping the AI when Stop is pressed

Purpose: When someone presses Stop mid-answer, this is the chain that makes the AI really
stop, not just the UI. It closes the live network connection so the streaming read wakes up,
then asks Ollama over the network to unload the model, and on the Deck's own local Ollama,
follows up with the AI program's own stop command and, as a last resort, ends any AI worker
process still running by hand.

Used for: `spawn_ollama_stop_thread()` is what the Stop-button RPC calls; it runs
`best_effort_abort_ollama_inference()` on a background thread so Stop returns to the screen
right away instead of waiting for the unload to finish. `close_ollama_chat_response()` is
called separately, from the thread that is actually blocked reading the stream, to unblock it.

Solves: A network "unload" can report success while work already running on the processor
keeps going. Trying the network call, then the local stop command, then a direct process end,
in that order, is what actually stops a stuck local model -- one step alone is not reliable.

Does not: Decide *when* Stop should fire -- that is `abort_background_game_ai` in main.py.
This is only the "how".
"""

import json
import os
import signal
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from typing import Any, Optional

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
) -> threading.Thread:
    """Ask Ollama to stop and unload, off the event loop and without waiting for it.

    Deliberately fire-and-forget: Stop must return to the UI immediately, and the unload can take
    seconds. Returns the thread so callers (and tests) can join it; production ignores it.
    """

    def _stop_bg() -> None:
        try:
            best_effort_abort_ollama_inference(
                pc_ip_field=pc_ip_field,
                model_name=model_name if isinstance(model_name, str) else None,
                logger=logger,
            )
        except Exception:
            logger.exception("kill/unload helper failed")

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


def try_sigterm_linux_ollama_runner_procs(logger: Any, _model_name: str = "") -> int:
    """
    Linux-only last resort after unload + ``ollama stop``: terminate same-UID processes whose cmdline matches
    an Ollama *runner*. Some builds leave inference workers pegging CPU briefly or longer after CLI stop succeeds.
    """
    if sys.platform != "linux":
        return 0
    my_uid = os.getuid()
    my_pid = os.getpid()
    killed: list[int] = []
    try:
        entries = sorted(os.listdir("/proc"), key=lambda x: int(x) if x.isdigit() else 10**18)
    except OSError as exc:
        logger.debug("sigterm_linux_ollama_runners: list /proc err=%s", exc)
        return 0
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
        try:
            os.kill(pid, signal.SIGTERM)
            killed.append(pid)
        except OSError as exc:
            logger.debug("sigterm_linux_ollama_runners: kill pid=%s err=%s", pid, exc)
        if len(killed) >= 24:
            break
    if killed:
        logger.info(
            "try_sigterm_linux_ollama_runner_procs: sent SIGTERM to %d ollama runner proc(s)",
            len(killed),
        )
    return len(killed)


def best_effort_abort_ollama_inference(
    *,
    pc_ip_field: str,
    model_name: Optional[str],
    logger: Any,
) -> None:
    """
    After the user presses Stop (HTTP read abort + threading Event), aggressively wind down inference:

    - POST ``/api/generate`` unload on whichever host backs ``pc_ip_field`` (LAN or localhost).
    - On **localhost Ollama**, also run ``ollama stop <tag>`` **after** the API attempt: HTTP unload can
      return 200 while CPU-offloaded inference keeps running; CLI ``stop`` is documented to abort in-flight work.

    Prefer this over naive PID kills: Ollama owns runner processes; unloading + ``ollama stop`` is the supported pair.
    """
    base = _ollama_http_base_from_pc_ip_field(pc_ip_field)
    mn = str(model_name or "").strip() if model_name is not None else ""
    if not mn:
        logger.info("best_effort_abort_ollama_inference: no active model snapshot — skipping server stop.")
        return
    request_ollama_stop_model_via_api(base, mn, logger)
    # On-loopback: always run `ollama stop` after unload API (HTTP unload alone can leave CPU offload running).
    if _is_loopback_ollama_base(base):
        logger.info(
            "best_effort_abort_ollama_inference: localhost Ollama — running ollama stop after unload API (%s)",
            mn,
        )
        try_ollama_cli_stop_model(mn, logger)
        try_sigterm_linux_ollama_runner_procs(logger, mn)
    else:
        logger.info(
            "best_effort_abort_ollama_inference: remote Ollama host — unload API only (no local ollama CLI).",
        )
