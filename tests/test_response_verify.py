"""Tests for rule-based response verification."""

import unittest

from backend.services.response_verify import (
    _parse_yes_no_verdict,
    verify_ollama_response,
)


class ResponseVerifyTests(unittest.TestCase):
    def test_flags_invented_appid_without_game(self):
        result = verify_ollama_response(
            response_text="Try AppID 1234567 for that title.",
            app_id="",
            app_name="",
        )
        self.assertFalse(result["passed"])
        self.assertTrue(result["warnings"])


    def test_parse_yes_no_verdict(self):
        self.assertFalse(_parse_yes_no_verdict("YES"))
        self.assertTrue(_parse_yes_no_verdict("NO"))
        self.assertIsNone(_parse_yes_no_verdict("maybe"))


if __name__ == "__main__":
    unittest.main()
