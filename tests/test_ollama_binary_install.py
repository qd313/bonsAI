"""Title: Installing or updating Ollama can be stopped, and can never half-break the old copy

Purpose: Pins the level the Deck shows (the status the Ollama tab and the first-time card read, and the
files left on disk). A Stop pressed while Ollama downloads ends the run as "stopped" with no restart of the
Deck's AI and nothing left behind; a download that is cut off, does not match Ollama's published check
number, cannot be unpacked, or has no check number to compare with leaves the old Ollama exactly as it was
and says why in plain words; a good download replaces the old files completely.
Used for: local_ollama_setup_service.py (run_local_setup, run_tarball_user_local_install,
run_official_linux_install) and ollama_binary_install.py. Written before the fix, so the same tests also
run against the old blocking install and fail there for the reasons the review gave.
Does not: Touch the network or run curl, zstd or tar (tests/ollama_install_fake_net.py stands in).
"""

from __future__ import annotations

import asyncio
import os
import sys
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_install_fake_net import ARCHIVE_NAME, FakeNet  # noqa: E402

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402

try:
    from backend.ollama import ollama_binary_install as binary  # noqa: E402
except ImportError:  # before the fix this module does not exist
    binary = None

S = "backend.ollama.local_ollama_setup_service"
OLD_FILES = {"bin/ollama": "OLD", "lib/ollama/libold.so": "OLD"}
NEW_FILES = {"bin/ollama": "NEW", "lib/ollama/libnew.so": "NEW"}
LOGGER = type("L", (), {"info": lambda *a, **k: None, "exception": lambda *a, **k: None})()


def _snapshot(dst: Path) -> dict[str, str]:
    return {p.relative_to(dst).as_posix(): p.read_text() for p in sorted(dst.rglob("*")) if p.is_file()}


def _which(name, *args, **kwargs):
    return "/usr/bin/zstd" if name == "zstd" else None


class InstallWorld:
    """A pretend home with an old Ollama in it, a pretend network, and the setup run on top of them."""

    def __init__(self, tmp: str) -> None:
        self.home = Path(tmp)
        self.dst = self.home / ".local"
        for rel, text in OLD_FILES.items():
            path = self.dst / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        self.net = FakeNet(self.home)
        self.restarts: list[int] = []
        self.cancel_event: asyncio.Event | None = None

    def patches(self, stack: ExitStack) -> None:
        for target, kw in {
            f"{S}.sys.platform": {"new": "linux"},
            f"{S}._prefer_user_prefix_ollama_install_linux": {"return_value": True},
            f"{S}._ollama_linux_download_stem": {"return_value": ARCHIVE_NAME.removesuffix(".tar.zst")},
            f"{S}._bash_exe": {"return_value": "bash"},
            f"{S}.resolve_ollama_executable": {"return_value": str(self.dst / "bin" / "ollama")},
            f"{S}.probe_ollama_http_ok": {"return_value": True},
            f"{S}.ensure_ollama_server_listening_before_pull": {"return_value": True},
            f"{S}.ensure_ollama_cli_home_ready": {"return_value": True},
            f"{S}.list_installed_ollama_tags": {"return_value": []},
            f"{S}.record_result": {},
            f"{S}.restart_server_onto_new_binary": {"side_effect": lambda *a, **k: self.restarts.append(1) or {}},
            "subprocess.Popen": {"side_effect": self.net.popen},
            "shutil.which": {"side_effect": _which},
        }.items():
            stack.enter_context(patch(target, **kw))
        stack.enter_context(patch.dict(os.environ, {"HOME": str(self.home), "USERPROFILE": str(self.home)}))
        if binary is not None:
            stack.enter_context(patch.object(binary, "POLL_SECONDS", 0.01))
            stack.enter_context(patch.object(binary, "_signal_group", side_effect=lambda proc, hard: proc.terminate()))

    def run_update(self, on_verbose_line=None) -> dict:
        state: dict = {"phase": "running"}

        async def go() -> None:
            self.cancel_event = asyncio.Event()
            self.net.press_stop = self.cancel_event.set
            await setup.run_local_setup(
                profile="update_installed", state=state, logger=LOGGER, cancel_event=self.cancel_event,
                on_verbose_line=on_verbose_line,
            )

        with ExitStack() as stack:
            self.patches(stack)
            asyncio.run(go())
        return state


