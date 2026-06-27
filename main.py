"""Decky Loader plugin entrypoint: RPC surface, capability gates, and Ask orchestration.

The Python side owns Ollama calls and privileged I/O; the React bundle invokes methods via Decky RPC
only. Some Ask branches (sanitizer keywords, shortcut guidance, VAC check) finalize inside the RPC
handler so the UI polling loop can observe ``completed`` immediately without a worker task.
"""

import asyncio
import base64
import fcntl
import functools
import ipaddress
import json
import os
import random
import re
import socket
import struct
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error
from typing import Any, Optional, Tuple

import decky

PLUGIN_ROOT = os.path.dirname(os.path.abspath(__file__))
if PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, PLUGIN_ROOT)

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
from backend.services.ollama_service import (
    append_deck_tdp_sysfs_grounding,
    best_effort_abort_ollama_inference,
    build_system_prompt,
    post_ollama_chat,
)
from backend.services.plugin_data_reset import reset_plugin_disk_and_defaults
from backend.services.local_ollama_teardown_service import teardown_local_ollama_for_plugin_reset
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
from backend.services.settings_service import (
    clamp_int,
    load_settings as load_settings_from_disk,
    sanitize_ask_mode,
    sanitize_ollama_keep_alive,
    sanitize_settings,
    sanitize_unified_input_persistence_mode,
    save_settings as save_settings_to_disk,
)
from backend.services.capabilities import capability_enabled
from backend.services.model_policy import (
    disclosure_for_model,
    empty_filter_user_message,
    filter_model_list,
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
    prepare_attachment_images,
    resolve_recent_screenshot_paths,
    resolve_plugin_capture_paths,
    merge_recent_screenshot_paths,
    take_steam_game_screenshot,
    try_gamescope_screenshot_capture,
)
from backend.services.game_ai_request import run_game_ai_request
from backend.services.tdp_service import clean_env, find_amdgpu_hwmon, write_sysfs, STEAMOS_PRIV_WRITE
from backend.services.local_ollama_setup_service import (
    is_loopback_ollama_host,
    list_installed_ollama_tags,
    new_local_ollama_setup_state,
    probe_ollama_http_ok,
    recover_loopback_ollama_listening,
    run_local_setup,
    run_ollama_rm_async,
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
from refactor_helpers import (
    build_ollama_chat_url,
    build_effective_models_to_try,
    filter_models_to_installed,
    is_valid_setup_pull_profile,
    normalize_ollama_base,
    is_ollama_model_missing_error,
    no_installed_routing_models_message,
    select_ollama_models,
)

logger = decky.logger

# User-visible when a background asyncio task dies unexpectedly; never embed ``str(exc)`` (paths/internals).
_BACKGROUND_TASK_FAILED_USER_MESSAGE = (
    "Backend error: something went wrong while processing your request. Details were logged on the device."
)

# Sentinel: sanitizer immediate-complete path omits ``shortcut_setup`` from state/response; VAC sets state only.
_OMIT_SHORTCUT_SETUP_FIELD = object()


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
    DEFAULT_ASK_MODE = "speed"
    VALID_ASK_MODES = {"speed", "strategy", "expert"}
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

    def _abort_ollama_chat_check(self) -> bool:
        """True when frontend requested Stop mid-generation (closes HTTP quickly; executor thread exits)."""
        evt = getattr(self, "_abort_current_ollama_chat", None)
        return isinstance(evt, threading.Event) and evt.is_set()

    @staticmethod
    def _coerce_instance(self_or_cls: Any) -> "Plugin":
        """api_version 1 uses an instance; older loaders may pass the class as self."""
        return self_or_cls() if isinstance(self_or_cls, type) else self_or_cls

    @staticmethod
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
    def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
        return clamp_int(value, default, minimum, maximum)

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

    @staticmethod
    def _sanitize_unified_input_persistence_mode(value: Any) -> str:
        return sanitize_unified_input_persistence_mode(
            value,
            Plugin.VALID_UNIFIED_INPUT_PERSISTENCE_MODES,
            Plugin.DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
        )

    async def _main(self):
        """Run plugin startup hooks and ensure background state exists before serving RPCs."""
        self._ensure_background_state()
        logger.info("bonsAI plugin loaded!")
        await self._maybe_app_log("plugin.lifecycle", "plugin loaded")

    async def _unload(self):
        """Run plugin shutdown logging for Decky unload events."""
        plugin = Plugin._coerce_instance(self)
        await plugin._maybe_app_log("plugin.lifecycle", "plugin unloading")
        ce = getattr(plugin, "_local_ollama_cancel_event", None)
        if isinstance(ce, asyncio.Event):
            ce.set()
        lt = getattr(plugin, "_local_ollama_setup_task", None)
        if lt is not None and not lt.done():
            lt.cancel()
            try:
                await lt
            except asyncio.CancelledError:
                pass
        await plugin._stop_voice_transcription_internal()
        vit = getattr(plugin, "_voice_install_task", None)
        if vit is not None and not vit.done():
            ce_voice = getattr(plugin, "_voice_install_cancel", None)
            if isinstance(ce_voice, threading.Event):
                ce_voice.set()
            vit.cancel()
            try:
                await vit
            except asyncio.CancelledError:
                pass
        logger.info("bonsAI plugin unloaded!")

    def _new_background_state(self) -> dict:
        """Build a default background request state payload used by status polling paths."""
        return {
            "status": "idle",
            "request_id": None,
            "question": "",
            "app_id": "",
            "app_context": "none",
            "success": None,
            "response": "",
            "applied": None,
            "elapsed_seconds": 0,
            "error": None,
            "started_at": None,
            "completed_at": None,
            "strategy_guide_branches": None,
            "model_policy_disclosure": None,
            "preset_carousel_inject": None,
            "partial_response": None,
            "streaming": False,
            "thinking_summary": None,
        }

    def _new_partial_stream_snapshot(self, request_id: int) -> dict:
        return {
            "request_id": request_id,
            "partial_response": None,
            "thinking_summary": None,
            "streaming": False,
            "last_flush_monotonic": 0.0,
        }

    def _reset_partial_stream_snapshot(self, request_id: int) -> None:
        with self._partial_response_lock:
            self._partial_stream_snapshot = self._new_partial_stream_snapshot(request_id)

    def _clear_partial_stream_snapshot(self) -> None:
        with self._partial_response_lock:
            self._partial_stream_snapshot = {
                "request_id": None,
                "partial_response": None,
                "thinking_summary": None,
                "streaming": False,
                "last_flush_monotonic": 0.0,
            }

    def _update_partial_response(
        self,
        request_id: int,
        text: str,
        done: bool,
        thinking_summary: Optional[str] = None,
        *,
        update_partial: bool = True,
    ) -> None:
        """Thread-safe partial assistant text for background status polling (executor thread)."""
        with self._partial_response_lock:
            snap = self._partial_stream_snapshot
            if snap.get("request_id") != request_id:
                return
            now = time.monotonic()
            if thinking_summary:
                snap["thinking_summary"] = thinking_summary
            if not update_partial:
                if done:
                    snap["streaming"] = False
                return
            if not done:
                prev = snap.get("partial_response")
                last_flush = float(snap.get("last_flush_monotonic") or 0.0)
                if prev and text and (now - last_flush) < Plugin.PARTIAL_RESPONSE_FLUSH_INTERVAL_S:
                    return
            snap["partial_response"] = text if text else None
            snap["streaming"] = (not done) and bool(text)
            snap["last_flush_monotonic"] = now

    def _active_request_id(self) -> Optional[int]:
        """Return the in-flight background Ask request_id, if any."""
        self._ensure_background_state()
        rid = self._background_state.get("request_id")
        return rid if isinstance(rid, int) else None

    def _publish_thinking_phase(self, request_id: int, summary: str) -> None:
        """Publish a deterministic prep-phase label without partial reply text."""
        text = (summary or "").strip()
        if not text:
            return
        self._update_partial_response(request_id, "", False, text[:240], update_partial=False)

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
        from backend.services.bonsai_stream_tags import deterministic_thinking_phase_fallback

        out = dict(state)
        with self._partial_response_lock:
            snap = dict(self._partial_stream_snapshot)
        rid = out.get("request_id")
        if out.get("status") == "pending" and rid is not None and snap.get("request_id") == rid:
            out["partial_response"] = snap.get("partial_response")
            out["streaming"] = bool(snap.get("streaming"))
            thinking = snap.get("thinking_summary")
            if isinstance(thinking, str) and thinking.strip():
                out["thinking_summary"] = thinking.strip()
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
        return out

    def _ensure_background_state(self) -> None:
        """Backfill runtime attributes for compatibility with loaders that skip __init__."""
        if not hasattr(self, "_background_lock"):
            self._background_lock = asyncio.Lock()
        if not hasattr(self, "_background_task"):
            self._background_task = None
        if not hasattr(self, "_background_state") or not isinstance(self._background_state, dict):
            self._background_state = self._new_background_state()
        if not hasattr(self, "_background_request_seq"):
            self._background_request_seq = 0
        if not hasattr(self, "_last_input_transparency"):
            self._last_input_transparency = None
        if not hasattr(self, "_abort_current_ollama_chat"):
            self._abort_current_ollama_chat = threading.Event()
        if not hasattr(self, "_active_ollama_chat_pc_ip"):
            self._active_ollama_chat_pc_ip = None
        if not hasattr(self, "_active_ollama_chat_model"):
            self._active_ollama_chat_model = None
        if not hasattr(self, "_active_ollama_chat_http_response"):
            self._active_ollama_chat_http_response = None
        if not hasattr(self, "_chat_resp_ready_evt"):
            self._chat_resp_ready_evt = None
        if not hasattr(self, "_partial_response_lock"):
            self._partial_response_lock = threading.Lock()
        if not hasattr(self, "_partial_stream_snapshot") or not isinstance(
            self._partial_stream_snapshot, dict
        ):
            self._partial_stream_snapshot = {
                "request_id": None,
                "partial_response": None,
                "thinking_summary": None,
                "streaming": False,
                "last_flush_monotonic": 0.0,
            }

    @staticmethod
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
        plugin = Plugin._coerce_instance(self)
        try:
            settings = await plugin.load_settings()
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
    def _coerce_payload_bool(value: Any) -> bool:
        if value is True:
            return True
        if isinstance(value, str) and value.strip().lower() in ("true", "1", "yes"):
            return True
        return False

    @staticmethod
    def _parse_ask_payload(question: Any, PcIp: str) -> Tuple[str, str, str, str, list, str, bool]:
        """Normalize ask payload variants into canonical question/ip/context values."""
        app_id = ""
        app_name = ""
        attachments: list = []
        ask_mode_raw: Any = None
        spoiler_consent_raw: Any = None
        if isinstance(question, dict):
            payload = question
            question = payload.get("question", "")
            PcIp = payload.get("PcIp", payload.get("pcIp", payload.get("pc_ip", PcIp)))
            app_id = str(payload.get("appId", "") or "").strip()
            app_name = str(payload.get("appName", "") or "").strip()
            attachments = Plugin._sanitize_attachments(payload.get("attachments", []))
            ask_mode_raw = payload.get("askMode", payload.get("ask_mode", ask_mode_raw))
            spoiler_consent_raw = payload.get("spoiler_consent", payload.get("spoilerConsent", spoiler_consent_raw))
        normalized_question = str(question or "").strip()
        normalized_pc_ip = str(PcIp or "").strip()
        ask_mode = sanitize_ask_mode(ask_mode_raw, Plugin.VALID_ASK_MODES, Plugin.DEFAULT_ASK_MODE)
        spoiler_consent = Plugin._coerce_payload_bool(spoiler_consent_raw)
        return normalized_question, normalized_pc_ip, app_id, app_name, attachments, ask_mode, spoiler_consent

    @staticmethod
    def _sanitize_attachments(raw_attachments: Any) -> list:
        """Keep only valid attachment fields and discard malformed entries."""
        if not isinstance(raw_attachments, list):
            return []
        sanitized: list = []
        for raw in raw_attachments:
            if not isinstance(raw, dict):
                continue
            path = str(raw.get("path", "") or "").strip()
            if not path:
                continue
            name = str(raw.get("name", "") or "").strip()
            source = str(raw.get("source", "unknown") or "unknown").strip().lower()
            app_id = str(raw.get("app_id", "") or "").strip()
            sanitized.append(
                {
                    "path": path,
                    "name": name or os.path.basename(path),
                    "source": source,
                    "app_id": app_id,
                }
            )
        return sanitized

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
        plugin = Plugin._coerce_instance(self)
        new_disabled = cmd == "disable"
        await plugin.save_settings({"input_sanitizer_user_disabled": new_disabled})
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
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
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

    async def load_settings(self):
        """Load persisted plugin settings from Decky's settings directory."""
        path = Plugin._settings_path()
        return load_settings_from_disk(path, Plugin._sanitize_settings, logger)

    async def save_settings(self, data: Any = None):
        """Persist plugin settings to Decky's settings directory."""
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
        plugin = Plugin._coerce_instance(self)
        prev_caps = current.get("capabilities") if isinstance(current.get("capabilities"), dict) else {}
        next_caps = saved.get("capabilities") if isinstance(saved.get("capabilities"), dict) else {}
        prev_mic = prev_caps.get("microphone_access") is True
        next_mic = next_caps.get("microphone_access") is True
        if prev_mic and not next_mic:
            await plugin._stop_voice_transcription_internal()
        return saved

    async def clear_plugin_data(self):
        """Remove persisted settings/runtime/logs and return fresh defaults (new-install behavior)."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        async with plugin._background_lock:
            task = plugin._background_task
            plugin._background_task = None
            if task is not None and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            plugin._background_state = plugin._new_background_state()
            plugin._background_request_seq += 1
        plugin._last_input_transparency = None

        async with plugin._local_ollama_setup_lock:
            if plugin._local_ollama_cancel_event is not None:
                plugin._local_ollama_cancel_event.set()
            lst = plugin._local_ollama_setup_task
            if lst is not None and not lst.done():
                lst.cancel()
                try:
                    await lst
                except asyncio.CancelledError:
                    pass
            plugin._local_ollama_setup_task = None
            plugin._local_ollama_cancel_event = None
            plugin._local_ollama_setup_state = new_local_ollama_setup_state()

        current = await plugin.load_settings()
        local_on_deck = isinstance(current, dict) and current.get("ollama_local_on_deck") is True
        if local_on_deck:
            teardown_summary = await asyncio.to_thread(
                teardown_local_ollama_for_plugin_reset, logger
            )
            await plugin._maybe_app_log(
                "clear_plugin_data.ollama_teardown",
                "local ollama teardown",
                fields={
                    "removed_tag_count": len(teardown_summary.get("removed_tags") or []),
                    "error_count": len(teardown_summary.get("errors") or []),
                },
            )

        defaults = reset_plugin_disk_and_defaults(
            settings_path=Plugin._settings_path(),
            settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
            runtime_dir=decky.DECKY_PLUGIN_RUNTIME_DIR,
            log_dir=decky.DECKY_PLUGIN_LOG_DIR,
            sanitize_func=Plugin._sanitize_settings,
            load_settings=load_settings_from_disk,
            save_settings=save_settings_to_disk,
            logger=logger,
        )
        reset_intent_packs_file(
            Plugin._intent_packs_path(),
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            logger=logger,
        )
        return defaults

    async def get_intent_packs(self):
        """Return intent pack summaries and full entries for unified search indexing."""
        plugin = Plugin._coerce_instance(self)
        store = plugin._load_intent_pack_store()
        return {
            "schema_version": store.get("schema_version"),
            "summaries": pack_summaries(store),
            "packs": store.get("packs") or [],
        }

    async def set_intent_pack_enabled(self, pack_id: str = "", enabled: bool = True):
        """Enable or disable a search intent pack."""
        plugin = Plugin._coerce_instance(self)
        store = plugin._load_intent_pack_store()
        result = set_pack_enabled(store, pack_id, enabled)
        if not result.get("ok"):
            return result
        saved = plugin._save_intent_pack_store(result["store"])
        return {
            "ok": True,
            "summaries": pack_summaries(saved),
            "packs": saved.get("packs") or [],
        }

    async def export_intent_pack(self, pack_id: str = ""):
        """Export one intent pack as formatted JSON."""
        plugin = Plugin._coerce_instance(self)
        store = plugin._load_intent_pack_store()
        return export_pack(store, pack_id)

    async def import_intent_pack(self, payload: Any = None):
        """Dry-run or confirm-merge import of a single intent pack from JSON."""
        plugin = Plugin._coerce_instance(self)
        data = payload if isinstance(payload, dict) else {}
        raw_json = data.get("json")
        confirm = data.get("confirm") is True
        if not isinstance(raw_json, str) or not raw_json.strip():
            return {"ok": False, "error": "json string required"}
        incoming, parse_error = parse_import_payload(raw_json)
        if parse_error:
            return {"ok": False, "error": parse_error}
        store = plugin._load_intent_pack_store()
        result = merge_import_pack(store, incoming or {}, confirm=confirm)
        if not result.get("ok"):
            return result
        if confirm and isinstance(result.get("store"), dict):
            saved = plugin._save_intent_pack_store(result["store"])
            result["summaries"] = pack_summaries(saved)
            result["packs"] = saved.get("packs") or []
        return result

    async def remove_intent_pack(self, pack_id: str = ""):
        """Remove a user/imported intent pack (bundled packs cannot be removed)."""
        plugin = Plugin._coerce_instance(self)
        store = plugin._load_intent_pack_store()
        result = remove_pack(store, pack_id)
        if not result.get("ok"):
            return result
        saved = plugin._save_intent_pack_store(result["store"])
        return {
            "ok": True,
            "summaries": pack_summaries(saved),
            "packs": saved.get("packs") or [],
        }

    @staticmethod
    def _find_amdgpu_hwmon() -> Optional[str]:
        """Proxy hwmon discovery through the service layer for compatibility and reuse."""
        return find_amdgpu_hwmon()

    @staticmethod
    def _write_sysfs(path: str, value: str) -> None:
        """Write sysfs values via service-managed privilege fallbacks."""
        write_sysfs(path, value, STEAMOS_PRIV_WRITE, logger)

    @staticmethod
    def _clean_env() -> dict:
        """Proxy sanitized subprocess environment generation through the service layer."""
        return clean_env()

    async def log_navigation(self, setting_path: str):
        """Log settings-navigation actions from the frontend for diagnostics."""
        logger.info(f"User navigated to: {setting_path}")
        return True

    async def get_deck_ip(self):
        """Return the Steam Deck's LAN IP address."""
        try:
            def _resolve_ip() -> str:

                def _valid_ipv4(candidate: str) -> bool:
                    try:
                        parsed = ipaddress.ip_address(candidate)
                    except Exception:
                        return False
                    if parsed.version != 4:
                        return False
                    return not (parsed.is_loopback or parsed.is_unspecified or parsed.is_link_local)

                def _interface_ipv4_candidates() -> list:
                    results: list = []
                    try:
                        iface_names = [name for name in os.listdir("/sys/class/net") if name and name != "lo"]
                    except Exception:
                        return results

                    sock: Optional[socket.socket] = None
                    try:
                        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                        for iface in iface_names:
                            if iface.startswith(("docker", "veth", "br-", "virbr", "zt", "tailscale", "tun", "tap")):
                                continue
                            try:
                                request = struct.pack("256s", iface[:15].encode("utf-8"))
                                response = fcntl.ioctl(sock.fileno(), 0x8915, request)
                                ip = socket.inet_ntoa(response[20:24]).strip()
                                results.append({"iface": iface, "ip": ip})
                            except Exception:
                                continue
                    except Exception:
                        return results
                    finally:
                        if sock is not None:
                            try:
                                sock.close()
                            except Exception:
                                pass
                    return results

                s: Optional[socket.socket] = None
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    s.settimeout(2.0)
                    s.connect(("1.1.1.1", 80))
                    ip = str(s.getsockname()[0] or "").strip()
                    if _valid_ipv4(ip):
                        return ip
                except Exception:
                    pass
                finally:
                    if s is not None:
                        try:
                            s.close()
                        except Exception:
                            pass

                try:
                    iface_candidates = _interface_ipv4_candidates()
                    valid_iface = next(
                        (
                            candidate
                            for candidate in iface_candidates
                            if _valid_ipv4(str(candidate.get("ip", "")))
                        ),
                        None,
                    )
                    if valid_iface:
                        return str(valid_iface.get("ip", ""))
                except Exception:
                    pass

                try:
                    route = subprocess.run(
                        ["ip", "-4", "route", "get", "1.1.1.1"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=1.5,
                        text=True,
                    )
                    route_text = (route.stdout or "").strip()
                    match = re.search(r"\bsrc\s+(\d+\.\d+\.\d+\.\d+)\b", route_text)
                    ip = match.group(1).strip() if match else ""
                    if _valid_ipv4(ip):
                        return ip
                except Exception:
                    pass

                try:
                    host_ip = str(socket.gethostbyname(socket.gethostname()) or "").strip()
                    if _valid_ipv4(host_ip):
                        return host_ip
                except Exception:
                    pass

                try:
                    host_i = subprocess.run(
                        ["hostname", "-I"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=1.5,
                        text=True,
                    )
                    host_tokens = [token.strip() for token in (host_i.stdout or "").split() if token.strip()]
                    ip = next((token for token in host_tokens if _valid_ipv4(token)), "")
                    if _valid_ipv4(ip):
                        return ip
                except Exception:
                    pass

                return "unknown"

            ip = await asyncio.wait_for(asyncio.to_thread(_resolve_ip), timeout=4.0)
            return ip
        except Exception:
            return "unknown"

    async def test_ollama_connection(self, pc_ip: str = "", timeout_seconds: int = 10):
        """Ping Ollama's /api/version and /api/tags to verify reachability."""
        started_at = time.time()
        safe_timeout_seconds = max(1, min(120, int(timeout_seconds or 5)))
        raw = (pc_ip or "").strip()

        async def _finish(out: dict[str, Any]) -> dict[str, Any]:
            reachable = bool(out.get("reachable"))
            fields: dict[str, Any] = {
                "reachable": reachable,
                "recovery_attempted": bool(out.get("recovery_attempted")),
            }
            if reachable:
                fields["version"] = str(out.get("version", "unknown"))
                fields["model_count"] = len(out.get("models") or [])
            else:
                fields["error"] = str(out.get("error") or "")[:160]
            await self._maybe_app_log("connection.test", "ollama connection test", fields=fields)
            await self._maybe_app_log(
                "connection.test",
                "RPC test_ollama_connection",
                level="verbose",
                fields={"host": raw, "timeout_seconds": safe_timeout_seconds},
            )
            return out

        if not raw:
            return await _finish({"reachable": False, "error": "No PC IP provided."})
        host, _port, base = normalize_ollama_base(raw)

        def _test_connection_sync() -> dict:
            deadline = started_at + safe_timeout_seconds
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

            # /api/ps: currently loaded models + size_vram vs size (approximate GPU-visible weight share).
            ps_snapshots: list[dict[str, Any]] = []
            ps_timeout = max(0.25, deadline - time.time())
            try:
                ps_req = urllib.request.Request(f"{base}/api/ps", method="GET")
                ps_resp = urllib.request.urlopen(ps_req, timeout=ps_timeout)
                ps_data = json.loads(ps_resp.read().decode("utf-8"))
                for m in ps_data.get("models", []) or []:
                    name_m = str(m.get("name") or m.get("model") or "?")
                    sz_b = int(m.get("size") or 0)
                    vram_b = int(m.get("size_vram") or 0)
                    ratio = None
                    if sz_b > 0 and vram_b >= 0:
                        ratio = round(100.0 * min(vram_b, sz_b) / sz_b, 1)
                    ps_snapshots.append(
                        {
                            "name": name_m,
                            "size_bytes": sz_b,
                            "size_vram_bytes": vram_b,
                            "vram_weight_share_pct_appx": ratio,
                        }
                    )
            except Exception:
                ps_snapshots = []

            return {"version": version_local, "models": models_local, "ps_loaded": ps_snapshots}

        recovery_attempted = False
        recovery_succeeded_before_retry: bool | None = None

        tested: Optional[dict[str, Any]] = None
        try:
            tested = await asyncio.wait_for(
                asyncio.to_thread(_test_connection_sync),
                timeout=float(safe_timeout_seconds) + 1.0,
            )
        except Exception:
            if not is_loopback_ollama_host(host):
                logger.exception("test_ollama_connection failed (non-loopback)")
                return await _finish(
                    {
                        "reachable": False,
                        "error": "Could not reach Ollama. Check PC IP, firewall, and that Ollama is running on the host.",
                    }
                )

            recovery_attempted = True

            def _recover_log(line: str) -> None:
                try:
                    logger.info(line)
                except Exception:
                    pass

            try:
                recovered = await asyncio.wait_for(
                    asyncio.to_thread(lambda: recover_loopback_ollama_listening(_recover_log)),
                    timeout=float(safe_timeout_seconds) + 35.0,
                )
            except Exception:
                logger.exception("recover_loopback_ollama_listening raised")
                recovered = False

            recovery_succeeded_before_retry = bool(recovered)

            if not recovered:
                return await _finish(
                    {
                        "reachable": False,
                        "recovery_attempted": recovery_attempted,
                        "recovery_succeeded_before_retry": False,
                        "error": (
                            "Could not start or reach Ollama on this device. Try Starter setup in Connection, "
                            "or run ``ollama serve`` from Desktop Konsole."
                        ),
                    }
                )

            try:
                tested = await asyncio.wait_for(
                    asyncio.to_thread(_test_connection_sync),
                    timeout=float(safe_timeout_seconds) + 1.0,
                )
            except Exception:
                logger.exception("test_ollama_connection failed after loopback recovery")
                return await _finish(
                    {
                        "reachable": False,
                        "recovery_attempted": recovery_attempted,
                        "recovery_succeeded_before_retry": True,
                        "error": (
                            "Ollama was started but the health check still failed. Retry the test or check "
                            "~/.ollama and disk space."
                        ),
                    }
                )

        version = str(tested.get("version", "unknown"))
        models = list(tested.get("models", []))
        ps_loaded = list(tested.get("ps_loaded", []))

        base_out: dict[str, Any] = {
            "reachable": True,
            "version": version,
            "models": models,
            "ps_loaded": ps_loaded,
        }
        if recovery_attempted:
            base_out["recovery_attempted"] = True
            base_out["recovery_succeeded_before_retry"] = recovery_succeeded_before_retry
        return await _finish(base_out)

    async def discover_mdns_ollama_hosts(self, timeout_seconds: int = 8):
        """User-triggered mDNS browse for ``_ollama._tcp.local`` only (no subnet scan)."""
        plugin = Plugin._coerce_instance(self)
        safe_timeout = max(2, min(15, int(timeout_seconds or 8)))

        try:
            settings = await plugin.load_settings()
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
            await plugin._maybe_app_log(
                "connection.discover",
                "mDNS Ollama discovery",
                fields={"found": host_count, "ok": bool(out.get("ok"))},
            )
            return out
        except asyncio.TimeoutError:
            await plugin._maybe_app_log(
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

    async def start_local_ollama_setup(self, data: Any = None):
        """Install/start Ollama on this Linux host and pull Tier-1 FOSS tags (runs in background)."""
        plugin = Plugin._coerce_instance(self)
        prof = ""
        if isinstance(data, dict):
            prof = str(data.get("profile", data.get("Profile", "")) or "").strip()
        elif isinstance(data, str):
            prof = data.strip()
        settings = await plugin.load_settings()
        if not settings.get("ollama_local_on_deck"):
            out = {
                "accepted": False,
                "reason": "Enable «Ollama on this Deck» in Settings → Connection first.",
            }
            await plugin._maybe_app_log(
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
            await plugin._maybe_app_log(
                "local_setup.start",
                "setup rejected",
                fields={"profile": prof, "accepted": False, "reason": "invalid_profile"},
            )
            return out

        async with plugin._local_ollama_setup_lock:
            existing = plugin._local_ollama_setup_task
            if existing is not None and not existing.done():
                out = {"accepted": False, "reason": "Setup already running."}
                await plugin._maybe_app_log(
                    "local_setup.start",
                    "setup rejected",
                    fields={"profile": prof, "accepted": False, "reason": "busy"},
                )
                return out

            plugin._local_ollama_cancel_event = asyncio.Event()
            plugin._local_ollama_cancel_event.clear()
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
            plugin._local_ollama_setup_state = new_st

            setup_loop = asyncio.get_running_loop()
            last_logged_stage = {"value": ""}

            async def on_stage(stage: str, fields: dict[str, Any]) -> None:
                st = (stage or "").strip()
                if not st or st == last_logged_stage["value"]:
                    return
                last_logged_stage["value"] = st
                await plugin._maybe_app_log(
                    "local_setup.stage",
                    f"stage={st}",
                    fields=fields,
                )

            def on_verbose_line(line: str) -> None:
                msg = (line or "").strip()
                if not msg:
                    return

                def _schedule() -> None:
                    asyncio.create_task(
                        plugin._maybe_app_log("local_setup.line", msg[:500], level="verbose")
                    )

                setup_loop.call_soon_threadsafe(_schedule)

            async def runner() -> None:
                assert plugin._local_ollama_cancel_event is not None
                await run_local_setup(
                    profile=prof,
                    state=plugin._local_ollama_setup_state,
                    logger=logger,
                    cancel_event=plugin._local_ollama_cancel_event,
                    on_stage=on_stage,
                    on_verbose_line=on_verbose_line,
                )

            plugin._local_ollama_setup_task = asyncio.create_task(runner())

        await plugin._maybe_app_log(
            "local_setup.start",
            "setup accepted",
            fields={"profile": prof, "accepted": True},
        )
        return {"accepted": True}

    async def get_local_ollama_setup_status(self):
        """Return last status for the local Ollama installer (plain JSON dict)."""
        plugin = Plugin._coerce_instance(self)
        return dict(plugin._local_ollama_setup_state)

    async def cancel_local_ollama_setup(self):
        """Request cancellation of an in-progress setup (best-effort)."""
        plugin = Plugin._coerce_instance(self)
        ce = getattr(plugin, "_local_ollama_cancel_event", None)
        if isinstance(ce, asyncio.Event):
            ce.set()
        return {"cancel_requested": True}

    async def _require_local_ollama_on_deck(self) -> tuple[bool, dict[str, Any] | None]:
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not settings.get("ollama_local_on_deck"):
            return False, {
                "accepted": False,
                "ok": False,
                "reason": "Enable «Ollama on this Deck» in Settings → Connection first.",
                "error": "local_off",
            }
        return True, None

    async def _start_custom_ollama_pull(self, pull_tags: list[str]) -> dict[str, Any]:
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_local_ollama_on_deck()
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
            await plugin._maybe_app_log(
                "local_setup.start",
                "skipped invalid registry tags",
                fields={"invalid_tags": registry_bad[:12]},
            )
        tags = registry_ok

        async with plugin._local_ollama_setup_lock:
            existing = plugin._local_ollama_setup_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Setup already running.", "error": "busy"}

            plugin._local_ollama_cancel_event = asyncio.Event()
            plugin._local_ollama_cancel_event.clear()
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
            plugin._local_ollama_setup_state = new_st

            setup_loop = asyncio.get_running_loop()
            last_logged_stage = {"value": ""}

            async def on_stage(stage: str, fields: dict[str, Any]) -> None:
                st = (stage or "").strip()
                if not st or st == last_logged_stage["value"]:
                    return
                last_logged_stage["value"] = st
                await plugin._maybe_app_log(
                    "local_setup.stage",
                    f"stage={st}",
                    fields=fields,
                )

            def on_verbose_line(line: str) -> None:
                msg = (line or "").strip()
                if not msg:
                    return

                def _schedule() -> None:
                    asyncio.create_task(
                        plugin._maybe_app_log("local_setup.line", msg[:500], level="verbose")
                    )

                setup_loop.call_soon_threadsafe(_schedule)

            async def runner() -> None:
                assert plugin._local_ollama_cancel_event is not None
                await run_local_setup(
                    profile="custom",
                    state=plugin._local_ollama_setup_state,
                    logger=logger,
                    cancel_event=plugin._local_ollama_cancel_event,
                    on_stage=on_stage,
                    on_verbose_line=on_verbose_line,
                )

            plugin._local_ollama_setup_task = asyncio.create_task(runner())

        await plugin._maybe_app_log(
            "local_setup.start",
            "custom pull accepted",
            fields={"profile": "custom", "accepted": True, "tag_count": len(tags)},
        )
        return {"accepted": True, "pull_tags": tags}

    async def pull_ollama_models(self, tags: Any = None):
        """Pull one or more Ollama tags on this Deck (background, reuses setup service)."""
        plugin = Plugin._coerce_instance(self)
        raw = tags if isinstance(tags, list) else []
        return await plugin._start_custom_ollama_pull(raw)

    async def delete_ollama_model(self, tag: str = ""):
        """Remove one installed Ollama model via ``ollama rm`` (argv form)."""
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_local_ollama_on_deck()
        if not ok_gate:
            return gate_out or {"ok": False, "error": "local_off"}

        t = (tag or "").strip()
        if not is_valid_ollama_pull_tag(t):
            return {"ok": False, "error": "invalid_tag"}

        st = dict(getattr(plugin, "_local_ollama_setup_state", {}) or {})
        if st.get("phase") == "running" and not st.get("done", True):
            return {"ok": False, "error": "busy"}

        active = getattr(plugin, "_active_ollama_chat_model", None)
        if isinstance(active, str) and active.strip() and active.strip() == t:
            return {"ok": False, "error": "in_use", "removed": ""}

        ok_rm, err = await run_ollama_rm_async(t)
        if not ok_rm:
            safe_err = (err or "delete_failed")[:160]
            await plugin._maybe_app_log(
                "local_setup.delete",
                "ollama rm failed",
                fields={"ok": False, "error": safe_err},
            )
            return {"ok": False, "error": safe_err, "removed": ""}

        await plugin._maybe_app_log(
            "local_setup.delete",
            "ollama rm succeeded",
            fields={"ok": True},
        )
        return {"ok": True, "removed": t, "error": ""}

    async def fetch_ollama_catalog_metadata(self, tags: Any = None):
        """Live sizes from registry.ollama.ai with offline fallback metadata."""
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_local_ollama_on_deck()
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
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_local_ollama_on_deck()
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

    async def list_recent_screenshots(self, app_id: str = "", limit: int = 5):
        """List recent screenshots with preview and app metadata for attachment browsing."""
        try:
            settings = await Plugin._coerce_instance(self).load_settings()
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
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
            await plugin._maybe_app_log(
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
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
            await plugin._maybe_app_log(
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
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
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
        plugin = Plugin._coerce_instance(self)
        plugin._last_input_transparency = snapshot
        settings = await plugin.load_settings()
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
        return {
            "route": route,
            "raw_question": parsed_question,
            "sanitizer_action": sanitizer_action,
            "sanitizer_reason_codes": list(sanitizer_reason_codes),
            "text_after_sanitizer": parsed_question,
            "ollama_model": None,
            "system_prompt": None,
            "user_text_for_model": None,
            "user_image_count": 0,
            "attachment_paths": [],
            "assistant_raw": None,
            "assistant_after_attachment_format": None,
            "final_response": resp,
            "applied": None,
            "success": True,
            "app_id": app_id,
            "app_name": app_name,
            "pc_ip": pc_ip,
            "error_message": "",
            "elapsed_seconds": 0.0,
            "model_policy_disclosure": None,
        }

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
        shortcut_setup_for_state: Any = _OMIT_SHORTCUT_SETUP_FIELD,
        shortcut_setup_for_response: Any = _OMIT_SHORTCUT_SETUP_FIELD,
    ) -> dict:
        """Persist transparency, publish ``completed`` background state, and return the RPC body.

        Local keyword branches (sanitizer / shortcut / VAC) never spawn ``_run_background_request``; they must
        still mint a monotonic ``request_id`` so UI polling and Desktop autosave dedupe stay consistent.
        """
        plugin = Plugin._coerce_instance(self)
        plugin._background_request_seq += 1
        request_id = plugin._background_request_seq
        now = time.time()
        await plugin._persist_input_transparency(
            Plugin._immediate_command_transparency_snapshot(
                route=transparency_route,
                parsed_question=parsed_question,
                resp=resp,
                sanitizer_action=sanitizer_action,
                sanitizer_reason_codes=sanitizer_reason_codes,
                app_id=app_id,
                app_name=app_name,
                pc_ip=pc_ip,
            )
        )
        state: dict[str, Any] = {
            "status": "completed",
            "request_id": request_id,
            "question": state_question,
            "app_id": app_id,
            "app_context": app_context,
            "success": True,
            "response": resp,
            "applied": None,
            "elapsed_seconds": 0.0,
            "error": None,
            "started_at": now,
            "completed_at": now,
            "strategy_guide_branches": None,
            "model_policy_disclosure": None,
            "preset_carousel_inject": None,
        }
        if shortcut_setup_for_state is not _OMIT_SHORTCUT_SETUP_FIELD:
            state["shortcut_setup"] = shortcut_setup_for_state
        plugin._background_state = state
        plugin._background_task = None
        out: dict[str, Any] = {
            "accepted": True,
            "status": "completed",
            "request_id": request_id,
            "app_id": app_id,
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

    async def get_input_transparency(self):
        """Return the last Ask transparency snapshot (full prompts; fetch after terminal completion)."""
        from backend.services.tdp_service import read_sandbox_sysfs_writes, sandbox_sysfs_root

        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        snap = plugin._last_input_transparency
        if not isinstance(snap, dict) or not snap:
            return {"available": False}
        out: dict = {"available": True, "snapshot": dict(snap)}
        if sandbox_sysfs_root():
            out["sysfs_writes"] = read_sandbox_sysfs_writes()
        return out

    async def save_ask_feedback(self, rating: str, request_id: int = 0, question_len: int = 0, success: bool = False):
        """Persist thumbs up/down locally (JSONL under plugin settings); no network."""
        from backend.services.feedback_service import append_ask_feedback

        plugin = Plugin._coerce_instance(self)
        rid = int(request_id) if request_id else None
        return append_ask_feedback(
            decky.DECKY_PLUGIN_SETTINGS_DIR,
            request_id=rid,
            rating=str(rating or ""),
            question_len=int(question_len or 0),
            success=success is True,
        )

    async def read_host_clipboard_text(self):
        """Read clipboard via host script when the WebView cannot use ``navigator.clipboard``."""
        from backend.services.clipboard_service import read_host_clipboard_text

        return read_host_clipboard_text(logger)

    async def capture_screenshot(self, include_overlay: bool = True):
        """Capture a screenshot using available gamescope commands and return attachment metadata."""
        if isinstance(include_overlay, dict):
            include_overlay = include_overlay.get("include_overlay", True) is not False
        elif not isinstance(include_overlay, bool):
            include_overlay = bool(include_overlay)
        try:
            plugin = Plugin._coerce_instance(self)
            settings = await plugin.load_settings()
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
            runtime_dir = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "captures")
            os.makedirs(runtime_dir, exist_ok=True)
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            output_path = os.path.join(runtime_dir, f"bonsai-capture-{timestamp}.png")
            clean_env = Plugin._clean_env()
            result = try_gamescope_screenshot_capture(output_path, include_overlay, clean_env)
            if result.get("success") and isinstance(result.get("item"), dict):
                item = dict(result["item"])
                try:
                    item["size_bytes"] = os.path.getsize(output_path)
                except OSError:
                    item["size_bytes"] = 0
                preview = build_screenshot_preview_data_uri(output_path)
                if preview:
                    item["preview_data_uri"] = preview
                result["item"] = item
            return result
        except Exception:
            logger.exception("capture_screenshot failed")
            raise

    async def take_steam_screenshot(self, app_id: str = ""):
        """Close-QAM flow: capture game into Steam screenshots (not auto-attached to Ask)."""
        try:
            plugin = Plugin._coerce_instance(self)
            settings = await plugin.load_settings()
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
            runtime_dir = str(getattr(decky, "DECKY_PLUGIN_RUNTIME_DIR", "") or "")
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: take_steam_game_screenshot(str(app_id or ""), clean_env, runtime_dir),
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
    ) -> dict:
        """Run one full ask lifecycle, including Ollama call timing and optional TDP application."""
        plugin = Plugin._coerce_instance(self)
        return await run_game_ai_request(
            plugin,
            question,
            pc_ip,
            app_id,
            app_name,
            attachments=attachments,
            ask_mode=ask_mode,
            spoiler_consent=spoiler_consent,
            token_stream_request_id=token_stream_request_id,
        )

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        """Handle foreground ask RPCs and validate required inputs before execution."""
        logger.info("ask_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        parsed_question, pc_ip, app_id, app_name, attachments, ask_mode, spoiler_consent = (
            Plugin._parse_ask_payload(question, PcIp)
        )
        if not parsed_question:
            logger.info("ask_game_ai: rejected (empty question)")
            return Plugin._reject_ask_request("Question is required.", app_id=app_id)
        if classify_sanitizer_command(parsed_question) is not None:
            handled = await self._try_handle_sanitizer_keyword_command(parsed_question, app_id)
            if handled is not None:
                return handled
        if classify_shortcut_setup_command(parsed_question) is not None:
            sc = await self._try_handle_shortcut_setup_command(parsed_question, app_id)
            if sc is not None:
                return sc
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
    ) -> None:
        """Execute a queued background request and publish terminal status for polling clients."""
        result = await self._execute_game_ai_request(
            question,
            pc_ip,
            app_id,
            app_name,
            attachments=attachments or [],
            ask_mode=ask_mode,
            spoiler_consent=spoiler_consent,
            token_stream_request_id=request_id,
        )
        self._ensure_background_state()
        plugin_bg = Plugin._coerce_instance(self)
        bg_abort = getattr(plugin_bg, "_abort_current_ollama_chat", None)
        if isinstance(bg_abort, threading.Event):
            bg_abort.clear()
        async with self._background_lock:
            active_request_id = self._background_state.get("request_id")
            if active_request_id != request_id:
                return
            cancelled_rq = bool(result.get("cancelled"))
            success = bool(result.get("success", False)) and not cancelled_rq
            response_text = str(result.get("response", "") or "No response text.")
            if cancelled_rq:
                terminal = "cancelled"
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
                "strategy_guide_branches": result.get("strategy_guide_branches"),
                "model_policy_disclosure": result.get("model_policy_disclosure"),
                "strategy_spoiler_consent_effective": result.get("strategy_spoiler_consent_effective"),
                "shortcut_setup": result.get("shortcut_setup"),
                "cancelled": cancelled_rq,
                "preset_carousel_inject": result.get("preset_carousel_inject"),
                "partial_response": None,
                "streaming": False,
            }
            self._clear_partial_stream_snapshot()
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
        """Start a background ask request unless one is already active or payload is invalid."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()

        logger.info("start_background_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        parsed_question, pc_ip, app_id, app_name, attachments, ask_mode, spoiler_consent = (
            Plugin._parse_ask_payload(question, PcIp)
        )
        app_context = "active" if app_id else "none"
        if not parsed_question:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("Question is required.", app_id=app_id),
            }
        is_sanitizer_command = classify_sanitizer_command(parsed_question) is not None
        is_shortcut_command = classify_shortcut_setup_command(parsed_question) is not None
        is_vac_command = parse_vac_check_command(parsed_question) is not None
        is_local_ask_command = is_sanitizer_command or is_shortcut_command or is_vac_command
        if not pc_ip and not is_local_ask_command:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id),
            }

        if not is_local_ask_command:
            pre_settings = await plugin.load_settings()
            if not bool(pre_settings.get("input_sanitizer_user_disabled")):
                pre_lane = apply_input_sanitizer_lane(parsed_question, False)
                if pre_lane.action == "block":
                    um = str(pre_lane.user_message or "")
                    await plugin._persist_input_transparency(
                        {
                            "route": "sanitizer_block",
                            "raw_question": parsed_question,
                            "sanitizer_action": str(pre_lane.action),
                            "sanitizer_reason_codes": list(pre_lane.reason_codes),
                            "text_after_sanitizer": str(pre_lane.text or ""),
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
                            "elapsed_seconds": 0.0,
                            "model_policy_disclosure": None,
                        }
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

        async with plugin._background_lock:
            if plugin._background_task and not plugin._background_task.done():
                state = dict(plugin._background_state)
                return {
                    "accepted": False,
                    "status": "busy",
                    "request_id": state.get("request_id"),
                    "app_id": state.get("app_id", ""),
                    "app_context": state.get("app_context", "none"),
                    "response": "A request is already in progress.",
                }

            if is_sanitizer_command:
                handled = await plugin._try_handle_sanitizer_keyword_command(parsed_question, app_id)
                if handled is not None:
                    resp = str(handled.get("response", ""))
                    return await plugin._finalize_immediate_background_local_command(
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
                    )

            if is_shortcut_command:
                handled = await plugin._try_handle_shortcut_setup_command(parsed_question, app_id)
                if handled is not None:
                    resp = str(handled.get("response", ""))
                    variant = handled.get("shortcut_setup")
                    return await plugin._finalize_immediate_background_local_command(
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
                        shortcut_setup_for_state=variant,
                        shortcut_setup_for_response=variant,
                    )

            if is_vac_command:
                handled_v = await plugin._try_handle_vac_check_command(parsed_question, app_id)
                if handled_v is not None:
                    resp = str(handled_v.get("response", ""))
                    return await plugin._finalize_immediate_background_local_command(
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
                        shortcut_setup_for_state=None,
                    )

            plugin._background_request_seq += 1
            request_id = plugin._background_request_seq
            plugin._reset_partial_stream_snapshot(request_id)
            plugin._background_state = {
                "status": "pending",
                "request_id": request_id,
                "question": parsed_question,
                "app_id": app_id,
                "app_context": app_context,
                "success": None,
                "response": "Thinking...",
                "applied": None,
                "elapsed_seconds": 0,
                "error": None,
                "started_at": time.time(),
                "completed_at": None,
                "strategy_guide_branches": None,
                "model_policy_disclosure": None,
                "preset_carousel_inject": None,
                "partial_response": None,
                "streaming": False,
                "thinking_summary": None,
            }
            plugin._background_task = asyncio.create_task(
                plugin._run_background_request(
                    request_id,
                    parsed_question,
                    pc_ip,
                    app_id,
                    app_name,
                    attachments=attachments,
                    ask_mode=ask_mode,
                    spoiler_consent=spoiler_consent,
                )
            )
            await plugin._maybe_app_log(
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
            await plugin._maybe_app_log(
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
        """Return current background request status and reconcile completed task failures."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        async with plugin._background_lock:
            if plugin._background_task and plugin._background_task.done():
                try:
                    plugin._background_task.result()
                except Exception as exc:
                    logger.exception("get_background_game_ai_status: background task failed: %s", exc)
                    plugin._background_state = {
                        **plugin._background_state,
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
            return plugin._merge_partial_into_background_status(dict(plugin._background_state))

    async def abort_background_game_ai(self):
        """Frontend Stop: unblock in-flight urllib read(s); Ollama may stop once the TCP session closes."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        evt = getattr(plugin, "_abort_current_ollama_chat", None)
        if isinstance(evt, threading.Event):
            evt.set()
            logger.info(
                "abort_background_game_ai: stop requested — closing HTTP read; scheduling Ollama stop/unload"
            )

        wre = getattr(plugin, "_active_ollama_chat_http_response", None)
        if wre is None:
            ev = getattr(plugin, "_chat_resp_ready_evt", None)
            if isinstance(ev, threading.Event):
                ev.wait(timeout=1.5)
                wre = getattr(plugin, "_active_ollama_chat_http_response", None)
        if wre is not None:
            try:
                wre.close()
                logger.info(
                    "abort_background_game_ai: closed active urllib HTTP response (cross-thread unblock read)"
                )
            except Exception as exc:
                logger.warning("abort_background_game_ai: close active HTTP response failed: %s", exc)

        ipc = str(getattr(plugin, "_active_ollama_chat_pc_ip", None) or "").strip()
        imodel = getattr(plugin, "_active_ollama_chat_model", None)

        def _stop_bg() -> None:
            try:
                best_effort_abort_ollama_inference(
                    pc_ip_field=ipc,
                    model_name=imodel if isinstance(imodel, str) else None,
                    logger=logger,
                )
            except Exception:
                logger.exception("abort_background_game_ai: kill/unload helper failed")

        threading.Thread(target=_stop_bg, name="bonsai-ollama-stop", daemon=True).start()
        with plugin._partial_response_lock:
            snap = plugin._partial_stream_snapshot
            if snap.get("request_id") == plugin._background_state.get("request_id"):
                snap["streaming"] = False
        await plugin._maybe_app_log("ask.abort", "background ask abort requested")
        return {"ok": True}

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
        strategy_spoiler_consent: bool = False,
        character_roleplay_on: bool = False,
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
            strategy_spoiler_consent=strategy_spoiler_consent,
            character_roleplay_on=character_roleplay_on,
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
        strategy_spoiler_consent: bool = False,
        token_stream_request_id: Optional[int] = None,
    ):
        """Orchestrate attachment prep, prompt assembly, and model fallback request execution."""
        plugin_inst = Plugin._coerce_instance(self)
        plugin_inst._ensure_background_state()
        active_request_id = plugin_inst._active_request_id()

        url = self._build_ollama_chat_url(PcIp)
        settings = await self.load_settings()
        normalized_attachments = Plugin._sanitize_attachments(attachments or [])
        attachment_paths = [
            str(a.get("path", "") or "").strip()
            for a in normalized_attachments
            if isinstance(a, dict) and str(a.get("path", "") or "").strip()
        ]
        if normalized_attachments and isinstance(active_request_id, int):
            rp_meta_prep = build_roleplay_system_suffix_meta(settings, ask_mode)
            plugin_inst._publish_thinking_phase_key(
                active_request_id,
                "screenshot_prep",
                app_name=app_name,
                attachment_count=len(normalized_attachments),
                ask_mode=ask_mode,
                question=question,
                character_enabled=bool(settings.get("ai_character_enabled")),
                character_preset_id=rp_meta_prep.resolved_preset_id,
            )
        keep_alive = sanitize_ollama_keep_alive(settings.get("ollama_keep_alive"))
        apreset = str(settings.get("screenshot_attachment_preset") or "low")
        if apreset not in ("low", "mid", "max"):
            apreset = "low"
        prepared_images, attachment_warnings, attachment_errors = prepare_attachment_images(
            normalized_attachments,
            apreset,
        )
        system_content = self._build_system_prompt(
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
            strategy_spoiler_consent=strategy_spoiler_consent,
            character_roleplay_on=bool(settings.get("ai_character_enabled")),
        )
        rp_meta = build_roleplay_system_suffix_meta(settings, ask_mode)
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
            # Append after the bonsAI preamble so recency favors character voice over neutral identity lines.
            system_content = apply_roleplay_to_system_content(system_content, roleplay)
        user_message: dict = {"role": "user", "content": question}
        if prepared_images:
            user_message["images"] = [image["image_b64"] for image in prepared_images]
        messages = [{"role": "system", "content": system_content}, user_message]

        if os.environ.get("BONSAI_LLAMACPP_ASK") == "1":
            from backend.services.llama_cpp_provider import llama_cpp_base_from_env, post_llama_cpp_chat_poc

            llama_base = llama_cpp_base_from_env()
            if llama_base:
                loop = asyncio.get_running_loop()
                llama_model = (os.environ.get("BONSAI_LLAMACPP_MODEL") or "default").strip()
                result = await loop.run_in_executor(
                    None,
                    functools.partial(
                        post_llama_cpp_chat_poc,
                        llama_base,
                        llama_model,
                        messages,
                        request_timeout_seconds,
                        logger,
                    ),
                )
                return {
                    **result,
                    "system_prompt": system_content,
                    "user_text_for_model": question,
                    "user_image_count": len(prepared_images),
                    "attachment_paths": attachment_paths,
                    "ask_diagnostics": {"provider": "llama_cpp_poc", "model": llama_model},
                }

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
            "strategy_spoiler_consent_effective": bool(strategy_spoiler_consent) if ask_mode == "strategy" else False,
            "resolved_character_preset_id": rp_meta.resolved_preset_id,
            "pyro_asshole_mode": pyro_asshole,
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
        high_vram = settings.get("model_allow_high_vram_fallbacks") is True
        models_before_policy = select_ollama_models(requires_vision, ask_mode, high_vram)
        policy_tier = str(settings.get("model_policy_tier") or "open_source_only")
        non_foss_unlocked = settings.get("model_policy_non_foss_unlocked") is True
        models_to_try = filter_model_list(models_before_policy, policy_tier, non_foss_unlocked)
        ask_started = time.time()
        ollama_host, _, ollama_base = normalize_ollama_base(PcIp)
        if is_loopback_ollama_host(ollama_host) and not probe_ollama_http_ok(ollama_base):
            recover_loopback_ollama_listening(logger.info)
        installed_tags = list_installed_ollama_tags(ollama_base)
        models_after_policy = list(models_to_try)
        models_to_try, routing_strategy = build_effective_models_to_try(models_to_try, installed_tags)
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

        # Only background `_run_background_request` passes token_stream_request_id. Foreground
        # `ask_game_ai` must not attach `on_delta` while `_background_state` still shows a pending
        # id — another RPC can await inside `ask_ollama` and corrupt the same partial snapshot.
        token_streaming = settings.get("bonsai_token_streaming_enabled") is True
        on_delta_cb = None
        if isinstance(token_stream_request_id, int):
            stream_rid = token_stream_request_id

            def _on_delta(text: str, done: bool, thinking_summary: Optional[str] = None) -> None:
                plugin_inst._update_partial_response(
                    stream_rid,
                    text,
                    done,
                    thinking_summary,
                    update_partial=token_streaming,
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
            """Remove raw HTTP bodies from payloads returned to the UI / transparency (security)."""
            out = dict(payload)
            out.pop("body", None)
            return out

        try:
            loop = asyncio.get_running_loop()
            last_failure = {"success": False, "response": "No model attempts executed.", **ollama_extras}

            for model_idx, model_name in enumerate(models_to_try):
                if isinstance(active_request_id, int) and model_idx > 0:
                    plugin_inst._publish_thinking_phase_key(
                        active_request_id,
                        "model_retry",
                        app_name=app_name,
                        ask_mode=ask_mode,
                        question=question,
                        character_enabled=bool(settings.get("ai_character_enabled")),
                        character_preset_id=rp_meta.resolved_preset_id,
                    )
                ask_diagnostics["models_attempted"].append(model_name)
                plugin_inst._chat_resp_ready_evt = threading.Event()
                plugin_inst._active_ollama_chat_pc_ip = str(PcIp or "").strip()
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
                # Missing local Ollama tags: try the next fallback instead of failing the whole Ask.
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
                # Vision + large multimodal models often return HTTP 500 on OOM or internal runner errors; try next tag.
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

    async def _stop_voice_transcription_internal(self) -> None:
        plugin = Plugin._coerce_instance(self)
        async with plugin._voice_lock:
            session = plugin._voice_session
            plugin._voice_session = None
        if session is not None:
            await asyncio.to_thread(session.force_stop)

    async def _require_microphone_access(self) -> tuple[bool, dict[str, Any]]:
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "microphone_access"):
            return False, {
                "accepted": False,
                "error": "permission_denied",
                "reason": "Enable Voice input (microphone) in the Permissions tab first.",
            }
        return True, {}

    async def get_voice_engine_status(self):
        """Return whisper binary + model readiness for the configured STT model."""
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        model_id = sanitize_voice_stt_model(settings.get("voice_stt_model"))
        ready = engine_readiness(PLUGIN_ROOT, decky.DECKY_PLUGIN_SETTINGS_DIR, model_id)
        install = dict(plugin._voice_install_state)
        return {**ready, "install": install}

    async def install_voice_engine(self, model_id: str = ""):
        """Install whisper-cli (podman) and download the selected GGUF model (requires microphone_access)."""
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_microphone_access()
        if not ok_gate:
            return gate_out or {"accepted": False, "reason": "permission_denied"}

        settings = await plugin.load_settings()
        mid = sanitize_voice_stt_model(model_id or settings.get("voice_stt_model"))
        async with plugin._voice_install_lock:
            existing = plugin._voice_install_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Voice engine install already running.", "error": "busy"}

            plugin._voice_install_cancel = threading.Event()
            plugin._voice_install_cancel.clear()
            plugin._voice_install_state = new_voice_install_state()
            plugin._voice_install_state.update(
                {"phase": "running", "done": False, "accepted": True, "model_id": mid}
            )

            def on_stage(stage: str, fields: dict[str, Any]) -> None:
                st = plugin._voice_install_state
                st["stage"] = stage
                if fields.get("progress_pct") is not None:
                    st["progress_pct"] = fields["progress_pct"]

            async def runner() -> None:
                try:
                    await asyncio.to_thread(
                        install_whisper_cli,
                        PLUGIN_ROOT,
                        decky.DECKY_PLUGIN_SETTINGS_DIR,
                        plugin._voice_install_state,
                        plugin._voice_install_cancel,
                        on_stage,
                    )
                    await asyncio.to_thread(
                        download_voice_model,
                        PLUGIN_ROOT,
                        decky.DECKY_PLUGIN_SETTINGS_DIR,
                        mid,
                        plugin._voice_install_state,
                        plugin._voice_install_cancel,
                        on_stage,
                    )
                except Exception as exc:
                    plugin._voice_install_state.update(
                        {"phase": "failed", "done": True, "error": str(exc)[:500]}
                    )

            plugin._voice_install_task = asyncio.create_task(runner())

        await plugin._maybe_app_log("voice.install", "voice engine install accepted", fields={"model_id": mid})
        return {"accepted": True, "model_id": mid}

    async def get_voice_install_status(self):
        """Poll voice model download progress."""
        plugin = Plugin._coerce_instance(self)
        return dict(plugin._voice_install_state)

    async def start_voice_transcription(self):
        """Start PipeWire/Pulse capture and local whisper interim transcription."""
        plugin = Plugin._coerce_instance(self)
        ok_gate, gate_out = await plugin._require_microphone_access()
        if not ok_gate:
            return gate_out or {"accepted": False, "reason": "permission_denied"}

        settings = await plugin.load_settings()
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

        async with plugin._voice_lock:
            if plugin._voice_session is not None:
                st = plugin._voice_session.status()
                if st.get("recording"):
                    return {"accepted": True, "status": st}
                plugin._voice_session = None

            session = VoiceTranscriptionSession(
                PLUGIN_ROOT,
                decky.DECKY_PLUGIN_SETTINGS_DIR,
                model_id,
                logger,
            )
            out = await asyncio.to_thread(session.start)
            if out.get("accepted"):
                plugin._voice_session = session
            else:
                plugin._voice_session = None

        if out.get("accepted"):
            await plugin._persist_input_transparency(
                {
                    "route": "voice.transcribe",
                    "raw_question": None,
                    "sanitizer_action": None,
                    "sanitizer_reason_codes": [],
                    "text_after_sanitizer": None,
                    "ollama_model": None,
                    "system_prompt": None,
                    "user_text_for_model": None,
                    "user_image_count": 0,
                    "attachment_paths": [],
                    "assistant_raw": None,
                    "assistant_after_attachment_format": None,
                    "final_response": None,
                    "voice_local_only": True,
                    "voice_model_id": model_id,
                    "voice_audio_persisted": False,
                }
            )
            await plugin._maybe_app_log(
                "voice.start",
                "voice transcription started",
                fields={"model_id": model_id},
            )
        return out

    async def stop_voice_transcription(self):
        """Stop capture and return finalized transcript."""
        plugin = Plugin._coerce_instance(self)
        async with plugin._voice_lock:
            session = plugin._voice_session
            plugin._voice_session = None
        if session is None:
            return {
                "stopped": True,
                "status": "idle",
                "finalized_transcript": "",
                "partial_transcript": "",
            }
        out = await asyncio.to_thread(session.stop)
        await plugin._maybe_app_log(
            "voice.stop",
            "voice transcription stopped",
            fields={"transcript_len": len(str(out.get("finalized_transcript") or ""))},
        )
        return out

    async def get_voice_transcription_status(self):
        """Poll interim/final transcript while recording."""
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "microphone_access"):
            await plugin._stop_voice_transcription_internal()
            return {
                **new_voice_transcription_state(),
                "status": "permission_denied",
                "error": "Microphone permission revoked.",
                "recording": False,
                "streaming": False,
            }

        async with plugin._voice_lock:
            session = plugin._voice_session
        if session is None:
            return new_voice_transcription_state()
        st = await asyncio.to_thread(session.status)
        st["streaming"] = bool(st.get("recording")) and (
            bool(st.get("partial_transcript")) or bool(st.get("finalized_transcript"))
        )
        return st

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        """Build the Ollama chat endpoint URL from current connection input."""
        return build_ollama_chat_url(pc_ip)