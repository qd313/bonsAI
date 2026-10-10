"""The Update AI & models button must leave the SERVER on the new version, not just the file.

Found on the Deck 2026-10-09: the program file was 0.40.2 but the server that answered had run
for three days and said 0.34.1, so the tab never showed the update. These tests use a small fake
world: updating writes a new program file, and the fake server keeps answering with the OLD
version until something stops and starts it. A pass means the version the server reports after
the run is the new one.
"""

from __future__ import annotations

import asyncio
import signal
import unittest
from unittest.mock import patch

from backend.services import local_ollama_setup_service as setup
from backend.services import ollama_server_restart as restart

R = "backend.services.ollama_server_restart"
S = "backend.services.local_ollama_setup_service"


class FakeDeck:
    """Old server running, new program file on disk. Only a stop+start (or a unit restart) fixes it."""

    def __init__(self, *, unit: bool, unit_reachable: bool = True, pids: list[int] | None = None, killable: bool = True):
        self.binary_v = "0.40.2"
        self.server_v = "0.34.1"
        self.up = True
        self.unit = unit
        self.unit_reachable = unit_reachable
        self.pids = [1669] if pids is None else list(pids)
        self.killable = killable
        self.calls: list[tuple] = []
        self.t = 0.0

    def fetch(self, timeout_seconds: float = 2.5) -> str:
        return self.server_v if self.up else ""

    def systemctl(self, args, timeout=45.0):
        self.calls.append(("systemctl", *args))
        if not self.unit_reachable:
            return 1, "Failed to connect to bus: No medium found"
        if args[0] in ("restart", "start") and args[1:] == [restart.AUTOSTART_UNIT_NAME]:
            self.up, self.server_v = True, self.binary_v
            self.pids = [4242]
            return 0, ""
        return 5, "Unit ollama.service not found."

    def kill(self, pid, sig):
        self.calls.append(("kill", pid, sig))
        if self.killable and pid in self.pids:
            self.up = False
            self.pids.remove(pid)

    def control(self) -> restart.ServeControl:
        return restart.ServeControl(self.start_direct, lambda: None, lambda: None)

    def start_direct(self, unit_env):
        self.calls.append(("direct", unit_env is not None))
        self.up, self.server_v = True, self.binary_v
        self.pids = [4343]
        return True

    def patches(self):
        return [
            patch(f"{R}.fetch_server_version", side_effect=self.fetch),
            patch(f"{R}.read_binary_version", side_effect=lambda _b, _e=None: self.binary_v),
            patch(f"{R}._unit_installed", side_effect=lambda: self.unit),
            patch(f"{R}._run_user_systemctl", side_effect=self.systemctl),
            patch(f"{R}.find_ollama_serve_pids", side_effect=lambda: list(self.pids)),
            patch(f"{R}._send_signal", side_effect=self.kill),
            patch(f"{S}._serve_control", side_effect=lambda _l, _b: self.control()),
            patch(f"{R}._now", side_effect=lambda: self.t),
            patch(f"{R}._sleep", side_effect=lambda s: setattr(self, "t", self.t + s)),
        ]

    def __enter__(self):
        for p in self.patches():
            p.start()
        return self

    def __exit__(self, *_a):
        patch.stopall()


def run_restart(deck: "FakeDeck") -> dict:
    with deck:
        return restart.restart_server_onto_new_binary(lambda _m: None, "/x/ollama", deck.control())


class RestartOntoNewBinaryTests(unittest.TestCase):
    def test_a_unit_started_server_is_restarted_through_its_real_unit_name(self):
        deck = FakeDeck(unit=True)
        out = run_restart(deck)
        self.assertEqual(out["how"], "unit")
        self.assertEqual(out["server_version"], "0.40.2")
        self.assertIn(("systemctl", "restart", "bonsai-ollama-autostart.service"), deck.calls)
        # the old code only ever asked for a unit called "ollama"
        self.assertNotIn(("systemctl", "restart", "ollama"), deck.calls)

    def test_the_unit_name_here_matches_the_one_the_plugin_writes(self):
        from backend.services.ollama_local_autostart_service import UNIT_NAME

        self.assertEqual(restart.AUTOSTART_UNIT_NAME, UNIT_NAME)

    def test_a_server_the_plugin_started_is_stopped_and_started_again(self):
        deck = FakeDeck(unit=False)
        out = run_restart(deck)
        self.assertEqual(out["how"], "direct")
        self.assertEqual(out["server_version"], "0.40.2")
        self.assertIn(("kill", 1669, signal.SIGTERM), deck.calls)
        self.assertIn(("direct", False), deck.calls)

    def test_a_unit_that_cannot_be_reached_falls_back_to_stopping_the_process(self):
        deck = FakeDeck(unit=True, unit_reachable=False)
        out = run_restart(deck)
        self.assertEqual(out["server_version"], "0.40.2")
        self.assertIn(("kill", 1669, signal.SIGTERM), deck.calls)
        # restarted with the startup unit's own settings so the memory limit does not change
        self.assertIn(("direct", True), deck.calls)

    def test_a_server_that_cannot_be_identified_is_left_alone_and_says_so(self):
        deck = FakeDeck(unit=False, pids=[])
        out = run_restart(deck)
        self.assertTrue(out["needs_device_restart"])
        self.assertEqual(out["server_version"], "0.34.1")
        self.assertFalse([c for c in deck.calls if c[0] in ("kill", "direct")])

    def test_nothing_is_touched_when_the_server_already_runs_the_new_version(self):
        deck = FakeDeck(unit=True)
        deck.server_v = "0.40.2"
        out = run_restart(deck)
        self.assertEqual(out["how"], "current")
        self.assertEqual(deck.calls, [])

    def test_nothing_is_done_when_no_server_is_running(self):
        deck = FakeDeck(unit=True)
        deck.up = False
        out = run_restart(deck)
        self.assertEqual(out["how"], "not-running")
        self.assertEqual(deck.calls, [])


