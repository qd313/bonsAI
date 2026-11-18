"""Title: A pretend Ollama engine for the tests that stop a setup run

Purpose: Lets a test ask "is the Deck's AI still running after this?" without starting anything. It stands in
for the programs setup uses to start (`ollama serve`) and stop (systemctl, pkill) the engine, and for the
check that asks whether it answers.
Used for: tests/test_ollama_setup_engine_marker.py and tests/test_ollama_missing_keys_stop.py.
Does not: Run any program or open any port.
"""

from __future__ import annotations

import subprocess
from typing import Any, Optional


class FakeServe:
    """The `ollama serve` process setup starts: it answers until something ends it."""

    def __init__(self, ai: "FakeAI") -> None:
        self.ai = ai
        self.pid = 5_000_001
        self.returncode: Optional[int] = None
        ai.up = True
        ai.started += 1

    def poll(self) -> Optional[int]:
        return None if self.ai.up and self.returncode is None else (self.returncode or 0)

    def terminate(self) -> None:
        self.returncode = -15
        self.ai.up = False

    kill = terminate

    def wait(self, timeout: Optional[float] = None) -> int:
        return self.returncode or 0


class FakeAI:
    def __init__(self, up: bool = False) -> None:
        self.up = up
        self.started = 0

    def probe(self, *args: Any, **kwargs: Any) -> bool:
        return self.up

    def popen(self, cmd: Any, *args: Any, **kwargs: Any) -> FakeServe:
        assert list(cmd)[1:2] == ["serve"], f"unexpected program started: {cmd}"
        return FakeServe(self)

    def run(self, cmd: Any, *args: Any, **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        cmd = list(cmd)
        if cmd[:3] == ["systemctl", "--user", "stop"] or cmd[0] == "pkill":
            self.up = False
        return subprocess.CompletedProcess(cmd, 0, "", "")
