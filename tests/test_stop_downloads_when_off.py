"""Plan 106, lane R2 (review item 7): turning Internet downloads off stops the downloads already running.

At the level the person feels it: a setup is running, the switch is turned off through the real save_settings, and the
run ends as Stopped (phase "cancelled"), the same ending its own Cancel gives. Turning it off with nothing running, or
saving anything else while a run goes, stops nothing.
"""

from __future__ import annotations

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.ollama import ollama_local_setup_rpc as setup_rpc  # noqa: E402

ON = {"capabilities": {"internet_downloads": True, "filesystem_write": True}}
OFF = {"capabilities": {"internet_downloads": False, "filesystem_write": True}}


async def _stoppable_setup(**kwargs) -> None:
    """A run that waits for its Cancel and ends the way run_local_setup does when it is cancelled."""
    state, cancel_event = kwargs["state"], kwargs["cancel_event"]
    await cancel_event.wait()
    state.update({"phase": "cancelled", "done": True, "error": "Cancelled."})


class TurningDownloadsOffStopsTheRun(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings({"ollama_local_on_deck": True, **ON})
        for target in ("run_local_setup", "warm_after_setup"):
            started = patch.object(setup_rpc, target, _stoppable_setup if target == "run_local_setup" else MagicMock())
            started.start()
            self.addCleanup(started.stop)

    async def _start_run(self) -> asyncio.Task:
        out = await self.plugin.start_local_ollama_setup({"profile": "tier1_essentials"})
        self.assertTrue(out["accepted"], out)
        await asyncio.sleep(0)
        return self.plugin._local_ollama_setup_task

    async def test_turning_it_off_mid_run_ends_the_run_as_stopped(self) -> None:
        task = await self._start_run()
        self.assertFalse(task.done())
        await self.plugin.save_settings(OFF)
        await asyncio.wait_for(task, timeout=2)
        state = await self.plugin.get_local_ollama_setup_status()
        self.assertEqual(state["phase"], "cancelled")
        self.assertTrue(state["done"])

    async def test_turning_it_off_with_nothing_running_stops_nothing(self) -> None:
        with patch.object(self.plugin, "cancel_local_ollama_setup", AsyncMock()) as cancel:
            await self.plugin.save_settings(OFF)
        cancel.assert_not_called()

    async def test_a_run_that_already_ended_is_left_alone(self) -> None:
        task = await self._start_run()
        await self.plugin.cancel_local_ollama_setup()
        await asyncio.wait_for(task, timeout=2)
        with patch.object(self.plugin, "cancel_local_ollama_setup", AsyncMock()) as cancel:
            await self.plugin.save_settings(OFF)
        cancel.assert_not_called()

    async def test_saving_something_else_or_keeping_it_on_stops_nothing(self) -> None:
        task = await self._start_run()
        await self.plugin.save_settings({"ask_mode": "speed"})
        await self.plugin.save_settings(ON)
        await asyncio.sleep(0.05)
        self.assertFalse(task.done())
        await self.plugin.save_settings(OFF)  # clean up: the run ends
        await asyncio.wait_for(task, timeout=2)

    async def test_the_knowledge_library_download_and_the_voice_install_are_asked_to_stop_too(self) -> None:
        library = asyncio.create_task(asyncio.sleep(30))
        voice = asyncio.create_task(asyncio.sleep(30))
        self.addCleanup(library.cancel)
        self.addCleanup(voice.cancel)
        self.plugin._rag_corpus_download_task = library
        self.plugin._voice_install_task = voice
        self.assertFalse(self.plugin._voice_install_cancel.is_set())
        with patch.object(self.plugin, "cancel_rag_corpus_download", AsyncMock()) as cancel_library:
            await self.plugin.save_settings(OFF)
        cancel_library.assert_awaited_once()
        self.assertTrue(self.plugin._voice_install_cancel.is_set())

    async def test_a_finished_voice_install_and_library_download_are_not_cancelled(self) -> None:
        done = asyncio.create_task(asyncio.sleep(0))
        await done
        self.plugin._rag_corpus_download_task = done
        self.plugin._voice_install_task = done
        with patch.object(self.plugin, "cancel_rag_corpus_download", AsyncMock()) as cancel_library:
            await self.plugin.save_settings(OFF)
        cancel_library.assert_not_called()
        self.assertFalse(self.plugin._voice_install_cancel.is_set())


class TheParentalLockStopsRunningDownloadsToo(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    """The Steam parental lock turns downloads off for the session without saving anything (capabilities.py)."""

    async def asyncSetUp(self) -> None:
        from backend.core.capabilities import set_kids_lock_active

        self.start_plugin_with_settings_file()
        self._write_settings({"ollama_local_on_deck": True, **ON})
        started = patch.object(setup_rpc, "run_local_setup", _stoppable_setup)
        started.start()
        self.addCleanup(started.stop)
        self.addCleanup(set_kids_lock_active, False)
        set_kids_lock_active(False)

    async def test_the_lock_going_on_mid_run_ends_the_run_as_stopped(self) -> None:
        out = await self.plugin.start_local_ollama_setup({"profile": "tier1_essentials"})
        self.assertTrue(out["accepted"], out)
        task = self.plugin._local_ollama_setup_task
        await asyncio.sleep(0)
        await self.plugin.set_kids_lock_state(True)
        await asyncio.wait_for(task, timeout=2)
        self.assertEqual((await self.plugin.get_local_ollama_setup_status())["phase"], "cancelled")

    async def test_the_lock_coming_off_or_staying_on_stops_nothing(self) -> None:
        await self.plugin.set_kids_lock_state(True)
        with patch.object(self.plugin, "cancel_local_ollama_setup", AsyncMock()) as cancel:
            await self.plugin.set_kids_lock_state(True)
            await self.plugin.set_kids_lock_state(False)
        cancel.assert_not_called()


if __name__ == "__main__":
    unittest.main()
