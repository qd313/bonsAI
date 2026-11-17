"""Title: The starter set leaves out what the person unticked, even after a plugin reload

Purpose: The first-time setup (plan 105, lane D3) lets a person untick the note-search model, and the speech
models with the voice engine. These pin, at the level the Deck check reads (the start call the screen sends, the
status the screen shows, the note a reload reads): a left-out piece is not downloaded; the run's closing line says
it was left out as chosen; the run records, piece by piece, what finished, so a stopped run can say what was kept;
and a plugin reload part way through starts the same run again with the same pieces left out. That last one is the
only way the plugin starts a download with no press, so a lost list there would install what was unticked.
Used for: start_local_ollama_setup (ollama_local_setup_rpc.py), run_local_setup (local_ollama_setup_service.py),
starter_set_extras.py and ollama_pull_resume_service.py.
Does not: Touch the network; the pulls, the speech download and the engine build are faked.
"""

from __future__ import annotations

import os
import tempfile
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402
from test_starter_set_extras import _setup_run  # noqa: E402

from backend.ollama import ollama_local_setup_rpc as setup_rpc  # noqa: E402
from backend.ollama import ollama_pull_resume_service as resume  # noqa: E402


def _pull_recorder(pulls: list[str]):
    def fake_pull(_bin, tag, _log, _cancelled):
        pulls.append(tag)
        return True, ""

    return fake_pull


class TheRunLeavesOutWhatWasUnticked(unittest.TestCase):
    def test_the_note_search_model_left_out_is_not_pulled_and_the_line_says_so(self):
        pulls: list[str] = []
        state = _setup_run(
            "tier1_essentials", [], _pull_recorder(pulls),
            speech_download=lambda *_a: {}, engine_build=lambda *_a: "", leave_out=("note_search",),
        )
        self.assertEqual(pulls, ["gemma4:e2b-it-qat"])
        self.assertEqual(state["phase"], "done")
        self.assertIn("Left out, as you chose: the note-search model.", state["result_line"])
        self.assertEqual(state["starter_pieces"]["note_search"], "left_out")

    def test_voice_left_out_says_so_and_never_asks_to_turn_the_microphone_on(self):
        state = _setup_run("tier1_essentials", [], _pull_recorder([]), leave_out=("voice",), microphone_enabled=False)
        self.assertIn("Left out, as you chose: the speech models and the voice engine.", state["result_line"])
        self.assertNotIn("Turn on Voice input", state["result_line"])
        self.assertEqual((state["starter_pieces"]["speech"], state["starter_pieces"]["voice"]), ("left_out", "left_out"))

    def test_with_nothing_left_out_every_piece_ends_done_and_no_left_out_line(self):
        state = _setup_run(
            "tier1_essentials", ["nomic-embed-text"], _pull_recorder([]),
            speech_download=lambda *_a: {}, engine_build=lambda *_a: "",
        )
        self.assertEqual(set(state["starter_pieces"].values()), {"done"})
        self.assertNotIn("Left out", state["result_line"])

    def test_a_run_that_stops_part_way_keeps_what_finished_on_record(self):
        def speech(*_a):
            raise RuntimeError("Cancelled.")

        state = _setup_run("tier1_essentials", [], _pull_recorder([]), speech_download=speech, engine_build=lambda *_a: "")
        pieces = state["starter_pieces"]
        self.assertEqual((pieces["ollama"], pieces["answer"], pieces["note_search"]), ("done", "done", "done"))
        self.assertEqual((pieces["speech"], pieces["voice"]), ("waiting", "waiting"))

    def test_a_failed_pull_is_recorded_as_failed(self):
        def pull(_bin, tag, _log, _cancelled):
            return (False, "no space") if tag == "nomic-embed-text" else (True, "")

        state = _setup_run("tier1_essentials", [], pull, speech_download=lambda *_a: {}, engine_build=lambda *_a: "")
        self.assertEqual(state["starter_pieces"]["note_search"], "failed")
        self.assertEqual(state["starter_pieces"]["answer"], "done")


