"""Tests for living Pull Models catalog overlay merge and fetch."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from backend.services import pull_model_catalog_service as svc


class TestPullModelCatalogMerge(unittest.TestCase):
    def test_sanitize_overlay_rejects_invalid_entry(self):
        out = svc._sanitize_overlay_payload(
            {
                "entries": [{"tag": "INVALID TAG", "params": "1B"}],
                "removed_tags": ["gemma4:latest"],
            }
        )
        self.assertEqual(out["entries"], [])
        self.assertEqual(out["removed_tags"], ["gemma4:latest"])

    def test_sanitize_overlay_accepts_valid_entry(self):
        out = svc._sanitize_overlay_payload(
            {
                "entries": [
                    {
                        "tag": "qwen3:2b",
                        "params": "2B",
                        "sizeGb": 1.6,
                        "releasedYm": "2025-04",
                        "license": "Apache 2.0",
                        "licenseClass": "foss",
                        "group": "smallest",
                        "tags": ["chat", "strategy"],
                        "rating": 5,
                        "blurb": "Test overlay entry.",
                    }
                ],
            }
        )
        self.assertEqual(len(out["entries"]), 1)
        self.assertEqual(out["entries"][0]["tag"], "qwen3:2b")

    def test_fetch_uses_cache_when_fresh(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache_file = Path(tmp) / "overlay.json"
            overlay = {
                "schema_version": 1,
                "updated_at": "2026-06-11",
                "entries": [],
                "removed_tags": [],
                "overrides": {},
            }
            cache_file.write_text(
                json.dumps({"fetched_at": 9_999_999_999, "overlay": overlay}),
                encoding="utf-8",
            )
            with mock.patch.object(svc, "CACHE_FILE", cache_file):
                with mock.patch.object(svc, "_fetch_remote_overlay") as remote:
                    out = svc.fetch_pull_model_catalog(force=False)
                    remote.assert_not_called()
                    self.assertEqual(out["source"], "cached")

    def test_fetch_remote_when_force(self):
        overlay = {
            "schema_version": 1,
            "updated_at": "2026-06-11",
            "entries": [],
            "removed_tags": [],
            "overrides": {},
        }
        with mock.patch.object(svc, "_fetch_remote_overlay", return_value=(overlay, "")):
            with mock.patch.object(svc, "_write_cache") as write_cache:
                out = svc.fetch_pull_model_catalog(force=True)
                write_cache.assert_called_once()
                self.assertEqual(out["source"], "live")


if __name__ == "__main__":
    unittest.main()
