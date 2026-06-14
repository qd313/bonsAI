"""Host clipboard read for Decky when the WebView cannot use ``navigator.clipboard``."""

from __future__ import annotations

import os
import subprocess
from typing import Any

from backend.services.tdp_service import clean_env

_SCRIPT_DIR = os.path.join(os.path.dirname(__file__), "..", "scripts")
_READ_HOST_CLIPBOARD_SH = os.path.normpath(os.path.join(_SCRIPT_DIR, "read_host_clipboard.sh"))
_MAX_CLIPBOARD_CHARS = 65536


def read_host_clipboard_text(logger: Any) -> dict[str, Any]:
    """Run ``read_host_clipboard.sh``; return ``{success, text}`` or ``{success: False, error}``."""
    if not os.path.isfile(_READ_HOST_CLIPBOARD_SH):
        return {"success": False, "error": "Clipboard helper script is missing."}
    env = clean_env()
    env.setdefault("BONSAI_CLIPBOARD_MAX_BYTES", str(_MAX_CLIPBOARD_CHARS))
    try:
        proc = subprocess.run(
            ["/bin/bash", _READ_HOST_CLIPBOARD_SH],
            capture_output=True,
            text=True,
            timeout=6,
            env=env,
        )
    except subprocess.TimeoutExpired:
        logger.info("read_host_clipboard: timed out")
        return {"success": False, "error": "Clipboard read timed out."}
    except Exception as exc:  # noqa: BLE001
        logger.info("read_host_clipboard: failed: %s", exc)
        return {"success": False, "error": "Clipboard read failed."}

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip() or "Clipboard empty or unavailable."
        logger.info("read_host_clipboard: exit=%s err=%s", proc.returncode, err[:200])
        return {"success": False, "error": err[:500]}

    text = (proc.stdout or "").replace("\x00", "")
    if len(text) > _MAX_CLIPBOARD_CHARS:
        text = text[:_MAX_CLIPBOARD_CHARS]
    if not text.strip():
        return {"success": False, "error": "Clipboard empty."}
    return {"success": True, "text": text}
