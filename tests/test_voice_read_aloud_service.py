"""Tests for the read-aloud service (py_modules/backend/services/voice_read_aloud_service.py).

Covers sentence splitting in isolation, the make-ahead-of-play pipeline with a fake maker and a
fake player (no real subprocesses — no espeak-ng, no pw-play/paplay is invoked), stop mid-reading,
status transitions, start-while-speaking, missing-engine failure, and that the session env the
microphone code discovers is the one handed to the player.
"""

import os
import shutil
import tempfile
import threading
import time
import unittest
from typing import Optional
from unittest import mock

from backend.services import voice_read_aloud_service as ra
from backend.services.voice_read_aloud_service import (

    SessionAudioPlayer,
    VoiceReadAloudService,
    split_into_sentences,
)


# Slack for comparing two timestamps taken on different threads (see the read-ahead test).
THREAD_CLOCK_SLACK_S = 0.005


# --- Sentence splitting ---


class SplitIntoSentencesTests(unittest.TestCase):
    def test_splits_on_full_stops(self):
        self.assertEqual(
            split_into_sentences("One thing. Another thing."),
            ["One thing.", "Another thing."],
        )

    def test_splits_on_question_and_exclamation_marks(self):
        self.assertEqual(
            split_into_sentences("Really? Yes! Sure."),
            ["Really?", "Yes!", "Sure."],
        )

    def test_splits_on_line_breaks(self):
        self.assertEqual(
            split_into_sentences("First line\nSecond line"),
            ["First line", "Second line"],
        )

    def test_does_not_split_on_a_decimal(self):
        self.assertEqual(
            split_into_sentences("It costs 2.5 gold. Buy it now."),
            ["It costs 2.5 gold.", "Buy it now."],
        )

    def test_does_not_split_on_common_abbreviations(self):
        cases = [
            ("Bring potions, e.g. health ones, before the fight.", 1),
            ("Use a shield, i.e. block, to survive.", 1),
            ("Faster vs. slower builds both work.", 1),
            ("Ask Mr. Smith about the quest.", 1),
            ("Dr. Jones knows the answer.", 1),
            ("Meet me on St. James street.", 1),
        ]
        for text, expected_count in cases:
            with self.subTest(text=text):
                self.assertEqual(len(split_into_sentences(text)), expected_count)

    def test_does_not_split_on_a_single_trailing_initial(self):
        self.assertEqual(
            split_into_sentences("J. K. Rowling wrote it. It is good."),
            ["J. K. Rowling wrote it.", "It is good."],
        )

    def test_drops_empty_pieces(self):
        self.assertEqual(
            split_into_sentences("One.   \n\n  Two."),
            ["One.", "Two."],
        )

    def test_collapses_runs_of_whitespace(self):
        self.assertEqual(
            split_into_sentences("One    thing   here."),
            ["One thing here."],
        )

    def test_empty_text_returns_no_sentences(self):
        self.assertEqual(split_into_sentences(""), [])
        self.assertEqual(split_into_sentences("   "), [])

    def test_long_sentence_is_split_at_a_comma(self):
        long_sentence = (
            "This is a very long sentence that keeps going and going, "
            + ("padding words here " * 15)
            + "and finally it ends."
        )
        self.assertGreater(len(long_sentence), 300)
        pieces = split_into_sentences(long_sentence)
        self.assertGreater(len(pieces), 1)
        # No piece should still be far over the limit after splitting.
        for piece in pieces:
            self.assertLessEqual(len(piece), 320)

    def test_short_sentence_is_not_split(self):
        self.assertEqual(split_into_sentences("Short one."), ["Short one."])


# --- Fakes for the pipeline tests ---


class FakeMaker:
    """Records call order/timing; writes a real (tiny) file so deletion can be checked."""

    def __init__(self, tmp_root: str, delay: float = 0.0, fail_on: Optional[str] = None):
        self.tmp_root = tmp_root
        self.delay = delay
        self.fail_on = fail_on
        self.calls: list[str] = []
        self.starts: list[float] = []
        self.made_paths: list[str] = []
        self._n = 0

    def make(self, sentence: str) -> str:
        self.starts.append(time.monotonic())
        self.calls.append(sentence)
        if self.fail_on is not None and sentence == self.fail_on:
            raise RuntimeError("could not make that sentence")
        if self.delay:
            time.sleep(self.delay)
        self._n += 1
        path = os.path.join(self.tmp_root, f"fake_{self._n}.wav")
        with open(path, "w", encoding="utf-8") as f:
            f.write("fake wav")
        self.made_paths.append(path)
        return path


