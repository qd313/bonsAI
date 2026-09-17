"""Title: Talking to the AI over the network

Purpose: This is the file that actually opens the connection to Ollama and reads an answer back,
word by word, as it is written. It sends the request, watches the words arrive, and if the AI
stops early because it hit its own length limit before finishing a thought, it quietly asks it to
keep going and stitches the pieces into one answer, rather than handing back something cut off
mid-sentence. It is also what actually stops the AI when a person presses Stop, checks whether an
Ollama host is reachable and what it has loaded, and warms up a small model at startup so the
first question of a session is not the slow one.

Used for: Every live call to Ollama from an Ask question or a background job. Other files also
import several prompt-building helpers through this file rather than reaching into
ollama_prompts directly, so there is one shared door for both.

Solves: One place owns the actual wire conversation with Ollama — opening the streamed
connection, stitching a cut-off answer back together, and shutting it down cleanly on Stop — so
that logic exists exactly once instead of being copied wherever an Ask is sent.

Does not: Decide the wording of a prompt or which rules go into it — that is ollama_prompts.
Decide how many words a reply is allowed, or how much of that is reasoning versus the visible
answer — those budgets live in ollama_ask_budgets. This file only carries the budget it is given
out to Ollama and back.

How it works:

    post_ollama_chat()
       |
       v
    one streamed request to Ollama  (_stream_ollama_chat_once)
       |
       +-- the AI stopped because it hit its own length limit,
       |   not because it was finished, and there are tries left?
       |      yes -> quietly ask it to keep going, stitch the new
       |             words onto the end, and go around again
       |      no  -> the answer is finished
       |
       +-- the AI refused to "think" about this one at all?
       |      first time only -> retry once with thinking off,
       |                         and remember that for next time
       v
    finished answer (raw text + what should actually be shown)
       |
       v
    Strategy mode: pull out any branch-picker / checklist blocks
       |
       v
    format_ai_response()  (final cleanup, from ollama_prompts)
       |
       v
    the reply a person actually sees

Stopping an in-progress answer follows its own chain, each step only tried because the one
before it is not reliable enough on its own:

    Stop pressed
       |
       v
    ask Ollama over the network to unload the model  (request_ollama_stop_model_via_api)
       |
       v   (local AI only — a network "unload" can report success while
       |    work already running on the processor keeps going)
    run the AI program's own stop command directly    (try_ollama_cli_stop_model)
       |
       v   (still local; last resort, when the above still leaves something running)
    end any leftover AI worker process by hand         (try_sigterm_linux_ollama_runner_procs)

1. `post_ollama_chat()` is the entry point. It works out the reply-length and thinking budget for
   the question's mode, then drives the loop above: one streamed call per attempt
   (`_stream_ollama_chat_once()`), automatically continuing a cut-off answer up to a set number of
   times, and retrying once, silently, if the model turns out not to support "thinking" at all —
   remembered afterward via `mark_model_without_thinking()` so later questions on that model skip
   straight to asking without it.
2. `_stream_ollama_chat_once()` is the one raw HTTP call. It sends the request, reads the AI's
   answer as a stream of small pieces, periodically publishes what has arrived so far to whoever
   is showing the live-typing effect, and checks constantly whether the person has pressed Stop so
   a long answer can be interrupted promptly rather than only at the very end.
3. Before it sends anything, `clamp_num_predict_to_window()` checks whether the question plus its
   reply budget would be too big for what the model can actually hold in mind at once. If so, it
   shrinks the reply's allowance — never the thinking allowance, since a person who asked for
   extra reasoning gets to keep it — so the AI answers a bit shorter rather than silently losing
   the start of its own instructions, which is a worse failure that looks like a fine, confident
   answer with nothing behind it.
4. Once a full answer is in hand, and only in Strategy mode, any branch-picker or checklist blocks
   the model wrote are pulled out for the UI to render as buttons rather than as raw text.
   `format_ai_response()` (from ollama_prompts) does the final cleanup pass before the reply goes
   back to the caller.
5. Stopping a question in progress is handled separately, by `best_effort_abort_ollama_inference()`,
   which runs the three-step chain drawn above. Only the network step runs against a remote
   Ollama host; the other two only make sense against the AI running on the Deck itself.
6. Two smaller, unrelated jobs also live here: `probe_ollama_health()` reads whether an Ollama
   host is reachable and what it currently has loaded, for the Connection panel; and
   `preload_ask_model_sync()` warms one small, already-installed model into memory once at
   startup — picked by `pick_preload_model()` to match the model Ask would actually reach for —
   so the very first question of a session is not the one paying to load a model from disk.
"""

import json
import math
import os
import re
import shutil
import signal
import socket
import sys
import subprocess
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from backend.constants import OLLAMA_TAB_WHERE_AI_RUNS
from backend.ollama_connectivity import (
    guess_ollama_cli_paths,
    is_loopback_ollama_base,
    ollama_http_base_from_pc_ip_field,
)
from backend.ollama_routing import resolve_routing_order
from backend.ollama_urls import normalize_ollama_base

from backend.services.bonsai_stream_tags import extract_bonsai_status
from backend.services.ollama_ask_budgets import (
    SOFT_CONTINUE_CUE,
    SOFT_CONTINUE_USER_MESSAGE,
    mark_model_without_thinking,
    model_supports_thinking,
    resolve_ask_token_budgets,
    strip_soft_continue_cue,
)
from backend.services.strategy_guide_parse import (
    extract_strategy_guide_branches,
    extract_strategy_checklist,
    hide_incomplete_strategy_branch_fence,
    hide_incomplete_strategy_checklist_fence,
)
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

