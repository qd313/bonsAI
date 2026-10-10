"""A quiet speaker's sentence must come through whole, not stop after three or four seconds.

Why: on 2026-10-09 the maintainer found that on the Deck the mic stopped growing the question
after about 3 or 4 seconds of speech. Reproduced on 2026-10-10: a recorded ten-second sentence
played into the plugin at the Deck microphone's own quiet level (speech peaks at 150 to 250) got
its first few words and then nothing. The loop skipped every decode pass whose AVERAGE loudness,
gaps between words included, was under a fixed 120, and a quiet speaker's average is just under it.

These tests drive the real listening loop (VoiceTranscriptionSession._transcribe_loop) with a
clock that jumps instead of waiting, a stream of loud and quiet slices shaped like speech with
short pauses, and a stand-in for whisper that writes down the words that are fully inside the
audio it is given and loud enough to hear. The level of the speaker is the only thing that
changes between the tests.
"""

from __future__ import annotations

import os
import random
import struct
import tempfile
import types
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import voice_level_gate as gate  # noqa: E402
from backend.services import voice_transcription_service as vts  # noqa: E402

BYTES_PER_SECOND = vts.BYTES_PER_SECOND
SLICE_S = gate.SLICE_BYTES / BYTES_PER_SECOND  # 64 ms
SENTENCE = (
    "how do i beat the final boss in this game and which weapon should i upgrade first "
    "because my health keeps running out before the second phase"
).split()
SECONDS_PER_WORD = 0.55
WORD_SECONDS = 0.45
ROOM_RMS = 20  # what the mic hears between words and in a quiet room


