"""Title: The record kept of the voice engine, and the check that the engine is still what was built

Purpose: After the voice engine is compiled, this file writes a small record next to the built
programs: which build image was used, the exact compiler and make versions the build installed,
the package servers it used, and a SHA-256 of every built file (the two programs and their
libraries). Before the engine is run, `check_voice_engine()` reads the files again and compares.
Used for: voice_engine_build_service.py (writes the record after a build, reads the compiler
lines the build script left behind), voice_whisper_runtime.py (checks before any engine program
is run) and voice_transcription_service.py (says why the engine was refused).
Solves: Two things the 2026-11-17 review found. The build fetches its compiler at whatever
version the package servers have that day, so two Decks can build different engines: the record
now says which. And nothing noticed if a built program was changed or cut off after the build:
now it is not run, and the person is told in plain words how to rebuild it.
Does not: Prove the build itself was clean (the sums are taken right after the compile, so a
bad package that was installed during the build is recorded as it is), and does not stop
someone who can write both the program and this record. It catches a program that was changed
or damaged later, and a build that was cut off.

Gotchas:
 - An engine built before this record existed has no record. It keeps working: the first time
   it passes its own start-up test, the record is written from what is on disk ("trusted once").
   A written record is never overwritten by a check; only a build replaces it.
 - A file symlink (libfoo.so.1 pointing at libfoo.so.1.8.6) is recorded by where it points, not
   by content, so pointing it somewhere else counts as a change.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import time
from typing import Any, Optional

RECORD_NAME = "bonsai-engine-record.json"
# The build script writes the compiler lines here (inside the mounted out folder); the host reads
# them once, folds them into the record and deletes the file.
BUILD_TOOLS_NAME = "bonsai-build-tools.txt"
RECORD_FORMAT = 1

ENGINE_CHANGED_LINE = (
    "The voice engine was not started because its files are not the ones bonsAI built "
    "(something changed them, or a build was cut off). To fix it, open Settings, Voice input "
    "and tap Install voice engine: it builds the engine again, which needs the internet and a few minutes."
)

_PROGRAMS = ("whisper-cli", "whisper-server")


def _engine_file_names(bin_dir: str) -> list[str]:
    try:
        names = sorted(os.listdir(bin_dir))
    except OSError:
        return []
    return [n for n in names if n in _PROGRAMS or ".so" in n]


def _sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _fingerprint(bin_dir: str) -> dict[str, dict[str, str]]:
    """name -> {"sha256": ...} for a file, {"link": target} for a symlink."""
    out: dict[str, dict[str, str]] = {}
    for name in _engine_file_names(bin_dir):
        path = os.path.join(bin_dir, name)
        if os.path.islink(path):
            out[name] = {"link": os.readlink(path)}
        elif os.path.isfile(path):
            out[name] = {"sha256": _sha256_of(path)}
    return out


def record_path(bin_dir: str) -> str:
    return os.path.join(bin_dir, RECORD_NAME)


def take_build_tools(bin_dir: str) -> list[str]:
    """Read the compiler lines the build script left behind, delete the file, return the lines."""
    path = os.path.join(bin_dir, BUILD_TOOLS_NAME)
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            lines = [ln.strip()[:300] for ln in f if ln.strip()]
    except OSError:
        lines = []
    try:
        os.remove(path)
    except OSError:
        pass
    return lines[:60]


def write_voice_engine_record(bin_dir: str, image: str, tool_lines: Optional[list[str]] = None, source: str = "build") -> bool:
    """Write the record for the files now in `bin_dir`. False if the record could not be saved."""
    record: dict[str, Any] = {
        "format": RECORD_FORMAT,
        "source": source,
        "image": image,
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "build_tools": list(tool_lines or []),
        "files": _fingerprint(bin_dir),
    }
    path = record_path(bin_dir)
    tmp = ""
    try:
        # Its own temporary file for every write: the status poll and a build can both write the record, and a
        # shared name let one overwrite or move the other's half-written file. No dot before the random part, so
        # the name can never contain ".so" (which would make it count as an engine file).
        fd, tmp = tempfile.mkstemp(dir=bin_dir, prefix="bonsai-engine-record-", suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, sort_keys=True)
            f.write("\n")
        os.replace(tmp, path)
        return True
    except OSError:
        if tmp:
            try:
                os.remove(tmp)
            except OSError:
                pass
        return False


def check_voice_engine(bin_dir: str) -> str:
    """"none" (no engine files), "unrecorded" (built before the record), "ok" or "changed"."""
    if not _engine_file_names(bin_dir):
        return "none"
    path = record_path(bin_dir)
    if not os.path.isfile(path):
        return "unrecorded"
    try:
        with open(path, encoding="utf-8") as f:
            saved = json.load(f).get("files")
        if not isinstance(saved, dict):
            return "changed"
        return "ok" if saved == _fingerprint(bin_dir) else "changed"
    except (OSError, ValueError, AttributeError, RecursionError):
        return "changed"


def voice_engine_changed(bin_dir: str) -> bool:
    return check_voice_engine(bin_dir) == "changed"
