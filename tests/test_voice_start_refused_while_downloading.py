"""Pressing the mic while the speech model is still downloading is refused with a plain line.

Why: on 2026-10-09 the maintainer pressed the mic with the base.en model at the very minute its
download finished, got ten seconds of nothing, and had no way to tell a half-finished model from a
broken one. Now the press is turned away with "The speech model is still downloading. Try again
when it finishes." and nothing is recorded. A model file of the wrong size counts as not ready too.

What the screen sees: `start_voice_transcription` returns the refusal; the mic button's hook turns
its `reason` into the "Voice input unavailable" toast (pinned in useVoiceAskInput.test.ts).
"""

from __future__ import annotations

import os
import time
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.services import voice_model_download_service as dl  # noqa: E402
from backend.services import voice_rpc  # noqa: E402
from backend.services import voice_transcription_service as vts  # noqa: E402

DOWNLOADING_LINE = "The speech model is still downloading. Try again when it finishes."


class ExplodingSession:
    """Building a recording session at all means the press was not refused."""

    def __init__(self, *_a, **_k) -> None:
        raise AssertionError("a recording session was built while the model is downloading")


class StartRefusedWhileDownloading(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self.logger = mock.MagicMock()
        for patcher in (
            mock.patch.object(voice_rpc, "logger", self.logger),
            mock.patch.object(voice_rpc, "VoiceTranscriptionSession", ExplodingSession),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        self.plugin._persist_input_transparency = mock.AsyncMock()
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "base.en"})

    def _models_dir(self) -> str:
        path = dl.voice_models_dir("", self.settings_dir)
        os.makedirs(path, exist_ok=True)
        return path

    def _not_ready(self) -> mock._patch:
        return mock.patch.object(
            voice_rpc, "engine_readiness", return_value={"binary_ready": True, "model_ready": False}
        )

    async def test_refused_while_this_models_download_is_running(self) -> None:
        self.plugin._voice_install_state.update(
            {"phase": "running", "done": False, "model_id": "base.en", "stage": "downloading", "progress_pct": 40}
        )
        with self._not_ready():
            out = await self.plugin.start_voice_transcription()
        self.assertFalse(out["accepted"])
        self.assertEqual(out["error"], "model_downloading")
        self.assertEqual(out["reason"], DOWNLOADING_LINE)

    async def test_refused_while_the_engine_is_still_being_built(self) -> None:
        self.plugin._voice_install_state.update(
            {"phase": "running", "done": False, "model_id": "base.en", "stage": "binary_build_start"}
        )
        with mock.patch.object(
            voice_rpc, "engine_readiness", return_value={"binary_ready": False, "model_ready": False}
        ):
            out = await self.plugin.start_voice_transcription()
        self.assertFalse(out["accepted"])
        self.assertEqual(out["error"], "engine_installing")
        self.assertIn("still being set up", out["reason"])

    async def test_refused_while_a_fresh_partial_file_is_growing(self) -> None:
        with open(os.path.join(self._models_dir(), "ggml-base.en.bin.part"), "wb") as fh:
            fh.write(b"x" * 4096)
        with self._not_ready():
            out = await self.plugin.start_voice_transcription()
        self.assertEqual(out["error"], "model_downloading")
        self.assertEqual(out["reason"], DOWNLOADING_LINE)

    async def test_an_old_abandoned_partial_file_is_just_a_missing_model(self) -> None:
        part = os.path.join(self._models_dir(), "ggml-base.en.bin.part")
        with open(part, "wb") as fh:
            fh.write(b"x" * 4096)
        old = time.time() - 3600
        os.utime(part, (old, old))
        with self._not_ready():
            out = await self.plugin.start_voice_transcription()
        self.assertEqual(out["error"], "model_missing")

    async def test_another_models_download_does_not_block_a_complete_model(self) -> None:
        self.plugin._voice_install_state.update(
            {"phase": "running", "done": False, "model_id": "tiny.en", "stage": "downloading"}
        )
        ready = {"binary_ready": True, "model_ready": True}

        class Ok:
            def __init__(self, *_a, **_k) -> None:
                pass

            def start(self) -> dict:
                return {"accepted": True}

        with mock.patch.object(voice_rpc, "engine_readiness", return_value=ready), \
                mock.patch.object(voice_rpc, "VoiceTranscriptionSession", Ok):
            out = await self.plugin.start_voice_transcription()
        self.assertTrue(out["accepted"])

    async def test_the_refusal_is_logged_with_its_reason(self) -> None:
        self.plugin._voice_install_state.update(
            {"phase": "running", "done": False, "model_id": "base.en", "stage": "downloading"}
        )
        with self._not_ready():
            await self.plugin.start_voice_transcription()
        lines = [str(c.args[0]) % c.args[1:] for c in self.logger.info.call_args_list]
        self.assertTrue(any("model_downloading" in line and "base.en" in line for line in lines), lines)


class IncompleteModelFile(unittest.TestCase):
    """A model file that is not the pinned size is not ready, and the next install replaces it."""

    def setUp(self) -> None:
        import tempfile

        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = tmp.name
        os.makedirs(dl.voice_models_dir(self.root, self.root), exist_ok=True)
        self.path = dl.voice_model_path(self.root, self.root, "base.en")

    def test_a_short_file_at_the_final_name_is_not_ready(self) -> None:
        with open(self.path, "wb") as fh:
            fh.write(b"x" * 5000)
        ready = vts.engine_readiness(self.root, self.root, "base.en")
        self.assertFalse(ready["model_ready"])

    def test_a_file_of_the_pinned_size_is_ready(self) -> None:
        spec = dict(dl.VOICE_STT_MODEL_SPECS["base.en"], bytes=6000)
        with mock.patch.dict(dl.VOICE_STT_MODEL_SPECS, {"base.en": spec}):
            with open(self.path, "wb") as fh:
                fh.write(b"x" * 6000)
            ready = vts.engine_readiness(self.root, self.root, "base.en")
        self.assertTrue(ready["model_ready"])

    def test_install_replaces_a_short_file_instead_of_calling_it_done(self) -> None:
        import threading

        with open(self.path, "wb") as fh:
            fh.write(b"x" * 5000)
        good = b"y" * 6000
        import hashlib

        spec = dict(dl.VOICE_STT_MODEL_SPECS["base.en"], bytes=len(good), sha256=hashlib.sha256(good).hexdigest())

        def fake_download(url, tmp_path, cancel_event, on_progress=None, max_bytes=None):
            with open(tmp_path, "wb") as fh:
                fh.write(good)

        state = dl.new_voice_install_state()
        with mock.patch.dict(dl.VOICE_STT_MODEL_SPECS, {"base.en": spec}), \
                mock.patch.object(dl, "_download_model_file", fake_download):
            dl.download_voice_model(self.root, self.root, "base.en", state, threading.Event())
            self.assertEqual(os.path.getsize(self.path), 6000)
            self.assertEqual(state["phase"], "done")


if __name__ == "__main__":
    unittest.main()
