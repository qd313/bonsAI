"""Ollama HTTP transport: streaming ``/api/chat``, unload/stop helpers, and process cleanup.

Prompt/policy construction lives in :mod:`backend.services.ollama_prompts`; public prompt helpers are
re-exported here so imports like ``from backend.services.ollama_service import build_system_prompt`` stay stable.
"""

import json
import os
import shutil
import signal
import socket
import sys
import subprocess
import urllib.error
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from refactor_helpers import normalize_ollama_base

from backend.services.strategy_guide_parse import extract_strategy_guide_branches
from backend.services.ollama_prompts import (
    append_deck_tdp_sysfs_grounding,
    build_system_prompt,
    format_ai_response,
    question_matches_troubleshooting_log_context,
    user_asks_ollama_bonsai_host_or_latency,
    user_consents_strategy_spoilers,
    user_wants_power_or_performance_topic,
)

# Smaller than 64KiB so Stop re-checks ``cancel_requested`` more often while ``read()`` blocks on slow streams.
OLLAMA_CHAT_READ_CHUNK = 4096

def _ollama_http_base_from_pc_ip_field(pc_ip: str) -> str:
    """Resolve ``http://host:port`` used for Ollama API calls (same as chat URL base)."""
    raw = (pc_ip or "").strip() or "127.0.0.1:11434"
    _, _, base = normalize_ollama_base(raw)
    return base


def _is_loopback_ollama_base(base_http: str) -> bool:
    try:
        h = urlparse(base_http).hostname or ""
        return h in ("127.0.0.1", "localhost", "::1", "[::1]")
    except Exception:
        return False


def _guess_ollama_cli_paths() -> list[str]:
    """PATH + typical install paths — Decky's Python PATH often misses ``~/.local/bin``."""
    out: list[str] = []
    seen: set[str] = set()

    def _add(candidate: Optional[str]) -> None:
        if not candidate:
            return
        p = os.path.abspath(os.path.expanduser(candidate))
        if not os.path.isfile(p) or not os.access(p, os.X_OK):
            return
        if p in seen:
            return
        seen.add(p)
        out.append(p)

    _add(shutil.which("ollama"))
    _add(os.path.expanduser("~/.local/bin/ollama"))
    for fixed in (
        "/home/deck/.local/bin/ollama",
        "/usr/local/bin/ollama",
        "/usr/bin/ollama",
    ):
        _add(fixed)
    return out


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


