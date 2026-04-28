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
import re
import shutil
import subprocess
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
            if file_size > 1_800_000:
                return None
            with open(path, "rb") as f:
                raw = f.read()
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
        candidates = [cmd + ["--focused"] for cmd in candidates] + candidates
    return candidates


def try_gamescope_screenshot_capture(output_path: str, include_overlay: bool, clean_env: dict) -> dict:
    """
    Run gamescope-screenshot candidates until one produces a non-empty file at output_path.
    Returns the same dict shape as the legacy `capture_screenshot` RPC success/failure.
    """
    errors: list = []
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
        except Exception as exc:  # noqa: BLE001 — surface attempt errors
            errors.append(f"{' '.join(command)} -> {exc}")

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
