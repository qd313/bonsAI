"""Title: The one raw streamed call to Ollama

Purpose: This is the single HTTP call that actually talks to Ollama's ``/api/chat`` endpoint
and reads the answer back as it is typed, one small piece at a time. It periodically publishes
what has arrived so far to whoever is showing the live-typing effect, and checks constantly
whether the person has pressed Stop so a long answer can be interrupted promptly.

Used for: `_stream_ollama_chat_once()` is called once per attempt by the entry point in
ollama_service.py, which drives the retry loop (soft continue on a cut-off answer, silent
retry when a model cannot "think") around this one call.

Solves: The mechanics of reading a streamed NDJSON response -- buffering partial lines,
throttling how often a partial parse runs, freezing the "thinking to first answer" clock,
and shaping every kind of failure (HTTP error, timeout, cancelled, malformed stream) into the
same small dict shape -- are involved enough to deserve their own file, separate from the
retry and formatting logic built on top of them.

Does not: Decide whether to retry, stitch a soft continue back together, or format the final
reply -- that is the entry point in ollama_service.py. This file makes exactly one request
and returns.
"""

import json
import math
import socket
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Optional

from backend.constants import OLLAMA_TAB_WHERE_AI_RUNS

from backend.services.bonsai_stream_tags import extract_bonsai_status
from backend.services.strategy_guide_parse import hide_incomplete_strategy_branch_fence
from backend.services.token_accounting_service import known_window_tokens, resolve_window_tokens
from backend.services.ollama_window_fit import (
    MIN_VISIBLE_NUM_PREDICT,
    clamp_num_predict_to_window,
    estimate_prompt_tokens,
    ollama_base_from_chat_url,
    prompt_window_warning,
)

# The most one read takes from the stream. The loop reads with ``read1``, which hands back whatever
# the model has already sent, up to this cap, instead of ``read``, which waits for the whole cap to
# fill. One streamed piece is about 135 bytes, so ``read(4096)`` held about 30 pieces back before
# passing any on: measured on the Deck 2026-09-24 (plan 69), text reached the panel in lumps of about
# 115 letters every 1.5 to 2 seconds with a game running, although the model wrote a piece every
# 50 ms. Stop is re-checked after every read, so short reads also make Stop answer sooner.
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
REASONING_LIVE_CHARS = 600


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
    requested_window_tokens: int = 0,
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
    # The window is no longer assumed (2026-09-20). Ollama's default of 4,096 is not a property
    # of the model or of the machine -- the Deck's own model advertises 131,072 -- so a server
    # that has been given a bigger window was being treated as if it had not, and replies were
    # trimmed to fit room that was never the real limit.
    #
    # Asking costs a round trip, so it is not done on the ordinary path. What is known already
    # is used first; the server is only asked when that would mean shortening someone's reply.
    # That is the one moment the answer can change what a person gets, and on a prompt that
    # fits, nothing extra happens at all.
    ollama_base = ollama_base_from_chat_url(url)
    visible_num_predict = int(budgets.get("visible_num_predict") or num_predict)
    thinking_budget = int(budgets.get("thinking_budget") or 0)
    if requested_window_tokens > 0:
        # The plugin chose this size for the session, so it is also what the budget works to.
        window_tokens = requested_window_tokens
    else:
        window_tokens = known_window_tokens(ollama_base, model_name)
        if estimate_prompt_tokens(messages, model_name) + num_predict > window_tokens:
            window_tokens = resolve_window_tokens(ollama_base, model_name, logger=logger)
    # D46 follow-up: shrink the visible half of num_predict, never the thinking half, so a
    # prompt that would otherwise overflow the window sends a shorter reply instead of losing
    # its own start on the wire. A prompt that already fits gets num_predict back unchanged.
    clamped_num_predict = clamp_num_predict_to_window(
        messages,
        visible_num_predict,
        thinking_budget,
        window_tokens=window_tokens,
        model_name=model_name,
    )
    if clamped_num_predict != num_predict:
        logger.warning(
            "ask_ollama: clamping num_predict %d -> %d (visible floor %d, thinking budget %d kept "
            "whole) so a ~%d-token prompt fits the %d-token window model=%s",
            num_predict,
            clamped_num_predict,
            MIN_VISIBLE_NUM_PREDICT,
            thinking_budget,
            estimate_prompt_tokens(messages, model_name),
            window_tokens,
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
    if requested_window_tokens > 0:
        # Say how much room this needs rather than accepting the server's default, which on the
        # Deck is 4,096 against a model that can hold 131,072. The same number is sent on every
        # request of the session on purpose: a DIFFERENT number makes the server reload the model,
        # measured at 5.7 to 8.1 seconds idle and 10 to 16 with a game running, while repeating the
        # same one costs nothing (measured 0.0 seconds, three times over).
        body_dict["options"]["num_ctx"] = requested_window_tokens
    payload = json.dumps(body_dict).encode("utf-8")
    window_warning = prompt_window_warning(
        messages, num_predict, window_tokens=window_tokens, model_name=model_name
    )
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
                        chunk = resp.read1(OLLAMA_CHAT_READ_CHUNK)
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
