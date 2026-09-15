"""Title: Reading and writing the Deck's own clipboard

Purpose: The panel is drawn in a small embedded browser, and that browser's own
copy-and-paste does not reliably reach the Deck's system-wide clipboard -- reading it back
in particular is blocked outright. This file is the fallback: two small shell scripts,
already installed with the plugin, that ask the Deck itself to read or write the
clipboard, run with a short timeout so a stuck script cannot hang an Ask.
Used for: Pasting into the Ask box from the clipboard, and the Copy button on a reply.
Both try the browser's own copy-and-paste first and only call through to here when that
does not work.
Solves: Getting text on and off the Deck's real clipboard from inside the plugin's panel,
in a bounded amount of time, with a plain success-or-error result either caller can show
on screen.
Does not: Work if the two helper scripts are missing from disk. Retry a failed write --
one attempt per call, because a write only reaches this file after the browser's own
copy-and-paste has already failed once (see docs/archive/clipboard-spike-2026-08-28.md).
"""

from __future__ import annotations

import os
import subprocess
from typing import Any

from backend.services.tdp_service import clean_env

_SCRIPT_DIR = os.path.join(os.path.dirname(__file__), "..", "scripts")
_READ_HOST_CLIPBOARD_SH = os.path.normpath(os.path.join(_SCRIPT_DIR, "read_host_clipboard.sh"))
_WRITE_HOST_CLIPBOARD_SH = os.path.normpath(os.path.join(_SCRIPT_DIR, "write_host_clipboard.sh"))
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


def write_host_clipboard_text(text: str, logger: Any) -> dict[str, Any]:
    """Run ``write_host_clipboard.sh`` with `text` on stdin; return ``{success}`` or ``{success: False, error}``.

    ``start_new_session=True`` puts the launched process (and whatever it forks — `wl-copy` daemonizes
    itself to hold the Wayland selection after this call returns) in its own session, so a signal sent
    to this plugin backend's process group cannot reach it. That is a real, desk-verifiable mitigation
    for one failure mode; whether the selection survives a plugin reload or QAM close is a different
    question this desk cannot answer — see docs/audit/clipboard-spike-2026-08-28.md.
    """
    if not isinstance(text, str) or not text.strip():
        return {"success": False, "error": "Nothing to copy."}
    if not os.path.isfile(_WRITE_HOST_CLIPBOARD_SH):
        return {"success": False, "error": "Clipboard helper script is missing."}

    payload = text[:_MAX_CLIPBOARD_CHARS]
    env = clean_env()

    try:
        proc = subprocess.Popen(
            ["/bin/bash", _WRITE_HOST_CLIPBOARD_SH],
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            start_new_session=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.info("write_host_clipboard: failed to start: %s", exc)
        return {"success": False, "error": "Clipboard write failed to start."}

    try:
        _, stderr = proc.communicate(input=payload, timeout=6)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        logger.info("write_host_clipboard: timed out")
        return {"success": False, "error": "Clipboard write timed out."}
    except Exception as exc:  # noqa: BLE001
        logger.info("write_host_clipboard: failed: %s", exc)
        return {"success": False, "error": "Clipboard write failed."}

    if proc.returncode != 0:
        err = (stderr or "").strip() or "Clipboard write failed (host tool unavailable)."
        logger.info("write_host_clipboard: exit=%s err=%s", proc.returncode, err[:200])
        return {"success": False, "error": err[:500]}

    return {"success": True}
