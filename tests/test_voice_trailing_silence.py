"""A pause before pressing Stop must not add a word nobody said to the end of the dictation (plan 89).

Why: on the Deck on 2026-10-11, tiny.en read a 15 s and a 21 s recorded sentence whole, but each final
text ended with a stray " you". The driver pressed Stop some seconds after the speech ended, so the
last part of the recording was silence, and Whisper invents short words such as "you" on silence.
A real person pauses before Stop too.

What is pinned here, at the level the person sees (the final text that lands in the question box):
  - speech followed by silence gives a final text with no invented trailing word, because the final
    read is handed the speech plus a short margin and not the silence itself;
  - speech with no silence at the end is read exactly as before, so a sentence that really ends in
    "okay", spoken loudly to the end, keeps it;
  - a short margin of quiet is kept after the speech and nothing inside the speech is cut (a pause in
    the middle stays); the START of the recording is never trimmed, because the same loudness gate
    clips the quiet first word of a soft speaker (the quiet-speaker test caught that);
  - a very short word still gets a read long enough for the engine to accept;
  - a recording that is all silence still gives nothing.

The stand-in for the engine invents " you" whenever the audio it is handed ends in more than one
second of silence, like the real one does, and says the plain sentence otherwise. The sound is built
from samples (loud slices, then room tone), never from a real model.
"""

from __future__ import annotations

import unittest
from typing import Optional

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_level_gate as gate  # noqa: E402
from test_voice_whole_recording import (  # noqa: E402
    BPS,
    ROOM_RMS,
    SLICE_S,
    SPEECH_RMS,
    Call,
    Recording,
    _slice,
    room_then_stream,
)

SENTENCE = "how do i get past the second boss in this game"


def slices(rms: float, seconds: float, first_index: int) -> list[bytes]:
    return [_slice(rms, first_index + i) for i in range(int(seconds / SLICE_S))]


def lead_speech_pause_speech_tail(lead_s: float, first_s: float, pause_s: float, second_s: float, tail_s: float):
    """room, speech, a pause inside the speech, speech, room; (pcm, speech_start_s, speech_end_s)."""
    out: list[bytes] = []
    for rms, seconds in (
        (ROOM_RMS, lead_s),
        (SPEECH_RMS, first_s),
        (ROOM_RMS, pause_s),
        (SPEECH_RMS, second_s),
        (ROOM_RMS, tail_s),
    ):
        out += slices(rms, seconds, len(out))
    start = int(lead_s / SLICE_S) * SLICE_S
    end = start + (int(first_s / SLICE_S) + int(pause_s / SLICE_S) + int(second_s / SLICE_S)) * SLICE_S
    return b"".join(out), start, end


def inventing_engine(rec: Recording, sentence: str, speech_end_s: float, ending: str = "") -> None:
    """The final read says `sentence`, plus an invented ' you' when the audio ends in over 1 s of silence."""

    def hear(call: Call) -> Optional[str]:
        if not call.whole:
            return None
        text = sentence + ending
        return text + " you" if call.end_s - speech_end_s > 1.0 else text

    rec.on_call = hear


def run_with_final_read(pcm: bytes, speech_end_s: float):
    """(status, the one final read) of a recording whose engine invents ' you' after silence."""
    rec = Recording(pcm)
    inventing_engine(rec, SENTENCE, speech_end_s=speech_end_s)
    status = rec.run()
    return status, [c for c in rec.calls if c.whole][0]