class TheStartCallCarriesTheList(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()

    async def _start(self, data: dict) -> dict:
        """The arguments the run was started with, the run itself faked."""
        self._write_settings({"ollama_local_on_deck": True, "capabilities": {"internet_downloads": True}})
        with mock.patch.object(setup_rpc, "run_local_setup", new_callable=mock.AsyncMock) as run:
            accepted = (await self.plugin.start_local_ollama_setup(data))["accepted"]
            await self.plugin._local_ollama_setup_task
        self.assertTrue(accepted)
        return run.await_args.kwargs

    async def test_voice_left_out_hands_the_run_neither_the_speech_download_nor_the_engine_build(self) -> None:
        seen = await self._start({"profile": "tier1_essentials", "leave_out": ["voice"]})
        self.assertNotIn("speech_download", seen)
        self.assertNotIn("engine_build", seen)
        self.assertEqual(seen["leave_out"], ("voice",))

    async def test_the_note_search_model_left_out_still_gets_the_speech_and_engine_steps(self) -> None:
        seen = await self._start({"profile": "tier1_essentials", "leave_out": ["note_search"]})
        self.assertIsNotNone(seen.get("speech_download"))
        self.assertIsNotNone(seen.get("engine_build"))
        self.assertEqual(seen["leave_out"], ("note_search",))

    async def test_only_the_two_known_pieces_can_be_left_out(self) -> None:
        seen = await self._start({"profile": "tier1_essentials", "leave_out": ["answer", "ollama", 7, "voice", "voice"]})
        self.assertEqual(seen["leave_out"], ("voice",))

    async def test_no_list_or_a_broken_one_leaves_nothing_out(self) -> None:
        for data in ({"profile": "tier1_essentials"}, {"profile": "tier1_essentials", "leave_out": "voice"}):
            with self.subTest(data=data):
                seen = await self._start(data)
                self.assertEqual(seen["leave_out"], ())
                self.assertIsNotNone(seen.get("speech_download"))

    async def test_other_profiles_ignore_the_list(self) -> None:
        seen = await self._start({"profile": "update_installed", "leave_out": ["note_search"]})
        self.assertEqual(seen["leave_out"], ())

    async def test_the_reload_note_keeps_the_list(self) -> None:
        self._write_settings({"ollama_local_on_deck": True, "capabilities": {"internet_downloads": True}})
        with mock.patch.object(setup_rpc, "run_local_setup", side_effect=lambda **_k: None), mock.patch.object(
            setup_rpc.pull_resume, "clear_note_unless_unloading"
        ):
            await self.plugin.start_local_ollama_setup({"profile": "tier1_essentials", "leave_out": ["note_search"]})
            note = resume.read_note(self.settings_dir)
            await self.plugin._local_ollama_setup_task
        self.assertEqual(note["leave_out"], ["note_search"])


class AReloadStartsTheSameRunAgain(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.dir = tempfile.mkdtemp()
        resume.mark_unloading(False)

    async def _resume_with(self, note_extra: dict) -> mock.AsyncMock:
        resume._write(self.dir, {"profile": "tier1_essentials", "tags": [], "started_at": 1e12, "restarts": 0, **note_extra})
        plugin = mock.Mock(_maybe_app_log=mock.AsyncMock())
        rpc = mock.Mock(start_local_ollama_setup=mock.AsyncMock(return_value={"accepted": True}))
        out = await resume.resume_interrupted_download(plugin, self.dir, rpc, delay_seconds=0)
        self.assertEqual(out, "started")
        return rpc.start_local_ollama_setup

    async def test_the_restart_leaves_out_the_same_pieces(self) -> None:
        start = await self._resume_with({"leave_out": ["note_search", "voice"]})
        start.assert_awaited_once()
        self.assertEqual(start.await_args.args[1], {"profile": "tier1_essentials", "leave_out": ["note_search", "voice"]})

    async def test_a_note_written_before_the_list_existed_still_loads_and_leaves_nothing_out(self) -> None:
        start = await self._resume_with({})
        self.assertEqual(start.await_args.args[1], {"profile": "tier1_essentials", "leave_out": []})

    def test_a_broken_list_in_the_note_reads_as_nothing_left_out(self) -> None:
        resume._write(self.dir, {"profile": "tier1_essentials", "tags": [], "started_at": 1.0, "leave_out": "voice"})
        self.assertEqual(resume.read_note(self.dir)["leave_out"], [])
        self.assertTrue(os.path.exists(resume.note_path(self.dir)))


if __name__ == "__main__":
    unittest.main()
