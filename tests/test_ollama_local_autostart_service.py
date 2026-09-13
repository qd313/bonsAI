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

            # Not "was a command issued" -- that assertion is what let the real defect
            # through on 2026-09-12, when the enable command was issued, failed, and was
            # reported as success. Assert the thing that decides whether it starts with
            # the Deck: the start-at-login link exists and points at the entry.
            # A symlink where the platform allows one, a plain copy where it does not --
            # systemd honours either. What matters is that systemd will find the entry
            # here at login and that it carries the right contents.
            link = home / ".config" / "systemd" / "user" / "default.target.wants" / UNIT_NAME
            self.assertTrue(link.is_symlink() or link.is_file(),
                            "nothing in default.target.wants: it would not start with the Deck")
            self.assertIn("OLLAMA_MAX_LOADED_MODELS=2", link.read_text(encoding="utf-8"))
            called_args = [call.args[0] for call in systemctl.call_args_list]
            self.assertIn(["start", UNIT_NAME], called_args)

    def test_reports_failure_when_the_startup_link_cannot_be_made(self):
        """The defect found on the Deck 2026-09-12, in test form.

        The entry file was written, switching it on failed, and the old code reported
        success -- so the tab said it was set up and it would not have started with the
        Deck. Turning a silent failure into a false all-clear is the one outcome this
        must never have."""
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._run_systemctl", MagicMock()):
                        with patch(f"{_MODULE}._ollama_answering", return_value=False):
                            with patch(f"{_MODULE}._link_unit_into_default_target",
                                       return_value="Could not switch the startup entry on: denied"):
                                out = apply_ollama_local_autostart(True)

            self.assertFalse(out["ok"], "a failed switch-on must not report success")
            self.assertIn("Could not switch the startup entry on", out["reason"])

    def test_switching_on_twice_is_safe(self):
        """Turning it on when it is already on replaces the link rather than failing."""
        with tempfile.TemporaryDirectory() as tmp:
            home = _fake_home(tmp)
            _write_ollama_binary(home)
            with patch.object(Path, "home", staticmethod(lambda: home)):
                with patch(f"{_MODULE}._systemctl_available", return_value=True):
                    with patch(f"{_MODULE}._run_systemctl", MagicMock()):
                        with patch(f"{_MODULE}._ollama_answering", return_value=False):
                            first = apply_ollama_local_autostart(True)
                            second = apply_ollama_local_autostart(True)

            self.assertTrue(first["ok"])
            self.assertTrue(second["ok"])
            link = home / ".config" / "systemd" / "user" / "default.target.wants" / UNIT_NAME
            self.assertTrue(link.is_symlink() or link.is_file())

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
            link = home / ".config" / "systemd" / "user" / "default.target.wants" / UNIT_NAME
            self.assertTrue(link.is_symlink() or link.is_file(),
                            "nothing in default.target.wants: it would not start with the Deck")
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
            link = home / ".config" / "systemd" / "user" / "default.target.wants" / UNIT_NAME
            self.assertFalse(link.is_symlink() or link.exists(),
                             "start-at-login link still there: it would still start with the Deck")
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
