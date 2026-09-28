import json
import os
import struct
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from backend.services.voice_whisper_daemon import (
    WhisperEngine,
    _build_multipart_wav_body,
    _health_is_ready,
    _read_pid_file,
    _write_pid_file,
    force_whisper_engine_stop,
    get_whisper_engine,
    parse_whisper_server_json,
)
from backend.services.voice_whisper_runtime import (
    _pcm_to_wav_bytes,
    voice_whisper_cli_path,
    voice_whisper_server_path,
)


class WhisperDaemonTests(unittest.TestCase):
    def test_parse_whisper_server_json_text_field(self):
        body = json.dumps({"text": "hello deck"})
        self.assertEqual(parse_whisper_server_json(body), "hello deck")

    def test_parse_whisper_server_json_segments(self):
        body = json.dumps({"segments": [{"text": "one"}, {"text": "two"}]})
        self.assertEqual(parse_whisper_server_json(body), "one two")

    def test_health_is_ready_accepts_ok(self):
        self.assertTrue(_health_is_ready(200, '{"status":"ok"}'))
        self.assertFalse(_health_is_ready(503, '{"status":"loading model"}'))

    def test_multipart_body_contains_fields(self):
        wav = _pcm_to_wav_bytes(struct.pack("<4h", 0, 1, -1, 2))
        body, boundary = _build_multipart_wav_body(
            wav,
            {"language": "en", "response_format": "json"},
        )
        text = body.decode("latin-1")
        self.assertIn(boundary, text)
        self.assertIn('name="language"', text)
        self.assertIn('filename="audio.wav"', text)
        self.assertIn(b"RIFF", body)

    def test_pid_file_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "whisper-server.pid")
            _write_pid_file(path, 4242)
            self.assertEqual(_read_pid_file(path), 4242)

    @patch("backend.services.voice_whisper_daemon._post_inference_wav", return_value="daemon text")
    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value="/bin/whisper-server")
    @patch.object(WhisperEngine, "_wait_for_health", return_value=True)
    @patch("backend.services.voice_whisper_daemon.subprocess.Popen")
    def test_acquire_release_refcount(self, mock_popen, _health, _usable, _post):
        proc = MagicMock()
        proc.pid = 999
        proc.poll.return_value = None
        mock_popen.return_value = proc
        engine = WhisperEngine()
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            model = os.path.join(settings_dir, "ggml-tiny.en.bin")
            with open(model, "wb") as f:
                f.write(b"x" * 2048)
            engine.acquire("mic", model, plugin_root, settings_dir)
            self.assertTrue(engine.daemon_available())
            engine.acquire("wake", model, plugin_root, settings_dir)
            engine.release("mic")
            self.assertTrue(engine.daemon_available())
            engine.release("wake")
            self.assertFalse(engine.daemon_available())
            proc.terminate.assert_called()

    def _fake_server(self, mock_popen):
        procs = []

        def make(*_a, **_k):
            proc = MagicMock()
            proc.pid = 1000 + len(procs)
            proc.poll.return_value = None
            procs.append(proc)
            return proc

        mock_popen.side_effect = make
        return procs

    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value="/bin/whisper-server")
    @patch.object(WhisperEngine, "_wait_for_health", return_value=True)
    @patch("backend.services.voice_whisper_daemon.subprocess.Popen")
    def test_different_model_is_refused_while_another_reason_holds(self, mock_popen, _health, _usable):
        """The first holder keeps its server: a second reason asking for a
        different model is told no, is not counted, and nothing restarts."""
        procs = self._fake_server(mock_popen)
        engine = WhisperEngine()
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            self.assertTrue(engine.acquire("mic", "/models/base.bin", plugin_root, settings_dir))
            self.assertFalse(engine.acquire("wake", "/models/tiny.bin", plugin_root, settings_dir))
            self.assertEqual(len(procs), 1)
            procs[0].terminate.assert_not_called()
            self.assertTrue(engine.daemon_available())
            self.assertEqual(engine._model_path, "/models/base.bin")
            self.assertNotIn("wake", engine._reason_refcount)
            # The refused reason letting go must not stop the mic's server.
            engine.release("wake")
            self.assertTrue(engine.daemon_available())
            procs[0].terminate.assert_not_called()
            engine.release("mic")
            self.assertFalse(engine.daemon_available())
            procs[0].terminate.assert_called()

    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value="/bin/whisper-server")
    @patch.object(WhisperEngine, "_wait_for_health", return_value=True)
    @patch("backend.services.voice_whisper_daemon.subprocess.Popen")
    def test_sole_holder_may_switch_model(self, mock_popen, _health, _usable):
        """Today's mic behaviour: with nobody else holding, a new model restarts the server."""
        procs = self._fake_server(mock_popen)
        engine = WhisperEngine()
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            self.assertTrue(engine.acquire("mic", "/models/base.bin", plugin_root, settings_dir))
            self.assertTrue(engine.acquire("mic", "/models/tiny.bin", plugin_root, settings_dir))
            self.assertEqual(len(procs), 2)
            procs[0].terminate.assert_called()
            self.assertEqual(engine._model_path, "/models/tiny.bin")

    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value="/bin/whisper-server")
    @patch("backend.services.voice_whisper_daemon.subprocess.Popen")
    def test_second_caller_waits_for_a_start_already_underway(self, mock_popen, _usable):
        """A second acquire during the first one's seconds-long model load
        waits and shares that server instead of launching a second process
        on the same port (or, for another model, is refused once it is up)."""
        import threading

        procs = self._fake_server(mock_popen)
        loading = threading.Event()
        finish_loading = threading.Event()

        def slow_health(_self):
            loading.set()
            finish_loading.wait(5)
            return True

        engine = WhisperEngine()
        results = {}
        with patch.object(WhisperEngine, "_wait_for_health", slow_health), \
                tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            first = threading.Thread(
                target=lambda: results.__setitem__(
                    "mic", engine.acquire("mic", "/models/base.bin", plugin_root, settings_dir)
                )
            )
            first.start()
            self.assertTrue(loading.wait(5))
            same = threading.Thread(
                target=lambda: results.__setitem__(
                    "wake", engine.acquire("wake", "/models/base.bin", plugin_root, settings_dir)
                )
            )
            other = threading.Thread(
                target=lambda: results.__setitem__(
                    "other", engine.acquire("other", "/models/tiny.bin", plugin_root, settings_dir)
                )
            )
            same.start()
            other.start()
            finish_loading.set()
            for t in (first, same, other):
                t.join(5)
            self.assertEqual(results, {"mic": True, "wake": True, "other": False})
            self.assertEqual(len(procs), 1)
            procs[0].terminate.assert_not_called()

    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value="/bin/whisper-server")
    @patch("backend.services.voice_whisper_daemon.subprocess.Popen")
    def test_server_is_not_left_running_when_its_holder_lets_go_during_load(self, mock_popen, _usable):
        procs = self._fake_server(mock_popen)
        engine = WhisperEngine()

        def health_then_release(_self):
            engine.release("mic")
            return True

        with patch.object(WhisperEngine, "_wait_for_health", health_then_release), \
                tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            self.assertFalse(engine.acquire("mic", "/models/base.bin", plugin_root, settings_dir))
            self.assertFalse(engine.daemon_available())
            procs[0].terminate.assert_called()

    def test_release_of_a_reason_never_held_is_a_no_op(self):
        engine = WhisperEngine()
        engine._reason_refcount["mic"] = 1
        engine._daemon_ready = True
        proc = MagicMock()
        proc.poll.return_value = None
        engine._proc = proc
        engine.release("wake")
        self.assertEqual(engine._reason_refcount, {"mic": 1})
        self.assertTrue(engine.daemon_available())
        proc.terminate.assert_not_called()

    def test_mic_session_trusts_acquire_answer_not_daemon_available(self):
        """A refused mic must not send its audio to a server running someone else's model."""
        from backend.services import voice_transcription_service as vts

        engine = MagicMock()
        engine.acquire.return_value = False
        engine.daemon_available.return_value = True
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir, \
                patch.object(vts, "get_whisper_engine", return_value=engine), \
                patch.object(vts, "engine_readiness", return_value={"binary_ready": True, "model_ready": True}), \
                patch.object(vts, "_resolve_capture_command", side_effect=RuntimeError("no capture")):
            session = vts.VoiceTranscriptionSession(plugin_root, settings_dir, "tiny.en", SimpleNamespace())
            session._set_state = Mock()
            session.start()
            self.assertFalse(session._use_daemon)

    @patch("backend.services.voice_whisper_daemon.whisper_server_binary_usable", return_value=None)
    def test_acquire_missing_server_falls_back(self, _usable):
        engine = WhisperEngine()
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            model = os.path.join(settings_dir, "ggml-tiny.en.bin")
            with open(model, "wb") as f:
                f.write(b"x" * 2048)
            engine.acquire("mic", model, plugin_root, settings_dir)
            self.assertFalse(engine.daemon_available())

    @patch("backend.services.voice_whisper_daemon._kill_pid_best_effort")
    @patch("backend.services.voice_whisper_daemon._read_pid_file", return_value=1234)
    def test_force_stop_clears_refcounts(self, _read_pid, _kill):
        engine = WhisperEngine()
        engine._reason_refcount["mic"] = 1
        engine._daemon_ready = True
        engine._plugin_root = "/tmp"
        engine._settings_dir = "/tmp"
        proc = MagicMock()
        proc.poll.return_value = None
        engine._proc = proc
        engine.force_stop()
        self.assertEqual(engine._reason_refcount, {})
        self.assertFalse(engine.daemon_available())
        proc.terminate.assert_called()

    def test_transcribe_skips_when_daemon_unavailable(self):
        engine = WhisperEngine()
        pcm = struct.pack("<8h", *([100] * 8))
        self.assertEqual(engine.transcribe(pcm), "")

    @patch("backend.services.voice_transcription_service._run_whisper_transcribe", return_value="cli text")
    def test_session_uses_cli_when_daemon_unavailable(self, mock_cli):
        from backend.services.voice_transcription_service import VoiceTranscriptionSession

        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            session = VoiceTranscriptionSession(plugin_root, settings_dir, "tiny.en", SimpleNamespace())
            session._use_daemon = False
            text = session._transcribe_pcm("/bin/whisper-cli", "/tmp/model", {}, b"\x00\x01")
            self.assertEqual(text, "cli text")
            mock_cli.assert_called_once()

    def test_force_whisper_engine_stop_is_idempotent(self):
        force_whisper_engine_stop()
        self.assertIsNotNone(get_whisper_engine())


if __name__ == "__main__":
    unittest.main()
