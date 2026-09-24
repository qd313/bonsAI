"""Title: Screenshots, the Desktop debug log, clipboard, and small one-off reads

Purpose: A grab bag of calls the screen makes that do not belong to one bigger feature:
browse recent screenshots for attaching to a question, take one on the spot, write to
the Desktop debug/chat/app logs a person can open in a text editor, read or write the
system clipboard when the WebView's own clipboard API cannot, and hand back the last
Ask's full prompt, the effective reply language, and a thumbs up/down. Each stays a
method of the same name on the plugin class in main.py; the method's body is now a
one-line hand-off to the function here.

Used for: list_recent_screenshots, append_desktop_debug_note, append_desktop_chat_event,
append_app_log, get_input_transparency, get_reply_language_snapshot, save_ask_feedback,
read_host_clipboard_text, write_host_clipboard_text, take_steam_screenshot.

Solves: Keeps this long tail of small, mostly-independent RPC bodies out of main.py.

Does not: Own the always-on background app-activity log (``_maybe_app_log``) or the
verbose per-Ask transparency trace (``_persist_input_transparency``) -- both stay on the
Plugin class itself, since the Ask flow and other RPC groups call them directly, not
just the ones this file covers.
"""

import asyncio
import os
from typing import Any

from backend.services.capabilities import capability_enabled
from backend.services.desktop_note_service import (
    append_app_log_sync,
    append_desktop_chat_event_sync,
    append_desktop_debug_note_sync,
)
from backend.services.reply_language_service import reply_language_snapshot
from backend.services.screenshot_media import (
    build_screenshot_preview_data_uri,
    extract_app_id_from_screenshot_path,
    merge_recent_screenshot_paths,
    resolve_plugin_capture_paths,
    resolve_recent_screenshot_paths,
    take_steam_game_screenshot,
)

import decky

logger = decky.logger


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
    # Called through the class, as main.py always did: this helper is written without `self`, so a
    # call through the instance passes one argument too many (plan 65 moved this body; the Deck
    # check caught every activity-log line failing).
    if not type(self)._desktop_app_log_level_allows(settings, event_level):
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
        clean_env = self._clean_env()
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
