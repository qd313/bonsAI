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
   a long answer can be interrupted promptly rather than only at the very end. That call now lives
   in ollama_chat_stream.py and is re-exported here.
3. Before it sends anything, `clamp_num_predict_to_window()` checks whether the question plus its
   reply budget would be too big for what the model can actually hold in mind at once. If so, it
   shrinks the reply's allowance — never the thinking allowance, since a person who asked for
   extra reasoning gets to keep it — so the AI answers a bit shorter rather than silently losing
   the start of its own instructions, which is a worse failure that looks like a fine, confident
   answer with nothing behind it. That check, and the smaller helpers it is built from, live in
   ollama_window_fit.py and are re-exported here.
4. Once a full answer is in hand, and only in Strategy mode, any branch-picker or checklist blocks
   the model wrote are pulled out for the UI to render as buttons rather than as raw text.
   `format_ai_response()` (from ollama_prompts) does the final cleanup pass before the reply goes
   back to the caller.
5. Stopping a question in progress is handled separately, by `best_effort_abort_ollama_inference()`,
   which runs the three-step chain drawn above. Only the network step runs against a remote
   Ollama host; the other two only make sense against the AI running on the Deck itself. The
   whole stop chain now lives in ollama_stop_service.py and is re-exported here.
6. Two smaller, unrelated jobs are re-exported here but actually live in their own files now:
   `probe_ollama_health()` (Connection-panel reachability) is in ollama_health_probe.py, and
   `preload_ask_model_sync()` (warming one small model at startup) is in
   ollama_preload_service.py.
"""

import re
import shutil
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from backend.ollama_urls import normalize_ollama_base

from backend.services.bonsai_stream_tags import extract_bonsai_status
from backend.services.ollama_chat_stream import (
    OLLAMA_CHAT_READ_CHUNK,
    OLLAMA_DELTA_PARSE_INTERVAL_S,
    REASONING_LIVE_CHARS,
    _is_thinking_unsupported_error,
    _stream_ollama_chat_once,
)
from backend.services.ollama_health_probe import (
    _loaded_model_snapshots,
    probe_ollama_health,
    vram_weight_share_pct,
)
from backend.services.ollama_preload_service import (
    PRELOAD_MAX_PARAMETER_BILLIONS,
    _installed_sizes,
    parse_parameter_size_billions,
    pick_preload_model,
    preload_ask_model_sync,
)
from backend.services.ollama_stop_service import (
    _guess_ollama_cli_paths,
    _is_loopback_ollama_base,
    _ollama_http_base_from_pc_ip_field,
    best_effort_abort_ollama_inference,
    close_ollama_chat_response,
    request_ollama_stop_model_via_api,
    spawn_ollama_stop_thread,
    try_ollama_cli_stop_model,
    try_sigterm_linux_ollama_runner_procs,
)
from backend.services.ollama_window_fit import (
    ASSUMED_CONTEXT_WINDOW_TOKENS,
    MIN_VISIBLE_NUM_PREDICT,
    clamp_num_predict_to_window,
    estimate_prompt_tokens,
    ollama_base_from_chat_url,
    prompt_window_warning,
)
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
from backend.services.token_accounting_service import (
    choose_window_tokens,
    estimate_tokens_from_chars,
    known_window_tokens,
    note_real_counts,
    note_window_granted,
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

# Plan 57: the back end now keeps what a thinking model thinks instead of throwing it away.
# REASONING_TEXT_CAP_CHARS is the most that gets saved once the answer is done (D108: big enough
# to hold a whole Deep think in the common case). REASONING_CUT_NOTE is the one line stitched onto
# the front when a think ran over the cap, so a reopened chat shows an honest "this was trimmed"
# instead of text that just starts mid-sentence.
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
    choose_window: bool = False,
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
    # How much room to ask for is a decision about the whole session, not about this question, so
    # it is made here rather than inside the streaming call, and made once. ``choose_window`` is
    # off unless a caller asks for it, which keeps the decision out of every test that only wants
    # to exercise the streaming path. See choose_window_tokens for the three rules it follows.
    requested_window_tokens = 0
    if choose_window:
        requested_window_tokens = choose_window_tokens(
            ollama_base_from_chat_url(url), model_name, logger=logger
        )
        if requested_window_tokens > 0:
            # What the server reports having loaded is exactly what was asked for -- measured on
            # the Deck 2026-09-20, including when memory was short enough that part of the model
            # spilled out of graphics memory. So this is a record of what happened, not a hope.
            note_window_granted(ollama_base_from_chat_url(url), model_name, requested_window_tokens)
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
    # The real token counts, kept instead of thrown away (2026-09-20). Ollama returns the true
    # size of what it read and what it wrote at the end of every reply; until now all three went
    # to the log and nothing else. Summed across a soft continue, because two requests really did
    # cost two prompt readings and the person waited for both.
    tokens_in_total = 0
    tokens_out_total = 0
    first_segment_prompt_tokens: Optional[int] = None
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
            requested_window_tokens=requested_window_tokens,
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
        segment_in = result.get("prompt_eval_count")
        segment_out = result.get("eval_count")
        if isinstance(segment_in, int) and segment_in > 0:
            tokens_in_total += segment_in
            if first_segment_prompt_tokens is None:
                first_segment_prompt_tokens = segment_in
        if isinstance(segment_out, int) and segment_out > 0:
            tokens_out_total += segment_out
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
    # Learn the real characters-per-token figure from what actually went out. Only the FIRST
    # segment is learned from: a soft continue re-sends the answer so far, so its prompt is a
    # different shape and its characters are not the ones ``messages`` holds. A request carrying
    # images is skipped inside note_real_counts, because image tokens have no characters behind
    # them and one such sample would make every later question look far bigger than it is.
    prompt_chars = sum(
        len(str(m.get("content") or "")) for m in (messages or []) if isinstance(m, dict)
    )
    had_images = any(
        isinstance(m, dict) and m.get("images") for m in (messages or [])
    )
    # Taken before the sample below is learned from, so the log line compares the guess this
    # request was actually sized by against what really happened -- not against itself.
    estimate_at_send_time = estimate_tokens_from_chars(prompt_chars, model_name)
    note_real_counts(
        model_name,
        prompt_chars,
        first_segment_prompt_tokens,
        had_images=had_images,
        logger=logger,
    )
    logger.info(
        "ask_ollama: OK model=%s response_len=%d soft_continues=%d done_reason=%s "
        "tokens_in=%d tokens_out=%d estimate_was=%d",
        model_name,
        len(text),
        continue_count,
        final_done_reason,
        tokens_in_total,
        tokens_out_total,
        estimate_at_send_time,
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
        # The real counts, for the first time (2026-09-20). ``tokens_in`` is what Ollama actually
        # read, ``tokens_out`` what it actually wrote, both summed over a soft continue.
        # ``tokens_in_estimated`` is what the plugin had guessed before sending, kept beside the
        # truth so the gap between them is visible rather than assumed. All three are None-free
        # integers; a server that reports nothing leaves them at 0.
        "tokens_in": tokens_in_total,
        "tokens_out": tokens_out_total,
        "tokens_in_estimated": estimate_at_send_time,
        "context_window_tokens": known_window_tokens(
            ollama_base_from_chat_url(url), model_name
        ),
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
