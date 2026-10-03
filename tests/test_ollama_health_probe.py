"""Unit tests for the Ollama reachability probe (backend.services.ollama_service).

This transport used to live inline in `main.py`'s `test_ollama_connection` RPC with **no test at
all**, contradicting `main.py`'s own header ("Does not: Own Ollama HTTP"). The tests here are the
ones that could not be written while it was a closure over RPC locals.

The distinction that matters: **version and tags are required, /api/ps is optional.** A host that
serves the first two is reachable even on an older Ollama build that has no /api/ps.
"""

import io
import json
import time
import unittest
from unittest import mock

from backend.services.ollama_service import (
    _loaded_model_snapshots,
    probe_ollama_health,
    vram_weight_share_pct,
)


def _resp(payload):
    """Minimal stand-in for the object urllib.request.urlopen returns."""
    return io.BytesIO(json.dumps(payload).encode("utf-8"))


class FakeUrlopen:
    """Routes by URL suffix so tests can fail one endpoint and serve the others."""

    def __init__(self, version=None, tags=None, ps=None, fail=()):
        self.version = version if version is not None else {"version": "0.5.7"}
        self.tags = tags if tags is not None else {"models": []}
        self.ps = ps if ps is not None else {"models": []}
        self.fail = set(fail)
        self.calls = []

    def __call__(self, req, timeout=None):
        url = req.full_url if hasattr(req, "full_url") else str(req)
        self.calls.append((url, timeout))
        for name in ("version", "tags", "ps"):
            if url.endswith(f"/api/{name}"):
                if name in self.fail:
                    raise OSError(f"{name} unreachable")
                return _resp(getattr(self, name))
        raise AssertionError(f"unexpected URL {url}")


class TestVramWeightShare(unittest.TestCase):
    def test_fully_in_vram_is_100(self):
        self.assertEqual(vram_weight_share_pct(1000, 1000), 100.0)

    def test_half_in_vram(self):
        self.assertEqual(vram_weight_share_pct(1000, 500), 50.0)

    def test_nothing_in_vram_is_zero_not_none(self):
        """0% and "unknown" are different answers; CPU-only inference must read as 0."""
        self.assertEqual(vram_weight_share_pct(1000, 0), 0.0)

    def test_over_reported_vram_is_clamped_to_100(self):
        """Ollama can report size_vram > size; that is not an error, it is 100%."""
        self.assertEqual(vram_weight_share_pct(1000, 4000), 100.0)

    def test_rounds_to_one_decimal(self):
        self.assertEqual(vram_weight_share_pct(3, 1), 33.3)

    def test_unusable_total_is_unknown(self):
        for total in (0, None, -5, "", "abc", [1]):
            self.assertIsNone(vram_weight_share_pct(total, 100), f"total={total!r}")

    def test_negative_vram_is_unknown(self):
        self.assertIsNone(vram_weight_share_pct(1000, -1))

    def test_garbage_vram_is_unknown(self):
        self.assertIsNone(vram_weight_share_pct(1000, "lots"))


class TestLoadedModelSnapshots(unittest.TestCase):
    def test_empty_payloads(self):
        for payload in ({}, {"models": []}, {"models": None}):
            self.assertEqual(_loaded_model_snapshots(payload), [], f"payload={payload!r}")

    def test_name_falls_back_to_model_then_placeholder(self):
        rows = _loaded_model_snapshots(
            {"models": [{"name": "a"}, {"model": "b"}, {}]}
        )
        self.assertEqual([r["name"] for r in rows], ["a", "b", "?"])

    def test_sizes_and_ratio(self):
        rows = _loaded_model_snapshots(
            {"models": [{"name": "m", "size": 2000, "size_vram": 1500}]}
        )
        self.assertEqual(rows[0]["size_bytes"], 2000)
        self.assertEqual(rows[0]["size_vram_bytes"], 1500)
        self.assertEqual(rows[0]["vram_weight_share_pct_appx"], 75.0)

    def test_malformed_rows_raise_rather_than_parsing_partially(self):
        """Pinned deliberately: the probe turns this into an empty /api/ps list, not a half list."""
        with self.assertRaises(Exception):
            _loaded_model_snapshots({"models": [{"name": "m", "size": "big"}]})
        with self.assertRaises(Exception):
            _loaded_model_snapshots({"models": ["junk"]})


