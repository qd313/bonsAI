"""Title: The knowledge base's own download, update and remove buttons

Purpose: The offline knowledge base is a folder of notes downloaded once and kept on
disk. This file is the screen's seven calls for that: check its status, start the
download, cancel one in progress, check for and pull an update, remove it, install one
from a local folder for testing, and pull the preset-chip suggestions it can offer for
the game you're playing. Each stays a method of the same name on the plugin class in
main.py; the method's body is now a one-line hand-off to the function here.

Used for: get_rag_corpus_status, start_rag_corpus_download, cancel_rag_corpus_download,
update_rag_corpus, remove_rag_corpus, install_rag_corpus_local,
get_session_rag_chip_candidates.

Solves: Keeps the knowledge-base panel's own RPC bodies -- the background-download
task, its cancel flag, and the chip-candidate lookup -- out of main.py.

Does not: Do the actual download, or read the notes themselves -- those are
`rag_corpus_download_service.py`, `rag_corpus_local_install.py` and
`knowledge_base_service.py`. This file only starts/stops/polls that work and shapes
what goes back to the screen.
"""

import asyncio
import os
from typing import Any

from backend.services.async_background_job import new_asyncio_cancel_event
from backend.services.knowledge_base_schema import (
    default_corpus_dir_internal,
    resolve_corpus_db_path,
    sanitize_corpus_install_dir,
)
from backend.services.knowledge_base_service import (
    session_rag_chip_candidates_to_rpc,
    suggest_chip_candidates,
)
from backend.services.rag_corpus_download_service import (
    fetch_remote_manifest,
    new_rag_corpus_download_state,
    remove_corpus_at_path,
    run_rag_corpus_download,
)
from backend.services.rag_corpus_local_install import install_rag_corpus_from_local_dir
from backend.services.rag_corpus_status import build_rag_corpus_status

import decky

logger = decky.logger


async def get_rag_corpus_status(self, data: Any = None):
    """Return knowledge-base download state and whether a corpus is installed."""
    settings = await self.load_settings()
    return build_rag_corpus_status(
        settings, data, dict(self._rag_corpus_download_state)
    )


async def start_rag_corpus_download(self, data: Any = None):
    """Download and install the knowledge base corpus (user-initiated; Model A consent)."""
    install_dir = default_corpus_dir_internal()
    storage = "internal"
    if isinstance(data, dict):
        custom = str(data.get("install_path") or data.get("path") or "").strip()
        if custom:
            install_dir = custom
        storage = str(data.get("storage") or storage).strip().lower()
    install_dir = os.path.expanduser(install_dir)
    try:
        install_dir = sanitize_corpus_install_dir(install_dir)
    except ValueError as exc:
        return {"accepted": False, "reason": str(exc)}

    try:
        os.makedirs(os.path.dirname(os.path.expanduser(install_dir)) or ".", exist_ok=True)
    except OSError as exc:
        return {"accepted": False, "reason": f"Could not create install folder: {exc}"}

    async with self._rag_corpus_download_lock:
        existing = self._rag_corpus_download_task
        if existing is not None and not existing.done():
            return {"accepted": False, "reason": "Knowledge base download already running."}

        self._rag_corpus_cancel_event = new_asyncio_cancel_event()
        self._rag_corpus_download_state = new_rag_corpus_download_state()
        self._rag_corpus_download_state.update(
            {
                "phase": "running",
                "done": False,
                "accepted": True,
                "install_path": install_dir,
                "stage": "queued",
            }
        )

        async def save_installed_corpus(root: str, version: str) -> None:
            await self.save_settings(
                {
                    "rag_corpus_path": str(root or install_dir),
                    "rag_corpus_version": str(version or ""),
                    "use_local_knowledge_base": True,
                }
            )

        async def runner() -> None:
            assert self._rag_corpus_cancel_event is not None
            await run_rag_corpus_download(
                install_dir=install_dir,
                state=self._rag_corpus_download_state,
                logger=logger,
                cancel_event=self._rag_corpus_cancel_event,
                on_installed=save_installed_corpus,
            )

        self._rag_corpus_download_task = asyncio.create_task(runner())

    await self._maybe_app_log(
        "rag_corpus.start",
        "knowledge base download accepted",
        fields={"install_path": install_dir, "storage": storage},
    )
    return {"accepted": True, "install_path": install_dir}


