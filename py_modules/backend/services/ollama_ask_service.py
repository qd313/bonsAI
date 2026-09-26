"""Title: Sending one Ask question to Ollama

Purpose: This is the file that actually sends a person's question to the AI and streams
the reply back. By the time it runs, the question and any screenshots are already
gathered — this file's job is to add the roleplay character voice if one is on, work out
which model to try and in what order, and then walk down that list of models, trying each
one until one answers, retrying on errors that are worth retrying and giving up cleanly on
ones that are not.
Used for: Called for every Ask question, both from the game overlay's Ask flow and from the
direct ask_ollama command.
Solves: Keeps the HTTP call to Ollama, the model try-order logic, and the roleplay text all in
one place, out of the main plugin file.
Does not: Build the full game context that goes into the question, or search the local
knowledge base — the caller assembles the question and its background material first and
hands this file a finished prompt to send.

How it works:
1. Load settings and work out the roleplay character voice, if any, with one call to
   `build_roleplay_system_suffix_meta()`. This only happens once per question on purpose: the
   "surprise me" random character rolls a dice, and calling it twice used to pick two different
   characters for the same reply — one for an early status message, one for the real answer.
2. Prepare any attached screenshots and build the system prompt (the instructions sent to the
   model along with the question), then, if a character voice was chosen, append it with
   `apply_roleplay_to_system_content()`. For the Pyro easter egg specifically, there is a chance
   of also adding a short "try this next" suggestion via `pyro_manager_carousel_tip_addon()`.
3. Make sure Ollama is actually reachable, then work out the list of models to try, in order,
   with `resolve_ask_model_routing()`: the person's saved order, a policy/tier filter on top,
   then a cross-check against what Ollama actually has installed right now. If nothing is left
   to try, a plain-language explanation is returned instead of an error code.
4. Walk the model list in order. For each model, call Ollama through `post_ollama_chat()` and
   wait for the reply (or the streamed words, if this question wants a live stream). Progress
   messages ("the AI is waking up", "trying the next model") are published as this goes, so the
   person is never staring at a silent screen.
5. Decide what a failure means: a timeout or a "not installed" error tries the next model in the
   list via `is_ollama_model_missing_error()`; for a question with a screenshot, an
   out-of-memory-shaped error also tries the next model, since a smaller model may still manage
   it. Any other kind of failure stops the list right there and reports it, rather than silently
   trying five more models a person did not ask for.
6. On success, hand back the reply plus which model actually answered and why (the model policy
   disclosure), so the rest of the app can show that in Show details.
"""

from __future__ import annotations

import asyncio
import functools
import random
import threading
import time
from typing import Any, Optional

import decky

from backend.services.ai_character_service import (
    PYRO_ASSHOLE_TIP_LINES,
    PYRO_MANAGER_TIP_LINES,
    PYRO_MANAGER_TIP_PROBABILITY,
    PYRO_PRESET_ID,
    apply_roleplay_to_system_content,
    build_roleplay_system_suffix_meta,
    pyro_asshole_mode_active,
    pyro_manager_carousel_tip_addon,
)
from backend.services.local_ollama_setup_service import (
    is_loopback_ollama_host,
    list_installed_ollama_tags,
    probe_ollama_http_ok,
    recover_loopback_ollama_listening,
)
from backend.services.model_policy import (
    disclosure_for_model,
    empty_filter_user_message,
)
from backend.services.ask_payload import sanitize_attachments
from backend.services.chat_memory_service import apply_chat_memory_to_prompt
from backend.services.ollama_ask_extras import (
    build_ollama_request_extras,
    resolve_ask_model_routing,
)
from backend.services.ollama_service import post_ollama_chat
from backend.services.settings_service import sanitize_ollama_keep_alive, sanitize_reply_verbosity
from backend.services.reply_language_service import resolve_effective_reply_language
from backend.services.token_accounting_service import smallest_known_window_tokens
from backend.ollama_routing import (
    is_ollama_model_missing_error,
    no_installed_routing_models_message,
)
from backend.ollama_urls import normalize_ollama_base

