"""Title: Game Ask orchestration

Purpose: Run a foreground game Ask (Ollama + optional TDP) without importing main.
Used for: RPC handlers and background workers that need the full Ask pipeline.
Solves: Keeps main.py thin while preserving one orchestration owner for context, KB, sanitizer, and Ollama.
Does not: Define Decky RPC method names or poll state — those live in main.py and async_background_job.

Return dict keys must stay aligned with execute_game_ai RPC consumers and frontend parsers
(success, response, applied, disclosure flags, etc.).
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Optional

import decky

from backend.services.capabilities import capability_enabled
from backend.services.ai_character_service import build_roleplay_system_suffix_meta
from backend.services.destructive_advice_guard import (
    append_destructive_advice_notice,
    check_destructive_advice,
)
from backend.services import kb_followup_memory
from backend.services.input_sanitizer_service import apply_input_sanitizer_lane
from backend.services.kb_not_in_notes_notice import (
    append_no_close_match_notice,
    append_no_tip_for_this_notice,
    append_not_in_notes_notice,
    should_show_no_close_match_notice,
    should_show_no_tip_for_this_notice,
    should_show_not_in_notes_notice,
)
from backend.services.ollama_prompts import (
    build_reply_followup_context_block,
    extract_strategy_asked_entity,
    kb_card_names,
    kb_text_covers_asked_entity,
    user_consents_strategy_spoilers,
    user_wants_power_or_performance_topic,
)
from backend.services.ollama_service import (
    question_matches_troubleshooting_log_context,
    user_asks_ollama_bonsai_host_or_latency,
)
from backend.services.proton_troubleshooting_logs import collect_proton_troubleshooting_logs
from backend.services.knowledge_base_service import (
    kb_coverage_to_transparency,
    lookup_game_genres,
    resolve_title_from_question,
    retrieve_knowledge_context,
    should_retrieve_knowledge,
    stack_context_blocks,
    summarize_kb_coverage,
)
from backend.services.screenshot_media import lookup_screenshot_vdf_metadata
from backend.services.spoiler_risk_service import build_spoiler_risk_signals
from backend.services.spoiler_title_profiles import resolve_title_spoiler_profile
from backend.services.transparency_service import (
    build_capability_denied_snapshot,
    build_error_route_snapshot,
    build_knowledge_base_transparency,
    build_ollama_route_snapshot,
    build_proton_log_transparency,
    build_sanitizer_block_snapshot,
    build_sanitizer_command_snapshot,
    transparency_snapshot_for_chat_slot,
)
from backend.services.tdp_service import (
    GPU_CLK_MAX_MHZ,
    GPU_CLK_MIN_MHZ,
    TDP_MAX_W,
    TDP_MIN_W,
    read_current_tdp_watts,
)
from backend.tdp_intent import (
    is_current_tdp_read_intent,
    parse_tdp_recommendation,
    strip_tdp_recommendation_block,
)

logger = decky.logger


async def run_game_ai_request(
    plugin: Any,
    question: str,
    pc_ip: str,
    app_id: str = "",
    app_name: str = "",
    attachments: Optional[list] = None,
    ask_mode: str = "speed",
    spoiler_consent: bool = False,
    token_stream_request_id: Optional[int] = None,
    strategy_checklist_state: Optional[dict] = None,
    reply_followup: Optional[dict] = None,
    roleplay_meta: Any = None,
) -> dict:
    """Run one full ask lifecycle, including Ollama call timing and optional TDP application.

    ``roleplay_meta`` is a pre-resolved ``build_roleplay_system_suffix_meta`` result. The
    background Ask path resolves it at accept time so the opening thinking blurb can be composed
    before this task starts, and passes it here so the character is picked exactly once per Ask --
    ``ai_character_random`` calls ``random.choice``, so resolving twice could put a deadpan blurb
    in front of a witty reply. The foreground path passes nothing and resolves below.
    """
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
            keyword_snapshot = build_sanitizer_command_snapshot(
                raw_question=question,
                final_response=str(out.get("response", "") or ""),
                app_id=app_id,
                app_name=app_name,
                pc_ip=pc_ip,
                elapsed_seconds=elapsed,
            )
            await plugin._persist_input_transparency(keyword_snapshot)
            return {
                **out,
                "model_policy_disclosure": None,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "strategy_spoiler_consent_effective": False,
                "transparency": transparency_snapshot_for_chat_slot(keyword_snapshot),
            }

        atts = attachments or []
        if atts and not capability_enabled(settings, "media_library_access"):
            elapsed = round(time.time() - start, 1)
            msg = (
                "Screenshot attachments require media library access. "
                "Enable it in the Permissions tab, then try again."
            )
            capability_denied_snapshot = build_capability_denied_snapshot(
                raw_question=question,
                attachment_paths=[str(a.get("path", "") or "") for a in atts if isinstance(a, dict)],
                final_response=msg,
                app_id=app_id,
                app_name=app_name,
                pc_ip=pc_ip,
                elapsed_seconds=elapsed,
            )
            await plugin._persist_input_transparency(capability_denied_snapshot)
            return {
                "success": False,
                "response": msg,
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "model_policy_disclosure": None,
                "strategy_spoiler_consent_effective": False,
                "transparency": transparency_snapshot_for_chat_slot(capability_denied_snapshot),
            }

        user_sanitizer_disabled = bool(settings.get("input_sanitizer_user_disabled"))
        lane = apply_input_sanitizer_lane(question, user_sanitizer_disabled)
        if lane.action == "block":
            elapsed = round(time.time() - start, 1)
            logger.info("run_game_ai_request: input blocked by sanitizer (%s)", lane.reason_codes)
            um = str(lane.user_message or "")
            sanitizer_block_snapshot = build_sanitizer_block_snapshot(
                raw_question=question,
                sanitizer_action=str(lane.action),
                sanitizer_reason_codes=list(lane.reason_codes),
                text_after_sanitizer=str(lane.text or ""),
                final_response=um,
                app_id=app_id,
                app_name=app_name,
                pc_ip=pc_ip,
                elapsed_seconds=elapsed,
            )
            await plugin._persist_input_transparency(sanitizer_block_snapshot)
            return {
                "success": False,
                "response": um,
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "model_policy_disclosure": None,
                "strategy_spoiler_consent_effective": False,
                "transparency": transparency_snapshot_for_chat_slot(sanitizer_block_snapshot),
            }
        question_for_model = lane.text
        # Retrieval searches the user's actual words. question_for_model grows a follow-up
        # header below, and _fts_match_query keeps only a bounded number of tokens, so a
        # follow-up Ask used to be searched as "REPLY FOLLOW UP CONTEXT The user is refining
        # their previous Ask ..." — boilerplate identical on every follow-up, and nothing of
        # what was asked. The model still receives the header; the index does not.
        question_for_retrieval = lane.text

        if reply_followup:
            followup_block = build_reply_followup_context_block(
                str(reply_followup.get("chip_id") or ""),
                str(reply_followup.get("parent_question") or ""),
                str(reply_followup.get("parent_answer") or ""),
            )
            question_for_model = f"{followup_block}\n{question_for_model}"

        preferred_model = (
            str(reply_followup.get("preferred_model") or "").strip() or None
            if isinstance(reply_followup, dict)
            else None
        )

        active_rid = plugin._active_request_id() if hasattr(plugin, "_active_request_id") else None
        # The opening blurb is composed by start_background_game_ai and published before this task
        # runs, so there is no second opener here -- a duplicate compose is what made the line
        # rewrite itself from one generic opener to another within the first poll.
        rp_meta = roleplay_meta or build_roleplay_system_suffix_meta(settings, ask_mode)

        proton_attachment_text = ""
        proton_sources: list = []
        proton_notes_parts: list[str] = []
        want_proton_logs = (
            capability_enabled(settings, "steam_logs_read")
            and question_matches_troubleshooting_log_context(question_for_model)
            and bool(str(app_id or "").strip())
        )
        if want_proton_logs:
            if isinstance(active_rid, int) and hasattr(plugin, "_publish_thinking_phase_key"):
                plugin._publish_thinking_phase_key(
                    active_rid,
                    "proton_logs",
                    app_name=app_name,
                    ask_mode=ask_mode,
                    question=question_for_model,
                    character_enabled=bool(settings.get("ai_character_enabled")),
                    character_preset_id=rp_meta.resolved_preset_id,
                )
            _loop_pl = asyncio.get_running_loop()

            def _collect_logs() -> dict:
                return collect_proton_troubleshooting_logs(app_id)

            pl_result = await _loop_pl.run_in_executor(None, _collect_logs)
            proton_attachment_text = str(pl_result.get("text") or "")
            proton_sources = list(pl_result.get("sources") or [])
            for w in pl_result.get("warnings") or []:
                if isinstance(w, str) and w.strip():
                    proton_notes_parts.append(w.strip())
        elif (
            question_matches_troubleshooting_log_context(question_for_model)
            and bool(str(app_id or "").strip())
            and not capability_enabled(settings, "steam_logs_read")
        ):
            proton_notes_parts.append(
                "Proton log excerpts skipped: enable Read game & screenshot context in Permissions."
            )

        proton_log_transparency = build_proton_log_transparency(
            excerpt_attached=bool(proton_attachment_text.strip()),
            sources=proton_sources,
            notes="; ".join(proton_notes_parts),
        )

        shortcut_name = ""
        for attachment in atts:
            if isinstance(attachment, dict):
                hint = lookup_screenshot_vdf_metadata(str(attachment.get("path", "") or ""))
                sn = str(hint.get("shortcut_name", "") or "").strip()
                if sn:
                    shortcut_name = sn
                    break

        kb_coverage_transparency = kb_coverage_to_transparency(
            summarize_kb_coverage(
                settings,
                app_id=app_id,
                app_name=app_name,
                shortcut_name=shortcut_name,
            )
        )

        kb_transparency = build_knowledge_base_transparency(
            attached=False,
            trust_tier="",
            sources=[],
            notes="",
            timing_ms={},
            kb_domain="",
        )
        kb_text = ""
        kb_result = None
        kb_survived = False
        # D19: with nothing running, a title the question names is the only way into the
        # strategy corpus. Resolved only when Steam gives us neither an AppID nor a name, so a
        # running game always wins -- a question mentioning Portal 2 while Hades is open is
        # still an Ask about Hades.
        text_resolved_title = ""
        if not str(app_id or "").strip() and not str(app_name or "").strip():
            text_resolved_title = resolve_title_from_question(settings, question_for_retrieval)

        should_kb, kb_domain = should_retrieve_knowledge(
            use_local_knowledge_base=settings.get("use_local_knowledge_base") is True,
            ask_mode=ask_mode,
            question=question_for_retrieval,
            app_id=app_id,
            app_name=app_name,
            text_resolved_title=text_resolved_title,
        )

        # Follow-up memory, step one. A bare follow-up ("what about her second phase") carries
        # none of the previous turn into the search on its own -- there is no argument that
        # could. Strategy and Expert only; a troubleshooting question neither stores a subject
        # nor picks one up, and turning the library off clears whatever was remembered. This
        # only ever changes the words handed to the search below -- question_for_model, and so
        # what the person and the model see, is untouched.
        kb_ask_mode = (ask_mode or "speed").strip().lower()
        kb_memory_eligible = kb_ask_mode in ("strategy", "expert")
        question_for_kb_search = question_for_retrieval
        # D98: the model still answered about a different, better-matching note even once the
        # right one was ranked first, so the exact turn this augments the search words on is
        # also the only turn the built prompt gets told which thing the question is carrying on
        # from -- see ollama_prompts.build_system_prompt's `followup_subject`. Blank everywhere
        # else, including the question the person and the model see, which never changes here.
        followup_subject_for_prompt = ""
        if settings.get("use_local_knowledge_base") is not True:
            kb_followup_memory.forget()
        elif kb_domain == "compat":
            kb_followup_memory.forget()
        elif kb_memory_eligible and kb_domain == "strategy":
            remembered_subject = kb_followup_memory.recall(
                app_id=app_id, app_name=app_name, text_resolved_title=text_resolved_title
            )
            if remembered_subject and not extract_strategy_asked_entity(question_for_retrieval):
                question_for_kb_search = kb_followup_memory.augment_search_words(
                    question_for_retrieval, remembered_subject=remembered_subject
                )
                followup_subject_for_prompt = remembered_subject

        if should_kb:
            if isinstance(active_rid, int) and hasattr(plugin, "_publish_thinking_phase_key"):
                plugin._publish_thinking_phase_key(
                    active_rid,
                    "searching_kb",
                    app_name=app_name,
                    ask_mode=ask_mode,
                    question=question_for_model,
                    character_enabled=bool(settings.get("ai_character_enabled")),
                    character_preset_id=rp_meta.resolved_preset_id,
                )

            def _retrieve_kb():
                return retrieve_knowledge_context(
                    settings,
                    ask_mode=ask_mode,
                    question=question_for_kb_search,
                    app_id=app_id,
                    app_name=app_name,
                    shortcut_name=shortcut_name,
                    text_resolved_title=text_resolved_title,
                    domain=kb_domain,
                    pc_ip=pc_ip,
                )

            _loop_kb = asyncio.get_running_loop()
            kb_result = await _loop_kb.run_in_executor(None, _retrieve_kb)
            if kb_result.attached:
                kb_text = kb_result.text_block

        # Everything from here to the ask_ollama call is context assembly: stacking the blocks
        # against the budget, genre lookup, spoiler-risk signals, TDP grounding. None of it
        # published anything before, so on an Ask with no Proton logs and no KB hit this was the
        # first stretch where the line simply sat there.
        if isinstance(active_rid, int) and hasattr(plugin, "_publish_thinking_phase_key"):
            plugin._publish_thinking_phase_key(
                active_rid,
                "building_context",
                app_name=app_name,
                attachment_count=len(atts),
                ask_mode=ask_mode,
                question=question_for_model,
                character_enabled=bool(settings.get("ai_character_enabled")),
                character_preset_id=rp_meta.resolved_preset_id,
            )

        stacked = stack_context_blocks(
            proton_text=proton_attachment_text,
            knowledge_text=kb_text,
        )
        early_context_combined = stacked.text

        # Built *after* stacking, deliberately. Proton logs take budget first and can be
        # capped at 96 KiB against a 100 KiB ceiling, so recording attached=True straight off
        # the retrieval result let transparency claim the knowledge base was attached — and
        # cite its sources — on turns where the block never reached the model at all.
        if kb_result is not None:
            kb_survived = kb_result.attached and stacked.knowledge_attached
            starved = kb_result.attached and not stacked.knowledge_attached
            kb_transparency = build_knowledge_base_transparency(
                attached=kb_survived,
                trust_tier=kb_result.trust_tier if kb_survived else "",
                sources=kb_result.sources if kb_survived else [],
                notes="dropped_by_context_budget" if starved else kb_result.notes,
                timing_ms=kb_result.timing_ms,
                unavailable_reason=kb_result.unavailable_reason,
                retrieval_method=kb_result.retrieval_method,
                kb_domain=kb_domain,
                best_meaning=kb_result.best_meaning,
                top_card_keyword_score=kb_result.top_card_keyword_score,
            )

        read_tdp = is_current_tdp_read_intent(question_for_model)
        wants_grounding = user_wants_power_or_performance_topic(question_for_model)
        ollama_host_topic = user_asks_ollama_bonsai_host_or_latency(question_for_model)
        tdp_grounding_requested = (read_tdp or wants_grounding) and not ollama_host_topic
        pre_cap: Optional[int] = None
        if tdp_grounding_requested:
            if isinstance(active_rid, int) and hasattr(plugin, "_publish_thinking_phase_key"):
                plugin._publish_thinking_phase_key(
                    active_rid,
                    "tdp_read",
                    app_name=app_name,
                    ask_mode=ask_mode,
                    question=question_for_model,
                    character_enabled=bool(settings.get("ai_character_enabled")),
                    character_preset_id=rp_meta.resolved_preset_id,
                )
            _loop = asyncio.get_running_loop()

            def _read_cap():
                return read_current_tdp_watts(logger)

            pre_cap = await _loop.run_in_executor(None, _read_cap)

        strategy_spoiler_consent_effective = False
        strategy_spoiler_game_genres = lookup_game_genres(settings, app_id)
        # Card titles from the attached block are a gazetteer, so a question that names one is
        # resolved as a fact rather than guessed from phrasing. Empty when nothing attached,
        # which just falls the extractor back to its patterns.
        strategy_spoiler_asked_entity = extract_strategy_asked_entity(
            question_for_model, known_entities=kb_card_names(kb_text)
        )
        strategy_spoiler_kb_entity_match = kb_text_covers_asked_entity(
            kb_text, strategy_spoiler_asked_entity
        )
        # Follow-up memory, step one: remember this question's named thing (or, failing that,
        # the top attached note's own name) for the *next* Strategy/Expert question about this
        # game -- never during a troubleshooting question or Speed, gated the same way the
        # search-words augmentation above is.
        if kb_memory_eligible and kb_domain == "strategy":
            followup_subject = strategy_spoiler_asked_entity or next(
                iter(kb_card_names(kb_text)), ""
            )
            kb_followup_memory.remember(
                app_id=app_id,
                app_name=app_name,
                text_resolved_title=text_resolved_title,
                subject=followup_subject,
            )
        kb_survived = kb_result is not None and kb_result.attached and stacked.knowledge_attached
        strategy_domain_guidance = ask_mode == "strategy" or (
            kb_domain == "strategy" and kb_survived
        )
        if strategy_domain_guidance:
            strategy_spoiler_consent_effective = bool(spoiler_consent) or user_consents_strategy_spoilers(
                question_for_model
            )

        spoiler_risk_signals = build_spoiler_risk_signals(
            ask_mode=ask_mode,
            app_id=app_id,
            question=question_for_model,
            game_genres=strategy_spoiler_game_genres,
            kb_text=kb_text,
            asked_entity=strategy_spoiler_asked_entity,
            kb_entity_match=strategy_spoiler_kb_entity_match,
            # D19 locks this: a title recognised from the question gets that title's spoiler
            # profile, so asking about Ocarina of Time by name is fenced like Ocarina of Time
            # even with nothing running. `app_name` stays empty everywhere else on purpose --
            # the reply must not start claiming a game is running when none is.
            title_profile=resolve_title_spoiler_profile(
                app_id, app_name or text_resolved_title
            ),
        )

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
            proton_log_attachment=early_context_combined or None,
            proton_log_transparency=proton_log_transparency,
            followup_subject=followup_subject_for_prompt,
            strategy_spoiler_consent=strategy_spoiler_consent_effective,
            strategy_spoiler_asked_entity=strategy_spoiler_asked_entity,
            strategy_spoiler_kb_entity_match=strategy_spoiler_kb_entity_match,
            strategy_domain_guidance=strategy_domain_guidance,
            token_stream_request_id=token_stream_request_id,
            strategy_checklist_state=strategy_checklist_state,
            preferred_model=preferred_model,
        )
        elapsed = round(time.time() - start, 1)
        base_response_text = str(ollama_result.get("response", "") or "No response text.")
        response_text = base_response_text
        applied = None
        pyro_asshole = ollama_result.get("pyro_asshole_mode") is True

        if ollama_result.get("success"):
            loop = asyncio.get_running_loop()
            tmin, tmax, gmin, gmax = TDP_MIN_W, TDP_MAX_W, GPU_CLK_MIN_MHZ, GPU_CLK_MAX_MHZ

            def _parse_only() -> Optional[dict]:
                return parse_tdp_recommendation(
                    base_response_text,
                    tmin,
                    tmax,
                    gmin,
                    gmax,
                )

            rec = None if pyro_asshole else await loop.run_in_executor(None, _parse_only)

            if read_tdp:
                logger.info("ask_game_ai: read-TDP question; sysfs apply skipped")
            elif pyro_asshole:
                logger.info("ask_game_ai: pyro asshole easter egg; hardware apply suppressed")
            elif rec:
                # TDP/GPU suggestions are read-only — never write sysfs from Ask.
                logger.info("ask_game_ai: parsed TDP recommendation (suggestion-only): %s", rec)
                applied = {
                    "tdp_watts": None,
                    "gpu_clock_mhz": None,
                    "errors": [],
                    "suggestion": {
                        "tdp_watts": rec.get("tdp_watts"),
                        "gpu_clock_mhz": rec.get("gpu_clock_mhz"),
                    },
                }
            else:
                logger.info("ask_game_ai: no TDP recommendation found in response")

            # The block above is how the power suggestion is read out of the reply -- it must
            # run first. This removes that same raw JSON from the text a person actually reads,
            # since parsing it never removed it (the traced cause of a reply ending in a raw
            # {"tdp_watts": ...} line). A fenced code sample is left alone.
            response_text = strip_tdp_recommendation_block(response_text)

        # Output-side safety check: run once the full reply is in hand (see
        # destructive_advice_guard.py for why this is finished-reply, not per-token). Runs on
        # the actual model text (base_response_text) so a prior append can't hide a second
        # flaggable sentence from itself, but the notice lands on response_text -- the copy
        # that reaches the user and transparency.
        destructive_advice_check: dict[str, Any] = {"flagged": False, "signals": []}
        if ollama_result.get("success"):
            destructive_advice_check = check_destructive_advice(base_response_text)
            # Logged whether or not it fires. Only the firing case used to say anything, which
            # meant a reply that reached the user with no notice was indistinguishable from a
            # guard that never ran -- and the ask trace records the final text, not whether the
            # matcher executed. DESTRUCT-ADVICE-01 sat on exactly that ambiguity: the roadmap
            # entry could not say whether it was a wiring failure or a wording gap without a
            # code change first. It was the wording; this line is so the next one is cheaper.
            logger.info(
                "run_game_ai_request: destructive advice guard ran flagged=%s signals=%d backup_mention=%s",
                bool(destructive_advice_check.get("flagged")),
                len(destructive_advice_check.get("signals") or []),
                bool(destructive_advice_check.get("has_backup_mention")),
            )
            if destructive_advice_check.get("flagged"):
                logger.warning(
                    "run_game_ai_request: destructive advice guard fired (%d signal(s))",
                    len(destructive_advice_check.get("signals") or []),
                )
                response_text = append_destructive_advice_notice(
                    response_text, destructive_advice_check
                )

        # Attribution notes: two footers, each saying which half of the knowledge base this
        # reply did *not* get help from. Appended after the safety notice above so a reply that
        # trips more than one shows the safety warning first.
        #
        # They can never both appear on one reply, and "no tip for this" wins the tie. A turn
        # this specific can happen: an Expert or Strategy ask about a game whose notes are
        # covered (so "not in my notes" would qualify), where this particular question read as
        # troubleshooting and got routed to the tip sheet instead (kb_domain == "compat"), and
        # nothing there matched either. "Not in my notes" would be true but misleading -- the
        # search never looked in the notes this turn -- so it is suppressed whenever "no tip for
        # this" applies. See TheTwoLinesNeverBothAppearTests in test_kb_not_in_notes_notice.py
        # for the case proven, and D87 (docs/planning/48-kb-wave-three-session.md § 6) for why
        # the tip sheet needed this line at all.
        if ollama_result.get("success"):
            show_no_tip_for_this = should_show_no_tip_for_this_notice(
                kb_attached=bool(kb_transparency.get("kb_attached")),
                kb_domain=str(kb_transparency.get("kb_domain") or ""),
                kb_unavailable_reason=str(kb_transparency.get("kb_unavailable_reason") or ""),
                kb_notes=str(kb_transparency.get("kb_notes") or ""),
            )
            show_not_in_notes = should_show_not_in_notes_notice(
                ask_mode=ask_mode,
                kb_attached=bool(kb_transparency.get("kb_attached")),
                kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
            ) and not show_no_tip_for_this
            # The third line (D88). It fires on the case the other two cannot reach: a note
            # DID come back, and it was a stretch. No tie-break against them is needed or
            # written -- they require nothing to have attached and this requires something to
            # have, so the three are mutually exclusive by construction.
            show_no_close_match = should_show_no_close_match_notice(
                ask_mode=ask_mode,
                kb_attached=bool(kb_transparency.get("kb_attached")),
                kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
                kb_domain=str(kb_transparency.get("kb_domain") or ""),
                kb_best_meaning=kb_transparency.get("kb_best_meaning"),
                kb_top_card_keyword_score=float(
                    kb_transparency.get("kb_top_card_keyword_score") or 0.0
                ),
            )
            response_text = append_not_in_notes_notice(response_text, show_not_in_notes)
            response_text = append_no_tip_for_this_notice(response_text, show_no_tip_for_this)
            response_text = append_no_close_match_notice(response_text, show_no_close_match)

        err_tail = ""
        if not ollama_result.get("success"):
            err_tail = base_response_text[:8000]

        ollama_route_snapshot = build_ollama_route_snapshot(
            raw_question=question,
            sanitizer_action=str(lane.action),
            sanitizer_reason_codes=list(lane.reason_codes),
            text_after_sanitizer=question_for_model,
            ollama_result={
                **ollama_result,
                **kb_transparency,
                **kb_coverage_transparency,
                "tdp_cap_watts": pre_cap if tdp_grounding_requested else None,
                "ask_mode": ask_mode,
                "spoiler_risk_signals": spoiler_risk_signals,
            },
            base_response_text=base_response_text,
            response_text=response_text,
            applied=applied,
            app_id=app_id,
            app_name=app_name,
            pc_ip=pc_ip,
            err_tail=err_tail,
            elapsed_seconds=elapsed,
            reply_followup=reply_followup,
        )
        await plugin._persist_input_transparency(ollama_route_snapshot)

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
            "strategy_checklist": ollama_result.get("strategy_checklist"),
            "model_policy_disclosure": ollama_result.get("model_policy_disclosure"),
            "strategy_spoiler_consent_effective": bool(
                ollama_result.get("strategy_spoiler_consent_effective", False)
            ),
            "preset_carousel_inject": ollama_result.get("preset_carousel_inject"),
            "transparency": transparency_snapshot_for_chat_slot(ollama_route_snapshot),
        }
    except Exception as exc:
        elapsed = round(time.time() - start, 1)
        logger.exception("run_game_ai_request failed (%.1fs)", elapsed)
        error_route_snapshot = build_error_route_snapshot(
            raw_question=question,
            final_response=(
                "Something went wrong while processing your Ask. "
                "If this repeats, check the plugin log on the Deck."
            ),
            app_id=app_id,
            app_name=app_name,
            pc_ip=pc_ip,
            elapsed_seconds=elapsed,
        )
        await plugin._persist_input_transparency(error_route_snapshot)
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
            "transparency": transparency_snapshot_for_chat_slot(error_route_snapshot),
            "strategy_guide_branches": None,
            "strategy_checklist": None,
            "model_policy_disclosure": None,
            "strategy_spoiler_consent_effective": False,
        }
