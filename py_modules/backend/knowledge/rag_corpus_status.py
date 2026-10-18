"""Title: Answering "what is the knowledge base doing right now"

Purpose: The Knowledge base section of the Connection tab needs one full
answer every time it is shown: is a knowledge base installed, where does it
live, has meaning search finished being set up for it yet, and how much room
is there to put one. This file is the one place that works out that whole
answer.
Used for: the Knowledge base section, through the one question the screen can
ask the back end for it.
Solves: gathering this answer used to live inside the same file that answers
every other question the screen can ask, as 53 lines sitting in the middle of
it. Pulling it out into its own file gives it its own tests, without changing
what it answers.
Does not: download, install or remove anything -- see rag_corpus_download_service.

Lifted out of main.py on 2026-09-14 with the answers unchanged. It had no test of its
own before the move; it has one now.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from dataclasses import dataclass
from typing import Any, Callable, Optional

from backend.core.constants import DEFAULT_OLLAMA_PCIP
from backend.knowledge.knowledge_base_schema import (
    corpus_manifest_path,
    default_corpus_dir_internal,
    list_rag_storage_options,
    load_manifest_from_path,
    resolve_corpus_db_path,
)
from backend.knowledge.ollama_embed_service import nomic_embed_available

logger = logging.getLogger("bonsai")


_COUNTS_CACHE: dict[tuple[str, int, int], dict[str, int]] = {}


def read_corpus_counts(db_path: str) -> dict[str, int]:
    """How many games and sections the installed database holds, or {} when it cannot be read.

    Counted straight from the file, once: the answer is kept against the file's size and
    modified time, so the status call stays quick and a new install is counted afresh.
    """
    try:
        st = os.stat(db_path)
    except OSError:
        return {}
    key = (str(db_path), st.st_mtime_ns, st.st_size)
    if key in _COUNTS_CACHE:
        return dict(_COUNTS_CACHE[key])
    try:
        uri = "file:" + str(db_path).replace("\\", "/") + "?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        try:
            counts = {
                "game_count": int(conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]),
                "section_count": int(conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]),
            }
        finally:
            conn.close()
    except Exception:
        return {}
    _COUNTS_CACHE.clear()
    _COUNTS_CACHE[key] = counts
    return dict(counts)


@dataclass(frozen=True)
class StatusTools:
    """The outside things this answer needs, so a test can hand it fakes."""

    resolve_db_path: Callable[[dict], Any] = resolve_corpus_db_path
    manifest_path_for: Callable[[str], Any] = corpus_manifest_path
    load_manifest: Callable[[Any], dict] = load_manifest_from_path
    embed_model_available: Callable[[str], bool] = nomic_embed_available
    storage_options: Callable[[], dict] = list_rag_storage_options
    internal_dir: Callable[[], str] = default_corpus_dir_internal
    corpus_counts: Callable[[str], dict] = read_corpus_counts


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

    counts: dict[str, Any] = {}
    if db_path:
        try:
            counts = dict(tools.corpus_counts(str(db_path)) or {})
        except Exception:
            counts = {}

    return {
        **dict(download_state or {}),
        "installed": bool(db_path),
        **{k: counts[k] for k in ("game_count", "section_count") if isinstance(counts.get(k), int)},
        "corpus_path": corpus_path,
        "corpus_version": str(settings.get("rag_corpus_version") or ""),
        "use_local_knowledge_base": settings.get("use_local_knowledge_base") is True,
        "embeddings_populated": embeddings_populated,
        "embed_model_available": embed_model_available,
        "storage_options": storage_options,
    }
