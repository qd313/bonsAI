"""Title: A model download comes back by itself after a plugin reload

Purpose: Pin the whole life of the "download in flight" note: written when a download starts,
kept when the plugin goes away mid-download, cleared when the download finishes, fails or is
cancelled, and, on load, the noted download is started again through the screen's normal start
path -- but never a cancelled one, never one that already came back twice, and never one that
is too old.
Used for: ollama_pull_resume_service.py, ollama_local_setup_rpc.py's two download starters and
their cancel, and main.py's load and unload.
Solves: A plugin reload mid-download killed the pull at 16% (plan 64, flow H); the person had to
ask again.
Does not: Run ollama or touch the network. The setup run, the registry check and the permission
gates are faked; the note is a real file in a throwaway folder.
"""

import asyncio
import time
import unittest
from unittest.mock import AsyncMock, patch

from plugin_settings_file_harness import PluginSettingsFileMixin

import main
from backend.services import ollama_pull_resume_service as resume

RPC = main.ollama_local_setup_rpc
TAGS = ["qwen2.5:1.5b"]


class PullResumeTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self.addCleanup(resume.mark_unloading, False)
        resume.mark_unloading(False)
        for target, new in (
            ("_require_local_ollama_on_deck", AsyncMock(return_value=(True, None))),
            ("_internet_downloads_allowed", AsyncMock(return_value=True)),
        ):
            p = patch.object(RPC, target, new)
            p.start()
            self.addCleanup(p.stop)
        reg = patch(
            "backend.services.ollama_catalog_service.partition_pull_tags_by_registry",
            side_effect=lambda tags: (list(tags), []),
        )
        reg.start()
        self.addCleanup(reg.stop)
        self.release = asyncio.Event()

    def _setup_run(self, phase: str = "done"):
        """A stand-in for the real download: waits until released, then ends the way asked."""

        async def run(**kwargs) -> None:
            await self.release.wait()
            kwargs["state"]["phase"] = phase
            kwargs["state"]["done"] = True

        return patch.object(RPC, "run_local_setup", side_effect=run)

    def _write_profile_settings(self) -> None:
        self._write_settings({"ollama_local_on_deck": True, "capabilities": {"internet_downloads": True}})

    def _note(self):
        return resume.read_note(self.settings_dir)

    async def _start_custom(self) -> None:
        out = await self.plugin.pull_ollama_models(TAGS)
        self.assertTrue(out["accepted"])
        await self._let_it_run()

    async def _let_it_run(self) -> None:
        """One turn of the loop, so the download is truly under way (waiting inside the run)
        rather than only scheduled -- a task cancelled before it starts never reaches its cleanup."""
        await asyncio.sleep(0)

    async def _finish(self) -> None:
        self.release.set()
        await self.plugin._local_ollama_setup_task

    # ---- the note over a download's life -------------------------------------------------

    async def test_a_started_download_is_noted(self) -> None:
        with self._setup_run():
            await self._start_custom()
            note = self._note()
            self.assertEqual((note["profile"], note["tags"], note["restarts"]), ("custom", TAGS, 0))
            await self._finish()

    async def test_a_profile_download_is_noted_too(self) -> None:
        self._write_profile_settings()
        with self._setup_run():
            out = await self.plugin.start_local_ollama_setup({"profile": "tier1_essentials"})
            self.assertTrue(out["accepted"])
            await self._let_it_run()
            self.assertEqual(self._note()["profile"], "tier1_essentials")
            await self._finish()

    async def test_a_finished_download_clears_the_note(self) -> None:
        with self._setup_run("done"):
            await self._start_custom()
            await self._finish()
        self.assertIsNone(self._note())

    async def test_a_failed_download_clears_the_note_so_it_cannot_loop(self) -> None:
        with self._setup_run("failed"):
            await self._start_custom()
            await self._finish()
        self.assertIsNone(self._note())

    async def test_a_cancelled_download_clears_the_note(self) -> None:
        with self._setup_run("cancelled"):
            await self._start_custom()
            await self.plugin.cancel_local_ollama_setup()
            self.assertIsNone(self._note())
            await self._finish()
        self.assertIsNone(self._note())

    async def test_the_plugin_going_away_mid_download_keeps_the_note(self) -> None:
        with self._setup_run():
            await self._start_custom()
            await self.plugin._unload()
        note = self._note()
        self.assertIsNotNone(note)
        self.assertEqual(note["tags"], TAGS)

    # ---- the restart on load -------------------------------------------------------------

    async def test_on_load_the_noted_download_starts_again(self) -> None:
        with self._setup_run():
            await self._start_custom()
            await self.plugin._unload()
            fresh = main.Plugin()
            out = await resume.resume_interrupted_download(fresh, self.settings_dir, RPC, delay_seconds=0)
            self.assertEqual(out, "started")
            # The screen's normal status shows it: the new plugin's own download is running.
            self.assertEqual(fresh._local_ollama_setup_state["phase"], "running")
            self.assertEqual(fresh._local_ollama_setup_state["pull_tags"], TAGS)
            self.assertEqual(self._note()["restarts"], 1)
            self.release.set()
            await fresh._local_ollama_setup_task
        self.assertIsNone(self._note())

    async def test_on_load_a_noted_profile_download_starts_again_by_its_profile(self) -> None:
        self._write_profile_settings()
        with self._setup_run():
            out = await self.plugin.start_local_ollama_setup({"profile": "tier2_multimodal"})
            self.assertTrue(out["accepted"])
            await self._let_it_run()
            await self.plugin._unload()
            fresh = main.Plugin()
            self.assertEqual(
                await resume.resume_interrupted_download(fresh, self.settings_dir, RPC, delay_seconds=0), "started"
            )
            self.assertEqual(fresh._local_ollama_setup_state["profile"], "tier2_multimodal")
            self.release.set()
            await fresh._local_ollama_setup_task

    async def test_a_cancelled_download_never_comes_back(self) -> None:
        with self._setup_run("cancelled"):
            await self._start_custom()
            await self.plugin.cancel_local_ollama_setup()
            await self._finish()
        out = await resume.resume_interrupted_download(main.Plugin(), self.settings_dir, RPC, delay_seconds=0)
        self.assertEqual(out, "none")

    async def test_a_download_that_keeps_dying_is_given_up_after_two_restarts(self) -> None:
        outcomes = []
        with self._setup_run():
            await self._start_custom()
            for _ in range(3):
                await self.plugin._unload()
                self.plugin = main.Plugin()
                outcomes.append(
                    await resume.resume_interrupted_download(self.plugin, self.settings_dir, RPC, delay_seconds=0)
                )
            self.release.set()
        self.assertEqual(outcomes, ["started", "started", "gave_up"])
        self.assertIsNone(self._note())

    async def test_an_old_note_is_dropped(self) -> None:
        resume.write_note(self.settings_dir, profile="custom", tags=TAGS)
        old = self._note()
        old["started_at"] = time.time() - resume.MAX_NOTE_AGE_SECONDS - 60
        resume._write(self.settings_dir, old)
        out = await resume.resume_interrupted_download(main.Plugin(), self.settings_dir, RPC, delay_seconds=0)
        self.assertEqual(out, "expired")
        self.assertIsNone(self._note())

    async def test_a_restart_the_gates_refuse_drops_the_note(self) -> None:
        resume.write_note(self.settings_dir, profile="custom", tags=TAGS)
        with patch.object(RPC, "_internet_downloads_allowed", AsyncMock(return_value=False)):
            out = await resume.resume_interrupted_download(main.Plugin(), self.settings_dir, RPC, delay_seconds=0)
        self.assertEqual(out, "refused")
        self.assertIsNone(self._note())

    async def test_an_unreadable_note_is_ignored_and_removed(self) -> None:
        with open(resume.note_path(self.settings_dir), "w", encoding="utf-8") as fh:
            fh.write("{not json")
        out = await resume.resume_interrupted_download(main.Plugin(), self.settings_dir, RPC, delay_seconds=0)
        self.assertEqual(out, "expired")

    async def test_load_schedules_the_resume(self) -> None:
        with patch.object(resume, "resume_interrupted_download", AsyncMock(return_value="none")) as resumed:
            await self.plugin._main()
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        resumed.assert_awaited_once()
        self.assertEqual(resumed.await_args.args[1], self.settings_dir)
        self.assertIs(resumed.await_args.args[2], RPC)


if __name__ == "__main__":
    unittest.main()
