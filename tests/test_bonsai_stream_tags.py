"""Tests for ``<bonsai-status>`` stream tag extraction."""

import unittest

from backend.services.bonsai_stream_tags import (
    deterministic_thinking_phase_fallback,
    extract_bonsai_status,
)


class BonsaiStreamTagsTests(unittest.TestCase):
    def test_extract_and_strip(self):
        raw = "<bonsai-status>Checking GPU</bonsai-status>\n\nHello there."
        summary, stripped = extract_bonsai_status(raw)
        self.assertEqual(summary, "Checking GPU")
        self.assertEqual(stripped, "Hello there.")

    def test_no_tag_passthrough(self):
        raw = "Plain answer."
        summary, stripped = extract_bonsai_status(raw)
        self.assertIsNone(summary)
        self.assertEqual(stripped, raw)

    def test_incomplete_tag_hidden_from_visible(self):
        raw = "<bonsai-status>Checking GPU"
        summary, stripped = extract_bonsai_status(raw)
        self.assertIsNone(summary)
        self.assertEqual(stripped, "")

    def test_deterministic_phase_fallback(self):
        self.assertEqual(
            deterministic_thinking_phase_fallback(streaming=True, has_partial=True, elapsed_seconds=0),
            "Drafting reply…",
        )
        self.assertEqual(
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=10),
            "Still working…",
        )
        self.assertEqual(
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=3),
            "Generating…",
        )
        self.assertEqual(
            deterministic_thinking_phase_fallback(streaming=False, has_partial=False, elapsed_seconds=0),
            "Connecting…",
        )


if __name__ == "__main__":
    unittest.main()
