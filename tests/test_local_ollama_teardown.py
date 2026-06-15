"""Tests for local Ollama teardown on clear_plugin_data."""

from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.services.local_ollama_teardown_service import (
    _path_within_home,
    teardown_local_ollama_for_plugin_reset,
)


class PathWithinHomeTests(unittest.TestCase):
    def test_accepts_home_subpath(self):
        home = Path("/home/deck")
        self.assertTrue(_path_within_home(home / ".ollama", home))

    def test_rejects_outside_home(self):
        home = Path("/home/deck")
        self.assertFalse(_path_within_home(Path("/var/ollama"), home))


class TeardownLocalOllamaTests(unittest.TestCase):
    @patch("backend.services.local_ollama_teardown_service.sys.platform", "linux")
    @patch("backend.services.local_ollama_teardown_service.shutil.rmtree")
    @patch("backend.services.local_ollama_teardown_service.subprocess.run")
    @patch("backend.services.local_ollama_setup_service.run_ollama_rm")
    @patch("backend.services.local_ollama_setup_service.resolve_ollama_executable")
    @patch("backend.services.local_ollama_setup_service.list_installed_ollama_tags")
    @patch("backend.services.local_ollama_setup_service.terminate_setup_started_ollama_serve")
    def test_removes_tags_and_home_paths(
        self,
        _terminate,
        list_tags,
        resolve_bin,
        run_rm,
        subprocess_run,
        rmtree,
    ):
        list_tags.return_value = ["qwen2.5vl:3b"]
        resolve_bin.return_value = "/home/deck/.local/bin/ollama"
        run_rm.return_value = (True, "")

        fake_home = Path("/home/deck")

        def fake_home_fn():
            return fake_home

        with patch.object(Path, "home", staticmethod(fake_home_fn)):
            with patch.object(Path, "expanduser", lambda self: self):
                bin_path = fake_home / ".local" / "bin" / "ollama"
                bin_path.parent.mkdir(parents=True, exist_ok=True)
                bin_path.write_text("stub", encoding="utf-8")
                lib_path = fake_home / ".local" / "lib" / "ollama"
                lib_path.mkdir(parents=True, exist_ok=True)
                models_path = fake_home / ".ollama"
                models_path.mkdir(parents=True, exist_ok=True)
                cache_path = fake_home / ".bonsai" / "cache"
                cache_path.mkdir(parents=True, exist_ok=True)

                out = teardown_local_ollama_for_plugin_reset(MagicMock())

        self.assertEqual(out["removed_tags"], ["qwen2.5vl:3b"])
        run_rm.assert_called_once()
        self.assertTrue(subprocess_run.called)
        self.assertGreaterEqual(rmtree.call_count, 2)


if __name__ == "__main__":
    unittest.main()