# Minimum gap between partial-text parses while a stream is running.
#
# Every content delta used to re-join the whole answer and re-run two regex passes over it, so the
# per-token cost grew with the answer — and it was paid whether or not token streaming was enabled,
# because the same hook also carries model-emitted ``<bonsai-status>`` thinking blurbs.
#
# 0.1s composes with the two cadences downstream: the snapshot store throttles at
# ``Plugin.PARTIAL_RESPONSE_FLUSH_INTERVAL_S`` (0.12s) and the frontend polls at 150ms, so parsing
# faster than this produces text nobody reads. The terminal parse is a separate call site and is
# never throttled — the final answer must not depend on timing.
OLLAMA_DELTA_PARSE_INTERVAL_S = 0.1

# Plan 57: the back end now keeps what a thinking model thinks instead of throwing it away.
# REASONING_LIVE_CHARS is how much of the thinking the live status line carries while the answer
# is still pending (newest text only, so a long think does not balloon every poll).
# REASONING_TEXT_CAP_CHARS is the most that gets saved once the answer is done (D108: big enough
# to hold a whole Deep think in the common case). REASONING_CUT_NOTE is the one line stitched onto
# the front when a think ran over the cap, so a reopened chat shows an honest "this was trimmed"
# instead of text that just starts mid-sentence.
REASONING_LIVE_CHARS = 600
REASONING_TEXT_CAP_CHARS = 6000
REASONING_CUT_NOTE = "(The start of this thinking was cut to fit.)\n"


def cap_reasoning_text(full_text: str, cap: int = REASONING_TEXT_CAP_CHARS) -> str:
    """Keep the END of a model's thinking when it runs past ``cap`` characters.

    The start is what is missing when a think overruns 6,000 characters, not the end — the end is
    the part closest to the answer, and the part most worth keeping. When trimmed, one line is
    stitched onto the front saying so; that line does not count against the 6,000.
    """
    if len(full_text) <= cap:
        return full_text
    return REASONING_CUT_NOTE + full_text[-cap:]


def _ollama_http_base_from_pc_ip_field(pc_ip: str) -> str:
    return ollama_http_base_from_pc_ip_field(pc_ip)


def _is_loopback_ollama_base(base_http: str) -> bool:
    return is_loopback_ollama_base(base_http)


def _guess_ollama_cli_paths() -> list[str]:
    return guess_ollama_cli_paths()


def vram_weight_share_pct(size_bytes: Any, size_vram_bytes: Any) -> Optional[float]:
    """Approximate share of a loaded model's weights that Ollama reports as GPU-visible.

    Ollama's /api/ps gives `size` (total) and `size_vram` (the part in VRAM). The ratio is a
    rough health signal, not an exact measurement — a model can report `size_vram > size`, which
    is clamped to 100% rather than treated as an error. Returns None when the total is unusable,
    which the UI renders as "unknown" rather than as 0%.
    """
    try:
        total = int(size_bytes or 0)
        in_vram = int(size_vram_bytes or 0)
    except (TypeError, ValueError):
        return None
    if total <= 0 or in_vram < 0:
        return None
    return round(100.0 * min(in_vram, total) / total, 1)


def _loaded_model_snapshots(ps_data: Any) -> list[dict[str, Any]]:
    """Shape /api/ps into the per-model rows the Connection panel shows.

    Deliberately not defensive per row: a malformed payload raises, and `probe_ollama_health`
    turns that into an empty list for the whole endpoint. That is the behavior this code had
    inline in the RPC, and it is the right one — a partly-parsed list of loaded models would be
    more misleading than none.
    """
    out: list[dict[str, Any]] = []
    for m in ps_data.get("models", []) or []:
        size_bytes = int(m.get("size") or 0)
        vram_bytes = int(m.get("size_vram") or 0)
        out.append(
            {
                "name": str(m.get("name") or m.get("model") or "?"),
                "size_bytes": size_bytes,
                "size_vram_bytes": vram_bytes,
                "vram_weight_share_pct_appx": vram_weight_share_pct(size_bytes, vram_bytes),
            }
        )
    return out


def probe_ollama_health(base: str, deadline: float) -> dict[str, Any]:
    """Read /api/version, /api/tags and /api/ps from an Ollama host.

    `deadline` is an absolute `time.time()` value; each request gets whatever is left of it, with
    a 0.25s floor so a already-expired deadline still makes one honest attempt rather than raising
    a confusing negative-timeout error.

    **Version and tags are required** — if either fails this raises, and the caller decides whether
    that means "unreachable" or "try starting the local runtime and retry". /api/ps is optional:
    older Ollama builds do not serve it, so a failure there yields an empty list rather than
    failing a host that is otherwise healthy.
    """
    ver_timeout = max(0.25, deadline - time.time())
    ver_req = urllib.request.Request(f"{base}/api/version", method="GET")
    ver_resp = urllib.request.urlopen(ver_req, timeout=ver_timeout)
    ver_data = json.loads(ver_resp.read().decode("utf-8"))
    version_local = ver_data.get("version", "unknown")

    tags_timeout = max(0.25, deadline - time.time())
    tags_req = urllib.request.Request(f"{base}/api/tags", method="GET")
    tags_resp = urllib.request.urlopen(tags_req, timeout=tags_timeout)
    tags_data = json.loads(tags_resp.read().decode("utf-8"))
    models_local = [m.get("name", "?") for m in tags_data.get("models", [])]

    ps_snapshots: list[dict[str, Any]] = []
    ps_timeout = max(0.25, deadline - time.time())
    try:
        ps_req = urllib.request.Request(f"{base}/api/ps", method="GET")
        ps_resp = urllib.request.urlopen(ps_req, timeout=ps_timeout)
        ps_snapshots = _loaded_model_snapshots(json.loads(ps_resp.read().decode("utf-8")))
    except Exception:
        ps_snapshots = []

    return {"version": version_local, "models": models_local, "ps_loaded": ps_snapshots}


