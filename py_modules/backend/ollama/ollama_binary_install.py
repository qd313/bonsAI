"""Title: Fetching Ollama's program file and swapping it in without breaking the old one

Purpose: On the Deck, Ollama's program is installed into the person's own home folder from a ~1.5 GB
download. This does that download in a way a Cancel can stop at any moment, checks the file against the
check number Ollama publishes for that exact release, unpacks it into a spare folder, and only then swaps
it in. A cut-off download, a file that does not match its check number, a check number that cannot be
fetched, or an unpack that fails all end the same way: the old Ollama is still in place and still works.

Used for: run_tarball_user_local_install in local_ollama_setup_service.py (the Install and Update
buttons and the first-time setup, on the Deck), and `run_cancellable()` for that file's other shell step.

Solves: The old install piped the download straight into an unpack over the live files in one blocking
call. A Cancel was not heard for up to 10 minutes, the restart of the AI then followed, a dropped
connection could leave old and new files mixed, and nothing checked what had been downloaded.

Does not: Check the install.sh path (Ollama's own installer, used only where the system folders can be
written); it can only be stopped, not checked. Does not run the new program before the swap. Does not
protect against someone who controls both GitHub's release files and its check number, because the check
number comes from the same release page; it protects against cut-off, mixed-up and corrupted downloads.

How it works:

    latest tag -> check number -> download -> check -> unpack -> swap
        |             |             |          |         |        |
        |             |             |          |         |        +- bin/ollama and lib/ollama are renamed
        |             |             |          |         |           into place; the old ones wait in the
        |             |             |          |         |           spare folder and go back on any error
        |             |             |          |         +- `bash -c 'set -o pipefail; zstd -dc | tar -x'`
        |             |             |          +- sha256 of the whole file against the published line
        |             |             +- curl, as a process Cancel can end (and its whole group)
        |             +- sha256sum.txt of that same release
        +- github.com/ollama/ollama/releases/latest, read once, so the file and its check number
           come from one release even if a newer one appears meanwhile

1. `install_ollama_from_release()` makes a spare folder inside `~/.local` (same disk, so renames are
   instant), runs the steps above inside it, and removes it at the end whatever happened. A spare folder
   left by a crash is swept up on the next run once it is an hour old.
2. Every step that runs a program goes through `run_cancellable()`, which looks at the Cancel flag every half
   second and, on Cancel, ends the program and everything it started. Hashing checks the flag between
   chunks. Cancel is checked once more right before the swap; the swap itself is a few renames.
3. Problems are raised as `InstallProblem` with a message that says what happened, that the old Ollama was
   not changed, and what to try next. A Cancel is `InstallStopped`.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import signal
import subprocess
import time
import uuid
from pathlib import Path
from typing import Callable, Optional

RELEASES_URL = "https://github.com/ollama/ollama/releases"
CHECKSUM_FILE_NAME = "sha256sum.txt"
DOWNLOAD_SECONDS = 600
SMALL_FETCH_SECONDS = 60
POLL_SECONDS = 0.5
SPARE_PREFIX = ".bonsai-ollama-update-"
KEPT_PREFIX = ".bonsai-ollama-KEPT-"  # never matches the sweep: a folder the person was told to keep
STALE_SPARE_SECONDS = 3600
_HASH_CHUNK = 4 * 1024 * 1024
_TAG_REDIRECT = re.compile(r"^https://github\.com/ollama/ollama/releases/tag/(v\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$")
_CHECK_LINE = re.compile(r"([0-9a-fA-F]{64})\s+\*?(?:\./)?(\S+)")
_UNPACK_LINE = 'set -o pipefail; zstd -dc -- "$1" | tar -xf - -C "$2"'
_KEEP_OLD = "Your current Ollama was not changed."


class InstallStopped(Exception):
    """The person pressed Cancel or Stop; nothing was changed."""


class InstallProblem(RuntimeError):
    """The install did not go ahead. The message is plain words for the card: what, then what to do."""


class _SwapBroken(Exception):
    """The swap failed and putting the old files back failed too; the spare folder keeps them."""


def _signal_group(proc: "subprocess.Popen[str]", *, hard: bool) -> None:
    """Send the stop signal to the program and everything it started (best effort)."""
    try:
        if os.name == "posix":
            os.killpg(proc.pid, signal.SIGKILL if hard else signal.SIGTERM)
        elif hard:
            proc.kill()
        else:
            proc.terminate()
    except OSError:
        pass


def _end(proc: "subprocess.Popen[str]") -> None:
    _signal_group(proc, hard=False)
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _signal_group(proc, hard=True)
    try:
        proc.communicate(timeout=10)
    except Exception:
        pass


def run_cancellable(
    cmd: list[str],
    *,
    env: Optional[dict[str, str]],
    timeout: float,
    cancelled: Callable[[], bool],
) -> "subprocess.CompletedProcess[str]":
    """Run `cmd` like subprocess.run(capture_output=True, text=True, timeout=...), but end it on Cancel.

    Raises InstallStopped when `cancelled()` turns true and subprocess.TimeoutExpired when `timeout` passes;
    either way the program and everything it started is ended first. Same shape as the voice engine's
    run_stoppable (voice_stoppable_run.py), plus ending the whole process group, because a shell line starts
    a second program (curl) that ending the shell alone would leave running.
    """
    extra = {"start_new_session": True} if os.name == "posix" else {}
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace", env=env, **extra
    )
    deadline = time.monotonic() + timeout
    while True:
        if cancelled():
            _end(proc)
            raise InstallStopped()
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            _end(proc)
            raise subprocess.TimeoutExpired(cmd, timeout)
        try:
            out, err = proc.communicate(timeout=min(POLL_SECONDS, remaining))
        except subprocess.TimeoutExpired:
            continue
        return subprocess.CompletedProcess(cmd, proc.returncode, out, err)


def _curl(args: list[str], env: dict[str, str], seconds: float, cancelled: Callable[[], bool]) -> "subprocess.CompletedProcess[str]":
    """curl over https only, redirects included; a missing curl or a timeout becomes a plain problem."""
    cmd = ["curl", "-sS", "--proto", "=https", "--proto-redir", "=https", "--connect-timeout", "20", *args]
    try:
        return run_cancellable(cmd, env=env, timeout=seconds + 15, cancelled=cancelled)
    except subprocess.TimeoutExpired:
        raise InstallProblem(f"The Ollama download took too long. {_KEEP_OLD} Check the Internet connection and try again.")
    except FileNotFoundError:
        raise InstallProblem(f"The 'curl' tool is missing on this Deck, so Ollama could not be fetched. {_KEEP_OLD}")


def _no_check_number(why: str) -> InstallProblem:
    return InstallProblem(
        f"Ollama was not installed: {why}, so the download could not be trusted. {_KEEP_OLD} "
        "Check the Internet connection and try again."
    )


def latest_release_tag(env: dict[str, str], cancelled: Callable[[], bool]) -> str:
    """The tag of Ollama's newest release, read once from where github.com sends /releases/latest."""
    run = _curl(["--max-time", str(SMALL_FETCH_SECONDS), "-o", os.devnull, "-w", "%{redirect_url}", f"{RELEASES_URL}/latest"], env, SMALL_FETCH_SECONDS, cancelled)
    match = _TAG_REDIRECT.match((run.stdout or "").strip())
    if run.returncode != 0 or not match:
        raise _no_check_number("github.com did not say which release is the newest")
    return match.group(1)


