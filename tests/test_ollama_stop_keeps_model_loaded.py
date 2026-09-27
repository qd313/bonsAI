"""Stop must stop the answer but leave the model loaded, so the next question starts warm.

The maintainer's call of 2026-09-26: Stop no longer unloads the model. Closing the live
connection is what ends the answer (Ollama cancels a request whose client has gone away). The old
unload chain -- the network unload, `ollama stop`, and ending runner processes -- is kept only as
a safety net for one case: on the Deck's own Ollama, the AI worker is still busy long after Stop
and no newer question has started. These tests pin both halves: the normal Stop touches nothing on
the server, and the safety net fires only when the worker really will not let go.
"""

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import ollama_stop_service as svc  # noqa: E402
from main import Plugin  # noqa: E402

LOCAL = "127.0.0.1"
REMOTE = "192.168.1.50"
MODEL = "qwen2.5:7b"


class QuietLogger:
    def __init__(self):
        self.lines = []

    def _rec(self, *args, **_kwargs):
        self.lines.append(args)

    info = warning = debug = exception = _rec


class ServerSideSpies:
    """Patch every way the stop chain could touch the AI server or its processes.

    The three named helpers are the unload chain itself; `urlopen`, `subprocess.run` and `os.kill`
    are belts under them, so a path that skipped the helpers would still be caught.
    """

    def __enter__(self):
        self._patches = [
            mock.patch.object(svc, "request_ollama_stop_model_via_api"),
            mock.patch.object(svc, "try_ollama_cli_stop_model"),
            mock.patch.object(svc, "try_sigterm_linux_ollama_runner_procs", return_value=0),
            mock.patch.object(svc.urllib.request, "urlopen"),
            mock.patch.object(svc.subprocess, "run"),
            mock.patch.object(svc.os, "kill", create=True),
        ]
        (
            self.api_unload,
            self.cli_stop,
            self.sigterm,
            self.urlopen,
            self.run,
            self.kill,
        ) = [p.start() for p in self._patches]
        return self

    def __exit__(self, *exc):
        for p in reversed(self._patches):
            p.stop()
        return False

    def assert_nothing_touched(self, case):
        case.assertFalse(self.api_unload.called, "sent an unload request to Ollama")
        case.assertFalse(self.cli_stop.called, "ran `ollama stop`")
        case.assertFalse(self.sigterm.called, "tried to end AI worker processes")
        case.assertFalse(self.urlopen.called, "made a network call to Ollama")
        case.assertFalse(self.run.called, "ran a program")
        case.assertFalse(self.kill.called, "killed a process")

    def assert_unload_chain_ran(self, case):
        self.api_unload.assert_called_once()
        self.cli_stop.assert_called_once()
        self.sigterm.assert_called_once()


def _stop(pc_ip, *, cpu=None, newer=lambda: False, model=MODEL):
    """Run the stop chain with a fake clock and a scripted worker-CPU reading.

    `cpu` is a list of readings (cores in use) handed out one per sample, or None for "cannot
    measure on this platform". Returns (outcome, sampler mock, logger).
    """
    readings = list(cpu) if cpu is not None else None

    def sampler(_window):
        if readings is None:
            return None
        return readings.pop(0) if len(readings) > 1 else readings[0]

    sampler_mock = mock.Mock(side_effect=sampler)
    log = QuietLogger()
    outcome = svc.best_effort_abort_ollama_inference(
        pc_ip_field=pc_ip,
        model_name=model,
        logger=log,
        newer_request_started=newer,
        sample_runner_cpu_cores=sampler_mock,
        sleep=lambda _s: None,
    )
    return outcome, sampler_mock, log


class NormalStopLeavesModelLoaded(unittest.TestCase):
    def test_local_stop_with_an_idle_worker_touches_nothing(self):
        """The everyday case on the Deck: the answer ended when the connection closed."""
        with ServerSideSpies() as spies:
            outcome, sampler, _ = _stop(LOCAL, cpu=[0.0])
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "left_loaded")
        sampler.assert_called()

    def test_local_stop_with_a_worker_that_quiets_down_touches_nothing(self):
        """Stopped mid prompt-reading: busy for a few samples, then idle once the read closes."""
        with ServerSideSpies() as spies:
            outcome, _, _ = _stop(LOCAL, cpu=[1.8, 1.2, 0.9, 0.05])
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "left_loaded")

    def test_remote_stop_touches_nothing(self):
        """A PC running Ollama: closing the connection is the whole stop, nothing is unloaded."""
        with ServerSideSpies() as spies:
            outcome, sampler, _ = _stop(REMOTE, cpu=[2.0])
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "left_loaded_remote")
        sampler.assert_not_called()

    def test_stop_with_no_model_touches_nothing(self):
        with ServerSideSpies() as spies:
            outcome, sampler, _ = _stop(LOCAL, cpu=[2.0], model=None)
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "no_model")
        sampler.assert_not_called()

    def test_cannot_measure_the_worker_leaves_the_model_loaded(self):
        """Off Linux the worker cannot be watched; the safe side is keeping the model."""
        with ServerSideSpies() as spies:
            outcome, _, _ = _stop(LOCAL, cpu=None)
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "cannot_measure")

    def test_a_newer_question_stands_the_watch_down(self):
        """Once the player asks again, a busy worker is doing the new question's work."""
        with ServerSideSpies() as spies:
            outcome, sampler, _ = _stop(LOCAL, cpu=[2.0], newer=lambda: True)
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "newer_request")
        sampler.assert_not_called()

    def test_a_newer_question_during_the_watch_stands_it_down(self):
        calls = {"n": 0}

        def newer():
            calls["n"] += 1
            return calls["n"] > 3

        with ServerSideSpies() as spies:
            outcome, _, _ = _stop(LOCAL, cpu=[2.0], newer=newer)
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "newer_request")


