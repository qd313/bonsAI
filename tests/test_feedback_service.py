import os
import tempfile
import unittest

from backend.answer.feedback_service import append_ask_feedback, feedback_log_path


class FeedbackServiceTests(unittest.TestCase):
    def test_append_chip_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = append_ask_feedback(
                tmp,
                request_id=7,
                rating="down",
                question_len=12,
                success=True,
                chip_id="too_long",
            )
            self.assertTrue(result.get("ok"))
            path = feedback_log_path(tmp)
            self.assertTrue(os.path.isfile(path))
            line = open(path, encoding="utf-8").read().strip()
            self.assertIn('"chip_id":"too_long"', line)

    def test_append_unfenced_spoiler_chip_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = append_ask_feedback(
                tmp,
                request_id=9,
                rating="down",
                question_len=20,
                success=True,
                chip_id="unfenced_spoiler",
            )
            self.assertTrue(result.get("ok"))
            path = feedback_log_path(tmp)
            line = open(path, encoding="utf-8").read().strip()
            self.assertIn('"chip_id":"unfenced_spoiler"', line)

    def test_append_the_three_note_reasons(self):
        """Plan 98 lane C: the three reasons Not really adds when a note was used."""
        for chip in ("wrong_tip", "outdated", "wrong_edition"):
            with tempfile.TemporaryDirectory() as tmp:
                result = append_ask_feedback(
                    tmp, request_id=3, rating="down", question_len=9, success=True, chip_id=chip
                )
                self.assertTrue(result.get("ok"), chip)
                line = open(feedback_log_path(tmp), encoding="utf-8").read().strip()
                self.assertIn(f'"chip_id":"{chip}"', line)

    def test_rejects_invalid_chip_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = append_ask_feedback(
                tmp,
                request_id=1,
                rating="down",
                question_len=1,
                success=True,
                chip_id="not_a_chip",
            )
            self.assertFalse(result.get("ok"))


if __name__ == "__main__":
    unittest.main()