class TestProbeOllamaHealth(unittest.TestCase):
    def test_happy_path(self):
        fake = FakeUrlopen(
            version={"version": "0.6.1"},
            tags={"models": [{"name": "qwen2.5:7b"}, {"name": "llava:7b"}]},
            ps={"models": [{"name": "qwen2.5:7b", "size": 1000, "size_vram": 900}]},
        )
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://1.2.3.4:11434", time.time() + 10)
        self.assertEqual(out["version"], "0.6.1")
        self.assertEqual(out["models"], ["qwen2.5:7b", "llava:7b"])
        self.assertEqual(out["ps_loaded"][0]["vram_weight_share_pct_appx"], 90.0)

    def test_each_models_size_comes_back_by_name(self):
        """Ollama's /api/tags already carries every model's size; the PC's list used to drop it."""
        fake = FakeUrlopen(
            tags={
                "models": [
                    {"name": "qwen3.6:27b", "size": 18_700_000_000},
                    {"name": "gemma4:e2b-it-qat", "size": 2_000_000_000},
                    {"name": "no-size:1b"},
                    {"name": "bad-size:1b", "size": "big"},
                    {"name": "zero:1b", "size": 0},
                ]
            }
        )
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://1.2.3.4:11434", time.time() + 10)
        self.assertEqual(out["model_sizes"], {"qwen3.6:27b": 18_700_000_000, "gemma4:e2b-it-qat": 2_000_000_000})
        self.assertEqual(len(out["models"]), 5)

    def test_all_three_endpoints_are_queried(self):
        fake = FakeUrlopen()
        with mock.patch("urllib.request.urlopen", fake):
            probe_ollama_health("http://host:11434", time.time() + 10)
        self.assertEqual(
            [u for u, _ in fake.calls],
            [
                "http://host:11434/api/version",
                "http://host:11434/api/tags",
                "http://host:11434/api/ps",
            ],
        )

    def test_missing_version_field_reads_as_unknown(self):
        fake = FakeUrlopen(version={})
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://host:11434", time.time() + 10)
        self.assertEqual(out["version"], "unknown")

    def test_unnamed_tag_reads_as_placeholder(self):
        fake = FakeUrlopen(tags={"models": [{}]})
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://host:11434", time.time() + 10)
        self.assertEqual(out["models"], ["?"])

    def test_ps_failure_does_not_fail_the_probe(self):
        """Older Ollama builds do not serve /api/ps. That host is still reachable."""
        fake = FakeUrlopen(fail=("ps",))
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://host:11434", time.time() + 10)
        self.assertEqual(out["ps_loaded"], [])
        self.assertEqual(out["version"], "0.5.7")

    def test_ps_returning_garbage_does_not_fail_the_probe(self):
        """A malformed row empties the whole /api/ps list; version and tags still stand."""
        fake = FakeUrlopen(ps={"models": [{"name": "m", "size": "not-a-number"}]})
        with mock.patch("urllib.request.urlopen", fake):
            out = probe_ollama_health("http://host:11434", time.time() + 10)
        self.assertEqual(out["ps_loaded"], [])
        self.assertEqual(out["version"], "0.5.7")

    def test_version_failure_raises(self):
        """The RPC relies on this raising to reach its loopback-recovery branch."""
        fake = FakeUrlopen(fail=("version",))
        with mock.patch("urllib.request.urlopen", fake):
            with self.assertRaises(OSError):
                probe_ollama_health("http://host:11434", time.time() + 10)

    def test_tags_failure_raises(self):
        fake = FakeUrlopen(fail=("tags",))
        with mock.patch("urllib.request.urlopen", fake):
            with self.assertRaises(OSError):
                probe_ollama_health("http://host:11434", time.time() + 10)

    def test_expired_deadline_still_makes_one_attempt(self):
        """A negative timeout would raise a confusing urllib error instead of a real result."""
        fake = FakeUrlopen()
        with mock.patch("urllib.request.urlopen", fake):
            probe_ollama_health("http://host:11434", time.time() - 500)
        for _url, timeout in fake.calls:
            self.assertGreaterEqual(timeout, 0.25)

    def test_generous_deadline_is_passed_through(self):
        fake = FakeUrlopen()
        with mock.patch("urllib.request.urlopen", fake):
            probe_ollama_health("http://host:11434", time.time() + 30)
        first_timeout = fake.calls[0][1]
        self.assertGreater(first_timeout, 25)
        self.assertLessEqual(first_timeout, 30)


if __name__ == "__main__":
    unittest.main()
