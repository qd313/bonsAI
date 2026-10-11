"""The mic shows live words while you talk, then reads the WHOLE recording once at Stop (plan 88).

Why: on the Deck on 2026-10-10 the old listening loop re-read the newest three seconds again and
again and stitched the pieces by matching their overlap. With a game running one base.en pass took
about 4.2 s, so the loop fell behind (words lost, the game dropped from 60 to 35 frames a second),
and the stitching either repeated phrases (tiny.en) or swallowed a phrase said twice (base.en).

What a person now gets, and what is pinned here:
  - live words come from re-reading the recording so far, so each pass REPLACES the last (no stitching);
  - the engine rests as long as the last pass took, and runs only when speech has arrived;
  - a block stops growing at 28 seconds and is frozen; the recording stops by itself at the limit;
  - Stop reads the whole recording once, returns only when that text is ready, and that text replaces
    the live words; if that read fails the live words stay;
  - a start that arrives while a Stop is still finishing waits for it.

The listening loop is driven for real (VoiceTranscriptionSession._transcribe_loop) on a clock that
jumps instead of waiting, over a prebuilt sound stream, with a stand-in for whisper that writes down
the words fully inside the audio it is given. Each 64 ms slice of the stream is made unique, so the
stand-in can tell where in the recording the audio it was handed came from.
"""

from __future__ import annotations

import asyncio
import os
import struct
import tempfile
import threading
import time as real_time
import types
import unittest
from typing import Callable, Optional
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.services import voice_level_gate as gate  # noqa: E402
from backend.services import voice_rpc  # noqa: E402
from backend.services import voice_transcription_service as vts  # noqa: E402
from test_voice_quiet_speaker import Recording as QuietRecording  # noqa: E402

BPS = vts.BYTES_PER_SECOND
SLICE_S = gate.SLICE_BYTES / BPS
SPEECH_RMS = 600
ROOM_RMS = 20
SECONDS_PER_WORD = 0.5
WORD_SECONDS = 0.45


