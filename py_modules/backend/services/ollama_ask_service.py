"""Title: Ollama Ask service

Purpose: HTTP chat/stream calls to Ollama for game Ask (extracted from Plugin.ask_ollama).
Used for: game_ai_request and direct ask_ollama RPC paths.
Solves: Keeps Ollama HTTP, model routing, and roleplay addons out of main.py.
Does not: Build full game context or run KB retrieval — callers assemble prompts first.
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
    filter_model_list,
)
from backend.services.ask_payload import sanitize_attachments
from backend.services.ollama_service import post_ollama_chat
from backend.services.settings_service import sanitize_ollama_keep_alive, sanitize_reply_verbosity
from backend.services.reply_language_service import resolve_effective_reply_language
from backend.ollama_routing import (
    build_effective_models_to_try,
    filter_models_to_installed,
    is_ollama_model_missing_error,
    no_installed_routing_models_message,
    resolve_routing_order,
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
    token_stream_request_id: Optional[int] = None,
    strategy_checklist_state: Optional[dict] = None,
    preferred_model: Optional[str] = None,
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
    user_message: dict = {"role": "user", "content": question}
    if prepared_images:
        user_message["images"] = [image["image_b64"] for image in prepared_images]
    messages = [{"role": "system", "content": system_content}, user_message]

    proton_snap = proton_log_transparency if isinstance(proton_log_transparency, dict) else {}
    proton_excerpt = proton_snap.get("proton_log_excerpt_attached") is True
    proton_sources = proton_snap.get("proton_log_sources") if isinstance(proton_snap.get("proton_log_sources"), list) else []
    proton_notes = str(proton_snap.get("proton_log_notes") or "")

    ollama_extras = {
        "system_prompt": system_content,
        "user_text_for_model": question,
        "user_image_count": len(prepared_images),
        "attachment_paths": attachment_paths,
        "proton_log_excerpt_attached": proton_excerpt,
        "proton_log_sources": proton_sources,
        "proton_log_notes": proton_notes,
        "strategy_spoiler_consent_effective": bool(strategy_spoiler_consent)
        if strategy_domain_guidance
        else False,
        "resolved_character_preset_id": rp_meta.resolved_preset_id,
        "pyro_asshole_mode": pyro_asshole,
        "reply_verbosity": reply_verbosity,
        "reply_language": reply_language,
    }

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
    models_before_policy = resolve_routing_order(requires_vision, settings, installed_tags)
    pin = str(preferred_model or "").strip()
    if pin and pin in installed_tags:
        models_before_policy = [pin] + [m for m in models_before_policy if m != pin]
    policy_tier = str(settings.get("model_policy_tier") or "open_source_only")
    non_foss_unlocked = settings.get("model_policy_non_foss_unlocked") is True
    models_to_try = filter_model_list(models_before_policy, policy_tier, non_foss_unlocked)
    models_after_policy = list(models_to_try)
    models_to_try, routing_strategy = build_effective_models_to_try(
        models_to_try,
        installed_tags,
        user_chain_before_policy=models_before_policy,
    )
    if routing_strategy == "installed_host_fallback":
        models_to_try = filter_model_list(models_to_try, policy_tier, non_foss_unlocked)
    _, models_skipped_not_installed = filter_models_to_installed(models_after_policy, installed_tags)
    ask_diagnostics: dict = {
        "models_before_policy": list(models_before_policy),
        "models_after_policy": models_after_policy,
        "installed_tags": list(installed_tags),
        "routing_strategy": routing_strategy,
        "routing_skipped_not_installed": list(models_skipped_not_installed),
        "policy_tier": policy_tier,
        "policy_dropped_count": max(0, len(models_before_policy) - len(models_after_policy)),
        "requires_vision": requires_vision,
        "attachment_count": len(prepared_images),
        "attachment_warnings": list(attachment_warnings),
        "attachment_errors": list(attachment_errors),
        "models_attempted": [],
        "model_succeeded": None,
        "elapsed_seconds": None,
    }
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

        def _on_delta(text: str, done: bool, thinking_summary: Optional[str] = None) -> None:
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
            plugin_inst._update_partial_response(stream_rid, text, done, thinking_summary)

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
