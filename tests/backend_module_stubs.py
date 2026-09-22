"""Title: Stand-in fcntl and decky modules for backend tests

Purpose: main.py and several backend services import `fcntl` (POSIX file locking, not present
on a Windows dev box) and `decky` (the Deck's own plugin-loader module, only present on a real
Deck) at module load time. Any test that imports main.py or a backend service which reaches for
either one needs both faked out first, or the import itself fails before the test can run.
Used for: Called at module level, before importing main or a backend service, by every test
file that needs both stubbed with the plain, no-op version. install_fcntl_and_decky_stubs() is
idempotent (it checks sys.modules first, the same way each test file used to), so calling it
from more than one test file in the same process is safe -- whichever one runs first wins, and
the rest are no-ops.
Solves: The same ~17-line stub block, byte for byte, was copied into thirteen test files (a
back-end-test duplication scripts/ratchet.py's duplicate_lines_be_tests counts). A few other
test files stub the same two modules with a deliberately different value (an extra `HOME`
attribute, a different settings directory) for a reason specific to that test; those are left
alone rather than forced onto this shared, plain version.
Does not: Stub anything else main.py or a backend service might need (a temp settings dir, a
database path, ...) -- each test file still sets up whatever is specific to it, same as before.
"""

from __future__ import annotations

import sys
import types


def install_fcntl_and_decky_stubs() -> None:
    """Install plain, no-op `fcntl` and `decky` modules if nothing has claimed them yet."""
    if "fcntl" not in sys.modules:
        _fcntl = types.ModuleType("fcntl")
        _fcntl.LOCK_EX = 2
        _fcntl.LOCK_NB = 4
        _fcntl.LOCK_UN = 8
        _fcntl.flock = lambda *_a, **_k: False
        sys.modules["fcntl"] = _fcntl

    if "decky" not in sys.modules:
        _decky = types.ModuleType("decky")
        _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
        _decky.logger = types.SimpleNamespace(
            info=lambda *a, **k: None,
            warning=lambda *a, **k: None,
            error=lambda *a, **k: None,
            exception=lambda *a, **k: None,
        )
        sys.modules["decky"] = _decky