def published_check_number(tag: str, file_name: str, spare: Path, env: dict[str, str], cancelled: Callable[[], bool]) -> str:
    """The sha256 Ollama published for `file_name` in release `tag` (its sha256sum.txt). Refuses if absent."""
    target = spare / CHECKSUM_FILE_NAME
    run = _curl(["-fL", "--max-time", str(SMALL_FETCH_SECONDS), "--max-filesize", "1048576", "-o", str(target), f"{RELEASES_URL}/download/{tag}/{CHECKSUM_FILE_NAME}"], env, SMALL_FETCH_SECONDS, cancelled)
    if run.returncode != 0 or not target.is_file() or target.stat().st_size > 1048576:
        raise _no_check_number(f"its check number for {tag} could not be fetched from github.com")
    for line in target.read_text(encoding="utf-8", errors="replace").splitlines():
        found = _CHECK_LINE.fullmatch(line.strip())
        if found and found.group(2) == file_name:
            return found.group(1).lower()
    raise _no_check_number(f"Ollama's release {tag} lists no check number for {file_name}")


def _sha256_of(path: Path, cancelled: Callable[[], bool]) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(_HASH_CHUNK):
            if cancelled():
                raise InstallStopped()
            digest.update(chunk)
    return digest.hexdigest()


def _swap_in(stage: Path, dst: Path, trash: Path) -> None:
    """Rename each of the new program's folders' contents (bin/ollama, lib/ollama) into `dst`.

    The old copy of each goes into `trash` first, so any failure puts the old files back. Raises OSError for
    a failed swap that was put back, _SwapBroken when even the put-back failed.
    """
    plan = []
    for top in sorted(stage.iterdir()):
        if top.is_symlink():
            raise OSError(f"unexpected link {top.name} in the unpacked Ollama")
        plan += [(c, dst / top.name / c.name) for c in sorted(top.iterdir())] if top.is_dir() else [(top, dst / top.name)]
    trash.mkdir(parents=True, exist_ok=True)
    done: list[tuple[Path, Optional[Path]]] = []
    try:
        for index, (new, target) in enumerate(plan):
            target.parent.mkdir(parents=True, exist_ok=True)
            old: Optional[Path] = None
            if target.exists() or target.is_symlink():
                old = trash / "__".join(target.relative_to(dst).parts)
                os.replace(target, old)
            done.append((target, old))
            os.replace(new, target)
    except BaseException:
        try:
            for target, old in reversed(done):
                if target.is_dir() and not target.is_symlink():
                    shutil.rmtree(target)
                elif target.exists() or target.is_symlink():
                    target.unlink()
                if old is not None:
                    os.replace(old, target)
        except OSError as exc:
            raise _SwapBroken(str(exc)) from exc
        raise