class FakePlayer:
    """Blocks in ``play`` until ``stop`` is called or ``auto_finish_delay`` elapses."""

    def __init__(self, auto_finish_delay: Optional[float] = 0.02):
        self.played: list[str] = []
        self.play_starts: list[float] = []
        self.play_ends: list[float] = []
        self.stop_calls = 0
        self.auto_finish_delay = auto_finish_delay
        self._unblock = threading.Event()
        self._fail = False

    def fail_next(self) -> None:
        self._fail = True

    def play(self, path: str) -> None:
        self.play_starts.append(time.monotonic())
        self.played.append(path)
        if self._fail:
            self._fail = False
            raise RuntimeError("could not play that file")
        self._unblock.clear()
        timer = None
        if self.auto_finish_delay is not None:
            timer = threading.Timer(self.auto_finish_delay, self._unblock.set)
            timer.daemon = True
            timer.start()
        self._unblock.wait(timeout=5)
        if timer is not None:
            timer.cancel()
        self.play_ends.append(time.monotonic())

    def stop(self) -> None:
        self.stop_calls += 1
        self._unblock.set()


def _wait_until(predicate, timeout: float = 5.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.01)
    return predicate()


class VoiceReadAloudServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="bonsai_read_aloud_test_")
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        # The dev/CI machine has neither espeak-ng nor pw-play/paplay installed, so the real
        # availability checks (shutil.which) would always say no. Fake them present by default;
        # individual tests override one back to False to test the missing-engine paths.
        espeak_patcher = mock.patch.object(ra, "espeak_available", return_value=True)
        player_patcher = mock.patch.object(ra, "player_available", return_value=True)
        espeak_patcher.start()
        player_patcher.start()
        self.addCleanup(espeak_patcher.stop)
        self.addCleanup(player_patcher.stop)

    def _service(self, maker=None, player=None) -> VoiceReadAloudService:
        maker = maker or FakeMaker(self.tmp_dir)
        player = player or FakePlayer()
        return VoiceReadAloudService(self.tmp_dir, maker=maker, player=player), maker, player

    def test_status_starts_idle(self):
        service, _maker, _player = self._service()
        status = service.status()
        self.assertEqual(status["state"], "idle")
        self.assertEqual(status["sentence_count"], 0)
        self.assertIsNone(status["error"])
        self.assertIsNone(status["started_at"])

    def test_start_reports_ok_and_the_sentence_count(self):
        service, _maker, _player = self._service()
        result = service.start("One thing. Another thing.")
        self.assertEqual(result, {"ok": True, "sentence_count": 2, "error": None})
        service.stop()

    def test_empty_text_is_not_read(self):
        service, maker, _player = self._service()
        result = service.start("   ")
        self.assertEqual(result["ok"], False)
        self.assertEqual(result["error"], "Nothing to read.")
        self.assertEqual(maker.calls, [])

    def test_plays_sentences_in_order(self):
        maker = FakeMaker(self.tmp_dir, delay=0.01)
        player = FakePlayer(auto_finish_delay=0.02)
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second. Third.")
        self.assertTrue(_wait_until(lambda: service.status()["state"] == "done"))

        self.assertEqual(maker.calls, ["First.", "Second.", "Third."])
        self.assertEqual(len(player.played), 3)
        # Played files correspond, in order, to what the maker produced.
        self.assertEqual(player.played, maker.made_paths)

    def test_makes_the_next_sentence_while_the_current_one_plays(self):
        maker = FakeMaker(self.tmp_dir, delay=0.01)
        player = FakePlayer(auto_finish_delay=0.15)
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second. Third.")
        self.assertTrue(_wait_until(lambda: service.status()["state"] == "done"))

        # Sentence 2 ("Second.") is made while sentence 1 ("First.") is still playing.
        self.assertGreaterEqual(len(maker.starts), 2)
        self.assertGreaterEqual(len(player.play_starts), 1)
        self.assertGreater(len(player.play_ends), 0)
        self.assertLess(maker.starts[1], player.play_ends[0])
        # Two threads and one clock: "started after" can read a few microseconds early
        # when the timestamps are taken either side of a thread hand-off. The build
        # server saw 49 microseconds of it. The point of the check is the ordering, so
        # allow a slack far smaller than any real overlap and far larger than clock noise.
        self.assertGreaterEqual(maker.starts[1], player.play_starts[0] - THREAD_CLOCK_SLACK_S)

    def test_status_transitions_idle_speaking_done(self):
        maker = FakeMaker(self.tmp_dir, delay=0.0)
        player = FakePlayer(auto_finish_delay=0.05)
        service, maker, player = self._service(maker=maker, player=player)

        self.assertEqual(service.status()["state"], "idle")
        service.start("Only one sentence.")
        self.assertTrue(_wait_until(lambda: service.status()["state"] in ("speaking", "done")))
        self.assertTrue(_wait_until(lambda: service.status()["state"] == "done"))
        status = service.status()
        self.assertEqual(status["sentence_index"], 0)
        self.assertEqual(status["sentence_count"], 1)

    def test_stop_mid_reading_ends_playback_and_deletes_temp_files(self):
        maker = FakeMaker(self.tmp_dir, delay=0.0)
        player = FakePlayer(auto_finish_delay=None)  # blocks until stop() is called
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second. Third. Fourth.")
        self.assertTrue(_wait_until(lambda: len(player.played) >= 1))
        stop_calls_before = player.stop_calls

        result = service.stop()

        self.assertEqual(result, {"ok": True, "stopped": True})
        # start() itself calls stop() once up front (to end any previous reading), so only the
        # delta from this explicit stop() call is what we're checking here.
        self.assertEqual(player.stop_calls - stop_calls_before, 1)
        status = service.status()
        self.assertEqual(status["state"], "idle")
        self.assertEqual(status["sentence_count"], 0)
        # Fewer than all four sentences were played; the reading was actually interrupted.
        self.assertLess(len(player.played), 4)
        # Every temp file the maker made has been cleaned up.
        for path in maker.made_paths:
            self.assertFalse(os.path.exists(path), f"{path} was not deleted")

    def test_stop_is_safe_when_nothing_is_playing(self):
        service, _maker, _player = self._service()
        result = service.stop()
        self.assertEqual(result, {"ok": True, "stopped": False})
        result_again = service.stop()
        self.assertEqual(result_again, {"ok": True, "stopped": False})

    def test_start_while_speaking_stops_the_first_reading(self):
        maker = FakeMaker(self.tmp_dir, delay=0.0)
        player = FakePlayer(auto_finish_delay=None)  # blocks until stop() is called
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second.")
        self.assertTrue(_wait_until(lambda: len(player.played) >= 1))

        result = service.start("A brand new answer.")

        self.assertEqual(result, {"ok": True, "sentence_count": 1, "error": None})
        self.assertGreaterEqual(player.stop_calls, 1)
        service.stop()

    def test_maker_failure_sets_error_state(self):
        maker = FakeMaker(self.tmp_dir, fail_on="Second.")
        player = FakePlayer(auto_finish_delay=0.02)
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second. Third.")
        self.assertTrue(_wait_until(lambda: service.status()["state"] == "error"))
        status = service.status()
        self.assertIn("could not make", status["error"])

    def test_player_failure_sets_error_state(self):
        maker = FakeMaker(self.tmp_dir)
        player = FakePlayer(auto_finish_delay=0.02)
        player.fail_next()
        service, maker, player = self._service(maker=maker, player=player)

        service.start("First. Second.")
        self.assertTrue(_wait_until(lambda: service.status()["state"] == "error"))
        status = service.status()
        self.assertIn("could not play", status["error"])

    def test_missing_espeak_returns_ok_false_and_error_state(self):
        service, maker, _player = self._service()
        with mock.patch.object(ra, "espeak_available", return_value=False):
            result = service.start("Hello there.")
        self.assertEqual(result["ok"], False)
        self.assertTrue(result["error"])
        self.assertEqual(service.status()["state"], "error")
        self.assertEqual(maker.calls, [])

    def test_missing_player_returns_ok_false_and_error_state(self):
        service, maker, _player = self._service()
        with mock.patch.object(ra, "player_available", return_value=False):
            result = service.start("Hello there.")
        self.assertEqual(result["ok"], False)
        self.assertTrue(result["error"])
        self.assertEqual(service.status()["state"], "error")
        self.assertEqual(maker.calls, [])


