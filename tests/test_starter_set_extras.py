"""Title: The starter set brings the answer model, the note-search model and the two speech models

Purpose: A first setup ("Install the starter set") must leave a Deck with answers, note search and the
microphone's speech models in one go. These pin, at the level the Deck check looks at (the status the AI
models tab reads, and the files the voice engine reads from): the note-search model that is already there
is reported as there and not downloaded again; the speech models are fetched through the voice engine's own
download, even with the microphone permission off; and one download failing never stops the others, and the
closing sentence names which piece failed.
Used for: starter_set_extras.py, run_local_setup (local_ollama_setup_service.py), start_local_ollama_setup
(ollama_local_setup_rpc.py) and get_voice_engine_status (voice_rpc.py).
Does not: Touch the network or the real voice engine; the pulls and the file download are faked.
"""

from __future__ import annotations

import asyncio
import contextlib
import re
import unittest
from unittest import mock
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402
from src_paths import find_src_file  # noqa: E402

from backend.ollama_routing import TIER1_ESSENTIALS_PULL_TAGS, setup_recommended_pull_tags  # noqa: E402
from backend.services import local_ollama_setup_service as setup  # noqa: E402
from backend.services import ollama_local_setup_rpc as setup_rpc  # noqa: E402
from backend.services import starter_set_extras as extras  # noqa: E402
from backend.services import starter_speech_models as speech_models  # noqa: E402
from backend.services import voice_model_download_service as voice_models  # noqa: E402

S = "backend.services.local_ollama_setup_service"
LOGGER = type("L", (), {"info": lambda *a, **k: None, "exception": lambda *a, **k: None})()


class TheSetIsNamedOnBothSides(unittest.TestCase):
    def test_the_back_end_set_is_the_answer_model_and_the_note_search_model(self):
        self.assertEqual(list(TIER1_ESSENTIALS_PULL_TAGS), ["gemma4:e2b-it-qat", "nomic-embed-text"])
        self.assertEqual(setup_recommended_pull_tags("tier1_essentials"), list(TIER1_ESSENTIALS_PULL_TAGS))

    def test_the_screen_names_the_same_note_search_model_and_speech_models(self):
        text = find_src_file("deckEssentialsTags.ts").read_text(encoding="utf-8")
        note = re.search(r'STARTER_NOTE_SEARCH_TAG = "([^"]+)"', text)
        speech = re.search(r"STARTER_SPEECH_MODELS: readonly string\[\] = \[([^\]]*)\]", text)
        self.assertIsNotNone(note)
        self.assertIsNotNone(speech)
        self.assertEqual(note.group(1), TIER1_ESSENTIALS_PULL_TAGS[1])
        self.assertEqual(re.findall(r'"([^"]+)"', speech.group(1)), list(extras.STARTER_SPEECH_MODELS))

    def test_both_speech_models_are_models_the_voice_engine_can_download(self):
        for model_id in extras.STARTER_SPEECH_MODELS:
            self.assertIn(model_id, voice_models.VOICE_STT_MODEL_SPECS)


class OllamaPartOfTheSet(unittest.TestCase):
    def _pull(self, installed, results):
        pulls: list[str] = []

        def pull_one(tag):
            pulls.append(tag)
            return results.get(tag, (True, ""))

        out = extras.pull_starter_tags(
            list(TIER1_ESSENTIALS_PULL_TAGS), installed, pull_one, lambda _m: None, lambda: False, lambda *_a: None
        )
        return pulls, out

    def test_a_model_already_there_is_reported_present_and_not_downloaded_again(self):
        pulls, (pulled, present, failures) = self._pull(["nomic-embed-text:latest"], {})
        self.assertEqual(pulls, ["gemma4:e2b-it-qat"])
        self.assertEqual(pulled, ["gemma4:e2b-it-qat"])
        self.assertEqual(present, ["nomic-embed-text"])
        self.assertEqual(failures, {})

    def test_a_failed_download_does_not_stop_the_next_one(self):
        pulls, (pulled, present, failures) = self._pull([], {"gemma4:e2b-it-qat": (False, "no route to host\nmore")})
        self.assertEqual(pulls, ["gemma4:e2b-it-qat", "nomic-embed-text"])
        self.assertEqual(pulled, ["nomic-embed-text"])
        self.assertEqual(failures, {"gemma4:e2b-it-qat": "no route to host"})