# Boot-time preload (roadmap: Speed-mode VRAM preload, developer switch first) only ever warms a
# model at or under this size, so the switch can never accidentally load a big model at startup.
PRELOAD_MAX_PARAMETER_BILLIONS = 3.0


def parse_parameter_size_billions(raw: Any) -> Optional[float]:
    """Parse Ollama's ``details.parameter_size`` (``"3.8B"``, ``"893M"``) into billions of params.

    Anything that does not match returns ``None`` -- an unparsable or missing size is treated as
    unknown, never as "small enough", so preload never guesses at a model it cannot measure.
    """
    if not isinstance(raw, str):
        return None
    match = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([BM])\s*$", raw.strip(), re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    return value if match.group(2).upper() == "B" else value / 1000.0


def _installed_sizes(tags_models: Any) -> "dict[str, Optional[float]]":
    """Installed model name -> billions of parameters, or ``None`` when Ollama did not say."""
    out: "dict[str, Optional[float]]" = {}
    if not isinstance(tags_models, list):
        return out
    for entry in tags_models:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name") or entry.get("model")
        if not isinstance(name, str) or not name.strip():
            continue
        details = entry.get("details")
        out[name] = (
            parse_parameter_size_billions(details.get("parameter_size"))
            if isinstance(details, dict)
            else None
        )
    return out


def pick_preload_model(tags_models: Any, try_order: Any = None) -> Optional[str]:
    """The model Ask will actually reach for, when it is small enough to be worth warming.

    **The try order decides which model; the size cap only decides whether to bother.** Warming
    *some* small model is worse than warming none: it spends memory on a model no question will
    touch and leaves the first question exactly as slow as before. Measured on the Deck
    2026-09-05 (PRELOAD-01): the only installed model under the cap was ``qwen2.5:1.5b`` at 1.5B,
    while Ask was routed to ``gemma4:e2b-it-qat`` at 4.6B. Picking "the first small one" would
    have loaded a model that never answers anything.

    So when Ask's first installed model is over ``PRELOAD_MAX_PARAMETER_BILLIONS``, the answer is
    ``None``. Warming nothing is the honest outcome of the roadmap's "models of 3B or under" —
    not warming something else instead.

    ``try_order`` is ``text_model_routing_order`` from settings. With none given (a fresh install
    that has never saved one) this falls back to the first small installed model, skipping
    embedding models: they are small enough to pass any cap and can never answer a question, so
    on this Deck the 137M ``nomic-embed-text`` would otherwise have been a candidate.

    A model whose size Ollama did not report is skipped rather than guessed at.
    """
    sizes = _installed_sizes(tags_models)
    if not sizes:
        return None

    def small_enough(name: str) -> bool:
        size_b = sizes.get(name)
        return size_b is not None and size_b <= PRELOAD_MAX_PARAMETER_BILLIONS

    if isinstance(try_order, list):
        for wanted in try_order:
            if not isinstance(wanted, str) or not wanted.strip():
                continue
            if wanted not in sizes:
                continue  # in the try order but not installed: Ask would fall through it too
            return wanted if small_enough(wanted) else None

    for name in sizes:
        if "embed" in name.lower():
            continue
        if small_enough(name):
            return name
    return None