class FinalTextAfterAPauseTests(unittest.TestCase):
    def test_a_pause_before_stop_adds_no_word_to_the_final_text(self) -> None:
        for silence_s in (3.0, 4.0, 6.0):
            with self.subTest(silence_s=silence_s):
                rec = Recording(room_then_stream(5.0, silence_s))
                inventing_engine(rec, SENTENCE, speech_end_s=5.0)
                status = rec.run()
                self.assertEqual(status["finalized_transcript"], SENTENCE)
                self.assertEqual(status["status"], "stopped")

    def test_the_read_starts_at_the_start_and_ends_just_after_the_speech(self) -> None:
        pcm, _start_s, end_s = lead_speech_pause_speech_tail(2.5, 3.0, 0.0, 0.0, 4.0)
        status, final = run_with_final_read(pcm, end_s)
        self.assertEqual(status["finalized_transcript"], SENTENCE)
        self.assertAlmostEqual(final.start_s, 0.0, places=2)
        self.assertGreaterEqual(final.end_s - end_s, gate.TAIL_KEEP_S - SLICE_S)
        self.assertLessEqual(final.end_s - end_s, gate.TAIL_KEEP_S + SLICE_S)

    def test_speech_that_runs_to_the_end_is_read_whole_and_unchanged(self) -> None:
        rec = Recording(room_then_stream(5.0, 0.0))
        inventing_engine(rec, SENTENCE, speech_end_s=5.0)
        status = rec.run()
        self.assertEqual(status["finalized_transcript"], SENTENCE)
        final = [c for c in rec.calls if c.whole][0]
        self.assertAlmostEqual(final.length_s, len(rec.stream) / BPS, places=1)

    def test_a_sentence_that_really_ends_in_okay_keeps_it_with_or_without_a_pause(self) -> None:
        sentence = "can you tell me where the key is okay"
        for silence_s in (0.3, 4.0):
            with self.subTest(silence_s=silence_s):
                rec = Recording(room_then_stream(5.0, silence_s))
                inventing_engine(rec, sentence, speech_end_s=5.0)
                self.assertEqual(rec.run()["finalized_transcript"], sentence)

    def test_a_pause_inside_the_sentence_is_not_cut(self) -> None:
        pcm, start_s, end_s = lead_speech_pause_speech_tail(1.0, 2.0, 1.5, 2.0, 4.0)
        status, final = run_with_final_read(pcm, end_s)
        self.assertEqual(status["finalized_transcript"], SENTENCE)
        self.assertGreaterEqual(final.length_s, (end_s - start_s) + 0.01)

    def test_a_very_short_word_still_gets_a_read_the_engine_accepts(self) -> None:
        rec = Recording(room_then_stream(0.5, 6.0))
        inventing_engine(rec, "yes please", speech_end_s=0.5)
        status = rec.run()
        final = [c for c in rec.calls if c.whole][0]
        self.assertGreaterEqual(final.length_s, 1.0 - SLICE_S)
        self.assertEqual(status["finalized_transcript"], "yes please")

    def test_a_recording_of_only_silence_still_gives_nothing(self) -> None:
        rec = Recording(room_then_stream(0.0, 8.0))
        inventing_engine(rec, SENTENCE, speech_end_s=0.0)
        status = rec.run()
        self.assertEqual(rec.calls, [])
        self.assertEqual(status["finalized_transcript"], "")


class TrimTrailingSilenceTests(unittest.TestCase):
    def _gate_that_heard(self, pcm: bytes) -> gate.VoiceLevelGate:
        g = gate.VoiceLevelGate()
        for start in range(0, len(pcm), 4096):
            g.observe(pcm[start : start + 4096])
        return g

    def test_it_keeps_everything_up_to_the_speech_end_and_a_short_margin(self) -> None:
        pcm, _start_s, end_s = lead_speech_pause_speech_tail(3.0, 2.0, 1.0, 2.0, 5.0)
        trimmed = self._gate_that_heard(pcm).trim_trailing_silence(pcm)
        self.assertEqual(trimmed, pcm[: len(trimmed)])
        self.assertAlmostEqual(len(trimmed) / BPS, end_s + gate.TAIL_KEEP_S, delta=SLICE_S)
        self.assertEqual(len(trimmed) % 2, 0)

    def test_audio_with_no_speech_in_it_is_returned_untouched(self) -> None:
        pcm = room_then_stream(0.0, 4.0)
        self.assertEqual(self._gate_that_heard(pcm).trim_trailing_silence(pcm), pcm)

    def test_audio_that_is_all_speech_is_returned_untouched(self) -> None:
        pcm = room_then_stream(4.0, 0.0)
        self.assertEqual(self._gate_that_heard(pcm).trim_trailing_silence(pcm), pcm)

    def test_a_result_under_a_second_is_grown_back_to_a_second(self) -> None:
        pcm = room_then_stream(0.2, 5.0)
        trimmed = self._gate_that_heard(pcm).trim_trailing_silence(pcm)
        self.assertAlmostEqual(len(trimmed) / BPS, gate.MIN_TRIMMED_S, delta=0.001)


if __name__ == "__main__":
    unittest.main()
