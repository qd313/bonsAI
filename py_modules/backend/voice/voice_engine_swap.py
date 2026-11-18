"""Title: Building the voice engine in a spare folder, then swapping it in

Purpose: The voice engine is compiled inside a podman container that copies the finished programs out to a
folder on this Deck. This file gives that copy-out a fresh spare ("staging") folder beside the engine folder,
and, only after the compile has finished well, swaps the new files into the engine folder in one quick step:
the old programs, every old library, the old record and the old build-tools file are removed first, then the
new files are moved in.

Used for: voice_engine_build_service.py (both the full build and the whisper-server-only build).

Solves: Two things the 2026-11-17 security review found. The build used to copy over the engine folder and
never emptied it, so a library left by an earlier build stayed there, was loaded by the engine programs
before anything else, and was then written into the record as approved. And a Cancel in the middle of the
copy could leave cut-off files that an engine with no record yet would "trust once". Now the engine folder
only changes after a good compile; a Cancel or a failed build deletes the spare folder and leaves the old
engine exactly as it was.

Does not: Run the compile, write the record or tell the person anything (voice_engine_build_service.py does),
and does not protect the few moments of the swap itself: if a file cannot be moved in, the engine's programs
are removed so a half-swapped engine is never started, and the next Install voice engine builds it again.
The swap never touches the "CPU safe" marker or the shared server's pid file.

Gotchas:
 - The spare folder sits beside the engine folder (same disk) so a move is a rename, never a copy.
 - A whisper-server-only build keeps the libraries: only the server, the record and the build-tools file are
   replaced. Only a full build empties the engine folder of programs and libraries.
 - A spare folder left behind by a plugin crash is removed at the start of the next build.
"""

from __future__ import annotations

import os
import shutil
import uuid

from backend.voice.voice_engine_record import BUILD_TOOLS_NAME, RECORD_NAME

STAGING_PREFIX = ".bonsai-engine-staging-"
CLI_NAME = "whisper-cli"
SERVER_NAME = "whisper-server"


def _remove_path(path: str) -> None:
    if os.path.isdir(path) and not os.path.islink(path):
        shutil.rmtree(path, ignore_errors=True)
    else:
        os.remove(path)


def remove_staging(staging: str) -> None:
    shutil.rmtree(staging, ignore_errors=True)


def new_staging_dir(bin_dir: str) -> str:
    """A fresh, empty spare folder beside `bin_dir`; spare folders left by an earlier crash are removed first."""
    parent = os.path.dirname(bin_dir.rstrip(os.sep)) or "."
    os.makedirs(parent, exist_ok=True)
    try:
        for name in os.listdir(parent):
            if name.startswith(STAGING_PREFIX):
                remove_staging(os.path.join(parent, name))
    except OSError:
        pass
    staging = os.path.join(parent, STAGING_PREFIX + uuid.uuid4().hex[:8])
    os.mkdir(staging)
    return staging


def _is_engine_file(name: str) -> bool:
    return name in (CLI_NAME, SERVER_NAME) or ".so" in name


def _remove_old_engine(bin_dir: str, full: bool) -> None:
    """Remove what the new files replace: the record and tools file always; programs and libraries on a full build."""
    for name in os.listdir(bin_dir):
        if name in (RECORD_NAME, BUILD_TOOLS_NAME) or (_is_engine_file(name) if full else name == SERVER_NAME):
            _remove_path(os.path.join(bin_dir, name))


def swap_in_staged_engine(staging: str, bin_dir: str, full: bool) -> None:
    """Replace the engine in `bin_dir` with the files in `staging` (only programs and libraries are taken).

    `full` True: every old program and library goes. `full` False: only whisper-server is replaced. If a file
    cannot be moved in, the engine's programs are removed (best effort) and the error is raised.
    """
    os.makedirs(bin_dir, exist_ok=True)
    wanted = [n for n in sorted(os.listdir(staging)) if (_is_engine_file(n) if full else n == SERVER_NAME)]
    try:
        _remove_old_engine(bin_dir, full)
        for name in wanted:
            os.replace(os.path.join(staging, name), os.path.join(bin_dir, name))
    except OSError:
        for name in (CLI_NAME, SERVER_NAME):
            try:
                os.remove(os.path.join(bin_dir, name))
            except OSError:
                pass
        raise
