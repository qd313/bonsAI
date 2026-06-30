"""
Steam screenshot listing, in-process capture, and image prep for Ollama multimodal requests.
Extracted from the Decky plugin entrypoint to keep `main.py` as RPC wiring.
"""

from __future__ import annotations

import base64
import glob
import io
import mimetypes
import os
import pwd
import re
import shutil
import subprocess
import time
from typing import Optional

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_ATTACHMENT_FILE_BYTES = 40 * 1024 * 1024
MAX_ATTACHMENT_INLINE_BYTES = 15 * 1024 * 1024


def resolve_recent_screenshot_paths(app_id: str = "", limit: int = 5) -> list:
    """Resolve recent screenshot paths across common Steam userdata roots."""
    app_filter = str(app_id or "").strip()
    safe_limit = max(1, min(48, int(limit)))
    home = os.path.expanduser("~")
    roots = [
        os.path.join(home, ".local", "share", "Steam", "userdata"),
        os.path.join(home, ".steam", "steam", "userdata"),
    ]
    app_patterns: list = []
    global_patterns: list = []
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


def resolve_plugin_capture_paths(runtime_dir: str, limit: int = 12) -> list:
    """Recent in-plugin captures written under ``<runtime>/captures``."""
    safe_limit = max(1, min(48, int(limit)))
    captures_dir = os.path.join(str(runtime_dir or "").strip(), "captures")
    if not captures_dir or not os.path.isdir(captures_dir):
        return []
    files: list = []
    for pattern in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        files.extend(glob.glob(os.path.join(captures_dir, pattern)))
    files = [path for path in set(files) if os.path.isfile(path)]
    files.sort(key=lambda path: os.path.getmtime(path), reverse=True)
    return files[:safe_limit]


def _list_steam_userdata_dirs() -> list[str]:
    """Return Steam userdata account directories (numeric folder names)."""
    home = os.path.expanduser("~")
    roots = [
        os.path.join(home, ".local", "share", "Steam", "userdata"),
        os.path.join(home, ".steam", "steam", "userdata"),
    ]
    user_dirs: list[str] = []
    seen: set[str] = set()
    for root in roots:
        if not os.path.isdir(root):
            continue
        for entry in glob.glob(os.path.join(root, "*")):
            if not os.path.isdir(entry):
                continue
            name = os.path.basename(entry)
            if not name.isdigit():
                continue
            canonical = os.path.realpath(entry)
            if canonical in seen:
                continue
            seen.add(canonical)
            user_dirs.append(entry)
    return user_dirs


def resolve_steam_screenshot_output_dir(app_id: str = "") -> Optional[str]:
    """Resolve (and create) the per-app Steam screenshots directory for new captures."""
    candidate = str(app_id or "").strip()
    if not candidate.isdigit():
        candidate = ""
    user_dirs = _list_steam_userdata_dirs()
    if not user_dirs:
        return None

    def shots_dir(uid_root: str, app: str) -> str:
        return os.path.join(uid_root, "760", "remote", app, "screenshots")

    if candidate:
        for uid_root in user_dirs:
            remote_root = os.path.join(uid_root, "760", "remote")
            if not os.path.isdir(remote_root):
                continue
            path = shots_dir(uid_root, candidate)
            try:
                os.makedirs(path, exist_ok=True)
                return path
            except OSError:
                continue

    best_app = ""
    best_mtime = 0.0
    for uid_root in user_dirs:
        remote_root = os.path.join(uid_root, "760", "remote")
        if not os.path.isdir(remote_root):
            continue
        for app_entry in glob.glob(os.path.join(remote_root, "*")):
            if not os.path.isdir(app_entry):
                continue
            app_num = os.path.basename(app_entry)
            if not app_num.isdigit():
                continue
            try:
                mtime = os.path.getmtime(app_entry)
            except OSError:
                mtime = 0.0
            if mtime > best_mtime:
                best_mtime = mtime
                best_app = app_num

    if best_app:
        for uid_root in user_dirs:
            remote_app = os.path.join(uid_root, "760", "remote", best_app)
            if os.path.isdir(remote_app):
                path = shots_dir(uid_root, best_app)
                os.makedirs(path, exist_ok=True)
                return path

    fallback_app = candidate or "0"
    for uid_root in user_dirs:
        path = shots_dir(uid_root, fallback_app)
        try:
            os.makedirs(path, exist_ok=True)
            return path
        except OSError:
            continue
    return None


