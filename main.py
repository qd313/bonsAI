import asyncio
import base64
import fcntl
import glob
import io
import ipaddress
import json
import mimetypes
import os
import re
import shutil
import socket
import struct
import subprocess
import sys
import time
import urllib.request
import urllib.error
from typing import Any, Optional, Tuple

import decky

PLUGIN_ROOT = os.path.dirname(os.path.abspath(__file__))
if PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, PLUGIN_ROOT)

from backend.services.ai_character_service import build_roleplay_system_suffix
from backend.services.ollama_service import (
    build_system_prompt,
    format_ai_response,
    post_ollama_chat,
)
from backend.services.settings_service import (
    clamp_int,
    load_settings as load_settings_from_disk,
    sanitize_screenshot_max_dimension,
    sanitize_settings,
    sanitize_unified_input_persistence_mode,
    save_settings as save_settings_to_disk,
)
from backend.services.capabilities import capability_enabled
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
from backend.services.tdp_service import (
    apply_tdp as apply_tdp_service,
    clean_env,
    find_amdgpu_hwmon,
    write_sysfs,
)
from refactor_helpers import (
    build_ollama_chat_url,
    normalize_ollama_base,
    parse_tdp_recommendation,
    select_ollama_models,
)

logger = decky.logger


class Plugin:
    """Primary Decky backend orchestrator that preserves RPC contracts and lifecycle state.

    The class coordinates request flow, background task state, and service delegation so behavior stays
    stable while heavy logic is extracted into focused helper and service modules.
    """
    DEFAULT_LATENCY_WARNING_SECONDS = 15
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 120
    DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE = "persist_all"
    DEFAULT_SCREENSHOT_MAX_DIMENSION = 1280
    VALID_SCREENSHOT_MAX_DIMENSIONS = {1280, 1920, 3160}
    MAX_ATTACHMENT_FILE_BYTES = 40 * 1024 * 1024
    MAX_ATTACHMENT_INLINE_BYTES = 15 * 1024 * 1024
    SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
    VALID_UNIFIED_INPUT_PERSISTENCE_MODES = {
        "persist_all",
        "persist_search_only",
        "no_persist",
    }
    MIN_LATENCY_WARNING_SECONDS = 5
    MAX_LATENCY_WARNING_SECONDS = 300
    MIN_REQUEST_TIMEOUT_SECONDS = 10
    MAX_REQUEST_TIMEOUT_SECONDS = 300
    SETTINGS_FILENAME = "settings.json"

    def __init__(self):
        """Initialize plugin runtime state used for background-request coordination."""
        self._background_lock = asyncio.Lock()
        self._background_task: Optional[asyncio.Task] = None
        self._background_state: dict = self._new_background_state()
        self._background_request_seq = 0
        self._last_input_transparency: Optional[dict] = None

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
            valid_screenshot_dimensions=Plugin.VALID_SCREENSHOT_MAX_DIMENSIONS,
            default_screenshot_dimension=Plugin.DEFAULT_SCREENSHOT_MAX_DIMENSION,
        )

    @staticmethod
    def _sanitize_unified_input_persistence_mode(value: Any) -> str:
        return sanitize_unified_input_persistence_mode(
            value,
            Plugin.VALID_UNIFIED_INPUT_PERSISTENCE_MODES,
            Plugin.DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE,
        )

    @staticmethod
    def _sanitize_screenshot_max_dimension(value: Any) -> int:
        return sanitize_screenshot_max_dimension(
            value,
            Plugin.VALID_SCREENSHOT_MAX_DIMENSIONS,
            Plugin.DEFAULT_SCREENSHOT_MAX_DIMENSION,
        )

    async def _main(self):
        """Run plugin startup hooks and ensure background state exists before serving RPCs."""
        self._ensure_background_state()
        logger.info("bonsAI plugin loaded!")

    async def _unload(self):
        """Run plugin shutdown logging for Decky unload events."""
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
        }

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

    @staticmethod
    def _parse_ask_payload(question: Any, PcIp: str) -> Tuple[str, str, str, str, list]:
        """Normalize ask payload variants into canonical question/ip/context values."""
        app_id = ""
        app_name = ""
        attachments: list = []
        if isinstance(question, dict):
            payload = question
            question = payload.get("question", "")
            PcIp = payload.get("PcIp", payload.get("pcIp", payload.get("pc_ip", PcIp)))
            app_id = str(payload.get("appId", "") or "").strip()
            app_name = str(payload.get("appName", "") or "").strip()
            attachments = Plugin._sanitize_attachments(payload.get("attachments", []))
        normalized_question = str(question or "").strip()
        normalized_pc_ip = str(PcIp or "").strip()
        return normalized_question, normalized_pc_ip, app_id, app_name, attachments

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

    TDP_MIN_W = 3
    TDP_MAX_W = 15
    GPU_CLK_MIN_MHZ = 200
    GPU_CLK_MAX_MHZ = 1600

    @staticmethod
    def _parse_tdp_recommendation(text: str) -> Optional[dict]:
        """Extract a TDP recommendation from the AI response.
        Tries: fenced JSON, bare JSON, then natural-language patterns."""
        rec = parse_tdp_recommendation(
            text,
            tdp_min=Plugin.TDP_MIN_W,
            tdp_max=Plugin.TDP_MAX_W,
            gpu_min_mhz=Plugin.GPU_CLK_MIN_MHZ,
            gpu_max_mhz=Plugin.GPU_CLK_MAX_MHZ,
        )
        if rec is None:
            logger.info("_parse_tdp_recommendation: no TDP value found in response")
            return None
        return rec

    @staticmethod
    def _find_amdgpu_hwmon() -> Optional[str]:
        """Proxy hwmon discovery through the service layer for compatibility and reuse."""
        return find_amdgpu_hwmon()

    PRIV_WRITE = "/usr/bin/steamos-polkit-helpers/steamos-priv-write"

    @staticmethod
    def _clean_env() -> dict:
        """Proxy sanitized subprocess environment generation through the service layer."""
        return clean_env()

    @staticmethod
    def _write_sysfs(path: str, value: str) -> None:
        """Write sysfs values via service-managed privilege fallbacks."""
        write_sysfs(path, value, Plugin.PRIV_WRITE, logger)

    @staticmethod
    def _apply_tdp(rec: dict) -> dict:
        """Apply TDP recommendations through the service layer and return result metadata."""
        return apply_tdp_service(rec, Plugin.PRIV_WRITE, logger)

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
        _, _, base = normalize_ollama_base(raw)

        try:
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
                return {"version": version_local, "models": models_local}

            tested = await asyncio.wait_for(
                asyncio.to_thread(_test_connection_sync),
                timeout=float(safe_timeout_seconds) + 1.0,
            )
            version = str(tested.get("version", "unknown"))
            models = list(tested.get("models", []))

            return {"reachable": True, "version": version, "models": models}
        except Exception as e:
            return {"reachable": False, "error": str(e)}

    @staticmethod
    def _resolve_recent_screenshot_paths(app_id: str = "", limit: int = 5) -> list:
        """Resolve recent screenshot paths across common Steam userdata roots."""
        app_filter = str(app_id or "").strip()
        safe_limit = max(1, min(48, int(limit)))
        home = os.path.expanduser("~")
        roots = [
            os.path.join(home, ".local", "share", "Steam", "userdata"),
            os.path.join(home, ".steam", "steam", "userdata"),
        ]
        app_patterns = []
        global_patterns = []
        for root in roots:
            if app_filter:
                app_patterns.extend(
                    [
                        os.path.join(root, "*", "760", "remote", app_filter, "screenshots", "*.png"),
                        os.path.join(root, "*", "760", "remote", app_filter, "screenshots", "*.jpg"),
                        os.path.join(root, "*", "760", "remote", app_filter, "screenshots", "*.jpeg"),
                        os.path.join(root, "*", "760", "remote", app_filter, "screenshots", "*.webp"),
                    ]
                )
            global_patterns.extend(
                [
                    os.path.join(root, "*", "760", "remote", "*", "screenshots", "*.png"),
                    os.path.join(root, "*", "760", "remote", "*", "screenshots", "*.jpg"),
                    os.path.join(root, "*", "760", "remote", "*", "screenshots", "*.jpeg"),
                    os.path.join(root, "*", "760", "remote", "*", "screenshots", "*.webp"),
                ]
            )

        app_files: list = []
        for pattern in app_patterns:
            app_files.extend(glob.glob(pattern))
        app_files = [path for path in set(app_files) if os.path.isfile(path)]
        app_files.sort(key=lambda p: os.path.getmtime(p), reverse=True)

        global_files: list = []
        for pattern in global_patterns:
            global_files.extend(glob.glob(pattern))
        global_files = [path for path in set(global_files) if os.path.isfile(path)]
        global_files.sort(key=lambda p: os.path.getmtime(p), reverse=True)

        ordered: list = []
        seen: set = set()
        for path in app_files + global_files:
            canonical = os.path.realpath(path)
            dedupe_key = canonical
            try:
                st = os.stat(canonical)
                dedupe_key = f"{st.st_dev}:{st.st_ino}"
            except OSError:
                dedupe_key = canonical
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            ordered.append(path)
            if len(ordered) >= safe_limit:
                break
        return ordered

    @staticmethod
    def _lookup_steam_app_name(app_id: str) -> str:
        """Resolve app names from local Steam appmanifest metadata."""
        candidate = str(app_id or "").strip()
        if not candidate.isdigit():
            return ""
        home = os.path.expanduser("~")
        manifest_paths = [
            os.path.join(home, ".local", "share", "Steam", "steamapps", f"appmanifest_{candidate}.acf"),
            os.path.join(home, ".steam", "steam", "steamapps", f"appmanifest_{candidate}.acf"),
        ]
        for manifest in manifest_paths:
            if not os.path.isfile(manifest):
                continue
            try:
                with open(manifest, "r", encoding="utf-8", errors="ignore") as fp:
                    raw = fp.read()
                match = re.search(r'"name"\s+"([^"]+)"', raw)
                if match:
                    return match.group(1).strip()
            except Exception:
                continue
        return ""

    @staticmethod
    def _lookup_screenshot_vdf_metadata(screenshot_path: str) -> dict:
        """Extract caption and shortcut hints from screenshots.vdf near a screenshot filename."""
        marker = f"{os.sep}760{os.sep}remote{os.sep}"
        if marker not in screenshot_path:
            return {"caption": "", "shortcut_name": ""}
        base = screenshot_path.split(marker, 1)[0]
        vdf_path = os.path.join(base, "760", "screenshots.vdf")
        filename = os.path.basename(screenshot_path)
        if not os.path.isfile(vdf_path) or not filename:
            return {"caption": "", "shortcut_name": ""}
        try:
            with open(vdf_path, "r", encoding="utf-8", errors="ignore") as fp:
                raw = fp.read()
            idx = raw.find(filename)
            if idx < 0:
                return {"caption": "", "shortcut_name": ""}
            window = raw[max(0, idx - 2200): idx + 2200]
            caption_match = re.search(r'"caption"\s+"([^"]*)"', window, flags=re.IGNORECASE)
            shortcut_match = re.search(r'"shortcutname"\s+"([^"]*)"', window, flags=re.IGNORECASE)
            return {
                "caption": (caption_match.group(1).strip() if caption_match else ""),
                "shortcut_name": (shortcut_match.group(1).strip() if shortcut_match else ""),
            }
        except Exception:
            return {"caption": "", "shortcut_name": ""}

    @staticmethod
    def _extract_app_id_from_screenshot_path(path: str) -> str:
        """Extract the app id segment from Steam screenshot path patterns."""
        marker = f"{os.sep}760{os.sep}remote{os.sep}"
        if marker not in path:
            return ""
        tail = path.split(marker, 1)[1]
        return tail.split(os.sep, 1)[0].strip()

    @staticmethod
    def _build_screenshot_preview_data_uri(path: str, max_dimension: int = 220) -> Optional[str]:
        """Generate a compact preview data URI from screenshot files for UI thumbnails."""
        ext = os.path.splitext(path)[1].lower()
        if ext not in Plugin.SUPPORTED_IMAGE_EXTENSIONS:
            return None
        try:
            from PIL import Image  # type: ignore
            with Image.open(path) as image:
                image.load()
                width, height = image.size
                longest_edge = max(width, height)
                if longest_edge > max_dimension:
                    ratio = max_dimension / float(longest_edge)
                    image = image.resize(
                        (max(1, int(width * ratio)), max(1, int(height * ratio))),
                        Image.LANCZOS,
                    )
                if image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")
                elif image.mode == "L":
                    image = image.convert("RGB")
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=62, optimize=True)
                encoded = base64.b64encode(output.getvalue()).decode("ascii")
                return f"data:image/jpeg;base64,{encoded}"
        except Exception:
            try:
                file_size = os.path.getsize(path)
                if file_size > 1_800_000:
                    return None
                with open(path, "rb") as f:
                    raw = f.read()
                mime_type = mimetypes.guess_type(path)[0] or "image/png"
                encoded = base64.b64encode(raw).decode("ascii")
                return f"data:{mime_type};base64,{encoded}"
            except Exception:
                return None

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
            for path in Plugin._resolve_recent_screenshot_paths(app_id, limit):
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
                        "app_id": Plugin._extract_app_id_from_screenshot_path(path),
                        "preview_data_uri": Plugin._build_screenshot_preview_data_uri(path),
                    }
                )
            return {"success": True, "items": items}
        except Exception as exc:
            logger.exception("list_recent_screenshots failed")
            return {"success": False, "items": [], "error": str(exc)}

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

    async def get_input_transparency(self):
        """Return the last Ask transparency snapshot (full prompts; fetch after terminal completion)."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()
        snap = plugin._last_input_transparency
        if not isinstance(snap, dict) or not snap:
            return {"available": False}
        return {"available": True, "snapshot": dict(snap)}

    @staticmethod
    def _build_capture_command_candidates(output_path: str, include_overlay: bool) -> list:
        """Build candidate screenshot commands to maximize compatibility across SteamOS variants."""
        candidates = [
            ["gamescope-screenshot", "--file", output_path],
            ["gamescope-screenshot", "-o", output_path],
            ["gamescope-screenshot", output_path],
            ["/usr/bin/gamescope-screenshot", "--file", output_path],
            ["/usr/bin/gamescope-screenshot", "-o", output_path],
            ["/usr/bin/gamescope-screenshot", output_path],
        ]
        if not include_overlay:
            candidates = [cmd + ["--focused"] for cmd in candidates] + candidates
        return candidates

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
        errors: list = []

        for command in Plugin._build_capture_command_candidates(output_path, include_overlay):
            executable = command[0]
            if executable.startswith("/") and not os.path.isfile(executable):
                continue
            if not executable.startswith("/") and shutil.which(executable) is None:
                continue
            try:
                result = subprocess.run(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=clean_env,
                    timeout=8,
                )
                if result.returncode == 0 and os.path.isfile(output_path) and os.path.getsize(output_path) > 0:
                    return {
                        "success": True,
                        "item": {
                            "path": output_path,
                            "name": os.path.basename(output_path),
                            "mtime": os.path.getmtime(output_path),
                            "source": "capture",
                            "app_id": "",
                        },
                    }
                stderr = result.stderr.decode("utf-8", errors="replace").strip()
                errors.append(f"{' '.join(command)} -> {stderr or f'rc={result.returncode}'}")
            except Exception as exc:
                errors.append(f"{' '.join(command)} -> {exc}")

        error_text = "No supported screenshot capture command succeeded."
        if errors:
            error_text = f"{error_text} Attempts: {' | '.join(errors[:3])}"
        return {"success": False, "error": error_text}

    @staticmethod
    def _encode_image_with_pillow(path: str, max_dimension: int) -> tuple[Optional[str], Optional[str], list]:
        """Resize and encode images with Pillow to keep attachment payload sizes predictable."""
        warnings: list = []
        try:
            from PIL import Image  # type: ignore
        except Exception:
            return None, None, ["Pillow is unavailable; sent original image bytes."]

        with Image.open(path) as image:
            image.load()
            width, height = image.size
            longest_edge = max(width, height)
            if longest_edge > max_dimension:
                ratio = max_dimension / float(longest_edge)
                resized = image.resize((max(1, int(width * ratio)), max(1, int(height * ratio))), Image.LANCZOS)
            else:
                resized = image.copy()
            if resized.mode not in ("RGB", "L"):
                resized = resized.convert("RGB")
            elif resized.mode == "L":
                resized = resized.convert("RGB")

            output = io.BytesIO()
            resized.save(output, format="JPEG", quality=82, optimize=True)
            data = output.getvalue()
            return base64.b64encode(data).decode("ascii"), "image/jpeg", warnings

    @staticmethod
    def _prepare_image_attachment(attachment: dict, max_dimension: int) -> dict:
        """Validate, transform, and encode one image attachment for Ollama multimodal requests."""
        path = str(attachment.get("path", "") or "").strip()
        if not path:
            return {"ok": False, "error": "Attachment path is empty."}
        if not os.path.isfile(path):
            return {"ok": False, "error": f"Attachment file not found: {path}"}
        ext = os.path.splitext(path)[1].lower()
        if ext not in Plugin.SUPPORTED_IMAGE_EXTENSIONS:
            return {"ok": False, "error": f"Unsupported image type '{ext}'."}
        file_size = os.path.getsize(path)
        if file_size > Plugin.MAX_ATTACHMENT_FILE_BYTES:
            return {"ok": False, "error": f"Image is too large ({file_size} bytes)."}

        encoded, mime_type, warnings = Plugin._encode_image_with_pillow(path, max_dimension)
        if encoded is None:
            with open(path, "rb") as f:
                raw = f.read()
            if len(raw) > Plugin.MAX_ATTACHMENT_INLINE_BYTES:
                return {
                    "ok": False,
                    "error": (
                        f"Image inline payload is too large ({len(raw)} bytes). "
                        "Install Pillow or lower screenshot dimension."
                    ),
                }
            encoded = base64.b64encode(raw).decode("ascii")
            guessed = mimetypes.guess_type(path)[0] or "image/png"
            mime_type = guessed

        return {
            "ok": True,
            "image_b64": encoded,
            "mime_type": mime_type or "image/jpeg",
            "name": str(attachment.get("name", "") or os.path.basename(path)),
            "warnings": warnings,
        }

    @staticmethod
    def _prepare_attachment_images(attachments: list, max_dimension: int) -> tuple[list, list, list]:
        """Prepare a batch of attachments and return successful images, warnings, and errors."""
        prepared_images: list = []
        warnings: list = []
        errors: list = []
        for attachment in attachments:
            prepared = Plugin._prepare_image_attachment(attachment, max_dimension)
            if prepared.get("ok"):
                prepared_images.append(prepared)
                warnings.extend(prepared.get("warnings", []))
            else:
                errors.append(str(prepared.get("error", "Failed to prepare attachment.")))
        return prepared_images, warnings, errors

    async def _execute_game_ai_request(
        self,
        question: str,
        pc_ip: str,
        app_id: str = "",
        app_name: str = "",
        attachments: Optional[list] = None,
    ) -> dict:
        """Run one full ask lifecycle, including Ollama call timing and optional TDP application."""
        start = time.time()
        app_context = "active" if app_id else "none"
        plugin = Plugin._coerce_instance(self)
        try:
            logger.info(
                "_execute_game_ai_request: host=%s game=%r appid=%s question=%r (len=%d)",
                pc_ip, app_name, app_id, question, len(question),
            )

            settings = await plugin.load_settings()
            request_timeout_seconds = int(
                settings.get("request_timeout_seconds", Plugin.DEFAULT_REQUEST_TIMEOUT_SECONDS)
            )

            keyword_result = await plugin._try_handle_sanitizer_keyword_command(question, app_id)
            if keyword_result is not None:
                elapsed = round(time.time() - start, 1)
                out = {**keyword_result, "elapsed_seconds": elapsed}
                logger.info("_execute_game_ai_request: sanitizer keyword command handled (elapsed=%.1fs)", elapsed)
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
                    }
                )
                return out

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
                    }
                )
                return {
                    "success": False,
                    "response": msg,
                    "app_id": app_id,
                    "app_context": app_context,
                    "applied": None,
                    "elapsed_seconds": elapsed,
                }

            user_sanitizer_disabled = bool(settings.get("input_sanitizer_user_disabled"))
            lane = apply_input_sanitizer_lane(question, user_sanitizer_disabled)
            if lane.action == "block":
                elapsed = round(time.time() - start, 1)
                logger.info("_execute_game_ai_request: input blocked by sanitizer (%s)", lane.reason_codes)
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
                    }
                )
                return {
                    "success": False,
                    "response": um,
                    "app_id": app_id,
                    "app_context": app_context,
                    "applied": None,
                    "elapsed_seconds": elapsed,
                }
            question_for_model = lane.text

            ollama_result = await plugin.ask_ollama(
                question_for_model,
                pc_ip,
                app_id,
                app_name,
                request_timeout_seconds=request_timeout_seconds,
                attachments=atts,
            )
            elapsed = round(time.time() - start, 1)
            base_response_text = str(ollama_result.get("response", "") or "No response text.")
            response_text = base_response_text
            applied = None

            # TDP application remains conditional so non-performance prompts stay read-only.
            if ollama_result.get("success"):
                rec = Plugin._parse_tdp_recommendation(response_text)
                if rec:
                    if not capability_enabled(settings, "hardware_control"):
                        logger.info("ask_game_ai: TDP recommendation present but hardware_control disabled")
                        response_text += (
                            "\n\n[Hardware tuning not applied: enable Hardware control in the Permissions tab.]"
                        )
                        applied = {
                            "tdp_watts": None,
                            "gpu_clock_mhz": None,
                            "errors": ["Hardware control disabled in Permissions."],
                        }
                    else:
                        logger.info("ask_game_ai: parsed TDP recommendation: %s", rec)
                        loop = asyncio.get_running_loop()
                        applied = await loop.run_in_executor(None, Plugin._apply_tdp, rec)
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
                }
            )

            logger.info("_execute_game_ai_request: completed in %.1fs", elapsed)
            return {
                "success": bool(ollama_result.get("success", False)),
                "response": response_text,
                "app_id": app_id,
                "app_context": app_context,
                "applied": applied,
                "elapsed_seconds": elapsed,
            }
        except Exception as exc:
            elapsed = round(time.time() - start, 1)
            logger.exception("_execute_game_ai_request failed (%.1fs)", elapsed)
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
                    "final_response": f"Backend error: {exc}",
                    "applied": None,
                    "success": False,
                    "app_id": app_id,
                    "app_name": app_name,
                    "pc_ip": pc_ip,
                    "error_message": str(exc),
                    "elapsed_seconds": elapsed,
                }
            )
            return {
                "success": False,
                "response": f"Backend error: {exc}",
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
            }

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        """Handle foreground ask RPCs and validate required inputs before execution."""
        logger.info("ask_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        parsed_question, pc_ip, app_id, app_name, attachments = Plugin._parse_ask_payload(question, PcIp)
        if not parsed_question:
            logger.info("ask_game_ai: rejected (empty question)")
            return Plugin._reject_ask_request("Question is required.", app_id=app_id)
        if classify_sanitizer_command(parsed_question) is not None:
            handled = await self._try_handle_sanitizer_keyword_command(parsed_question, app_id)
            if handled is not None:
                return handled
        if not pc_ip:
            logger.info("ask_game_ai: rejected (empty pc_ip)")
            return Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id)
        return await self._execute_game_ai_request(parsed_question, pc_ip, app_id, app_name, attachments=attachments)

    async def _run_background_request(
        self,
        request_id: int,
        question: str,
        pc_ip: str,
        app_id: str,
        app_name: str,
        attachments: Optional[list] = None,
    ) -> None:
        """Execute a queued background request and publish terminal status for polling clients."""
        result = await self._execute_game_ai_request(
            question,
            pc_ip,
            app_id,
            app_name,
            attachments=attachments or [],
        )
        self._ensure_background_state()
        async with self._background_lock:
            active_request_id = self._background_state.get("request_id")
            if active_request_id != request_id:
                return
            success = bool(result.get("success", False))
            response_text = str(result.get("response", "") or "No response text.")
            self._background_state = {
                **self._background_state,
                "status": "completed" if success else "failed",
                "success": success,
                "response": response_text,
                "applied": result.get("applied"),
                "elapsed_seconds": result.get("elapsed_seconds", 0),
                "error": None if success else response_text,
                "completed_at": time.time(),
            }

    async def start_background_game_ai(self, question: Any = "", PcIp: str = ""):
        """Start a background ask request unless one is already active or payload is invalid."""
        plugin = Plugin._coerce_instance(self)
        plugin._ensure_background_state()

        logger.info("start_background_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        parsed_question, pc_ip, app_id, app_name, attachments = Plugin._parse_ask_payload(question, PcIp)
        app_context = "active" if app_id else "none"
        if not parsed_question:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("Question is required.", app_id=app_id),
            }
        is_sanitizer_command = classify_sanitizer_command(parsed_question) is not None
        if not pc_ip and not is_sanitizer_command:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id),
            }

        if not is_sanitizer_command:
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
                    plugin._background_request_seq += 1
                    request_id = plugin._background_request_seq
                    now = time.time()
                    resp = str(handled.get("response", ""))
                    await plugin._persist_input_transparency(
                        {
                            "route": "sanitizer_command",
                            "raw_question": parsed_question,
                            "sanitizer_action": "command",
                            "sanitizer_reason_codes": [],
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
                        }
                    )
                    plugin._background_state = {
                        "status": "completed",
                        "request_id": request_id,
                        "question": "",
                        "app_id": app_id,
                        "app_context": app_context,
                        "success": True,
                        "response": resp,
                        "applied": None,
                        "elapsed_seconds": 0.0,
                        "error": None,
                        "started_at": now,
                        "completed_at": now,
                    }
                    plugin._background_task = None
                    return {
                        "accepted": True,
                        "status": "completed",
                        "request_id": request_id,
                        "app_id": app_id,
                        "app_context": app_context,
                        "success": True,
                        "response": resp,
                        "applied": None,
                        "elapsed_seconds": 0.0,
                        "meta": "sanitizer_keyword",
                    }

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
            }
            plugin._background_task = asyncio.create_task(
                plugin._run_background_request(
                    request_id,
                    parsed_question,
                    pc_ip,
                    app_id,
                    app_name,
                    attachments=attachments,
                )
            )

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
                        "response": f"Backend error: {exc}",
                        "error": f"Backend error: {exc}",
                        "completed_at": time.time(),
                    }
            return dict(plugin._background_state)

    def _build_system_prompt(
        self,
        question: str,
        app_id: str,
        app_name: str,
        normalized_attachments: list,
        prepared_images: list,
    ) -> str:
        """Build the system prompt using plugin-local metadata lookups and attachment context."""
        return build_system_prompt(
            question=question,
            app_id=app_id,
            app_name=app_name,
            normalized_attachments=normalized_attachments,
            prepared_images=prepared_images,
            lookup_app_name=Plugin._lookup_steam_app_name,
            lookup_screenshot_vdf_metadata=Plugin._lookup_screenshot_vdf_metadata,
        )

    @staticmethod
    def _select_models(requires_vision: bool) -> list:
        """Select ordered model fallbacks based on whether vision inputs are present."""
        return select_ollama_models(requires_vision)

    @staticmethod
    def _format_ai_response(
        text: str,
        normalized_attachments: list,
        prepared_images: list,
        attachment_errors: list,
    ) -> str:
        """Format response text with attachment diagnostics that frontend rendering expects."""
        return format_ai_response(text, normalized_attachments, prepared_images, attachment_errors)

    def _post_ollama_chat(
        self,
        url: str,
        model_name: str,
        messages: list,
        request_timeout_seconds: int,
        normalized_attachments: list,
        prepared_images: list,
        attachment_warnings: list,
        attachment_errors: list,
    ) -> dict:
        """Execute one Ollama request attempt through the shared service transport helper."""
        return post_ollama_chat(
            url=url,
            model_name=model_name,
            messages=messages,
            request_timeout_seconds=request_timeout_seconds,
            normalized_attachments=normalized_attachments,
            prepared_images=prepared_images,
            attachment_warnings=attachment_warnings,
            attachment_errors=attachment_errors,
            logger=logger,
        )

    async def ask_ollama(
        self,
        question: str,
        PcIp: str,
        app_id: str,
        app_name: str,
        request_timeout_seconds: int = 120,
        attachments: Optional[list] = None,
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
        screenshot_max_dimension = Plugin._sanitize_screenshot_max_dimension(
            settings.get("screenshot_max_dimension")
        )
        prepared_images, attachment_warnings, attachment_errors = Plugin._prepare_attachment_images(
            normalized_attachments,
            screenshot_max_dimension,
        )
        system_content = self._build_system_prompt(
            question,
            app_id,
            app_name,
            normalized_attachments,
            prepared_images,
        )
        roleplay = build_roleplay_system_suffix(settings)
        if roleplay:
            # Lead with voice instructions so they are not diluted after the long bonsAI system preamble.
            system_content = roleplay.strip() + "\n\n" + system_content
        user_message: dict = {"role": "user", "content": question}
        if prepared_images:
            user_message["images"] = [image["image_b64"] for image in prepared_images]
        messages = [{"role": "system", "content": system_content}, user_message]

        ollama_extras = {
            "system_prompt": system_content,
            "user_text_for_model": question,
            "user_image_count": len(prepared_images),
            "attachment_paths": attachment_paths,
        }

        logger.info(
            "ask_ollama: url=%s game=%r appid=%s attachments=%d user_message=%r (len=%d)",
            url, app_name, app_id, len(prepared_images), question, len(question),
        )

        requires_vision = len(prepared_images) > 0
        models_to_try = self._select_models(requires_vision)

        try:
            loop = asyncio.get_running_loop()
            last_failure = {"success": False, "response": "No model attempts executed.", **ollama_extras}

            for model_name in models_to_try:
                result = await loop.run_in_executor(
                    None,
                    self._post_ollama_chat,
                    url,
                    model_name,
                    messages,
                    request_timeout_seconds,
                    normalized_attachments,
                    prepared_images,
                    attachment_warnings,
                    attachment_errors,
                )
                merged = {**result, **ollama_extras}
                if result.get("success"):
                    return merged

                last_failure = merged
                body = (result.get("body") or "").lower()
                is_model_not_found = "not found" in body and "model" in body
                if is_model_not_found:
                    continue
                return merged

            if requires_vision:
                return {
                    "success": False,
                    "response": (
                        "No vision-capable Ollama model was found for screenshot analysis. "
                        "Install a vision model such as llava, bakllava, qwen2.5vl, or moondream, "
                        "then try again."
                    ),
                    **ollama_extras,
                }

            return last_failure
        except Exception as e:
            logger.error(f"Ollama request failed: {e}")
            return {"success": False, "response": str(e), **ollama_extras}

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        """Build the Ollama chat endpoint URL from current connection input."""
        return build_ollama_chat_url(pc_ip)