class SpeechModelsPartOfTheSet(unittest.TestCase):
    def _run(self, complete=(), failing=()):
        calls: list[str] = []

        def fake_download(_root, _dir, model_id, _state, _cancel, _on_stage=None):
            calls.append(model_id)
            if model_id in failing:
                raise RuntimeError(f"{model_id} could not be fetched")

        with (
            patch.object(voice_models, "download_voice_model", side_effect=fake_download),
            patch.object(voice_models, "model_file_complete", side_effect=lambda _r, _d, m: m in complete),
        ):
            out = speech_models.download_speech_models("/p", "/s", lambda _m: None, lambda _t: None, asyncio.Event())
        return calls, out

    def test_both_speech_models_are_downloaded_through_the_voice_engines_own_path(self):
        calls, failures = self._run()
        self.assertEqual(calls, ["tiny.en", "base.en"])
        self.assertEqual(failures, {})

    def test_a_speech_model_already_on_disk_is_not_downloaded_again(self):
        calls, failures = self._run(complete=("tiny.en",))
        self.assertEqual(calls, ["base.en"])
        self.assertEqual(failures, {})

    def test_one_failing_leaves_the_other_going_ahead_and_names_the_failure(self):
        calls, failures = self._run(failing=("tiny.en",))
        self.assertEqual(calls, ["tiny.en", "base.en"])
        self.assertEqual(list(failures), ["tiny.en"])
        self.assertIn("could not be fetched", failures["tiny.en"])


def _setup_run(profile, installed, fake_pull, **extra):
    """Run one setup on a Deck whose Ollama is up and whose pulls are faked; returns the status dict."""
    state: dict = {"phase": "running"}
    patches = {
        "_install_or_update_ollama_binary": {"return_value": "/x/ollama"},
        "probe_ollama_http_ok": {"return_value": True},
        "ensure_ollama_server_listening_before_pull": {"return_value": True},
        "ensure_ollama_cli_home_ready": {"return_value": True},
        "list_installed_ollama_tags": {"return_value": installed},
        "run_ollama_pull": {"side_effect": fake_pull},
        "record_result": {"side_effect": lambda st, *_a: st.update(progress_text="", result_line="Ollama 0.40.2 is ready.")},
    }

    async def go():
        with contextlib.ExitStack() as stack:
            for name, kw in patches.items():
                stack.enter_context(patch(f"{S}.{name}", **kw))
            stack.enter_context(patch(f"{S}.sys.platform", "linux"))
            await setup.run_local_setup(
                profile=profile, state=state, logger=LOGGER, cancel_event=asyncio.Event(), **extra
            )

    asyncio.run(go())
    return state


class TheRunTheTabReads(unittest.TestCase):
    """The status after pressing Install the starter set, with the pulls and downloads faked."""

    def _run(self, *, installed, pull_results=None, speech_failures=None, microphone=True, speech=True):
        pulls: list[str] = []
        speech_calls: list[int] = []

        def fake_pull(_bin, tag, _log, _cancelled):
            pulls.append(tag)
            return (pull_results or {}).get(tag, (True, ""))

        def speech_download(_log, _progress, _cancel):
            speech_calls.append(1)
            return dict(speech_failures or {})

        state = _setup_run(
            "tier1_essentials", installed, fake_pull,
            speech_download=speech_download if speech else None, microphone_enabled=microphone,
        )
        return state, pulls, speech_calls

    def test_a_first_setup_ends_done_and_says_what_it_brought(self):
        state, pulls, speech_calls = self._run(installed=[])
        self.assertEqual(pulls, ["gemma4:e2b-it-qat", "nomic-embed-text"])
        self.assertEqual(len(speech_calls), 1)
        self.assertEqual(state["phase"], "done")
        self.assertIn("gemma4:e2b-it-qat and nomic-embed-text", state["result_line"])
        self.assertIn("tiny.en and base.en", state["result_line"])

    def test_the_note_search_model_already_there_is_reported_present_with_no_second_download(self):
        state, pulls, _ = self._run(installed=["nomic-embed-text:latest"])
        self.assertEqual(pulls, ["gemma4:e2b-it-qat"])
        self.assertEqual(state["phase"], "done")
        self.assertIn("nomic-embed-text was already installed", state["result_line"])

    def test_a_speech_download_failing_is_named_and_the_models_still_installed_stay_reported(self):
        state, pulls, _ = self._run(installed=[], speech_failures={"base.en": "disk full"})
        self.assertEqual(pulls, ["gemma4:e2b-it-qat", "nomic-embed-text"])
        self.assertEqual(state["phase"], "failed")
        self.assertIn("base.en speech model did not download", state["error"])
        self.assertIn("disk full", state["error"])
        self.assertIn("Downloaded gemma4:e2b-it-qat and nomic-embed-text", state["error"])
        self.assertNotIn("tiny.en speech model did not", state["error"])

    def test_an_answer_model_download_failing_still_runs_the_rest_and_names_it(self):
        state, pulls, speech_calls = self._run(
            installed=[], pull_results={"gemma4:e2b-it-qat": (False, "pull refused")}
        )
        self.assertEqual(pulls, ["gemma4:e2b-it-qat", "nomic-embed-text"])
        self.assertEqual(len(speech_calls), 1)
        self.assertEqual(state["phase"], "failed")
        self.assertIn("gemma4:e2b-it-qat did not download (pull refused)", state["error"])
        self.assertIn("Speech models ready: tiny.en and base.en", state["error"])

    def test_with_the_microphone_permission_off_the_models_still_download_and_the_line_says_so(self):
        state, _, speech_calls = self._run(installed=[], microphone=False)
        self.assertEqual(len(speech_calls), 1)
        self.assertEqual(state["phase"], "done")
        self.assertIn("Turn on Voice input (microphone) in the Permissions tab", state["result_line"])

    def test_other_profiles_are_untouched_a_failed_pull_still_stops_them(self):
        state = _setup_run("update_installed", ["a:1", "b:2"], lambda *_a: (False, "nope"))
        self.assertEqual(state["phase"], "failed")
        self.assertEqual(state["error"], "nope")


