import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import keep_awake  # noqa: E402


class _FakeClock:
    def __init__(self):
        self.t = 0.0
        self.slept: list[float] = []

    def now(self) -> float:
        return self.t

    def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.t += seconds


class KeepAwakeHoldTests(unittest.TestCase):
    def test_holds_for_the_hours_then_releases(self):
        calls: list[int] = []
        clock = _FakeClock()
        ok = keep_awake.hold(
            0.5, set_state=lambda f: calls.append(f) or 1, sleep=clock.sleep, now=clock.now
        )
        self.assertTrue(ok)
        self.assertEqual(calls, [0x80000001, 0x80000000])
        self.assertAlmostEqual(clock.t, 1800.0)
        self.assertLessEqual(max(clock.slept), 60.0)

    def test_releases_even_when_stopped_early(self):
        calls: list[int] = []

        def stop(_seconds: float) -> None:
            raise KeyboardInterrupt

        with self.assertRaises(KeyboardInterrupt):
            keep_awake.hold(8, set_state=lambda f: calls.append(f) or 1, sleep=stop, now=lambda: 0.0)
        self.assertEqual(calls[-1], 0x80000000)

    def test_a_refused_hold_reports_false_and_never_waits(self):
        clock = _FakeClock()
        ok = keep_awake.hold(8, set_state=lambda f: 0, sleep=clock.sleep, now=clock.now)
        self.assertFalse(ok)
        self.assertEqual(clock.slept, [])

    def test_hours_are_kept_between_six_minutes_and_a_day(self):
        self.assertEqual(keep_awake.clamp_hours(0), 0.1)
        self.assertEqual(keep_awake.clamp_hours(100), 24.0)
        self.assertEqual(keep_awake.clamp_hours(3), 3.0)


if __name__ == "__main__":
    unittest.main()
