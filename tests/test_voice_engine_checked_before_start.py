"""Title: A changed voice engine is not run, and an engine from before the record still works

Purpose: Before any voice engine program is run, its files are compared with the record the build wrote
(a SHA-256 for each program and library). These tests pin, at the level the Deck check looks at (the engine
is asked to start and the program is not run), that: a changed or cut-off program or library refuses the
start and the program is never executed; the shared background engine's start refuses too; a build from
before the record existed keeps working and gets its record on its first good start ("trusted once"), after
which a change is caught; and the person is told in plain words how to rebuild.
Used for: voice_engine_record.check_voice_engine, voice_whisper_runtime.whisper_binary_usable and
whisper_server_binary_usable, voice_whisper_daemon.WhisperEngine._start_server,
voice_transcription_service.engine_readiness and VoiceTranscriptionSession.start, voice_rpc's mic press.
Does not: Run a real whisper program or podman.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.voice import voice_engine_record as record  # noqa: E402
from backend.voice import voice_rpc  # noqa: E402
from backend.voice import voice_whisper_daemon as daemon  # noqa: E402
from backend.voice import voice_whisper_runtime as runtime  # noqa: E402
from backend.voice import voice_transcription_service as service  # noqa: E402


def _make_engine(tmp: str, with_record: bool) -> tuple[str, str, str]:
    """A fake built engine: both programs and the four libraries the runtime asks for."""
    plugin_root, settings_dir = os.path.join(tmp, "plugin"), os.path.join(tmp, "settings")
    os.makedirs(plugin_root)
    bin_dir = runtime.voice_bin_dir(plugin_root, settings_dir)
    os.makedirs(bin_dir)
    for name in ("whisper-cli", "whisper-server", *runtime.WHISPER_REQUIRED_SONAMES):
        path = os.path.join(bin_dir, name)
        with open(path, "wb") as f:
            f.write(("built " + name).encode())
        os.chmod(path, 0o755)
    if with_record:
        assert record.write_voice_engine_record(bin_dir, "image@sha256:abc", ["g++: g++ 11.4.0"])
    return plugin_root, settings_dir, bin_dir


def _change(bin_dir: str, name: str, data: bytes = b"tampered") -> None:
    with open(os.path.join(bin_dir, name), "wb") as f:
        f.write(data)


def _usage_run(*_a, **_k):
    return SimpleNamespace(returncode=0, stdout="usage: whisper-cli [options]", stderr="")


class EngineCheckedBeforeStart(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def _run_patch(self):
        return mock.patch.object(runtime.subprocess, "run", side_effect=_usage_run)

    def test_an_unchanged_engine_starts(self) -> None:
        root, settings, _bin = _make_engine(self.tmp, with_record=True)
        with self._run_patch() as run:
            self.assertTrue(runtime.whisper_binary_usable(root, settings))
            self.assertTrue(runtime.whisper_server_binary_usable(root, settings))
        self.assertGreaterEqual(run.call_count, 2)

    def test_a_changed_program_is_never_run(self) -> None:
        for victim in ("whisper-cli", "whisper-server"):
            with self.subTest(victim=victim):
                shutil.rmtree(self.tmp, True)
                self.tmp = tempfile.mkdtemp()
                root, settings, bin_dir = _make_engine(self.tmp, with_record=True)
                _change(bin_dir, victim)
                with self._run_patch() as run:
                    self.assertIsNone(runtime.whisper_binary_usable(root, settings))
                    self.assertIsNone(runtime.whisper_server_binary_usable(root, settings))
                self.assertEqual(run.call_count, 0, "the program was run although it had changed")
                self.assertTrue(record.voice_engine_changed(bin_dir))

    def test_a_changed_cut_off_missing_or_extra_library_refuses_too(self) -> None:
        cases = {
            "changed": lambda b: _change(b, "libggml.so.0"),
            "cut off": lambda b: _change(b, "libwhisper.so.1", b""),
            "missing": lambda b: os.remove(os.path.join(b, "libggml-cpu.so.0")),
            "extra": lambda b: _change(b, "libevil.so.9", b"x"),
            "extra program": lambda b: None,
        }
        for label, mutate in cases.items():
            with self.subTest(case=label):
                shutil.rmtree(self.tmp, True)
                self.tmp = tempfile.mkdtemp()
                root, settings, bin_dir = _make_engine(self.tmp, with_record=True)
                if label == "extra program":
                    os.remove(os.path.join(bin_dir, "whisper-server"))
                    record.write_voice_engine_record(bin_dir, "img", [])
                    _change(bin_dir, "whisper-server", b"slipped in later")
                else:
                    mutate(bin_dir)
                with self._run_patch() as run:
                    self.assertIsNone(runtime.whisper_binary_usable(root, settings))
                self.assertEqual(run.call_count, 0)

    def test_a_damaged_record_refuses_the_start(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=True)
        with open(record.record_path(bin_dir), "w", encoding="utf-8") as f:
            f.write("{not json")
        with self._run_patch() as run:
            self.assertIsNone(runtime.whisper_binary_usable(root, settings))
        self.assertEqual(run.call_count, 0)

    def test_the_shared_engine_does_not_start_a_changed_server(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=True)
        _change(bin_dir, "whisper-server")
        engine = daemon.WhisperEngine()
        with self._run_patch(), mock.patch.object(daemon.subprocess, "Popen") as popen:
            self.assertFalse(engine.acquire("mic", os.path.join(self.tmp, "model.bin"), root, settings))
        self.assertEqual(popen.call_count, 0, "the changed whisper-server was started")

    def test_a_rebuild_makes_the_engine_usable_again(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=True)
        _change(bin_dir, "whisper-cli")
        with self._run_patch():
            self.assertIsNone(runtime.whisper_binary_usable(root, settings))
            record.write_voice_engine_record(bin_dir, "image@sha256:abc", ["g++: g++ 11.4.0"])  # what a build does
            self.assertTrue(runtime.whisper_binary_usable(root, settings))


class EngineFromBeforeTheRecord(unittest.TestCase):
    """The rule chosen: trust once. An engine with no record keeps working; its first good start writes the record."""

    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def test_it_starts_and_the_record_is_written_on_the_first_good_start(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=False)
        self.assertFalse(os.path.exists(record.record_path(bin_dir)))
        with mock.patch.object(runtime.subprocess, "run", side_effect=_usage_run):
            self.assertTrue(runtime.whisper_binary_usable(root, settings))
        with open(record.record_path(bin_dir), encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved["source"], "first_use")
        self.assertIn("whisper-cli", saved["files"])
        self.assertIn("whisper-server", saved["files"])
        self.assertEqual(record.check_voice_engine(bin_dir), "ok")

    def test_after_the_record_is_written_a_change_is_caught(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=False)
        with mock.patch.object(runtime.subprocess, "run", side_effect=_usage_run) as run:
            self.assertTrue(runtime.whisper_binary_usable(root, settings))
            _change(bin_dir, "whisper-cli")
            before = run.call_count
            self.assertIsNone(runtime.whisper_binary_usable(root, settings))
        self.assertEqual(run.call_count, before)

    def test_an_engine_that_fails_its_own_start_up_test_is_not_trusted_or_recorded(self) -> None:
        root, settings, bin_dir = _make_engine(self.tmp, with_record=False)
        broken = SimpleNamespace(returncode=1, stdout="", stderr="illegal instruction")
        with mock.patch.object(runtime.subprocess, "run", return_value=broken):
            self.assertIsNone(runtime.whisper_binary_usable(root, settings))
        self.assertFalse(os.path.exists(record.record_path(bin_dir)))

    def test_no_engine_at_all_is_not_a_change(self) -> None:
        self.assertEqual(record.check_voice_engine(os.path.join(self.tmp, "nothing")), "none")
        self.assertFalse(record.voice_engine_changed(os.path.join(self.tmp, "nothing")))


class PersonIsToldHowToRebuild(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    def test_the_words_say_what_happened_then_what_to_do(self) -> None:
        line = record.ENGINE_CHANGED_LINE
        self.assertLess(line.index("was not started"), line.index("Install voice engine"))
        for word in ("Settings", "Voice input", "Install voice engine", "internet"):
            self.assertIn(word, line)

    def test_readiness_and_session_start_say_the_engine_changed(self) -> None:
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        root, settings, bin_dir = _make_engine(tmp, with_record=True)
        _change(bin_dir, "whisper-server")
        with mock.patch.object(runtime.subprocess, "run", side_effect=_usage_run):
            ready = service.engine_readiness(root, settings, "base.en")
            self.assertFalse(ready["binary_ready"])
            self.assertTrue(ready["engine_changed"])
            session = service.VoiceTranscriptionSession(root, settings, "base.en", mock.MagicMock())
            out = session.start()
        self.assertFalse(out["accepted"])
        self.assertEqual(out["error"], record.ENGINE_CHANGED_LINE)

    async def test_the_mic_press_is_refused_with_its_own_code_and_the_words(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "tiny.en"})
        with mock.patch.object(voice_rpc, "engine_readiness", return_value={"binary_ready": False, "engine_changed": True}):
            out = await self.plugin.start_voice_transcription()
        self.assertFalse(out["accepted"])
        self.assertEqual(out["error"], "engine_changed")
        self.assertEqual(out["reason"], record.ENGINE_CHANGED_LINE)


if __name__ == "__main__":
    unittest.main()