def _keep_old_files(spare: Path, dst: Path) -> Path:
    """Move the old copy out of the spare folder under a name _sweep_old_spares never removes.

    Only the old files are kept (not the 1.5 GB download); if that rename fails the whole spare folder is
    renamed instead; if that fails too the spare folder stays as it is. Returns where the old copy now is.
    """
    keep = dst / f"{KEPT_PREFIX}{spare.name[len(SPARE_PREFIX):]}"
    for source in (spare / "old", spare):
        try:
            os.replace(source, keep)
            return keep
        except OSError:
            continue
    return spare


def _sweep_old_spares(dst: Path) -> None:
    """Remove spare folders a crashed run left behind (only ours, only when an hour old)."""
    try:
        for found in dst.glob(f"{SPARE_PREFIX}*"):
            if found.is_dir() and not found.is_symlink() and time.time() - found.stat().st_mtime > STALE_SPARE_SECONDS:
                shutil.rmtree(found, ignore_errors=True)
    except OSError:
        pass


def install_ollama_from_release(
    *,
    home: Path,
    file_stem: str,
    env: dict[str, str],
    bash: str,
    shell_log: Callable[[str], None],
    cancelled: Callable[[], bool],
) -> None:
    """Put the newest Ollama into `home`/.local, or raise and leave the old one exactly as it was.

    Returns only when the new files are in place. Raises InstallStopped on Cancel and InstallProblem
    (message in plain words) for everything else that can go wrong.
    """
    dst = home / ".local"
    file_name = f"{file_stem}.tar.zst"
    if shutil.which("zstd", path=env.get("PATH")) is None:
        raise InstallProblem(f"Ollama needs the 'zstd' tool to unpack, and this Deck does not have it. {_KEEP_OLD} Install 'zstd' from Desktop mode and try again.")
    (dst / "bin").mkdir(parents=True, exist_ok=True)
    _sweep_old_spares(dst)
    spare = dst / f"{SPARE_PREFIX}{uuid.uuid4().hex[:8]}"
    spare.mkdir()
    kept = False
    try:
        tag = latest_release_tag(env, cancelled)
        expected = published_check_number(tag, file_name, spare, env, cancelled)
        shell_log(f"[bonsAI] Ollama {tag}: downloading {file_name} to a spare file (github.com) …")
        archive = spare / file_name
        run = _curl(["-fL", "--max-time", str(DOWNLOAD_SECONDS), "-o", str(archive), f"{RELEASES_URL}/download/{tag}/{file_name}"], env, DOWNLOAD_SECONDS, cancelled)
        if run.returncode != 0 or not archive.is_file():
            shell_log((run.stderr or "").strip()[:300])
            raise InstallProblem(f"Ollama's download did not finish, so nothing was installed. {_KEEP_OLD} Check the Internet connection and try again.")
        shell_log("[bonsAI] Checking the download against Ollama's published check number …")
        if _sha256_of(archive, cancelled) != expected:
            raise InstallProblem(f"The Ollama download did not match its published check number (it may have been cut off), so it was thrown away. {_KEEP_OLD} Try again.")
        stage = spare / "new"
        stage.mkdir()
        shell_log("[bonsAI] Unpacking Ollama into a spare folder …")
        try:
            unpacked = run_cancellable([bash, "-c", _UNPACK_LINE, "bash", str(archive), str(stage)], env=env, timeout=900, cancelled=cancelled)
        except subprocess.TimeoutExpired:
            unpacked = None
        program = stage / "bin" / "ollama"
        if unpacked is None or unpacked.returncode != 0 or not program.is_file() or program.stat().st_size == 0:
            if unpacked is not None:
                shell_log((unpacked.stderr or "").strip()[:300])
            raise InstallProblem(f"Ollama downloaded but could not be unpacked (is the disk full?). {_KEEP_OLD} Free some space and try again.")
        if not program.is_symlink():
            os.chmod(program, 0o755)
        if cancelled():
            raise InstallStopped()
        try:
            _swap_in(stage, dst, spare / "old")
        except _SwapBroken:
            keep = _keep_old_files(spare, dst)
            kept = keep == spare
            raise InstallProblem(
                "Ollama could not be put in place and the old copy could not be put back. "
                f"The old copy is kept in {keep}: move its 'bin__ollama' back to ~/.local/bin/ollama and its "
                "'lib__ollama' back to ~/.local/lib/ollama, then try again."
            )
        except OSError as exc:
            shell_log(f"[bonsAI] Swap failed and was undone: {exc}")
            raise InstallProblem(f"Ollama could not be put in place. {_KEEP_OLD} Try again.")
        shell_log(f"[bonsAI] Ollama {tag} is in place under {dst}.")
    finally:
        if not kept:
            shutil.rmtree(spare, ignore_errors=True)