class AStopDuringTheDownloadEndsTheRun(unittest.TestCase):
    def _assert_stopped_cleanly(self, world: InstallWorld, state: dict) -> None:
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(world.restarts, [], "the Deck's AI was restarted after a Stop")
        self.assertEqual(_snapshot(world.dst), OLD_FILES, "something was left behind or changed")

    def test_a_stop_while_ollama_downloads_ends_as_stopped_with_no_restart_and_nothing_left(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.download, world.net.stop_when = "slow", "download"
            self._assert_stopped_cleanly(world, world.run_update())

    def test_a_stop_while_the_check_number_is_looked_up_ends_as_stopped(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.stop_when = "tag"
            self._assert_stopped_cleanly(world, world.run_update())

    def test_a_stop_after_the_unpack_but_before_the_swap_changes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.stop_when = "unpack_done"
            self._assert_stopped_cleanly(world, world.run_update())

    def test_a_stop_right_after_the_files_are_in_place_still_skips_the_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)

            def watch(line: str) -> None:
                if "is in place" in line:
                    world.cancel_event.set()

            state = world.run_update(on_verbose_line=watch)
            self.assertEqual(state["phase"], "cancelled")
            self.assertEqual(world.restarts, [], "the AI was restarted although Stop came before the restart step")


class ABadDownloadLeavesTheOldOllamaWorking(unittest.TestCase):
    def _assert_old_ollama_untouched(self, world: InstallWorld, state: dict) -> None:
        self.assertEqual(state["phase"], "failed")
        self.assertEqual(_snapshot(world.dst), OLD_FILES, "old and new files are mixed, or a spare file is left")

    def test_a_download_that_does_not_match_its_check_number_is_thrown_away(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.sums = "wrong"
            state = world.run_update()
            self._assert_old_ollama_untouched(world, state)
            self.assertIn("check number", state["error"])
            self.assertIn("not changed", state["error"])

    def test_a_cut_off_download_leaves_the_old_ollama_in_place(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.download = "cut_off"
            self._assert_old_ollama_untouched(world, world.run_update())

    def test_an_unpack_that_fails_leaves_the_old_ollama_in_place(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.unpack = "fails"
            state = world.run_update()
            self._assert_old_ollama_untouched(world, state)
            self.assertIn("not changed", state["error"])

    def test_a_check_number_that_cannot_be_fetched_refuses_to_install_and_says_what_to_do(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.sums = "unreachable"
            state = world.run_update()
            self._assert_old_ollama_untouched(world, state)
            self.assertIn("check number", state["error"])
            self.assertIn("try again", state["error"])
            self.assertNotIn("curl -fsSL", state["error"], "the card must not tell people to run an unchecked install")
            archives = [c for c in world.net.commands if c[0] == "curl" and c[-1].endswith(".tar.zst")]
            self.assertEqual(archives, [], "the big download started without a check number to compare with")

    def test_a_release_page_with_no_line_for_this_file_refuses_to_install(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.sums = "no_entry"
            state = world.run_update()
            self._assert_old_ollama_untouched(world, state)
            self.assertIn("no check number", state["error"])

    def test_a_newest_release_that_cannot_be_read_refuses_to_install(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.net.tag_ok = False
            self._assert_old_ollama_untouched(world, world.run_update())


class AGoodDownloadReplacesTheOldFilesCompletely(unittest.TestCase):
    def test_new_files_in_old_files_gone_no_spare_folder_left(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            state = world.run_update()
            self.assertEqual(state["phase"], "done")
            self.assertEqual(_snapshot(world.dst), NEW_FILES)
            self.assertEqual(world.restarts, [1])


class EveryShellLineFailsWhenItsDownloadFails(unittest.TestCase):
    def test_the_unpack_line_has_pipefail(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            world.run_update()
            lines = [c for c in world.net.commands if c[0].endswith("bash")]
            self.assertTrue(lines, "no shell line ran")
            for line in lines:
                self.assertIn("set -o pipefail", " ".join(line))

    def test_the_official_script_line_has_pipefail(self):
        with tempfile.TemporaryDirectory() as tmp:
            world = InstallWorld(tmp)
            seen: list[list[str]] = []

            def popen(cmd, *a, **k):
                seen.append([str(c) for c in cmd])
                return world.net.popen(cmd, *a, **k)

            with ExitStack() as stack:
                world.patches(stack)
                stack.enter_context(patch(f"{S}._prefer_user_prefix_ollama_install_linux", return_value=False))
                stack.enter_context(patch("subprocess.Popen", side_effect=popen))
                stack.enter_context(patch(f"{S}.os.geteuid", create=True, return_value=0))
                setup.run_official_linux_install(lambda _m: None)
            script = [c for c in seen if c and c[0].endswith("bash") and "install.sh" in " ".join(c)]
            self.assertTrue(script, "the official installer line did not run")
            self.assertIn("set -o pipefail", " ".join(script[0]))


@unittest.skipIf(binary is None, "new module")
class TheProgramRunnerEndsWhatItStarted(unittest.TestCase):
    def test_cancel_ends_a_real_long_program_within_a_couple_of_seconds(self):
        import time

        flag = {"stop": False}
        started = time.monotonic()
        with patch.object(binary, "POLL_SECONDS", 0.05):
            def cancelled() -> bool:
                flag["stop"] = flag["stop"] or time.monotonic() - started > 0.3
                return flag["stop"]

            with self.assertRaises(binary.InstallStopped):
                binary.run_cancellable([sys.executable, "-c", "import time; time.sleep(60)"], env=None, timeout=120, cancelled=cancelled)
        self.assertLess(time.monotonic() - started, 10)

    @unittest.skipUnless(os.name == "posix", "process groups exist on the Deck, not on a Windows PC")
    def test_cancel_also_ends_the_program_a_shell_line_started(self):
        import time

        with tempfile.TemporaryDirectory() as tmp:
            pid_file = Path(tmp) / "child.pid"
            line = f'sleep 60 & echo $! > "{pid_file}"; wait'
            with patch.object(binary, "POLL_SECONDS", 0.05), self.assertRaises(binary.InstallStopped):
                binary.run_cancellable(["bash", "-c", line], env=None, timeout=120, cancelled=lambda: pid_file.exists() and pid_file.stat().st_size > 0)
            child = int(pid_file.read_text())
            for _ in range(40):
                try:
                    os.kill(child, 0)
                except ProcessLookupError:
                    return
                time.sleep(0.05)
            self.fail("the program the shell line started is still running after Cancel")

    def test_the_time_limit_ends_a_real_program_and_says_so(self):
        import subprocess

        with patch.object(binary, "POLL_SECONDS", 0.05):
            with self.assertRaises(subprocess.TimeoutExpired):
                binary.run_cancellable([sys.executable, "-c", "import time; time.sleep(60)"], env=None, timeout=0.4, cancelled=lambda: False)


@unittest.skipIf(binary is None, "new module")
class ASwapThatFailsPutsTheOldFilesBack(unittest.TestCase):
    def _stage(self, tmp: str) -> tuple[Path, Path, Path]:
        dst, stage, trash = Path(tmp) / "dst", Path(tmp) / "stage", Path(tmp) / "trash"
        for root, files in ((dst, OLD_FILES), (stage, NEW_FILES)):
            for rel, text in files.items():
                (root / rel).parent.mkdir(parents=True, exist_ok=True)
                (root / rel).write_text(text)
        return dst, stage, trash

    def test_a_failure_part_way_through_the_swap_restores_every_old_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            dst, stage, trash = self._stage(tmp)
            real = os.replace

            def flaky(src, target):
                if Path(target) == dst / "lib" / "ollama" and Path(src) == stage / "lib" / "ollama":
                    raise OSError("disk went away")
                return real(src, target)

            with patch.object(binary.os, "replace", side_effect=flaky), self.assertRaises(OSError):
                binary._swap_in(stage, dst, trash)
            self.assertEqual(_snapshot(dst), OLD_FILES)

    def test_a_swap_that_works_leaves_only_the_new_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            dst, stage, trash = self._stage(tmp)
            binary._swap_in(stage, dst, trash)
            self.assertEqual(_snapshot(dst), NEW_FILES)


if __name__ == "__main__":
    unittest.main()
