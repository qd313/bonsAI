"""Foreground/background game Ask orchestration (Ollama + TDP) without importing main.py."""

from __future__ import annotations

import asyncio
import time
from typing import Any, Optional

import decky

from backend.services.capabilities import capability_enabled
from backend.services.input_sanitizer_service import apply_input_sanitizer_lane
from backend.services.ollama_service import (
    question_matches_troubleshooting_log_context,
    user_asks_ollama_bonsai_host_or_latency,
    user_wants_power_or_performance_topic,
)
from backend.services.proton_troubleshooting_logs import collect_proton_troubleshooting_logs
from backend.services.tdp_service import (
    GPU_CLK_MAX_MHZ,
    GPU_CLK_MIN_MHZ,
    STEAMOS_PRIV_WRITE,
    TDP_MAX_W,
    TDP_MIN_W,
    apply_tdp,
    read_current_tdp_watts,
)
from refactor_helpers import is_current_tdp_read_intent, parse_tdp_recommendation

logger = decky.logger


async def run_game_ai_request(
    plugin: Any,
    question: str,
    pc_ip: str,
    app_id: str = "",
    app_name: str = "",
    attachments: Optional[list] = None,
    ask_mode: str = "speed",
) -> dict:
    """Run one full ask lifecycle, including Ollama call timing and optional TDP application."""
    start = time.time()
    app_context = "active" if app_id else "none"
    pcls = type(plugin)
    try:
        logger.info(
            "run_game_ai_request: host=%s game=%r appid=%s question_len=%d",
            pc_ip,
            app_name,
            app_id,
            len(question),
        )

        settings = await plugin.load_settings()
        if settings.get("latency_timeouts_custom_enabled") is True:
            request_timeout_seconds = int(
                settings.get("request_timeout_seconds", pcls.DEFAULT_REQUEST_TIMEOUT_SECONDS)
            )
        else:
            request_timeout_seconds = pcls.DEFAULT_REQUEST_TIMEOUT_SECONDS

        keyword_result = await plugin._try_handle_sanitizer_keyword_command(question, app_id)
        if keyword_result is not None:
            elapsed = round(time.time() - start, 1)
            out = {**keyword_result, "elapsed_seconds": elapsed}
            logger.info("run_game_ai_request: sanitizer keyword command handled (elapsed=%.1fs)", elapsed)
            await plugin._persist_input_transparency(
                {
                    "route": "sanitizer_command",
                    "raw_question": question,
                    "sanitizer_action": "command",
                    "sanitizer_reason_codes": [],
                    "text_after_sanitizer": question,
                    "ollama_model": None,
                    "system_prompt": None,
                    "user_text_for_model": None,
                    "user_image_count": 0,
                    "attachment_paths": [],
                    "assistant_raw": None,
                    "assistant_after_attachment_format": None,
                    "final_response": str(out.get("response", "") or ""),
                    "applied": None,
                    "success": True,
                    "app_id": app_id,
                    "app_name": app_name,
                    "pc_ip": pc_ip,
                    "error_message": "",
                    "elapsed_seconds": elapsed,
                    "model_policy_disclosure": None,
                    "proton_log_excerpt_attached": False,
                    "proton_log_sources": [],
                    "proton_log_notes": "",
                }
            )
            return {**out, "model_policy_disclosure": None, "strategy_guide_branches": None}

        atts = attachments or []
        if atts and not capability_enabled(settings, "media_library_access"):
            elapsed = round(time.time() - start, 1)
            msg = (
                "Screenshot attachments require media library access. "
                "Enable it in the Permissions tab, then try again."
            )
            await plugin._persist_input_transparency(
                {
                    "route": "capability_denied",
                    "raw_question": question,
                    "sanitizer_action": "n/a",
                    "sanitizer_reason_codes": [],
                    "text_after_sanitizer": question,
                    "ollama_model": None,
                    "system_prompt": None,
                    "user_text_for_model": None,
                    "user_image_count": 0,
                    "attachment_paths": [str(a.get("path", "") or "") for a in atts if isinstance(a, dict)],
                    "assistant_raw": None,
                    "assistant_after_attachment_format": None,
                    "final_response": msg,
                    "applied": None,
                    "success": False,
                    "app_id": app_id,
                    "app_name": app_name,
                    "pc_ip": pc_ip,
                    "error_message": "media_library_access",
                    "elapsed_seconds": elapsed,
                    "model_policy_disclosure": None,
                    "proton_log_excerpt_attached": False,
                    "proton_log_sources": [],
                    "proton_log_notes": "",
                }
            )
            return {
                "success": False,
                "response": msg,
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "model_policy_disclosure": None,
            }

        user_sanitizer_disabled = bool(settings.get("input_sanitizer_user_disabled"))
        lane = apply_input_sanitizer_lane(question, user_sanitizer_disabled)
        if lane.action == "block":
            elapsed = round(time.time() - start, 1)
            logger.info("run_game_ai_request: input blocked by sanitizer (%s)", lane.reason_codes)
            um = str(lane.user_message or "")
            await plugin._persist_input_transparency(
                {
                    "route": "sanitizer_block",
                    "raw_question": question,
                    "sanitizer_action": str(lane.action),
                    "sanitizer_reason_codes": list(lane.reason_codes),
                    "text_after_sanitizer": str(lane.text or ""),
                    "ollama_model": None,
                    "system_prompt": None,
                    "user_text_for_model": None,
                    "user_image_count": 0,
                    "attachment_paths": [],
                    "assistant_raw": None,
                    "assistant_after_attachment_format": None,
                    "final_response": um,
                    "applied": None,
                    "success": False,
                    "app_id": app_id,
                    "app_name": app_name,
                    "pc_ip": pc_ip,
                    "error_message": "",
                    "elapsed_seconds": elapsed,
                    "model_policy_disclosure": None,
                    "proton_log_excerpt_attached": False,
                    "proton_log_sources": [],
                    "proton_log_notes": "",
                }
            )
            return {
                "success": False,
                "response": um,
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "model_policy_disclosure": None,
            }
        question_for_model = lane.text

        proton_attachment_text = ""
        proton_sources: list = []
        proton_notes_parts: list[str] = []
        want_proton_logs = (
            settings.get("attach_proton_logs_when_troubleshooting") is True
            and question_matches_troubleshooting_log_context(question_for_model)
            and bool(str(app_id or "").strip())
        )
        if want_proton_logs:
            if not capability_enabled(settings, "steam_logs_read"):
                proton_notes_parts.append(
                    "Proton log excerpts skipped: enable Steam/Proton log read in Permissions."
                )
            else:
                _loop_pl = asyncio.get_running_loop()

                def _collect_logs() -> dict:
                    return collect_proton_troubleshooting_logs(app_id)

                pl_result = await _loop_pl.run_in_executor(None, _collect_logs)
                proton_attachment_text = str(pl_result.get("text") or "")
                proton_sources = list(pl_result.get("sources") or [])
                for w in pl_result.get("warnings") or []:
                    if isinstance(w, str) and w.strip():
                        proton_notes_parts.append(w.strip())

        proton_log_transparency = {
            "proton_log_excerpt_attached": bool(proton_attachment_text.strip()),
            "proton_log_sources": proton_sources,
            "proton_log_notes": "; ".join(proton_notes_parts),
        }

        read_tdp = is_current_tdp_read_intent(question_for_model)
        wants_grounding = user_wants_power_or_performance_topic(question_for_model)
        ollama_host_topic = user_asks_ollama_bonsai_host_or_latency(question_for_model)
        tdp_grounding_requested = (read_tdp or wants_grounding) and not ollama_host_topic
        pre_cap: Optional[int] = None
        if tdp_grounding_requested:
            _loop = asyncio.get_running_loop()

            def _read_cap():
                return read_current_tdp_watts(logger)

            pre_cap = await _loop.run_in_executor(None, _read_cap)

        ollama_result = await plugin.ask_ollama(
            question_for_model,
            pc_ip,
            app_id,
            app_name,
            request_timeout_seconds=request_timeout_seconds,
            attachments=atts,
            ask_mode=ask_mode,
            read_tdp=read_tdp,
            tdp_grounding_requested=tdp_grounding_requested,
            tdp_cap_w=pre_cap,
            proton_log_attachment=proton_attachment_text or None,
            proton_log_transparency=proton_log_transparency,
        )
        elapsed = round(time.time() - start, 1)
        base_response_text = str(ollama_result.get("response", "") or "No response text.")
        response_text = base_response_text
        applied = None

        if ollama_result.get("success"):
            loop = asyncio.get_running_loop()
            tmin, tmax, gmin, gmax = TDP_MIN_W, TDP_MAX_W, GPU_CLK_MIN_MHZ, GPU_CLK_MAX_MHZ
            priv_write = STEAMOS_PRIV_WRITE

            def _parse_only() -> Optional[dict]:
                return parse_tdp_recommendation(
                    base_response_text,
                    tmin,
                    tmax,
                    gmin,
                    gmax,
                )

            rec = await loop.run_in_executor(None, _parse_only)

            if read_tdp:
                logger.info("ask_game_ai: read-TDP question; sysfs apply skipped")
            elif rec:
                if not capability_enabled(settings, "hardware_control"):
                    logger.info("ask_game_ai: TDP recommendation present but hardware_control disabled")
                    response_text += "\n\n[Hardware tuning not applied: enable Hardware control in the Permissions tab.]"
                    applied = {
                        "tdp_watts": None,
                        "gpu_clock_mhz": None,
                        "errors": ["Hardware control disabled in Permissions."],
                    }
                else:
                    logger.info("ask_game_ai: parsed TDP recommendation: %s", rec)

                    def _apply() -> dict:
                        return apply_tdp(rec, priv_write, logger)

                    applied = await loop.run_in_executor(None, _apply)
                    logger.info("ask_game_ai: apply result: %s", applied)
            else:
                logger.info("ask_game_ai: no TDP recommendation found in response")

        err_tail = ""
        if not ollama_result.get("success"):
            err_tail = base_response_text[:8000]

        await plugin._persist_input_transparency(
            {
                "route": "ollama",
                "raw_question": question,
                "sanitizer_action": str(lane.action),
                "sanitizer_reason_codes": list(lane.reason_codes),
                "text_after_sanitizer": question_for_model,
                "ollama_model": ollama_result.get("model"),
                "system_prompt": ollama_result.get("system_prompt"),
                "user_text_for_model": ollama_result.get("user_text_for_model"),
                "user_image_count": int(ollama_result.get("user_image_count") or 0),
                "attachment_paths": ollama_result.get("attachment_paths") or [],
                "assistant_raw": ollama_result.get("assistant_raw"),
                "assistant_after_attachment_format": base_response_text,
                "final_response": response_text,
                "applied": applied,
                "success": bool(ollama_result.get("success", False)),
                "app_id": app_id,
                "app_name": app_name,
                "pc_ip": pc_ip,
                "error_message": err_tail,
                "elapsed_seconds": elapsed,
                "model_policy_disclosure": ollama_result.get("model_policy_disclosure"),
                "proton_log_excerpt_attached": bool(ollama_result.get("proton_log_excerpt_attached")),
                "proton_log_sources": ollama_result.get("proton_log_sources") or [],
                "proton_log_notes": str(ollama_result.get("proton_log_notes") or ""),
            }
        )

        logger.info("run_game_ai_request: completed in %.1fs", elapsed)
        return {
            "success": bool(ollama_result.get("success", False)),
            "cancelled": bool(ollama_result.get("cancelled")),
            "response": response_text,
            "app_id": app_id,
            "app_context": app_context,
            "applied": applied,
            "elapsed_seconds": elapsed,
            "strategy_guide_branches": ollama_result.get("strategy_guide_branches"),
            "model_policy_disclosure": ollama_result.get("model_policy_disclosure"),
        }
    except Exception:
        elapsed = round(time.time() - start, 1)
        logger.exception("run_game_ai_request failed (%.1fs)", elapsed)
        await plugin._persist_input_transparency(
            {
                "route": "error",
                "raw_question": question,
                "sanitizer_action": "error",
                "sanitizer_reason_codes": [],
                "text_after_sanitizer": question,
                "ollama_model": None,
                "system_prompt": None,
                "user_text_for_model": None,
                "user_image_count": 0,
                "attachment_paths": [],
                "assistant_raw": None,
                "assistant_after_attachment_format": None,
                "final_response": (
                    "Something went wrong while processing your Ask. "
                    "If this repeats, check the plugin log on the Deck."
                ),
                "applied": None,
                "success": False,
                "app_id": app_id,
                "app_name": app_name,
                "pc_ip": pc_ip,
                "error_message": "Internal error (details logged on device).",
                "elapsed_seconds": elapsed,
                "model_policy_disclosure": None,
                "proton_log_excerpt_attached": False,
                "proton_log_sources": [],
                "proton_log_notes": "",
            }
        )
        return {
            "success": False,
            "response": (
                "Something went wrong while processing your Ask. "
                "If this repeats, check the plugin log on the Deck."
            ),
            "app_id": app_id,
            "app_context": app_context,
            "applied": None,
            "elapsed_seconds": elapsed,
            "strategy_guide_branches": None,
            "model_policy_disclosure": None,
        }