class SafetyNetForAStuckWorker(unittest.TestCase):
    def test_a_worker_busy_for_the_whole_watch_gets_the_old_unload_chain(self):
        """The case the unload was first added for: the answer's work kept running after Stop."""
        with ServerSideSpies() as spies:
            outcome, sampler, log = _stop(LOCAL, cpu=[2.0])
        spies.assert_unload_chain_ran(self)
        self.assertEqual(outcome, "unloaded_stuck_runner")
        expected = int(svc.RUNNER_BUSY_WATCH_SECONDS // svc.RUNNER_SAMPLE_SECONDS)
        self.assertEqual(sampler.call_count, expected)
        self.assertTrue(any("still busy" in str(line[0]) for line in log.lines))

    def test_one_idle_sample_is_enough_to_keep_the_model(self):
        """The net needs the worker busy every time it looks, not just most of the time."""
        busy = [2.0] * 10 + [0.1] + [2.0] * 100
        with ServerSideSpies() as spies:
            outcome, _, _ = _stop(LOCAL, cpu=busy)
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "left_loaded")

    def test_a_worker_just_under_the_busy_line_counts_as_idle(self):
        with ServerSideSpies() as spies:
            outcome, _, _ = _stop(LOCAL, cpu=[svc.RUNNER_BUSY_CORES - 0.01])
        spies.assert_nothing_touched(self)
        self.assertEqual(outcome, "left_loaded")

    def test_the_watch_is_long_enough_for_a_cold_load_and_a_long_prompt(self):
        """Stop during prompt reading keeps the worker busy until its first word; do not unload
        a model that is about to go quiet on its own."""
        self.assertGreaterEqual(svc.RUNNER_BUSY_WATCH_SECONDS, 60)


class RunnerCpuSampler(unittest.TestCase):
    STAT = "1234 (ollama runner) S 1 1234 1234 0 -1 4194560 100 0 0 0 {utime} {stime} 0 0 20 0 8 0"

    def test_reads_user_and_system_ticks_from_proc_stat(self):
        self.assertEqual(svc._cpu_ticks_from_stat_text(self.STAT.format(utime=700, stime=50)), 750)

    def test_a_process_name_with_spaces_and_brackets_still_parses(self):
        text = "99 (weird ) name) R 1 2 3 4 5 6 7 8 9 10 30 12 0 0"
        self.assertEqual(svc._cpu_ticks_from_stat_text(text), 42)

    def test_garbage_reads_as_none(self):
        self.assertIsNone(svc._cpu_ticks_from_stat_text("not a stat line"))

    def test_not_linux_means_cannot_measure(self):
        self.assertIsNone(svc.sample_linux_ollama_runner_cpu_cores(2.0, platform="win32"))

    def test_no_workers_reads_as_idle(self):
        with mock.patch.object(svc, "_linux_ollama_runner_pids", return_value=[]):
            self.assertEqual(
                svc.sample_linux_ollama_runner_cpu_cores(2.0, platform="linux", sleep=lambda _s: None),
                0.0,
            )

    def test_cores_in_use_is_ticks_over_the_window(self):
        ticks = {11: [1000, 1300], 12: [50, 150]}

        def read(pid):
            return ticks[pid].pop(0)

        with mock.patch.object(svc, "_linux_ollama_runner_pids", return_value=[11, 12]), mock.patch.object(
            svc, "_proc_cpu_ticks", side_effect=read
        ), mock.patch.object(svc, "_clock_ticks_per_second", return_value=100):
            cores = svc.sample_linux_ollama_runner_cpu_cores(2.0, platform="linux", sleep=lambda _s: None)
        # 400 ticks at 100 per second over a 2-second window = 2 cores.
        self.assertAlmostEqual(cores, 2.0)


class StopButtonWiring(unittest.IsolatedAsyncioTestCase):
    async def test_stop_tells_the_watch_how_to_spot_a_newer_question(self):
        plugin = Plugin()
        plugin._chat_resp_ready_evt = svc.threading.Event()
        plugin._chat_resp_ready_evt.set()
        plugin._active_ollama_chat_pc_ip = LOCAL
        plugin._active_ollama_chat_model = MODEL
        captured = {}

        def fake_spawn(pc_ip, model, logger, **kwargs):
            captured.update(pc_ip=pc_ip, model=model, **kwargs)

        with mock.patch("main.spawn_ollama_stop_thread", side_effect=fake_spawn):
            await plugin.abort_background_game_ai()

        self.assertEqual((captured["pc_ip"], captured["model"]), (LOCAL, MODEL))
        newer = captured["newer_request_started"]
        self.assertFalse(newer(), "the stopped question itself must not count as a newer one")
        plugin._chat_resp_ready_evt = svc.threading.Event()  # what every new model call does
        self.assertTrue(newer())


if __name__ == "__main__":
    unittest.main()
