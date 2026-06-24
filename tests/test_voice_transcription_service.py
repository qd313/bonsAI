import os
import tempfile
import unittest
import struct
import sys
import threading
import time
from types import SimpleNamespace

from backend.services.voice_transcription_service import (
    DEFAULT_VOICE_STT_MODEL,
    VoiceTranscriptionSession,
    _link_versioned_sonames,
    _parse_whisper_stdout,
    _pcm_rms,
    _pcm_to_wav_bytes,
    _runtime_dir_usable,
    _whisper_decode_usable,
    merge_sliding_window_transcript,
    resolve_whisper_cli,
    sanitize_voice_stt_model,
    voice_whisper_cli_path,
    whisper_binary_usable,
)


class VoiceTranscriptionServiceTests(unittest.TestCase):
    def test_sanitize_voice_stt_model_defaults_tiny(self):
        self.assertEqual(sanitize_voice_stt_model(None), DEFAULT_VOICE_STT_MODEL)
        self.assertEqual(sanitize_voice_stt_model("base.en"), "base.en")
        self.assertEqual(sanitize_voice_stt_model("large"), DEFAULT_VOICE_STT_MODEL)

    def test_pcm_rms_silence_is_low(self):
        silent = struct.pack("<100h", *([0] * 100))
        self.assertLess(_pcm_rms(silent), 1.0)

    def test_pcm_rms_signal_is_higher(self):
        loud = struct.pack("<100h", *([8000] * 100))
        self.assertGreater(_pcm_rms(loud), 1000.0)

    def test_pcm_to_wav_bytes_has_header(self):
        pcm = struct.pack("<4h", 0, 100, -100, 50)
        wav = _pcm_to_wav_bytes(pcm)
        self.assertTrue(wav.startswith(b"RIFF"))
        self.assertIn(b"WAVE", wav)

    def test_resolve_whisper_cli_prefers_voice_bin(self):
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            dest = voice_whisper_cli_path(plugin_root, settings_dir)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(b"\x7fELF")
            os.chmod(dest, 0o755)
            resolved = resolve_whisper_cli(plugin_root, settings_dir)
            self.assertEqual(resolved, dest)

    @unittest.skipIf(os.name == "nt", "symlinks require elevated privileges on Windows")
    def test_link_versioned_sonames_creates_major_symlinks(self):
        with tempfile.TemporaryDirectory() as bin_dir:
            versioned = os.path.join(bin_dir, "libwhisper.so.1.8.6")
            with open(versioned, "wb") as f:
                f.write(b"\x7fELF")
            _link_versioned_sonames(bin_dir)
            self.assertTrue(os.path.islink(os.path.join(bin_dir, "libwhisper.so.1")))

    def test_whisper_binary_usable_requires_libs(self):
        with tempfile.TemporaryDirectory() as plugin_root, tempfile.TemporaryDirectory() as settings_dir:
            dest = voice_whisper_cli_path(plugin_root, settings_dir)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(b"\x7fELF")
            os.chmod(dest, 0o755)
            self.assertIsNone(whisper_binary_usable(plugin_root, settings_dir))

    @unittest.skipUnless(sys.platform.startswith("linux"), "linux session paths only")
    def test_runtime_dir_usable_false_for_missing(self):
        self.assertFalse(_runtime_dir_usable(""))
        self.assertFalse(_runtime_dir_usable("/nonexistent/path"))

    def test_merge_sliding_window_extends_partial(self):
        fin, partial = merge_sliding_window_transcript("", "hello", "hello world")
        self.assertEqual(fin, "")
        self.assertEqual(partial, "hello world")

    def test_merge_sliding_window_commits_on_overlap_shift(self):
        fin, partial = merge_sliding_window_transcript("", "hello world", "world how are")
        self.assertEqual(fin, "hello")
        self.assertEqual(partial, "world how are")

    def test_merge_sliding_window_commits_on_no_overlap(self):
        fin, partial = merge_sliding_window_transcript("ask", "foo bar", "baz qux")
        self.assertEqual(fin, "ask foo bar")
        self.assertEqual(partial, "baz qux")

    def test_merge_sliding_window_ignores_shorter_regression(self):
        fin, partial = merge_sliding_window_transcript("", "hello world", "hello")
        self.assertEqual(fin, "")
        self.assertEqual(partial, "hello world")

    def test_parse_whisper_stdout_strips_timestamp_line(self):
        raw = "[00:00:00.000 --> 00:00:02.000]   Testing one, two, three."
        self.assertEqual(_parse_whisper_stdout(raw), "Testing one, two, three.")

    def test_parse_whisper_stdout_joins_multiline_segments(self):
        raw = (
            "[00:00:00.000 --> 00:00:00.850]   And so my\n"
            "[00:00:00.850 --> 00:00:01.590]   fellow"
        )
        self.assertEqual(_parse_whisper_stdout(raw), "And so my fellow")

    def test_parse_whisper_stdout_skips_blank_audio(self):
        raw = "[00:00:00.000 --> 00:00:10.000]   [BLANK_AUDIO]"
        self.assertEqual(_parse_whisper_stdout(raw), "")

    def test_parse_whisper_stdout_plain_text_passthrough(self):
        self.assertEqual(_parse_whisper_stdout("hello world"), "hello world")

    def test_whisper_decode_usable_rejects_quiet_filler(self):
        self.assertFalse(_whisper_decode_usable("you", 400.0))
        self.assertTrue(_whisper_decode_usable("you", 1000.0))

    def test_whisper_decode_usable_accepts_real_phrase_on_quiet_window(self):
        self.assertTrue(_whisper_decode_usable("Hello, this is a test", 200.0))

    def test_merge_drops_isolated_you_when_speech_shifts(self):
        fin, partial = merge_sliding_window_transcript("", "you", "Hello, this is a test")
        self.assertEqual(fin, "")
        self.assertEqual(partial, "Hello, this is a test")

    def test_whisper_decode_usable_rejects_quiet_yes(self):
        self.assertFalse(_whisper_decode_usable("Yes.", 400.0))

    def test_whisper_decode_usable_rejects_quiet_test(self):
        self.assertFalse(_whisper_decode_usable("Test.", 518.0))

    def test_merge_drops_test_fragment_before_testing(self):
        fin, partial = merge_sliding_window_transcript("", "Test.", "Testing one, two, three.")
        self.assertEqual(fin, "")
        self.assertEqual(partial, "Testing one, two, three.")

    def test_merge_dedupes_after_silence_commit(self):
        fin, partial = merge_sliding_window_transcript(
            "Testing one, two, three.",
            "",
            "Testing one, two, three, four.",
        )
        self.assertEqual(fin, "Testing one, two, three.")
        self.assertEqual(partial, "four.")

    def test_merge_normalized_overlap_ignores_punctuation(self):
        fin, partial = merge_sliding_window_transcript(
            "",
            "Testing, one two, three.",
            "three, four.",
        )
        self.assertEqual(fin, "Testing, one two,")
        self.assertEqual(partial, "three, four.")

    def test_pcm_buffer_survives_concurrent_append_and_window(self):
        session = VoiceTranscriptionSession("/tmp", "/tmp", DEFAULT_VOICE_STT_MODEL, SimpleNamespace())
        chunk = struct.pack("<256h", *([100] * 256))
        stop = threading.Event()
        errors: list[BaseException] = []

        def writer() -> None:
            try:
                while not stop.is_set():
                    session._append_pcm(chunk)
            except BaseException as exc:
                errors.append(exc)

        t = threading.Thread(target=writer, daemon=True)
        t.start()
        try:
            for _ in range(500):
                session._window_pcm(1.0)
                session._drop_pcm_before(0.25)
        finally:
            stop.set()
            t.join(timeout=2.0)
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
