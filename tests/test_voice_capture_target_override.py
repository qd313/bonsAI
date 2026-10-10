"""Developer-only: a file in the settings folder points the mic button at another audio source.

Why: the speech tests need a recorded sentence heard by the real plugin without a person in front
of the Deck. The Deck loads a null sink, plays the sentence into it, and writes the sink's monitor
into `voice_capture_target` in the plugin's settings folder; the next mic press records from there.
With no file (everyone, by default) the Deck's own microphone is used exactly as before.

Does not: touch the Deck. The audio tools are replaced by fakes.
"""

from __future__ import annotations

import os
import tempfile
import types
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import voice_audio_capture_service as cap  # noqa: E402
from backend.services import voice_transcription_service as vts  # noqa: E402

INTERNAL_MIC = "alsa_input.pci-0000_04_00.5-platform-nau8821-max.HiFi__Internal_Mic__source"


class CaptureTargetOverride(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name
        for patcher in (
            mock.patch.object(cap, "env_for_audio_capture", return_value={}),
            mock.patch.object(cap, "_resolve_pipewire_mic_target", return_value=INTERNAL_MIC),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def _write(self, text: str) -> None:
        with open(os.path.join(self.dir, cap.CAPTURE_TARGET_FILE), "w", encoding="utf-8") as fh:
            fh.write(text)

    def _command(self, tools=("pw-record",)) -> tuple[list[str], str]:
        with mock.patch.object(cap.shutil, "which", side_effect=lambda n: f"/usr/bin/{n}" if n in tools else None):
            cmd, backend, _env = cap._resolve_capture_command(self.dir)
        return cmd, backend

    def test_no_file_records_from_the_internal_microphone_as_before(self) -> None:
        cmd, backend = self._command()
        self.assertEqual(cmd[cmd.index("--target") + 1], INTERNAL_MIC)
        self.assertEqual(backend, "pipewire")

    def test_a_sinks_monitor_is_recorded_by_naming_the_sink_and_asking_for_its_output(self) -> None:
        self._write("p87mic.monitor\n")
        cmd, backend = self._command()
        self.assertEqual(cmd[cmd.index("--target") + 1], "p87mic")
        self.assertIn("{ stream.capture.sink=true }", cmd)
        self.assertNotIn("p87mic.monitor", cmd)
        self.assertNotIn(INTERNAL_MIC, cmd)
        self.assertIn("p87mic.monitor", backend)

    def test_another_source_name_is_used_as_the_target(self) -> None:
        self._write("some_other_source")
        cmd, _backend = self._command()
        self.assertEqual(cmd[cmd.index("--target") + 1], "some_other_source")

    def test_parecord_gets_the_monitor_name_as_it_is(self) -> None:
        self._write("p87mic.monitor")
        cmd, _backend = self._command(tools=("parecord",))
        self.assertIn("--device=p87mic.monitor", cmd)

    def test_a_name_with_anything_odd_in_it_is_ignored(self) -> None:
        for bad in ("p87mic.monitor; rm -rf /", "two words", "", "../x/..", "a" * 300):
            with self.subTest(bad=bad[:30]):
                self._write(bad)
                self.assertEqual(cap.developer_capture_target(self.dir), "")
                cmd, _backend = self._command()
                self.assertEqual(cmd[cmd.index("--target") + 1], INTERNAL_MIC)

    def test_the_session_hands_its_settings_folder_to_the_capture_step(self) -> None:
        seen = []

        def fake_resolve(*args):
            seen.append(args)
            raise RuntimeError("stop here")

        engine = mock.MagicMock()
        engine.acquire.return_value = False
        session = vts.VoiceTranscriptionSession("/plugin", "/settings", "tiny.en", types.SimpleNamespace())
        with mock.patch.object(vts, "get_whisper_engine", return_value=engine), \
                mock.patch.object(vts, "engine_readiness", return_value={"binary_ready": True, "model_ready": True}), \
                mock.patch.object(vts, "_resolve_capture_command", fake_resolve):
            session.start()
        self.assertEqual(seen, [("/settings",)])


if __name__ == "__main__":
    unittest.main()
