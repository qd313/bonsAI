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

    def test_list_installed_ollama_tags_returns_empty_on_error(self):
        with patch("urllib.request.urlopen", side_effect=OSError("down")):
            self.assertEqual(list_installed_ollama_tags("http://127.0.0.1:11434"), [])


if __name__ == "__main__":
    unittest.main()
