"""The microphone's start and stop calls leave one plain line each in the plugin log.

Why: on 2026-10-06 the rig pressed the microphone button and a recording ran, yet the plugin log
held no voice line at all, because the only log call there goes to the activity log, which is
switched off. These tests pin that every start (accepted or refused, with the reason and the model
id) and every stop writes through the ordinary logger, so the log file shows whether a press arrived.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.services import voice_rpc  # noqa: E402


class FakeSession:
    def __init__(self, *_a, **_k) -> None:
        pass

    def start(self) -> dict:
        return {"accepted": True}

    def stop(self) -> dict:
        return {"stopped": True, "finalized_transcript": "hello there"}


def _lines(logger: mock.MagicMock) -> list[str]:
    return [str(c.args[0]) % c.args[1:] if len(c.args) > 1 else str(c.args[0]) for c in logger.info.call_args_list]


class VoiceStartStopLogging(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self.logger = mock.MagicMock()
        patcher = mock.patch.object(voice_rpc, "logger", self.logger)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin._persist_input_transparency = mock.AsyncMock()

    async def test_start_logs_the_refusal_when_the_microphone_is_not_allowed(self) -> None:
        self._write_settings({"capabilities": {"microphone_access": False}, "voice_stt_model": "tiny.en"})
        out = await self.plugin.start_voice_transcription()
        self.assertFalse(out["accepted"])
        lines = _lines(self.logger)
        self.assertEqual(len(lines), 1)
        self.assertIn("refused", lines[0])
        self.assertIn("permission_denied", lines[0])
        self.assertIn("tiny.en", lines[0])

    async def test_start_logs_the_refusal_when_the_engine_is_missing(self) -> None:
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "tiny.en"})
        with mock.patch.object(voice_rpc, "engine_readiness", return_value={"binary_ready": False}):
            out = await self.plugin.start_voice_transcription()
        self.assertEqual(out["error"], "engine_missing")
        lines = _lines(self.logger)
        self.assertEqual(len(lines), 1)
        self.assertIn("engine_missing", lines[0])
        self.assertIn("tiny.en", lines[0])

    async def test_start_logs_acceptance_with_the_model_id(self) -> None:
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "tiny.en"})
        ready = {"binary_ready": True, "model_ready": True}
        with mock.patch.object(voice_rpc, "engine_readiness", return_value=ready), \
                mock.patch.object(voice_rpc, "VoiceTranscriptionSession", FakeSession):
            out = await self.plugin.start_voice_transcription()
        self.assertTrue(out["accepted"])
        lines = _lines(self.logger)
        self.assertEqual(len(lines), 1)
        self.assertIn("started", lines[0])
        self.assertIn("tiny.en", lines[0])

    async def test_stop_logs_when_a_recording_ends(self) -> None:
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "tiny.en"})
        self.plugin._voice_session = FakeSession()
        await self.plugin.stop_voice_transcription()
        lines = _lines(self.logger)
        self.assertEqual(len(lines), 1)
        self.assertIn("stopped", lines[0])

    async def test_stop_logs_even_when_nothing_was_recording(self) -> None:
        self.plugin._voice_session = None
        await self.plugin.stop_voice_transcription()
        lines = _lines(self.logger)
        self.assertEqual(len(lines), 1)
        self.assertIn("no recording", lines[0])


if __name__ == "__main__":
    unittest.main()