def _slice(rms: float) -> bytes:
    """One 64 ms slice whose RMS is exactly `rms` (a square wave)."""
    amp = int(rms)
    return struct.pack("<%dh" % (gate.SLICE_BYTES // 2), *([amp, -amp] * (gate.SLICE_BYTES // 4)))


def speech_stream(speaker_mean_rms: float, pause_at_word: int | None = None, pause_s: float = 1.5, seed: int = 1):
    """(pcm, word_times): the sentence as loud and quiet slices, then three seconds of room."""
    rng = random.Random(seed)
    spread = speaker_mean_rms * 0.55
    out: list[bytes] = []
    times: list[tuple[float, float]] = []
    t = 0.0
    for i, _word in enumerate(SENTENCE):
        if pause_at_word is not None and i == pause_at_word:
            out.extend(_slice(ROOM_RMS) for _ in range(int(pause_s / SLICE_S)))
            t += int(pause_s / SLICE_S) * SLICE_S
        start = t
        for _ in range(int(WORD_SECONDS / SLICE_S)):
            out.append(_slice(max(30.0, rng.uniform(speaker_mean_rms - spread, speaker_mean_rms + spread))))
            t += SLICE_S
        times.append((start, t))
        gap = int((SECONDS_PER_WORD - WORD_SECONDS) / SLICE_S) + 1
        out.extend(_slice(ROOM_RMS) for _ in range(gap))
        t += gap * SLICE_S
    out.extend(_slice(ROOM_RMS) for _ in range(int(3.0 / SLICE_S)))
    return b"".join(out), times


def room_stream(rms: float, seconds: float) -> bytes:
    return b"".join(_slice(rms) for _ in range(int(seconds / SLICE_S)))


class Recording:
    """Runs one session's listening loop over a prebuilt sound stream, on a jumping clock."""

    def __init__(self, stream: bytes, word_times=()):
        self.stream = stream
        self.word_times = list(word_times)
        self.clock = 0.0
        self.fed = 0
        self.decode_calls = 0
        self.session = vts.VoiceTranscriptionSession("/p", "/s", "tiny.en", mock.MagicMock())

    def _feed_until_now(self) -> None:
        until = min(len(self.stream), int(self.clock * BYTES_PER_SECOND))
        while self.fed + 4096 <= until or (self.fed < until == len(self.stream)):
            chunk = self.stream[self.fed : self.fed + 4096]
            self.session._append_pcm(chunk)
            self.fed += len(chunk)

    def _sleep(self, seconds: float) -> None:
        self.clock += seconds
        self._feed_until_now()
        if self.fed >= len(self.stream):
            self.session._stop_event.set()

    def _hear(self, _bin, _model, _env, pcm: bytes) -> str:
        self.decode_calls += 1
        end = self.fed / BYTES_PER_SECOND
        start = end - len(pcm) / BYTES_PER_SECOND
        heard = [w for w, (a, b) in zip(SENTENCE, self.word_times) if a >= start - 0.02 and b <= end + 0.02]
        return " ".join(heard)

    def run(self) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            model = vts.voice_model_path(tmp, tmp, "tiny.en")
            os.makedirs(os.path.dirname(model), exist_ok=True)
            open(model, "wb").close()
            self.session.plugin_root = self.session.settings_dir = tmp
            fake_time = types.SimpleNamespace(
                monotonic=lambda: self.clock, sleep=self._sleep, time=lambda: self.clock
            )
            self.session._transcribe_pcm = self._hear
            with mock.patch.object(vts, "time", fake_time), \
                    mock.patch.object(vts, "whisper_binary_usable", return_value="/bin/whisper-cli"):
                self.session._transcribe_loop()
        return self.session.status()


def _words(status: dict) -> list[str]:
    return status["finalized_transcript"].split()


class QuietSpeakerTests(unittest.TestCase):
    def test_a_quiet_speakers_ten_second_sentence_comes_through_whole(self) -> None:
        """The Deck check: the transcript holds the last words and listening did not stop early."""
        for pause in (None, 12):
            with self.subTest(pause_at_word=pause):
                stream, times = speech_stream(speaker_mean_rms=105, pause_at_word=pause)
                status = Recording(stream, times).run()
                self.assertEqual(_words(status)[-3:], SENTENCE[-3:], status["finalized_transcript"])
                self.assertEqual(_words(status)[:3], SENTENCE[:3])

    def test_a_quiet_speaker_keeps_getting_passes_after_the_fourth_second(self) -> None:
        stream, times = speech_stream(speaker_mean_rms=105)
        rec = Recording(stream, times)
        rec.run()
        # About 0.4 s between passes over roughly ten seconds of speech: far more than the
        # handful that fit in the first three or four seconds.
        self.assertGreater(rec.decode_calls, 15)

    def test_a_normal_speaker_still_comes_through_whole(self) -> None:
        stream, times = speech_stream(speaker_mean_rms=900)
        status = Recording(stream, times).run()
        self.assertEqual(_words(status)[-3:], SENTENCE[-3:])

    def test_a_quiet_room_starts_no_decode_at_all(self) -> None:
        rec = Recording(room_stream(ROOM_RMS, 8.0))
        status = rec.run()
        self.assertEqual(rec.decode_calls, 0)
        self.assertEqual(status["finalized_transcript"], "")

    def test_a_steady_noisy_room_starts_no_decode_at_all(self) -> None:
        for rms in (70, 100):
            with self.subTest(room_rms=rms):
                rec = Recording(room_stream(rms, 8.0))
                rec.run()
                self.assertEqual(rec.decode_calls, 0)

    def test_one_click_of_the_button_starts_no_decode(self) -> None:
        stream = room_stream(ROOM_RMS, 1.0) + _slice(3000) + _slice(3000) + room_stream(ROOM_RMS, 6.0)
        rec = Recording(stream)
        rec.run()
        self.assertEqual(rec.decode_calls, 0)


class LevelGateTests(unittest.TestCase):
    def test_the_floor_follows_the_quiet_the_mic_sits_at(self) -> None:
        g = gate.VoiceLevelGate()
        for _ in range(50):
            g.observe(_slice(10))
        self.assertEqual(g.threshold(), gate.MIN_VOICED_RMS)
        for _ in range(500):
            g.observe(_slice(90))
        self.assertEqual(g.threshold(), gate.MAX_VOICED_RMS)

    def test_a_chunk_of_quiet_speech_counts_as_voice_in_a_quiet_room(self) -> None:
        g = gate.VoiceLevelGate()
        for _ in range(30):
            g.observe(_slice(ROOM_RMS))
        self.assertTrue(g.observe(_slice(95) + _slice(40)))
        self.assertFalse(g.observe(_slice(ROOM_RMS) + _slice(30)))


if __name__ == "__main__":
    unittest.main()
