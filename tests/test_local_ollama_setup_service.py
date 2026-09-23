"""Contract tests for local Ollama setup subprocess hygiene (SteamOS / Decky)."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from unittest.mock import patch

from backend.services.local_ollama_setup_service import (
    _bash_exe,
    _env_for_host_system_tools,
    _env_for_ollama_cli,
    ensure_ollama_cli_home_ready,
    list_installed_ollama_tags,
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

    def test_list_installed_ollama_tags_parses_models(self):
        payload = b'{"models":[{"name":"qwen2.5:1.5b"},{"name":"llava:7b"}]}'
        with patch("urllib.request.urlopen") as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = payload
            tags = list_installed_ollama_tags("http://127.0.0.1:11434")
        self.assertEqual(tags, ["qwen2.5:1.5b", "llava:7b"])

    def test_ensure_ollama_cli_home_ready_forces_fresh_serve_when_key_missing(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            ollama_bin = home / "ollama"
            ollama_bin.write_text("#fake")
            key = home / ".ollama" / "id_ed25519"
            logs: list[str] = []
            poll = {"n": 0}

            def log(msg: str) -> None:
                logs.append(msg)

            def listen_side_effect(*_args, **_kwargs):
                key.parent.mkdir(parents=True, exist_ok=True)
                key.write_text("ssh-key")
                return True

            with (
                patch("backend.services.local_ollama_setup_service.Path.home", return_value=home),
                patch(
                    "backend.services.local_ollama_setup_service.probe_ollama_http_ok",
                    return_value=True,
                ),
                patch(
                    "backend.services.local_ollama_setup_service.ensure_ollama_server_listening_before_pull",
                    side_effect=listen_side_effect,
                ) as mock_listen,
                patch("backend.services.local_ollama_setup_service._stop_local_ollama_listener"),
                patch("backend.services.local_ollama_setup_service.terminate_setup_started_ollama_serve"),
                patch("backend.services.local_ollama_setup_service.time.sleep", side_effect=lambda _s: poll.__setitem__("n", poll["n"] + 1)),
            ):
                ok = ensure_ollama_cli_home_ready(log, str(ollama_bin), lambda: False)

            self.assertTrue(ok)
            mock_listen.assert_called_once()
            self.assertTrue(mock_listen.call_args.kwargs.get("force_fresh_serve"))
            self.assertTrue(key.is_file())

    def test_both_start_paths_keep_the_same_number_of_models_loaded(self):
        """The plugin starting Ollama itself used to allow 1 loaded model while the
        start-with-the-Deck service allowed 2, so the same Deck swapped models on every
        question or not depending on how Ollama had been started. Both now come from one value."""
        from backend.services import local_ollama_setup_service as setup
        from backend.services.ollama_local_autostart_service import _AUTOSTART_ENV

        with patch.dict("os.environ", {}, clear=True), patch.object(setup.sys, "platform", "linux"):
            direct = setup._linux_ollama_gpu_env_defaults()
        self.assertEqual(direct["OLLAMA_MAX_LOADED_MODELS"], "2")
        self.assertEqual(direct["OLLAMA_MAX_LOADED_MODELS"], _AUTOSTART_ENV["OLLAMA_MAX_LOADED_MODELS"])

    def test_a_models_limit_the_user_set_is_left_alone(self):
        from backend.services import local_ollama_setup_service as setup

        with patch.dict("os.environ", {"OLLAMA_MAX_LOADED_MODELS": "3"}, clear=True), patch.object(
            setup.sys, "platform", "linux"
        ):
            direct = setup._linux_ollama_gpu_env_defaults()
        self.assertNotIn("OLLAMA_MAX_LOADED_MODELS", direct)


if __name__ == "__main__":
    unittest.main()
