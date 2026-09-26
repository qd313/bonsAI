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

Where the RPC bodies moved to (plan 65 split; the class still keeps every
method, just as a one-line hand-off): the settings-search-pack buttons are in
`backend/services/intent_pack_rpc.py`; the Strategy checklist's read/save/
clear are in `backend/services/strategy_checklist_rpc.py`; the saved-chat
list/open/create/delete/rename buttons are in
`backend/services/chat_slot_rpc.py`; the knowledge base's download/update/
remove/chip-candidate buttons are in `backend/services/rag_corpus_rpc.py`;
the voice-input and read-aloud buttons are in `backend/services/voice_rpc.py`;
screenshots, the Desktop debug/chat/app logs, clipboard and the small
transparency/feedback/language reads are in `backend/services/media_desktop_rpc.py`;
installing Ollama on the Deck and pulling/deleting/pricing its models are in
`backend/services/ollama_local_setup_rpc.py`.

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
    load_session_store,
    normalize_ask_checklist_state,
    reset_session_file,
    save_session_store,
    session_path,
)
from backend.services import strategy_checklist_rpc
from backend.services.local_ollama_teardown_service import (
    should_teardown_local_ollama_on_clear,
    teardown_local_ollama_for_plugin_reset,
)
from backend.services.intent_pack_service import (
    intent_packs_path,
    load_intent_packs,
    reset_intent_packs_file,
    save_intent_packs,
)
from backend.services import intent_pack_rpc
from backend.services.chat_slot_service import (
    load_slot as chat_load_slot,
    wipe_all_slots,
)
from backend.services import chat_slot_rpc
from backend.services import chat_sum_up_job
from backend.services import chat_turn_recorder
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
)
from backend.services import media_desktop_rpc
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
    lookup_screenshot_vdf_metadata,
    lookup_steam_app_name,
)
from backend.services.game_ai_request import run_game_ai_request
from backend.services.network_service import get_deck_ip_async
from backend.services.ollama_ask_service import run_ask_ollama
from backend.services.transparency_service import (
    build_immediate_command_snapshot,
    build_sanitizer_block_snapshot,
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
from backend.services.tdp_service import clean_env
from backend.services.local_ollama_setup_service import new_local_ollama_setup_state
from backend.services.ollama_local_autostart_service import (
    apply_ollama_local_autostart as apply_ollama_local_autostart_entry,
    get_ollama_local_autostart_status as get_ollama_local_autostart_status_report,
)
from backend.services.ollama_mdns_discovery_service import (
    discover_mdns_ollama_hosts as run_mdns_ollama_discovery,
)
from backend.services import ollama_local_setup_rpc
from backend.services.voice_transcription_service import (
    VoiceTranscriptionSession,
    new_voice_install_state,
)
from backend.services import voice_rpc
from backend.services.voice_read_aloud_service import VoiceReadAloudService
from backend.services.rag_corpus_download_service import new_rag_corpus_download_state
from backend.services import rag_corpus_rpc
from backend.constants import DEFAULT_OLLAMA_PCIP
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
        # Plan 68 step 4: remembered beside the line so the status poll can tell "summing_up"
        # apart from every other phase without re-deriving it from the text. Stashed on every
        # phase key publish, not only "summing_up" -- the next real phase (e.g. "connecting_model"
        # once the summary is done) must overwrite this too, or the poll would keep reading the
        # summary's own timer rule for a phase that has already moved on.
        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") == request_id:
                snap["thinking_phase_key"] = phase

    def _merge_partial_into_background_status(self, state: dict) -> dict:
        """Graft the live streaming snapshot onto a copy of ``state`` for one status poll.

        Only touches a state that is still ``"pending"`` for the same request id the snapshot
        belongs to -- everything else (a terminal state, or a snapshot for a request that has
        already moved on) is left with the partial-only fields cleared. The waiting-line text
        itself has three sources, tried in this order: the chat-summing timer (plan 68 step 4,
        never escalated), the model's own live status line (escalated once it has gone stale),
        and a deterministic fallback once no live line has arrived yet at all.
        """
        from backend.services.bonsai_stream_tags import (
            deterministic_thinking_phase_fallback,
            escalate_static_thinking_line,
            summing_up_line,
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
            # Plan 58 phase 1: the "From the notes" block's own material, published into the live
            # snapshot before the model call by game_ai_request.py's
            # `_publish_kb_attached_notes_live` -- this is the one line that was missing to carry
            # it from there into a poll response. Copied unconditionally, like `partial_response`
            # above rather than guarded like `asked_entity`: a fresh turn's snapshot starts at
            # `[]` (new_partial_stream_snapshot) and should read as "nothing attached yet", not
            # keep whatever the previous turn showed.
            out["kb_attached_notes"] = snap.get("kb_attached_notes") or []
            thinking = snap.get("thinking_summary")
            if isinstance(thinking, str) and thinking.strip():
                set_at = float(snap.get("thinking_summary_monotonic") or 0.0)
                static_for = max(0.0, time.monotonic() - set_at) if set_at else 0.0
                if snap.get("thinking_phase_key") == "summing_up":
                    # Plan 68 step 4: this phase counts up instead of escalating -- the person is
                    # watching a real timer, not a stale line the model went quiet on, so it is
                    # never handed to escalate_static_thinking_line no matter how long it sits.
                    out["thinking_summary"] = summing_up_line(static_for)
                    out["summing_up_seconds"] = max(0, int(static_for))
                else:
                    # Escalate a line that has gone stale. Once the last prep phase publishes,
                    # nothing else fires unless the model emits a <bonsai-status> tag, and small
                    # models often do not -- so this is what stops the line freezing for a whole
                    # generation.
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

    async def list_chat_slots(self):
        """Return recent chat slot summaries (newest first)."""
        return await chat_slot_rpc.list_chat_slots(self)

    async def get_chat_slot(self, slot_id: str = ""):
        """Load one chat slot with full turn history."""
        return await chat_slot_rpc.get_chat_slot(self, slot_id)

    async def create_chat_slot(self, payload: Any = None):
        """Create a new empty chat slot."""
        return await chat_slot_rpc.create_chat_slot(self, payload)

    async def delete_chat_slot(self, slot_id: str = "", payload: Any = None):
        """Delete a chat slot from private store."""
        return await chat_slot_rpc.delete_chat_slot(self, slot_id, payload)

    async def rename_chat_slot(self, payload: Any = None):
        """Rename a chat slot label."""
        return await chat_slot_rpc.rename_chat_slot(self, payload)

    async def sum_up_chat_slot(self, slot_id: str = "", PcIp: str = ""):
        """The Session tab's *Sum up this chat* button: sums the chat up right away, as its own
        job through the same one-question-at-a-time slot an Ask uses, on the same AI server an Ask
        would use (``PcIp``, as ``start_background_game_ai`` takes it). See chat_sum_up_job.py."""
        return await chat_sum_up_job.sum_up_chat_slot(self, slot_id, PcIp)

    # --- Strategy checklist session RPC ---

    async def get_strategy_checklist_session(self, app_id: str = ""):
        """Return persisted checklist for the given game AppID (or generic bucket when empty)."""
        return await strategy_checklist_rpc.get_strategy_checklist_session(self, app_id)

    async def save_strategy_checklist_session(self, payload: Any = None):
        """Persist checklist + checked state for one game bucket."""
        return await strategy_checklist_rpc.save_strategy_checklist_session(self, payload)

    async def clear_strategy_checklist_session(self, app_id: str = ""):
        """Remove persisted checklist for one game or entire file when app_id omitted."""
        return await strategy_checklist_rpc.clear_strategy_checklist_session(self, app_id)

    # --- Intent packs RPC ---

    async def get_intent_packs(self):
        """Return intent pack summaries and full entries for unified search indexing."""
        return await intent_pack_rpc.get_intent_packs(self)

    async def set_intent_pack_enabled(self, pack_id: str = "", enabled: bool = True):
        """Enable or disable a search intent pack."""
        return await intent_pack_rpc.set_intent_pack_enabled(self, pack_id, enabled)

    async def set_kids_lock_state(self, active: bool = False):
        """Session Kids master lock from Steam parental `locked` (frontend assertion)."""
        set_kids_lock_active(bool(active))
        return {"ok": True, "kids_lock_active": kids_lock_active()}

    async def export_intent_pack(self, pack_id: str = ""):
        """Export one intent pack as formatted JSON."""
        return await intent_pack_rpc.export_intent_pack(self, pack_id)

    async def import_intent_pack(self, payload: Any = None):
        """Dry-run or confirm-merge import of a single intent pack from JSON."""
        return await intent_pack_rpc.import_intent_pack(self, payload)

    async def remove_intent_pack(self, pack_id: str = ""):
        """Remove a user/imported intent pack (bundled packs cannot be removed)."""
        return await intent_pack_rpc.remove_intent_pack(self, pack_id)

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
        return await ollama_local_setup_rpc.start_local_ollama_setup(self, data)

    async def get_local_ollama_setup_status(self):
        """Return last status for the local Ollama installer (plain JSON dict)."""
        return await ollama_local_setup_rpc.get_local_ollama_setup_status(self)

    async def cancel_local_ollama_setup(self):
        """Request cancellation of an in-progress setup (best-effort)."""
        return await ollama_local_setup_rpc.cancel_local_ollama_setup(self)

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
        return await rag_corpus_rpc.get_rag_corpus_status(self, data)

    async def start_rag_corpus_download(self, data: Any = None):
        """Download and install the knowledge base corpus (user-initiated; Model A consent)."""
        return await rag_corpus_rpc.start_rag_corpus_download(self, data)

    async def cancel_rag_corpus_download(self):
        return await rag_corpus_rpc.cancel_rag_corpus_download(self)

    async def update_rag_corpus(self):
        """Check remote manifest and re-download when version differs."""
        return await rag_corpus_rpc.update_rag_corpus(self)

    async def remove_rag_corpus(self):
        """Remove installed corpus files and clear path settings."""
        return await rag_corpus_rpc.remove_rag_corpus(self)

    async def install_rag_corpus_local(self, data: Any = None):
        """Dev/QA: install corpus from a local manifest directory (no network)."""
        return await rag_corpus_rpc.install_rag_corpus_local(self, data)

    async def get_session_rag_chip_candidates(
        self,
        app_id: str = "",
        app_name: str = "",
        shortcut_name: str = "",
    ):
        """Preset-chip prompts drawn from the offline KB for the running game."""
        return await rag_corpus_rpc.get_session_rag_chip_candidates(
            self, app_id, app_name, shortcut_name
        )

    # --- Ollama model pull and catalog RPC ---

    async def pull_ollama_models(self, tags: Any = None):
        """Pull one or more Ollama tags on this Deck (background, reuses setup service)."""
        return await ollama_local_setup_rpc.pull_ollama_models(self, tags)

    async def merge_pulled_tags_into_routing_orders(self, tags: Any = None):
        """Append newly pulled tags to the user's saved text/vision try orders."""
        return await ollama_local_setup_rpc.merge_pulled_tags_into_routing_orders(self, tags)

    async def delete_ollama_model(self, tag: str = ""):
        """Remove one installed Ollama model via ``ollama rm`` (argv form)."""
        return await ollama_local_setup_rpc.delete_ollama_model(self, tag)

    async def fetch_ollama_catalog_metadata(self, tags: Any = None):
        """Live sizes from registry.ollama.ai with offline fallback metadata."""
        return await ollama_local_setup_rpc.fetch_ollama_catalog_metadata(self, tags)

    async def fetch_pull_model_catalog(self, opts: Any = None):
        """Living Pull Models overlay (remote JSON + disk cache) for frontend merge."""
        return await ollama_local_setup_rpc.fetch_pull_model_catalog(self, opts)

    # --- Screenshot and media RPC ---

    async def list_recent_screenshots(self, app_id: str = "", limit: int = 5):
        """List recent screenshots with preview and app metadata for attachment browsing."""
        return await media_desktop_rpc.list_recent_screenshots(self, app_id, limit)

    async def append_desktop_debug_note(self, payload: Any = None):
        """Append timestamped Q&A markdown under ~/Desktop/bonsAI_logs/<name>.md (append-only)."""
        return await media_desktop_rpc.append_desktop_debug_note(self, payload)

    async def append_desktop_chat_event(self, payload: Any = None):
        """Append Ask or AI response lines to daily UTC chat file under ~/Desktop/bonsAI_logs/."""
        return await media_desktop_rpc.append_desktop_chat_event(self, payload)

    async def append_app_log(self, payload: Any = None):
        """Append one app-activity line to ~/Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log."""
        return await media_desktop_rpc.append_app_log(self, payload)

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
            await chat_turn_recorder.record_user_turn(
                self,
                slot_id=chat_slot_id,
                question=parsed_question,
                request_id=request_id,
                attachments=[],
                app_id=app_id,
                app_name=app_name,
            )
            await chat_turn_recorder.record_assistant_turn(
                self,
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
        return await media_desktop_rpc.get_input_transparency(self)

    async def get_reply_language_snapshot(self):
        """Return Steam client language, persisted override, and effective Ask reply language."""
        return await media_desktop_rpc.get_reply_language_snapshot(self)

    async def save_ask_feedback(
        self,
        rating: str,
        request_id: int = 0,
        question_len: int = 0,
        success: bool = False,
        chip_id: str = "",
    ):
        """Persist thumbs up/down locally (JSONL under plugin settings); no network."""
        return await media_desktop_rpc.save_ask_feedback(
            self, rating, request_id, question_len, success, chip_id
        )

    async def read_host_clipboard_text(self):
        """Read clipboard via host script when the WebView cannot use ``navigator.clipboard``."""
        return await media_desktop_rpc.read_host_clipboard_text(self)

    async def write_host_clipboard_text(self, text: str = ""):
        """Write clipboard via host script; see media_desktop_rpc.py for the fallback order."""
        return await media_desktop_rpc.write_host_clipboard_text(self, text)

    async def take_steam_screenshot(self, app_id: str = ""):
        """Close-QAM flow: capture game into Steam screenshots (not auto-attached to Ask)."""
        return await media_desktop_rpc.take_steam_screenshot(self, app_id)

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
                # Plan 57: the whole reasoning (capped, end kept), the whole seconds from the
                # first thinking chunk to the first answer chunk, and a token estimate -- "" / null
                # / 0 on a turn with no thinking, the same shape ``new_background_state`` defaults.
                "reasoning_text": str(result.get("reasoning_text") or ""),
                "reasoning_seconds": result.get("reasoning_seconds"),
                "reasoning_tokens": int(result.get("reasoning_tokens") or 0),
                # Plan 68 step 2: whether this answer summed the chat up first, so the screen can
                # paint the note or the warning line from the state before it reloads the chat.
                # None on a stopped request, the same as ``reasoning`` above is dropped for one --
                # a stopped answer gets no mark.
                "chat_summary": None if cancelled_rq else result.get("chat_summary"),
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
            await chat_turn_recorder.record_assistant_turn(
                self,
                slot_id=slot_id,
                response_text=response_text,
                transparency=None if cancelled_rq else result.get("transparency"),
                app_id=app_id,
                app_name=app_name,
                asked_entity=result.get("strategy_spoiler_asked_entity") or "",
                reasoning=None if cancelled_rq else chat_turn_recorder.reasoning_payload_for_chat_slot(result),
                chat_summary="" if cancelled_rq else str(result.get("chat_summary") or ""),
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
        chat_slot_id = chat_turn_recorder.parse_chat_slot_id(question)

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
                await chat_turn_recorder.record_user_turn(
                    self,
                    slot_id=chat_slot_id,
                    question=parsed_question,
                    request_id=request_id,
                    attachments=attachments,
                    app_id=app_id,
                    app_name=app_name,
                    display_question=chat_turn_recorder.parse_chat_slot_display_question(question),
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
                        await chat_turn_recorder.record_assistant_turn(
                            self,
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

    async def _forget_game_ai_carried_context(self):
        """Settings' *Clear session*, first step. Input: none.
        Output: {"ok", "forgot"} — forgets what the plugin carries into the next question.

        Internal since plan 68 (2026-09-25): the Session tab's own Clear button, which used to call
        this straight from the screen, was replaced by *Sum up this chat*, which keeps a chat's
        memory instead of throwing it away. The only caller left is ``forget_background_game_ai``
        below, so this is no longer a method the screen can call (the leading underscore is what
        says so — see AGENTS.md, "How the two sides talk").

        It forgets only what the model is fed on the *next* Strategy/Expert question, not the
        visible session — the chat, the Session tab's own rows, and the stored background answer
        are all left alone; ``forget_background_game_ai`` owns those. D105, locked 2026-09-15: the
        lighter of two meanings for Clear — only what is carried forward.

        Reading ``py_modules/backend/services/game_ai_request.py`` end to end (done before writing
        this) turned up exactly two things a question carries into the next one without being
        re-sent by the screen every time:

        1. **The remembered follow-up subject** — ``kb_followup_memory``, one record per chat
           since plan 68 step 2, keyed by game *within* whichever chat asked. Forgotten for the
           *active* chat only — the one the last question in this process belongs to — with its
           own ``forget(chat_id=...)``, and the chat's own file is updated to match so a restart
           does not bring the forgotten subject back. Every other chat's remembered subject is
           untouched: Clear is about what carries forward from the last question asked, not a way
           to reach into a chat nobody is looking at.
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
        return value says which happened, so a caller (or a test) can tell. The active chat id is
        read the same way, off ``self._background_state["chat_slot_id"]``: blank when nothing has
        been asked yet this process, or when the last question was not asked inside a saved chat
        — either way ``kb_followup_memory.forget("")`` then reaches only the no-chat entry.
        """
        forgot: list[str] = []

        active_chat_id = str(self._background_state.get("chat_slot_id") or "").strip()
        kb_followup_memory.forget(chat_id=active_chat_id)
        if active_chat_id:
            await chat_turn_recorder.save_chat_subject(self, active_chat_id, None)
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

        1. **Forget what carries forward** — ``_forget_game_ai_carried_context()``, called first and
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
        await self._forget_game_ai_carried_context()
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
        chat_turns: Optional[list] = None,
        chat: Optional[dict] = None,
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
            chat_turns=chat_turns,
            chat=chat,
        )

    def chat_for_request(self, request_id: Any) -> dict:
        """The chat this request belongs to: its id, every turn already in it, its own summary
        and remembered follow-up subject (plan 68 step 2), and which game it was opened under.

        ``{}`` when the Ask did not come from a saved chat, or when the chat cannot be read. A
        chat that cannot be read is a chat with no memory, which is exactly how every Ask behaved
        before this existed -- never a reason to fail the question. Starts with an underscore-free
        plain ``def`` on purpose -- see the module note on which methods the screen can call.

        The question being asked right now IS among the turns: it is written to the chat when the
        Ask is accepted, before the answer starts. Whoever builds the memory drops that trailing
        turn -- see plan_and_build_chat_memory, which does exactly that and says why.
        """
        try:
            if not isinstance(request_id, int):
                return {}
            slot_id = str(self._chat_slot_by_request.get(request_id) or "").strip()
            if not slot_id:
                return {}
            slot = chat_load_slot(Plugin._chat_slots_settings_dir(), slot_id, logger=decky.logger)
            if not isinstance(slot, dict):
                return {}
            turns = slot.get("turns")
            return {
                "id": slot.get("id", slot_id),
                "turns": list(turns) if isinstance(turns, list) else [],
                "summary": slot.get("summary"),
                "subject": slot.get("subject"),
                "origin_app_id": slot.get("origin_app_id", ""),
                "origin_app_name": slot.get("origin_app_name", ""),
            }
        except Exception:
            decky.logger.exception("chat_for_request: could not read the chat's own history")
            return {}

    def chat_turns_for_request(self, request_id: Any) -> list:
        """The questions and answers already in the chat this request belongs to.

        Empty when the Ask did not come from a saved chat, or when the chat cannot be read -- see
        ``chat_for_request`` above, which this reads through so there is one loader for both.
        """
        turns = self.chat_for_request(request_id).get("turns")
        return turns if isinstance(turns, list) else []

    async def _stop_voice_transcription_internal(self) -> None:
        async with self._voice_lock:
            session = self._voice_session
            self._voice_session = None
        if session is not None:
            await asyncio.to_thread(session.force_stop)
        from backend.services.voice_whisper_daemon import force_whisper_engine_stop

        await asyncio.to_thread(force_whisper_engine_stop)

    async def get_voice_engine_status(self):
        """Return whisper binary + model readiness for the configured STT model."""
        return await voice_rpc.get_voice_engine_status(self, PLUGIN_ROOT)

    async def install_voice_engine(self, model_id: str = ""):
        """Install whisper-cli (podman) and download the selected GGUF model (requires microphone_access)."""
        return await voice_rpc.install_voice_engine(self, PLUGIN_ROOT, model_id)

    async def get_voice_install_status(self):
        """Poll voice model download progress."""
        return await voice_rpc.get_voice_install_status(self)

    async def start_voice_transcription(self):
        """Start PipeWire/Pulse capture and local whisper interim transcription."""
        return await voice_rpc.start_voice_transcription(self, PLUGIN_ROOT)

    async def stop_voice_transcription(self):
        """Stop capture and return finalized transcript."""
        return await voice_rpc.stop_voice_transcription(self)

    async def get_voice_transcription_status(self):
        """Poll interim/final transcript while recording."""
        return await voice_rpc.get_voice_transcription_status(self)

    async def start_voice_read_aloud(self, text: str):
        """Feature: read an answer's text aloud in the Deck's own voice. See voice_rpc.py."""
        return await voice_rpc.start_voice_read_aloud(self, text)

    async def stop_voice_read_aloud(self):
        """Feature: stop reading aloud. See voice_rpc.py."""
        return await voice_rpc.stop_voice_read_aloud(self)

    async def get_voice_read_aloud_status(self):
        """Feature: poll the read-aloud state while it plays in the background. See voice_rpc.py."""
        return await voice_rpc.get_voice_read_aloud_status(self)

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        """Build the Ollama chat endpoint URL from current connection input."""
        return build_ollama_chat_url(pc_ip)