def post_ollama_chat(
    url: str,
    model_name: str,
    messages: list,
    request_timeout_seconds: int,
    normalized_attachments: list,
    prepared_images: list,
    attachment_warnings: list,
    attachment_errors: list,
    logger: Any,
    ask_mode: str = "speed",
    keep_alive: str = "5m",
    cancel_requested: Optional[Callable[[], bool]] = None,
    on_http_response_opened: Optional[Callable[[Any], None]] = None,
    on_http_response_done: Optional[Callable[[], None]] = None,
) -> dict:
    """Execute one Ollama chat request attempt and return a normalized success/error payload."""

    def _should_cancel() -> bool:
        return bool(cancel_requested and cancel_requested())

    # Strategy replies include branching JSON plus optional cheat section — allow more tokens than speed/deep defaults.
    num_predict = 900 if ask_mode == "strategy" else 500
    body_dict = {
        "model": model_name,
        "messages": messages,
        # stream:true returns HTTP headers + HTTPResponse promptly; stream:false buffers the full completion first.
        "stream": True,
        "keep_alive": keep_alive,
        "options": {
            "num_predict": num_predict,
            "temperature": 0.42 if ask_mode == "strategy" else 0.4,
        },
    }
    # Keep transport payload shape explicit so backend/frontend contracts remain stable.
    payload = json.dumps(body_dict).encode("utf-8")
    logger.info(
        "ask_ollama: POST %s model=%s payload_bytes=%d",
        url,
        model_name,
        len(payload),
    )
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=request_timeout_seconds) as resp:
            if on_http_response_opened:
                try:
                    on_http_response_opened(resp)
                except Exception:
                    logger.exception("ask_ollama: on_http_response_opened hook failed model=%s", model_name)
            try:
                pending = b""
                deltas: list[str] = []
                stream_err_txt: Optional[str] = None
                done_flag = False

                def _apply_stream_obj(jo: dict) -> None:
                    nonlocal stream_err_txt, done_flag
                    err_any = jo.get("error")
                    if err_any is not None:
                        if isinstance(err_any, dict):
                            stream_err_txt = str(
                                err_any.get("message") or err_any.get("detail") or "ollama error"
                            )
                        else:
                            stream_err_txt = str(err_any)
                    msg_blk = jo.get("message") if isinstance(jo.get("message"), dict) else {}
                    mc = msg_blk.get("content")
                    if isinstance(mc, str) and mc:
                        deltas.append(mc)
                    if jo.get("done"):
                        done_flag = True

                while True:
                    if _should_cancel():
                        try:
                            resp.close()
                        except Exception:
                            pass
                        logger.info("ask_ollama: cancelled mid-request model=%s", model_name)
                        return {
                            "success": False,
                            "response": "Request stopped (connection closed).",
                            "cancelled": True,
                        }
                    while True:
                        nl = pending.find(b"\n")
                        if nl < 0:
                            break
                        line = pending[:nl].strip()
                        pending = pending[nl + 1 :]
                        if not line:
                            continue
                        try:
                            jo = json.loads(line.decode("utf-8", "replace"))
                        except json.JSONDecodeError:
                            if _should_cancel():
                                return {
                                    "success": False,
                                    "response": "Request stopped (connection closed).",
                                    "cancelled": True,
                                }
                            logger.warning(
                                "ask_ollama: NDJSON decode skip model=%s line=%s",
                                model_name,
                                line[:200],
                            )
                            continue
                        if isinstance(jo, dict):
                            _apply_stream_obj(jo)
                        if done_flag:
                            break
                    if done_flag:
                        break
                    try:
                        chunk = resp.read(OLLAMA_CHAT_READ_CHUNK)
                    except Exception as exc:
                        if _should_cancel():
                            logger.info("ask_ollama: read interrupted by cancel model=%s (%s)", model_name, exc)
                            return {
                                "success": False,
                                "response": "Request stopped (connection closed).",
                                "cancelled": True,
                            }
                        raise
                    if not chunk:
                        break
                    pending += chunk
                if pending.strip():
                    try:
                        jo_tail = json.loads(pending.strip().decode("utf-8", "replace"))
                    except json.JSONDecodeError:
                        jo_tail = None
                    if isinstance(jo_tail, dict):
                        _apply_stream_obj(jo_tail)
                if stream_err_txt:
                    return {
                        "success": False,
                        "response": (
                            f"Ollama streamed an error for model '{model_name}'. "
                            f"{stream_err_txt[:600]}"
                        ),
                        "body": stream_err_txt[:4000],
                    }
                assistant_raw = "".join(deltas)
                if _should_cancel():
                    return {
                        "success": False,
                        "response": "Request stopped (connection closed).",
                        "cancelled": True,
                    }
                text = assistant_raw.strip() or "No response text."
                strategy_guide_branches = None
                if ask_mode == "strategy":
                    visible, strategy_guide_branches = extract_strategy_guide_branches(text)
                    text = visible
                text = format_ai_response(
                    text,
                    normalized_attachments,
                    prepared_images,
                    attachment_errors,
                )
                if attachment_warnings:
                    logger.info("ask_ollama: attachment warnings: %s", "; ".join(attachment_warnings))
                logger.info("ask_ollama: OK model=%s response_len=%d", model_name, len(text))
                return {
                    "success": True,
                    "response": text,
                    "model": model_name,
                    "assistant_raw": assistant_raw,
                    "strategy_guide_branches": strategy_guide_branches,
                }
            finally:
                if on_http_response_done:
                    try:
                        on_http_response_done()
                    except Exception:
                        logger.exception("ask_ollama: on_http_response_done hook failed model=%s", model_name)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.warning(
            "ask_ollama: HTTPError code=%s model=%s body_len=%d",
            e.code,
            model_name,
            len(body),
        )
        return {
            "success": False,
            "response": (
                f"Ollama returned HTTP {e.code} for model '{model_name}'. "
                "Check the host Ollama log; the full error body is not copied into the chat UI."
            ),
            "status": e.code,
            "body": body,
        }
    except urllib.error.URLError as e:
        if isinstance(e.reason, (TimeoutError, socket.timeout)):
            return {
                "success": False,
                "response": (
                    f"Ollama did not respond within {request_timeout_seconds} seconds. "
                    "Check that Ollama is running and your PC IP is correct."
                ),
            }
        return {
            "success": False,
            "response": (
                f"Could not reach Ollama at the configured host for model '{model_name}'. "
                "Verify PC IP, firewall, and that Ollama is listening."
            ),
        }
    except Exception as e:
        if cancel_requested and cancel_requested():
            logger.info("ask_ollama: treating error as cancel model=%s err=%s", model_name, e)
            return {
                "success": False,
                "response": "Request stopped (connection closed).",
                "cancelled": True,
            }
        logger.exception("ask_ollama: unexpected error model=%s", model_name)
        return {
            "success": False,
            "response": f"Ollama request failed for model '{model_name}'. Check the Deck plugin log.",
        }