# --- SessionAudioPlayer: the session env is passed through to the player process ---


class FakePopenHandle:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self._returncode: Optional[int] = None

    def poll(self):
        return self._returncode

    def wait(self, timeout=None):
        self._returncode = 0
        return self._returncode

    def terminate(self):
        self._returncode = -15


class SessionAudioPlayerTests(unittest.TestCase):
    def test_the_session_env_reaches_the_player_process(self):
        expected_env = {"XDG_RUNTIME_DIR": "/run/user/1000", "PULSE_SERVER": "unix:/tmp/sock"}
        recorded: dict = {}

        def fake_popen(cmd, **kwargs):
            recorded["cmd"] = cmd
            recorded["env"] = kwargs.get("env")
            return FakePopenHandle()

        player = SessionAudioPlayer(env_getter=lambda: expected_env)
        with mock.patch.object(ra, "_resolve_player_binary", return_value="pw-play"), mock.patch.object(
            ra.subprocess, "Popen", side_effect=fake_popen
        ):
            player.play("/tmp/some.wav")

        self.assertEqual(recorded["env"], expected_env)
        self.assertEqual(recorded["cmd"][0], "pw-play")
        self.assertIn("/tmp/some.wav", recorded["cmd"])

    def test_stop_is_safe_when_nothing_is_playing(self):
        player = SessionAudioPlayer(env_getter=lambda: {})
        player.stop()  # must not raise

    def test_play_raises_when_no_player_binary_exists(self):
        player = SessionAudioPlayer(env_getter=lambda: {})
        with mock.patch.object(ra, "_resolve_player_binary", return_value=""):
            with self.assertRaises(RuntimeError):
                player.play("/tmp/some.wav")


if __name__ == "__main__":
    unittest.main()
