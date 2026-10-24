"""Tests for the voice-install half of Clear all plugin data (main.Plugin).

Regression guard for a defect found 2026-08-03 while extracting the teardown helper: the three
voice-install resets sat *inside* the "task still running" guard, so a **completed** install
survived the clear and `get_voice_install_status` kept reporting it after its files were deleted.
The background-Ask and local-Ollama teardowns in the same method always reset unconditionally.
"""

import asyncio
import sys
import threading
import types
import unittest

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8

    def _noop_flock(*_a, **_k):
        return False

    _fcntl.flock = _noop_flock
    sys.modules["fcntl"] = _fcntl

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.voice.voice_transcription_service import new_voice_install_state  # noqa: E402
from main import Plugin  # noqa: E402

STALE_STATE = {
    "phase": "done",
    "done": True,
    "accepted": True,
    "model_id": "base.en",
    "ok": True,
}


class VoiceInstallResetTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()

    async def test_finished_install_does_not_survive_the_clear(self):
        """The defect. Fails before the fix: state stayed at the old completed result."""

        async def already_done():
            return None

        task = asyncio.ensure_future(already_done())
        await task

        self.plugin._voice_install_task = task
        self.plugin._voice_install_state = dict(STALE_STATE)

        await self.plugin._reset_voice_install_after_clear()

        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())
        self.assertIsNone(self.plugin._voice_install_task)
        self.assertIsNone(self.plugin._voice_install_cancel)

    async def test_no_install_ever_started_still_resets(self):
        self.plugin._voice_install_task = None
        self.plugin._voice_install_state = dict(STALE_STATE)

        await self.plugin._reset_voice_install_after_clear()

        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())

    async def test_running_install_is_cancelled_and_reset(self):
        """Pre-existing behavior, still guarded: an in-flight install is stopped, not orphaned."""
        started = asyncio.Event()

        async def forever():
            started.set()
            await asyncio.sleep(3600)

        task = asyncio.ensure_future(forever())
        await started.wait()

        cancel_event = threading.Event()
        self.plugin._voice_install_task = task
        self.plugin._voice_install_cancel = cancel_event
        self.plugin._voice_install_state = dict(STALE_STATE)

        await self.plugin._reset_voice_install_after_clear()

        self.assertTrue(cancel_event.is_set(), "the worker thread was never told to stop")
        self.assertTrue(task.done())
        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())
        self.assertIsNone(self.plugin._voice_install_task)

    async def test_it_waits_for_the_cancelled_install_before_resetting(self):
        """Resetting state while the install task is still unwinding is the race this avoids."""
        order = []

        async def with_cleanup():
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                await asyncio.sleep(0)
                order.append("task cleanup")
                raise

        task = asyncio.ensure_future(with_cleanup())
        await asyncio.sleep(0)

        self.plugin._voice_install_task = task
        self.plugin._voice_install_cancel = threading.Event()

        await self.plugin._reset_voice_install_after_clear()
        order.append("state reset")

        self.assertEqual(order, ["task cleanup", "state reset"])

    async def test_non_event_cancel_handle_does_not_crash(self):
        """`_voice_install_cancel` is None after a previous clear; the isinstance check covers it."""
        started = asyncio.Event()

        async def forever():
            started.set()
            await asyncio.sleep(3600)

        task = asyncio.ensure_future(forever())
        await started.wait()

        self.plugin._voice_install_task = task
        self.plugin._voice_install_cancel = None

        await self.plugin._reset_voice_install_after_clear()

        self.assertTrue(task.done())
        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())

    async def test_reset_is_idempotent(self):
        await self.plugin._reset_voice_install_after_clear()
        await self.plugin._reset_voice_install_after_clear()
        self.assertEqual(self.plugin._voice_install_state, new_voice_install_state())


if __name__ == "__main__":
    unittest.main()
