"""Title: Only a person's Stop hands the AI back; an unload or Clear all data does not start one

Purpose: When a setup run is stopped after it replaced the person's running AI, it starts one again so a Stop
never leaves the Deck with no AI (test_ollama_setup_engine_marker.py). The plugin's unload and Clear all data
also end the run, but by cancelling its task, and they must not start an AI: a restart may still be running
beside it, and Clear all data deletes Ollama a moment later. These tests pin the level the Deck shows: after the
task is cancelled (or the plugin is unloading) no engine has been started by the hand-back, while a person's
Stop still leaves one running.
Used for: local_ollama_setup_service.run_local_setup (the clean-up at its end).
Does not: Start a real engine (tests/ollama_fake_ai.py stands in).
"""

from __future__ import annotations

import asyncio
import threading
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_fake_ai import FakeAI, run_custom_setup, update_run_that_replaces_the_ai  # noqa: E402

from backend.ollama import local_ollama_setup_service as setup  # noqa: E402
from backend.ollama import ollama_pull_resume_service as resume  # noqa: E402


def _update_run(ai: FakeAI, cancel: asyncio.Event, drive=None) -> tuple[dict, int]:
    """An update run that replaces the AI (the restart step), then stops with the engine down.

    Returns the status and how many engines had been started before the stop (the restart step's own one).
    """
    reached = threading.Event()
    release = threading.Event()
    started_before_stop = {"n": 0}

    def pull(*args):
        ai.up = False  # the engine is gone by the time the stop lands (a restart in flight, or Clear all data)
        started_before_stop["n"] = ai.started
        reached.set()
        release.wait(5)
        if drive is None:
            cancel.set()
        return False, "Cancelled."

    async def wrapped_drive(task):
        await asyncio.get_running_loop().run_in_executor(None, reached.wait, 5)
        await drive(task, release)

    if drive is None:
        release.set()
    state = run_custom_setup(
        ai, pull, cancel, profile="update_installed", extra=update_run_that_replaces_the_ai(ai), drive=wrapped_drive if drive else None
    )
    release.set()
    return state, started_before_stop["n"]


class OnlyAPersonsStopHandsTheAiBack(unittest.TestCase):
    def setUp(self) -> None:
        setup.forget_setup_started_ollama_serve()
        resume.mark_unloading(False)
        self.addCleanup(resume.mark_unloading, False)

    def test_a_persons_stop_still_leaves_an_ai_running(self):
        ai = FakeAI(up=True)
        state, started_before = _update_run(ai, asyncio.Event())
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(ai.started, started_before + 1, "a Stop should have started the AI again")
        self.assertTrue(ai.up)

    def test_cancelling_the_task_itself_starts_no_ai(self):
        """The unload and Clear all data path: the cancel flag is set, then the task is cancelled."""
        ai = FakeAI(up=True)
        cancel = asyncio.Event()

        async def unload(task, release):
            cancel.set()
            task.cancel()
            release.set()
            try:
                await task
            except asyncio.CancelledError:
                pass

        state, started_before = _update_run(ai, cancel, drive=unload)
        self.assertEqual(ai.started, started_before, "the hand-back started an AI while the task was being cancelled")
        self.assertFalse(ai.up)
        self.assertNotEqual(state.get("phase"), "done")

    def test_a_stop_while_the_plugin_is_unloading_starts_no_ai(self):
        ai = FakeAI(up=True)
        resume.mark_unloading(True)
        state, started_before = _update_run(ai, asyncio.Event())
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(ai.started, started_before, "the hand-back started an AI while the plugin was unloading")
        self.assertFalse(ai.up)


if __name__ == "__main__":
    unittest.main()
