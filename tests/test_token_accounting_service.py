import json
import unittest
from unittest.mock import MagicMock, patch

from backend.services.token_accounting_service import (
    ESTIMATE_SAFETY_MARGIN,
    FALLBACK_CHARS_PER_TOKEN,
    FALLBACK_WINDOW_TOKENS,
    MIN_SAMPLE_TOKENS,
    SAMPLES_KEPT_PER_MODEL,
    chars_per_token,
    estimate_tokens_from_chars,
    known_window_tokens,
    note_real_counts,
    reset_token_accounting,
    resolve_window_tokens,
    tokens_that_survive_overflow,
)

BASE = "http://127.0.0.1:11434"
MODEL = "gemma4:e2b-it-qat"


def _ps_response(payload: dict) -> MagicMock:
    """A stand-in for what urlopen hands back for GET /api/ps."""
    rsp = MagicMock()
    rsp.read.return_value = json.dumps(payload).encode("utf-8")
    rsp.__enter__ = lambda self: self
    rsp.__exit__ = lambda self, *_: None
    return rsp


class WindowLookupTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def tearDown(self) -> None:
        reset_token_accounting()

    def test_nothing_known_means_the_old_assumption_and_no_network_call(self):
        """The ordinary path must never wait on a round trip to be better informed."""
        with patch("backend.services.token_accounting_service.urllib.request.urlopen") as op:
            self.assertEqual(known_window_tokens(BASE, MODEL), FALLBACK_WINDOW_TOKENS)
            op.assert_not_called()

    def test_asking_reads_the_real_window_and_remembers_it(self):
        """Measured on the Deck 2026-09-20: /api/ps reports the room the model is loaded with,
        which is the truth about right now. The model's own advertised 131,072 is not."""
        payload = {"models": [{"name": MODEL, "context_length": 16384}]}
        with patch(
            "backend.services.token_accounting_service.urllib.request.urlopen",
            return_value=_ps_response(payload),
        ) as op:
            self.assertEqual(resolve_window_tokens(BASE, MODEL), 16384)
            self.assertEqual(op.call_count, 1)
        # Remembered, so a second ask costs nothing, and the cheap reader now knows it too.
        with patch("backend.services.token_accounting_service.urllib.request.urlopen") as op:
            self.assertEqual(resolve_window_tokens(BASE, MODEL), 16384)
            self.assertEqual(known_window_tokens(BASE, MODEL), 16384)
            op.assert_not_called()

    def test_a_model_listed_under_a_slightly_different_tag_is_still_found(self):
        """The server lists the tag exactly as it was pulled; a caller may have dropped a
        ":latest" the server kept. Missing a model that is sitting right there in memory would
        silently put every reply back on the 4,096 assumption."""
        payload = {"models": [{"name": "llama3:latest", "context_length": 8192}]}
        with patch(
            "backend.services.token_accounting_service.urllib.request.urlopen",
            return_value=_ps_response(payload),
        ):
            self.assertEqual(resolve_window_tokens(BASE, "llama3"), 8192)

    def test_a_server_that_cannot_be_reached_falls_back_rather_than_raising(self):
        """A question must still go out when this cannot be answered. Being wrong low costs
        reply length; raising here would cost the whole Ask."""
        with patch(
            "backend.services.token_accounting_service.urllib.request.urlopen",
            side_effect=OSError("no route to host"),
        ):
            self.assertEqual(resolve_window_tokens(BASE, MODEL), FALLBACK_WINDOW_TOKENS)

    def test_a_model_not_in_memory_yet_leaves_the_fallback_standing(self):
        payload = {"models": [{"name": "something-else", "context_length": 32768}]}
        with patch(
            "backend.services.token_accounting_service.urllib.request.urlopen",
            return_value=_ps_response(payload),
        ):
            self.assertEqual(resolve_window_tokens(BASE, MODEL), FALLBACK_WINDOW_TOKENS)
        # And nothing wrong was remembered, so the next ask tries again.
        self.assertEqual(known_window_tokens(BASE, MODEL), FALLBACK_WINDOW_TOKENS)

    def test_an_older_server_that_reports_no_window_is_not_believed(self):
        payload = {"models": [{"name": MODEL}]}
        with patch(
            "backend.services.token_accounting_service.urllib.request.urlopen",
            return_value=_ps_response(payload),
        ):
            self.assertEqual(resolve_window_tokens(BASE, MODEL), FALLBACK_WINDOW_TOKENS)


class LearningTheRealSizeTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_token_accounting()

    def tearDown(self) -> None:
        reset_token_accounting()

    def test_the_first_question_of_a_session_is_sized_exactly_as_it_always_was(self):
        """Until something has been learned, nothing changes. The 3.5 fallback is already
        pessimistic by about a quarter, and padding it again would make the first question of
        every session worse than it is today."""
        self.assertEqual(estimate_tokens_from_chars(3500), 1000)
        self.assertEqual(chars_per_token(MODEL), FALLBACK_CHARS_PER_TOKEN)

    def test_the_guess_moves_towards_the_truth_once_a_reply_has_been_seen(self):
        """The real numbers, measured on the Deck 2026-09-20 for an Expert question with the
        game's cards attached: 12,710 characters of prompt were really 2,903 tokens. The old
        guess called that 3,631 -- a quarter too big, and the plugin takes an over-count
        straight out of the visible reply."""
        old_guess = estimate_tokens_from_chars(12710, MODEL)
        self.assertEqual(old_guess, 3632)  # 3,631 before rounding up replaced rounding down
        for _ in range(3):
            note_real_counts(MODEL, 12710, 2903)
        new_guess = estimate_tokens_from_chars(12710, MODEL)
        self.assertLess(new_guess, old_guess)
        self.assertGreater(new_guess, 2903)  # still padded, never optimistic
        self.assertLess(new_guess - 2903, old_guess - 2903)

    def test_the_guess_is_never_lower_than_the_truth_it_learned_from(self):
        """Next to a cliff the estimate must lean high. Going one token over costs half of
        everything sent, so a guess that lands under the real figure is the dangerous error."""
        for chars, real in ((12710, 2903), (11106, 2508), (4924, 1098)):
            reset_token_accounting()
            for _ in range(5):
                note_real_counts(MODEL, chars, real)
            self.assertGreaterEqual(estimate_tokens_from_chars(chars, MODEL), real)

    def test_a_reply_carrying_images_is_never_learned_from(self):
        """Image tokens have no characters behind them, so one such sample would make every
        later question look far bigger than it is -- and shorten every reply to match.

        The numbers here are deliberately ordinary -- 12,710 characters and 2,903 tokens, the
        real Deck figures -- so that the image flag is the ONLY thing rejecting this sample.
        Written with a wildly out-of-range sample first, which proved nothing: the range check
        was throwing it out and the image check could be deleted with every test still green."""
        note_real_counts(MODEL, 12710, 2903, had_images=True)
        self.assertEqual(chars_per_token(MODEL), FALLBACK_CHARS_PER_TOKEN)

    def test_a_wildly_out_of_range_sample_is_ignored_and_said_so(self):
        logger = MagicMock()
        note_real_counts(MODEL, 800, 4000, logger=logger)  # 0.2 characters per token
        self.assertEqual(chars_per_token(MODEL), FALLBACK_CHARS_PER_TOKEN)
        self.assertTrue(logger.info.called)

    def test_a_short_exchange_is_not_learned_from(self):
        """The fixed chat-template wrapper -- 15 tokens on the Deck's model -- is a big enough
        share of a short exchange to drag the figure.

        870 characters over 199 tokens is 4.37, a perfectly ordinary ratio, so the only thing
        rejecting this sample is its size. An earlier version used 400 characters, whose ratio
        was out of range: the size check could be deleted and every test stayed green."""
        note_real_counts(MODEL, 870, MIN_SAMPLE_TOKENS - 1)
        self.assertEqual(chars_per_token(MODEL), FALLBACK_CHARS_PER_TOKEN)
        # One token more and the same shape of sample IS learned from.
        note_real_counts(MODEL, 874, MIN_SAMPLE_TOKENS)
        self.assertNotEqual(chars_per_token(MODEL), FALLBACK_CHARS_PER_TOKEN)

    def test_one_odd_reply_does_not_drag_the_figure(self):
        """The middle value, not the average, is what the next questions are sized by."""
        for _ in range(9):
            note_real_counts(MODEL, 12710, 2903)  # 4.38 characters per token
        note_real_counts(MODEL, 12710, 5000)  # one outlier at 2.54
        self.assertAlmostEqual(chars_per_token(MODEL), 12710 / 2903, places=2)

    def test_only_the_last_twenty_replies_are_remembered(self):
        for _ in range(SAMPLES_KEPT_PER_MODEL + 10):
            note_real_counts(MODEL, 12710, 2903)
        for _ in range(SAMPLES_KEPT_PER_MODEL):
            note_real_counts(MODEL, 10000, 2000)  # 5.0 characters per token
        self.assertAlmostEqual(chars_per_token(MODEL), 5.0, places=2)

    def test_what_is_learned_about_one_model_says_nothing_about_another(self):
        note_real_counts(MODEL, 10000, 2000)
        self.assertEqual(chars_per_token("some-other-model"), FALLBACK_CHARS_PER_TOKEN)


class OverflowCliffTests(unittest.TestCase):
    def test_going_over_costs_about_half_of_everything(self):
        """Measured on the Deck 2026-09-20 against a 4,096-token window: sending 4,220 tokens
        delivered 2,051 of them, and sending 19,620 delivered the same 2,051. There is no gentle
        slope here. This number exists so the code can say that out loud in a warning."""
        self.assertEqual(tokens_that_survive_overflow(4096), 2048)
        self.assertEqual(tokens_that_survive_overflow(16384), 8192)
        self.assertEqual(tokens_that_survive_overflow(0), 0)


class SafetyMarginTests(unittest.TestCase):
    def test_the_margin_is_a_pad_not_a_discount(self):
        """A margin below 1 would make every estimate optimistic, which next to a cliff is the
        one direction that loses a person their rules and their game cards."""
        self.assertGreater(ESTIMATE_SAFETY_MARGIN, 1.0)


if __name__ == "__main__":
    unittest.main()