logger = decky.logger


async def run_ask_ollama(
    plugin: Any,
    question: str,
    pc_ip: str,
    app_id: str,
    app_name: str,
    request_timeout_seconds: int = 120,
    attachments: Optional[list] = None,
    ask_mode: str = "speed",
    *,
    read_tdp: bool = False,
    tdp_grounding_requested: bool = False,
    tdp_cap_w: Optional[int] = None,
    proton_log_attachment: Optional[str] = None,
    proton_log_transparency: Optional[dict] = None,
    followup_subject: str = "",
    strategy_spoiler_consent: bool = False,
    strategy_spoiler_asked_entity: str = "",
    strategy_spoiler_kb_entity_match: bool = False,
    strategy_domain_guidance: bool = False,
    strategy_title_profile: str = "",
    token_stream_request_id: Optional[int] = None,
    strategy_checklist_state: Optional[dict] = None,
    preferred_model: Optional[str] = None,
    chat_turns: Optional[list] = None,
) -> dict[str, Any]:
    """Orchestrate attachment prep, prompt assembly, and model fallback request execution."""
    plugin_inst = plugin
    active_request_id = plugin_inst._active_request_id()

    url = plugin_inst._build_ollama_chat_url(pc_ip)
    settings = await plugin_inst.load_settings()
    # Resolved once, before anything reads it. ai_character_random defaults *on* and calls
    # random.choice, so a second call here would roll a different character -- and this function
    # used to make two, one for the screenshot_prep blurb and one for the reply's actual voice.
    rp_meta = build_roleplay_system_suffix_meta(settings, ask_mode)
    normalized_attachments = sanitize_attachments(attachments or [])
    attachment_paths = [
        str(a.get("path", "") or "").strip()
        for a in normalized_attachments
        if isinstance(a, dict) and str(a.get("path", "") or "").strip()
    ]
    if normalized_attachments and isinstance(active_request_id, int):
        plugin_inst._publish_thinking_phase_key(
            active_request_id,
            "screenshot_prep",
            app_name=app_name,
            attachment_count=len(normalized_attachments),
            ask_mode=ask_mode,
            question=question,
            character_enabled=bool(settings.get("ai_character_enabled")),
            character_preset_id=rp_meta.resolved_preset_id,
        )
    keep_alive = sanitize_ollama_keep_alive(settings.get("ollama_keep_alive"))
    reply_verbosity = sanitize_reply_verbosity(settings.get("reply_verbosity"))
    reply_language = resolve_effective_reply_language(settings.get("reply_language"))
    apreset = str(settings.get("screenshot_attachment_preset") or "low")
    if apreset not in ("low", "mid", "max"):
        apreset = "low"
    from backend.services.screenshot_media import prepare_attachment_images

    prepared_images, attachment_warnings, attachment_errors = prepare_attachment_images(
        normalized_attachments,
        apreset,
    )
    system_content = plugin_inst._build_system_prompt(
        question,
        app_id,
        app_name,
        normalized_attachments,
        prepared_images,
        ask_mode=ask_mode,
        read_tdp=read_tdp,
        tdp_grounding_requested=tdp_grounding_requested,
        tdp_cap_w=tdp_cap_w,
        proton_log_attachment=proton_log_attachment,
        followup_subject=followup_subject,
        strategy_spoiler_consent=strategy_spoiler_consent,
        strategy_spoiler_asked_entity=strategy_spoiler_asked_entity,
        strategy_spoiler_kb_entity_match=strategy_spoiler_kb_entity_match,
        strategy_domain_guidance=strategy_domain_guidance,
        strategy_title_profile=strategy_title_profile,
        character_roleplay_on=bool(settings.get("ai_character_enabled")),
        strategy_checklist_state=strategy_checklist_state,
        reply_verbosity=reply_verbosity,
        reply_language=reply_language,
    )
    if ask_mode == "strategy":
        # Closes the last gap in the branch-picker chain. With this plus the
        # extraction log in ollama_service, one Strategy turn now answers all
        # three questions in order: did we ASK the model for a branch fence, did
        # it EMIT one, did the parser ACCEPT it. Before this, "no branch buttons
        # anywhere in the transcript" was the only observable, and it is the same
        # symptom for all three causes -- which is why that report stayed open
        # with an unverified premise in its title.
        logger.info(
            "ask_strategy: branch fence requested in prompt=%s (mode=%s, app_id=%s)",
            "bonsai-strategy-branches" in (system_content or ""),
            ask_mode,
            app_id,
        )
    roleplay = rp_meta.suffix
    pyro_asshole = pyro_asshole_mode_active(settings, rp_meta.resolved_preset_id)
    preset_carousel_inject = None
    if rp_meta.resolved_preset_id == PYRO_PRESET_ID and roleplay:
        if random.random() < PYRO_MANAGER_TIP_PROBABILITY:
            if pyro_asshole:
                tip = random.choice(PYRO_ASSHOLE_TIP_LINES)
                roleplay = roleplay + pyro_manager_carousel_tip_addon(tip, asshole=True)
            else:
                tip = random.choice(PYRO_MANAGER_TIP_LINES)
                roleplay = roleplay + pyro_manager_carousel_tip_addon(tip)
            preset_carousel_inject = {"text": tip}
    if roleplay:
        system_content = apply_roleplay_to_system_content(system_content, roleplay)
    # What the chat has already covered is appended here, sized by the budget rather than by
    # whatever happens to be on disk -- see apply_chat_memory_to_prompt()'s own doc comment for
    # why it goes at the END of what the AI is told.
    system_content = apply_chat_memory_to_prompt(
        system_content=system_content,
        question=question,
        chat_turns=chat_turns,
        ask_mode=ask_mode,
        think_effort=str(settings.get("ask_think_effort") or "off"),
        # Still the pre-plan-68 room guess here -- the model has not been chosen yet at this
        # point in the function (that happens a few lines below), so there is no real window to
        # ask for. Step 3 of plan 68 reorders this so the memory is planned against the room the
        # answer will really ask for; until then this keeps today's behaviour unchanged.
        room_tokens=smallest_known_window_tokens(normalize_ollama_base(pc_ip)[2]),
        attached_chars=len(proton_log_attachment or ""),
        logger=logger,
    )

    user_message: dict = {"role": "user", "content": question}
    if prepared_images:
        user_message["images"] = [image["image_b64"] for image in prepared_images]
    messages = [{"role": "system", "content": system_content}, user_message]

    ollama_extras = build_ollama_request_extras(
        system_content=system_content,
        question=question,
        prepared_image_count=len(prepared_images),
        attachment_paths=attachment_paths,
        proton_log_transparency=proton_log_transparency,
        strategy_spoiler_consent=strategy_spoiler_consent,
        strategy_domain_guidance=strategy_domain_guidance,
        resolved_character_preset_id=rp_meta.resolved_preset_id,
        pyro_asshole_mode=pyro_asshole,
        reply_verbosity=reply_verbosity,
        reply_language=reply_language,
    )

    logger.info(
        "ask_ollama: url=%s game=%r appid=%s attachments=%d question_len=%d",
        url,
        app_name,
        app_id,
        len(prepared_images),
        len(question),
    )

    requires_vision = len(prepared_images) > 0
    ask_started = time.time()
    ollama_host, _, ollama_base = normalize_ollama_base(pc_ip)
    if is_loopback_ollama_host(ollama_host) and not probe_ollama_http_ok(ollama_base):
        recover_loopback_ollama_listening(logger.info)
    installed_tags = list_installed_ollama_tags(ollama_base)
    (
        models_to_try,
        models_after_policy,
        routing_strategy,
        policy_tier,
        non_foss_unlocked,
        ask_diagnostics,
    ) = resolve_ask_model_routing(
        requires_vision=requires_vision,
        settings=settings,
        installed_tags=installed_tags,
        preferred_model=preferred_model,
        attachment_warnings=attachment_warnings,
        attachment_errors=attachment_errors,
        prepared_image_count=len(prepared_images),
    )
    ollama_extras["ask_diagnostics"] = ask_diagnostics
    if not models_after_policy and not installed_tags:
        return {
            "success": False,
            "response": empty_filter_user_message(policy_tier, non_foss_unlocked, requires_vision),
            "model_policy_disclosure": None,
            **ollama_extras,
        }
    if not models_to_try:
        ask_diagnostics["elapsed_seconds"] = round(time.time() - ask_started, 2)
        return {
            "success": False,
            "response": no_installed_routing_models_message(installed_tags, requires_vision),
            "model_policy_disclosure": None,
            **ollama_extras,
        }
    ask_diagnostics["models_after_installed_filter"] = list(models_to_try)

    on_delta_cb = None
    if isinstance(token_stream_request_id, int):
        stream_rid = token_stream_request_id
        announced_generating = False

        def _on_delta(
            text: str,
            done: bool,
            thinking_summary: Optional[str] = None,
            *,
            reasoning_partial: Optional[str] = None,
            reasoning_seconds: Optional[int] = None,
        ) -> None:
            nonlocal announced_generating
            # First real token: the model is writing, not connecting. Publishing here is what
            # retires the "waking the model up" line, which otherwise stayed on screen for the
            # whole generation and stopped being true the moment tokens started.
            #
            # Skipped when the model emitted its own status tag, because that is strictly better
            # copy and _update_partial_response is about to write it.
            if not announced_generating and not done and not thinking_summary and (text or "").strip():
                announced_generating = True
                plugin_inst._publish_thinking_phase_key(
                    stream_rid,
                    "generating",
                    app_name=app_name,
                    ask_mode=ask_mode,
                    question=question,
                    character_enabled=bool(settings.get("ai_character_enabled")),
                    character_preset_id=rp_meta.resolved_preset_id,
                )
            # Plan 57: the model's own thinking, kept in the same poll snapshot the screen already
            # reads every second — so the live lines can move before any answer text exists.
            plugin_inst._update_partial_response(
                stream_rid,
                text,
                done,
                thinking_summary,
                reasoning_partial=reasoning_partial,
                reasoning_seconds=reasoning_seconds,
            )

        on_delta_cb = _on_delta

    def _on_http_response_opened(resp: Any) -> None:
        plugin_inst._active_ollama_chat_http_response = resp
        ev = getattr(plugin_inst, "_chat_resp_ready_evt", None)
        if isinstance(ev, threading.Event):
            ev.set()

    def _on_http_response_done() -> None:
        plugin_inst._active_ollama_chat_http_response = None

    _abort_ev = getattr(plugin_inst, "_abort_current_ollama_chat", None)
    if isinstance(_abort_ev, threading.Event):
        _abort_ev.clear()

    def _strip_ollama_http_body(payload: dict) -> dict:
        out = dict(payload)
        out.pop("body", None)
        return out

    try:
        loop = asyncio.get_running_loop()
        last_failure = {"success": False, "response": "No model attempts executed.", **ollama_extras}

        for model_idx, model_name in enumerate(models_to_try):
            if isinstance(active_request_id, int):
                # The first attempt is the longest silent stretch of an Ask: a cold model can sit
                # in load for tens of seconds before the first token. Publishing here is the
                # difference between "nothing is happening" and "the model is waking up".
                plugin_inst._publish_thinking_phase_key(
                    active_request_id,
                    "model_retry" if model_idx > 0 else "connecting_model",
                    app_name=app_name,
                    ask_mode=ask_mode,
                    question=question,
                    character_enabled=bool(settings.get("ai_character_enabled")),
                    character_preset_id=rp_meta.resolved_preset_id,
                )
            ask_diagnostics["models_attempted"].append(model_name)
            plugin_inst._chat_resp_ready_evt = threading.Event()
            plugin_inst._active_ollama_chat_pc_ip = str(pc_ip or "").strip()
            plugin_inst._active_ollama_chat_model = str(model_name)
            try:
                result = await loop.run_in_executor(
                    None,
                    functools.partial(
                        post_ollama_chat,
                        url,
                        model_name,
                        messages,
                        request_timeout_seconds,
                        normalized_attachments,
                        prepared_images,
                        attachment_warnings,
                        attachment_errors,
                        logger,
                        ask_mode,
                        keep_alive,
                        plugin_inst._abort_ollama_chat_check,
                        on_http_response_opened=_on_http_response_opened,
                        on_http_response_done=_on_http_response_done,
                        on_delta=on_delta_cb,
                        think_effort=str(settings.get("ask_think_effort") or "off"),
                        # Let the plugin decide how much room the model gets, instead of taking
                        # the server's default -- 4,096 on the Deck, against a model that can hold
                        # 131,072. Decided once per model per session inside post_ollama_chat.
                        choose_window=True,
                    ),
                )
            finally:
                plugin_inst._active_ollama_chat_pc_ip = None
                plugin_inst._active_ollama_chat_model = None
            merged = {**ollama_extras, **result}
            if not result.get("success"):
                await plugin_inst._maybe_app_log(
                    "ask.model",
                    "ollama model attempt failed",
                    level="verbose",
                    fields={
                        "model": model_name,
                        "status": result.get("status"),
                        "cancelled": bool(result.get("cancelled")),
                    },
                )
            if result.get("cancelled"):
                return {**_strip_ollama_http_body(merged), "model_policy_disclosure": None, "cancelled": True}
            if result.get("success"):
                ask_diagnostics["model_succeeded"] = str(result.get("model") or model_name)
                ask_diagnostics["elapsed_seconds"] = round(time.time() - ask_started, 2)
                disc = disclosure_for_model(str(result.get("model") or model_name))
                out = {**_strip_ollama_http_body(merged), "model_policy_disclosure": disc}
                if preset_carousel_inject is not None:
                    out["preset_carousel_inject"] = preset_carousel_inject
                if normalized_attachments:
                    # D104: the attachment counts used to be appended to the reply itself
                    # (`[AttachDebug: ...]`, removed in format_ai_response). They still reach
                    # the verbose app log, same gating as the "ollama model attempt failed"
                    # line above -- nothing shows on screen unless verbose logging is on.
                    await plugin_inst._maybe_app_log(
                        "ask.attach",
                        "attachment debug counts",
                        level="verbose",
                        fields={
                            "requested": len(normalized_attachments),
                            "prepared": len(prepared_images),
                            "errors": len(attachment_errors),
                        },
                    )
                return out

            last_failure = _strip_ollama_http_body(merged)
            body = result.get("body") or ""
            if result.get("timed_out") and model_name != models_to_try[-1]:
                logger.warning(
                    "ask_ollama: timeout model=%s — trying next installed fallback",
                    model_name,
                )
                continue
            if is_ollama_model_missing_error(result.get("status"), body):
                continue

            status = result.get("status")
            body_lower = body.lower()
            oomish = any(
                s in body_lower
                for s in (
                    "out of memory",
                    "failed to allocate",
                    "resource exhausted",
                    "cuda error",
                    "vulkan",
                )
            )
            if requires_vision and (
                (isinstance(status, int) and status in (413, 500, 502, 503, 504)) or oomish
            ):
                logger.warning(
                    "ask_ollama: vision attempt failed status=%s model=%s — trying next fallback",
                    status,
                    model_name,
                )
                continue

            return _strip_ollama_http_body(merged)

        ask_diagnostics["elapsed_seconds"] = round(time.time() - ask_started, 2)
        return last_failure
    except Exception:
        logger.exception("Ollama request failed")
        return {
            "success": False,
            "response": "Ollama request failed. Check connection, model names, and the Deck plugin log.",
            **ollama_extras,
        }
