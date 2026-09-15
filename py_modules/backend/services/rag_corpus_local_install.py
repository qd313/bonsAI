"""Title: Knowledge base install from a folder

Purpose: Install a knowledge base from a folder already on the Deck, with no network.
Used for: The Developer tab's local install, through one RPC method.
Solves: Four ways this can be refused before any file is touched -- the Developer tab is
        off, no notes file in the folder, a folder that is not allowed to be installed
        into, and the install itself failing -- each with a message that says which.
Does not: Download anything, or save settings. It says what should be saved; the caller
          saves it, because settings belong to the plugin object.

Lifted out of main.py on 2026-09-14 with the decisions unchanged. It had no test of its
own before the move; the part that decides has one now.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import threading
from dataclasses import dataclass
from typing import Any, Callable, Optional

from backend.services.knowledge_base_schema import (
    CORPUS_MANIFEST_FILENAME,
    default_corpus_dir_internal,
    default_seed_corpus_source_dir,
    load_manifest_from_path,
    sanitize_corpus_install_dir,
)
from backend.services.rag_corpus_download_service import install_corpus_from_manifest

DEVELOPER_TAB_OFF_ERROR = "Developer tab must be enabled for local corpus install."


@dataclass(frozen=True)
class LocalInstallOutcome:
    """What to hand back to the screen, and what the caller should save if anything."""

    result: dict[str, Any]
    settings_to_save: Optional[dict[str, Any]] = None


@dataclass(frozen=True)
class InstallPlan:
    """Where to read from and where to write to, once everything has been checked."""

    source_dir: str
    manifest_path: str
    install_dir: str


def plan_local_install(settings: dict, data: Any) -> tuple[Optional[InstallPlan], Optional[str]]:
    """Work out where to install from and to, or say why it cannot be done.

    Every refusal happens here, before a single file is touched, so the checks can be
    tested without a knowledge base on disk.
    """
    if not settings.get("show_developer_tab"):
        return None, DEVELOPER_TAB_OFF_ERROR

    source_dir = ""
    if isinstance(data, dict):
        source_dir = str(data.get("source_dir") or data.get("path") or "").strip()
    if not source_dir:
        source_dir = default_seed_corpus_source_dir()
    source_dir = os.path.expanduser(str(source_dir).strip())

    manifest_path = os.path.join(source_dir, CORPUS_MANIFEST_FILENAME)
    if not os.path.isfile(manifest_path):
        return None, f"Missing {CORPUS_MANIFEST_FILENAME} at {source_dir}"

    install_dir = default_corpus_dir_internal()
    if isinstance(data, dict) and str(data.get("install_path") or "").strip():
        install_dir = str(data.get("install_path")).strip()
    try:
        install_dir = sanitize_corpus_install_dir(os.path.expanduser(install_dir))
    except ValueError as exc:
        return None, str(exc)

    return InstallPlan(source_dir=source_dir, manifest_path=manifest_path, install_dir=install_dir), None


def _install_blocking(plan: InstallPlan) -> str:
    manifest = load_manifest_from_path(plan.manifest_path)
    cancel = threading.Event()
    logs: list[str] = []

    def log(msg: str) -> None:
        logs.append(msg)

    # Copy compressed chunk from source_dir if present
    chunks = manifest.get("chunks") or []
    if chunks and isinstance(chunks[0], dict):
        fname = str(chunks[0].get("filename") or "")
        src_chunk = os.path.join(plan.source_dir, fname)
        if os.path.isfile(src_chunk):
            os.makedirs(plan.install_dir, exist_ok=True)
            shutil.copy2(src_chunk, os.path.join(plan.install_dir, fname))
    return install_corpus_from_manifest(
        manifest,
        plan.install_dir,
        cancel_event=cancel,
        log=log,
    )


async def install_rag_corpus_from_local_dir(
    settings: dict,
    data: Any = None,
    run_install: Optional[Callable[[InstallPlan], str]] = None,
) -> LocalInstallOutcome:
    """Install from a folder on the Deck. `run_install` is swapped out in tests."""
    plan, refusal = plan_local_install(settings, data)
    if plan is None:
        return LocalInstallOutcome(result={"ok": False, "error": refusal})

    do_install = run_install or _install_blocking
    try:
        root = await asyncio.to_thread(do_install, plan)
        manifest = load_manifest_from_path(os.path.join(root, CORPUS_MANIFEST_FILENAME))
        version = str(manifest.get("version") or "")
        return LocalInstallOutcome(
            result={"ok": True, "install_path": root, "version": version},
            settings_to_save={
                "rag_corpus_path": root,
                "rag_corpus_version": version,
                "use_local_knowledge_base": True,
            },
        )
    except Exception as exc:
        return LocalInstallOutcome(result={"ok": False, "error": str(exc)})
