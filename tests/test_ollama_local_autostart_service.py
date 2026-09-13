"""Tests for the per-user Ollama startup entry (apply_/get_ollama_local_autostart).

Covers the rules from the maintainer's brief directly: refuse safely with no
Ollama, no per-user startup services, or an unwritable startup folder; never
write outside the caller's home folder; leave any already-running Ollama
completely alone in both directions; raise only the loaded-model limit and
leave the other environment variables untouched.
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.services.ollama_local_autostart_service import (
    UNIT_NAME,
    _path_within_home,
    apply_ollama_local_autostart,
    get_ollama_local_autostart_status,
)

_MODULE = "backend.services.ollama_local_autostart_service"


def _fake_home(tmp: str) -> Path:
    return Path(tmp)


def _write_ollama_binary(home: Path) -> Path:
    bin_path = home / ".local" / "bin" / "ollama"
    bin_path.parent.mkdir(parents=True, exist_ok=True)
    bin_path.write_text("stub", encoding="utf-8")
    return bin_path


def _unit_path(home: Path) -> Path:
    return home / ".config" / "systemd" / "user" / UNIT_NAME


class PathWithinHomeTests(unittest.TestCase):
    def test_accepts_home_subpath(self):
        home = Path("/home/deck")
        self.assertTrue(_path_within_home(home / ".config" / "systemd" / "user", home))

    def test_rejects_outside_home(self):
        home = Path("/home/deck")
        self.assertFalse(_path_within_home(Path("/etc/systemd/system"), home))


class ApplyRefusalTests(unittest.TestCase):
    """Each refusal must change nothing on disk and say a plain reason."""

    def test_refuses_when_ollama_not_installed(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                out = apply_ollama_local_autostart(True)
            self.assertFalse(out["ok"])
            self.assertFalse(out["changed"])
            self.assertIn("isn't installed", out["reason"])
            self.assertFalse(_unit_path(home).exists())

    def test_refuses_when_no_per_user_startup_services(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=False):
                    out = apply_ollama_local_autostart(True)
            self.assertFalse(out["ok"])
            self.assertIn("doesn't have per-user startup services", out["reason"])
            # Refused before touching the filesystem -- no startup folder appears.
            self.assertFalse((home / ".config" / "systemd").exists())

    def test_refuses_when_startup_folder_cannot_be_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._dir_writable", return_value=False):
                        out = apply_ollama_local_autostart(True)
            self.assertFalse(out["ok"])
            self.assertIn("can't be written", out["reason"])
            self.assertFalse(_unit_path(home).exists())

    def test_refuses_when_home_folder_check_fails(self):
        """Proves the home-folder rule: if the safety check ever said no, nothing is written."""
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._path_within_home", return_value=False):
                        out = apply_ollama_local_autostart(True)
            self.assertFalse(out["ok"])
            self.assertIn("Refused", out["reason"])
            self.assertFalse(_unit_path(home).exists())


class ApplyInstallTests(unittest.TestCase):
    def test_installs_env_and_starts_when_nothing_answering(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            bin_path = _write_ollama_binary(home)
            systemctl = MagicMock()
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._run_systemctl", systemctl):
                        with patch(f"{_MODULE}._ollama_answering", return_value=False):
                            out = apply_ollama_local_autostart(True)

            self.assertTrue(out["ok"])
            self.assertTrue(out["changed"])
            self.assertIn("Started now", out["message"])

            unit_text = _unit_path(home).read_text(encoding="utf-8")
            self.assertIn(f"ExecStart={bin_path} serve", unit_text)
            # Every measured environment variable carries over unchanged except the
            # loaded-model limit, which the setting exists to raise.
            self.assertIn('Environment="OLLAMA_VULKAN=1"', unit_text)
            self.assertIn('Environment="OLLAMA_IGPU_ENABLE=1"', unit_text)
            self.assertIn('Environment="OLLAMA_FLASH_ATTENTION=0"', unit_text)
            self.assertIn('Environment="OLLAMA_NUM_PARALLEL=1"', unit_text)
            self.assertIn('Environment="OLLAMA_MAX_LOADED_MODELS=2"', unit_text)
            self.assertNotIn("OLLAMA_MAX_LOADED_MODELS=1", unit_text)

            called_args = [call.args[0] for call in systemctl.call_args_list]
            self.assertIn(["daemon-reload"], called_args)
            self.assertIn(["enable", UNIT_NAME], called_args)
            self.assertIn(["start", UNIT_NAME], called_args)

    def test_leaves_already_running_ollama_alone(self):
        """Something is already answering -- must not be started or touched, and the entry still installs."""
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            systemctl = MagicMock()
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._run_systemctl", systemctl):
                        with patch(f"{_MODULE}._ollama_answering", return_value=True):
                            out = apply_ollama_local_autostart(True)

            self.assertTrue(out["ok"])
            self.assertIn("next time the Deck starts", out["message"])
            self.assertTrue(_unit_path(home).is_file())

            called_args = [call.args[0] for call in systemctl.call_args_list]
            self.assertIn(["enable", UNIT_NAME], called_args)
            # The point of this test: no "start" call when something already answers.
            self.assertNotIn(["start", UNIT_NAME], called_args)


class ApplyRemoveTests(unittest.TestCase):
    def test_noop_when_nothing_installed(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                out = apply_ollama_local_autostart(False)
            self.assertTrue(out["ok"])
            self.assertFalse(out["changed"])
            self.assertIn("already off", out["message"])

    def test_removes_entry_and_leaves_running_ollama_alone(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            unit_path = _unit_path(home)
            unit_path.parent.mkdir(parents=True, exist_ok=True)
            unit_path.write_text("[Unit]\n", encoding="utf-8")
            systemctl = MagicMock()
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._run_systemctl", systemctl):
                        out = apply_ollama_local_autostart(False)

            self.assertTrue(out["ok"])
            self.assertTrue(out["changed"])
            self.assertFalse(unit_path.exists())
            called_args = [call.args[0] for call in systemctl.call_args_list]
            self.assertIn(["disable", UNIT_NAME], called_args)
            self.assertIn(["daemon-reload"], called_args)
            # The point of this test: turning the entry off never stops anything.
            self.assertNotIn(["stop", UNIT_NAME], called_args)
            for args in called_args:
                self.assertNotIn("stop", args)


class StatusTests(unittest.TestCase):
    def test_reports_reason_when_ollama_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._ollama_answering", return_value=False):
                    out = get_ollama_local_autostart_status()
        self.assertFalse(out["installed"])
        self.assertFalse(out["enabled"])
        self.assertFalse(out["running"])
        self.assertIn("isn't installed", out["reason"])

    def test_reports_reason_when_entry_not_installed(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._ollama_answering", return_value=False):
                    out = get_ollama_local_autostart_status()
        self.assertFalse(out["installed"])
        self.assertIn("Turn on", out["reason"])

    def test_reports_reason_when_installed_but_not_enabled(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            unit_path = _unit_path(home)
            unit_path.parent.mkdir(parents=True, exist_ok=True)
            unit_path.write_text("[Unit]\n", encoding="utf-8")
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._unit_enabled", return_value=False):
                    with patch(f"{_MODULE}._ollama_answering", return_value=False):
                        out = get_ollama_local_autostart_status()
        self.assertTrue(out["installed"])
        self.assertFalse(out["enabled"])
        self.assertIn("not turned on", out["reason"])

    def test_reports_reason_when_enabled_but_not_running(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            unit_path = _unit_path(home)
            unit_path.parent.mkdir(parents=True, exist_ok=True)
            unit_path.write_text("[Unit]\n", encoding="utf-8")
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._unit_enabled", return_value=True):
                    with patch(f"{_MODULE}._ollama_answering", return_value=False):
                        out = get_ollama_local_autostart_status()
        self.assertTrue(out["installed"])
        self.assertTrue(out["enabled"])
        self.assertFalse(out["running"])
        self.assertIn("Nothing is answering", out["reason"])

    def test_no_reason_when_everything_is_on(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            unit_path = _unit_path(home)
            unit_path.parent.mkdir(parents=True, exist_ok=True)
            unit_path.write_text("[Unit]\n", encoding="utf-8")
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._unit_enabled", return_value=True):
                    with patch(f"{_MODULE}._ollama_answering", return_value=True):
                        out = get_ollama_local_autostart_status()
        self.assertEqual(out, {"installed": True, "enabled": True, "running": True, "reason": ""})


if __name__ == "__main__":
    unittest.main()
