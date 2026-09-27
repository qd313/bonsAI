"""Title: Running one Ask question, start to finish

Purpose: This file is the whole journey of one Ask question, from the moment it arrives to the
moment a reply is ready to show. It decides whether the question can be answered instantly by a
local shortcut, or must be refused outright (no permission, blocked by the safety filter); if
neither, it gathers everything the AI might need — Proton/Steam log excerpts for a troubleshooting
question, a search of the local knowledge base, the Deck's current power setting — packs that into
a budget, sends the question and its gathered context to the AI, and then cleans up the reply
(pulls out any power-setting suggestion, runs a safety check, appends a short footer noting when
the knowledge base had nothing useful). Along the way it also builds the Show details record for
whichever path the question actually took.

Used for: Called for every game Ask, by the same-tab flow and by the background flow that keeps
answering while a person has moved to a different tab.

Solves: One place that owns the full question-to-answer journey — the local shortcuts, the
knowledge-base search, the safety checks, the power-setting reading — so main.py just calls this
and does not have to know the shape of any of it.

Does not: Decide what a question the screen can ask is named, or manage the background poll loop
that keeps an Ask alive after the person switches tabs — both live in main.py and the background-job
file.

Plan 65: the attached-notes parsing, log fields and live publish now live in
kb_attached_notes.py, imported back in here so every name still reads as part of this module.

How it works:

    question in
       |
       +-- a fast local command? ------------> answered right away, no AI call
       |
       +-- a screenshot with no permission? -> refused, no AI call
       |
       +-- blocked by the safety filter? ----> refused, no AI call
       |
       v
    gather what the AI might need
    (Proton/Steam logs, a knowledge-base search, the Deck's current power setting)
       |
       v
    send the question, with that context attached, to the AI
       |
       v
    clean up the reply
    (pull out any power-setting suggestion, run the safety check,
     add a short footer if the knowledge base had nothing useful)
       |
       v
    answer back, with a Show details record attached

1. Three shortcuts are checked first, each one able to end the whole thing early: a fast local
   command the safety filter already recognised, a screenshot attached without the right
   permission turned on, or a question the safety filter blocks outright. Any of the three
   returns straight away without ever reaching the AI.
2. If none of those apply, the roleplay character voice is resolved (or reused, if the caller
   already resolved it, so the "surprise me" pick is never rolled twice for one question — see
   the note on `run_game_ai_request()` itself for why that matters).
3. Proton/Steam log excerpts are collected when the question reads as troubleshooting and the
   permission is on. The local knowledge base is searched when it looks worth searching,
   including carrying over the subject of a very recent Strategy or Expert question so a bare
   follow-up like "what about her second phase" still finds the right note.
4. Everything gathered is packed into one context block against a size budget — Proton logs get
   first claim on the budget, so a large log excerpt can crowd out a knowledge-base note. Whether
   the knowledge base counts as "attached" for Show details is only decided after this packing
   step, not before, so a note that got crowded out is never shown as having reached the AI.
5. Whether this question is about the Deck's current power setting is worked out, and if so the
   current setting is read before the question goes out, so the AI can answer using the real
   number instead of guessing.
6. The question, with everything gathered, is sent to the AI. Once a reply comes back: any
   power-setting suggestion in it is pulled out and the raw text describing it is removed from
   what the person reads (the suggestion is never applied automatically — Ask only ever
   suggests); the finished reply is run through the safety check for dangerous advice; and up to
   one of two short footers may be appended noting that the notes had nothing, or nothing close,
   for this question (the two are mutually exclusive by construction — see D88 in the comments
   where they are appended for exactly why).
7. A Show details record is built for this turn and saved, and the final answer is handed back.

Gotchas:
- The whole thing is wrapped in one try/except. Anything unexpected inside still returns a
  normal-shaped reply — a plain "something went wrong" message plus its own Show details record
  — rather than an exception a caller has to guard against separately.
- The dict this returns has to keep the same field names (success, response, applied, the
  disclosure fields, and so on) that main.py and the screen already expect — a renamed or
  dropped field here breaks a reader on the other side of that boundary, not just this file.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Optional

import decky

from backend.services.capabilities import capability_enabled
from backend.services.ai_character_service import (
    build_roleplay_system_suffix_meta,
    spy_lying_mode_active,
)
from backend.services.destructive_advice_guard import (
    append_destructive_advice_notice,
    check_destructive_advice,
)
from backend.services import chat_turn_recorder
from backend.services import kb_followup_memory
from backend.services.input_sanitizer_service import apply_input_sanitizer_lane
from backend.services.kb_not_in_notes_notice import (
    append_no_close_match_notice,
    append_not_in_notes_notice,
    should_show_no_close_match_notice_for_turn,
    should_show_not_in_notes_notice,
    tip_sheet_turn_came_back_empty,
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
from backend.services.response_verify import (
    cover_named_spoilers,
    cover_thinking_text,
    drop_branch_menu_copying_the_worked_example,
    verify_ollama_response,
)
from backend.services.spy_confession_service import parse_spy_lies_tag
from backend.services.strategy_spoiler_policy import (
    neutralize_protected_names_in_branch_menu,
    resolve_turn_spoiler_protected_names,
)
from backend.services.knowledge_base_service import (
    kb_coverage_to_transparency,
    lookup_game_genres,
    resolve_title_from_question,
    retrieve_knowledge_context,
    should_retrieve_knowledge,
    stack_context_blocks,
    summarize_kb_coverage,
)
# Parsing the attached-notes text block back into per-card records, the app-activity log
# fields for a knowledge-base search, and the live-snapshot publish -- moved to their own file
# (plan 65). Imported here, not just called qualified, so every name below stays reachable at
# `game_ai_request.<name>` for the tests and callers that already reach it that way.
from backend.services.kb_attached_notes import (
    _KB_NOTE_HEADER_RE,
    _KB_NOTE_OMITTED_TAIL_RE,
    _kb_note_source_host,
    _kb_search_log_fields,
    _parse_kb_attached_notes,
    _publish_kb_attached_notes_live,
    mark_spoiler_protected_notes,
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


_CHAT_OWN_GAME_LOOKBACK_TURNS = 12


def _chat_own_game_title(settings: dict, chat: dict) -> str:
    """The chat's own game, for the case D19 itself cannot resolve: nothing running and the
    question naming nothing either (plan 68 step 2, the first memory-check failure from plan
    68's own § 1 -- fixed here per its § 8 question 1 default). A running game and a title the
    question names both still win over this; the caller only reaches here once both are absent.

    Walks the chat's own turns newest first, at most the newest 12, for the first of: a turn's
    own ``app_name`` (resolved against the corpus the same way D19 resolves the question itself,
    or used as written when it does not resolve to anything), or a user turn's own text resolved
    the same way. The chat's ``origin_app_name`` is the last resort. "" when none of that turns
    up anything -- today's behaviour, unchanged.
    """
    turns = chat.get("turns")
    if isinstance(turns, list) and turns:
        for turn in reversed(turns[-_CHAT_OWN_GAME_LOOKBACK_TURNS:]):
            if not isinstance(turn, dict):
                continue
            turn_app_name = str(turn.get("app_name") or "").strip()
            if turn_app_name:
                return resolve_title_from_question(settings, turn_app_name) or turn_app_name
            if str(turn.get("role") or "") == "user":
                resolved = resolve_title_from_question(settings, str(turn.get("text") or ""))
                if resolved:
                    return resolved
    return str(chat.get("origin_app_name") or "").strip()


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
    question_for_display: str = "",
) -> dict:
    """Run one full ask lifecycle, including Ollama call timing and optional TDP application.

    ``question_for_display`` (plan 70 helper K): the friendly caption the caller already worked
    out for this turn, when it differs from ``question`` itself -- e.g. a branch pick sends
    ``"[Strategy follow-up] I'm at: …"`` but the caller (main.py's background accept step) already
    has ``"I'm at: …"`` on hand, the same text the saved turn header shows. Preferred over the
    plain sanitized text (``question_for_retrieval``) everywhere a person-facing quote is built --
    the live progress line and the saved "text_after_sanitizer" field -- so neither shows internal
    plumbing a bare follow-up's own reminder wasn't the only way to trigger (caught on the Deck,
    docs/test-evidence/plan70-L5-FLOW3-DRG.json, right after picking a branch from the suggestion
    menu). Blank when the caller has nothing better than the sanitized text, which is the same as
    not passing it at all.

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
                "app_name": app_name,
                "model_policy_disclosure": None,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "strategy_spoiler_consent_effective": False,
                "strategy_spoiler_asked_entity": "",
                "kb_attached_notes": [],
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
                "app_name": app_name,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "model_policy_disclosure": None,
                "strategy_spoiler_consent_effective": False,
                "strategy_spoiler_asked_entity": "",
                "kb_attached_notes": [],
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
                "app_name": app_name,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
                "strategy_guide_branches": None,
                "strategy_checklist": None,
                "model_policy_disclosure": None,
                "strategy_spoiler_consent_effective": False,
                "strategy_spoiler_asked_entity": "",
                "kb_attached_notes": [],
                "transparency": transparency_snapshot_for_chat_slot(sanitizer_block_snapshot),
            }
        question_for_model = lane.text
        # Retrieval searches the user's actual words. question_for_model grows a follow-up
        # header below, and _fts_match_query keeps only a bounded number of tokens, so a
        # follow-up Ask used to be searched as "REPLY FOLLOW UP CONTEXT The user is refining
        # their previous Ask ..." — boilerplate identical on every follow-up, and nothing of
        # what was asked. The model still receives the header; the index does not.
        question_for_retrieval = lane.text
        # Plan 70 helper K: prefer the caller's own friendly caption (a branch pick's "I'm at:
        # …", the same text the saved turn header shows) over the plain sanitized text for
        # anything a person reads back as "the question" -- see question_for_display's own
        # parameter doc above for why.
        effective_display_question = question_for_display.strip() or question_for_retrieval

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
        # Plan 68 step 2: the chat this request belongs to, loaded once here -- {} when the Ask
        # did not come from a saved chat. Used below for this chat's own remembered follow-up
        # subject, and (task 3) for the chat's-own-game fallback when nothing is running and the
        # question names nothing. A restart loses every in-memory subject, so the chat's own
        # saved one is seeded back in here, once, before anything below might read it -- never
        # overwriting a subject this process already worked out by asking (see seed()'s guard).
        request_chat = (
            plugin.chat_for_request(active_rid) if hasattr(plugin, "chat_for_request") else {}
        )
        chat_id = str(request_chat.get("id") or "")
        kb_followup_memory.seed(chat_id, request_chat.get("subject"))
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

        # D19: with nothing running, a title the question names is the only way into the
        # strategy corpus. Resolved only when Steam gives us neither an AppID nor a name, so a
        # running game always wins -- a question mentioning Portal 2 while Hades is open is
        # still an Ask about Hades. Resolved before the coverage summary below (not after, as
        # it used to be): a question-named game has to reach that check too, or the honesty
        # lines can never fire for the one case where a person is most likely leaning on the
        # model's own memory instead of a real note -- see summarize_kb_coverage's own comment
        # on why "nothing running" and "a game only named in the question" are different facts.
        text_resolved_title = ""
        if not str(app_id or "").strip() and not str(app_name or "").strip():
            text_resolved_title = resolve_title_from_question(settings, question_for_retrieval)
            if not text_resolved_title:
                # Plan 68 step 2: the first memory-check failure from the plan's own § 1 -- with
                # no game running and the question naming nothing, the knowledge-base search used
                # to get no game at all. Falls back to the chat's own game; still loses to a
                # running game or a title the question names, both handled above already.
                chat_own_title = _chat_own_game_title(settings, request_chat)
                if chat_own_title:
                    text_resolved_title = chat_own_title
                    logger.info(
                        "kb: no game running or named -- using the chat's own game %s",
                        chat_own_title,
                    )

        kb_coverage_transparency = kb_coverage_to_transparency(
            summarize_kb_coverage(
                settings,
                app_id=app_id,
                app_name=app_name,
                shortcut_name=shortcut_name,
                text_resolved_title=text_resolved_title,
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
        async def _forget_this_chats_subject() -> None:
            """The library is off, or this question is troubleshooting -- either way this chat
            keeps no remembered subject going forward. Only saves to the chat's own file when
            there was actually something to clear (plan 68 step 2)."""
            had_one = bool(chat_id) and kb_followup_memory.snapshot(chat_id) is not None
            kb_followup_memory.forget(chat_id=chat_id)
            if had_one:
                await chat_turn_recorder.save_chat_subject(plugin, chat_id, None)

        followup_subject_for_prompt = ""
        # Plan 70 helper K, finish 3: set below when send_prev_qa_enabled() has something to send,
        # but not spliced into question_for_model until right before the ask_ollama call further
        # down -- after strategy_spoiler_asked_entity, spoiler_risk_signals and the person's own
        # spoiler consent are all read off question_for_model. Splicing it in here, where an
        # earlier commit did, let the previous turn's own boss name (a system reminder, not
        # anything the person typed) get picked up by extract_strategy_asked_entity as if the
        # person had named it themselves on *this* turn -- unfencing spoilers nobody asked to
        # unfence, and reproduced by
        # FollowupMemoryPromptSubjectWiringTests.test_the_remembered_subject_never_reaches_the_spoiler_consent_kwargs
        # once this switch defaulted on. build_previous_turn_context_block's own template already
        # says "a system reminder, not something the user typed"; the code has to actually keep it
        # out of the person's-own-words checks too, not just say so in the prompt.
        finish3_prev_turn_block = ""
        if settings.get("use_local_knowledge_base") is not True:
            await _forget_this_chats_subject()
        elif kb_domain == "compat":
            await _forget_this_chats_subject()
        elif kb_memory_eligible and kb_domain == "strategy":
            remembered_subject = kb_followup_memory.recall(
                app_id=app_id,
                app_name=app_name,
                text_resolved_title=text_resolved_title,
                chat_id=chat_id,
            )
            if remembered_subject and not extract_strategy_asked_entity(question_for_retrieval):
                question_for_kb_search = kb_followup_memory.augment_search_words(
                    question_for_retrieval, remembered_subject=remembered_subject
                )
                followup_subject_for_prompt = remembered_subject
                # Plan 70 helper K, finish 3 (the maintainer's pick, on unless
                # send_prev_qa_enabled() is turned off): hand the model the previous turn's own
                # question and a trimmed copy of its answer, on the same bare-follow-up turn the
                # subject note above is carried on. Computed here, spliced into question_for_model
                # later -- see finish3_prev_turn_block's own comment above for why.
                if kb_followup_memory.send_prev_qa_enabled():
                    prev_question, prev_answer = kb_followup_memory.recall_previous_turn(
                        app_id=app_id,
                        app_name=app_name,
                        text_resolved_title=text_resolved_title,
                        chat_id=chat_id,
                    )
                    finish3_prev_turn_block = kb_followup_memory.build_previous_turn_context_block(
                        prev_question, prev_answer
                    )

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
            # The per-game tip check (plan 70) can send a turn locked to "strategy" to the tip
            # sheet; from here on it is a troubleshooting turn -- no follow-up subject, tips parsed
            # as tips, the "no close match" line judged as tips.
            if kb_result.notes == "compat_tips":
                kb_domain = "compat"
            if kb_result.attached:
                kb_text = kb_result.text_block
                # Plan 70 helper K, finish 2 (off unless drop_runnerup_notes_enabled()): on the
                # same bare-follow-up turn the subject note is carried on, keep only the
                # subject's own card and drop any sibling notes so the model has nothing else to
                # write about instead. A no-op when the subject does not name any attached card.
                if followup_subject_for_prompt and kb_followup_memory.drop_runnerup_notes_enabled():
                    kb_text = kb_followup_memory.drop_runner_up_notes(
                        kb_text, subject=followup_subject_for_prompt
                    )

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
                best_meaning_without_game_name=kb_result.best_meaning_without_game_name,
            )
            # Off by default (Settings -> Advanced -> App activity logging to Desktop, level
            # Verbose) -- this line only lands in ~/Desktop/bonsAI_logs/bonsai-app-*.log once
            # that is turned on and filesystem writes are allowed. See _kb_search_log_fields
            # for why it exists and what each field means. `hasattr` guards the same way the
            # `_publish_thinking_phase_key` calls above do, since not every caller of this
            # function (the test doubles in tests/test_game_ai_request*.py) is the real Plugin.
            if hasattr(plugin, "_maybe_app_log"):
                await plugin._maybe_app_log(
                    "ask.kb_search",
                    "knowledge-base search",
                    level="verbose",
                    fields=_kb_search_log_fields(
                        kb_result,
                        kb_domain=kb_domain,
                        app_name=app_name,
                        kb_survived=kb_survived,
                        starved=starved,
                    ),
                )

        # Plan 58 phase 1: the "From the notes" block's own material -- the notes that actually
        # reached the model, in their own words, from what retrieval attached and nowhere else.
        # Empty whenever nothing survived the budget (`kb_survived` false), the same gate
        # `kb_transparency` above uses, so the block and the honesty lines never both fire off a
        # card that got dropped. Published to the live snapshot further down, once its spoiler
        # marks are in, still before ask_ollama is called, so a caller reading it can open the
        # block before the model's first word, as `strategy_spoiler_asked_entity` already does.
        kb_attached_notes: list[dict[str, Any]] = (
            _parse_kb_attached_notes(kb_text, kb_domain=kb_domain, sources=kb_result.sources)
            if kb_result is not None and kb_survived
            else []
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
            question_for_model,
            known_entities=kb_card_names(kb_text),
            # A game whose own name doubles as one of its own entities' names (Hollow Knight is
            # both the game and its final boss) must not have that name alone read as naming a
            # note -- see extract_strategy_asked_entity's ``game_name`` doc.
            game_name=app_name or text_resolved_title,
        )
        # Plan 54 gap 2, streaming: hand the named thing to the live poll before ask_ollama runs,
        # the same guard shape _publish_thinking_phase_key already uses, so the screen can open a
        # spoiler box on the first streamed word instead of waiting for completion.
        if (
            strategy_spoiler_asked_entity
            and isinstance(active_rid, int)
            and hasattr(plugin, "_publish_asked_entity")
        ):
            plugin._publish_asked_entity(active_rid, strategy_spoiler_asked_entity)
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
                chat_id=chat_id,
            )
            if followup_subject and chat_id:
                await chat_turn_recorder.save_chat_subject(
                    plugin, chat_id, kb_followup_memory.snapshot(chat_id)
                )
        kb_survived = kb_result is not None and kb_result.attached and stacked.knowledge_attached
        strategy_domain_guidance = ask_mode == "strategy" or (
            kb_domain == "strategy" and kb_survived
        )
        if strategy_domain_guidance:
            strategy_spoiler_consent_effective = bool(spoiler_consent) or user_consents_strategy_spoilers(
                question_for_model
            )

        # D19 locks this: a title recognised from the question gets that title's spoiler
        # profile, so asking about Ocarina of Time by name is fenced like Ocarina of Time
        # even with nothing running. `app_name` stays empty everywhere else on purpose --
        # the reply must not start claiming a game is running when none is. Computed once and
        # reused for the prompt below (plan 54 gap 3) so the chip and the prompt can never
        # disagree about which game this is.
        strategy_title_profile = resolve_title_spoiler_profile(
            app_id, app_name or text_resolved_title
        )
        # D112 #7: this turn's protected names, decided once, here, before the model is called --
        # the attached notes are marked with them before they are published live, so the "From
        # the notes" block never names a protected note in plain text (plan 70). Reused below for
        # the finished answer, its thinking and the branch menu. See
        # resolve_turn_spoiler_protected_names's own doc for what it decides and why.
        spoiler_protected_names_for_turn = resolve_turn_spoiler_protected_names(
            question, kb_text, spoiler_consent_effective=strategy_spoiler_consent_effective,
            strategy_domain_guidance=strategy_domain_guidance, ask_mode=ask_mode, app_id=app_id,
            app_name=app_name, title_profile=strategy_title_profile,
        )
        mark_spoiler_protected_notes(kb_attached_notes, spoiler_protected_names_for_turn)
        _publish_kb_attached_notes_live(plugin, active_rid, kb_attached_notes)

        spoiler_risk_signals = build_spoiler_risk_signals(
            ask_mode=ask_mode,
            app_id=app_id,
            question=question_for_model,
            game_genres=strategy_spoiler_game_genres,
            kb_text=kb_text,
            asked_entity=strategy_spoiler_asked_entity,
            kb_entity_match=strategy_spoiler_kb_entity_match,
            title_profile=strategy_title_profile,
            kb_domain=kb_domain,
        )

        # Plan 70 helper K, finish 3: spliced in only now, after every spoiler-safety read of
        # question_for_model above (asked-entity extraction, the person's own consent phrasing,
        # the risk signals) -- see finish3_prev_turn_block's own comment near where it is set.
        if finish3_prev_turn_block:
            question_for_model = f"{finish3_prev_turn_block}\n{question_for_model}"

        # `request_chat`, loaded once near the top, goes to the model call too: its turns, its own
        # summary and its id (plan 68). The question being asked now IS its newest turn -- it is
        # written to the chat when the Ask is accepted, before this runs -- and the memory builder
        # drops that trailing turn itself. How much of the chat actually reaches the AI, and
        # whether it needs summing up first, is decided inside ask_ollama, not here.
        ollama_result = await plugin.ask_ollama(
            question_for_model,
            pc_ip,
            app_id,
            app_name,
            chat=request_chat,
            request_timeout_seconds=request_timeout_seconds,
            attachments=atts,
            ask_mode=ask_mode,
            # Plan 70 helper K: the person's own words -- the caller's own friendly caption when
            # it gave one, else the plain sanitized text, but never a reply_followup chip header
            # or finish 3's own reminder text spliced in above. For every status line and safety
            # check downstream that quotes "the question" rather than sending it to the model.
            # See question_for_display's own doc in ollama_ask_service.py.
            question_for_display=effective_display_question,
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
            strategy_title_profile=strategy_title_profile,
            token_stream_request_id=token_stream_request_id,
            strategy_checklist_state=strategy_checklist_state,
            preferred_model=preferred_model,
        )
        elapsed = round(time.time() - start, 1)
        base_response_text = str(ollama_result.get("response", "") or "No response text.")
        response_text = base_response_text
        applied = None
        pyro_asshole = ollama_result.get("pyro_asshole_mode") is True

        # The Spy's confession tag (spy_confession_service.py) is stripped from response_text --
        # the copy a person reads -- but base_response_text is left exactly as the model wrote
        # it, tag included, so the destructive advice guard below still sees the same text it
        # always has. rp_meta was resolved above (or handed in by the caller) before this Ask
        # ever reached Ollama, so it names the same preset the prompt was actually built for.
        spy_lying_active = bool(ollama_result.get("success")) and spy_lying_mode_active(
            settings, rp_meta.resolved_preset_id
        )
        spy_lies: list[str] = []
        if spy_lying_active:
            response_text, spy_lies = parse_spy_lies_tag(response_text)

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

        # The rule-based answer checker (response_verify.py) has existed since before this
        # session but was never actually called from anywhere -- it ran zero times. It looks for
        # a short list of patterns a hallucinated reply tends to show (an invented AppID when no
        # game was attached, a promised power-tuning block that never showed up, an
        # over-confident claim with no game context) and returns which of them fired. Log only,
        # on purpose: nothing here changes the reply or shows on screen. This is a quiet trial
        # run so the plugin log can say how often the rules would have fired before anyone
        # decides whether a screen-visible version is worth building.
        verify_result: Optional[dict[str, Any]] = None
        if ollama_result.get("success"):
            verify_result = verify_ollama_response(
                response_text=base_response_text,
                app_id=app_id,
                app_name=app_name,
                promised_json=tdp_grounding_requested,
            )
            logger.info(
                "run_game_ai_request: answer checker ran rules_fired=%d warnings=%s",
                len(verify_result.get("warnings") or []),
                verify_result.get("warnings") or [],
            )

        # Attribution notes: footers saying the reply did not get help from the notes.
        # Appended after the safety notice above so a reply that trips more than one shows the
        # safety warning first. (A tip-sheet line, "No tip for this", was retired by the
        # maintainer on 2026-09-27.)
        #
        # "Not in my notes" stays off a turn this specific: an Expert or Strategy ask about a
        # game whose notes are covered, where this particular question read as troubleshooting
        # and got routed to the tip sheet instead (kb_domain == "compat"), and nothing there
        # matched either. The line would be true but misleading -- the search never looked in
        # the notes this turn.
        if ollama_result.get("success"):
            tip_sheet_came_back_empty = tip_sheet_turn_came_back_empty(
                kb_attached=bool(kb_transparency.get("kb_attached")),
                kb_domain=str(kb_transparency.get("kb_domain") or ""),
                kb_unavailable_reason=str(kb_transparency.get("kb_unavailable_reason") or ""),
                kb_notes=str(kb_transparency.get("kb_notes") or ""),
            )
            show_not_in_notes = should_show_not_in_notes_notice(
                ask_mode=ask_mode,
                kb_attached=bool(kb_transparency.get("kb_attached")),
                kb_coverage_status=str(kb_coverage_transparency.get("kb_coverage_status") or ""),
            ) and not tip_sheet_came_back_empty
            # The second line (D88). It fires on the case the first cannot reach: a note DID
            # come back, and it was a stretch. No tie-break is needed or written -- "Not in my
            # notes" requires nothing to have attached and this requires something to have, so
            # the two are mutually exclusive by construction.
            #
            # Plan 70 helper B, bug 1: `kb_attached_notes` (built above by
            # `_parse_kb_attached_notes`) carries each note's own card text alongside its title,
            # so a question that describes a note instead of naming it still counts as a real
            # match -- see should_show_no_close_match_notice_for_turn's own doc for the rest of
            # this (moved out of this file, plan 70, growth-limit fix).
            show_no_close_match = should_show_no_close_match_notice_for_turn(
                ask_mode=ask_mode,
                kb_transparency=kb_transparency,
                kb_coverage_transparency=kb_coverage_transparency,
                text_resolved_title=text_resolved_title,
                question_for_kb_search=question_for_kb_search,
                kb_attached_notes=kb_attached_notes,
            )
            response_text = append_not_in_notes_notice(response_text, show_not_in_notes)
            response_text = append_no_close_match_notice(response_text, show_no_close_match)

            # D112 #7, the spoiler safety net. Run last, after the honesty footers above, so a
            # footer line is covered the same way ordinary prose is on the rare turn one happens
            # to name a protected thing; run before `ollama_route_snapshot` below so the
            # saved/"Show details" copy and the copy the person reads never disagree about what
            # got covered. The names were decided before the model call (see there).
            if spoiler_protected_names_for_turn:
                response_text = cover_named_spoilers(
                    response_text, spoiler_protected_names_for_turn
                )

            # Plan 70 helper K, finish 3: now that this turn's own answer is finished -- and
            # covered, just above, so what is remembered is what the person saw -- remember it
            # (trimmed) alongside whatever subject is already stored for this chat's game, so
            # the *next* bare follow-up can send it back. See
            # remember_previous_turn_if_eligible's own doc (moved out of this file, plan 70,
            # growth-limit fix) for the three-way eligibility guard.
            kb_followup_memory.remember_previous_turn_if_eligible(
                kb_memory_eligible=kb_memory_eligible,
                kb_domain=kb_domain,
                app_id=app_id,
                app_name=app_name,
                text_resolved_title=text_resolved_title,
                chat_id=chat_id,
                question=question_for_retrieval,
                answer=response_text,
            )

        err_tail = ""
        if not ollama_result.get("success"):
            err_tail = base_response_text[:8000]

        # D112 #7, the spoiler safety net in the model's own thinking, not just its answer:
        # measured on the Deck (THINKING-SPOILER-01), a protected name showed in plain words in
        # the live thinking line and in the saved reasoning shown in the fold afterwards, in 4 of
        # 6 tries. One covered copy, reused below for the "Show details" transparency snapshot
        # and for the finished result's own `reasoning_text` -- both the saved chat turn
        # (chat_turn_recorder.reasoning_payload_for_chat_slot) and the live poll's merged status
        # read that same finished-result field, via main.py's `result`.
        covered_reasoning_text = cover_thinking_text(
            str(ollama_result.get("reasoning_text") or ""), spoiler_protected_names_for_turn
        )

        ollama_route_snapshot = build_ollama_route_snapshot(
            raw_question=question,
            sanitizer_action=str(lane.action),
            sanitizer_reason_codes=list(lane.reason_codes),
            # The friendly caption when the caller has one (a branch pick's "I'm at: …"), else the
            # sanitizer's own output -- never question_for_model: that field name is "the question
            # after the sanitizer", read back on Show details, the saved turn header and
            # desktop_note_service -- never the text a reply_followup chip header or finish 3's
            # own reminder later added on top for the model's benefit (plan 70 helper K; caught on
            # the Deck, docs/test-evidence/plan70-QA-FREE-PLAY-01.json and -L5-FLOW3-DRG.json).
            text_after_sanitizer=effective_display_question,
            ollama_result={
                **ollama_result,
                **kb_transparency,
                **kb_coverage_transparency,
                "tdp_cap_watts": pre_cap if tdp_grounding_requested else None,
                "ask_mode": ask_mode,
                "spoiler_risk_signals": spoiler_risk_signals,
                "spy_lying_active": spy_lying_active,
                "spy_lies": spy_lies,
                "reasoning_text": covered_reasoning_text,
            },
            base_response_text=base_response_text,
            response_text=response_text,
            applied=applied,
            app_id=app_id,
            app_name=app_name,
            pc_ip=pc_ip,
            err_tail=err_tail,
            elapsed_seconds=elapsed,
            verify_result=verify_result,
            reply_followup=reply_followup,
        )
        # Plan 58 phase 1: `build_ollama_route_snapshot` and `_persist_input_transparency` are
        # both untouched by this -- the snapshot is stored and served back to Show details
        # (`get_input_transparency`) exactly as given, with no field allowlist on that path, so
        # adding a key here is enough for the finished turn's own "Show details" reopen to carry
        # it without editing transparency_service.py.
        ollama_route_snapshot = {**ollama_route_snapshot, "kb_attached_notes": kb_attached_notes}
        await plugin._persist_input_transparency(ollama_route_snapshot)

        # D112 #7, the spoiler safety net's third leak: the branch menu's own question and
        # option labels are buttons the screen draws, never spoiler-fenced (fencing would break
        # them), and cover_named_spoilers deliberately never looks inside this menu at all. A
        # protected name still reached one in plain view -- "Are you currently struggling with
        # the Soul Master's movement..." on a question that never named him (Deck,
        # NO-CLOSE-MATCH-HK-02) -- so it needs its own, non-fencing cover: a neutral phrase in
        # place of the name. This is the only place `strategy_guide_branches` is ever set (there
        # is no earlier, partial version of it -- extract_strategy_guide_branches runs once, on
        # the finished reply), so fixing it here covers the live poll and the saved turn alike.
        covered_strategy_guide_branches = neutralize_protected_names_in_branch_menu(
            drop_branch_menu_copying_the_worked_example(
                ollama_result.get("strategy_guide_branches"), app_name
            ),
            spoiler_protected_names_for_turn,
        )

        logger.info("run_game_ai_request: completed in %.1fs", elapsed)
        return {
            "success": bool(ollama_result.get("success", False)),
            "cancelled": bool(ollama_result.get("cancelled")),
            "response": response_text,
            "app_id": app_id,
            "app_name": app_name,
            "app_context": app_context,
            "applied": applied,
            "elapsed_seconds": elapsed,
            "strategy_guide_branches": covered_strategy_guide_branches,
            "strategy_checklist": ollama_result.get("strategy_checklist"),
            "model_policy_disclosure": ollama_result.get("model_policy_disclosure"),
            "strategy_spoiler_consent_effective": bool(
                ollama_result.get("strategy_spoiler_consent_effective", False)
            ),
            "strategy_spoiler_asked_entity": strategy_spoiler_asked_entity,
            "preset_carousel_inject": ollama_result.get("preset_carousel_inject"),
            "spy_lying_active": spy_lying_active,
            "spy_lies": spy_lies,
            # `transparency_snapshot_for_chat_slot` (transparency_service.py, read-only for this
            # lane) trims to a fixed field list that predates this block, so the notes are merged
            # onto its result rather than asked of that function -- chat_slot_service.py's own
            # turn sanitizer is the file that actually decides whether a saved turn keeps this key
            # (see `_normalize_turn_transparency` there), and it does.
            "transparency": {
                **transparency_snapshot_for_chat_slot(ollama_route_snapshot),
                "kb_attached_notes": kb_attached_notes,
            },
            "model": ollama_result.get("model"),
            "thinking_unsupported": bool(ollama_result.get("thinking_unsupported", False)),
            "reasoning_text": covered_reasoning_text,
            "reasoning_seconds": ollama_result.get("reasoning_seconds"),
            "reasoning_tokens": int(ollama_result.get("reasoning_tokens") or 0),
            # Plan 68 step 3: whether this answer summed the chat up first -- "written",
            # "failed", or "" when the chat had not outgrown its room. Carried through exactly
            # as ollama_ask_service.run_ask_ollama reports it.
            "chat_summary": str(ollama_result.get("chat_summary") or ""),
            # Mirrors "transparency.kb_attached_notes" at the top level too, alongside the other
            # per-turn facts this dict already carries flat (strategy_spoiler_asked_entity and so
            # on) -- see _publish_kb_attached_notes_live's docstring for the one thing reading
            # this back out of a *poll* still needs in main.py.
            "kb_attached_notes": kb_attached_notes,
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
            "app_name": app_name,
            "app_context": app_context,
            "applied": None,
            "elapsed_seconds": elapsed,
            "strategy_spoiler_asked_entity": "",
            "kb_attached_notes": [],
            "transparency": transparency_snapshot_for_chat_slot(error_route_snapshot),
            "strategy_guide_branches": None,
            "strategy_checklist": None,
            "model_policy_disclosure": None,
            "strategy_spoiler_consent_effective": False,
        }
