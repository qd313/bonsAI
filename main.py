"""Title: The plugin's front door

Purpose: This is the file Decky loads when the plugin starts, and the only
back-end file the screen is able to talk to directly. Everything the plugin can
do is a method on the single class here, and the screen calls those methods by
name: read your settings, ask the AI a question, download a model, take a
screenshot, start listening to the microphone. Very little of the real work
happens in this file. Its job is to take whatever the screen sent, check it is
allowed and makes sense, hand the work to a service next door, and turn what
comes back into something the screen can read.

Used for: Every single thing the screen asks the back end to do.

Solves: Decky needs exactly one class it can find and load. Keeping that class
thin, with the real work in the services beside it, is what stops this one file
turning into the whole program.

Does not: Talk to the AI itself, or build the words sent to it -- that is the
Ollama and game-request services. It does not store your settings either; it
reads and writes them through the settings service.

How it works:

There are two ways to ask the AI a question, and the difference between them is
the most important thing in this file:

    the screen                        this file                    a service
    ----------                        ---------                    ---------
    ask_game_ai() ..................> wait for the whole     .....> run the
      <---------- the answer <------- answer, then reply            request

    start_background_game_ai() .....> start a task and       .....> run the
      <---------- "started" <-------- answer straight away          request,
                                                                    taking its
    get_background_game_ai_status()                                 time
      ......................> "still thinking"                        |
      (asked again about once a second)                               |
      <-------- the answer, once there is one <------------------------+

The second one is what the plugin actually uses. An answer can take most of a
minute, and a call that sat there that long would freeze the screen while it
waited. So the question is accepted, a background task runs it, and the screen
keeps asking whether it is done yet.

One question at a time. The background state is shared, so a lock guards it and
a second question arriving while one is in flight is turned away as busy.

The path a question takes:

 1. `parse_ask_payload()` turns whatever shape the screen sent into plain values.
 2. Obvious refusals first: no question, or no address for the PC running the AI.
 3. Some questions never reach the AI at all. A few are commands the Deck
    answers itself -- setting up a shortcut, checking an anti-cheat, a keyword
    the safety check recognises. These finish here, inside the handler.
 4. The safety check reads the question and may block it outright, in which case
    what happened is recorded so the Transparency screen can show it.
 5. Everything else goes to `run_game_ai_request()`, which is where the prompt is
    built, the AI is called, and the reply is checked over.
 6. The answer is stored, and the next poll from the screen picks it up.

Gotchas:
 - The names of the public methods on this class ARE the promise this file
   makes to the screen. The front end calls them as strings, so renaming one
   used to break the plugin silently, with nothing failing until someone
   pressed the button. That is why the method names are now generated into a
   type the front end has to match: a typo fails the build instead of failing
   on the Deck.
 - The commands that finish inside the handler (step 3) never start a background
   task. They write a finished result straight into the shared state, so the
   very next poll sees a completed answer. Without that they would look like a
   question that was accepted and then never answered.
 - Stopping a reply does not cancel anything directly. It sets a flag that
   unblocks the network read that is sat waiting on the AI; the AI itself only
   stops once that connection closes.
"""

import asyncio
import base64
import json
import os
import sys
import threading
import time
from typing import Any, Optional, Tuple

import decky

PLUGIN_ROOT = os.path.dirname(os.path.abspath(__file__))
if PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, PLUGIN_ROOT)

from backend.services.ollama_service import (
    append_deck_tdp_sysfs_grounding,
    build_system_prompt,
    close_ollama_chat_response,
    preload_ask_model_sync,
    spawn_ollama_stop_thread,
)
from backend.services.async_task_lifecycle import cancel_and_await
from backend.services.background_request_state import (
    OMIT as _OMIT_SHORTCUT_SETUP_FIELD,
    OMIT as _UNSET_REASONING_FIELD,
    completed_local_command_state,
    new_background_state,
    new_partial_stream_snapshot,
    pending_background_state,
)
from backend.services.plugin_data_reset import reset_plugin_disk_and_defaults
from backend.services.strategy_checklist_session_service import (
    clear_session_entry,
    get_session_entry,
    load_session_store,
    normalize_ask_checklist_state,
    reset_session_file,
    rpc_entry_to_store_payload,
    save_session_store,
    session_path,
    upsert_session_entry,
)
from backend.services.local_ollama_teardown_service import (
    should_teardown_local_ollama_on_clear,
    teardown_local_ollama_for_plugin_reset,
)
from backend.services.intent_pack_service import (
    export_pack,
    intent_packs_path,
    load_intent_packs,
    merge_import_pack,
    pack_summaries,
    parse_import_payload,
    remove_pack,
    reset_intent_packs_file,
    save_intent_packs,
    set_pack_enabled,
)
from backend.services.chat_slot_service import (
    append_turn as chat_append_turn,
    create_slot as chat_create_slot,
    delete_slot as chat_delete_slot,
    ensure_slot as chat_ensure_slot,
    list_slot_summaries,
    load_slot as chat_load_slot,
    slot_to_rpc_payload,
    update_slot_label as chat_update_slot_label,
    wipe_all_slots,
)
from backend.services.reply_language_service import reply_language_snapshot
from backend.services.settings_service import (
    clamp_int,
    load_settings as load_settings_from_disk,
    sanitize_ask_mode,
    sanitize_settings,
    sanitize_unified_input_persistence_mode,
    save_settings as save_settings_to_disk,
)
from backend.services.capabilities import (
    capability_enabled,
    kids_lock_active,
    set_kids_lock_active,
)
from backend.services.desktop_note_service import (
    append_app_log_sync,
    append_desktop_ask_transparency_sync,
    append_desktop_chat_event_sync,
    append_desktop_debug_note_sync,
)
from backend.services.input_sanitizer_service import (
    apply_input_sanitizer_lane,
    classify_sanitizer_command,
    confirmation_message_for_command,
)
from backend.services.ask_local_commands import detect_local_ask_commands
from backend.services.shortcut_setup_commands import (
    classify_shortcut_setup_command,
    response_message_for_shortcut,
)
from backend.services.vac_check_commands import parse_vac_check_command, response_for_vac_check
from backend.services.screenshot_media import (
    MAX_ATTACHMENT_FILE_BYTES,
    MAX_ATTACHMENT_INLINE_BYTES,
    SUPPORTED_IMAGE_EXTENSIONS,
    build_screenshot_preview_data_uri,
    extract_app_id_from_screenshot_path,
    lookup_screenshot_vdf_metadata,
    lookup_steam_app_name,
    resolve_recent_screenshot_paths,
    resolve_plugin_capture_paths,
    merge_recent_screenshot_paths,
    take_steam_game_screenshot,
)
from backend.services.game_ai_request import run_game_ai_request
from backend.services.async_background_job import (
    make_local_ollama_setup_hooks,
    make_state_updating_on_stage,
    new_asyncio_cancel_event,
    new_threading_cancel_event,
)
from backend.services.network_service import get_deck_ip_async
from backend.services.ollama_ask_service import run_ask_ollama
from backend.services.transparency_service import (
    build_immediate_command_snapshot,
    build_sanitizer_block_snapshot,
    build_voice_transcribe_snapshot,
    transparency_snapshot_for_chat_slot,
)
from backend.services.ollama_connection_test import (
    run_ollama_connection_test,
    summarize_for_log,
)
from backend.services import ask_payload
from backend.services import kb_followup_memory
from backend.services.ask_payload import (
    coerce_payload_bool,
    parse_ask_payload,
    sanitize_attachments,
)
from backend.services.rag_corpus_status import build_rag_corpus_status
from backend.services.rag_corpus_local_install import install_rag_corpus_from_local_dir
from backend.services.tdp_service import clean_env
from backend.services.local_ollama_setup_service import (
    new_local_ollama_setup_state,
    run_local_setup,
    run_ollama_rm_async,
)
from backend.services.ollama_local_autostart_service import (
    apply_ollama_local_autostart as apply_ollama_local_autostart_entry,
    get_ollama_local_autostart_status as get_ollama_local_autostart_status_report,
)
from backend.services.ollama_mdns_discovery_service import (
    discover_mdns_ollama_hosts as run_mdns_ollama_discovery,
)
from backend.services.ollama_catalog_service import (
    fetch_catalog_metadata,
    is_valid_ollama_pull_tag,
    normalize_ollama_pull_tags,
)
from backend.services.pull_model_catalog_service import fetch_pull_model_catalog
from backend.services.voice_transcription_service import (
    VoiceTranscriptionSession,
    download_voice_model,
    engine_readiness,
    install_whisper_cli,
    new_voice_install_state,
    new_voice_transcription_state,
    sanitize_voice_stt_model,
)
from backend.services.voice_read_aloud_service import VoiceReadAloudService
from backend.services.rag_corpus_download_service import (
    fetch_remote_manifest,
    new_rag_corpus_download_state,
    remove_corpus_at_path,
    run_rag_corpus_download,
)
from backend.services.knowledge_base_service import (
    session_rag_chip_candidates_to_rpc,
    suggest_chip_candidates,
)
from backend.services.knowledge_base_schema import (
    default_corpus_dir_internal,
    resolve_corpus_db_path,
    sanitize_corpus_install_dir,
)
from backend.constants import DEFAULT_OLLAMA_PCIP
from backend.ollama_routing import (
    is_valid_setup_pull_profile,
    is_vision_capable_tag,
    merge_pulled_tag,
)
from backend.ollama_urls import build_ollama_chat_url, normalize_ollama_base

logger = decky.logger

# User-visible when a background asyncio task dies unexpectedly; never embed ``str(exc)`` (paths/internals).
_BACKGROUND_TASK_FAILED_USER_MESSAGE = (
    "Backend error: something went wrong while processing your request. Details were logged on the device."
)

# Sentinel: sanitizer immediate-complete path omits ``shortcut_setup`` from state/response; VAC sets state only.
# Imported from background_request_state so the state builder and this file agree on one object identity.


