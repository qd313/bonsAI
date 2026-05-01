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
    PYRO_MANAGER_TIP_LINES,
    PYRO_MANAGER_TIP_PROBABILITY,
    PYRO_PRESET_ID,
    build_roleplay_system_suffix_meta,
    pyro_manager_carousel_tip_addon,
)
from backend.services.ollama_service import (
    append_deck_tdp_sysfs_grounding,
    best_effort_abort_ollama_inference,
    build_system_prompt,
    post_ollama_chat,
)
from backend.services.plugin_data_reset import reset_plugin_disk_and_defaults
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
    try_gamescope_screenshot_capture,
)
from backend.services.game_ai_request import run_game_ai_request
from backend.services.local_ollama_setup_service import (
    is_loopback_ollama_host,
    new_local_ollama_setup_state,
    recover_loopback_ollama_listening,
    run_local_setup,
)
from backend.services.tdp_service import (
    STEAMOS_PRIV_WRITE,
    clean_env,
    find_amdgpu_hwmon,
    write_sysfs,
)
from refactor_helpers import (
    build_ollama_chat_url,
    is_valid_setup_pull_profile,
    normalize_ollama_base,
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
    DEFAULT_LATENCY_WARNING_SECONDS = 30
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 360
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
    VALID_ASK_MODES = {"speed", "strategy", "deep"}
    MIN_LATENCY_WARNING_SECONDS = 5
    MAX_LATENCY_WARNING_SECONDS = 300
    MIN_REQUEST_TIMEOUT_SECONDS = 10
    MAX_REQUEST_TIMEOUT_SECONDS = 600
    SETTINGS_FILENAME = "settings.json"

    def __init__(self):
        """Initialize plugin runtime state used for background-request coordination."""
        self._background_lock = asyncio.Lock()
        # Serialize ``start_background_game_ai`` so immediate-command paths can release ``_background_lock``
        # before awaiting transparency persistence (otherwise ``get_background_game_ai_status`` deadlocks).
        self._background_start_serial_lock = asyncio.Lock()
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

    async def _unload(self):
        """Run plugin shutdown logging for Decky unload events."""
        plugin = Plugin._coerce_instance(self)
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
        }

    def _ensure_background_state(self) -> None:
        """Backfill runtime attributes for compatibility with loaders that skip __init__."""
        if not hasattr(self, "_background_lock"):
            self._background_lock = asyncio.Lock()
        if not hasattr(self, "_background_start_serial_lock"):
            self._background_start_serial_lock = asyncio.Lock()
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
        return save_settings_to_disk(
            path=path,
            settings_dir=decky.DECKY_PLUGIN_SETTINGS_DIR,
            incoming=data,
            current=current,
            sanitize_func=Plugin._sanitize_settings,
            logger=logger,
        )

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
        return defaults

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
        if not raw:
            return {"reachable": False, "error": "No PC IP provided."}
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
                return {
                    "reachable": False,
                    "error": "Could not reach Ollama. Check PC IP, firewall, and that Ollama is running on the host.",
                }

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
                return {
                    "reachable": False,
                    "recovery_attempted": recovery_attempted,
                    "recovery_succeeded_before_retry": False,
                    "error": (
                        "Could not start or reach Ollama on this device. Try Starter setup in Connection, "
                        "or run ``ollama serve`` from Desktop Konsole."
                    ),
                }

            try:
                tested = await asyncio.wait_for(
                    asyncio.to_thread(_test_connection_sync),
                    timeout=float(safe_timeout_seconds) + 1.0,
                )
            except Exception:
                logger.exception("test_ollama_connection failed after loopback recovery")
                return {
                    "reachable": False,
                    "recovery_attempted": recovery_attempted,
                    "recovery_succeeded_before_retry": True,
                    "error": (
                        "Ollama was started but the health check still failed. Retry the test or check "
                        "~/.ollama and disk space."
                    ),
                }

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
        return base_out

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
            return {
                "accepted": False,
                "reason": "Enable «Ollama on this Deck» in Settings → Connection first.",
            }
        if not is_valid_setup_pull_profile(prof):
            return {
                "accepted": False,
                "reason": 'Invalid profile: use "starter" or "tier1_foss_full".',
            }

        async with plugin._local_ollama_setup_lock:
            existing = plugin._local_ollama_setup_task
            if existing is not None and not existing.done():
                return {"accepted": False, "reason": "Setup already running."}

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

            async def runner() -> None:
                assert plugin._local_ollama_cancel_event is not None
                await run_local_setup(
                    profile=prof,
                    state=plugin._local_ollama_setup_state,
                    logger=logger,
                    cancel_event=plugin._local_ollama_cancel_event,
                )

            plugin._local_ollama_setup_task = asyncio.create_task(runner())

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
            for path in resolve_recent_screenshot_paths(app_id, limit):
                try:
                    mtime = os.path.getmtime(path)
                except OSError:
                    mtime = 0
                items.append(
                    {
                        "path": path,
                        "name": os.path.basename(path),
                        "mtime": mtime,
                        "size_bytes": os.path.getsize(path) if os.path.isfile(path) else 0,
                        "source": "steam_recent",
                        "app_id": extract_app_id_from_screenshot_path(path),
                        "preview_data_uri": build_screenshot_preview_data_uri(path),
                    }
                )
            return {"success": True, "items": items}
        except Exception:
            logger.exception("list_recent_screenshots failed")
            return {"success": False, "items": [], "error": "Could not load recent screenshots."}

    async def append_desktop_debug_note(self, payload: Any = None):
        """Append timestamped Q&A markdown under ~/Desktop/BonsAI_notes/<name>.md (append-only)."""
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
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
        """Append Ask or AI response lines to daily UTC chat file under ~/Desktop/BonsAI_notes/."""
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
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
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        snap = plugin._last_input_transparency
        if not isinstance(snap, dict) or not snap:
            return {"available": False}
        return {"available": True, "snapshot": dict(snap)}

    async def capture_screenshot(self, include_overlay: bool = True):
        """Capture a screenshot using available gamescope commands and return attachment metadata."""
        plugin = Plugin._coerce_instance(self)
        settings = await plugin.load_settings()
        if not capability_enabled(settings, "filesystem_write"):
            return {
                "success": False,
                "error": "Filesystem writes are disabled. Enable them in the Permissions tab.",
            }
        runtime_dir = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "captures")
        os.makedirs(runtime_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        output_path = os.path.join(runtime_dir, f"bonsai-capture-{timestamp}.png")
        clean_env = Plugin._clean_env()
        return try_gamescope_screenshot_capture(output_path, include_overlay, clean_env)

    async def _execute_game_ai_request(
        self,
        question: str,
        pc_ip: str,
        app_id: str = "",
        app_name: str = "",
        attachments: Optional[list] = None,
        ask_mode: str = "speed",
        spoiler_consent: bool = False,
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
            }

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

        busy_body: Optional[dict] = None
        imm_args: Optional[dict] = None
        request_id: Optional[int] = None

        async with plugin._background_start_serial_lock:
            async with plugin._background_lock:
                if plugin._background_task and not plugin._background_task.done():
                    state = dict(plugin._background_state)
                    busy_body = {
                        "accepted": False,
                        "status": "busy",
                        "request_id": state.get("request_id"),
                        "app_id": state.get("app_id", ""),
                        "app_context": state.get("app_context", "none"),
                        "response": "A request is already in progress.",
                    }
                else:
                    if is_sanitizer_command:
                        handled = await plugin._try_handle_sanitizer_keyword_command(parsed_question, app_id)
                        if handled is not None:
                            resp = str(handled.get("response", ""))
                            imm_args = {
                                "parsed_question": parsed_question,
                                "resp": resp,
                                "app_id": app_id,
                                "app_name": app_name,
                                "pc_ip": pc_ip,
                                "app_context": app_context,
                                "transparency_route": "sanitizer_command",
                                "sanitizer_action": "command",
                                "sanitizer_reason_codes": [],
                                "state_question": "",
                                "meta": "sanitizer_keyword",
                            }

                    if imm_args is None and is_shortcut_command:
                        handled = await plugin._try_handle_shortcut_setup_command(parsed_question, app_id)
                        if handled is not None:
                            resp = str(handled.get("response", ""))
                            variant = handled.get("shortcut_setup")
                            imm_args = {
                                "parsed_question": parsed_question,
                                "resp": resp,
                                "app_id": app_id,
                                "app_name": app_name,
                                "pc_ip": pc_ip,
                                "app_context": app_context,
                                "transparency_route": "shortcut_setup",
                                "sanitizer_action": "pass",
                                "sanitizer_reason_codes": [],
                                "state_question": parsed_question,
                                "meta": "shortcut_setup",
                                "shortcut_setup_for_state": variant,
                                "shortcut_setup_for_response": variant,
                            }

                    if imm_args is None and is_vac_command:
                        handled_v = await plugin._try_handle_vac_check_command(parsed_question, app_id)
                        if handled_v is not None:
                            resp = str(handled_v.get("response", ""))
                            imm_args = {
                                "parsed_question": parsed_question,
                                "resp": resp,
                                "app_id": app_id,
                                "app_name": app_name,
                                "pc_ip": pc_ip,
                                "app_context": app_context,
                                "transparency_route": "vac_check",
                                "sanitizer_action": "pass",
                                "sanitizer_reason_codes": [],
                                "state_question": parsed_question,
                                "meta": "vac_check",
                                "shortcut_setup_for_state": None,
                            }

                    if imm_args is None:
                        plugin._background_request_seq += 1
                        request_id = plugin._background_request_seq
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

            if busy_body is not None:
                return busy_body
            if imm_args is not None:
                return await plugin._finalize_immediate_background_local_command(**imm_args)

        assert request_id is not None
        return {
            "accepted": True,
            "status": "pending",
            "request_id": request_id,
            "app_id": app_id,
            "app_context": app_context,
            "response": "Thinking...",
        }

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
                    }
            return dict(plugin._background_state)

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
    ):
        """Orchestrate attachment prep, prompt assembly, and model fallback request execution."""
        url = self._build_ollama_chat_url(PcIp)
        normalized_attachments = Plugin._sanitize_attachments(attachments or [])
        attachment_paths = [
            str(a.get("path", "") or "").strip()
            for a in normalized_attachments
            if isinstance(a, dict) and str(a.get("path", "") or "").strip()
        ]
        settings = await self.load_settings()
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
        )
        rp_meta = build_roleplay_system_suffix_meta(settings, ask_mode)
        roleplay = rp_meta.suffix
        preset_carousel_inject = None
        if rp_meta.resolved_preset_id == PYRO_PRESET_ID and roleplay:
            if random.random() < PYRO_MANAGER_TIP_PROBABILITY:
                tip = random.choice(PYRO_MANAGER_TIP_LINES)
                roleplay = roleplay + pyro_manager_carousel_tip_addon(tip)
                preset_carousel_inject = {"text": tip}
        if roleplay:
            # Lead with voice instructions so they are not diluted after the long bonsAI system preamble.
            system_content = roleplay.strip() + "\n\n" + system_content
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
            "strategy_spoiler_consent_effective": bool(strategy_spoiler_consent) if ask_mode == "strategy" else False,
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
        models_to_try = select_ollama_models(requires_vision, ask_mode, high_vram)
        policy_tier = str(settings.get("model_policy_tier") or "open_source_only")
        non_foss_unlocked = settings.get("model_policy_non_foss_unlocked") is True
        models_to_try = filter_model_list(models_to_try, policy_tier, non_foss_unlocked)
        if not models_to_try:
            return {
                "success": False,
                "response": empty_filter_user_message(policy_tier, non_foss_unlocked, requires_vision),
                "model_policy_disclosure": None,
                **ollama_extras,
            }

        plugin_inst = Plugin._coerce_instance(self)
        plugin_inst._ensure_background_state()

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

            for model_name in models_to_try:
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
                        ),
                    )
                finally:
                    plugin_inst._active_ollama_chat_pc_ip = None
                    plugin_inst._active_ollama_chat_model = None
                merged = {**ollama_extras, **result}
                if result.get("cancelled"):
                    return {**_strip_ollama_http_body(merged), "model_policy_disclosure": None, "cancelled": True}
                if result.get("success"):
                    disc = disclosure_for_model(str(result.get("model") or model_name))
                    out = {**_strip_ollama_http_body(merged), "model_policy_disclosure": disc}
                    if preset_carousel_inject is not None:
                        out["preset_carousel_inject"] = preset_carousel_inject
                    return out

                last_failure = _strip_ollama_http_body(merged)
                body = (result.get("body") or "").lower()
                # Missing local Ollama tags: try the next fallback instead of failing the whole Ask.
                is_model_not_found = "not found" in body and "model" in body
                if is_model_not_found:
                    continue

                status = result.get("status")
                oomish = any(
                    s in body
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

            return last_failure
        except Exception:
            logger.exception("Ollama request failed")
            return {
                "success": False,
                "response": "Ollama request failed. Check connection, model names, and the Deck plugin log.",
                **ollama_extras,
            }

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        """Build the Ollama chat endpoint URL from current connection input."""
        return build_ollama_chat_url(pc_ip)