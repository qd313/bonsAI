"""Title: Setup finds Ollama in ~/.local/bin even when the plugin's PATH does not list it

Purpose: On the Deck, Ollama lives at ~/.local/bin/ollama and is running, but the plugin's own PATH lacks that
folder. The starter-set install looked only at the PATH, said "ollama not found on PATH; running official
installer" and spent about 36 seconds re-running the installer (plan93-P93-B3-STARTER-DECK-D3.json). These pin
the level the Deck showed: with the PATH lacking, the setup check finds the program and does not run the installer.
Used for: ollama_locate.py and resolve_ollama_executable / _install_or_update_ollama_binary in
local_ollama_setup_service.py.
Does not: Touch the network or run a real installer.
"""

from __future__ import annotations

import asyncio
import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402
from backend.ollama import ollama_locate as locate  # noqa: E402

S = "backend.ollama.local_ollama_setup_service"


def _fake_home_with_ollama(tmp: str) -> str:
    bin_dir = Path(tmp) / ".local" / "bin"
    bin_dir.mkdir(parents=True)
    exe = bin_dir / "ollama"
    exe.write_text("#!/bin/sh\n")
    exe.chmod(exe.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return str(exe)


class FindsOllamaOffThePath(unittest.TestCase):
    def test_the_user_prefix_is_found_when_the_path_lacks_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            exe = _fake_home_with_ollama(tmp)
            with (
                patch.dict(os.environ, {"HOME": tmp, "USERPROFILE": tmp}),
                patch("backend.ollama.ollama_connectivity.shutil.which", return_value=None),
            ):
                self.assertEqual(os.path.normcase(locate.find_ollama_executable()), os.path.normcase(exe))
                self.assertEqual(os.path.normcase(setup.resolve_ollama_executable()), os.path.normcase(exe))

    def test_the_setup_check_does_not_run_the_installer_for_it(self):
        ran: list[int] = []
        state: dict = {}
        with tempfile.TemporaryDirectory() as tmp:
            exe = _fake_home_with_ollama(tmp)
            with (
                patch.dict(os.environ, {"HOME": tmp, "USERPROFILE": tmp}),
                patch("backend.ollama.ollama_connectivity.shutil.which", return_value=None),
                patch(f"{S}.run_official_linux_install", side_effect=lambda *_a: ran.append(1) or (True, "")),
            ):
                got = asyncio.run(
                    setup._install_or_update_ollama_binary(
                        state=state, log=lambda _m: None, cancelled=lambda: False, force_reinstall=False
                    )
                )
        self.assertEqual(os.path.normcase(got), os.path.normcase(exe))
        self.assertEqual(ran, [])
        self.assertNotEqual(state.get("stage"), "install")

    def test_a_deck_with_no_ollama_anywhere_still_runs_the_installer(self):
        ran: list[int] = []
        with tempfile.TemporaryDirectory() as tmp:
            exe = _fake_home_with_ollama(tmp)
            finds = iter([None, exe])

            with (
                patch.dict(os.environ, {"HOME": tmp, "USERPROFILE": tmp}),
                patch(f"{S}.resolve_ollama_executable", side_effect=lambda: next(finds)),
                patch(f"{S}.run_official_linux_install", side_effect=lambda *_a: ran.append(1) or (True, "")),
            ):
                got = asyncio.run(
                    setup._install_or_update_ollama_binary(
                        state={}, log=lambda _m: None, cancelled=lambda: False, force_reinstall=False
                    )
                )
        self.assertEqual(got, exe)
        self.assertEqual(ran, [1])


class FindsTheRunningServersProgram(unittest.TestCase):
    def test_a_process_named_ollama_gives_its_program(self):
        with tempfile.TemporaryDirectory() as tmp:
            exe = _fake_home_with_ollama(tmp)
            proc = Path(tmp) / "proc"
            (proc / "4242").mkdir(parents=True)
            (proc / "4242" / "comm").write_text("ollama\n")
            (proc / "77").mkdir()
            (proc / "77" / "comm").write_text("bash\n")
            (proc / "self").mkdir()
            with patch("backend.ollama.ollama_locate.os.readlink", return_value=exe):
                self.assertEqual(locate.running_ollama_executable(str(proc)), exe)

    def test_no_process_named_ollama_gives_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "9").mkdir()
            (Path(tmp) / "9" / "comm").write_text("bash\n")
            self.assertIsNone(locate.running_ollama_executable(tmp))

    def test_a_missing_proc_folder_gives_none(self):
        self.assertIsNone(locate.running_ollama_executable("/no/such/proc"))

    def test_the_running_program_is_the_last_place_looked(self):
        with (
            patch.object(locate, "guess_ollama_cli_paths", return_value=[]),
            patch.object(locate, "running_ollama_executable", return_value="/opt/x/ollama"),
        ):
            self.assertEqual(locate.find_ollama_executable(), "/opt/x/ollama")


if __name__ == "__main__":
    unittest.main()
