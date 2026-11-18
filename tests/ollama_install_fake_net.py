"""Title: A pretend network and pretend programs for the Ollama install tests

Purpose: The Ollama program file is fetched with curl and unpacked with a shell line. These tests must not
touch the network or run those programs, so this stands in for them at the one place both the old blocking
install and the new stoppable one run programs (subprocess.Popen). It writes the same files the real programs
would into a pretend home folder, so a test can look at what is left on disk after a stop, a failure and a
success.
Used for: tests/test_ollama_binary_install.py.
Does not: Touch the network, run curl, zstd or tar, or know anything about the plugin beyond the command
lines it recognises.
"""

from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path
from typing import Any, Callable, Optional

ARCHIVE_NAME = "ollama-linux-amd64.tar.zst"
ARCHIVE_BYTES = b"pretend ollama archive " * 100
FAKE_PID = 5_000_000  # above Linux's pid limit, so a stray kill reaches nobody


class FakeProc:
    """Stands in for one running program: finishes after `polls` looks, or hangs until it is ended."""

    def __init__(self, cmd: Any, *, polls: int = 0, hang: bool = False, rc: int = 0, out: str = "", err: str = "",
                 on_start: Optional[Callable[[], None]] = None, on_finish: Optional[Callable[[], None]] = None) -> None:
        self.args = cmd
        self.pid = FAKE_PID
        self.returncode: Optional[int] = None
        self.stdout = self.stderr = None
        self.ended = False
        self._polls, self._hang, self._rc, self._out, self._err = polls, hang, rc, out, err
        self._on_finish = on_finish
        if on_start:
            on_start()

    def __enter__(self) -> "FakeProc":
        return self

    def __exit__(self, *exc: Any) -> None:
        return None

    def communicate(self, input: Any = None, timeout: Optional[float] = None):  # noqa: A002 (subprocess's own name)
        if self.ended:
            self.returncode = -15
            return "", ""
        # the old install made one blocking call with a 600 s limit: it simply runs to the end
        blocking = timeout is not None and timeout >= 100
        if not blocking and (self._hang or self._polls > 0):
            self._polls -= 1
            raise subprocess.TimeoutExpired(self.args, timeout or 0)
        if self._on_finish:
            self._on_finish()
        self.returncode = self._rc
        return self._out, self._err

    def poll(self) -> Optional[int]:
        return self.returncode

    def wait(self, timeout: Optional[float] = None) -> int:
        return self.returncode or 0

    def terminate(self) -> None:
        self.ended = True

    def kill(self) -> None:
        self.ended = True


class FakeNet:
    """What github.com, curl, zstd and tar would do, chosen per test through plain attributes."""

    def __init__(self, home: Path) -> None:
        self.home = home
        self.tag_ok = True
        self.sums = "ok"  # ok | wrong | unreachable | no_entry
        self.download = "ok"  # ok | slow | cut_off
        self.unpack = "ok"  # ok | fails
        self.press_stop: Optional[Callable[[], None]] = None
        self.stop_when = ""  # "" | tag | download | unpack_done
        self.commands: list[list[str]] = []

    @property
    def dst(self) -> Path:
        return self.home / ".local"

    def _stop_at(self, moment: str) -> Optional[Callable[[], None]]:
        return self.press_stop if self.stop_when == moment else None

    def popen(self, cmd: Any, *args: Any, **kwargs: Any) -> FakeProc:
        argv = [str(c) for c in cmd] if isinstance(cmd, (list, tuple)) else [str(cmd)]
        self.commands.append(argv)
        joined = " ".join(argv)
        if argv[0].endswith("bash") and "curl" in joined and "tar -xf" in joined and "zstd -d | tar" in joined:
            return self._old_pipeline(argv)  # the old single shell line
        if argv[0].endswith("bash") and "zstd -dc" in joined:
            return self._unpack(argv)
        if argv[0] == "curl":
            return self._curl(argv)
        return FakeProc(cmd)

    def _target(self, argv: list[str]) -> Path:
        return Path(argv[argv.index("-o") + 1])

    def _curl(self, argv: list[str]) -> FakeProc:
        url = argv[-1]
        if "-w" in argv:
            if not self.tag_ok:
                return FakeProc(argv, rc=6, err="Could not resolve host")
            return FakeProc(argv, out="https://github.com/ollama/ollama/releases/tag/v0.40.16", on_start=self._stop_at("tag"))
        if url.endswith("sha256sum.txt"):
            if self.sums == "unreachable":
                return FakeProc(argv, rc=22, err="The requested URL returned error: 404")
            digest = hashlib.sha256(ARCHIVE_BYTES).hexdigest() if self.sums != "wrong" else "0" * 64
            name = ARCHIVE_NAME if self.sums != "no_entry" else "ollama-darwin.tgz"
            target = self._target(argv)
            return FakeProc(argv, on_finish=lambda: target.write_text(f"{digest}  ./{name}\n{'1' * 64}  ./install.sh\n"))
        target = self._target(argv)
        if self.download == "cut_off":
            return FakeProc(argv, rc=18, err="transfer closed with outstanding read data", on_finish=lambda: target.write_bytes(ARCHIVE_BYTES[:200]))
        return FakeProc(argv, polls=3 if self.download == "slow" else 0, on_start=self._stop_at("download"),
                        on_finish=lambda: target.write_bytes(ARCHIVE_BYTES))

    def _new_files(self, root: Path, *, half: bool = False) -> None:
        (root / "bin").mkdir(parents=True, exist_ok=True)
        (root / "bin" / "ollama").write_text("NEW")
        if not half:
            (root / "lib" / "ollama").mkdir(parents=True, exist_ok=True)
            (root / "lib" / "ollama" / "libnew.so").write_text("NEW")

    def _unpack(self, argv: list[str]) -> FakeProc:
        stage = Path(argv[-1])
        if self.unpack == "fails":
            return FakeProc(argv, rc=2, err="zstd: unexpected end of file", on_finish=lambda: self._new_files(stage, half=True))
        return FakeProc(argv, on_finish=lambda: (self._new_files(stage), (self._stop_at("unpack_done") or (lambda: None))()))

    def _old_pipeline(self, argv: list[str]) -> FakeProc:
        match = re.search(r'-C "([^"]+)"', " ".join(argv))
        dst = Path(match.group(1)) if match else self.dst
        press = self._stop_at("download")
        if self.download == "cut_off" or self.unpack == "fails":
            return FakeProc(argv, rc=2, err="unexpected end of file", on_start=press, on_finish=lambda: self._new_files(dst, half=True))
        return FakeProc(argv, polls=3, on_start=press, on_finish=lambda: self._new_files(dst))