def preload_ask_model_sync(
    base_http: str,
    logger: Any,
    *,
    timeout_seconds: float = 20.0,
    settings: Any = None,
) -> None:
    """Best-effort warm of a small installed model into Ollama's memory, once, at boot.

    Reads the installed model list from ``GET /api/tags``, picks the model Ask would actually reach
    for when it is at or under ``PRELOAD_MAX_PARAMETER_BILLIONS`` billion parameters
    (``pick_preload_model``), and sends a
    zero-token ``POST /api/generate`` (empty ``prompt``) -- Ollama's documented way to load a
    model into memory without generating anything.

    Never raises. A missing host, no eligible small model installed, or the host declining the
    warm request for lack of memory are all silent no-ops here on purpose: the roadmap entry
    calls for "skip silently -- no error, no toast, no stuck status line," because this is a
    startup nicety, never something the plugin should surface as broken. There is no retry and no
    polling loop behind this; the caller runs it once, at boot, and never again.
    """
    try:
        tags_req = urllib.request.Request(f"{base_http.rstrip('/')}/api/tags", method="GET")
        with urllib.request.urlopen(tags_req, timeout=min(5.0, timeout_seconds)) as resp:
            tags_data = json.loads(resp.read().decode("utf-8"))
        models_list = tags_data.get("models") if isinstance(tags_data, dict) else None
        # Ask's own resolver, so the warm-up and the Ask agree on which model comes first. It
        # covers the case a saved order cannot: an empty order (never set, which is the state on
        # a fresh install and was the state on the maintainer's Deck) still resolves to the
        # order Ask would build for itself from what is installed.
        try_order = None
        if isinstance(settings, dict):
            installed = [
                str(e.get("name") or e.get("model") or "")
                for e in (models_list or [])
                if isinstance(e, dict)
            ]
            try_order = resolve_routing_order(False, settings, [t for t in installed if t])
        model = pick_preload_model(models_list, try_order)
        if not model:
            logger.info("preload_ask_model: no eligible small model installed, skipping")
            return
        body = json.dumps({"model": model, "prompt": ""}).encode("utf-8")
        gen_req = urllib.request.Request(
            f"{base_http.rstrip('/')}/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(gen_req, timeout=timeout_seconds) as resp:
            resp.read()
        logger.info("preload_ask_model: warmed %s", model)
    except Exception as exc:
        logger.info("preload_ask_model: skipped (%s)", exc)


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


def _is_thinking_unsupported_error(status: Any, body: str) -> bool:
    """True when Ollama rejected the request because the model cannot think.

    Matched loosely on purpose: the wording is not a stable API surface, and the cost of a
    miss is only that the graceful fallback does not fire (the Ask still fails with the
    plain HTTP error it would have failed with anyway), never a wrong answer. The 400 body
    is logged by the caller so the real string can be confirmed on-device.
    """
    if status != 400:
        return False
    text = (body or "").lower()
    if "think" not in text:
        return False
    return "not support" in text or "unsupported" in text or "does not accept" in text


# Decision D46 (2026-09-01). Measured on the Deck: Ollama 0.32.15 loads gemma4:e2b-it-qat with
# context_length 4096 and nothing here sets num_ctx. A prompt that does not fit is not rejected;
# Ollama keeps the *end* and drops the *start*, which is the identity block, the rules and the
# cards, and the user sees a confident answer with nothing behind it. This is the warning D46
# asked for, in place of raising the window (a separate, measured call).
ASSUMED_CONTEXT_WINDOW_TOKENS = 4096
# Prose and log text on this model run about 3.5 characters per token; an estimate on the low
# side of that keeps the warning honest rather than early.
_PROMPT_CHARS_PER_TOKEN = 3.5


def estimate_prompt_tokens(messages: list) -> int:
    """Rough token count for the text of a chat request; images are not counted."""
    chars = 0
    for m in messages or []:
        if isinstance(m, dict):
            chars += len(str(m.get("content") or ""))
    return int(chars / _PROMPT_CHARS_PER_TOKEN)


def prompt_window_warning(
    messages: list,
    num_predict: int,
    *,
    window_tokens: int = ASSUMED_CONTEXT_WINDOW_TOKENS,
) -> Optional[str]:
    """One-line warning when prompt + reply budget would not fit the assumed window, else None."""
    est = estimate_prompt_tokens(messages)
    need = est + int(num_predict or 0)
    if need <= window_tokens:
        return None
    return (
        f"ask_ollama: prompt ~{est} tokens + num_predict {int(num_predict or 0)} = {need} exceeds the "
        f"assumed {window_tokens}-token window by ~{need - window_tokens}; Ollama keeps the end of the "
        "prompt and drops its start silently (identity, rules, cards). Trim what is attached (D46)."
    )


# D46 follow-up (2026-09-06): the warning above told the log the truth and left the Ask
# unchanged, so the prompt still lost its start on the wire. Once the prompt itself is slimmed
# and the knowledge-base block moved late, most overflow left is exactly the visible reply
# budget stacked on top of a thinking budget (Strategy + thinking medium runs ~2,800 prompt
# tokens against a 2,112 reply budget in a 4,096 window). Shrinking the visible half instead of
# sending the request unchanged means the reply is short rather than the prompt losing its
# identity, rules and cards. The thinking budget is never touched -- a user who turned thinking
# on asked for that reasoning headroom specifically.
MIN_VISIBLE_NUM_PREDICT = 600


def clamp_num_predict_to_window(
    messages: list,
    visible_num_predict: int,
    thinking_budget: int,
    *,
    window_tokens: int = ASSUMED_CONTEXT_WINDOW_TOKENS,
    floor_visible: int = MIN_VISIBLE_NUM_PREDICT,
) -> int:
    """Wire ``num_predict`` (visible + thinking) shrunk so the prompt fits, thinking left whole.

    Returns ``visible_num_predict + thinking_budget`` unchanged when it already fits. Otherwise
    takes the overflow out of the visible share only, down to ``floor_visible`` -- past that
    point the floor is sent anyway (a short reply beats a prompt that loses its start), and the
    caller's own ``prompt_window_warning`` still fires on the result.
    """
    est = estimate_prompt_tokens(messages)
    total = int(visible_num_predict) + int(thinking_budget)
    if est + total <= window_tokens:
        return total
    room_for_visible = window_tokens - est - int(thinking_budget)
    new_visible = max(int(floor_visible), room_for_visible)
    return new_visible + int(thinking_budget)


def _stream_ollama_chat_once(
    url: str,
    model_name: str,
    messages: list,
    request_timeout_seconds: int,
    logger: Any,
    budgets: dict,
    ask_mode: str,
    keep_alive: str,
    cancel_requested: Optional[Callable[[], bool]],
    on_http_response_opened: Optional[Callable[[Any], None]],
    on_http_response_done: Optional[Callable[[], None]],
    on_delta: Optional[Callable[..., None]],
    *,
    raw_prefix: str = "",
    emit_done_delta: bool = True,
    reasoning_prefix: str = "",
    reasoning_first_ts: Optional[float] = None,
    reasoning_frozen_seconds: Optional[float] = None,
) -> dict:
    """One streamed ``/api/chat`` POST. Returns raw/visible text; does not format the final reply.

    ``raw_prefix`` is prior soft-continue assistant raw. Partial parses extract status/fence
    over ``raw_prefix + this segment`` so leading spaces on a continue chunk are not stripped
    away from the stitch boundary.

    ``reasoning_prefix`` / ``reasoning_first_ts`` / ``reasoning_frozen_seconds`` are the same idea
    for the model's *thinking* text (plan 57): a soft continue keeps one thinking buffer and one
    "first thinking chunk" clock across both requests, so the caller hands back in what it got out
    last time. ``reasoning_first_ts`` is ``None`` until the first thinking chunk of the whole
    exchange arrives. ``reasoning_frozen_seconds`` is ``None`` until the first answer chunk of the
    whole exchange arrives, at which point it is set once and never changed again — a thinking
    chunk that shows up after that does not move it.
    """

    def _should_cancel() -> bool:
        return bool(cancel_requested and cancel_requested())

    num_predict = int(budgets.get("num_predict") or 800)
    think_wire = budgets.get("think", False)
    # D46 follow-up: shrink the visible half of num_predict, never the thinking half, so a
    # prompt that would otherwise overflow the window sends a shorter reply instead of losing
    # its own start on the wire. A prompt that already fits gets num_predict back unchanged.
    visible_num_predict = int(budgets.get("visible_num_predict") or num_predict)
    thinking_budget = int(budgets.get("thinking_budget") or 0)
    clamped_num_predict = clamp_num_predict_to_window(messages, visible_num_predict, thinking_budget)
    if clamped_num_predict != num_predict:
        logger.warning(
            "ask_ollama: clamping num_predict %d -> %d (visible floor %d, thinking budget %d kept "
            "whole) so a ~%d-token prompt fits the %d-token window model=%s",
            num_predict,
            clamped_num_predict,
            MIN_VISIBLE_NUM_PREDICT,
            thinking_budget,
            estimate_prompt_tokens(messages),
            ASSUMED_CONTEXT_WINDOW_TOKENS,
            model_name,
        )
    num_predict = clamped_num_predict
    body_dict = {
        "model": model_name,
        "messages": messages,
        # stream:true returns HTTP headers + HTTPResponse promptly; stream:false buffers the full completion first.
        "stream": True,
        "keep_alive": keep_alive,
        # Bug v1 default: think false so the whole num_predict budget goes to visible output.
        # C1 reserves a separate thinking budget; effort control (Phase 1) enables think later.
        "think": think_wire,
        "options": {
            "num_predict": num_predict,
            "temperature": 0.42 if ask_mode == "strategy" else 0.4,
        },
    }
    payload = json.dumps(body_dict).encode("utf-8")
    window_warning = prompt_window_warning(messages, num_predict)
    if window_warning:
        logger.warning(window_warning)
    logger.info(
        "ask_ollama: POST %s model=%s payload_bytes=%d num_predict=%d think=%s",
        url,
        model_name,
        len(payload),
        num_predict,
        think_wire,
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
                # The model's own thinking text, kept in a buffer separate from the answer
                # (``deltas``) so the two never get mixed up on the way to the screen.
                thinking_deltas: list[str] = []
                local_first_thinking_ts = reasoning_first_ts
                local_frozen_seconds = reasoning_frozen_seconds
                stream_err_txt: Optional[str] = None
                done_flag = False
                done_meta: dict = {}
                # 0.0 so the first delta always parses: it is what flips the snapshot's ``streaming``
                # flag, which is the frontend's only cue to switch to the fast poll.
                last_delta_parse = 0.0

                def _publish_partial(joined: str) -> None:
                    if not on_delta:
                        return
                    _thinking, _visible = extract_bonsai_status(raw_prefix + joined)
                    _visible = hide_incomplete_strategy_branch_fence(_visible)
                    _reasoning_buf = reasoning_prefix + "".join(thinking_deltas)
                    _reasoning_partial = _reasoning_buf[-REASONING_LIVE_CHARS:] if _reasoning_buf else None
                    _reasoning_seconds: Optional[int] = None
                    if local_frozen_seconds is not None:
                        _reasoning_seconds = local_frozen_seconds
                    elif local_first_thinking_ts is not None:
                        _reasoning_seconds = int(time.monotonic() - local_first_thinking_ts)
                    on_delta(
                        _visible,
                        False,
                        _thinking,
                        reasoning_partial=_reasoning_partial,
                        reasoning_seconds=_reasoning_seconds,
                    )

                def _apply_stream_obj(jo: dict) -> None:
                    nonlocal stream_err_txt, done_flag, last_delta_parse, local_first_thinking_ts, local_frozen_seconds
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
                    mt = msg_blk.get("thinking")
                    got_content = isinstance(mc, str) and bool(mc)
                    got_thinking = isinstance(mt, str) and bool(mt)
                    if got_thinking:
                        thinking_deltas.append(mt)
                        if local_first_thinking_ts is None:
                            local_first_thinking_ts = time.monotonic()
                    if got_content:
                        deltas.append(mc)
                        # First answer chunk of the whole exchange: freeze the "first thinking to
                        # first answer" clock right here. A thinking chunk that arrives later is
                        # still appended to the buffer, but this number does not move again — the
                        # folded line's seconds must read the same the whole time the answer streams.
                        if local_frozen_seconds is None and local_first_thinking_ts is not None:
                            local_frozen_seconds = max(
                                1, math.ceil(time.monotonic() - local_first_thinking_ts)
                            )
                    if (got_content or got_thinking) and on_delta:
                        _now = time.monotonic()
                        if (_now - last_delta_parse) >= OLLAMA_DELTA_PARSE_INTERVAL_S:
                            last_delta_parse = _now
                            try:
                                _publish_partial("".join(deltas))
                            except Exception:
                                logger.exception(
                                    "ask_ollama: on_delta hook failed model=%s", model_name
                                )
                    if jo.get("done"):
                        done_flag = True
                        for _k in ("done_reason", "eval_count", "prompt_eval_count"):
                            if jo.get(_k) is not None:
                                done_meta[_k] = jo.get(_k)

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
                if not done_flag:
                    assistant_so_far = "".join(deltas)
                    if assistant_so_far.strip():
                        msg = (
                            f"Ollama stream ended before completion for model '{model_name}'. "
                            "Partial output was not used as the final answer."
                        )
                    else:
                        msg = (
                            f"Ollama returned an incomplete stream for model '{model_name}' "
                            "(no completion marker and no assistant text)."
                        )
                    logger.warning("ask_ollama: %s", msg)
                    return {"success": False, "response": msg}
                assistant_raw = "".join(deltas)
                # Rule 7 (plan 57): the model spent its whole budget thinking and the stream ended
                # with no answer at all. There is no first-answer-chunk to freeze the clock at, so
                # it freezes here instead, at the end of the stream. A soft continue never reaches
                # this branch with reasoning already frozen from an earlier segment and no content
                # this segment — ``should_continue`` only fires when this segment's own text was
                # non-empty, so "no answer yet" can only happen on the very first segment.
                if (
                    local_first_thinking_ts is not None
                    and local_frozen_seconds is None
                    and not assistant_raw.strip()
                ):
                    local_frozen_seconds = max(1, math.ceil(time.monotonic() - local_first_thinking_ts))
                reasoning_buffer_out = reasoning_prefix + "".join(thinking_deltas)
                thinking_summary, visible_full = extract_bonsai_status(raw_prefix + assistant_raw)
                visible_full = hide_incomplete_strategy_branch_fence(visible_full or "")
                # Permanent completion telemetry: done_reason=length with raw_len=0 means the
                # model spent the whole num_predict budget on hidden thinking (the bug behind
                # "no response" on gemma4) — keep this line so that failure mode stays visible.
                logger.info(
                    "ask_ollama: stream done model=%s done_reason=%s eval_count=%s prompt_eval=%s "
                    "raw_len=%d visible_len=%d num_predict=%d think=%s",
                    model_name,
                    done_meta.get("done_reason"),
                    done_meta.get("eval_count"),
                    done_meta.get("prompt_eval_count"),
                    len(assistant_raw),
                    len(visible_full or ""),
                    num_predict,
                    think_wire,
                )
                if on_delta and emit_done_delta:
                    try:
                        on_delta(visible_full, True, thinking_summary)
                    except Exception:
                        logger.exception("ask_ollama: on_delta terminal hook failed model=%s", model_name)
                if _should_cancel():
                    return {
                        "success": False,
                        "response": "Request stopped (connection closed).",
                        "cancelled": True,
                    }
                return {
                    "success": True,
                    "assistant_raw": assistant_raw,
                    "thinking_summary": thinking_summary,
                    "visible_raw": visible_full,
                    "done_reason": done_meta.get("done_reason"),
                    "eval_count": done_meta.get("eval_count"),
                    "prompt_eval_count": done_meta.get("prompt_eval_count"),
                    # Plan 57: this segment's thinking, handed back so a soft continue can carry it
                    # (and the "first thinking chunk" clock) into the next request.
                    "reasoning_buffer": reasoning_buffer_out,
                    "reasoning_first_ts": local_first_thinking_ts,
                    "reasoning_frozen_seconds": local_frozen_seconds,
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
            "thinking_unsupported": _is_thinking_unsupported_error(e.code, body),
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
    except (TimeoutError, socket.timeout):
        return {
            "success": False,
            "timed_out": True,
            "response": (
                f"Ollama did not finish within {request_timeout_seconds} seconds for model '{model_name}'. "
                "On Steam Deck this usually means inference is on CPU — configure Ollama to use the GPU, "
                f"or pull a smaller model in {OLLAMA_TAB_WHERE_AI_RUNS} (e.g. qwen2.5:1.5b for Speed mode)."
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
    on_delta: Optional[Callable[..., None]] = None,
    *,
    think_effort: str = "off",
) -> dict:
    """Execute an Ollama chat attempt with soft continue on ``done_reason=length``.

    Soft continue: up to ``max_continues`` re-issues when the model hits the visible
    ``num_predict`` wall. An ephemeral ``Continuing…`` cue is published on the stream
    tail between segments and stripped before the final reply is persisted.

    Thinking fallback: a model that rejects ``think`` gets one silent retry with thinking
    off and is remembered for the session, so the setting degrades to a no-op on models
    that cannot think rather than failing the Ask.
    """
    # A model that already rejected thinking this session skips straight to off: without
    # this, every Ask on that model would burn a failed round trip re-learning the same fact.
    if not model_supports_thinking(model_name):
        think_effort = "off"
    budgets = resolve_ask_token_budgets(ask_mode, think_effort=think_effort)
    mode = str(budgets.get("ask_mode") or "speed")
    max_continues = int(budgets.get("max_continues") or 0)

    stitched_raw_parts: list[str] = []
    stitched_visible = ""
    last_thinking: Optional[str] = None
    continue_count = 0
    final_done_reason: Any = None
    thinking_fell_back = False
    thinking_retry_done = False
    # Plan 57: the model's thinking, carried across a soft continue the same way the visible
    # answer is (``stitched_raw_parts`` above) -- one buffer, one "first thinking chunk" clock,
    # for the whole exchange even when it takes two requests.
    reasoning_buffer_raw = ""
    reasoning_first_ts: Optional[float] = None
    reasoning_frozen_seconds: Optional[float] = None

    def _visible_from_raw(raw: str) -> tuple[Optional[str], str]:
        thinking, visible = extract_bonsai_status(raw)
        return thinking, hide_incomplete_strategy_branch_fence(visible or "")

    def _clear_continue_cue() -> None:
        if not on_delta:
            return
        try:
            on_delta(stitched_visible, False, last_thinking)
        except Exception:
            logger.exception("ask_ollama: failed to clear soft-continue cue model=%s", model_name)

    while True:
        raw_prefix = "".join(stitched_raw_parts)
        result = _stream_ollama_chat_once(
            url,
            model_name,
            messages if continue_count == 0 else (
                list(messages)
                + [
                    {"role": "assistant", "content": stitched_visible},
                    {"role": "user", "content": SOFT_CONTINUE_USER_MESSAGE},
                ]
            ),
            request_timeout_seconds,
            logger,
            budgets,
            mode,
            keep_alive,
            cancel_requested,
            on_http_response_opened,
            on_http_response_done,
            on_delta,
            raw_prefix=raw_prefix,
            emit_done_delta=False,
            reasoning_prefix=reasoning_buffer_raw,
            reasoning_first_ts=reasoning_first_ts,
            reasoning_frozen_seconds=reasoning_frozen_seconds,
        )

        if not result.get("success"):
            if result.get("cancelled"):
                _clear_continue_cue()
                return result
            # The model cannot think: retry once with thinking off rather than surfacing a
            # bare HTTP 400. Deliberately NOT a soft continue -- continue_count is untouched,
            # and stitched state is still empty because this can only fire on the first pass.
            if (
                result.get("thinking_unsupported")
                and bool(budgets.get("think"))
                and not thinking_retry_done
            ):
                thinking_retry_done = True
                thinking_fell_back = True
                mark_model_without_thinking(model_name)
                budgets = resolve_ask_token_budgets(ask_mode, think_effort="off")
                logger.info(
                    "ask_ollama: model does not support thinking — retrying without it model=%s",
                    model_name,
                )
                continue
            return result

        part_raw = str(result.get("assistant_raw") or "")
        if result.get("thinking_summary"):
            last_thinking = result.get("thinking_summary")
        final_done_reason = result.get("done_reason")
        reasoning_buffer_raw = str(result.get("reasoning_buffer") or reasoning_buffer_raw)
        reasoning_first_ts = result.get("reasoning_first_ts", reasoning_first_ts)
        reasoning_frozen_seconds = result.get("reasoning_frozen_seconds", reasoning_frozen_seconds)

        if continue_count > 0 and not part_raw.strip():
            logger.info(
                "ask_ollama: soft continue empty delta — stopping quietly "
                "continue_index=%d mode=%s visible_chars=%d",
                continue_count,
                mode,
                len(stitched_visible),
            )
            break

        stitched_raw_parts.append(part_raw)
        thinking_now, stitched_visible = _visible_from_raw("".join(stitched_raw_parts))
        if thinking_now:
            last_thinking = thinking_now

        should_continue = (
            final_done_reason == "length"
            and continue_count < max_continues
            and bool(part_raw.strip())
        )
        if not should_continue:
            break

        continue_count += 1
        logger.info(
            "ask_ollama: soft continue scheduled done_reason=length continue_index=%d "
            "mode=%s visible_chars_before=%d num_predict=%d",
            continue_count,
            mode,
            len(stitched_visible),
            int(budgets.get("num_predict") or 0),
        )
        if on_delta:
            cue_text = stitched_visible.rstrip() + "\n\n" + SOFT_CONTINUE_CUE
            try:
                on_delta(cue_text, False, last_thinking)
            except Exception:
                logger.exception("ask_ollama: soft-continue cue on_delta failed model=%s", model_name)

    assistant_raw = "".join(stitched_raw_parts)
    visible_raw = strip_soft_continue_cue(stitched_visible)
    if on_delta:
        try:
            on_delta(visible_raw, True, last_thinking)
        except Exception:
            logger.exception("ask_ollama: on_delta terminal hook failed model=%s", model_name)

    if cancel_requested and cancel_requested():
        return {
            "success": False,
            "response": "Request stopped (connection closed).",
            "cancelled": True,
        }

    text = visible_raw.strip() or "No response text."
    strategy_guide_branches = None
    strategy_checklist = None
    if mode == "strategy":
        """
        Parse the branch fence from the text that still HAS one.

        `stitched_visible` is display text: `_visible_from_raw` runs it through
        `hide_incomplete_strategy_branch_fence`, which deletes everything from the fence onward so
        raw JSON never scrolls past the user mid-stream. That helper's own docstring defers the
        picker to "the final extract" -- but the final extract used to read `stitched_visible` too,
        i.e. the one string guaranteed not to contain the thing it was looking for. So a
        perfectly-formed fence logged `branch_marker=False branch_parsed=False branch_options=0`
        and the buttons could never appear.

        Measured on device 2026-08-27, DRG Survivor running (`appid=2321470`), question "how do i
        deal with the exploders": the trace's raw API output carried a valid two-option
        ```bonsai-strategy-branches block and the log line said the model had emitted nothing. That
        contradiction is what named this line rather than the model or the frontend, after the
        report had sat open since 2026-08-23 saying "though the model produces it".

        The status tags and soft-continue cue still come off -- they are noise in every path. Only
        the fence hiding is skipped, and only here.
        """
        _, raw_visible = extract_bonsai_status(assistant_raw)
        strategy_source = strip_soft_continue_cue(raw_visible or "").strip() or text

        # Did the model even try? Checked before extraction, because extraction
        # removes the fence on success and leaves it in place on failure -- so
        # afterwards the two look identical from the outside.
        branch_marker = "bonsai-strategy-branches" in strategy_source
        checklist_marker = "bonsai-strategy-checklist" in strategy_source

        visible, strategy_guide_branches = extract_strategy_guide_branches(strategy_source)
        text = visible
        visible, strategy_checklist = extract_strategy_checklist(text)
        text = visible

        # Three failures wear the same face in the UI -- "no branch buttons
        # anywhere in the transcript" -- and nothing here used to tell them
        # apart. That is why the branch-picker report sat open with "though the
        # model produces it" in its title and no way to check the claim.
        branch_options = len((strategy_guide_branches or {}).get("options") or [])
        logger.info(
            "ask_ollama: strategy fences branch_marker=%s branch_parsed=%s branch_options=%d "
            "checklist_marker=%s checklist_parsed=%s",
            branch_marker,
            strategy_guide_branches is not None,
            branch_options,
            checklist_marker,
            strategy_checklist is not None,
        )
        if branch_marker and strategy_guide_branches is None:
            # The model emitted a fence and the parser rejected it. That is a
            # parser or prompt-contract problem, not a model one, and it is the
            # only case where the raw text is worth keeping.
            start = text.find("bonsai-strategy-branches")
            logger.warning(
                "ask_ollama: strategy branch fence present but did NOT parse; snippet=%r",
                text[max(0, start - 40) : start + 400],
            )
            # Now that extraction reads the unhidden text, an unparsed fence would otherwise be
            # shown to the user as raw JSON. Hide it for display only -- the diagnosis above has
            # already been logged from the text that still had it.
            text = hide_incomplete_strategy_branch_fence(text)
        if checklist_marker and strategy_checklist is None:
            # Same shape as the branch case above, and it had no twin until 2026-08-28. A rejected
            # checklist fence stayed in the visible answer, so the user read raw JSON -- and it was
            # also its own D-pad stop that did nothing on A. Log first, then hide for display.
            start = text.find("bonsai-strategy-checklist")
            logger.warning(
                "ask_ollama: strategy checklist fence present but did NOT parse; snippet=%r",
                text[max(0, start - 40) : start + 400],
            )
            text = hide_incomplete_strategy_checklist_fence(text)
    text = format_ai_response(
        text,
        normalized_attachments,
        prepared_images,
        attachment_errors,
    )
    if attachment_warnings:
        logger.info("ask_ollama: attachment warnings: %s", "; ".join(attachment_warnings))
    logger.info(
        "ask_ollama: OK model=%s response_len=%d soft_continues=%d done_reason=%s",
        model_name,
        len(text),
        continue_count,
        final_done_reason,
    )
    # Plan 57: "" / null / 0 when the model never thought (thinking Off, or a model that cannot
    # think) -- ``reasoning_buffer_raw`` only ever gains text from a real ``message.thinking``
    # chunk, so an empty buffer here means exactly that, not a bug.
    reasoning_full_len = len(reasoning_buffer_raw)
    reasoning_text = cap_reasoning_text(reasoning_buffer_raw) if reasoning_buffer_raw else ""
    reasoning_tokens = (reasoning_full_len // 4) if reasoning_buffer_raw else 0
    return {
        "success": True,
        "response": text,
        "model": model_name,
        "assistant_raw": assistant_raw,
        "thinking_summary": last_thinking,
        "strategy_guide_branches": strategy_guide_branches,
        "strategy_checklist": strategy_checklist,
        "done_reason": final_done_reason,
        "soft_continue_count": continue_count,
        # True when this Ask asked for thinking and the model refused, so the UI can say so
        # once instead of leaving the setting looking silently broken.
        "thinking_unsupported": thinking_fell_back,
        "ask_budgets": {
            "visible_num_predict": budgets.get("visible_num_predict"),
            "thinking_budget": budgets.get("thinking_budget"),
            "num_predict": budgets.get("num_predict"),
            "think": budgets.get("think"),
            "think_effort": budgets.get("think_effort"),
        },
        # Plan 57: the whole reasoning (capped at 6,000 characters, end kept), the whole seconds
        # from the first thinking chunk to the first answer chunk (or to the end of the stream if
        # the model never answered), and an estimate of its token count from the FULL, uncapped
        # text. See ``cap_reasoning_text`` for the cap rule.
        "reasoning_text": reasoning_text,
        "reasoning_seconds": reasoning_frozen_seconds,
        "reasoning_tokens": reasoning_tokens,
    }