class VersionReadingTests(unittest.TestCase):
    def test_the_client_line_wins_when_the_server_is_older(self):
        text = "ollama version is 0.34.1\nWarning: client version is 0.40.2\n"
        self.assertEqual(restart.parse_binary_version(text), "0.40.2")

    def test_a_single_line_is_the_version(self):
        self.assertEqual(restart.parse_binary_version("ollama version is 0.40.2"), "0.40.2")


class UnitSettingsTests(unittest.TestCase):
    def test_the_unit_files_own_environment_is_what_a_direct_start_uses(self):
        import tempfile
        from pathlib import Path

        from backend.services.ollama_local_autostart_service import _unit_file_contents

        with tempfile.TemporaryDirectory() as td:
            unit_dir = Path(td) / ".config" / "systemd" / "user"
            unit_dir.mkdir(parents=True)
            (unit_dir / restart.AUTOSTART_UNIT_NAME).write_text(_unit_file_contents(Path("/h/ollama")), encoding="utf-8")
            with patch.object(Path, "home", return_value=Path(td)):
                env = restart._unit_environment()
        self.assertEqual(env["OLLAMA_MAX_LOADED_MODELS"], "2")
        self.assertEqual(env["OLLAMA_VULKAN"], "1")


class WakingAStoppedServerTests(unittest.TestCase):
    def test_the_wake_up_helper_asks_for_the_unit_the_plugin_writes(self):
        asked: list[list[str]] = []
        with patch(f"{R}._run_user_systemctl", side_effect=lambda a, timeout=0: asked.append(a) or (0, "")):
            restart.try_restart_ollama_user_service(lambda _m: None)
        self.assertIn(["try-restart", "bonsai-ollama-autostart.service"], asked)
        self.assertIn(["start", "bonsai-ollama-autostart.service"], asked)

    def test_the_session_bus_variables_are_filled_in_when_the_socket_exists(self):
        with (
            patch.object(restart.os, "getuid", create=True, return_value=1000),
            patch.dict(restart.os.environ, {}, clear=True),
            patch(f"{R}.os.path.isdir", return_value=True),
            patch(f"{R}.os.path.exists", return_value=True),
        ):
            env = restart.user_bus_env()
        self.assertTrue(env["XDG_RUNTIME_DIR"].startswith("/run/user/"))
        self.assertTrue(env["DBUS_SESSION_BUS_ADDRESS"].startswith("unix:path=/run/user/"))


class UpdateRunReportsTheNewVersionTests(unittest.TestCase):
    """Level of the Deck check: the status the tab reads after pressing Update."""

    def _run(self, deck: FakeDeck) -> dict:
        state: dict = {"phase": "running"}

        async def fake_install(**kw):
            # what the real installer does: marks the stage, replaces the program file
            kw["state"]["stage"] = "install"
            return "/x/ollama"

        async def go():
            with (
                patch(f"{S}._install_or_update_ollama_binary", side_effect=fake_install),
                patch(f"{S}.probe_ollama_http_ok", side_effect=lambda *_a, **_k: deck.up),
                patch(f"{S}.ensure_ollama_server_listening_before_pull", return_value=True),
                patch(f"{S}.ensure_ollama_cli_home_ready", return_value=True),
                patch(f"{S}.list_installed_ollama_tags", return_value=["a:1", "b:2"]),
                patch(f"{S}.run_ollama_pull", return_value=(True, "")),
                patch(f"{S}.sys.platform", "linux"),
            ):
                await setup.run_local_setup(
                    profile="update_installed",
                    state=state,
                    logger=type("L", (), {"info": lambda *a, **k: None, "exception": lambda *a, **k: None})(),
                    cancel_event=asyncio.Event(),
                )

        with deck:
            asyncio.run(go())
        return state

    def test_update_leaves_the_server_on_the_new_version_and_says_so(self):
        deck = FakeDeck(unit=True)
        state = self._run(deck)
        self.assertEqual(state["phase"], "done")
        self.assertEqual(deck.server_v, "0.40.2")
        self.assertEqual(state["ollama_version"], "0.40.2")
        self.assertIn("0.40.2", state["result_line"])
        self.assertIn("restarted", state["result_line"])
        self.assertFalse(state["needs_device_restart"])

    def test_update_that_cannot_restart_the_server_does_not_claim_success(self):
        deck = FakeDeck(unit=False, pids=[])
        state = self._run(deck)
        self.assertTrue(state["needs_device_restart"])
        self.assertIn("restart the Deck", state["result_line"])
        self.assertIn("0.40.2", state["result_line"])


if __name__ == "__main__":
    unittest.main()
