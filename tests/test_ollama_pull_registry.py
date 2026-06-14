"""Ollama pull error formatting and registry tag partition."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.services.local_ollama_setup_service import _format_ollama_pull_failure
from backend.services.ollama_catalog_service import partition_pull_tags_by_registry


class OllamaPullFailureFormatTests(unittest.TestCase):
    def test_manifest_missing_hint(self):
        msg = _format_ollama_pull_failure(
            "gemma4:4b",
            1,
            ["Error: pull model manifest: file does not exist"],
        )
        self.assertIn("exit code 1", msg)
        self.assertIn("not on the Ollama library", msg)
        self.assertIn("gemma4:latest", msg)


class PartitionPullTagsTests(unittest.TestCase):
    def test_partition_live_registry(self):
        fake_meta = {
            "source": "live",
            "tags": {
                "gemma4:latest": {"exists": True, "size_bytes": 1000},
                "gemma4:4b": {"exists": False, "size_bytes": None},
            },
        }
        with patch(
            "backend.services.ollama_catalog_service.fetch_catalog_metadata",
            return_value=fake_meta,
        ):
            ok, bad = partition_pull_tags_by_registry(["gemma4:latest", "gemma4:4b"])
        self.assertEqual(ok, ["gemma4:latest"])
        self.assertEqual(bad, ["gemma4:4b"])


if __name__ == "__main__":
    unittest.main()
