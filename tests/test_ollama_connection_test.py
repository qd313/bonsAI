"""Title: Ollama connection test decisions

Purpose: Check every answer the Test connection button can give.
Used for: The decision lifted out of main.py on 2026-09-14, which had no test before.
Solves: Each outcome a person can actually hit -- no address typed, host does not
        answer, not installed on this Deck, started it and it worked, started it and it
        still failed -- asserted without a running Ollama.
Does not: Test the network probe itself. The probe is handed in, so what is checked here
          is the decision made around it.
"""

import asyncio
import unittest

from backend.services.ollama_connection_test import (
    COULD_NOT_START_ERROR,
    NOT_INSTALLED_ERROR,
    NO_IP_ERROR,
    STARTED_BUT_STILL_FAILING_ERROR,
    UNREACHABLE_ERROR,
    ConnectionTestTools,
    clamp_timeout_seconds,
    run_ollama_connection_test,
    summarize_for_log,
)

ANSWERS = {"version": "0.5.1", "models": ["a", "b"], "ps_loaded": ["a"]}


def tools(
    *,
    probe_results=None,
    loopback=False,
    installed=True,
    start_succeeds=True,
    start_raises=False,
):
    """Build a set of fakes. `probe_results` is one entry per probe call.

    An entry that is an exception is raised; anything else is returned.
    """
    calls = {"probe": 0, "start": 0}
    queue = list(probe_results or [])

    def probe(_base, _deadline):
        calls["probe"] += 1
        outcome = queue.pop(0) if queue else ANSWERS
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def start_it(_log):
        calls["start"] += 1
        if start_raises:
            raise OSError("could not start")
        return start_succeeds

    return (
        ConnectionTestTools(
            probe=probe,
            is_loopback=lambda _host: loopback,
            installed_here=lambda: installed,
            start_it=start_it,
            normalize=lambda raw: ("host", 11434, f"http://{raw}:11434"),
        ),
        calls,
    )


def run(pc_ip="192.168.1.5", timeout_seconds=10, **kwargs):
    kit, calls = tools(**kwargs)
    outcome = asyncio.run(run_ollama_connection_test(pc_ip, timeout_seconds, kit))
    return outcome, calls


class ConnectionTestDecisionTests(unittest.TestCase):
    def test_no_address_typed_says_so_without_probing(self):
        outcome, calls = run(pc_ip="   ")
        self.assertFalse(outcome.result["reachable"])
        self.assertEqual(outcome.result["error"], NO_IP_ERROR)
        self.assertEqual(calls["probe"], 0)

    def test_a_host_that_answers_is_reachable(self):
        outcome, calls = run()
        self.assertTrue(outcome.result["reachable"])
        self.assertEqual(outcome.result["version"], "0.5.1")
        self.assertEqual(outcome.result["models"], ["a", "b"])
        self.assertEqual(calls["probe"], 1)
        self.assertNotIn("recovery_attempted", outcome.result)

    def test_a_host_on_the_network_is_never_restarted(self):
        """Nothing here could start Ollama on someone else's machine, so do not try."""
        outcome, calls = run(probe_results=[OSError("refused")], loopback=False)
        self.assertFalse(outcome.result["reachable"])
        self.assertEqual(outcome.result["error"], UNREACHABLE_ERROR)
        self.assertEqual(calls["start"], 0)
        self.assertEqual(calls["probe"], 1)

    def test_not_installed_on_this_deck_says_install_it(self):
        outcome, calls = run(probe_results=[OSError("refused")], loopback=True, installed=False)
        self.assertEqual(outcome.result["error"], NOT_INSTALLED_ERROR)
        self.assertEqual(calls["start"], 0)

    def test_starting_it_and_succeeding_reports_reachable_and_says_it_recovered(self):
        outcome, calls = run(
            probe_results=[OSError("not up yet"), ANSWERS], loopback=True, installed=True
        )
        self.assertTrue(outcome.result["reachable"])
        self.assertTrue(outcome.result["recovery_attempted"])
        self.assertTrue(outcome.result["recovery_succeeded_before_retry"])
        self.assertEqual(calls["start"], 1)
        self.assertEqual(calls["probe"], 2)

    def test_starting_it_and_failing_says_it_could_not_start(self):
        outcome, _calls = run(
            probe_results=[OSError("not up yet")],
            loopback=True,
            installed=True,
            start_succeeds=False,
        )
        self.assertFalse(outcome.result["reachable"])
        self.assertEqual(outcome.result["error"], COULD_NOT_START_ERROR)
        self.assertFalse(outcome.result["recovery_succeeded_before_retry"])

    def test_a_start_that_raises_counts_as_a_failed_start(self):
        outcome, _calls = run(
            probe_results=[OSError("not up yet")],
            loopback=True,
            installed=True,
            start_raises=True,
        )
        self.assertEqual(outcome.result["error"], COULD_NOT_START_ERROR)

    def test_started_but_still_not_answering_says_that_exactly(self):
        outcome, calls = run(
            probe_results=[OSError("not up yet"), OSError("still not up")],
            loopback=True,
            installed=True,
        )
        self.assertEqual(outcome.result["error"], STARTED_BUT_STILL_FAILING_ERROR)
        self.assertTrue(outcome.result["recovery_succeeded_before_retry"])
        self.assertEqual(calls["probe"], 2)

    def test_answering_but_uninstalled_here_still_says_install_it(self):
        """A stray listener on the loopback address is not our Ollama."""
        outcome, _calls = run(loopback=True, installed=False)
        self.assertEqual(outcome.result["error"], NOT_INSTALLED_ERROR)
        self.assertFalse(outcome.result["reachable"])


class TimeoutAndLogFieldTests(unittest.TestCase):
    def test_timeout_is_clamped_and_zero_means_five(self):
        self.assertEqual(clamp_timeout_seconds(0), 5)
        self.assertEqual(clamp_timeout_seconds(None), 5)
        self.assertEqual(clamp_timeout_seconds(-4), 1)
        self.assertEqual(clamp_timeout_seconds(9999), 120)
        self.assertEqual(clamp_timeout_seconds(30), 30)

    def test_the_clamped_timeout_and_trimmed_host_come_back_for_the_log(self):
        outcome, _calls = run(pc_ip="  192.168.1.5  ", timeout_seconds=9999)
        self.assertEqual(outcome.host, "192.168.1.5")
        self.assertEqual(outcome.timeout_seconds, 120)

    def test_log_summary_counts_models_when_reachable(self):
        fields = summarize_for_log({"reachable": True, "version": "1.2", "models": ["a", "b", "c"]})
        self.assertEqual(fields["model_count"], 3)
        self.assertEqual(fields["version"], "1.2")
        self.assertNotIn("error", fields)

    def test_log_summary_trims_a_very_long_error(self):
        fields = summarize_for_log({"reachable": False, "error": "x" * 400})
        self.assertEqual(len(fields["error"]), 160)
        self.assertNotIn("model_count", fields)


if __name__ == "__main__":
    unittest.main()
