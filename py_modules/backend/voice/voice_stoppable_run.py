"""Title: Running a podman step that a Cancel can stop

Purpose: The voice engine is made in two long podman steps: pulling an image (up to 15 minutes) and a
container that compiles the program (up to 30 minutes). They used to run as one blocking call each, so a
Cancel pressed meanwhile was not heard until the step ended on its own. This runs such a step as a process
that is looked at every half second: when the cancel flag is set, or the time limit passes, the step is
stopped and, for the build, the container it started is removed.

Used for: voice_transcription_service.install_whisper_cli (the image pull) and
voice_engine_build_service._run_whisper_container_build (the compile). Both the starter set's Cancel
(through starter_voice_engine.py) and the voice install's own cancel flag reach them through
install_whisper_cli, so there is one stop for both.

Solves: A Cancel during the voice engine build used to leave the build running for up to half an hour with the
screen still saying it was working. Now it ends within a second or two and leaves no process and no container.

Does not: Delete what a step already put on disk. A pulled image stays in podman's own storage (a later
install reuses it), and files the build had already copied into the plugin's voice_bin folder stay there; the
next install checks them and rebuilds what is not usable. It does not look for containers left behind by an
earlier plugin crash.
"""

from __future__ import annotations

import subprocess
import time
from typing import Any, Optional

CANCELLED_MESSAGE = "Binary install cancelled."
POLL_SECONDS = 0.5


# Podman's own `rm -f` first sends a polite stop and waits 10 seconds before it kills; the build's shell ignores
# the polite stop, so Cancel sat on "Stopping the install" for 10 s (10.2 s measured, against 0.14 s with `-t 0`).
_REMOVE_NO_WAIT = ["rm", "-f", "-t", "0"]
_OPTION_NOT_KNOWN = ("unknown shorthand flag", "unknown flag", "flag provided but not defined")


def _remove_container(
    env: Optional[dict[str, str]],
    podman: Optional[str],
    container_name: Optional[str],
) -> None:
    """`podman rm -f -t 0 <name>`, errors ignored (the container may not exist yet, or any more).

    An older podman that does not know `-t` is asked once more with plain `rm -f`. Any other failure,
    "no such container" included, is normal here and gets no second try.
    """
    if not (podman and container_name):
        return
    for args in (_REMOVE_NO_WAIT, ["rm", "-f"]):
        try:
            done = subprocess.run(
                [podman, *args, container_name],
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
                check=False,
            )
        except Exception:
            return
        refused = str(getattr(done, "stderr", "") or "").lower()
        if done.returncode == 0 or not any(text in refused for text in _OPTION_NOT_KNOWN):
            return


def _stop_step(
    proc: "subprocess.Popen[str]",
    env: Optional[dict[str, str]],
    podman: Optional[str],
    container_name: Optional[str],
) -> None:
    """End a step: remove its container first (so the work inside stops), then end the podman process.

    The container is removed a second time after the process has ended: a Cancel in the first second can
    run the first remove before the container exists, and a container that appears just after would
    otherwise run on (its shell ignores the stop signal) until the time limit.
    """
    _remove_container(env, podman, container_name)
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    _remove_container(env, podman, container_name)
    try:
        proc.communicate(timeout=10)
    except Exception:
        pass


def run_stoppable(
    cmd: list[str],
    *,
    env: Optional[dict[str, str]],
    timeout: float,
    cancel_event: Any = None,
    podman: Optional[str] = None,
    container_name: Optional[str] = None,
    poll_seconds: float = POLL_SECONDS,
) -> "subprocess.CompletedProcess[str]":
    """Run `cmd` like subprocess.run(capture_output=True, text=True, timeout=...), but stop it on a Cancel.

    Returns the finished process. Raises RuntimeError(CANCELLED_MESSAGE) when `cancel_event` (anything with
    is_set()) is set, and subprocess.TimeoutExpired when `timeout` passes; either way the process is ended and,
    when `podman` and `container_name` are given, `podman rm -f -t 0 <container_name>` removes the container the
    command started (the command must have been given that name with --name).
    """
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    deadline = time.monotonic() + timeout
    while True:
        if cancel_event is not None and cancel_event.is_set():
            _stop_step(proc, env, podman, container_name)
            raise RuntimeError(CANCELLED_MESSAGE)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            _stop_step(proc, env, podman, container_name)
            raise subprocess.TimeoutExpired(cmd, timeout)
        try:
            out, err = proc.communicate(timeout=min(poll_seconds, remaining))
        except subprocess.TimeoutExpired:
            continue
        return subprocess.CompletedProcess(cmd, proc.returncode, out, err)
