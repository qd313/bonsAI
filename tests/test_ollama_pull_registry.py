"""Ollama pull error formatting and registry tag partition."""

from __future__ import annotations

import json
import unittest
import urllib.error
from unittest.mock import patch

from backend.services.local_ollama_setup_service import _format_ollama_pull_failure
from backend.services.ollama_catalog_service import (
    fetch_catalog_metadata,
    partition_pull_tags_by_registry,
)


class OllamaPullFailureFormatTests(unittest.TestCase):
    def test_manifest_missing_hint(self):
        msg = _format_ollama_pull_failure(
            "gemma4:4b",
            1,
            ["Error: pull model manifest: file does not exist"],
        )
        self.assertIn("exit code 1", msg)
        self.assertIn("not on the Ollama library", msg)
        self.assertIn("qwen2.5vl:3b", msg)

    def test_advice_comes_before_the_raw_command_output(self):
        """What to do about it leads; the command's own words follow.

        Measured on the Deck 2026-09-05 (PULL-CUSTOM-02), typing a made-up name into the pull
        picker's new custom field. The message opened with the exit code and four redraws of
        "pulling manifest" and only ended with the sentence a person can act on.
        """
        msg = _format_ollama_pull_failure(
            "not-a-real-model-xyz",
            1,
            [
                "pulling manifest ⠋",
                "pulling manifest ⠙",
                "pulling manifest ⠹",
                "pulling manifest",
                "Error: pull model manifest: file does not exist",
            ],
        )
        advice_at = msg.index("not on the Ollama library")
        raw_at = msg.index("ollama pull not-a-real-model-xyz failed")
        self.assertLess(advice_at, raw_at, "the actionable sentence must come first")
        self.assertTrue(msg.startswith("Tag «not-a-real-model-xyz»"), msg[:80])

    def test_spinner_redraws_are_collapsed_to_one_line(self):
        """A redraw is the same line again, not new information."""
        msg = _format_ollama_pull_failure(
            "some:tag",
            1,
            ["pulling manifest ⠋", "pulling manifest ⠙", "pulling manifest ⠹", "boom"],
        )
        self.assertEqual(msg.count("pulling manifest"), 1, msg)
        self.assertNotIn("⠋", msg)

    def test_redraws_inside_one_line_collapse_too(self):
        """Ollama redraws with a carriage return, so the repeats arrive inside a single line.

        This is what the Deck actually sent on 2026-09-05: splitting on lines saw one line and
        left four copies of "pulling manifest" in the message.
        """
        msg = _format_ollama_pull_failure(
            "some:tag",
            1,
            [
                "pulling manifest ⠋ pulling manifest ⠙ pulling manifest ⠹ pulling manifest "
                "Error: pull model manifest: file does not exist"
            ],
        )
        self.assertEqual(msg.count("pulling manifest"), 1, msg)
        self.assertTrue(msg.startswith("Tag «some:tag»"), msg[:60])


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


class _FakeManifestResponse:
    """Stands in for the object ``with urlopen_with_ca_fallback(...) as resp:`` gets."""

    def __init__(self, body: bytes, url: str = "https://registry.ollama.ai/v2/library/x/manifests/latest"):
        self._body = body
        self.url = url

    def read(self, _n: int = -1) -> bytes:
        return self._body

    def __enter__(self) -> "_FakeManifestResponse":
        return self

    def __exit__(self, *_exc: object) -> bool:
        return False


def _found(size: int = 1234) -> _FakeManifestResponse:
    return _FakeManifestResponse(json.dumps({"layers": [{"size": size}]}).encode("utf-8"))


def _missing_404() -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://registry.ollama.ai/x", 404, "Not Found", {}, None)


class FetchCatalogMetadataRegistryAnswerTests(unittest.TestCase):
    """A real answer from the registry -- found or "no such manifest" -- both count as live.

    Measured against the real registry.ollama.ai before writing the fix: a made-up library
    name (``zzz-plan64-missing-model``) and a real repository with a made-up tag
    (``gemma4:zzz-no-such-tag``) both come back HTTP 404. A real name/tag pair
    (``qwen2.5:1.5b``) comes back 200. Only a genuinely unreachable registry (a network error)
    should fall back to "offline, assume it is fine".
    """

    def test_made_up_name_is_reported_missing_and_counts_as_live(self):
        with patch(
            "backend.services.ollama_catalog_service.urlopen_with_ca_fallback",
            side_effect=_missing_404(),
        ):
            meta = fetch_catalog_metadata(["zzz-plan64-missing-model"])
        self.assertEqual(meta["source"], "live")
        self.assertEqual(meta["tags"]["zzz-plan64-missing-model"], {"size_bytes": None, "exists": False})

        ok, bad = partition_pull_tags_by_registry(["zzz-plan64-missing-model"])
        self.assertEqual(ok, [])
        self.assertEqual(bad, ["zzz-plan64-missing-model"])

    def test_real_name_plus_made_up_name_splits_ok_and_bad(self):
        def _side_effect(request, timeout):  # noqa: ARG001 - matches urlopen_with_ca_fallback's signature
            if "/library/qwen2.5/" in request.full_url:
                return _found()
            raise _missing_404()

        with patch(
            "backend.services.ollama_catalog_service.urlopen_with_ca_fallback",
            side_effect=_side_effect,
        ):
            ok, bad = partition_pull_tags_by_registry(["qwen2.5:1.5b", "zzz-plan64-missing-model"])
        self.assertEqual(ok, ["qwen2.5:1.5b"])
        self.assertEqual(bad, ["zzz-plan64-missing-model"])

    def test_unreachable_registry_falls_back_to_offline_and_lets_the_name_through(self):
        with patch(
            "backend.services.ollama_catalog_service.urlopen_with_ca_fallback",
            side_effect=urllib.error.URLError("no route to host"),
        ):
            meta = fetch_catalog_metadata(["zzz-plan64-missing-model"])
            self.assertEqual(meta["source"], "offline")

            ok, bad = partition_pull_tags_by_registry(["zzz-plan64-missing-model"])
        self.assertEqual(ok, ["zzz-plan64-missing-model"])
        self.assertEqual(bad, [])


if __name__ == "__main__":
    unittest.main()
