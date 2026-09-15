"""Title: Clearing all of the plugin's own data

Purpose: When someone presses "Clear all data" in Settings, this is what
actually does the work. It wipes every saved setting, the local search-
knowledge folder if one was installed, the plugin's own temporary and log
files, and a leftover file from an old removed feature, then writes a fresh
set of default settings back in their place -- the same state a brand-new
install would be in.
Used for: the "Clear all data" action, and any other recovery path that needs
to put the plugin back to its just-installed state.
Solves: without one place that does the whole job, a "clear data" action could
wipe the settings file but leave the search-knowledge folder or old log files
behind, and a person would believe their data was fully cleared when it was
not.
Does not: remove the plugin itself from Decky, or touch anything outside the
plugin's own folders -- none of the user's other Steam data is touched.
Gotchas: one of the things this removes -- a leftover journal file -- is from
a feature (Proton experiment tracking) that was removed from the plugin back
in 2026-07. A Deck that never ran that old version has nothing there to
remove, which is expected, not a sign anything is wrong.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

LoadSettingsFn = Callable[[str, Any, Any], dict]
SaveSettingsFn = Callable[..., dict]
SanitizeFn = Callable[[Any], dict]


def _path_within_home(path: Path, home: Path) -> bool:
    try:
        path.resolve().relative_to(home.resolve())
        return True
    except ValueError:
        return False


def wipe_settings_dir_contents(settings_dir: str, logger: Any) -> int:
    """Remove every file and subdirectory under settings_dir; recreate empty dir."""
    removed = 0
    if os.path.isdir(settings_dir):
        for name in os.listdir(settings_dir):
            fp = os.path.join(settings_dir, name)
            try:
                if os.path.isdir(fp):
                    shutil.rmtree(fp)
                else:
                    os.remove(fp)
                removed += 1
            except OSError:
                logger.warning("wipe_settings_dir: could not remove %s", fp)
    os.makedirs(settings_dir, exist_ok=True)
    return removed


def wipe_bonsai_cache_dir(logger: Any) -> bool:
    """Remove ~/.bonsai/cache when it lives under the user home directory."""
    if sys.platform.startswith("win"):
        return False
    try:
        home = Path.home()
        cache_dir = home / ".bonsai" / "cache"
        if cache_dir.exists() and _path_within_home(cache_dir, home):
            shutil.rmtree(cache_dir, ignore_errors=True)
            return True
    except OSError as exc:
        logger.warning("wipe_bonsai_cache_dir: %s", exc)
    return False


PROTON_JOURNAL_FILENAME = "proton_experiment_journal.json"


def wipe_proton_experiment_journal(logger: Any, home: str | None = None) -> bool:
    """Remove ~/.bonsai/proton_experiment_journal.json when under user home.

    The Proton experiment journal feature was removed in 2026-07. This stays so
    Clear all data still cleans up the file on Decks that used it, and is the
    only part of the old journal service that outlived the feature.
    """
    if sys.platform.startswith("win"):
        return False
    path = Path(os.path.expanduser(home or "~")) / ".bonsai" / PROTON_JOURNAL_FILENAME
    try:
        home_rp = Path.home().resolve()
        file_rp = path.resolve()
        if not str(file_rp).startswith(str(home_rp) + os.sep) and file_rp != home_rp:
            return False
        if file_rp.exists():
            file_rp.unlink()
        return True
    except OSError as exc:
        logger.warning("wipe_proton_experiment_journal: %s", exc)
        return False


def wipe_rag_corpus_dir(corpus_path: str, logger: Any) -> bool:
    """Remove installed knowledge base directory when under user home."""
    from backend.services.rag_corpus_download_service import remove_corpus_at_path

    path = str(corpus_path or "").strip()
    if not path:
        return False
    return remove_corpus_at_path(path, logger)


def reset_plugin_disk_and_defaults(
    *,
    settings_path: str,
    settings_dir: str,
    runtime_dir: str,
    log_dir: str,
    sanitize_func: SanitizeFn,
    load_settings: LoadSettingsFn,
    save_settings: SaveSettingsFn,
    logger: Any,
    rag_corpus_path: str = "",
) -> tuple[dict, int]:
    """Wipe settings/runtime/log dirs and write fresh defaults.

    Does not touch Desktop notes or other paths outside Decky's plugin dirs. RPC callers should reload
    sanitized settings into memory after this returns so UI and backend state match disk.

    Returns (defaults, settings_dir_removed_count).
    """
    if rag_corpus_path:
        wipe_rag_corpus_dir(rag_corpus_path, logger)

    settings_removed = wipe_settings_dir_contents(settings_dir, logger)

    if os.path.isdir(runtime_dir):
        shutil.rmtree(runtime_dir)
    os.makedirs(runtime_dir, exist_ok=True)

    if os.path.isdir(log_dir):
        for name in os.listdir(log_dir):
            fp = os.path.join(log_dir, name)
            try:
                if os.path.isfile(fp) or os.path.islink(fp):
                    os.remove(fp)
            except OSError:
                logger.warning("reset_plugin_disk: could not remove %s", fp)

    defaults = load_settings(settings_path, sanitize_func, logger)
    saved = save_settings(
        path=settings_path,
        settings_dir=settings_dir,
        incoming={},
        current=defaults,
        sanitize_func=sanitize_func,
        logger=logger,
    )
    return saved, settings_removed
