"""Tests for local Ollama teardown on clear_plugin_data."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.ollama.local_ollama_teardown_service import (
    _path_within_home,
    should_teardown_local_ollama_on_clear,
    teardown_local_ollama_for_plugin_reset,
)


class PathWithinHomeTests(unittest.TestCase):
    def test_accepts_home_subpath(self):
        home = Path("/home/deck")
        self.assertTrue(_path_within_home(home / ".ollama", home))

    def test_rejects_outside_home(self):
        home = Path("/home/deck")
        self.assertFalse(_path_within_home(Path("/var/ollama"), home))


class ShouldTeardownLocalOllamaTests(unittest.TestCase):
    def test_true_when_local_on_deck(self):
        self.assertTrue(should_teardown_local_ollama_on_clear({"ollama_local_on_deck": True}))

    def test_false_on_windows(self):
        with patch("backend.ollama.local_ollama_teardown_service.sys.platform", "win32"):
            self.assertFalse(should_teardown_local_ollama_on_clear({"ollama_local_on_deck": False}))

    def test_true_when_ollama_home_exists(self):
        fake_home = Path("/home/deck")

        def fake_home_fn():
            return fake_home

        real_exists = Path.exists

        def exists(self: Path) -> bool:
            if self == fake_home / ".ollama":
                return True
            return real_exists(self)

        with patch("backend.ollama.local_ollama_teardown_service.sys.platform", "linux"):
            with patch.object(Path, "home", staticmethod(fake_home_fn)):
                with patch.object(Path, "exists", exists):
                    self.assertTrue(should_teardown_local_ollama_on_clear({"ollama_local_on_deck": False}))


class TeardownLocalOllamaTests(unittest.TestCase):
    # Patch targets are the *teardown* module, not local_ollama_setup_service: the
    # teardown service does `from ... import run_ollama_rm, ...`, which binds those
    # names into its own namespace at import time, so patching the source module
    # would leave the bound references untouched.
    @patch.dict("os.environ", {"OLLAMA_MODELS": ""})
    @patch("backend.ollama.local_ollama_teardown_service.sys.platform", "linux")
    @patch("backend.ollama.local_ollama_teardown_service.shutil.rmtree")
    @patch("backend.ollama.local_ollama_teardown_service._stop_local_ollama_listener")
    @patch("backend.ollama.local_ollama_teardown_service.run_ollama_rm")
    @patch("backend.ollama.local_ollama_teardown_service.resolve_ollama_executable")
    @patch("backend.ollama.local_ollama_teardown_service.list_installed_ollama_tags")
    @patch("backend.ollama.local_ollama_teardown_service.terminate_setup_started_ollama_serve")
    def test_removes_tags_and_home_paths(
        self,
        _terminate,
        list_tags,
        resolve_bin,
        run_rm,
        stop_listener,
        rmtree,
    ):
        list_tags.return_value = ["qwen2.5vl:3b"]
        run_rm.return_value = (True, "")

        with tempfile.TemporaryDirectory() as tmp:
            fake_home = Path(tmp)
            resolve_bin.return_value = str(fake_home / ".local" / "bin" / "ollama")

            def fake_home_fn():
                return fake_home

            with patch.object(Path, "home", staticmethod(fake_home_fn)):
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

                # unlink is not mocked, so the user-prefix binary is really removed.
                self.assertFalse(bin_path.is_file())

        self.assertEqual(out["removed_tags"], ["qwen2.5vl:3b"])
        run_rm.assert_called_once()
        # Stopping the running listener moved into _stop_local_ollama_listener
        # (local_ollama_setup_service); the teardown service no longer shells out itself.
        self.assertTrue(stop_listener.called)
        self.assertGreaterEqual(rmtree.call_count, 2)


class KeptOldOllamaCopiesAreRemovedToo(unittest.TestCase):
    """Clear all data leaves no `.bonsai-ollama-KEPT-*` folder (the old Ollama a failed update kept) behind."""

    def _make_home(self, tmp: str) -> Path:
        home = Path(tmp)
        local = home / ".local"
        (local / "bin").mkdir(parents=True)
        (local / "bin" / "ollama").write_text("stub", encoding="utf-8")
        kept_files = local / ".bonsai-ollama-KEPT-aaaa1111"
        kept_files.mkdir()
        (kept_files / "bin__ollama").write_text("old", encoding="utf-8")
        kept_spare = local / ".bonsai-ollama-KEPT-bbbb2222"
        (kept_spare / "old").mkdir(parents=True)
        (kept_spare / "old" / "bin__ollama").write_text("old", encoding="utf-8")
        (local / ".bonsai-ollama-update-cccc3333").mkdir()  # a spare folder a crash or a stuck rename left
        (local / "share-of-someone-else").mkdir()
        return home

    def test_clear_all_data_deletes_the_kept_folders_and_nothing_else_of_theirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = self._make_home(tmp)
            with patch.dict("os.environ", {"OLLAMA_MODELS": ""}), patch(
                "backend.ollama.local_ollama_teardown_service.sys.platform", "linux"
            ), patch("backend.ollama.local_ollama_teardown_service._stop_local_ollama_listener"), patch(
                "backend.ollama.local_ollama_teardown_service.terminate_setup_started_ollama_serve"
            ), patch(
                "backend.ollama.local_ollama_teardown_service.list_installed_ollama_tags", return_value=[]
            ), patch(
                "backend.ollama.local_ollama_teardown_service.resolve_ollama_executable", return_value=""
            ), patch.object(Path, "home", staticmethod(lambda: home)):
                out = teardown_local_ollama_for_plugin_reset(MagicMock())
            left = sorted(p.name for p in (home / ".local").iterdir())
        self.assertEqual(left, ["bin", "share-of-someone-else"])
        self.assertEqual(sorted(out["removed_kept_old_copies"]), [
            ".bonsai-ollama-KEPT-aaaa1111", ".bonsai-ollama-KEPT-bbbb2222", ".bonsai-ollama-update-cccc3333",
        ])

    def test_a_kept_folder_alone_counts_as_something_to_clear(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / ".local" / ".bonsai-ollama-KEPT-aaaa1111").mkdir(parents=True)
            with patch("backend.ollama.local_ollama_teardown_service.sys.platform", "linux"), patch.object(
                Path, "home", staticmethod(lambda: home)
            ):
                self.assertTrue(should_teardown_local_ollama_on_clear({"ollama_local_on_deck": False}))


if __name__ == "__main__":
    unittest.main()
