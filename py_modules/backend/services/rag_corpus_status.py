"""Title: Knowledge base status

Purpose: Say what the knowledge base is doing: installed or not, where it lives, whether
         its meaning-search vectors are filled in, and where there is room to put it.
Used for: The Knowledge base section on the Connection tab, through one RPC method.
Solves: Gathering that answer is not the entry point's job, and it was 53 lines of it.
Does not: Download, install or remove anything -- see rag_corpus_download_service.

Lifted out of main.py on 2026-09-14 with the answers unchanged. It had no test of its
own before the move; it has one now.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable, Optional

from backend.constants import DEFAULT_OLLAMA_PCIP
from backend.services.knowledge_base_schema import (
    corpus_manifest_path,
    default_corpus_dir_internal,
    list_rag_storage_options,
    load_manifest_from_path,
    resolve_corpus_db_path,
)
from backend.services.ollama_embed_service import nomic_embed_available

logger = logging.getLogger("bonsai")


@dataclass(frozen=True)
class StatusTools:
    """The outside things this answer needs, so a test can hand it fakes."""

    resolve_db_path: Callable[[dict], Any] = resolve_corpus_db_path
    manifest_path_for: Callable[[str], Any] = corpus_manifest_path
    load_manifest: Callable[[Any], dict] = load_manifest_from_path
    embed_model_available: Callable[[str], bool] = nomic_embed_available
    storage_options: Callable[[], dict] = list_rag_storage_options
    internal_dir: Callable[[], str] = default_corpus_dir_internal


def pc_ip_for_status(settings: dict, data: Any) -> str:
    """Which machine to ask about the meaning-search model.

    What the caller passed wins. Otherwise: this Deck if the AI runs here, else the first
    saved host. Empty means there is nothing to ask, and the answer is simply "no".
    """
    if isinstance(data, dict):
        asked = str(data.get("pc_ip") or data.get("PcIp") or "").strip()
        if asked:
            return asked
    if settings.get("ollama_local_on_deck") is True:
        return DEFAULT_OLLAMA_PCIP
    named = settings.get("named_ollama_hosts") or []
    if isinstance(named, list) and named:
        first = named[0]
        if isinstance(first, dict):
            return str(first.get("host") or first.get("ip") or "").strip()
    return ""


def _fallback_storage_options(internal_dir: Callable[[], str]) -> dict[str, Any]:
    """What to say about storage when looking it up failed.

    Internal storage always exists, so offering it with an unknown amount of room is
    better than offering nothing and leaving the screen with no place to install to.
    """
    return {
        "internal": {
            "id": "internal",
            "label": "Internal storage",
            "install_path": internal_dir(),
            "free_bytes": 0,
        },
        "sd_card": None,
    }


def build_rag_corpus_status(
    settings: dict,
    data: Any = None,
    download_state: Optional[dict] = None,
    tools: Optional[StatusTools] = None,
) -> dict[str, Any]:
    """Everything the Knowledge base section needs to draw itself, in one dictionary.

    Whatever a download is currently doing comes first, then the settled facts, so a
    download in progress is never hidden by them.
    """
    tools = tools or StatusTools()
    db_path = tools.resolve_db_path(settings)
    pc_ip = pc_ip_for_status(settings, data)

    corpus_path = str(settings.get("rag_corpus_path") or "").strip()
    embeddings_populated = False
    if corpus_path:
        manifest_path = tools.manifest_path_for(corpus_path)
        if manifest_path:
            try:
                manifest = tools.load_manifest(manifest_path)
                embeddings_populated = manifest.get("embeddings_populated") is True
            except Exception:
                embeddings_populated = False

    # Asked before storage is looked up, as it was in main.py. Neither depends on the
    # other, but this one reaches the network and the order is kept so the move is a move.
    embed_model_available = bool(pc_ip) and tools.embed_model_available(pc_ip)

    try:
        storage_options = tools.storage_options()
    except Exception as exc:
        try:
            logger.warning("get_rag_corpus_status: storage_options failed: %s", exc)
        except Exception:
            pass
        storage_options = _fallback_storage_options(tools.internal_dir)

    return {
        **dict(download_state or {}),
        "installed": bool(db_path),
        "corpus_path": corpus_path,
        "corpus_version": str(settings.get("rag_corpus_version") or ""),
        "use_local_knowledge_base": settings.get("use_local_knowledge_base") is True,
        "embeddings_populated": embeddings_populated,
        "embed_model_available": embed_model_available,
        "storage_options": storage_options,
    }
