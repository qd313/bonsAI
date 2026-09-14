"""Title: Ollama connection test

Purpose: Decide whether the AI is reachable, and on this Deck try once to start it.
Used for: The Test connection button on the Connection tab, through one RPC method.
Solves: The whole decision -- bad address, unreachable host, not installed here, started
        it and it worked, started it and it still failed -- in one place that can be
        tested without a running Ollama and without the plugin object.
Does not: Log anything, or touch plugin state. It returns what happened; main.py logs it.

Lifted out of main.py on 2026-09-14 in one piece, 140 lines, with the decisions
unchanged. It had no test of its own before the move; it has one now.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

from backend.ollama_urls import normalize_ollama_base
from backend.services.local_ollama_setup_service import (
    is_loopback_ollama_host,
    local_ollama_cli_home_ready,
    recover_loopback_ollama_listening,
)
from backend.services.ollama_service import probe_ollama_health

logger = logging.getLogger("bonsai")

# Longest and shortest the caller's timeout is allowed to be, in seconds. A zero or a
# missing value means five, not one: the old code read `int(timeout_seconds or 5)`.
MIN_TIMEOUT_SECONDS = 1
MAX_TIMEOUT_SECONDS = 120
DEFAULT_TIMEOUT_SECONDS = 5

# Extra seconds allowed on top of the caller's timeout before the wait is abandoned.
# The probe gets one second; starting Ollama from cold gets thirty-five.
PROBE_GRACE_SECONDS = 1.0
RECOVERY_GRACE_SECONDS = 35.0

NO_IP_ERROR = "No PC IP provided."
NOT_INSTALLED_ERROR = "Ollama is not set up on this Deck yet. Tap Install Ollama."
UNREACHABLE_ERROR = (
    "Could not reach Ollama. Check PC IP, firewall, and that Ollama is running on the host."
)
COULD_NOT_START_ERROR = (
    "Could not start or reach Ollama on this device. Try Starter setup in Connection, "
    "or run ``ollama serve`` from Desktop Konsole."
)
STARTED_BUT_STILL_FAILING_ERROR = (
    "Ollama was started but the health check still failed. Retry the test or check "
    "~/.ollama and disk space."
)


@dataclass(frozen=True)
class ConnectionTestOutcome:
    """What happened, plus the two tidied inputs the caller logs alongside it."""

    result: dict[str, Any]
    """Exactly what the RPC hands back to the screen. Not changed by the caller."""

    host: str
    """The address as typed, trimmed. For the log line only."""

    timeout_seconds: int
    """The timeout after clamping. For the log line only."""


@dataclass(frozen=True)
class ConnectionTestTools:
    """The four outside things this decision needs, so a test can hand it fakes.

    Defaults are the real ones, so main.py calls this with no tools argument at all.
    """

    probe: Callable[[str, float], dict] = probe_ollama_health
    is_loopback: Callable[[str], bool] = is_loopback_ollama_host
    installed_here: Callable[[], bool] = local_ollama_cli_home_ready
    start_it: Callable[[Callable[[str], None]], bool] = recover_loopback_ollama_listening
    normalize: Callable[[str], tuple[str, Any, str]] = normalize_ollama_base


def clamp_timeout_seconds(timeout_seconds: Any) -> int:
    """One definition of the timeout rule, so the log line and the wait agree."""
    return max(
        MIN_TIMEOUT_SECONDS,
        min(MAX_TIMEOUT_SECONDS, int(timeout_seconds or DEFAULT_TIMEOUT_SECONDS)),
    )


def summarize_for_log(result: dict[str, Any]) -> dict[str, Any]:
    """The short version of the outcome that goes in the app log."""
    reachable = bool(result.get("reachable"))
    fields: dict[str, Any] = {
        "reachable": reachable,
        "recovery_attempted": bool(result.get("recovery_attempted")),
    }
    if reachable:
        fields["version"] = str(result.get("version", "unknown"))
        fields["model_count"] = len(result.get("models") or [])
    else:
        fields["error"] = str(result.get("error") or "")[:160]
    return fields


def _not_installed(extra: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    out: dict[str, Any] = {"reachable": False, "error": NOT_INSTALLED_ERROR}
    if extra:
        out.update(extra)
    return out


async def run_ollama_connection_test(
    pc_ip: str = "",
    timeout_seconds: int = 10,
    tools: Optional[ConnectionTestTools] = None,
) -> ConnectionTestOutcome:
    """Ping Ollama's version and model list to see whether it answers.

    On this Deck only, a failed first ping is followed by one attempt to start Ollama and
    one retry. Reaching a machine on the network is never retried -- there is nothing here
    that could start it.
    """
    tools = tools or ConnectionTestTools()
    started_at = time.time()
    safe_timeout_seconds = clamp_timeout_seconds(timeout_seconds)
    raw = (pc_ip or "").strip()

    def outcome(result: dict[str, Any]) -> ConnectionTestOutcome:
        return ConnectionTestOutcome(
            result=result, host=raw, timeout_seconds=safe_timeout_seconds
        )

    if not raw:
        return outcome({"reachable": False, "error": NO_IP_ERROR})

    host, _port, base = tools.normalize(raw)
    loopback = tools.is_loopback(host)
    deadline = started_at + safe_timeout_seconds

    def probe_once() -> dict:
        return tools.probe(base, deadline)

    recovery_attempted = False
    recovery_succeeded_before_retry: Optional[bool] = None
    tested: Optional[dict[str, Any]] = None

    try:
        tested = await asyncio.wait_for(
            asyncio.to_thread(probe_once),
            timeout=float(safe_timeout_seconds) + PROBE_GRACE_SECONDS,
        )
    except Exception:
        if not loopback:
            logger.exception("test_ollama_connection failed (non-loopback)")
            return outcome({"reachable": False, "error": UNREACHABLE_ERROR})

        if not tools.installed_here():
            return outcome(_not_installed())

        recovery_attempted = True

        def recover_log(line: str) -> None:
            try:
                logger.info(line)
            except Exception:
                pass

        try:
            recovered = await asyncio.wait_for(
                asyncio.to_thread(lambda: tools.start_it(recover_log)),
                timeout=float(safe_timeout_seconds) + RECOVERY_GRACE_SECONDS,
            )
        except Exception:
            logger.exception("recover_loopback_ollama_listening raised")
            recovered = False

        recovery_succeeded_before_retry = bool(recovered)

        if not recovered:
            return outcome(
                {
                    "reachable": False,
                    "recovery_attempted": recovery_attempted,
                    "recovery_succeeded_before_retry": False,
                    "error": COULD_NOT_START_ERROR,
                }
            )

        try:
            tested = await asyncio.wait_for(
                asyncio.to_thread(probe_once),
                timeout=float(safe_timeout_seconds) + PROBE_GRACE_SECONDS,
            )
        except Exception:
            logger.exception("test_ollama_connection failed after loopback recovery")
            return outcome(
                {
                    "reachable": False,
                    "recovery_attempted": recovery_attempted,
                    "recovery_succeeded_before_retry": True,
                    "error": STARTED_BUT_STILL_FAILING_ERROR,
                }
            )

    version = str(tested.get("version", "unknown"))
    models = list(tested.get("models", []))
    ps_loaded = list(tested.get("ps_loaded", []))

    if loopback and not tools.installed_here():
        return outcome(
            _not_installed(
                {
                    "recovery_attempted": recovery_attempted,
                    "recovery_succeeded_before_retry": recovery_succeeded_before_retry,
                }
            )
        )

    reachable: dict[str, Any] = {
        "reachable": True,
        "version": version,
        "models": models,
        "ps_loaded": ps_loaded,
    }
    if recovery_attempted:
        reachable["recovery_attempted"] = True
        reachable["recovery_succeeded_before_retry"] = recovery_succeeded_before_retry
    return outcome(reachable)