class TheRpcHandsInTheVoiceDownload(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()

    async def _start(self, capabilities: dict):
        self._write_settings({"ollama_local_on_deck": True, "capabilities": capabilities})
        seen: dict = {}

        async def fake_setup(**kwargs) -> None:
            seen.update(kwargs)

        with mock.patch.object(setup_rpc, "run_local_setup", side_effect=fake_setup):
            out = await self.plugin.start_local_ollama_setup({"profile": "tier1_essentials"})
            await self.plugin._local_ollama_setup_task
        self.assertTrue(out["accepted"])
        return seen

    async def test_the_starter_set_gets_the_speech_download_even_with_the_microphone_off(self) -> None:
        seen = await self._start({"internet_downloads": True, "microphone_access": False})
        self.assertIsNotNone(seen.get("speech_download"))
        self.assertFalse(seen.get("microphone_enabled"))

    async def test_it_knows_when_the_microphone_is_on(self) -> None:
        seen = await self._start({"internet_downloads": True, "microphone_access": True})
        self.assertTrue(seen.get("microphone_enabled"))

    async def test_the_download_goes_through_the_voice_engines_own_function(self) -> None:
        seen = await self._start({"internet_downloads": True})
        with mock.patch.object(setup_rpc, "download_speech_models", return_value={}) as dl:
            out = seen["speech_download"](lambda _m: None, lambda _t: None, asyncio.Event())
        self.assertEqual(out, {})
        self.assertEqual(dl.call_count, 1)

    async def test_the_update_profile_gets_none_of_it(self) -> None:
        self._write_settings({"ollama_local_on_deck": True, "capabilities": {"internet_downloads": True}})
        seen: dict = {}

        async def fake_setup(**kwargs) -> None:
            seen.update(kwargs)

        with mock.patch.object(setup_rpc, "run_local_setup", side_effect=fake_setup):
            await self.plugin.start_local_ollama_setup({"profile": "update_installed"})
            await self.plugin._local_ollama_setup_task
        self.assertNotIn("speech_download", seen)


class VoiceStatusNamesBothSpeechModels(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()

    async def test_status_says_which_speech_models_are_on_disk(self) -> None:
        self._write_settings({})
        from backend.services import voice_rpc

        with patch.object(voice_rpc, "model_file_complete", side_effect=lambda _r, _d, m: m == "tiny.en"):
            out = await self.plugin.get_voice_engine_status()
        self.assertEqual(out["speech_models_ready"], {"base.en": False, "tiny.en": True})


class SummaryWords(unittest.TestCase):
    def test_nothing_failed_gives_no_problem_sentence(self):
        good, bad = extras.starter_summary(
            pulled=["a"], present=[], pull_failures={}, speech_failures={}, microphone_enabled=True
        )
        self.assertEqual(bad, "")
        self.assertIn("Downloaded a.", good)


if __name__ == "__main__":
    unittest.main()
