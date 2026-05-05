"""Contract tests for local Ollama setup subprocess hygiene (SteamOS / Decky)."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from unittest.mock import MagicMock, patch

from backend.services import local_ollama_setup_service as los_mod
from backend.services.local_ollama_setup_service import (
    _bash_exe,
    _env_for_host_system_tools,
    _env_for_ollama_cli,
    ensure_ollama_server_listening_before_pull,
)


class LocalOllamaSetupServiceTests(unittest.TestCase):
    def test_child_env_strips_ld_overrides_but_keeps_path(self):
        merged = dict(
            PATH="/usr/bin:/bin",
            HOME="/home/deck",
            LD_LIBRARY_PATH="/snap/bad/readline:/steam/runtime/lib",
            LD_PRELOAD="/tmp/evil.so",
            ORIG_LD_LIBRARY_PATH="/old",
            UNRELATED_KEEP="x",
        )
        with patch.dict("os.environ", merged, clear=True):
            e = _env_for_host_system_tools()
        self.assertNotIn("LD_LIBRARY_PATH", e)
        self.assertNotIn("LD_PRELOAD", e)
        self.assertNotIn("ORIG_LD_LIBRARY_PATH", e)
        self.assertEqual(e.get("HOME"), "/home/deck")
        self.assertEqual(e.get("PATH"), "/usr/bin:/bin")
        self.assertEqual(e.get("UNRELATED_KEEP"), "x")

    def test_bash_exe_returns_nonempty_string(self):
        self.assertTrue(isinstance(_bash_exe(), str) and len(_bash_exe()) >= 3)

    def test_env_for_ollama_cli_prepends_bundle_lib_when_present(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            lb = root / ".local/bin"
            libs = root / ".local/lib/ollama"
            lb.mkdir(parents=True)
            libs.mkdir(parents=True)
            bin_o = lb / "ollama"
            bin_o.write_text("#fake")
            with patch.dict("os.environ", {"PATH": "/usr/bin", "HOME": td}, clear=True):
                e = _env_for_ollama_cli(str(bin_o))
            self.assertIn("LD_LIBRARY_PATH", e)
            self.assertTrue(e["LD_LIBRARY_PATH"].startswith(str(libs)))

    def test_ensure_listen_leave_serve_running_detaches_globals_on_success(self):
        """Connection Test recovery must not leave an untracked ``ollama serve`` (orphan process)."""
        mock_proc = MagicMock()
        mock_proc.pid = 4242
        mock_proc.poll.return_value = None

        def shell_log(_msg: str) -> None:
            pass

        with patch.object(los_mod, "_OLLAMA_SERVE_PROC", None), patch.object(
            los_mod, "_OLLAMA_SERVE_STARTED_BY_SETUP", False
        ):
            with patch.object(los_mod, "probe_ollama_http_ok") as probe, patch.object(
                los_mod, "subprocess"
            ) as subp:
                probe.side_effect = [False, True]
                subp.Popen.return_value = mock_proc
                subp.DEVNULL = -3
                ok = ensure_ollama_server_listening_before_pull(
                    shell_log,
                    "/home/deck/.local/bin/ollama",
                    lambda: False,
                    max_listen_probe_iterations=5,
                    leave_serve_running=True,
                )
                self.assertTrue(ok)
                # Must assert before outer patch restores globals.
                self.assertIsNone(los_mod._OLLAMA_SERVE_PROC)
                self.assertFalse(los_mod._OLLAMA_SERVE_STARTED_BY_SETUP)
        mock_proc.terminate.assert_not_called()
        mock_proc.kill.assert_not_called()

    def test_ensure_listen_setup_path_keeps_globals_for_teardown(self):
        mock_proc = MagicMock()
        mock_proc.pid = 999
        mock_proc.poll.return_value = None

        def shell_log(_msg: str) -> None:
            pass

        with patch.object(los_mod, "_OLLAMA_SERVE_PROC", None), patch.object(
            los_mod, "_OLLAMA_SERVE_STARTED_BY_SETUP", False
        ):
            with patch.object(los_mod, "probe_ollama_http_ok") as probe, patch.object(
                los_mod, "subprocess"
            ) as subp:
                probe.side_effect = [False, True]
                subp.Popen.return_value = mock_proc
                subp.DEVNULL = -3
                ok = ensure_ollama_server_listening_before_pull(
                    shell_log,
                    "/home/deck/.local/bin/ollama",
                    lambda: False,
                    max_listen_probe_iterations=5,
                    leave_serve_running=False,
                )
                self.assertTrue(ok)
                self.assertIs(los_mod._OLLAMA_SERVE_PROC, mock_proc)
                self.assertTrue(los_mod._OLLAMA_SERVE_STARTED_BY_SETUP)


if __name__ == "__main__":
    unittest.main()
