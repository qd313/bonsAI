import asyncio
import base64
import glob
import io
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Any, Optional, Tuple

import decky

logger = decky.logger

class Plugin:
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
    MAX_REQUEST_TIMEOUT_SECONDS = 600
    SETTINGS_FILENAME = "settings.json"

    def __init__(self):
        self._background_lock = asyncio.Lock()
        self._background_task: Optional[asyncio.Task] = None
        self._background_state: dict = self._new_background_state()
        self._background_request_seq = 0

    @staticmethod
    def _coerce_instance(self_or_cls: Any) -> "Plugin":
        """api_version 1 uses an instance; older loaders may pass the class as self."""
        return self_or_cls() if isinstance(self_or_cls, type) else self_or_cls

    @staticmethod
    def _settings_path() -> str:
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, Plugin.SETTINGS_FILENAME)

    @staticmethod
    def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = default
        return max(minimum, min(maximum, parsed))

    @staticmethod
    def _sanitize_settings(data: Any) -> dict:
        raw = data if isinstance(data, dict) else {}
        return {
            "latency_warning_seconds": Plugin._clamp_int(
                raw.get("latency_warning_seconds"),
                Plugin.DEFAULT_LATENCY_WARNING_SECONDS,
                Plugin.MIN_LATENCY_WARNING_SECONDS,
                Plugin.MAX_LATENCY_WARNING_SECONDS,
            ),
            "request_timeout_seconds": Plugin._clamp_int(
                raw.get("request_timeout_seconds"),
                Plugin.DEFAULT_REQUEST_TIMEOUT_SECONDS,
                Plugin.MIN_REQUEST_TIMEOUT_SECONDS,
                Plugin.MAX_REQUEST_TIMEOUT_SECONDS,
            ),
            "unified_input_persistence_mode": Plugin._sanitize_unified_input_persistence_mode(
                raw.get("unified_input_persistence_mode")
            ),
            "screenshot_max_dimension": Plugin._sanitize_screenshot_max_dimension(
                raw.get("screenshot_max_dimension")
            ),
        }

    @staticmethod
    def _sanitize_unified_input_persistence_mode(value: Any) -> str:
        if isinstance(value, str) and value in Plugin.VALID_UNIFIED_INPUT_PERSISTENCE_MODES:
            return value
        return Plugin.DEFAULT_UNIFIED_INPUT_PERSISTENCE_MODE

    @staticmethod
    def _sanitize_screenshot_max_dimension(value: Any) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = Plugin.DEFAULT_SCREENSHOT_MAX_DIMENSION
        if parsed in Plugin.VALID_SCREENSHOT_MAX_DIMENSIONS:
            return parsed
        return Plugin.DEFAULT_SCREENSHOT_MAX_DIMENSION

    async def _main(self):
        self._ensure_background_state()
        logger.info("bonsAI plugin loaded!")

    async def _unload(self):
        logger.info("bonsAI plugin unloaded!")

    def _new_background_state(self) -> dict:
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
        if not hasattr(self, "_background_lock"):
            self._background_lock = asyncio.Lock()
        if not hasattr(self, "_background_task"):
            self._background_task = None
        if not hasattr(self, "_background_state") or not isinstance(self._background_state, dict):
            self._background_state = self._new_background_state()
        if not hasattr(self, "_background_request_seq"):
            self._background_request_seq = 0

    @staticmethod
    def _parse_ask_payload(question: Any, PcIp: str) -> Tuple[str, str, str, str, list]:
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
        return {
            "success": False,
            "response": response_text,
            "app_id": app_id,
            "app_context": "active" if app_id else "none",
            "applied": None,
            "elapsed_seconds": 0,
        }

    async def load_settings(self):
        """Load persisted plugin settings from Decky's settings directory."""
        path = Plugin._settings_path()
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                logger.warning("load_settings: expected object in %s, got %s", path, type(data).__name__)
                return Plugin._sanitize_settings({})
            return Plugin._sanitize_settings(data)
        except FileNotFoundError:
            return Plugin._sanitize_settings({})
        except Exception as exc:
            logger.warning("load_settings: failed to read %s: %s", path, exc)
            return Plugin._sanitize_settings({})

    async def save_settings(self, data: Any = None):
        """Persist plugin settings to Decky's settings directory."""
        incoming = data if isinstance(data, dict) else {}
        current = await self.load_settings()
        merged = {**current, **incoming}
        sanitized = Plugin._sanitize_settings(merged)
        path = Plugin._settings_path()

        try:
            os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(sanitized, f, indent=2, sort_keys=True)
            return sanitized
        except Exception as exc:
            logger.exception("save_settings: failed to write %s", path)
            raise RuntimeError(f"Failed to save settings: {exc}") from exc

    TDP_MIN_W = 3
    TDP_MAX_W = 15
    GPU_CLK_MIN_MHZ = 200
    GPU_CLK_MAX_MHZ = 1600

    @staticmethod
    def _parse_tdp_recommendation(text: str) -> Optional[dict]:
        """Extract a TDP recommendation from the AI response.
        Tries: fenced JSON, bare JSON, then natural-language patterns."""
        rec = None

        # 1) Fenced ```json ... ```
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if not m:
            # 2) Bare {"tdp_watts": N ...}
            m = re.search(r'(\{\s*"tdp_watts"\s*:\s*\d+[^}]*\})', text, re.DOTALL)
        if m:
            try:
                rec = json.loads(m.group(1))
            except json.JSONDecodeError as exc:
                logger.info("_parse_tdp_recommendation: JSON decode failed: %s / raw=%r", exc, m.group(1))

        # 3) Natural-language fallback: "TDP to 8 watts" / "TDP of 8W" / "TDP: 8 watts"
        if rec is None:
            nl = re.search(r"(?:tdp|TDP)\s*(?:to|of|at|:)?\s*(\d+)\s*(?:w|W|watts?)", text)
            if nl:
                rec = {"tdp_watts": int(nl.group(1))}
                logger.info("_parse_tdp_recommendation: extracted from natural language: %s", rec)

        if rec is None:
            logger.info("_parse_tdp_recommendation: no TDP value found in response")
            return None

        tdp = rec.get("tdp_watts")
        gpu = rec.get("gpu_clock_mhz")
        if not isinstance(tdp, (int, float)):
            return None
        result: dict = {"tdp_watts": max(Plugin.TDP_MIN_W, min(Plugin.TDP_MAX_W, int(tdp)))}
        if isinstance(gpu, (int, float)):
            result["gpu_clock_mhz"] = max(Plugin.GPU_CLK_MIN_MHZ, min(Plugin.GPU_CLK_MAX_MHZ, int(gpu)))
        else:
            result["gpu_clock_mhz"] = None
        return result

    @staticmethod
    def _find_amdgpu_hwmon() -> Optional[str]:
        """Return the hwmon directory whose 'name' file contains 'amdgpu'."""
        for name_path in sorted(glob.glob("/sys/class/hwmon/hwmon*/name")):
            try:
                with open(name_path) as f:
                    if "amdgpu" in f.read().strip().lower():
                        return name_path.rsplit("/", 1)[0]
            except OSError:
                continue
        return None

    PRIV_WRITE = "/usr/bin/steamos-polkit-helpers/steamos-priv-write"

    @staticmethod
    def _clean_env() -> dict:
        """Return a copy of os.environ without Decky's LD_ overrides that break system binaries."""
        env = dict(os.environ)
        for key in ("LD_LIBRARY_PATH", "LD_PRELOAD"):
            env.pop(key, None)
        return env

    @staticmethod
    def _write_sysfs(path: str, value: str) -> None:
        """Write a value to a sysfs file, escalating privileges as needed."""
        clean = Plugin._clean_env()

        # 1) Direct write (works if plugin_loader runs as root)
        try:
            with open(path, "w") as f:
                f.write(value)
            logger.info("_write_sysfs: direct write OK -> %s", path)
            return
        except PermissionError:
            logger.info("_write_sysfs: direct write denied for %s", path)
        except OSError as exc:
            logger.info("_write_sysfs: direct write failed for %s: %s", path, exc)

        # 2) steamos-priv-write (the official SteamOS sysfs helper, no password needed)
        if os.path.isfile(Plugin.PRIV_WRITE):
            result = subprocess.run(
                [Plugin.PRIV_WRITE, path, value],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=clean,
                timeout=5,
            )
            if result.returncode == 0:
                logger.info("_write_sysfs: steamos-priv-write OK -> %s", path)
                return
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            logger.info("_write_sysfs: steamos-priv-write failed (rc=%d): %s", result.returncode, stderr)
        else:
            logger.info("_write_sysfs: steamos-priv-write not found at %s", Plugin.PRIV_WRITE)

        # 3) Last resort: sudo -n tee (non-interactive)
        result = subprocess.run(
            ["sudo", "-n", "tee", path],
            input=value.encode(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            env=clean,
            timeout=5,
        )
        if result.returncode == 0:
            logger.info("_write_sysfs: sudo -n tee OK -> %s", path)
            return
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise OSError(f"All write methods failed for {path}: {stderr}")

    @staticmethod
    def _apply_tdp(rec: dict) -> dict:
        """Write TDP (and optionally GPU clock) to sysfs. Returns a status dict."""
        applied: dict = {"tdp_watts": None, "gpu_clock_mhz": None, "errors": []}

        hwmon = Plugin._find_amdgpu_hwmon()
        if not hwmon:
            applied["errors"].append("Could not find amdgpu hwmon path in sysfs.")
            logger.error("_apply_tdp: amdgpu hwmon not found")
            return applied

        tdp_w = rec.get("tdp_watts")
        if tdp_w is not None:
            cap_path = f"{hwmon}/power1_cap"
            microwatts = str(int(tdp_w) * 1_000_000)
            try:
                Plugin._write_sysfs(cap_path, microwatts)
                applied["tdp_watts"] = int(tdp_w)
                logger.info("_apply_tdp: wrote %s to %s (%dW)", microwatts, cap_path, tdp_w)
            except Exception as exc:
                msg = f"Failed to write TDP to {cap_path}: {exc}"
                applied["errors"].append(msg)
                logger.error("_apply_tdp: %s", msg)

        gpu_mhz = rec.get("gpu_clock_mhz")
        if gpu_mhz is not None:
            applied["gpu_clock_mhz"] = int(gpu_mhz)
            logger.info("_apply_tdp: GPU clock %d MHz noted (sysfs write not yet implemented)", gpu_mhz)

        return applied

    async def log_navigation(self, setting_path: str):
        logger.info(f"User navigated to: {setting_path}")
        return True

    async def get_deck_ip(self):
        """Return the Steam Deck's LAN IP address."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "unknown"

    async def test_ollama_connection(self, pc_ip: str = ""):
        """Ping Ollama's /api/version and /api/tags to verify reachability."""
        raw = (pc_ip or "").strip()
        if not raw:
            return {"reachable": False, "error": "No PC IP provided."}

        if "//" not in raw:
            raw = f"http://{raw}"
        parsed = urlparse(raw)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 11434
        base = f"http://{host}:{port}"

        try:
            ver_req = urllib.request.Request(f"{base}/api/version", method="GET")
            ver_resp = urllib.request.urlopen(ver_req, timeout=5)
            ver_data = json.loads(ver_resp.read().decode("utf-8"))
            version = ver_data.get("version", "unknown")

            tags_req = urllib.request.Request(f"{base}/api/tags", method="GET")
            tags_resp = urllib.request.urlopen(tags_req, timeout=5)
            tags_data = json.loads(tags_resp.read().decode("utf-8"))
            models = [m.get("name", "?") for m in tags_data.get("models", [])]

            return {"reachable": True, "version": version, "models": models}
        except Exception as e:
            return {"reachable": False, "error": str(e)}

    @staticmethod
    def _resolve_recent_screenshot_paths(app_id: str = "", limit: int = 5) -> list:
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
        marker = f"{os.sep}760{os.sep}remote{os.sep}"
        if marker not in path:
            return ""
        tail = path.split(marker, 1)[1]
        return tail.split(os.sep, 1)[0].strip()

    @staticmethod
    def _build_screenshot_preview_data_uri(path: str, max_dimension: int = 220) -> Optional[str]:
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
        try:
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

    @staticmethod
    def _build_capture_command_candidates(output_path: str, include_overlay: bool) -> list:
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
        start = time.time()
        app_context = "active" if app_id else "none"
        try:
            plugin = Plugin._coerce_instance(self)
            logger.info(
                "_execute_game_ai_request: host=%s game=%r appid=%s question=%r (len=%d)",
                pc_ip, app_name, app_id, question, len(question),
            )

            settings = await plugin.load_settings()
            request_timeout_seconds = int(
                settings.get("request_timeout_seconds", Plugin.DEFAULT_REQUEST_TIMEOUT_SECONDS)
            )
            ollama_result = await plugin.ask_ollama(
                question,
                pc_ip,
                app_id,
                app_name,
                request_timeout_seconds=request_timeout_seconds,
                attachments=attachments or [],
            )
            elapsed = round(time.time() - start, 1)
            response_text = str(ollama_result.get("response", "") or "No response text.")
            applied = None

            if ollama_result.get("success"):
                rec = Plugin._parse_tdp_recommendation(response_text)
                if rec:
                    logger.info("ask_game_ai: parsed TDP recommendation: %s", rec)
                    loop = asyncio.get_running_loop()
                    applied = await loop.run_in_executor(None, Plugin._apply_tdp, rec)
                    logger.info("ask_game_ai: apply result: %s", applied)
                else:
                    logger.info("ask_game_ai: no TDP recommendation found in response")

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
            return {
                "success": False,
                "response": f"Backend error: {exc}",
                "app_id": app_id,
                "app_context": app_context,
                "applied": None,
                "elapsed_seconds": elapsed,
            }

    async def ask_game_ai(self, question: Any = "", PcIp: str = ""):
        logger.info("ask_game_ai: RPC entry (arg type=%s)", type(question).__name__)
        parsed_question, pc_ip, app_id, app_name, attachments = Plugin._parse_ask_payload(question, PcIp)
        if not parsed_question:
            logger.info("ask_game_ai: rejected (empty question)")
            return Plugin._reject_ask_request("Question is required.", app_id=app_id)
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
        if not pc_ip:
            return {
                "accepted": False,
                "status": "invalid",
                **Plugin._reject_ask_request("PC IP Address is required.", app_id=app_id),
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

    async def ask_ollama(
        self,
        question: str,
        PcIp: str,
        app_id: str,
        app_name: str,
        request_timeout_seconds: int = 120,
        attachments: Optional[list] = None,
    ):
        url = self._build_ollama_chat_url(PcIp)
        normalized_attachments = Plugin._sanitize_attachments(attachments or [])
        settings = await self.load_settings()
        screenshot_max_dimension = Plugin._sanitize_screenshot_max_dimension(
            settings.get("screenshot_max_dimension")
        )
        prepared_images, attachment_warnings, attachment_errors = Plugin._prepare_attachment_images(
            normalized_attachments,
            screenshot_max_dimension,
        )
        attachment_app_ids = sorted(
            {
                str(att.get("app_id", "") or "").strip()
                for att in normalized_attachments
                if str(att.get("app_id", "") or "").strip()
            }
        )

        if app_name:
            game_line = f"The currently running game is: {app_name} (AppID: {app_id})."
        elif app_id:
            game_line = f"The currently running game has AppID: {app_id} (name unknown)."
        else:
            game_line = "No game is currently running."
        attachment_name_pairs = []
        vdf_caption_hints = []
        vdf_shortcut_hints = []
        for candidate_app_id in attachment_app_ids:
            resolved_name = Plugin._lookup_steam_app_name(candidate_app_id)
            if resolved_name:
                attachment_name_pairs.append(f"{candidate_app_id}={resolved_name}")
        attachment_game_context_line = (
            f"Resolved game-title hints from attachment AppIDs: {', '.join(attachment_name_pairs)}."
            if attachment_name_pairs
            else (
                "Attachment metadata contains numeric Steam AppIDs, but no reliable title mapping was resolved. "
                "Do NOT treat numeric AppIDs as game titles."
                if attachment_app_ids
                else "No attachment AppID metadata is available."
            )
        )
        for attachment in normalized_attachments:
            hint = Plugin._lookup_screenshot_vdf_metadata(str(attachment.get("path", "") or ""))
            caption = str(hint.get("caption", "") or "").strip()
            shortcut_name = str(hint.get("shortcut_name", "") or "").strip()
            if caption:
                vdf_caption_hints.append(caption)
            if shortcut_name:
                vdf_shortcut_hints.append(shortcut_name)
        attachment_name_context_line = (
            f"Attachment AppID title hints from Steam manifests: {', '.join(attachment_name_pairs)}."
            if attachment_name_pairs
            else "No local Steam manifest title hints were resolved for attachment AppIDs."
        )
        vdf_context_line = (
            f"Attachment metadata hints from screenshots.vdf: shortcut names={', '.join(vdf_shortcut_hints)}; captions={', '.join(vdf_caption_hints)}."
            if (vdf_caption_hints or vdf_shortcut_hints)
            else "No useful screenshot-level hints were found in screenshots.vdf."
        )
        vision_line = (
            f"Visual context attachments provided: {len(prepared_images)}."
            if prepared_images
            else "No visual context attachments provided."
        )
        vision_priority_line = (
            "When images are provided, prioritize identifying gameplay/world content over Steam overlay or menu chrome. "
            "Treat Steam UI elements as secondary context unless the user asks specifically about the UI. "
            "Do not confidently name a specific game title unless visual evidence is strong and unambiguous. "
            "Require at least two distinct game-specific cues before naming a title. "
            "If those cues are not present, explicitly say uncertainty and describe only concrete visible elements. "
            "Never claim that a numeric AppID value is the game title."
        )
        genre_franchise_cue_line = (
            "Use recognizable in-game HUD motifs to improve game hypotheses. "
            "Examples: hearts + rupees + item C-button layout + temple-area labels strongly suggest Zelda Ocarina-style UI. "
            "When these cues are present, explicitly state the likely franchise/title hypothesis with confidence level. "
            "If the title hint says Ship of Harkinian, treat it as an Ocarina of Time remake/reimplementation context."
        )
        user_game_intent = bool(re.search(r"\b(game|title|level|boss|area)\b", question or "", flags=re.IGNORECASE))
        game_intent_line = (
            "The user is asking about the game itself. Focus first on in-game UI, world art style, HUD motifs, character design, "
            "and objective text. Minimize Steam overlay/plugin UI mentions unless absolutely necessary."
            if user_game_intent
            else "If the user asks about gameplay context, prioritize game-specific visual cues over Steam UI."
        )

        system_content = (
            "You are bonsAI, an expert system assistant embedded on a Steam Deck handheld. "
            "Always answer directly, concisely, and in English. "
            "The Steam Deck APU supports a TDP range of 3-15 watts and GPU clock of 200-1600 MHz. "
            "Never suggest power values outside these hardware limits. "
            f"{game_line} {attachment_game_context_line} {attachment_name_context_line} {vdf_context_line} {vision_line} {vision_priority_line} {genre_franchise_cue_line} {game_intent_line}\n\n"
            "IMPORTANT: When you recommend or apply a TDP or GPU clock change, you MUST include this exact JSON block in your response:\n"
            '```json\n{"tdp_watts": <int 3-15>, "gpu_clock_mhz": <int 200-1600 or null>}\n```\n'
            "Without this JSON block, the change will NOT be applied. Only include it when actively recommending a change."
        )
        user_message: dict = {"role": "user", "content": question}
        if prepared_images:
            user_message["images"] = [image["image_b64"] for image in prepared_images]
        messages = [{"role": "system", "content": system_content}, user_message]

        logger.info(
            "ask_ollama: url=%s game=%r appid=%s attachments=%d user_message=%r (len=%d)",
            url, app_name, app_id, len(prepared_images), question, len(question),
        )

        text_models_to_try = ["llama3:latest", "llama3", "gemma4:latest", "gemma4", "gemma3:latest"]
        vision_models_to_try = [
            "llava:latest",
            "llava",
            "bakllava:latest",
            "bakllava",
            "qwen2.5vl:latest",
            "qwen2.5vl",
            "moondream:latest",
            "moondream",
        ]
        requires_vision = len(prepared_images) > 0
        models_to_try = vision_models_to_try if requires_vision else text_models_to_try

        def _do_request(model_name: str):
            body_dict = {
                "model": model_name,
                "messages": messages,
                "stream": False,
                "keep_alive": -1,
                "options": {
                    "num_predict": 300,
                    "temperature": 0.2
                }
            }
            payload = json.dumps(body_dict).encode("utf-8")
            logger.info(
                "ask_ollama: POST %s model=%s payload_bytes=%d",
                url, model_name, len(payload),
            )
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=request_timeout_seconds) as resp:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw)
                    text = data.get("message", {}).get("content", "No response text.")
                    if normalized_attachments:
                        text += (
                            "\n\n[AttachDebug: "
                            f"requested={len(normalized_attachments)}, "
                            f"prepared={len(prepared_images)}, "
                            f"errors={len(attachment_errors)}]"
                        )
                    if attachment_errors:
                        text += "\n\n[Attachment errors: " + "; ".join(attachment_errors) + "]"
                    if attachment_warnings:
                        logger.info("ask_ollama: attachment warnings: %s", "; ".join(attachment_warnings))
                    logger.info(
                        "ask_ollama: OK model=%s response_len=%d first_200=%r",
                        model_name, len(text), text[:200],
                    )
                    return {
                        "success": True,
                        "response": text,
                        "model": model_name,
                    }
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                return {
                    "success": False,
                    "response": f"HTTP {e.code} from {url} using model '{model_name}': {body}",
                    "status": e.code,
                    "body": body,
                }
            except urllib.error.URLError as e:
                if isinstance(e.reason, (TimeoutError, socket.timeout)):
                    return {
                        "success": False,
                        "response": (
                            f"Ollama did not respond within {request_timeout_seconds} seconds. "
                            "Check that Ollama is running and your PC IP is correct."
                        ),
                    }
                return {
                    "success": False,
                    "response": f"Failed to reach {url} using model '{model_name}': {e}",
                }
            except Exception as e:
                return {
                    "success": False,
                    "response": f"Failed to reach {url} using model '{model_name}': {e}",
                }

        try:
            loop = asyncio.get_running_loop()
            last_failure = {"success": False, "response": "No model attempts executed."}

            for model_name in models_to_try:
                result = await loop.run_in_executor(None, _do_request, model_name)
                if result.get("success"):
                    return result

                last_failure = result
                body = (result.get("body") or "").lower()
                is_model_not_found = "not found" in body and "model" in body
                if is_model_not_found:
                    continue
                return result

            if requires_vision:
                return {
                    "success": False,
                    "response": (
                        "No vision-capable Ollama model was found for screenshot analysis. "
                        "Install a vision model such as llava, bakllava, qwen2.5vl, or moondream, "
                        "then try again."
                    ),
                }

            return last_failure
        except Exception as e:
            logger.error(f"Ollama request failed: {e}")
            return {"success": False, "response": str(e)}

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        raw = (pc_ip or "").strip()
        if not raw:
            return "http://127.0.0.1:11434/api/chat"

        if "//" not in raw:
            raw = f"http://{raw}"

        parsed = urlparse(raw)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 11434
        return f"http://{host}:{port}/api/chat"