def _slice(rms: float, index: int) -> bytes:
    """One 64 ms slice with RMS `rms` and a tiny marker that makes it differ from every other."""
    amp = int(rms)
    samples = [amp, -amp] * (gate.SLICE_BYTES // 4)
    samples[0], samples[1], samples[2] = index % 13, (index // 13) % 13, index // 169
    return struct.pack("<%dh" % (gate.SLICE_BYTES // 2), *samples)


def build_stream(word_count: int, tail_s: float = 1.5, lead_s: float = 0.5):
    """(pcm, word_times): `word_count` loud words, one every half second, then room tone."""
    out: list[bytes] = []
    times: list[tuple[float, float]] = []
    index = 0

    def room(seconds: float) -> None:
        nonlocal index
        for _ in range(int(seconds / SLICE_S)):
            out.append(_slice(ROOM_RMS, index))
            index += 1

    room(lead_s)
    t = lead_s
    for _ in range(word_count):
        start = index * SLICE_S
        for _ in range(int(WORD_SECONDS / SLICE_S)):
            out.append(_slice(SPEECH_RMS, index))
            index += 1
        times.append((start, index * SLICE_S))
        gap = int(round((SECONDS_PER_WORD - WORD_SECONDS) / SLICE_S))
        for _ in range(gap):
            out.append(_slice(ROOM_RMS, index))
            index += 1
        t = index * SLICE_S
    room(tail_s)
    return b"".join(out), times


def room_then_stream(speech_s: float, room_s: float, speech_rms: float = SPEECH_RMS):
    """`speech_s` of loud sound then `room_s` of room tone, as unique slices."""
    out = []
    index = 0
    for _ in range(int(speech_s / SLICE_S)):
        out.append(_slice(speech_rms, index))
        index += 1
    for _ in range(int(room_s / SLICE_S)):
        out.append(_slice(ROOM_RMS, index))
        index += 1
    return b"".join(out)


class Call:
    def __init__(self, start_s: float, end_s: float, whole: bool, clock: float) -> None:
        self.start_s, self.end_s, self.whole, self.clock = start_s, end_s, whole, clock
        self.finished_clock = clock

    @property
    def length_s(self) -> float:
        return self.end_s - self.start_s


class Recording(QuietRecording):
    """The quiet-speaker test's jumping-clock run, with a stand-in that also notes where in the
    recording the audio it was handed came from, and what the session said about itself at that moment."""

    def __init__(self, stream: bytes, word_times=(), words: Optional[list[str]] = None, stop_at_end: bool = True):
        super().__init__(stream, word_times)
        self.words = words if words is not None else [f"w{i}" for i in range(len(self.word_times))]
        self.stop_at_end = stop_at_end
        self.calls: list[Call] = []
        self.status_at_call: list[dict] = []
        # Called with the Call being made; return text to override what the stand-in hears.
        self.on_call: Optional[Callable[[Call], Optional[str]]] = None
        self.session._set_state(status="recording", recording=True, streaming=True)

    def advance(self, seconds: float) -> None:
        self.clock += seconds
        self._feed_until_now()

    def _sleep(self, seconds: float) -> None:
        self.advance(seconds)
        if self.stop_at_end and self.fed >= len(self.stream):
            self.session._stop_event.set()

    def _hear(self, _bin, _model, _env, pcm: bytes) -> str:
        offset = self.stream.find(pcm[: gate.SLICE_BYTES])
        start_s = offset / BPS
        end_s = start_s + len(pcm) / BPS
        # The final pass is the one made after Stop (or the limit): a live read of a first block is the
        # same audio, so the audio alone cannot tell them apart.
        ended = self.session._stop_event.is_set() or self.session._finish_event.is_set()
        call = Call(start_s, end_s, whole=ended, clock=self.clock)
        self.calls.append(call)
        self.status_at_call.append(self.session.status())
        override = self.on_call(call) if self.on_call else None
        call.finished_clock = self.clock
        if override is not None:
            return override
        heard = [w for w, (a, b) in zip(self.words, self.word_times) if a >= start_s - 0.02 and b <= end_s + 0.02]
        return " ".join(heard)

    @property
    def live_calls(self) -> list[Call]:
        return [c for c in self.calls if not c.whole]


class FinalReplacesLiveTests(unittest.TestCase):
    def test_the_final_text_replaces_the_live_text(self) -> None:
        stream, times = build_stream(16)
        rec = Recording(stream, times)
        rec.on_call = lambda call: "the clean final text" if call.whole else None
        status = rec.run()
        self.assertEqual(status["finalized_transcript"], "the clean final text")
        self.assertEqual(status["partial_transcript"], "")
        self.assertEqual(status["status"], "stopped")
        self.assertFalse(status["recording"])

    def test_the_whole_recording_is_read_in_one_pass_after_stop(self) -> None:
        stream, times = build_stream(16)
        rec = Recording(stream, times)
        rec.run()
        wholes = [c for c in rec.calls if c.whole]
        self.assertEqual(len(wholes), 1)
        self.assertIs(rec.calls[-1], wholes[0])
        self.assertAlmostEqual(wholes[0].length_s, len(stream) / BPS, places=1)

    def test_a_failed_final_pass_keeps_the_live_text(self) -> None:
        for how in ("raises", "hears nothing", "only a quiet filler"):
            with self.subTest(final_pass=how):
                stream, times = build_stream(16)
                rec = Recording(stream, times)

                def final_fails(call: Call, how=how) -> Optional[str]:
                    if not call.whole:
                        return None
                    if how == "raises":
                        raise RuntimeError("whisper timed out")
                    return "" if how == "hears nothing" else "um"

                rec.on_call = final_fails
                status = rec.run()
                self.assertEqual(status["finalized_transcript"], " ".join(rec.words))
                self.assertEqual(status["status"], "stopped")

    def test_the_status_reads_finishing_with_recording_off_during_the_final_pass(self) -> None:
        stream, times = build_stream(10)
        rec = Recording(stream, times)
        rec.run()
        during = rec.status_at_call[[i for i, c in enumerate(rec.calls) if c.whole][0]]
        self.assertEqual(during["status"], "finishing")
        self.assertFalse(during["recording"])

    def test_loudness_is_judged_on_the_speech_not_the_whole_recording_with_its_pauses(self) -> None:
        """One loud second in half a minute of room tone: a lone 'yes' is real, not a hallucination."""
        stream = room_then_stream(1.0, 29.0, speech_rms=3000)
        whole_average = (1.0 * 3000**2 + 29.0 * ROOM_RMS**2) / 30.0
        self.assertLess(whole_average**0.5, vts.FILLER_MIN_RMS)  # the old judging rejected it
        rec = Recording(stream)
        rec.on_call = lambda call: "yes" if call.whole else ""
        status = rec.run()
        self.assertEqual(status["finalized_transcript"], "yes")

    def test_a_filler_in_a_recording_that_never_got_loud_is_still_refused(self) -> None:
        stream = room_then_stream(3.0, 3.0, speech_rms=SPEECH_RMS)
        rec = Recording(stream)
        rec.on_call = lambda call: "yes" if call.whole else ""
        status = rec.run()
        self.assertEqual(status["finalized_transcript"], "")

    def test_a_recording_with_no_speech_makes_no_final_pass(self) -> None:
        rec = Recording(room_then_stream(0.0, 6.0))
        status = rec.run()
        self.assertEqual(rec.calls, [])
        self.assertEqual(status["finalized_transcript"], "")
        self.assertEqual(status["status"], "stopped")


class LivePassesTests(unittest.TestCase):
    def test_live_text_is_replaced_by_each_pass_not_stitched(self) -> None:
        stream, times = build_stream(16)
        rec = Recording(stream, times)
        seen: list[str] = []
        rec.on_call = lambda call: seen.append(rec.session.status()["partial_transcript"]) or None
        rec.run()
        # Every live pass re-read the block from its start, so each one starts at the same place.
        starts = {round(c.start_s, 2) for c in rec.live_calls}
        self.assertEqual(len(starts), 1)

    def test_the_engine_rests_at_least_as_long_as_the_pass_took(self) -> None:
        stream, times = build_stream(30)
        rec = Recording(stream, times)

        def slow_pass(call: Call) -> Optional[str]:
            if not call.whole:
                rec.advance(2.0)  # this pass took two seconds
            return None

        rec.on_call = slow_pass
        rec.run()
        live = rec.live_calls
        self.assertGreater(len(live), 3)
        for before, after in zip(live, live[1:]):
            self.assertGreaterEqual(after.clock - before.finished_clock, 2.0 - 1e-6)

    def test_fast_passes_are_still_spaced_by_the_minimum_rest(self) -> None:
        stream, times = build_stream(30)
        rec = Recording(stream, times)
        rec.run()
        live = rec.live_calls
        self.assertGreater(len(live), 3)
        for before, after in zip(live, live[1:]):
            self.assertGreaterEqual(after.clock - before.finished_clock, vts.TRANSCRIBE_INTERVAL_S - 1e-6)

    def test_no_pass_runs_while_nothing_new_is_being_said(self) -> None:
        speech_s = 3.0
        rec = Recording(room_then_stream(speech_s, 20.0))
        rec.run()
        late = [c for c in rec.live_calls if c.clock > speech_s + 1.0]
        self.assertEqual(late, [], "a live pass ran after the speech had ended")

    def test_a_pass_that_hears_nothing_never_blanks_words_already_shown(self) -> None:
        stream, times = build_stream(24)
        rec = Recording(stream, times)
        replies = iter(["hello there", "", "um", "[BLANK_AUDIO]", "hello there friend"])
        shown: list[str] = []

        def scripted(call: Call) -> Optional[str]:
            if call.whole:
                return None
            shown.append(rec.session.status()["partial_transcript"])
            return next(replies, "hello there friend")

        rec.on_call = scripted
        rec.run()
        self.assertGreaterEqual(len(shown), 5)
        first = next(i for i, text in enumerate(shown) if text)
        self.assertTrue(all(text for text in shown[first:]), shown)


class BlockAndLimitTests(unittest.TestCase):
    def test_a_28_second_block_is_read_over_exactly_28_seconds_and_frozen(self) -> None:
        stream, times = build_stream(140)  # 70 s of speech
        rec = Recording(stream, times)
        rec.on_call = lambda call: (_ for _ in ()).throw(RuntimeError("no")) if call.whole else None
        status = rec.run()
        frozen = [c for c in rec.live_calls if abs(c.length_s - vts.BLOCK_SECONDS) < 0.01]
        self.assertGreaterEqual(len(frozen), 2, [round(c.length_s, 1) for c in rec.live_calls])
        self.assertLessEqual(max(c.length_s for c in rec.live_calls), vts.BLOCK_SECONDS + 0.01)
        # A frozen block ends exactly where the next one begins.
        self.assertAlmostEqual(frozen[1].start_s - frozen[0].start_s, vts.BLOCK_SECONDS, places=1)
        # Every word is there once, in order: nothing stitched, nothing doubled. A word spoken across
        # the 28-second mark is cut in two by design (the live preview only; the final pass reads whole).
        seams = [vts.BLOCK_SECONDS * n for n in (1, 2)]
        expected = [w for w, (a, b) in zip(rec.words, rec.word_times) if not any(a < m < b for m in seams)]
        self.assertEqual(len(rec.words) - len(expected), 2)
        self.assertEqual(status["finalized_transcript"].split() + status["partial_transcript"].split(), expected)

    def test_the_recording_stops_by_itself_at_the_time_limit(self) -> None:
        stream, times = build_stream(60)  # 30 s of speech, limit patched to 10 s
        rec = Recording(stream, times)
        with mock.patch.object(vts, "MAX_RECORDING_SECONDS", 10):
            status = rec.run()
        self.assertFalse(rec.session._stop_event.is_set(), "Stop was never pressed")
        self.assertTrue(rec.session._finish_event.is_set())
        self.assertEqual(status["status"], "stopped")
        self.assertFalse(status["recording"])
        self.assertEqual(len(rec.session._all_pcm), 10 * BPS)
        whole = [c for c in rec.calls if c.whole]
        self.assertEqual(len(whole), 1)
        self.assertAlmostEqual(whole[0].length_s, 10.0, places=1)

    def test_a_microphone_that_goes_away_finishes_the_recording(self) -> None:
        session = vts.VoiceTranscriptionSession("/p", "/s", "base.en", mock.MagicMock())
        chunks = [struct.pack("<2048h", *([300, -300] * 1024))] * 2 + [b""]
        proc = mock.MagicMock()
        proc.stdout.read.side_effect = chunks
        proc.stderr = None
        proc.poll.return_value = 0
        session._capture_proc = proc
        session._capture_reader_loop()
        self.assertTrue(session._finish_event.is_set())
        self.assertFalse(session._stop_event.is_set())


class _Worker:
    """A real session whose worker thread runs for real, with a stand-in for whisper."""

    def __init__(self, final_pass: Callable[[], str]) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.session = vts.VoiceTranscriptionSession(self.tmp.name, self.tmp.name, "base.en", mock.MagicMock())
        model = vts.voice_model_path(self.tmp.name, self.tmp.name, "base.en")
        os.makedirs(os.path.dirname(model), exist_ok=True)
        open(model, "wb").close()
        self.final_started = threading.Event()
        self.final_pass = final_pass

        def hear(_bin, _model, _env, _pcm) -> str:
            if self.session._stop_event.is_set() or self.session._finish_event.is_set():
                self.final_started.set()
                return self.final_pass()
            return "live words"

        self.session._transcribe_pcm = hear
        patcher = mock.patch.object(vts, "whisper_binary_usable", return_value="/bin/whisper-cli")
        patcher.start()
        self.patcher = patcher
        self.session._set_state(status="recording", recording=True, streaming=True)
        loud = struct.pack("<2048h", *([SPEECH_RMS, -SPEECH_RMS] * 1024))
        for _ in range(60):
            self.session._append_pcm(loud)
        self.thread = threading.Thread(target=self.session._transcribe_loop, daemon=True)
        self.session._worker_thread = self.thread
        self.thread.start()
        # Let the live loop run once so there is live text to replace.
        deadline = real_time.monotonic() + 3
        while not self.session.status()["partial_transcript"] and real_time.monotonic() < deadline:
            real_time.sleep(0.02)

    def close(self) -> None:
        self.session._stop_event.set()
        self.thread.join(timeout=5)
        self.patcher.stop()
        self.tmp.cleanup()


class StopWaitsForTheFinalTextTests(unittest.TestCase):
    def test_stop_returns_the_final_text(self) -> None:
        w = _Worker(lambda: "the final text")
        try:
            out = w.session.stop()
        finally:
            w.close()
        self.assertEqual(out["finalized_transcript"], "the final text")
        self.assertEqual(out["partial_transcript"], "")
        self.assertEqual(out["status"], "stopped")

    def test_stop_waits_for_a_final_pass_that_takes_longer_than_three_seconds(self) -> None:
        """The old join gave up after 3 s and released the engine under a pass still using it."""

        def slow() -> str:
            real_time.sleep(3.4)
            return "the late final text"

        w = _Worker(slow)
        try:
            out = w.session.stop()
            still_running = w.thread.is_alive()
        finally:
            w.close()
        self.assertFalse(still_running)
        self.assertEqual(out["finalized_transcript"], "the late final text")

    def test_a_second_stop_while_the_first_is_finishing_waits_for_the_same_text(self) -> None:
        release = threading.Event()

        def gated() -> str:
            release.wait(5)
            return "the final text"

        w = _Worker(gated)
        results: dict[str, dict] = {}
        try:
            first = threading.Thread(target=lambda: results.update(first=w.session.stop()), daemon=True)
            first.start()
            self.assertTrue(w.final_started.wait(3))
            second = threading.Thread(target=lambda: w.session.force_stop(), daemon=True)
            second.start()
            second.join(timeout=0.5)
            self.assertTrue(second.is_alive(), "a second stop returned while the final pass was still running")
            release.set()
            first.join(timeout=5)
            second.join(timeout=5)
        finally:
            release.set()
            w.close()
        self.assertEqual(results["first"]["finalized_transcript"], "the final text")
        self.assertEqual(w.session.status()["finalized_transcript"], "the final text")

    def test_force_stop_on_a_recording_skips_the_final_pass(self) -> None:
        calls: list[int] = []
        w = _Worker(lambda: calls.append(1) or "never wanted")
        try:
            w.session.force_stop()
        finally:
            w.close()
        self.assertEqual(calls, [])
        self.assertEqual(w.session.status()["finalized_transcript"], "live words")

    def test_the_engine_is_released_exactly_once(self) -> None:
        engine = mock.MagicMock()
        with mock.patch.object(vts, "get_whisper_engine", return_value=engine):
            w = _Worker(lambda: "the final text")
            w.session._engine_held = True
            try:
                w.session.stop()
                w.session.stop()
                w.session.force_stop()
            finally:
                w.close()
        engine.release.assert_called_once_with("mic")


class GatedSession:
    """A recording whose Stop is still finishing; the engine would be in use until it ends."""

    events: list[str] = []
    gate = threading.Event()

    def __init__(self, *_a, **_k) -> None:
        pass

    def start(self) -> dict:
        GatedSession.events.append("new recording started")
        return {"accepted": True}

    def stop(self) -> dict:
        GatedSession.events.append("stop begins")
        GatedSession.gate.wait(5)
        GatedSession.events.append("stop ends")
        return {"stopped": True, "finalized_transcript": "final", "status": "stopped"}

    def force_stop(self) -> None:
        GatedSession.gate.wait(5)

    def status(self) -> dict:
        return {"recording": False, "status": "finishing"}


class StartWaitsForStopTests(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self.plugin._persist_input_transparency = mock.AsyncMock()
        self._write_settings({"capabilities": {"microphone_access": True}, "voice_stt_model": "tiny.en"})
        GatedSession.events = []
        GatedSession.gate = threading.Event()
        self.addCleanup(GatedSession.gate.set)

    async def test_a_start_during_finishing_waits_for_the_stop_to_end(self) -> None:
        ready = {"binary_ready": True, "model_ready": True}
        self.plugin._voice_session = GatedSession()
        with mock.patch.object(voice_rpc, "engine_readiness", return_value=ready), \
                mock.patch.object(voice_rpc, "VoiceTranscriptionSession", GatedSession):
            stopping = asyncio.create_task(self.plugin.stop_voice_transcription())
            await asyncio.sleep(0.1)
            starting = asyncio.create_task(self.plugin.start_voice_transcription())
            await asyncio.sleep(0.3)
            self.assertNotIn("new recording started", GatedSession.events)
            self.assertFalse(starting.done())
            GatedSession.gate.set()
            stopped = await asyncio.wait_for(stopping, 5)
            started = await asyncio.wait_for(starting, 5)
        self.assertEqual(stopped["finalized_transcript"], "final")
        self.assertTrue(started["accepted"])
        self.assertEqual(GatedSession.events, ["stop begins", "stop ends", "new recording started"])
        # The finished recording is not left registered over the new one.
        self.assertIsInstance(self.plugin._voice_session, GatedSession)

    async def test_stop_keeps_the_session_registered_until_it_has_finished(self) -> None:
        self.plugin._voice_session = session = GatedSession()
        stopping = asyncio.create_task(self.plugin.stop_voice_transcription())
        await asyncio.sleep(0.2)
        self.assertIs(self.plugin._voice_session, session)
        GatedSession.gate.set()
        await asyncio.wait_for(stopping, 5)
        self.assertIsNone(self.plugin._voice_session)


class SpeechLoudnessTests(unittest.TestCase):
    def test_speech_rms_counts_only_the_voiced_slices(self) -> None:
        g = gate.VoiceLevelGate()
        pcm = b"".join(_slice(ROOM_RMS, i) for i in range(30)) + b"".join(_slice(3000, 30 + i) for i in range(10))
        for start in range(0, len(pcm), 4096):
            g.observe(pcm[start : start + 4096])
        self.assertAlmostEqual(g.speech_rms(pcm), 3000, delta=60)
        self.assertEqual(g.speech_rms(b"".join(_slice(ROOM_RMS, i) for i in range(20))), 0.0)


if __name__ == "__main__":
    unittest.main()
