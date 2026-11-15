"""The two helpers moved out of ollama_ask_service.py keep their old behaviour."""
from __future__ import annotations

import unittest

from backend.ask.ollama_attempt_outcome import body_looks_out_of_memory, strip_ollama_http_body


class AttemptOutcomeTests(unittest.TestCase):
    def test_the_body_is_dropped_and_the_original_is_left_alone(self) -> None:
        payload = {"success": False, "body": "raw", "status": 500}
        self.assertEqual(strip_ollama_http_body(payload), {"success": False, "status": 500})
        self.assertIn("body", payload)

    def test_every_out_of_memory_wording_is_found_in_any_case(self) -> None:
        for text in ("Out Of Memory", "failed to allocate 4 GB", "RESOURCE EXHAUSTED", "CUDA error 2", "vulkan device lost"):
            self.assertTrue(body_looks_out_of_memory(text), text)

    def test_other_failures_are_not_out_of_memory(self) -> None:
        for text in ("", "model not found", "connection refused"):
            self.assertFalse(body_looks_out_of_memory(text), text)


if __name__ == "__main__":
    unittest.main()
