"""Title: A pretend Ollama engine for the tests that stop a setup run

Purpose: Lets a test ask "is the Deck's AI still running after this?" without starting anything. It stands in
for the programs setup uses to start (`ollama serve`) and stop (systemctl, pkill) the engine, and for the
check that asks whether it answers.
Used for: tests/test_ollama_setup_engine_marker.py and tests/test_ollama_missing_keys_stop.py, through
`run_custom_setup()`, which runs a "custom" setup run (no install step) on top of the pretend engine.
Does not: Run any program or open any port.
"""

from __future__ import annotations

import asyncio
import subprocess
from contextlib import ExitStack
from typing import Any, Callable, Optional
from unittest.mock import patch


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


async def _no_wait(_seconds: float) -> None:
    return None


def run_custom_setup(ai: FakeAI, pull: Callable[..., Any], cancel_event: asyncio.Event, *,
                     sleep: Optional[Callable[[float], None]] = None, keys_ready: bool = True,
                     profile: str = "custom", extra: Optional[dict] = None,
                     drive: Optional[Callable[[Any], Any]] = None) -> dict:
    """Run one custom setup run on the pretend engine and return its status.

    `pull` stands in for the model download; `sleep` for time.sleep (a test presses Stop from it);
    `keys_ready` False runs the real missing-keys step instead of skipping it; `profile` and `extra` (more
    patches, target -> patch arguments) let a test reach the install and restart steps too; `drive` (an async
    function given the running task) lets a test cancel the task itself, as the plugin's unload does.
    """
    from backend.ollama import local_ollama_setup_service as setup

    S = "backend.ollama.local_ollama_setup_service"
    logger = type("L", (), {"info": lambda *a, **k: None, "exception": lambda *a, **k: None})()
    state: dict = {"phase": "running", "pull_tags": ["tiny:1b"]}
    patches: dict = {
        f"{S}.sys.platform": {"new": "linux"},
        f"{S}.resolve_ollama_executable": {"return_value": "/x/ollama"},
        f"{S}.probe_ollama_http_ok": {"side_effect": ai.probe},
        f"{S}.try_restart_ollama_user_service": {},
        f"{S}.record_result": {},
        f"{S}.run_ollama_pull": {"side_effect": pull},
        f"{S}.asyncio.sleep": {"side_effect": _no_wait},
        f"{S}.time.sleep": {"side_effect": sleep} if sleep else {},
        "subprocess.Popen": {"side_effect": ai.popen},
        "subprocess.run": {"side_effect": ai.run},
    }
    patches.update(extra or {})
    if keys_ready:
        patches[f"{S}.ensure_ollama_cli_home_ready"] = {"return_value": True}
    with ExitStack() as stack:
        for target, kw in patches.items():
            stack.enter_context(patch(target, **kw))
        async def go() -> None:
            run = setup.run_local_setup(profile=profile, state=state, logger=logger, cancel_event=cancel_event)
            if drive is None:
                await run
            else:
                await drive(asyncio.create_task(run))

        asyncio.run(go())
    return state


def update_run_that_replaces_the_ai(ai: FakeAI) -> dict:
    """The `extra` patches for an update run whose restart step stops the person's AI and starts the run's own."""
    from backend.ollama import local_ollama_setup_service as setup

    S = "backend.ollama.local_ollama_setup_service"

    async def installed(**kw: Any) -> str:
        kw["state"]["stage"] = "install"
        return "/x/ollama"

    def restart(log: Any, ollama_bin: str, control: Any) -> dict:
        ai.run(["pkill", "-x", "ollama"])  # the person's AI is stopped ...
        setup.ensure_ollama_server_listening_before_pull(log, ollama_bin, lambda: False)  # ... and the run's own starts
        return {}

    return {
        f"{S}._install_or_update_ollama_binary": {"side_effect": installed},
        f"{S}.restart_server_onto_new_binary": {"side_effect": restart},
        f"{S}.list_installed_ollama_tags": {"return_value": ["a:1"]},
    }