async def cancel_rag_corpus_download(self):
    ce = getattr(self, "_rag_corpus_cancel_event", None)
    if isinstance(ce, asyncio.Event):
        ce.set()
    # Mutate the existing dict in place rather than rebinding the attribute — the running
    # download task was handed this exact object by reference (start_rag_corpus_download's
    # runner()) and keeps writing progress/phase to it. Reassigning self._rag_corpus_download_state
    # to a new dict here would silently orphan the task's reference: every write after cancel
    # (phase -> "cancelled", done -> True, error) would land on a dict nothing else can see,
    # and status polls would show "running" forever.
    self._rag_corpus_download_state["cancel_requested"] = True
    return {"cancel_requested": True}


async def update_rag_corpus(self):
    """Check remote manifest and re-download when version differs."""
    settings = await self.load_settings()
    try:
        manifest = await asyncio.to_thread(fetch_remote_manifest)
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
    remote_ver = str(manifest.get("version") or "")
    local_ver = str(settings.get("rag_corpus_version") or "")
    if remote_ver and remote_ver == local_ver and resolve_corpus_db_path(settings):
        return {"ok": True, "updated": False, "version": local_ver}
    out = await self.start_rag_corpus_download(
        {"install_path": settings.get("rag_corpus_path") or default_corpus_dir_internal()}
    )
    return {"ok": bool(out.get("accepted")), "updated": True, "version": remote_ver, **out}


async def remove_rag_corpus(self):
    """Remove installed corpus files and clear path settings."""
    settings = await self.load_settings()
    path = str(settings.get("rag_corpus_path") or "").strip()
    removed = False
    if path:
        removed = await asyncio.to_thread(remove_corpus_at_path, path, logger)
    await self.save_settings(
        {
            "rag_corpus_path": "",
            "rag_corpus_version": "",
            "use_local_knowledge_base": False,
        }
    )
    return {"ok": True, "removed": removed}


async def install_rag_corpus_local(self, data: Any = None):
    """Dev/QA: install corpus from a local manifest directory (no network)."""
    settings = await self.load_settings()
    outcome = await install_rag_corpus_from_local_dir(settings, data)
    if outcome.settings_to_save:
        await self.save_settings(outcome.settings_to_save)
    return outcome.result


async def get_session_rag_chip_candidates(
    self,
    app_id: str = "",
    app_name: str = "",
    shortcut_name: str = "",
):
    """Preset-chip prompts drawn from the offline KB for the running game."""
    settings = await self.load_settings()
    try:
        result = await asyncio.to_thread(
            suggest_chip_candidates,
            settings,
            app_id=str(app_id or "").strip(),
            app_name=str(app_name or "").strip(),
            shortcut_name=str(shortcut_name or "").strip(),
        )
    except Exception:
        logger.exception("get_session_rag_chip_candidates failed")
        return {"ok": False, "reason": "chip_candidates_failed", "candidates": []}

    payload = session_rag_chip_candidates_to_rpc(result)
    # An unreadable corpus is a real fault, not "this game has no tips", and the
    # carousel retries after every Ask -- so record it once per distinct fault
    # instead of on every call. Cleared on success so a later break logs again.
    reason = str(payload.get("reason") or "")
    fault = reason if reason.startswith("corpus_error") else ""
    if fault and fault != getattr(self, "_last_chip_candidates_fault", ""):
        logger.warning("get_session_rag_chip_candidates: knowledge base unreadable (%s)", fault)
    self._last_chip_candidates_fault = fault
    return payload
