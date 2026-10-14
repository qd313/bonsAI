"""Title: Finding the Ollama program on the Deck

Purpose: Setup needs the path of the `ollama` program to pull models. Decky's own PATH often lacks
`~/.local/bin`, which is where "Run AI on this Deck" puts it on SteamOS (the root folder cannot be written),
so asking only the PATH said "not found" even though Ollama was installed and running, and a first starter-set
install re-ran the official installer for about 36 seconds for nothing (Deck, 2026-10-14). This looks where it
really lives: the PATH, then the usual install folders, then the program a running Ollama server was started from.

Used for: local_ollama_setup_service.py (`resolve_ollama_executable`, which the setup run, the auto-start and
the teardown all use).

Solves: The installer runs only when Ollama really is not on the Deck.

Does not: Install anything, start the server, or change the PATH (the setup file prepends `~/.local/bin` itself
where a bare `ollama` command is needed).
"""

from __future__ import annotations

import os
from typing import Optional

from backend.ollama_connectivity import guess_ollama_cli_paths

_PROC_ROOT = "/proc"


def running_ollama_executable(proc_root: str = _PROC_ROOT) -> Optional[str]:
    """The file a running process named `ollama` was started from (Linux only), or None.

    A running server is proof that Ollama is installed; this finds the program it is running from.
    """
    try:
        entries = os.listdir(proc_root)
    except OSError:
        return None
    for pid in entries:
        if not pid.isdigit():
            continue
        try:
            with open(os.path.join(proc_root, pid, "comm"), encoding="utf-8") as fh:
                if fh.read().strip() != "ollama":
                    continue
            exe = os.readlink(os.path.join(proc_root, pid, "exe"))
        except OSError:
            continue
        if os.path.isfile(exe) and os.access(exe, os.X_OK):
            return exe
    return None


def find_ollama_executable() -> Optional[str]:
    """Path to the `ollama` program, or None when it cannot be found anywhere."""
    found = guess_ollama_cli_paths()
    return found[0] if found else running_ollama_executable()