class Plugin:
    """Primary Decky backend orchestrator that preserves RPC contracts and lifecycle state.

    The class coordinates request flow, background task state, and service delegation so behavior stays
    stable while heavy logic is extracted into focused helper and service modules.
    """
    DEFAULT_LATENCY_WARNING_SECONDS = 60
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 180
    DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE = "no_persist"
    MAX_ATTACHMENT_FILE_BYTES = MAX_ATTACHMENT_FILE_BYTES
    MAX_ATTACHMENT_INLINE_BYTES = MAX_ATTACHMENT_INLINE_BYTES
    SUPPORTED_IMAGE_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS
    VALID_UNIFIED_INPUT_PERSISTENCE_MODES = {
        "persist_all",
        "persist_search_only",
        "no_persist",
    }
    # Declared once in ask_payload.py; mirrored here because two other files and a test
    # read them off the class. Do not give either a second value here.
    DEFAULT_ASK_MODE = ask_payload.DEFAULT_ASK_MODE
    VALID_ASK_MODES = ask_payload.VALID_ASK_MODES
    MIN_LATENCY_WARNING_SECONDS = 5
    MAX_LATENCY_WARNING_SECONDS = 300
    MIN_REQUEST_TIMEOUT_SECONDS = 10
    MAX_REQUEST_TIMEOUT_SECONDS = 600
    SETTINGS_FILENAME = "settings.json"
    PARTIAL_RESPONSE_FLUSH_INTERVAL_S = 0.12

    def __init__(self):
        """Initialize plugin runtime state used for background-request coordination."""
        self._background_lock = asyncio.Lock()
        self._background_task: Optional[asyncio.Task] = None
        self._background_state: dict = self._new_background_state()
        self._background_request_seq = 0
        self._last_input_transparency: Optional[dict] = None
        self._local_ollama_setup_lock = asyncio.Lock()
        self._local_ollama_setup_task: Optional[asyncio.Task] = None
        self._local_ollama_cancel_event: Optional[asyncio.Event] = None
        self._local_ollama_setup_state: dict = new_local_ollama_setup_state()
        self._abort_current_ollama_chat = threading.Event()
        self._active_ollama_chat_pc_ip: Optional[str] = None
        self._active_ollama_chat_model: Optional[str] = None
        self._active_ollama_chat_http_response: Any = None
        self._chat_resp_ready_evt: Optional[threading.Event] = None
        self._partial_response_lock = threading.Lock()
        self._partial_stream_snapshot: dict = {
            "request_id": None,
            "partial_response": None,
            "thinking_summary": None,
            "streaming": False,
            "last_flush_monotonic": 0.0,
        }
        self._voice_lock = asyncio.Lock()
        self._voice_session: Optional[VoiceTranscriptionSession] = None
        self._voice_install_lock = asyncio.Lock()
        self._voice_install_task: Optional[asyncio.Task] = None
        self._voice_install_cancel = threading.Event()
        self._voice_install_state: dict = new_voice_install_state()
        self._settings_save_lock = asyncio.Lock()
        self._intent_pack_store_lock = asyncio.Lock()
        self._strategy_checklist_store_lock = asyncio.Lock()
        self._rag_corpus_download_lock = asyncio.Lock()
        self._rag_corpus_download_task: Optional[asyncio.Task] = None
        self._rag_corpus_cancel_event: Optional[asyncio.Event] = None
        self._rag_corpus_download_state: dict = new_rag_corpus_download_state()
        self._chat_slots_store_lock = asyncio.Lock()
        self._chat_slot_by_request: dict[int, str] = {}
        self._read_aloud_service = VoiceReadAloudService(
            os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "read_aloud_tmp")
        )

    def _abort_ollama_chat_check(self) -> bool:
        """True when frontend requested Stop mid-generation (closes HTTP quickly; executor thread exits)."""
        evt = getattr(self, "_abort_current_ollama_chat", None)
        return isinstance(evt, threading.Event) and evt.is_set()

    def _settings_path() -> str:
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, Plugin.SETTINGS_FILENAME)

    @staticmethod
    def _intent_packs_path() -> str:
        return intent_packs_path(decky.DECKY_PLUGIN_SETTINGS_DIR)

    def _load_intent_pack_store(self) -> dict:
        return load_intent_packs(Plugin._intent_packs_path(), logger)

    def _save_intent_pack_store(self, store: dict) -> dict:
        return save_intent_packs(
            Plugin._intent_packs_path(),
            store,
            settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
            logger=logger,
        )

    @staticmethod
    def _sanitize_settings(data: Any) -> dict:
        return sanitize_settings(
            data=data,
            default_latency_warning_seconds=Plugin.DEFAULT_LATENCY_WARNING_SECONDS,
            default_request_timeout_seconds=Plugin.DEFAULT_REQUEST_TIMEOUT_SECONDS,
            min_latency_warning_seconds=Plugin.MIN_LATENCY_WARNING_SECONDS,
            max_latency_warning_seconds=Plugin.MAX_LATENCY_WARNING_SECONDS,
            min_request_timeout_seconds=Plugin.MIN_REQUEST_TIMEOUT_SECONDS,
            max_request_timeout_seconds=Plugin.MAX_REQUEST_TIMEOUT_SECONDS,
            valid_persistence_modes=Plugin.VALID_UNIFIED_INPUT_PERSISTENCE_MODES,
            default_persistence_mode=Plugin.DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
            valid_ask_modes=Plugin.VALID_ASK_MODES,
            default_ask_mode=Plugin.DEFAULT_ASK_MODE,
        )

    async def _main(self):
        """Run plugin startup hooks and ensure background state exists before serving RPCs."""
        # Kids lock is session-only; never leave a stale deny across backend restarts.
        set_kids_lock_active(False)
        logger.info("bonsAI plugin loaded!")
        await self._maybe_app_log("plugin.lifecycle", "plugin loaded")
        self._schedule_preload_ask_model()

    def _schedule_preload_ask_model(self) -> None:
        """Fire off the boot-time model warm-up without waiting on it.

        ``asyncio.create_task`` returns as soon as the task is *scheduled*, not once it has
        run, so this never adds time to ``_main`` even when the Ollama host is slow or
        unreachable — the one hard requirement in the roadmap entry (speed-mode VRAM preload).
        Runs once, right here, at boot; nothing polls for it afterwards.
        """
        asyncio.create_task(self._preload_ask_model_if_enabled())

    async def _preload_ask_model_if_enabled(self) -> None:
        """Warm a small installed model into memory, only when the developer switch is on.

        Off by default (``dev_preload_ask_model``), so an ordinary boot calls
        ``preload_ask_model_sync`` zero times and changes nothing. On, this resolves the same
        host a connection test would use — the fixed loopback address when Ask is routed to this
        Deck, else the first labeled host — and hands off to ``preload_ask_model_sync``.

        **The saved try order goes with it**, because warming the wrong model is worse than
        warming none: it spends memory on something no question will reach and leaves the first
        question exactly as slow. Without the order, the warm-up picks whichever small model
        happens to be installed, which on the maintainer's Deck was a 1.5B model while Ask was
        routed to a 4.6B one. Silent on any failure (unreachable host, Ask's model too big to be
        worth warming, or the host declining for lack of memory).
        """
        try:
            settings = await self.load_settings()
        except Exception:
            return
        if settings.get("dev_preload_ask_model") is not True:
            return
        pc_ip = ""
        if settings.get("ollama_local_on_deck") is True:
            pc_ip = DEFAULT_OLLAMA_PCIP
        else:
            named = settings.get("named_ollama_hosts") or []
            if isinstance(named, list) and named and isinstance(named[0], dict):
                pc_ip = str(named[0].get("host") or "").strip()
        if not pc_ip:
            return
        try:
            _, _, base = normalize_ollama_base(pc_ip)
        except Exception:
            return
        await asyncio.to_thread(preload_ask_model_sync, base, logger, settings=settings)

    async def _unload(self):
        """Run plugin shutdown logging for Decky unload events."""
        await self._maybe_app_log("plugin.lifecycle", "plugin unloading")
        ce = getattr(self, "_local_ollama_cancel_event", None)
        if isinstance(ce, asyncio.Event):
            ce.set()
        await cancel_and_await(getattr(self, "_local_ollama_setup_task", None))
        await self._stop_voice_transcription_internal()
        await asyncio.to_thread(self._read_aloud_service.stop)
        vit = getattr(self, "_voice_install_task", None)
        if vit is not None and not vit.done():
            ce_voice = getattr(self, "_voice_install_cancel", None)
            if isinstance(ce_voice, threading.Event):
                ce_voice.set()
            await cancel_and_await(vit)
        logger.info("bonsAI plugin unloaded!")

    def _new_background_state(self) -> dict:
        """Build a default background request state payload used by status polling paths."""
        return new_background_state()

    def _reset_partial_stream_snapshot(self, request_id: int) -> None:
        with self._partial_response_lock:
            self._partial_stream_snapshot = new_partial_stream_snapshot(request_id)

    def _clear_partial_stream_snapshot(self) -> None:
        with self._partial_response_lock:
            self._partial_stream_snapshot = new_partial_stream_snapshot(None)

    def _cancelled_response_text(self, request_id: Any, fallback: str) -> str:
        """
        What a stopped Ask should show: the text drafted so far, else ``fallback``.

        Two call sites reach a cancelled terminal state and they race — ``abort_background_game_ai``
        and ``_run_background_request`` both take ``_background_lock`` and whichever wins writes the
        answer. They must not disagree about it, so the rule lives here rather than being spelled out
        twice.

        Not just "non-empty": Stop can land on the first frame, when all that has arrived is markup
        debris (``<`` from a status tag, ``` from a fence) — see ``partial_stream_has_content``.
        """
        from backend.services.bonsai_stream_tags import partial_stream_has_content

        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") != request_id:
                return fallback
            partial = snap.get("partial_response")
        if isinstance(partial, str) and partial_stream_has_content(partial):
            return partial.strip()
        return fallback

    def _update_partial_response(
        self,
        request_id: int,
        text: str,
        done: bool,
        thinking_summary: Optional[str] = None,
        *,
        update_partial: bool = True,
        reasoning_partial: Any = _UNSET_REASONING_FIELD,
        reasoning_seconds: Any = _UNSET_REASONING_FIELD,
    ) -> None:
        """Thread-safe partial assistant text for background status polling (executor thread).

        ``reasoning_partial`` / ``reasoning_seconds`` (plan 57) default to a sentinel meaning "the
        caller has nothing to say about this" -- the composed-phrase phase updates
        (``_publish_thinking_phase``) never pass them, and must not blank out real thinking text a
        streaming delta already published. The streaming path (``_on_delta`` in
        ``ollama_ask_service.py``) always passes both explicitly, even when still ``None`` because
        no thinking chunk has arrived yet, which is a real value worth writing.
        """
        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") != request_id:
                return
            now = time.monotonic()
            if thinking_summary:
                # Stamp only on a real change. A phase that re-publishes the same string on every
                # delta would otherwise keep resetting the clock, and the line would never be
                # recognised as stale no matter how long it sat there.
                if thinking_summary != snap.get("thinking_summary"):
                    snap["thinking_summary"] = thinking_summary
                    snap["thinking_summary_monotonic"] = now
            # Written before the ``update_partial`` / empty-text early-outs below: a thinking
            # chunk must reach the poll even on a turn whose visible answer text is still empty
            # (plan 54 lesson -- a field that only lands at completion is useless live).
            if reasoning_partial is not _UNSET_REASONING_FIELD:
                snap["reasoning_partial"] = reasoning_partial
            if reasoning_seconds is not _UNSET_REASONING_FIELD:
                snap["reasoning_seconds"] = reasoning_seconds
            if not update_partial:
                if done:
                    snap["streaming"] = False
                return
            if done:
                snap["partial_response"] = text if text else snap.get("partial_response")
                snap["streaming"] = False
                snap["last_flush_monotonic"] = now
                return

            # Active token stream: keep fast-poll flag even when visible text is still empty
            # (e.g. model is inside <bonsai-status> before body tokens arrive).
            snap["streaming"] = True
            if not text:
                return
            prev = snap.get("partial_response")
            last_flush = float(snap.get("last_flush_monotonic") or 0.0)
            # A shrink is never a token append — it is a deliberate rewrite (soft-continue cue
            # clear, or an opening strategy fence being hidden). Never rate-limit those away:
            # no later token will arrive to correct the stale text.
            shrank = bool(prev) and len(text) < len(str(prev))
            if prev and not shrank and (now - last_flush) < Plugin.PARTIAL_RESPONSE_FLUSH_INTERVAL_S:
                return
            snap["partial_response"] = text
            snap["last_flush_monotonic"] = now

    def _active_request_id(self) -> Optional[int]:
        """Return the in-flight background Ask request_id, if any."""
        rid = self._background_state.get("request_id")
        return rid if isinstance(rid, int) else None

    def _publish_thinking_phase(self, request_id: int, summary: str) -> None:
        """Publish a deterministic prep-phase label without partial reply text."""
        from backend.services.bonsai_stream_tags import sanitize_thinking_summary

        text = sanitize_thinking_summary(summary or "")
        if not text:
            return
        self._update_partial_response(request_id, "", False, text[:240], update_partial=False)

    def _compose_opening_thinking_blurb(
        self,
        request_id: int,
        question: str,
        *,
        app_name: str = "",
        attachment_count: int = 0,
        ask_mode: str = "speed",
        settings: Optional[dict] = None,
    ) -> tuple[str, Any]:
        """Compose the opening blurb at accept time and return it with the roleplay meta.

        Both halves are returned because the caller needs them together and neither is free to
        recompute. The blurb goes back in the ``start_background_game_ai`` response so the client
        can render it without owning a second composer -- two composers keyed on two different
        request-id spaces is what made the line rewrite itself within the first poll. The roleplay
        meta is handed to the request task so ``ai_character_random`` picks a character exactly
        once per Ask, rather than once for the blurb's tone and again for the reply's voice.
        """
        from backend.services.ai_character_service import (
            build_roleplay_system_suffix_meta,
            thinking_status_tone_for_preset,
        )
        from backend.services.bonsai_stream_tags import compose_thinking_blurb

        cfg = settings if isinstance(settings, dict) else {}
        meta = build_roleplay_system_suffix_meta(cfg, ask_mode)
        character_on = bool(cfg.get("ai_character_enabled"))
        blurb = compose_thinking_blurb(
            question,
            app_name=app_name,
            attachment_count=attachment_count,
            ask_mode=ask_mode,
            request_id=request_id,
            character_enabled=character_on,
            character_preset_id=meta.resolved_preset_id,
        )
        # Stashed so the poll path can escalate a stale line in the right voice. It runs on every
        # poll and must not load settings to do it.
        tone = thinking_status_tone_for_preset(meta.resolved_preset_id) if character_on else "witty"
        with self._partial_response_lock:
            if self._partial_stream_snapshot.get("request_id") == request_id:
                self._partial_stream_snapshot["thinking_tone"] = tone
        return blurb, meta

    def _publish_asked_entity(self, request_id: int, entity: str) -> None:
        """Publish the Strategy-question's named thing before the model call finishes.

        Read by ``_merge_partial_into_background_status`` so the live streaming bubble can open
        its spoiler box from the first word, the same way ``app_name`` already does.
        """
        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") != request_id:
                return
            snap["asked_entity"] = (entity or "").strip()[:120]

    def _publish_thinking_phase_key(
        self,
        request_id: int,
        phase: str,
        *,
        app_name: str = "",
        attachment_count: int = 0,
        ask_mode: str = "speed",
        elapsed_seconds: float = 0.0,
        question: str = "",
        character_enabled: bool = False,
        character_preset_id: Optional[str] = None,
    ) -> None:
        from backend.services.bonsai_stream_tags import format_thinking_phase

        self._publish_thinking_phase(
            request_id,
            format_thinking_phase(
                phase,  # type: ignore[arg-type]
                app_name=app_name,
                attachment_count=attachment_count,
                ask_mode=ask_mode,
                elapsed_seconds=elapsed_seconds,
                question=question,
                request_id=request_id,
                character_enabled=character_enabled,
                character_preset_id=character_preset_id,
            ),
        )

    def _merge_partial_into_background_status(self, state: dict) -> dict:
        from backend.services.bonsai_stream_tags import (
            deterministic_thinking_phase_fallback,
            escalate_static_thinking_line,
        )

        out = dict(state)
        with self._partial_response_lock:
            snap = dict(self._partial_stream_snapshot)
        rid = out.get("request_id")
        if out.get("status") == "pending" and rid is not None and snap.get("request_id") == rid:
            out["partial_response"] = snap.get("partial_response")
            out["streaming"] = bool(snap.get("streaming"))
            # Plan 57: the model's own thinking, live -- null on a turn with no thinking (thinking
            # Off, or a model that cannot think), the same as the snapshot's own default.
            out["reasoning_partial"] = snap.get("reasoning_partial")
            out["reasoning_seconds"] = snap.get("reasoning_seconds")
            if snap.get("asked_entity"):
                out["strategy_spoiler_asked_entity"] = snap["asked_entity"]
            thinking = snap.get("thinking_summary")
            if isinstance(thinking, str) and thinking.strip():
                # Escalate a line that has gone stale. Once the last prep phase publishes, nothing
                # else fires unless the model emits a <bonsai-status> tag, and small models often
                # do not -- so this is what stops the line freezing for a whole generation.
                set_at = float(snap.get("thinking_summary_monotonic") or 0.0)
                static_for = max(0.0, time.monotonic() - set_at) if set_at else 0.0
                out["thinking_summary"] = escalate_static_thinking_line(
                    thinking,
                    static_seconds=static_for,
                    request_id=rid if isinstance(rid, int) else 0,
                    tone=str(snap.get("thinking_tone") or "witty"),  # type: ignore[arg-type]
                )
            else:
                started = float(out.get("started_at") or 0.0)
                elapsed = max(0.0, time.time() - started) if started else 0.0
                out["thinking_summary"] = deterministic_thinking_phase_fallback(
                    streaming=bool(snap.get("streaming")),
                    has_partial=bool(snap.get("partial_response")),
                    elapsed_seconds=elapsed,
                )
        else:
            out["partial_response"] = None
            out["streaming"] = False
            out["thinking_summary"] = None
            out["reasoning_partial"] = None
            out["reasoning_seconds"] = None
        return out

    def _desktop_app_log_level_allows(settings: dict, event_level: str) -> bool:
        lvl = str(settings.get("desktop_app_log_level") or "off")
        if lvl == "off":
            return False
        if event_level == "default":
            return lvl in ("default", "verbose")
        if event_level == "verbose":
            return lvl == "verbose"
        return False

    @staticmethod
    def _settings_change_keys_for_log(before: dict, after: dict) -> list[str]:
        sensitive = frozenset({"steam_web_api_key"})
        changed: list[str] = []
        keys = set(before.keys()) | set(after.keys())
        for key in sorted(keys):
            if before.get(key) == after.get(key):
                continue
            if key in sensitive:
                changed.append(f"{key}=<redacted>")
            elif key == "capabilities" and isinstance(before.get(key), dict) and isinstance(after.get(key), dict):
                cap_keys = set(before["capabilities"].keys()) | set(after["capabilities"].keys())
                for ck in sorted(cap_keys):
                    if before["capabilities"].get(ck) != after["capabilities"].get(ck):
                        changed.append(f"capabilities.{ck}")
            else:
                changed.append(key)
        return changed

    async def _maybe_app_log(
        self,
        category: str,
        message: str,
        *,
        level: str = "default",
        fields: Optional[dict] = None,
    ) -> None:
        """Best-effort append to Desktop/bonsAI_logs/bonsai-app-*.log; never raises."""
        try:
            settings = await self.load_settings()
            if not Plugin._desktop_app_log_level_allows(settings, level):
                return
            if not capability_enabled(settings, "filesystem_write"):
                return
            home = getattr(decky, "DECKY_USER_HOME", None) or decky.HOME
            loop = asyncio.get_running_loop()

            def _run() -> dict:
                return append_app_log_sync(
                    home,
                    level=level,
                    category=category,
                    message=message,
                    fields=fields,
                )

            result = await loop.run_in_executor(None, _run)
            if not result.get("ok"):
                logger.warning("append_app_log_sync: %s", result.get("error"))
        except Exception:
            logger.exception("_maybe_app_log failed")


    @staticmethod
    def _strategy_checklist_session_path() -> str:
        return session_path(decky.DECKY_PLUGIN_SETTINGS_DIR)

    @staticmethod
    def _load_strategy_checklist_store() -> dict:
        return load_session_store(Plugin._strategy_checklist_session_path(), logger)



    @staticmethod
    def _reject_ask_request(response_text: str, app_id: str = "") -> dict:
        """Return a consistent rejected-request response payload for frontend consumers."""
        return {
            "success": False,
            "response": response_text,
            "app_id": app_id,
            "app_context": "active" if app_id else "none",
            "applied": None,
            "elapsed_seconds": 0,
        }

    async def _try_handle_sanitizer_keyword_command(self, question: str, app_id: str) -> Optional[dict]:
        """Persist sanitizer on/off from magic phrases; return ask-shaped dict or ``None``."""
        cmd = classify_sanitizer_command(question)
        if cmd is None:
            return None
        new_disabled = cmd == "disable"
        await self.save_settings({"input_sanitizer_user_disabled": new_disabled})
        app_context = "active" if app_id else "none"
        return {
            "success": True,
            "response": confirmation_message_for_command(cmd),
            "app_id": app_id,
            "app_context": app_context,
            "applied": None,
            "elapsed_seconds": 0.0,
        }

    async def _try_handle_shortcut_setup_command(self, question: str, app_id: str) -> Optional[dict]:
        """Return fixed shortcut guidance (no Ollama) or ``None`` if not a shortcut keyword."""
        variant = classify_shortcut_setup_command(question)
        if variant is None:
            return None
        response = response_message_for_shortcut(variant)
        app_context = "active" if app_id else "none"
        return {
            "success": True,
            "response": response,
            "app_id": app_id,
            "app_context": app_context,
            "applied": None,
            "elapsed_seconds": 0.0,
            "shortcut_setup": variant,
        }

    async def _try_handle_vac_check_command(self, question: str, app_id: str) -> Optional[dict]:
        """Steam Web API GetPlayerBans via ``bonsai:vac-check`` (no Ollama)."""
        parsed_arg = parse_vac_check_command(question)
        if parsed_arg is None:
            return None
        settings = await self.load_settings()
        ok = capability_enabled(settings, "steam_web_api")
        key = str(settings.get("steam_web_api_key") or "")
        response = response_for_vac_check(parsed_arg, api_key=key, capability_ok=ok)
        app_context = "active" if app_id else "none"
        return {
            "success": True,
            "response": response,
            "app_id": app_id,
            "app_context": app_context,
            "applied": None,
            "elapsed_seconds": 0.0,
        }

    # --- Settings RPC ---

    async def load_settings(self):
        """Load persisted plugin settings from Decky's settings directory."""
        path = Plugin._settings_path()
        return load_settings_from_disk(path, Plugin._sanitize_settings, logger)

    async def save_settings(self, data: Any = None):
        """Persist plugin settings to Decky's settings directory."""
        if not hasattr(self, "_settings_save_lock"):
            self._settings_save_lock = asyncio.Lock()
        async with self._settings_save_lock:
            current = await self.load_settings()
            path = Plugin._settings_path()
            saved = save_settings_to_disk(
                path=path,
                settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
                incoming=data,
                current=current,
                sanitize_func=Plugin._sanitize_settings,
                logger=logger,
            )
            changed = Plugin._settings_change_keys_for_log(current, saved)
            if changed:
                await self._maybe_app_log(
                    "settings.save",
                    "settings updated",
                    fields={"changed": ",".join(changed)},
                )
            prev_caps = current.get("capabilities") if isinstance(current.get("capabilities"), dict) else {}
            next_caps = saved.get("capabilities") if isinstance(saved.get("capabilities"), dict) else {}
            prev_mic = prev_caps.get("microphone_access") is True
            next_mic = next_caps.get("microphone_access") is True
            if prev_mic and not next_mic:
                await self._stop_voice_transcription_internal()
            return saved

    async def _reset_voice_install_after_clear(self) -> None:
        """Cancel any in-flight voice-engine install and reset its state to the default.

        The reset is **unconditional**, matching the background-Ask and local-Ollama teardowns
        above it. Until 2026-08-04 these three lines sat inside the "task still running" guard, so
        a voice install that had already *finished* survived Clear-all-plugin-data and
        ``get_voice_install_status`` kept serving that stale result after the files it described
        were deleted.
        """
        vit = getattr(self, "_voice_install_task", None)
        if vit is not None and not vit.done():
            ce_voice = getattr(self, "_voice_install_cancel", None)
            if isinstance(ce_voice, threading.Event):
                ce_voice.set()
            await cancel_and_await(vit)
        self._voice_install_task = None
        self._voice_install_cancel = None
        self._voice_install_state = new_voice_install_state()

    async def clear_plugin_data(self):
        """Remove persisted settings/runtime/logs and return fresh defaults (new-install behavior)."""
        async with self._background_lock:
            task = self._background_task
            self._background_task = None
            await cancel_and_await(task)
            self._background_state = self._new_background_state()
            self._background_request_seq += 1
        self._last_input_transparency = None

        async with self._local_ollama_setup_lock:
            if self._local_ollama_cancel_event is not None:
                self._local_ollama_cancel_event.set()
            await cancel_and_await(self._local_ollama_setup_task)
            self._local_ollama_setup_task = None
            self._local_ollama_cancel_event = None
            self._local_ollama_setup_state = new_local_ollama_setup_state()

        await self._stop_voice_transcription_internal()

        await self._reset_voice_install_after_clear()

        current = await self.load_settings()
        rag_path = str((current or {}).get("rag_corpus_path") or "").strip()
        local_on_deck = should_teardown_local_ollama_on_clear(
            current if isinstance(current, dict) else None
        )
        if local_on_deck:
            teardown_summary = await asyncio.to_thread(
                teardown_local_ollama_for_plugin_reset, logger
            )
            await self._maybe_app_log(
                "clear_plugin_data.ollama_teardown",
                "local ollama teardown",
                fields={
                    "removed_tag_count": len(teardown_summary.get("removed_tags") or []),
                    "error_count": len(teardown_summary.get("errors") or []),
                },
            )

        from backend.services.plugin_data_reset import wipe_bonsai_cache_dir, wipe_proton_experiment_journal

        cache_cleared = await asyncio.to_thread(wipe_bonsai_cache_dir, logger)
        journal_cleared = await asyncio.to_thread(wipe_proton_experiment_journal, logger)

        defaults, settings_removed = reset_plugin_disk_and_defaults(
            settings_path=Plugin._settings_path(),
            settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
            runtime_dir=decky.DECKY_PLUGIN_RUNTIME_DIR,
            log_dir=decky.DECKY_PLUGIN_LOG_DIR,
            sanitize_func=Plugin._sanitize_settings,
            load_settings=load_settings_from_disk,
            save_settings=save_settings_to_disk,
            logger=logger,
            rag_corpus_path=rag_path,
        )
        reset_intent_packs_file(
            Plugin._intent_packs_path(),
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            logger=logger,
        )
        reset_session_file(
            Plugin._strategy_checklist_session_path(),
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            logger=logger,
        )
        self._chat_slot_by_request.clear()
        await asyncio.to_thread(wipe_all_slots, decky.DECKY_PLUGIN_SETTINGS_DIR, logger)
        await self._maybe_app_log(
            "plugin.data_clear",
            "plugin data cleared",
            fields={
                "settings_entries_removed": settings_removed,
                "bonsai_cache_cleared": cache_cleared,
                "proton_journal_cleared": journal_cleared,
                "local_ollama_teardown": local_on_deck,
            },
        )
        return defaults

    # --- Chat slots RPC ---

    @staticmethod
    def _chat_slots_settings_dir() -> str:
        return decky.DECKY_PLUGIN_SETTINGS_DIR

    @staticmethod
    def _parse_chat_slot_id(question: Any) -> str:
        if isinstance(question, dict):
            return str(question.get("chat_slot_id") or question.get("chatSlotId") or "").strip()
        return ""

    @staticmethod
    def _parse_chat_slot_display_question(question: Any) -> str:
        """What the user saw as their question when it differs from the composed prompt sent to
        the model (a branch pick shows "I'm at: …" but sends "[Strategy follow-up] I'm at: …").
        Persisted per turn so a reopened chat's header shows the friendly caption, not internal
        plumbing. "" means no separate display form."""
        if isinstance(question, dict):
            return str(
                question.get("display_question") or question.get("displayQuestion") or ""
            ).strip()
        return ""

    async def _chat_slots_record_user_turn(
        self,
        *,
        slot_id: str,
        question: str,
        request_id: int,
        attachments: list,
        app_id: str,
        app_name: str,
        display_question: str = "",
    ) -> None:
        sid = str(slot_id or "").strip()
        if not sid or not str(question or "").strip():
            return
        settings_dir = Plugin._chat_slots_settings_dir()
        refs = [
            {
                "path": str(a.get("path", "") or ""),
                "name": str(a.get("name", "") or ""),
                "source": str(a.get("source", "unknown") or "unknown"),
            }
            for a in (attachments or [])
            if isinstance(a, dict) and str(a.get("path", "") or "").strip()
        ]

        def _run() -> None:
            chat_ensure_slot(
                settings_dir,
                sid,
                origin_app_id=app_id,
                first_question=question,
                app_name=app_name,
                logger=logger,
            )
            chat_append_turn(
                settings_dir,
                sid,
                role="user",
                text=question,
                request_id=request_id,
                attachment_refs=refs,
                app_id=app_id,
                app_name=app_name,
                display_text=display_question,
                logger=logger,
            )

        async with self._chat_slots_store_lock:
            await asyncio.to_thread(_run)

    async def _chat_slots_record_assistant_turn(
        self,
        *,
        slot_id: str,
        response_text: str,
        transparency: Optional[dict] = None,
        app_id: str = "",
        app_name: str = "",
        asked_entity: str = "",
    ) -> None:
        sid = str(slot_id or "").strip()
        body = str(response_text or "").strip()
        if not sid or not body:
            return
        settings_dir = Plugin._chat_slots_settings_dir()

        def _run() -> None:
            chat_append_turn(
                settings_dir,
                sid,
                role="assistant",
                text=body,
                transparency=transparency,
                app_id=app_id,
                app_name=app_name,
                asked_entity=asked_entity,
                logger=logger,
            )

        async with self._chat_slots_store_lock:
            await asyncio.to_thread(_run)

    async def list_chat_slots(self):
        """Return recent chat slot summaries (newest first)."""
        settings_dir = Plugin._chat_slots_settings_dir()

        def _run() -> list:
            return list_slot_summaries(settings_dir, logger)

        async with self._chat_slots_store_lock:
            rows = await asyncio.to_thread(_run)
        return {"slots": rows}

    async def get_chat_slot(self, slot_id: str = ""):
        """Load one chat slot with full turn history."""
        sid = str(slot_id or "").strip()
        if not sid:
            return {"ok": False, "error": "Slot id required"}
        settings_dir = Plugin._chat_slots_settings_dir()

        def _run():
            return chat_load_slot(settings_dir, sid, logger)

        async with self._chat_slots_store_lock:
            slot = await asyncio.to_thread(_run)
        if slot is None:
            return {"ok": False, "error": "Slot not found"}
        return {"ok": True, "slot": slot_to_rpc_payload(slot)}

    async def create_chat_slot(self, payload: Any = None):
        """Create a new empty chat slot."""
        body = payload if isinstance(payload, dict) else {}
        settings_dir = Plugin._chat_slots_settings_dir()
        origin_app_id = str(body.get("origin_app_id") or body.get("originAppId") or "").strip()
        first_question = str(body.get("first_question") or body.get("firstQuestion") or "").strip()
        app_name = str(body.get("app_name") or body.get("appName") or "").strip()
        label = str(body.get("label") or "").strip()

        def _run():
            return chat_create_slot(
                settings_dir,
                label=label,
                origin_app_id=origin_app_id,
                first_question=first_question,
                app_name=app_name,
                logger=logger,
            )

        async with self._chat_slots_store_lock:
            slot = await asyncio.to_thread(_run)
        return {"ok": True, "slot": slot_to_rpc_payload(slot)}

    async def delete_chat_slot(self, slot_id: str = "", payload: Any = None):
        """Delete a chat slot from private store."""
        sid = str(slot_id or "").strip()
        if not sid and isinstance(payload, dict):
            sid = str(payload.get("slot_id") or payload.get("slotId") or payload.get("id") or "").strip()
        if not sid:
            return {"ok": False, "error": "Slot id required"}
        settings_dir = Plugin._chat_slots_settings_dir()

        async with self._chat_slots_store_lock:
            removed = await asyncio.to_thread(chat_delete_slot, settings_dir, sid, logger)
        if not removed:
            return {"ok": False, "error": "Slot not found"}
        return {"ok": True}

    async def rename_chat_slot(self, payload: Any = None):
        """Rename a chat slot label."""
        if not isinstance(payload, dict):
            return {"ok": False, "error": "Invalid payload"}
        sid = str(payload.get("slot_id") or payload.get("slotId") or payload.get("id") or "").strip()
        label = str(payload.get("label") or "").strip()
        if not sid:
            return {"ok": False, "error": "Slot id required"}
        if not label:
            return {"ok": False, "error": "Label required"}
        settings_dir = Plugin._chat_slots_settings_dir()

        def _run():
            return chat_update_slot_label(settings_dir, sid, label, logger)

        async with self._chat_slots_store_lock:
            saved = await asyncio.to_thread(_run)
        if saved is None:
            return {"ok": False, "error": "Slot not found"}
        return {"ok": True, "slot": slot_to_rpc_payload(saved)}

    # --- Strategy checklist session RPC ---

    async def get_strategy_checklist_session(self, app_id: str = ""):
        """Return persisted checklist for the given game AppID (or generic bucket when empty)."""
        store = Plugin._load_strategy_checklist_store()
        entry = get_session_entry(store, app_id)
        if entry is None:
            return None
        return {
            "app_id": str(app_id or "").strip(),
            "app_name": entry.get("app_name", ""),
            "title": entry.get("title", ""),
            "items": entry.get("items") or [],
            "checked_ids": entry.get("checked_ids") or [],
            "updated_at": entry.get("updated_at"),
        }

    async def save_strategy_checklist_session(self, payload: Any = None):
        """Persist checklist + checked state for one game bucket."""
        if not isinstance(payload, dict):
            return {"ok": False, "error": "Invalid payload"}
        app_id = str(payload.get("app_id") or payload.get("appId") or "").strip()
        frag = rpc_entry_to_store_payload(payload)
        if frag is None:
            return {"ok": False, "error": "Invalid checklist payload"}
        if not hasattr(self, "_strategy_checklist_store_lock"):
            self._strategy_checklist_store_lock = asyncio.Lock()
        async with self._strategy_checklist_store_lock:
            store = Plugin._load_strategy_checklist_store()
            merged = upsert_session_entry(
                store,
                app_id=app_id,
                app_name=str(payload.get("app_name") or payload.get("appName") or frag.get("app_name") or ""),
                title=frag["title"],
                items=frag["items"],
                checked_ids=frag.get("checked_ids"),
            )
            save_session_store(
                Plugin._strategy_checklist_session_path(),
                merged,
                settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
                logger=logger,
            )
            entry = get_session_entry(merged, app_id)
            return {"ok": True, "entry": entry}

    async def clear_strategy_checklist_session(self, app_id: str = ""):
        """Remove persisted checklist for one game or entire file when app_id omitted."""
        if not hasattr(self, "_strategy_checklist_store_lock"):
            self._strategy_checklist_store_lock = asyncio.Lock()
        async with self._strategy_checklist_store_lock:
            path = Plugin._strategy_checklist_session_path()
            store = Plugin._load_strategy_checklist_store()
            if str(app_id or "").strip():
                merged = clear_session_entry(store, app_id)
            else:
                merged = clear_session_entry(store, None)
            save_session_store(path, merged, settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR, logger=logger)
            return {"ok": True}

    # --- Intent packs RPC ---

    async def get_intent_packs(self):
        """Return intent pack summaries and full entries for unified search indexing."""
        store = self._load_intent_pack_store()
        return {
            "schema_version": store.get("schema_version"),
            "summaries": pack_summaries(store),
            "packs": store.get("packs") or [],
        }

    async def set_intent_pack_enabled(self, pack_id: str = "", enabled: bool = True):
        """Enable or disable a search intent pack."""
        if not hasattr(self, "_intent_pack_store_lock"):
            self._intent_pack_store_lock = asyncio.Lock()
        async with self._intent_pack_store_lock:
            store = self._load_intent_pack_store()
            result = set_pack_enabled(store, pack_id, enabled)
            if not result.get("ok"):
                return result
            saved = self._save_intent_pack_store(result["store"])
            return {
                "ok": True,
                "summaries": pack_summaries(saved),
                "packs": saved.get("packs") or [],
            }

    async def set_kids_lock_state(self, active: bool = False):
        """Session Kids master lock from Steam parental `locked` (frontend assertion)."""
        set_kids_lock_active(bool(active))
        return {"ok": True, "kids_lock_active": kids_lock_active()}

    async def export_intent_pack(self, pack_id: str = ""):
        """Export one intent pack as formatted JSON."""
        store = self._load_intent_pack_store()
        return export_pack(store, pack_id)

    async def import_intent_pack(self, payload: Any = None):
        """Dry-run or confirm-merge import of a single intent pack from JSON."""
        data = payload if isinstance(payload, dict) else {}
        raw_json = data.get("json")
        confirm = data.get("confirm") is True
        if not isinstance(raw_json, str) or not raw_json.strip():
            return {"ok": False, "error": "json string required"}
        incoming, parse_error = parse_import_payload(raw_json)
        if parse_error:
            return {"ok": False, "error": parse_error}
        if not hasattr(self, "_intent_pack_store_lock"):
            self._intent_pack_store_lock = asyncio.Lock()
        async with self._intent_pack_store_lock:
            store = self._load_intent_pack_store()
            result = merge_import_pack(store, incoming or {}, confirm=confirm)
            if not result.get("ok"):
                return result
            if confirm and isinstance(result.get("store"), dict):
                saved = self._save_intent_pack_store(result["store"])
                result["summaries"] = pack_summaries(saved)
                result["packs"] = saved.get("packs") or []
            return result

    async def remove_intent_pack(self, pack_id: str = ""):
        """Remove a user/imported intent pack (bundled packs cannot be removed)."""
        if not hasattr(self, "_intent_pack_store_lock"):
            self._intent_pack_store_lock = asyncio.Lock()
        async with self._intent_pack_store_lock:
            store = self._load_intent_pack_store()
            result = remove_pack(store, pack_id)
            if not result.get("ok"):
                return result
            saved = self._save_intent_pack_store(result["store"])
            return {
                "ok": True,
                "summaries": pack_summaries(saved),
                "packs": saved.get("packs") or [],
            }

    @staticmethod
    def _clean_env() -> dict:
        """Proxy sanitized subprocess environment generation through the service layer."""
        return clean_env()

    async def get_deck_ip(self):
        """Return the Steam Deck's LAN IP address."""
        return await get_deck_ip_async()

    # --- Ollama connection and discovery RPC ---

    async def test_ollama_connection(self, pc_ip: str = "", timeout_seconds: int = 10):
        """Ping Ollama's /api/version and /api/tags to verify reachability."""
        tested = await run_ollama_connection_test(pc_ip, timeout_seconds)
        await self._maybe_app_log(
            "connection.test",
            "ollama connection test",
            fields=summarize_for_log(tested.result),
        )
        await self._maybe_app_log(
            "connection.test",
            "RPC test_ollama_connection",
            level="verbose",
            fields={"host": tested.host, "timeout_seconds": tested.timeout_seconds},
        )
        return tested.result

    async def discover_mdns_ollama_hosts(self, timeout_seconds: int = 8):
        """User-triggered mDNS browse for ``_ollama._tcp.local`` only (no subnet scan)."""
        safe_timeout = max(2, min(15, int(timeout_seconds or 8)))

        try:
            settings = await self.load_settings()
            if settings.get("ollama_local_on_deck"):
                return {
                    "ok": False,
                    "hosts": [],
                    "error": "Turn off «Ollama on this Deck» to discover LAN hosts.",
                }

            def _run_sync() -> dict[str, Any]:
                return run_mdns_ollama_discovery(timeout_seconds=float(safe_timeout))

            out = await asyncio.wait_for(asyncio.to_thread(_run_sync), timeout=float(safe_timeout) + 2.0)
            host_count = len(out.get("hosts") or [])
            await self._maybe_app_log(
                "connection.discover",
                "mDNS Ollama discovery",
                fields={"found": host_count, "ok": bool(out.get("ok"))},
            )
            return out
        except asyncio.TimeoutError:
            await self._maybe_app_log(
                "connection.discover",
                "mDNS discovery timed out",
                fields={"found": 0, "ok": False},
            )
            return {
                "ok": False,
                "hosts": [],
                "error": "Discovery timed out. Try again or enter the PC address manually.",
            }
        except Exception:
            logger.exception("discover_mdns_ollama_hosts failed")
            return {
                "ok": False,
                "hosts": [],
                "error": "Discovery failed on this device. Use manual PC address or see troubleshooting.",
            }

    # --- Local Ollama install/setup RPC ---

    async def start_local_ollama_setup(self, data: Any = None):
        """Install/start Ollama on this Linux host and pull Tier-1 FOSS tags (runs in background)."""
        prof = ""
        if isinstance(data, dict):
            prof = str(data.get("profile", data.get("Profile", "")) or "").strip()
        elif isinstance(data, str):
            prof = data.strip()
        settings = await self.load_settings()
        if not settings.get("ollama_local_on_deck"):
            out = {
                "accepted": False,
                "reason": "Enable «Ollama on this Deck» in Ollama → Where AI runs first.",
            }
            await self._maybe_app_log(
                "local_setup.start",
                "setup rejected",
                fields={"profile": prof, "accepted": False, "reason": "local_off"},
            )
            return out
        if not is_valid_setup_pull_profile(prof):
            out = {
                "accepted": False,
                "reason": 'Invalid profile: use "tier1_essentials", "tier2_multimodal", or "update_installed".',
            }
            await self._maybe_app_log(
                "local_setup.start",
                "setup rejected",
                fields={"profile": prof, "accepted": False, "reason": "invalid_profile"},
            )
            return out

        async with self._local_ollama_setup_lock:
            existing = self._local_ollama_setup_task
            if existing is not None and not existing.done():
                out = {"accepted": False, "reason": "Setup already running."}
                await self._maybe_app_log(
                    "local_setup.start",
                    "setup rejected",
                    fields={"profile": prof, "accepted": False, "reason": "busy"},
                )
                return out

            self._local_ollama_cancel_event = new_asyncio_cancel_event()
            new_st = new_local_ollama_setup_state()
            new_st.update(
                {
                    "phase": "running",
                    "done": False,
                    "error": "",
                    "accepted": True,
                    "profile": prof,
                }
            )
            self._local_ollama_setup_state = new_st

            setup_loop = asyncio.get_running_loop()
            on_stage, on_verbose_line = make_local_ollama_setup_hooks(self, setup_loop)

            async def runner() -> None:
                assert self._local_ollama_cancel_event is not None
                await run_local_setup(
                    profile=prof,
                    state=self._local_ollama_setup_state,
                    logger=logger,
                    cancel_event=self._local_ollama_cancel_event,
                    on_stage=on_stage,
                    on_verbose_line=on_verbose_line,
                )

            self._local_ollama_setup_task = asyncio.create_task(runner())

        await self._maybe_app_log(
            "local_setup.start",
            "setup accepted",
            fields={"profile": prof, "accepted": True},
        )
        return {"accepted": True}

    async def get_local_ollama_setup_status(self):
        """Return last status for the local Ollama installer (plain JSON dict)."""
        return dict(self._local_ollama_setup_state)

    async def cancel_local_ollama_setup(self):
        """Request cancellation of an in-progress setup (best-effort)."""
        ce = getattr(self, "_local_ollama_cancel_event", None)
        if isinstance(ce, asyncio.Event):
            ce.set()
        return {"cancel_requested": True}

    async def apply_ollama_local_autostart(self, enabled: bool = False) -> dict:
        """RPC: turn the Deck's per-user Ollama startup entry on or off.

        Backs the Ollama tab's "Start the AI with the Deck" toggle. Writing the
        unit file and shelling out to ``systemctl`` are blocking, so this runs off
        the event loop; see ``ollama_local_autostart_service`` for the rules
        (never sudo, never a system-wide unit, never touches an already-running
        Ollama in either direction).
        """
        return await asyncio.to_thread(apply_ollama_local_autostart_entry, bool(enabled))

    async def get_ollama_local_autostart_status(self) -> dict:
        """RPC: installed/enabled/running plus a plain reason, for the autostart row."""
        return await asyncio.to_thread(get_ollama_local_autostart_status_report)

    # --- Knowledge base (RAG corpus) RPC ---

    async def get_rag_corpus_status(self, data: Any = None):
        """Return knowledge-base download state and whether a corpus is installed."""
        settings = await self.load_settings()
        return build_rag_corpus_status(
            settings, data, dict(self._rag_corpus_download_state)
        )

    async def start_rag_corpus_download(self, data: Any = None):
        """Download and install the knowledge base corpus (user-initiated; Model A consent)."""
        install_dir = default_corpus_dir_internal()
        storage = "internal"
        if isinstance(data, dict):
            custom = str(data.get("install_path") or data.get("path") or "").strip()
            if custom:
                install_dir = custom
            storage = str(data.get("storage") or storage).strip().lower()
        install_dir = os.path.expanduser(install_dir)
        try:
            install_dir = sanitize_corpus_install_dir(install_dir)
        except ValueError as exc:
            return {"accepted": False, "reason": str(exc)}

        try:
            os.makedirs(os.path.dirname(os.path.expanduser(install_dir)) or ".", exist_ok=True)
        except OSError as exc:
            return {"accepted": False, "reason": f"Could not create install folder: {exc}"}

        async with self._rag_corpus_download_lock:
            existing = self._rag_corpus_download_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Knowledge base download already running."}

            self._rag_corpus_cancel_event = new_asyncio_cancel_event()
            self._rag_corpus_download_state = new_rag_corpus_download_state()
            self._rag_corpus_download_state.update(
                {
                    "phase": "running",
                    "done": False,
                    "accepted": True,
                    "install_path": install_dir,
                    "stage": "queued",
                }
            )

            async def runner() -> None:
                assert self._rag_corpus_cancel_event is not None
                await run_rag_corpus_download(
                    install_dir=install_dir,
                    state=self._rag_corpus_download_state,
                    logger=logger,
                    cancel_event=self._rag_corpus_cancel_event,
                )
                if self._rag_corpus_download_state.get("phase") == "done":
                    version = str(self._rag_corpus_download_state.get("manifest_version") or "")
                    root = str(self._rag_corpus_download_state.get("install_path") or install_dir)
                    await self.save_settings(
                        {
                            "rag_corpus_path": root,
                            "rag_corpus_version": version,
                            "use_local_knowledge_base": True,
                        }
                    )

            self._rag_corpus_download_task = asyncio.create_task(runner())

        await self._maybe_app_log(
            "rag_corpus.start",
            "knowledge base download accepted",
            fields={"install_path": install_dir, "storage": storage},
        )
        return {"accepted": True, "install_path": install_dir}

    async def cancel_rag_corpus_download(self):
        ce = getattr(self, "_rag_corpus_cancel_event", None)
        if isinstance(ce, asyncio.Event):
            ce.set()
        # Mutate the existing dict in place rather than rebinding the attribute — the running
        # download task was handed this exact object by reference (start_rag_corpus_download's
        # runner()) and keeps writing progress/phase to it. Reassigning self._rag_corpus_download_state
        # to a new dict here would silently orphan the task's reference: every write after cancel
        # (phase -> "cancelled", done -> True, error) would land on a dict nothing else can see,
        # and status polls would show "running" forever.
        self._rag_corpus_download_state["cancel_requested"] = True
        return {"cancel_requested": True}

    async def update_rag_corpus(self):
        """Check remote manifest and re-download when version differs."""
        settings = await self.load_settings()
        try:
            manifest = await asyncio.to_thread(fetch_remote_manifest)
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
        remote_ver = str(manifest.get("version") or "")
        local_ver = str(settings.get("rag_corpus_version") or "")
        if remote_ver and remote_ver == local_ver and resolve_corpus_db_path(settings):
            return {"ok": True, "updated": False, "version": local_ver}
        out = await self.start_rag_corpus_download(
            {"install_path": settings.get("rag_corpus_path") or default_corpus_dir_internal()}
        )
        return {"ok": bool(out.get("accepted")), "updated": True, "version": remote_ver, **out}

    async def remove_rag_corpus(self):
        """Remove installed corpus files and clear path settings."""
        settings = await self.load_settings()
        path = str(settings.get("rag_corpus_path") or "").strip()
        removed = False
        if path:
            removed = await asyncio.to_thread(remove_corpus_at_path, path, logger)
        await self.save_settings(
            {
                "rag_corpus_path": "",
                "rag_corpus_version": "",
                "use_local_knowledge_base": False,
            }
        )
        return {"ok": True, "removed": removed}

    async def install_rag_corpus_local(self, data: Any = None):
        """Dev/QA: install corpus from a local manifest directory (no network)."""
        settings = await self.load_settings()
        outcome = await install_rag_corpus_from_local_dir(settings, data)
        if outcome.settings_to_save:
            await self.save_settings(outcome.settings_to_save)
        return outcome.result

    async def get_session_rag_chip_candidates(
        self,
        app_id: str = "",
        app_name: str = "",
        shortcut_name: str = "",
    ):
        """Preset-chip prompts drawn from the offline KB for the running game."""
        settings = await self.load_settings()
        try:
            result = await asyncio.to_thread(
                suggest_chip_candidates,
                settings,
                app_id=str(app_id or "").strip(),
                app_name=str(app_name or "").strip(),
                shortcut_name=str(shortcut_name or "").strip(),
            )
        except Exception:
            logger.exception("get_session_rag_chip_candidates failed")
            return {"ok": False, "reason": "chip_candidates_failed", "candidates": []}

        payload = session_rag_chip_candidates_to_rpc(result)
        # An unreadable corpus is a real fault, not "this game has no tips", and the
        # carousel retries after every Ask -- so record it once per distinct fault
        # instead of on every call. Cleared on success so a later break logs again.
        reason = str(payload.get("reason") or "")
        fault = reason if reason.startswith("corpus_error") else ""
        if fault and fault != getattr(self, "_last_chip_candidates_fault", ""):
            logger.warning("get_session_rag_chip_candidates: knowledge base unreadable (%s)", fault)
        self._last_chip_candidates_fault = fault
        return payload

    async def _require_local_ollama_on_deck(self) -> tuple[bool, dict[str, Any] | None]:
        settings = await self.load_settings()
        if not settings.get("ollama_local_on_deck"):
            return False, {
                "accepted": False,
                "ok": False,
                "reason": "Enable «Ollama on this Deck» in Ollama → Where AI runs first.",
                "error": "local_off",
            }
        return True, None

    async def _start_custom_ollama_pull(self, pull_tags: list[str]) -> dict[str, Any]:
        """Start downloading AI models onto the Deck itself.

        In: the list of model names the person picked. Out: a small dictionary
        saying whether the download was started, or why it was not.

        "Accepted" means started, not finished. Downloads are gigabytes and take
        many minutes, so this answers immediately and the screen watches the
        progress separately. The steps:

         1. Refuse unless running the AI on this Deck is switched on, since
            there is nowhere to put the models otherwise.
         2. Tidy the names, and refuse if nothing usable is left.
         3. Ask Ollama's library which of the names really exist. If none do,
            refuse and name a couple that would have worked -- a typed model
            name is the usual reason to be here.
         4. Only one download at a time: refuse as busy if one is running.
         5. Start it in the background and answer straight away.

        What can go wrong: if only SOME of the names are real, the bad ones are
        dropped, a note is written to the log, and the rest download anyway. The
        person is not told, so someone who mistypes one name of several gets a
        successful-looking download that quietly skips it.
        """
        ok_gate, gate_out = await self._require_local_ollama_on_deck()
        if not ok_gate:
            return gate_out or {"accepted": False, "reason": "local_off"}

        tags = normalize_ollama_pull_tags(pull_tags)
        if not tags:
            return {"accepted": False, "reason": "No valid model tags to pull."}

        from backend.services.ollama_catalog_service import partition_pull_tags_by_registry

        registry_ok, registry_bad = await asyncio.to_thread(partition_pull_tags_by_registry, tags)
        if registry_bad and not registry_ok:
            bad_list = ", ".join(registry_bad[:6])
            return {
                "accepted": False,
                "reason": (
                    f"Tag(s) not on Ollama library: {bad_list}. "
                    "Try qwen2.5vl:3b or gemma4:e2b-it-qat."
                ),
                "error": "invalid_registry_tag",
                "invalid_tags": registry_bad,
            }
        if registry_bad:
            await self._maybe_app_log(
                "local_setup.start",
                "skipped invalid registry tags",
                fields={"invalid_tags": registry_bad[:12]},
            )
        tags = registry_ok

        async with self._local_ollama_setup_lock:
            existing = self._local_ollama_setup_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Setup already running.", "error": "busy"}

            self._local_ollama_cancel_event = new_asyncio_cancel_event()
            new_st = new_local_ollama_setup_state()
            new_st.update(
                {
                    "phase": "running",
                    "done": False,
                    "error": "",
                    "accepted": True,
                    "profile": "custom",
                    "pull_tags": list(tags),
                    "total_pull_steps": len(tags),
                }
            )
            self._local_ollama_setup_state = new_st

            setup_loop = asyncio.get_running_loop()
            on_stage, on_verbose_line = make_local_ollama_setup_hooks(self, setup_loop)

            async def runner() -> None:
                assert self._local_ollama_cancel_event is not None
                await run_local_setup(
                    profile="custom",
                    state=self._local_ollama_setup_state,
                    logger=logger,
                    cancel_event=self._local_ollama_cancel_event,
                    on_stage=on_stage,
                    on_verbose_line=on_verbose_line,
                )

            self._local_ollama_setup_task = asyncio.create_task(runner())

        await self._maybe_app_log(
            "local_setup.start",
            "custom pull accepted",
            fields={"profile": "custom", "accepted": True, "tag_count": len(tags)},
        )
        return {"accepted": True, "pull_tags": tags}

    # --- Ollama model pull and catalog RPC ---

    async def pull_ollama_models(self, tags: Any = None):
        """Pull one or more Ollama tags on this Deck (background, reuses setup service)."""
        raw = tags if isinstance(tags, list) else []
        return await self._start_custom_ollama_pull(raw)

    async def merge_pulled_tags_into_routing_orders(self, tags: Any = None):
        """Append newly pulled tags to the user's saved text/vision try orders."""
        pulled = normalize_ollama_pull_tags(tags if isinstance(tags, list) else [])
        if not pulled:
            return {"ok": False, "error": "no_tags", "merged": []}

        current = await self.load_settings()
        high_vram = current.get("model_allow_high_vram_fallbacks") is True
        saved_text = current.get("text_model_routing_order")
        saved_vision = current.get("vision_model_routing_order")
        text_order = list(saved_text) if isinstance(saved_text, list) else []
        vision_order = list(saved_vision) if isinstance(saved_vision, list) else []

        # An empty saved list means the user never set a try order, so
        # resolve_routing_order() derives one from installed models
        # (ollama_routing.py:366-370) and a just-pulled tag is already in it.
        # Writing a one-tag list here would replace that derived chain instead of
        # extending it, so empty orders are left alone.
        merged: list[str] = []
        for tag in pulled:
            changed = False
            if text_order:
                text_order = merge_pulled_tag(text_order, tag, high_vram)
                changed = True
            if vision_order and is_vision_capable_tag(tag):
                vision_order = merge_pulled_tag(vision_order, tag, high_vram)
                changed = True
            if changed:
                merged.append(tag)

        if not merged:
            reason = "defaults_in_use" if not text_order and not vision_order else "no_matching_order"
            return {
                "ok": True,
                "merged": [],
                "reason": reason,
                "text_model_routing_order": text_order,
                "vision_model_routing_order": vision_order,
            }

        saved = await self.save_settings(
            {
                "text_model_routing_order": text_order,
                "vision_model_routing_order": vision_order,
            }
        )
        await self._maybe_app_log(
            "local_setup.routing_merge",
            "pulled tags merged into routing order",
            fields={"merged": ",".join(merged)},
        )
        return {
            "ok": True,
            "merged": merged,
            "error": "",
            "text_model_routing_order": saved.get("text_model_routing_order", []),
            "vision_model_routing_order": saved.get("vision_model_routing_order", []),
        }

    async def delete_ollama_model(self, tag: str = ""):
        """Remove one installed Ollama model via ``ollama rm`` (argv form)."""
        ok_gate, gate_out = await self._require_local_ollama_on_deck()
        if not ok_gate:
            return gate_out or {"ok": False, "error": "local_off"}

        t = (tag or "").strip()
        if not is_valid_ollama_pull_tag(t):
            return {"ok": False, "error": "invalid_tag"}

        st = dict(getattr(self, "_local_ollama_setup_state", {}) or {})
        if st.get("phase") == "running" and not st.get("done", True):
            return {"ok": False, "error": "busy"}

        active = getattr(self, "_active_ollama_chat_model", None)
        if isinstance(active, str) and active.strip() and active.strip() == t:
            return {"ok": False, "error": "in_use", "removed": ""}

        ok_rm, err = await run_ollama_rm_async(t)
        if not ok_rm:
            safe_err = (err or "delete_failed")[:160]
            await self._maybe_app_log(
                "local_setup.delete",
                "ollama rm failed",
                fields={"ok": False, "error": safe_err},
            )
            return {"ok": False, "error": safe_err, "removed": ""}

        await self._maybe_app_log(
            "local_setup.delete",
            "ollama rm succeeded",
            fields={"ok": True},
        )
        return {"ok": True, "removed": t, "error": ""}

    async def fetch_ollama_catalog_metadata(self, tags: Any = None):
        """Live sizes from registry.ollama.ai with offline fallback metadata."""
        ok_gate, gate_out = await self._require_local_ollama_on_deck()
        if not ok_gate:
            return {**(gate_out or {}), "source": "offline", "tags": {}}

        raw = tags if isinstance(tags, list) else []
        normalized = normalize_ollama_pull_tags(raw)
        try:
            out = await asyncio.wait_for(
                asyncio.to_thread(fetch_catalog_metadata, normalized),
                timeout=10.0,
            )
        except Exception:
            out = {"source": "offline", "error": "fetch_failed", "tags": {}, "fetched_at": None}
        return out

    async def fetch_pull_model_catalog(self, opts: Any = None):
        """Living Pull Models overlay (remote JSON + disk cache) for frontend merge."""
        ok_gate, gate_out = await self._require_local_ollama_on_deck()
        force = False
        if isinstance(opts, dict):
            force = bool(opts.get("force"))
        elif isinstance(opts, bool):
            force = opts
        if not ok_gate:
            return {
                **(gate_out or {}),
                "source": "bundled",
                "entries": [],
                "removed_tags": [],
                "overrides": {},
                "fetched_at": None,
                "updated_at": None,
            }
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(fetch_pull_model_catalog, force),
                timeout=12.0,
            )
        except Exception:
            return {
                "source": "bundled",
                "error": "fetch_failed",
                "entries": [],
                "removed_tags": [],
                "overrides": {},
                "fetched_at": None,
                "updated_at": None,
            }

    # --- Screenshot and media RPC ---

    async def list_recent_screenshots(self, app_id: str = "", limit: int = 5):
        """List recent screenshots with preview and app metadata for attachment browsing."""
        try:
            settings = await self.load_settings()
            if not capability_enabled(settings, "media_library_access"):
                return {
                    "success": False,
                    "items": [],
                    "error": "Media library access is disabled. Enable it in the Permissions tab.",
                }
            items = []
            runtime_dir = decky.DECKY_PLUGIN_RUNTIME_DIR
            plugin_paths = resolve_plugin_capture_paths(runtime_dir, limit)
            steam_paths = resolve_recent_screenshot_paths(app_id, limit)
            merged_paths = merge_recent_screenshot_paths(steam_paths, plugin_paths, limit)
            for path in merged_paths:
                try:
                    mtime = os.path.getmtime(path)
                except OSError:
                    mtime = 0
                is_plugin_capture = path in plugin_paths or "/captures/" in path.replace("\\", "/")
                items.append(
                    {
                        "path": path,
                        "name": os.path.basename(path),
                        "mtime": mtime,
                        "size_bytes": os.path.getsize(path) if os.path.isfile(path) else 0,
                        "source": "capture" if is_plugin_capture else "steam_recent",
                        "app_id": extract_app_id_from_screenshot_path(path),
                        "preview_data_uri": build_screenshot_preview_data_uri(path),
                    }
                )
            return {"success": True, "items": items}
        except Exception:
            logger.exception("list_recent_screenshots failed")
            return {"success": False, "items": [], "error": "Could not load recent screenshots."}

    async def append_desktop_debug_note(self, payload: Any = None):
        """Append timestamped Q&A markdown under ~/Desktop/bonsAI_logs/<name>.md (append-only)."""
        settings = await self.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
            await self._maybe_app_log(
                "capability.denied",
                "filesystem_write denied for append_desktop_debug_note",
                level="verbose",
            )
            return {"success": False, "error": "Filesystem writes are disabled. Enable them in the Permissions tab."}
        if not isinstance(payload, dict):
            return {"success": False, "error": "Invalid request."}
        stem = str(payload.get("stem", "") or "").strip()
        question = str(payload.get("question", "") or "").strip()
        response = str(payload.get("response", "") or "").strip()
        if not stem:
            return {"success": False, "error": "Note name is required."}
        home = getattr(decky, "DECKY_USER_HOME", None) or decky.HOME
        loop = asyncio.get_running_loop()

        def _run() -> dict:
            return append_desktop_debug_note_sync(home, stem, question, response)

        result = await loop.run_in_executor(None, _run)
        if result.get("ok"):
            return {"success": True, "path": result.get("path", "")}
        return {"success": False, "error": str(result.get("error", "Write failed."))}

    async def append_desktop_chat_event(self, payload: Any = None):
        """Append Ask or AI response lines to daily UTC chat file under ~/Desktop/bonsAI_logs/."""
        settings = await self.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
            await self._maybe_app_log(
                "capability.denied",
                "filesystem_write denied for append_desktop_chat_event",
                level="verbose",
            )
            return {"success": False, "error": "Filesystem writes are disabled. Enable them in the Permissions tab."}
        if not isinstance(payload, dict):
            return {"success": False, "error": "Invalid request."}
        event = str(payload.get("event", "") or "").strip().lower()
        question = str(payload.get("question", "") or "").strip()
        response_text = str(payload.get("response_text", "") or "").strip()
        screenshot_paths = payload.get("screenshot_paths")
        home = getattr(decky, "DECKY_USER_HOME", None) or decky.HOME
        loop = asyncio.get_running_loop()

        def _run() -> dict:
            return append_desktop_chat_event_sync(
                home,
                event,
                question=question,
                response_text=response_text,
                screenshot_paths=screenshot_paths if isinstance(screenshot_paths, list) else [],
            )

        result = await loop.run_in_executor(None, _run)
        if result.get("ok"):
            return {"success": True, "path": result.get("path", "")}
        return {"success": False, "error": str(result.get("error", "Write failed."))}

    async def append_app_log(self, payload: Any = None):
        """Append one app-activity line to ~/Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log."""
        settings = await self.load_settings()
        if not isinstance(payload, dict):
            return {"success": False, "error": "Invalid request."}
        event_level = str(payload.get("level", "default") or "default").strip().lower()
        if event_level not in ("default", "verbose"):
            event_level = "default"
        if not Plugin._desktop_app_log_level_allows(settings, event_level):
            return {"success": True, "skipped": True}
        if not capability_enabled(settings, "filesystem_write"):
            return {"success": False, "error": "Filesystem writes are disabled. Enable them in the Permissions tab."}
        category = str(payload.get("category", "") or "app").strip() or "app"
        message = str(payload.get("message", "") or "").strip()
        fields_raw = payload.get("fields")
        fields = fields_raw if isinstance(fields_raw, dict) else None
        home = getattr(decky, "DECKY_USER_HOME", None) or decky.HOME
        loop = asyncio.get_running_loop()

        def _run() -> dict:
            return append_app_log_sync(
                home,
                level=event_level,
                category=category,
                message=message,
                fields=fields,
            )

        result = await loop.run_in_executor(None, _run)
        if result.get("ok"):
            return {"success": True, "path": result.get("path", "")}
        return {"success": False, "error": str(result.get("error", "Write failed."))}

    async def _persist_input_transparency(self, snapshot: dict) -> None:
        """Store last transparency for ``get_input_transparency``; optionally append verbose Desktop trace."""
        self._last_input_transparency = snapshot
        settings = await self.load_settings()
        if settings.get("desktop_ask_verbose_logging") is not True:
            return
        if not capability_enabled(settings, "filesystem_write"):
            return
        home = getattr(decky, "DECKY_USER_HOME", None) or decky.HOME
        loop = asyncio.get_running_loop()

        def _run() -> dict:
            return append_desktop_ask_transparency_sync(home, snapshot)

        result = await loop.run_in_executor(None, _run)
        if not result.get("ok"):
            logger.warning("append_desktop_ask_transparency_sync: %s", result.get("error"))

    @staticmethod
    def _immediate_command_transparency_snapshot(
        *,
        route: str,
        parsed_question: str,
        resp: str,
        sanitizer_action: str,
        sanitizer_reason_codes: list,
        app_id: str,
        app_name: str,
        pc_ip: str,
    ) -> dict:
        """Shared transparency row for sanitizer/shortcut/VAC paths that finish inside ``start_background_game_ai``."""
        return build_immediate_command_snapshot(
            route=route,
            parsed_question=parsed_question,
            resp=resp,
            sanitizer_action=sanitizer_action,
            sanitizer_reason_codes=sanitizer_reason_codes,
            app_id=app_id,
            app_name=app_name,
            pc_ip=pc_ip,
        )

    async def _finalize_immediate_background_local_command(
        self,
        *,
        parsed_question: str,
        resp: str,
        app_id: str,
        app_name: str,
        pc_ip: str,
        app_context: str,
        transparency_route: str,
        sanitizer_action: str,
        sanitizer_reason_codes: list,
        state_question: str,
        meta: str,
        chat_slot_id: str = "",
        shortcut_setup_for_state: Any = _OMIT_SHORTCUT_SETUP_FIELD,
        shortcut_setup_for_response: Any = _OMIT_SHORTCUT_SETUP_FIELD,
    ) -> dict:
        """Persist transparency, publish ``completed`` background state, and return the RPC body.

        Local keyword branches (sanitizer / shortcut / VAC) never spawn ``_run_background_request``; they must
        still mint a monotonic ``request_id`` so UI polling and Desktop autosave dedupe stay consistent. They
        also never reach the normal path's own chat-slot persistence further down ``start_background_game_ai``
        (guarded there on ``has_local_command`` being false), so when a slot is active this records the same
        user+assistant turn pair that path would have. Without it the slot never gets a first turn, its title
        never leaves "New chat", and the transcript reload that follows finds nothing to show.
        """
        self._background_request_seq += 1
        request_id = self._background_request_seq
        now = time.time()
        snapshot = Plugin._immediate_command_transparency_snapshot(
            route=transparency_route,
            parsed_question=parsed_question,
            resp=resp,
            sanitizer_action=sanitizer_action,
            sanitizer_reason_codes=sanitizer_reason_codes,
            app_id=app_id,
            app_name=app_name,
            pc_ip=pc_ip,
        )
        await self._persist_input_transparency(snapshot)
        if chat_slot_id:
            await self._chat_slots_record_user_turn(
                slot_id=chat_slot_id,
                question=parsed_question,
                request_id=request_id,
                attachments=[],
                app_id=app_id,
                app_name=app_name,
            )
            await self._chat_slots_record_assistant_turn(
                slot_id=chat_slot_id,
                response_text=resp,
                transparency=transparency_snapshot_for_chat_slot(snapshot),
                app_id=app_id,
                app_name=app_name,
            )
        self._background_state = completed_local_command_state(
            request_id=request_id,
            question=state_question,
            app_id=app_id,
            app_context=app_context,
            response=resp,
            now=now,
            shortcut_setup=shortcut_setup_for_state,
            app_name=app_name,
        )
        self._background_task = None
        out: dict[str, Any] = {
            "accepted": True,
            "status": "completed",
            "request_id": request_id,
            "app_id": app_id,
            "app_name": app_name,
            "app_context": app_context,
            "success": True,
            "response": resp,
            "applied": None,
            "elapsed_seconds": 0.0,
            "meta": meta,
        }
        if shortcut_setup_for_response is not _OMIT_SHORTCUT_SETUP_FIELD:
            out["shortcut_setup"] = shortcut_setup_for_response
        return out

    # --- Transparency, feedback, and clipboard RPC ---

    async def get_input_transparency(self):
        """Return the last Ask transparency snapshot (full prompts; fetch after terminal completion)."""
        from backend.services.transparency_service import ensure_context_chips_on_snapshot

        snap = self._last_input_transparency
        if not isinstance(snap, dict) or not snap:
            return {"available": False}
        enriched = ensure_context_chips_on_snapshot(dict(snap))
        return {"available": True, "snapshot": enriched}

    async def get_reply_language_snapshot(self):
        """Return Steam client language, persisted override, and effective Ask reply language."""
        settings = await self.load_settings()
        return reply_language_snapshot(settings.get("reply_language"))

    async def save_ask_feedback(
        self,
        rating: str,
        request_id: int = 0,
        question_len: int = 0,
        success: bool = False,
        chip_id: str = "",
    ):
        """Persist thumbs up/down locally (JSONL under plugin settings); no network."""
        from backend.services.feedback_service import append_ask_feedback

        rid = int(request_id) if request_id else None
        return append_ask_feedback(
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            request_id=rid,
            rating=str(rating or ""),
            question_len=int(question_len or 0),
            success=success is True,
            chip_id=str(chip_id or ""),
        )

    async def read_host_clipboard_text(self):
        """Read clipboard via host script when the WebView cannot use ``navigator.clipboard``."""
        from backend.services.clipboard_service import read_host_clipboard_text

        return read_host_clipboard_text(logger)

    async def write_host_clipboard_text(self, text: str = ""):
        """Write clipboard via host script (wl-copy/xclip); last-resort fallback behind the
        frontend's own navigator.clipboard.writeText and execCommand('copy') attempts."""
        from backend.services.clipboard_service import write_host_clipboard_text

        return write_host_clipboard_text(text, logger)

    async def take_steam_screenshot(self, app_id: str = ""):
        """Close-QAM flow: capture game into Steam screenshots (not auto-attached to Ask)."""
        try:
            settings = await self.load_settings()
            from backend.services.capabilities import capability_enabled

            if not (
                capability_enabled(settings, "media_library_access")
                or capability_enabled(settings, "filesystem_write")
            ):
                return {
                    "success": False,
                    "error": (
                        "Screenshot capture is disabled. Enable Read game & screenshot context "
                        "in the Permissions tab."
                    ),
                }
            clean_env = Plugin._clean_env()
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: take_steam_game_screenshot(str(app_id or ""), clean_env),
            )
            if result.get("success") and isinstance(result.get("item"), dict):
                item = dict(result["item"])
                path = str(item.get("path", ""))
                if path:
                    try:
                        item["size_bytes"] = os.path.getsize(path)
                    except OSError:
                        item["size_bytes"] = 0
                    preview = build_screenshot_preview_data_uri(path)
                    if preview:
                        item["preview_data_uri"] = preview
                result["item"] = item
            return result
        except Exception:
            logger.exception("take_steam_screenshot failed")
            raise

    async def _execute_game_ai_request(
        self,
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
        """Run one full ask lifecycle, including Ollama call timing and optional TDP application."""
        return await run_game_ai_request(
            self,
            question,
            pc_ip,
            app_id,
            app_name,
            attachments=attachments,
            ask_mode=ask_mode,
            spoiler_consent=spoiler_consent,
            token_stream_request_id=token_stream_request_id,
            strategy_checklist_state=strategy_checklist_state,
            reply_followup=reply_followup,
            roleplay_meta=roleplay_meta,
        )

    # --- Ask RPC (foreground + background lifecycle) ---

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        """Feature: Foreground Ask RPC. Input: question payload + PcIp. Output: terminal result dict."""
        logger.info("ask_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        (
            parsed_question,
            pc_ip,
            app_id,
            app_name,
            attachments,
            ask_mode,
            spoiler_consent,
            strategy_checklist_state,
            reply_followup,
        ) = parse_ask_payload(question, PcIp)
        if not parsed_question:
            logger.info("ask_game_ai: rejected (empty question)")
            return Plugin._reject_ask_request("Question is required.", app_id=app_id)
        if classify_sanitizer_command(parsed_question) is not None:
            handled = await self._try_handle_sanitizer_keyword_command(parsed_question, app_id)
            if handled is not None:
                return handled
        local_kinds = detect_local_ask_commands(parsed_question)
        if local_kinds.shortcut:
            sc = await self._try_handle_shortcut_setup_command(parsed_question, app_id)
            if sc is not None:
                return sc
        if local_kinds.vac:
            vac = await self._try_handle_vac_check_command(parsed_question, app_id)
            if vac is not None:
                return vac
        if not pc_ip:
            logger.info("ask_game_ai: rejected (empty pc_ip)")
            return Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id)
        return await self._execute_game_ai_request(
            parsed_question,
            pc_ip,
            app_id,
            app_name,
            attachments=attachments,
            ask_mode=ask_mode,
            spoiler_consent=spoiler_consent,
            strategy_checklist_state=strategy_checklist_state,
            reply_followup=reply_followup,
        )

    async def _run_background_request(
        self,
        request_id: int,
        question: str,
        pc_ip: str,
        app_id: str,
        app_name: str,
        attachments: Optional[list] = None,
        ask_mode: str = "speed",
        spoiler_consent: bool = False,
        strategy_checklist_state: Optional[dict] = None,
        reply_followup: Optional[dict] = None,
        roleplay_meta: Any = None,
    ) -> None:
        """Execute a queued background request and publish terminal status for polling clients."""
        try:
            result = await self._execute_game_ai_request(
                question,
                pc_ip,
                app_id,
                app_name,
                attachments=attachments or [],
                ask_mode=ask_mode,
                spoiler_consent=spoiler_consent,
                token_stream_request_id=request_id,
                strategy_checklist_state=strategy_checklist_state,
                reply_followup=reply_followup,
                roleplay_meta=roleplay_meta,
            )
        except asyncio.CancelledError:
            return
        bg_abort = getattr(self, "_abort_current_ollama_chat", None)
        if isinstance(bg_abort, threading.Event):
            bg_abort.clear()
        async with self._background_lock:
            active_request_id = self._background_state.get("request_id")
            if active_request_id != request_id:
                return
            if self._background_state.get("status") != "pending":
                return
            cancelled_rq = bool(result.get("cancelled"))
            success = bool(result.get("success", False)) and not cancelled_rq
            response_text = str(result.get("response", "") or "No response text.")
            if cancelled_rq:
                terminal = "cancelled"
                # The executor returns a transport message ("Request stopped (connection closed).")
                # and drops the text it had already streamed. Whether the user keeps that text must
                # not depend on which of the two cancel paths won the lock.
                response_text = self._cancelled_response_text(request_id, "Request cancelled.")
            elif success:
                terminal = "completed"
            else:
                terminal = "failed"
            self._background_state = {
                **self._background_state,
                "status": terminal,
                "success": success if not cancelled_rq else False,
                "response": response_text,
                "applied": result.get("applied"),
                "elapsed_seconds": result.get("elapsed_seconds", 0),
                "error": None if (success or cancelled_rq) else response_text,
                "completed_at": time.time(),
                "app_name": result.get("app_name", app_name),
                "strategy_guide_branches": result.get("strategy_guide_branches"),
                "strategy_checklist": result.get("strategy_checklist"),
                "model_policy_disclosure": result.get("model_policy_disclosure"),
                "strategy_spoiler_consent_effective": result.get("strategy_spoiler_consent_effective"),
                "strategy_spoiler_asked_entity": result.get("strategy_spoiler_asked_entity", ""),
                "shortcut_setup": result.get("shortcut_setup"),
                "cancelled": cancelled_rq,
                "preset_carousel_inject": result.get("preset_carousel_inject"),
                # True only on the Ask that discovered the model cannot think, so the UI can
                # say so once. `model` names which model, to key that warning per model.
                "thinking_unsupported": bool(result.get("thinking_unsupported")),
                "model": result.get("model"),
                "partial_response": None,
                "streaming": False,
            }
            self._clear_partial_stream_snapshot()
        slot_id = self._chat_slot_by_request.pop(request_id, None)
        if slot_id is None:
            logger.error(
                "chat_slots: no slot for request_id=%s — assistant turn dropped",
                request_id,
            )
        else:
            # A cancelled request's response_text is overwritten above with the cancel message,
            # so the underlying ask's transparency (whatever it was mid-flight) would describe a
            # reply that was never shown — only attach it for a real terminal answer.
            await self._chat_slots_record_assistant_turn(
                slot_id=slot_id,
                response_text=response_text,
                transparency=None if cancelled_rq else result.get("transparency"),
                app_id=app_id,
                app_name=app_name,
                asked_entity=result.get("strategy_spoiler_asked_entity") or "",
            )
        await self._maybe_app_log(
            "ask.background",
            f"background ask {terminal}",
            fields={
                "status": terminal,
                "success": success,
                "ask_mode": ask_mode,
                "app_id": app_id,
                "attachment_count": len(attachments or []),
                "question_len": len(question or ""),
                "elapsed_seconds": result.get("elapsed_seconds", 0),
            },
        )

    async def start_background_game_ai(self, question: Any = "", PcIp: str = ""):
        """Feature: Background Ask submit. Input: question payload + PcIp. Output: start ack or busy/error."""

        logger.info("start_background_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        (
            parsed_question,
            pc_ip,
            app_id,
            app_name,
            attachments,
            ask_mode,
            spoiler_consent,
            strategy_checklist_state,
            reply_followup,
        ) = parse_ask_payload(question, PcIp)
        app_context = "active" if app_id else "none"
        if not parsed_question:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("Question is required.", app_id=app_id),
            }
        local_kinds = detect_local_ask_commands(parsed_question)
        has_local_command = local_kinds.any
        if not pc_ip and not has_local_command:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id),
            }

        pre_settings: Optional[dict] = None
        if not has_local_command:
            pre_settings = await self.load_settings()
            if not bool(pre_settings.get("input_sanitizer_user_disabled")):
                pre_lane = apply_input_sanitizer_lane(parsed_question, False)
                if pre_lane.action == "block":
                    um = str(pre_lane.user_message or "")
                    await self._persist_input_transparency(
                        build_sanitizer_block_snapshot(
                            raw_question=parsed_question,
                            sanitizer_action=str(pre_lane.action),
                            sanitizer_reason_codes=list(pre_lane.reason_codes),
                            text_after_sanitizer=str(pre_lane.text or ""),
                            final_response=um,
                            app_id=app_id,
                            app_name=app_name,
                            pc_ip=pc_ip,
                            elapsed_seconds=0.0,
                        )
                    )
                    return {
                        "accepted": False,
                        "status": "blocked",
                        "success": False,
                        "response": um,
                        "app_id": app_id,
                        "app_context": app_context,
                        "applied": None,
                        "elapsed_seconds": 0.0,
                    }

        # Loaded outside the lock: the accept path composes the opening thinking blurb, and a disk
        # read while holding _background_lock would stall a concurrent Cancel.
        if pre_settings is None:
            pre_settings = await self.load_settings()
        # Parsed once here (rather than only further down, on the normal path) so the local-command
        # branches below can persist to the same active slot before they return.
        chat_slot_id = Plugin._parse_chat_slot_id(question)

        async with self._background_lock:
            if (
                self._background_state.get("status") == "pending"
                and self._background_task is not None
                and not self._background_task.done()
            ):
                state = dict(self._background_state)
                return {
                    "accepted": False,
                    "status": "busy",
                    "request_id": state.get("request_id"),
                    "app_id": state.get("app_id", ""),
                    "app_context": state.get("app_context", "none"),
                    "response": "A request is already in progress.",
                }

            lingering = self._background_task
            if lingering is not None and not lingering.done():
                lingering.cancel()
            self._background_task = None

            if local_kinds.sanitizer:
                handled = await self._try_handle_sanitizer_keyword_command(parsed_question, app_id)
                if handled is not None:
                    resp = str(handled.get("response", ""))
                    return await self._finalize_immediate_background_local_command(
                        parsed_question=parsed_question,
                        resp=resp,
                        app_id=app_id,
                        app_name=app_name,
                        pc_ip=pc_ip,
                        app_context=app_context,
                        transparency_route="sanitizer_command",
                        sanitizer_action="command",
                        sanitizer_reason_codes=[],
                        state_question="",
                        meta="sanitizer_keyword",
                        chat_slot_id=chat_slot_id,
                    )

            if local_kinds.shortcut:
                handled = await self._try_handle_shortcut_setup_command(parsed_question, app_id)
                if handled is not None:
                    resp = str(handled.get("response", ""))
                    variant = handled.get("shortcut_setup")
                    return await self._finalize_immediate_background_local_command(
                        parsed_question=parsed_question,
                        resp=resp,
                        app_id=app_id,
                        app_name=app_name,
                        pc_ip=pc_ip,
                        app_context=app_context,
                        transparency_route="shortcut_setup",
                        sanitizer_action="pass",
                        sanitizer_reason_codes=[],
                        state_question=parsed_question,
                        meta="shortcut_setup",
                        chat_slot_id=chat_slot_id,
                        shortcut_setup_for_state=variant,
                        shortcut_setup_for_response=variant,
                    )

            if local_kinds.vac:
                handled_v = await self._try_handle_vac_check_command(parsed_question, app_id)
                if handled_v is not None:
                    resp = str(handled_v.get("response", ""))
                    return await self._finalize_immediate_background_local_command(
                        parsed_question=parsed_question,
                        resp=resp,
                        app_id=app_id,
                        app_name=app_name,
                        pc_ip=pc_ip,
                        app_context=app_context,
                        transparency_route="vac_check",
                        sanitizer_action="pass",
                        sanitizer_reason_codes=[],
                        state_question=parsed_question,
                        meta="vac_check",
                        chat_slot_id=chat_slot_id,
                        shortcut_setup_for_state=None,
                    )

            self._background_request_seq += 1
            request_id = self._background_request_seq
            self._reset_partial_stream_snapshot(request_id)
            opening_blurb, roleplay_meta = self._compose_opening_thinking_blurb(
                request_id,
                parsed_question,
                app_name=app_name,
                attachment_count=len(attachments or []),
                ask_mode=ask_mode,
                settings=pre_settings,
            )
            self._publish_thinking_phase(request_id, opening_blurb)
            self._background_state = pending_background_state(
                request_id=request_id,
                question=parsed_question,
                app_id=app_id,
                app_context=app_context,
                started_at=time.time(),
                chat_slot_id=chat_slot_id or None,
                app_name=app_name,
            )
            if chat_slot_id:
                await self._chat_slots_record_user_turn(
                    slot_id=chat_slot_id,
                    question=parsed_question,
                    request_id=request_id,
                    attachments=attachments,
                    app_id=app_id,
                    app_name=app_name,
                    display_question=Plugin._parse_chat_slot_display_question(question),
                )
                self._chat_slot_by_request[request_id] = chat_slot_id
            self._background_task = asyncio.create_task(
                self._run_background_request(
                    request_id,
                    parsed_question,
                    pc_ip,
                    app_id,
                    app_name,
                    attachments=attachments,
                    ask_mode=ask_mode,
                    spoiler_consent=spoiler_consent,
                    strategy_checklist_state=strategy_checklist_state,
                    reply_followup=reply_followup,
                    roleplay_meta=roleplay_meta,
                )
            )
            await self._maybe_app_log(
                "ask.start",
                "background ask pending",
                fields={
                    "status": "pending",
                    "ask_mode": ask_mode,
                    "app_id": app_id,
                    "attachment_count": len(attachments or []),
                    "question_len": len(parsed_question or ""),
                },
            )
            await self._maybe_app_log(
                "ask.rpc",
                "RPC start_background_game_ai",
                level="verbose",
                fields={
                    "ask_mode": ask_mode,
                    "app_id": app_id,
                    "attachment_count": len(attachments or []),
                    "question_len": len(parsed_question or ""),
                },
            )

        return {
            "accepted": True,
            "status": "pending",
            "request_id": request_id,
            "app_id": app_id,
            "app_context": app_context,
            "response": "Thinking...",
            # The client renders this and never composes its own. Returning it here rather than
            # waiting for the first status poll is what lets composeThinkingBlurb.ts go away.
            "thinking_summary": opening_blurb,
        }

    async def dbg_fe_log(self, tag: str = "", data=None):
        """Frontend → plugin-log bridge for debug instrumentation.

        On-device the frontend cannot reach a dev-PC HTTP ingest without a tunnel, so frontend
        debug probes call this RPC and land in the Deck plugin log (~/homebrew/logs/bonsAI/),
        readable over SSH. Keep this RPC; debug sessions add/remove the frontend callsites.
        """
        try:
            logger.info("[FE] %s %s", str(tag)[:80], json.dumps(data)[:600] if data is not None else "")
        except Exception:
            logger.info("[FE] %s <unserializable>", str(tag)[:80])
        return {"ok": True}

    async def get_background_game_ai_status(self):
        """Feature: Background Ask poll. Input: none. Output: pending/completed status for UI bridge."""
        async with self._background_lock:
            if self._background_task and self._background_task.done():
                try:
                    self._background_task.result()
                except asyncio.CancelledError:
                    pass
                except Exception as exc:
                    logger.exception("get_background_game_ai_status: background task failed: %s", exc)
                    self._background_state = {
                        **self._background_state,
                        "status": "failed",
                        "success": False,
                        "response": _BACKGROUND_TASK_FAILED_USER_MESSAGE,
                        "error": _BACKGROUND_TASK_FAILED_USER_MESSAGE,
                        "completed_at": time.time(),
                        "strategy_guide_branches": None,
                        "model_policy_disclosure": None,
                        "preset_carousel_inject": None,
                        "partial_response": None,
                        "streaming": False,
                    }
            return self._merge_partial_into_background_status(dict(self._background_state))

    async def abort_background_game_ai(self):
        """Frontend Stop: unblock in-flight urllib read(s); Ollama may stop once the TCP session closes."""
        evt = getattr(self, "_abort_current_ollama_chat", None)
        if isinstance(evt, threading.Event):
            evt.set()
            logger.info(
                "abort_background_game_ai: stop requested — closing HTTP read; scheduling Ollama stop/unload"
            )

        wre = getattr(self, "_active_ollama_chat_http_response", None)
        if wre is None:
            ev = getattr(self, "_chat_resp_ready_evt", None)
            if isinstance(ev, threading.Event):
                ev.wait(timeout=1.5)
                wre = getattr(self, "_active_ollama_chat_http_response", None)
        close_ollama_chat_response(wre, logger)

        spawn_ollama_stop_thread(
            str(getattr(self, "_active_ollama_chat_pc_ip", None) or "").strip(),
            getattr(self, "_active_ollama_chat_model", None),
            logger,
        )
        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") == self._background_state.get("request_id"):
                snap["streaming"] = False
        async with self._background_lock:
            task = self._background_task
            if task is not None and not task.done():
                task.cancel()
            self._background_task = None

            rid = self._background_state.get("request_id")
            if rid is not None and self._background_state.get("status") == "pending":
                cancel_response = self._cancelled_response_text(rid, "Request cancelled.")
                self._background_state = {
                    **self._background_state,
                    "status": "cancelled",
                    "success": False,
                    "response": cancel_response,
                    "cancelled": True,
                    "completed_at": time.time(),
                    "partial_response": None,
                    "streaming": False,
                }
                if isinstance(rid, int):
                    slot_id = self._chat_slot_by_request.pop(rid, None)
                    if slot_id is not None:
                        await self._chat_slots_record_assistant_turn(
                            slot_id=slot_id,
                            response_text=cancel_response,
                            # The game the cancelled ask was about, off the state dict this
                            # method just rewrote (it spreads the pending state, so `app_id`
                            # from `pending_background_state` survives the cancel).
                            app_id=str(self._background_state.get("app_id") or ""),
                            app_name="",
                        )
        await self._maybe_app_log("ask.abort", "background ask abort requested")
        return {"ok": True}

    async def forget_game_ai_carried_context(self):
        """Feature: Clear button (Session context strip + Clear cache). Input: none.
        Output: {"ok", "forgot"} — forgets what the plugin carries into the next question.

        *Clear* here means only what the model is fed on the *next* Strategy/Expert question, not
        the visible session — the chat, the Session context strip's own rows, and the stored
        background answer are all left alone; ``forget_background_game_ai`` owns those. D105,
        locked 2026-09-15: the Session context strip's own Clear button calls this directly, and
        *Clear cache* in Settings calls it too (see the one added line at the top of
        ``forget_background_game_ai`` below), because the maintainer's choice was the lighter of
        two meanings for Clear — only what is carried forward, not a second way to wipe the chat.

        Reading ``py_modules/backend/services/game_ai_request.py`` end to end (done before writing
        this) turned up exactly two things a question carries into the next one without being
        re-sent by the screen every time:

        1. **The remembered follow-up subject** — ``kb_followup_memory``, module-level and
           per-process, keyed by game. Forgotten with its own ``forget()``.
        2. **The strategy checklist's ticked-box position** for the game a Strategy/Expert
           question was last asked about. Persisted the same way ``clear_strategy_checklist_session``
           already clears it, reusing ``clear_session_entry`` / ``save_session_store`` and this
           class's own ``_strategy_checklist_session_path`` / store lock.

        The running game's AppID is read off ``self._background_state["app_id"]`` — the AppID of
        whichever question was last asked in this process, the same field
        ``abort_background_game_ai`` already reads. There is no other server-side notion of "the
        game that's running": Steam's own running-app fact lives in the screen process and is not
        sent with this call. Read *before* anything below can have reset that state, which is why
        ``forget_background_game_ai`` calls this method first, ahead of its own state reset. When
        nothing has been asked yet this process, the field is blank and the whole checklist store
        is cleared instead — there is at most one game's position to forget either way — and the
        return value says which happened, so a caller (or a test) can tell.
        """
        forgot: list[str] = []

        kb_followup_memory.forget()
        forgot.append("followup_subject")

        app_id = str(self._background_state.get("app_id") or "").strip()
        if not hasattr(self, "_strategy_checklist_store_lock"):
            self._strategy_checklist_store_lock = asyncio.Lock()
        async with self._strategy_checklist_store_lock:
            path = Plugin._strategy_checklist_session_path()
            store = Plugin._load_strategy_checklist_store()
            merged = clear_session_entry(store, app_id if app_id else None)
            save_session_store(
                path, merged, settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR, logger=logger
            )
        forgot.append(
            "strategy_checklist_position" if app_id else "strategy_checklist_whole_store"
        )

        logger.info(
            "forget_game_ai_carried_context: forgot=%s (app_id=%s)",
            forgot,
            app_id or "<unknown>",
        )
        return {"ok": True, "forgot": forgot}

    async def forget_background_game_ai(self):
        """Feature: Clear session cache. Input: none. Output: {"ok", "stopped"} — drop the stored answer.

        *Clear cache* used to empty the screen only. The finished answer stayed here, and
        ``get_background_game_ai_status`` runs on every frontend mount to rebuild a reply the user
        tabbed away from — so switching tabs after a clear painted the cleared thread straight back.
        Measured on the maintainer's Deck 2026-08-27; locked as **D35 option 1**.

        Three jobs, in this order:

        1. **Forget what carries forward** — ``forget_game_ai_carried_context()``, called first and
           deliberately ahead of the state reset just below: that method reads the running game's
           AppID off ``self._background_state``, so calling it after that state is replaced with a
           fresh one would always see no game at all. D105: Clear cache gets the same forget as the
           Session context strip's own Clear button, on one code path.
        2. **Forget the stored answer**, under ``_background_lock`` and before any real suspension
           point. The lock's uncontended fast path does not yield, so a ``get_background_game_ai_status``
           sent right behind this one (the remount that follows the confirmation modal closing)
           either finds the state already idle or blocks on the lock until it is. That ordering is
           what makes a fire-and-forget call from the frontend safe.
        3. **Stop**, if a generation was still running — the maintainer's call on D35's open
           sub-question. Cancelling the asyncio task is not enough on its own: the model call is a
           blocking urllib read on a worker thread, and only ``abort_background_game_ai`` owns that
           teardown (abort event -> close the HTTP response -> ask Ollama to stop). Its own state
           write is a no-op by the time it runs here, which is the wanted outcome: a cleared session
           shows nothing at all, not a "Request cancelled." bubble.
        """
        await self.forget_game_ai_carried_context()
        async with self._background_lock:
            task = self._background_task
            self._background_task = None
            was_running = task is not None and not task.done()
            self._background_state = self._new_background_state()
            self._background_request_seq += 1
        self._last_input_transparency = None
        # Logged unconditionally: the visible proof of this fix is a *absence* — a thread that does
        # not come back — and an absence cannot tell you whether the RPC ran or the UI simply never
        # repainted. This line is how the next on-device run distinguishes the two.
        logger.info("forget_background_game_ai: stored answer dropped (stopped=%s)", was_running)

        if was_running:
            await self.abort_background_game_ai()
        await cancel_and_await(task)
        # A cleared session must go silent: a reading of the old answer must not keep playing.
        await asyncio.to_thread(self._read_aloud_service.stop)

        await self._maybe_app_log(
            "ask.forget",
            "background ask state forgotten",
            fields={"stopped": was_running},
        )
        return {"ok": True, "stopped": was_running}

    def _build_system_prompt(
        self,
        question: str,
        app_id: str,
        app_name: str,
        normalized_attachments: list,
        prepared_images: list,
        ask_mode: str = "speed",
        *,
        read_tdp: bool = False,
        tdp_grounding_requested: bool = False,
        tdp_cap_w: Optional[int] = None,
        proton_log_attachment: Optional[str] = None,
        followup_subject: str = "",
        strategy_spoiler_consent: bool = False,
        strategy_spoiler_asked_entity: str = "",
        strategy_spoiler_kb_entity_match: bool = False,
        strategy_domain_guidance: bool = False,
        strategy_title_profile: str = "",
        character_roleplay_on: bool = False,
        strategy_checklist_state: Optional[dict] = None,
        reply_verbosity: str = "balanced",
        reply_language: str = "english",
    ) -> str:
        """Build the system prompt using plugin-local metadata lookups and attachment context."""
        proton = (proton_log_attachment or "").strip()
        base = build_system_prompt(
            question=question,
            app_id=app_id,
            app_name=app_name,
            normalized_attachments=normalized_attachments,
            prepared_images=prepared_images,
            lookup_app_name=lookup_steam_app_name,
            lookup_screenshot_vdf_metadata=lookup_screenshot_vdf_metadata,
            ask_mode=ask_mode,
            early_context_suffix=proton,
            followup_subject=followup_subject,
            strategy_spoiler_consent=strategy_spoiler_consent,
            strategy_spoiler_asked_entity=strategy_spoiler_asked_entity,
            strategy_spoiler_kb_entity_match=strategy_spoiler_kb_entity_match,
            strategy_domain_guidance=strategy_domain_guidance,
            strategy_title_profile=strategy_title_profile,
            character_roleplay_on=character_roleplay_on,
            strategy_checklist_state=strategy_checklist_state,
            reply_verbosity=reply_verbosity,
            reply_language=reply_language,
        )
        return append_deck_tdp_sysfs_grounding(
            base,
            read_tdp=read_tdp,
            cap_w=tdp_cap_w,
            grounding_requested=tdp_grounding_requested,
        )

    async def ask_ollama(
        self,
        question: str,
        PcIp: str,
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
    ):
        """Orchestrate attachment prep, prompt assembly, and model fallback request execution."""
        return await run_ask_ollama(
            self,
            question,
            PcIp,
            app_id,
            app_name,
            request_timeout_seconds=request_timeout_seconds,
            attachments=attachments,
            ask_mode=ask_mode,
            read_tdp=read_tdp,
            tdp_grounding_requested=tdp_grounding_requested,
            tdp_cap_w=tdp_cap_w,
            proton_log_attachment=proton_log_attachment,
            proton_log_transparency=proton_log_transparency,
            followup_subject=followup_subject,
            strategy_spoiler_consent=strategy_spoiler_consent,
            strategy_spoiler_asked_entity=strategy_spoiler_asked_entity,
            strategy_spoiler_kb_entity_match=strategy_spoiler_kb_entity_match,
            strategy_domain_guidance=strategy_domain_guidance,
            strategy_title_profile=strategy_title_profile,
            token_stream_request_id=token_stream_request_id,
            strategy_checklist_state=strategy_checklist_state,
            preferred_model=preferred_model,
        )

    async def _stop_voice_transcription_internal(self) -> None:
        async with self._voice_lock:
            session = self._voice_session
            self._voice_session = None
        if session is not None:
            await asyncio.to_thread(session.force_stop)
        from backend.services.voice_whisper_daemon import force_whisper_engine_stop

        await asyncio.to_thread(force_whisper_engine_stop)

    async def _require_microphone_access(self) -> tuple[bool, dict[str, Any]]:
        settings = await self.load_settings()
        if not capability_enabled(settings, "microphone_access"):
            return False, {
                "accepted": False,
                "error": "permission_denied",
                "reason": "Enable Voice input (microphone) in the Permissions tab first.",
            }
        return True, {}

    async def get_voice_engine_status(self):
        """Return whisper binary + model readiness for the configured STT model."""
        settings = await self.load_settings()
        model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
        ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
        install = dict(self._voice_install_state)
        return {**ready, "install": install}

    async def install_voice_engine(self, model_id: str = ""):
        """Install whisper-cli (podman) and download the selected GGUF model (requires microphone_access)."""
        ok_gate, gate_out = await self._require_microphone_access()
        if not ok_gate:
            return gate_out or {"accepted": False, "reason": "permission_denied"}

        settings = await self.load_settings()
        mid = sanitize_voice_stt_model(model_id or settings.get("voice_stt_model"))
        async with self._voice_install_lock:
            existing = self._voice_install_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Voice engine install already running.", "error": "busy"}

            self._voice_install_cancel = new_threading_cancel_event()
            self._voice_install_state = new_voice_install_state()
            self._voice_install_state.update(
                {"phase": "running", "done": False, "accepted": True, "model_id": mid}
            )

            on_stage = make_state_updating_on_stage(self._voice_install_state)

            async def runner() -> None:
                try:
                    await asyncio.to_thread(
                        install_whisper_cli,
                        PLUGIN_ROOT,
                        decky.DECKY_PLUGIN_SETTINGS_DIR,
                        self._voice_install_state,
                        self._voice_install_cancel,
                        on_stage,
                    )
                    await asyncio.to_thread(
                        download_voice_model,
                        PLUGIN_ROOT,
                        decky.DECKY_PLUGIN_SETTINGS_DIR,
                        mid,
                        self._voice_install_state,
                        self._voice_install_cancel,
                        on_stage,
                    )
                except Exception as exc:
                    self._voice_install_state.update(
                        {"phase": "failed", "done": True, "error": str(exc)[:500]}
                    )

            self._voice_install_task = asyncio.create_task(runner())

        await self._maybe_app_log("voice.install", "voice engine install accepted", fields={"model_id": mid})
        return {"accepted": True, "model_id": mid}

    async def get_voice_install_status(self):
        """Poll voice model download progress."""
        return dict(self._voice_install_state)

    async def start_voice_transcription(self):
        """Start PipeWire/Pulse capture and local whisper interim transcription."""
        ok_gate, gate_out = await self._require_microphone_access()
        if not ok_gate:
            return gate_out or {"accepted": False, "reason": "permission_denied"}

        settings = await self.load_settings()
        model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
        ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
        if not ready.get("binary_ready"):
            return {
                "accepted": False,
                "error": "engine_missing",
                "reason": (
                    "whisper-cli is not installed. Open Settings → Voice input and tap "
                    "Install voice engine (downloads whisper-cli + model)."
                ),
            }
        if not ready.get("model_ready"):
            return {
                "accepted": False,
                "error": "model_missing",
                "reason": f"Download the {model_id} voice model in Settings → Voice input first.",
            }

        async with self._voice_lock:
            if self._voice_session is not None:
                st = self._voice_session.status()
                if st.get("recording"):
                    return {"accepted": True, "status": st}
                old = self._voice_session
                self._voice_session = None
            else:
                old = None
        if old is not None:
            await asyncio.to_thread(old.force_stop)

        async with self._voice_lock:
            session = VoiceTranscriptionSession(
                PLUGIN_ROOT,
                decky.DECKY_PLUGIN_SETTINGS_DIR,
                model_id,
                logger,
            )
            out = await asyncio.to_thread(session.start)
            if out.get("accepted"):
                self._voice_session = session
            else:
                self._voice_session = None

        if out.get("accepted"):
            await self._persist_input_transparency(build_voice_transcribe_snapshot(model_id=model_id))
            await self._maybe_app_log(
                "voice.start",
                "voice transcription started",
                fields={"model_id": model_id},
            )
        return out

    async def stop_voice_transcription(self):
        """Stop capture and return finalized transcript."""
        async with self._voice_lock:
            session = self._voice_session
            self._voice_session = None
        if session is None:
            return {
                "stopped": True,
                "status": "idle",
                "finalized_transcript": "",
                "partial_transcript": "",
            }
        out = await asyncio.to_thread(session.stop)
        await self._maybe_app_log(
            "voice.stop",
            "voice transcription stopped",
            fields={"transcript_len": len(str(out.get("finalized_transcript") or ""))},
        )
        return out

    async def get_voice_transcription_status(self):
        """Poll interim/final transcript while recording."""
        settings = await self.load_settings()
        if not capability_enabled(settings, "microphone_access"):
            await self._stop_voice_transcription_internal()
            return {
                **new_voice_transcription_state(),
                "status": "permission_denied",
                "error": "Microphone permission revoked.",
                "recording": False,
                "streaming": False,
            }

        async with self._voice_lock:
            session = self._voice_session
        if session is None:
            return new_voice_transcription_state()
        st = await asyncio.to_thread(session.status)
        st["streaming"] = bool(st.get("recording")) and (
            bool(st.get("partial_transcript")) or bool(st.get("finalized_transcript"))
        )
        return st

    async def start_voice_read_aloud(self, text: str):
        """Feature: read an answer's text aloud in the Deck's own voice.

        Input: plain text, already stripped of markdown and hidden spoiler blocks by the frontend
        (see plan 42 § 5, § 8 step 1 for the shared text helper). Output: {"ok", "sentence_count",
        "error"}. Returns at once — the reading itself runs in the background so no call here can
        outrun the RPC deadline. Starting while a previous reading is still going stops it first.
        """
        return await asyncio.to_thread(self._read_aloud_service.start, text)

    async def stop_voice_read_aloud(self):
        """Feature: stop reading aloud. Output: {"ok", "stopped"} — stopped is True only when a
        reading was actually in progress. Safe to call when nothing is playing."""
        return await asyncio.to_thread(self._read_aloud_service.stop)

    async def get_voice_read_aloud_status(self):
        """Feature: poll the read-aloud state while it plays in the background.

        Output: {"state": "idle"|"speaking"|"done"|"error", "sentence_index", "sentence_count",
        "error", "started_at"}.
        """
        return await asyncio.to_thread(self._read_aloud_service.status)

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        """Build the Ollama chat endpoint URL from current connection input."""
        return build_ollama_chat_url(pc_ip)