def _capture_timestamp_key(path: str) -> str:
    match = re.search(r"(\d{8}-\d{6})", os.path.basename(path))
    return match.group(1) if match else ""


def _remove_capture_file(path: str) -> None:
    try:
        if path and os.path.isfile(path):
            os.remove(path)
    except OSError:
        pass


def _compress_capture_to_jpeg(path: str, clean_env: Optional[dict] = None) -> str:
    """Convert a capture file to compact RGB JPEG (gamescope atom PNGs are often 2MB+ RGBA)."""
    src = str(path or "").strip()
    if not src or not os.path.isfile(src):
        return src
    if os.path.splitext(src)[1].lower() == ".jpg":
        return src
    jpg_path = f"{os.path.splitext(src)[0]}.jpg"
    ffmpeg = shutil.which("ffmpeg")
    env = dict(clean_env or os.environ)
    if ffmpeg:
        try:
            result = subprocess.run(
                [ffmpeg, "-loglevel", "error", "-y", "-i", src, "-frames:v", "1", "-q:v", "3", jpg_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                timeout=30,
            )
            if result.returncode == 0 and os.path.isfile(jpg_path) and os.path.getsize(jpg_path) > 0:
                _remove_capture_file(src)
                return jpg_path
        except Exception:
            pass
    try:
        from PIL import Image  # type: ignore

        with Image.open(src) as image:
            image.load()
            rgb = image.convert("RGB")
        rgb.save(jpg_path, format="JPEG", quality=88, optimize=True)
        _remove_capture_file(src)
        return jpg_path
    except Exception:
        return src


def _finalize_steam_capture_file(path: str, clean_env: Optional[dict] = None) -> str:
    """Normalize gamescope compositor captures for Steam library listing and UI previews."""
    src = str(path or "").strip()
    if not src or not os.path.isfile(src):
        return src
    try:
        size_before = os.path.getsize(src)
    except OSError:
        return src
    needs_jpeg = size_before > 500_000
    if not needs_jpeg:
        try:
            from PIL import Image  # type: ignore

            with Image.open(src) as image:
                image.load()
                needs_jpeg = image.mode in ("RGBA", "LA", "P")
        except Exception:
            needs_jpeg = True
    if needs_jpeg:
        return _compress_capture_to_jpeg(src, clean_env)
    return src


def _reencode_oversized_capture(path: str, max_bytes: int = 900_000, clean_env: Optional[dict] = None) -> str:
    """Re-encode huge compositor/kmsgrab frames as JPEG so thumbnails stay usable."""
    src = str(path or "").strip()
    if not src or not os.path.isfile(src):
        return src
    try:
        if os.path.getsize(src) <= max_bytes:
            return src
    except OSError:
        return src
    return _compress_capture_to_jpeg(src, clean_env)


def try_qam_closed_compositor_capture(
    output_path: str,
    clean_env: dict,
    max_attempts: int = 3,
) -> dict:
    """
    Capture via gamescope compositor after QAM closes. Never uses kmsgrab (DRM dumps are huge and
    break in-plugin previews). Retries atom capture when the compositor is still settling.
    """
    errors: list[str] = []
    for attempt in range(max(1, max_attempts)):
        if attempt > 0:
            time.sleep(0.45)
        _remove_capture_file(output_path)

        for command in build_capture_command_candidates(output_path, True):
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
                    return _capture_success_item(output_path, "gamescope-screenshot")
                stderr = result.stderr.decode("utf-8", errors="replace").strip()
                errors.append(f"{' '.join(command)} -> {stderr or f'rc={result.returncode}'}")
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{' '.join(command)} -> {exc}")

        atom_modes = (False, True) if attempt == 0 else (True,)
        for include_overlay in atom_modes:
            _remove_capture_file(output_path)
            atom_result = try_gamescope_atom_screenshot(output_path, include_overlay, clean_env)
            if atom_result.get("success") and isinstance(atom_result.get("item"), dict):
                item = dict(atom_result["item"])
                item["capture_method"] = "gamescope-atom-base" if not include_overlay else "gamescope-atom"
                return {"success": True, "item": item}
            atom_error = str(atom_result.get("error", "")).strip()
            if atom_error:
                errors.append(atom_error)

    _remove_capture_file(output_path)
    error_text = "Compositor screenshot did not produce an image."
    if errors:
        error_text = f"{error_text} Attempts: {' | '.join(errors[:4])}"
    return {"success": False, "error": error_text}


def take_steam_game_screenshot(
    app_id: str,
    clean_env: dict,
    plugin_runtime_dir: str = "",
    qam_settle_seconds: float = 1.0,
) -> dict:
    """
    Capture the running game into Steam's per-app screenshots folder.
    Caller should close QAM after starting this RPC; ``qam_settle_seconds`` allows the compositor to settle.
    """
    if qam_settle_seconds > 0:
        time.sleep(qam_settle_seconds)
    shots_dir = resolve_steam_screenshot_output_dir(app_id)
    if not shots_dir:
        return {
            "success": False,
            "error": (
                "Could not find a Steam screenshots folder. Start a game first, "
                "or use Steam's screenshot button."
            ),
        }
    resolved_app_id = extract_app_id_from_screenshot_path(os.path.join(shots_dir, "x.png"))
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    output_path = os.path.join(shots_dir, f"{timestamp}.png")

    gs_result = try_qam_closed_compositor_capture(output_path, clean_env)
    if gs_result.get("success") and isinstance(gs_result.get("item"), dict):
        item = dict(gs_result["item"])
        raw_path = str(item.get("path", output_path))
        final_path = _finalize_steam_capture_file(raw_path, clean_env=clean_env)
        if not os.path.isfile(final_path):
            _remove_capture_file(raw_path)
            return {"success": False, "error": "Capture file could not be finalized."}
        item["path"] = final_path
        item["name"] = os.path.basename(final_path)
        item["source"] = "steam_recent"
        item["app_id"] = resolved_app_id
        try:
            item["size_bytes"] = os.path.getsize(final_path)
        except OSError:
            item["size_bytes"] = 0
        return {"success": True, "item": item}

    gs_error = str(gs_result.get("error", "")).strip()
    error_text = "Could not capture a game screenshot."
    if gs_error:
        error_text = f"{error_text} {gs_error}"
    return {"success": False, "error": error_text[:500]}


def _mirror_capture_to_plugin_dir(source_path: str, plugin_runtime_dir: str, timestamp: str) -> None:
    """Deprecated: steam screenshots folder is the single source of truth for recents."""
    del source_path, plugin_runtime_dir, timestamp


def merge_recent_screenshot_paths(
    steam_paths: list,
    plugin_paths: list,
    limit: int = 24,
) -> list:
    """Merge Steam and plugin capture paths, newest first."""
    safe_limit = max(1, min(48, int(limit)))
    combined: list[str] = []
    seen: set[str] = set()
    for path in list(steam_paths) + list(plugin_paths):
        try:
            canonical = os.path.realpath(path)
        except OSError:
            canonical = path
        if canonical in seen:
            continue
        seen.add(canonical)
        combined.append(path)

    def _mtime(p: str) -> float:
        try:
            return os.path.getmtime(p)
        except OSError:
            return 0.0

    combined.sort(key=_mtime, reverse=True)
    steam_timestamps: set[str] = set()
    for path in combined:
        normalized = path.replace("\\", "/")
        if "/760/remote/" in normalized and "/screenshots/" in normalized:
            ts = _capture_timestamp_key(path)
            if ts:
                steam_timestamps.add(ts)
    filtered: list[str] = []
    seen: set[str] = set()
    for path in combined:
        normalized = path.replace("\\", "/")
        ts = _capture_timestamp_key(path)
        if ts and "/captures/" in normalized and ts in steam_timestamps:
            continue
        if ts and os.path.basename(path).startswith("bonsai-game-") and ts in steam_timestamps:
            continue
        try:
            canonical = os.path.realpath(path)
        except OSError:
            canonical = path
        if canonical in seen:
            continue
        seen.add(canonical)
        filtered.append(path)
        if len(filtered) >= safe_limit:
            break
    return filtered


def lookup_steam_app_name(app_id: str) -> str:
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
        except OSError:
            continue
    return ""


def lookup_screenshot_vdf_metadata(screenshot_path: str) -> dict:
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
        window = raw[max(0, idx - 2200) : idx + 2200]
        caption_match = re.search(r'"caption"\s+"([^"]*)"', window, flags=re.IGNORECASE)
        shortcut_match = re.search(r'"shortcutname"\s+"([^"]*)"', window, flags=re.IGNORECASE)
        return {
            "caption": (caption_match.group(1).strip() if caption_match else ""),
            "shortcut_name": (shortcut_match.group(1).strip() if shortcut_match else ""),
        }
    except OSError:
        return {"caption": "", "shortcut_name": ""}


def extract_app_id_from_screenshot_path(path: str) -> str:
    """Extract the app id segment from Steam screenshot path patterns."""
    marker = f"{os.sep}760{os.sep}remote{os.sep}"
    if marker not in path:
        return ""
    tail = path.split(marker, 1)[1]
    return tail.split(os.sep, 1)[0].strip()


def build_screenshot_preview_data_uri(path: str, max_dimension: int = 220) -> Optional[str]:
    """Generate a compact preview data URI from screenshot files for UI thumbnails."""
    ext = os.path.splitext(path)[1].lower()
    if ext not in SUPPORTED_IMAGE_EXTENSIONS:
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
            with open(path, "rb") as f:
                raw = f.read()
            if file_size > 8_000_000:
                return None
            mime_type = mimetypes.guess_type(path)[0] or "image/png"
            encoded = base64.b64encode(raw).decode("ascii")
            return f"data:{mime_type};base64,{encoded}"
        except OSError:
            return None


def build_capture_command_candidates(output_path: str, include_overlay: bool) -> list:
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
        # Prefer focused/base capture only — do not fall back to full-frame commands that include QAM.
        return [cmd + ["--focused"] for cmd in candidates]
    return candidates


def gamescope_atom_screenshot_value(include_overlay: bool) -> str:
    """
    Gamescope X11 atom payload for GAMESCOPECTRL_REQUEST_SCREENSHOT.
    Protocol enum (gamescope-control.xml): 1=base_plane_only, 2=all_real_layers,
    3=full_composition, 4=screen_buffer.
    """
    return "3" if include_overlay else "1"


def gamescope_session_active() -> bool:
    """True when Game Mode compositor is likely active (gamescope or Steam gaming session)."""
    for proc_name in ("gamescope", "gamescope-wl", "steam"):
        try:
            result = subprocess.run(
                ["pgrep", "-x", proc_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2,
            )
            if result.returncode == 0 and result.stdout.strip():
                return True
        except Exception:
            continue
    return False


def _desktop_session_active() -> bool:
    """Heuristic: desktop compositor without gamescope (kmsgrab may hang)."""
    if gamescope_session_active():
        return False
    for proc_name in ("plasmashell", "kwin_wayland", "sway"):
        try:
            result = subprocess.run(
                ["pgrep", "-x", proc_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2,
            )
            if result.returncode == 0 and result.stdout.strip():
                return True
        except Exception:
            continue
    return False


def _capture_success_item(output_path: str, method: str = "capture") -> dict:
    return {
        "success": True,
        "item": {
            "path": output_path,
            "name": os.path.basename(output_path),
            "mtime": os.path.getmtime(output_path),
            "source": "capture",
            "app_id": "",
            "capture_method": method,
        },
    }


def _discover_x11_sessions(target_user: str = "deck") -> list[tuple[str, str]]:
    """Return (DISPLAY, XAUTHORITY) pairs from running Deck/gamescope processes."""
    sessions: list[tuple[str, str]] = []
    seen: set[str] = set()
    try:
        uid = pwd.getpwnam(target_user).pw_uid
    except KeyError:
        uid = 1000

    pids: set[int] = set()
    for proc_name in ("gamescope", "gamescope-wl", "steam", "steamwebhelper"):
        try:
            result = subprocess.run(
                ["pgrep", "-x", proc_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2,
            )
            for token in result.stdout.decode("utf-8", errors="replace").split():
                if token.isdigit():
                    pids.add(int(token))
        except Exception:
            continue
    try:
        result = subprocess.run(
            ["pgrep", "-u", str(uid)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=2,
        )
        for token in result.stdout.decode("utf-8", errors="replace").split()[:50]:
            if token.isdigit():
                pids.add(int(token))
    except Exception:
        pass

    for pid in pids:
        environ_path = f"/proc/{pid}/environ"
        try:
            with open(environ_path, "rb") as fp:
                chunks = fp.read().split(b"\0")
        except OSError:
            continue
        env: dict[str, str] = {}
        for chunk in chunks:
            if b"=" not in chunk:
                continue
            key, value = chunk.split(b"=", 1)
            env[key.decode("utf-8", errors="replace")] = value.decode("utf-8", errors="replace")
        display = env.get("DISPLAY", "").strip()
        if not display:
            continue
        xauthority = env.get("XAUTHORITY", "").strip()
        dedupe = f"{display}|{xauthority}"
        if dedupe in seen:
            continue
        seen.add(dedupe)
        sessions.append((display, xauthority))

    for display in (":0", ":1", ":2"):
        dedupe = f"{display}|"
        if dedupe in seen:
            continue
        seen.add(dedupe)
        sessions.append((display, ""))
    return sessions


def try_gamescope_atom_screenshot(output_path: str, include_overlay: bool, clean_env: dict) -> dict:
    """
    Trigger Gamescope's composited screenshot via X11 atom when ``gamescope-screenshot`` is absent.
    Output lands in ``/tmp/gamescope.png``; copy to ``output_path`` on success.
    """
    if shutil.which("xprop") is None:
        return {"success": False, "error": "xprop unavailable for gamescope atom capture."}

    gs_out = "/tmp/gamescope.png"
    atom_value = gamescope_atom_screenshot_value(include_overlay)
    errors: list[str] = []
    request_epoch = int(time.time())
    min_png_bytes = 50_000

    for display, xauthority in _discover_x11_sessions():
        try:
            if os.path.isfile(gs_out):
                os.remove(gs_out)
        except OSError:
            pass

        cmd = [
            "xprop",
            "-root",
            "-f",
            "GAMESCOPECTRL_REQUEST_SCREENSHOT",
            "32c",
            "-set",
            "GAMESCOPECTRL_REQUEST_SCREENSHOT",
            atom_value,
        ]
        env = dict(clean_env)
        env["DISPLAY"] = display
        if xauthority:
            env["XAUTHORITY"] = xauthority
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                timeout=6,
            )
            if result.returncode != 0:
                stderr = result.stderr.decode("utf-8", errors="replace").strip()
                errors.append(f"xprop {display} -> {stderr or f'rc={result.returncode}'}")
                continue
        except Exception as exc:  # noqa: BLE001
            errors.append(f"xprop {display} -> {exc}")
            continue

        for _ in range(20):
            if os.path.isfile(gs_out) and os.path.getsize(gs_out) >= min_png_bytes:
                try:
                    mtime = int(os.path.getmtime(gs_out))
                except OSError:
                    mtime = 0
                if mtime >= request_epoch:
                    shutil.copy2(gs_out, output_path)
                    return _capture_success_item(output_path, "gamescope-atom")
            time.sleep(0.25)
        errors.append(f"xprop {display} -> /tmp/gamescope.png not produced or stale")

    error_text = "Gamescope atom screenshot did not produce an image."
    if errors:
        error_text = f"{error_text} Attempts: {' | '.join(errors[:3])}"
    return {"success": False, "error": error_text}


def _sudo_nopasswd_available(clean_env: dict) -> bool:
    if shutil.which("sudo") is None:
        return False
    try:
        probe = subprocess.run(
            ["sudo", "-n", "true"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=clean_env,
            timeout=3,
        )
        return probe.returncode == 0
    except Exception:
        return False


def _fix_capture_file_ownership(path: str, clean_env: dict) -> None:
    try:
        uid = os.getuid()
        gid = os.getgid()
        if os.stat(path).st_uid == uid:
            return
    except OSError:
        return
    if not _sudo_nopasswd_available(clean_env):
        return
    try:
        subprocess.run(
            ["sudo", "-n", "chown", f"{os.getuid()}:{os.getgid()}", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=clean_env,
            timeout=5,
        )
    except Exception:
        pass


def _build_kmsgrab_argv(ffmpeg: str, output_path: str) -> list[str]:
    cmd = [
        ffmpeg,
        "-loglevel",
        "error",
        "-device",
        "/dev/dri/card0",
        "-f",
        "kmsgrab",
        "-i",
        "-",
        "-vframes",
        "1",
        "-vf",
        "hwmap=derive_device=vaapi,hwdownload,format=bgr0",
        "-y",
        output_path,
    ]
    timeout_bin = shutil.which("timeout")
    if timeout_bin:
        return [timeout_bin, "90", *cmd]
    return cmd


def try_kmsgrab_screenshot(output_path: str, clean_env: dict) -> dict:
    """
    Capture the DRM primary plane via ffmpeg kmsgrab (game content without QAM/overlay stack).
    Decky runs as ``deck`` without DRM master; passwordless ``sudo -n`` kmsgrab matches maintainer scripts.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return {"success": False, "error": "ffmpeg unavailable for kmsgrab capture."}
    if not os.path.exists("/dev/dri/card0"):
        return {"success": False, "error": "DRM device /dev/dri/card0 not found."}

    errors: list[str] = []
    runners: list[tuple[str, list[str]]] = [("kmsgrab", [])]
    if _sudo_nopasswd_available(clean_env):
        runners.append(("kmsgrab-sudo", ["sudo", "-n"]))

    for method, prefix in runners:
        try:
            if os.path.isfile(output_path):
                os.remove(output_path)
        except OSError:
            pass
        cmd = [*prefix, *_build_kmsgrab_argv(ffmpeg, output_path)]
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=clean_env,
                timeout=95,
            )
            if result.returncode == 0 and os.path.isfile(output_path) and os.path.getsize(output_path) > 0:
                _fix_capture_file_ownership(output_path, clean_env)
                return _capture_success_item(output_path, method)
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            errors.append(f"{method} -> {stderr or f'rc={result.returncode}'}")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{method} -> {exc}")

    error_text = errors[0] if len(errors) == 1 else " | ".join(errors[:2])
    return {"success": False, "error": error_text}


def try_gamescope_screenshot_capture(output_path: str, include_overlay: bool, clean_env: dict) -> dict:
    """
    Run gamescope-screenshot candidates until one produces a non-empty file at output_path.
    Returns the same dict shape as the legacy `capture_screenshot` RPC success/failure.
    """
    errors: list = []

    if not include_overlay:
        # gamescope atom (even base_plane_only) still includes QAM on SteamOS — use kmsgrab only.
        if _desktop_session_active():
            return {
                "success": False,
                "error": (
                    "Could not capture what's behind the menu to attach. "
                    "Switch to Game Mode with a game running, or use Attach recent screenshot."
                ),
            }
        kms_result = try_kmsgrab_screenshot(output_path, clean_env)
        if kms_result.get("success"):
            return kms_result
        kms_error = str(kms_result.get("error", "")).strip()
        error_text = (
            "Could not capture what's behind the menu to attach. "
            "Try Game Mode with a game running, or use Attach recent screenshot."
        )
        if not _sudo_nopasswd_available(clean_env):
            error_text = (
                f"{error_text} Game-plane capture needs passwordless sudo on the Deck "
                "(run scripts/setup-dev.ps1 once, or use Attach recent screenshot)."
            )
        if kms_error:
            error_text = f"{error_text} Attempts: {kms_error}"
        return {"success": False, "error": error_text}

    for command in build_capture_command_candidates(output_path, include_overlay):
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
                return _capture_success_item(output_path, "gamescope-screenshot")
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            errors.append(f"{' '.join(command)} -> {stderr or f'rc={result.returncode}'}")
        except Exception as exc:  # noqa: BLE001 — surface attempt errors
            errors.append(f"{' '.join(command)} -> {exc}")

    atom_result = try_gamescope_atom_screenshot(output_path, include_overlay, clean_env)
    if atom_result.get("success"):
        return atom_result
    atom_error = str(atom_result.get("error", "")).strip()
    if atom_error:
        errors.append(atom_error)

    error_text = "No supported screenshot capture command succeeded."
    if errors:
        error_text = f"{error_text} Attempts: {' | '.join(errors[:3])}"
    return {"success": False, "error": error_text}


def encode_image_with_pillow(
    path: str, attachment_preset: str
) -> tuple[Optional[str], Optional[str], list]:
    """Resize and encode images with Pillow using Low / Mid / Max attachment preset."""
    warnings: list = []
    if attachment_preset not in ("low", "mid", "max"):
        attachment_preset = "low"
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return None, None, ["Pillow is unavailable; sent original image bytes."]

    try:
        with Image.open(path) as image:
            image.load()
            width, height = image.size
            longest_edge = max(width, height)
            if attachment_preset == "low":
                max_dim = 800
                quality = 62
            elif attachment_preset == "mid":
                max_dim = 1080
                quality = 75
            else:
                max_dim = 16384
                quality = 94

            if attachment_preset == "mid" and longest_edge > 1080:
                ratio = 1080 / float(longest_edge)
                resized = image.resize((max(1, int(width * ratio)), max(1, int(height * ratio))), Image.LANCZOS)
            elif attachment_preset == "mid":
                resized = image.copy()
            elif longest_edge > max_dim:
                ratio = max_dim / float(longest_edge)
                resized = image.resize((max(1, int(width * ratio)), max(1, int(height * ratio))), Image.LANCZOS)
            else:
                resized = image.copy()
            if resized.mode not in ("RGB", "L"):
                resized = resized.convert("RGB")
            elif resized.mode == "L":
                resized = resized.convert("RGB")

            output = io.BytesIO()
            resized.save(output, format="JPEG", quality=quality, optimize=True)
            data = output.getvalue()
            return base64.b64encode(data).decode("ascii"), "image/jpeg", warnings
    except Exception as exc:  # noqa: BLE001 — corrupt/huge images must not crash Ask RPC
        return None, None, [f"Pillow could not process image: {exc}"]


def prepare_image_attachment(attachment: dict, attachment_preset: str) -> dict:
    """Validate, transform, and encode one image attachment for Ollama multimodal requests."""
    path = str(attachment.get("path", "") or "").strip()
    if not path:
        return {"ok": False, "error": "Attachment path is empty."}
    if not os.path.isfile(path):
        return {"ok": False, "error": f"Attachment file not found: {path}"}
    ext = os.path.splitext(path)[1].lower()
    if ext not in SUPPORTED_IMAGE_EXTENSIONS:
        return {"ok": False, "error": f"Unsupported image type '{ext}'."}
    file_size = os.path.getsize(path)
    if file_size > MAX_ATTACHMENT_FILE_BYTES:
        return {"ok": False, "error": f"Image is too large ({file_size} bytes)."}

    encoded, mime_type, warnings = encode_image_with_pillow(path, attachment_preset)
    if encoded is None:
        with open(path, "rb") as f:
            raw = f.read()
        if len(raw) > MAX_ATTACHMENT_INLINE_BYTES:
            return {
                "ok": False,
                "error": (
                    f"Image inline payload is too large ({len(raw)} bytes). "
                    "Install Pillow or lower the screenshot attachment quality (Settings)."
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


def prepare_attachment_images(attachments: list, attachment_preset: str) -> tuple[list, list, list]:
    """Prepare a batch of attachments and return successful images, warnings, and errors."""
    prepared_images: list = []
    warnings: list = []
    errors: list = []
    for attachment in attachments:
        prepared = prepare_image_attachment(attachment, attachment_preset)
        if prepared.get("ok"):
            prepared_images.append(prepared)
            warnings.extend(prepared.get("warnings", []))
        else:
            errors.append(str(prepared.get("error", "Failed to prepare attachment.")))
    return prepared_images, warnings, errors
