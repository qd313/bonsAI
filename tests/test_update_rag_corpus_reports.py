"""Title: Update knowledge base says what it did, and writes one log line each time

Purpose: Pin every outcome of update_rag_corpus: already up to date, a newer version found
and downloading, a newer version found but the download refused to start, and the check
itself failing. Each returns an ``outcome`` the screen can show, and each writes exactly
one plugin-log line naming the installed version, the newest version and the outcome.
Used for: backend/services/rag_corpus_rpc.update_rag_corpus.
Solves: On the Deck (docs/test-evidence/plan70-R5.json) pressing Update twice showed
nothing and logged nothing, so nobody could tell whether it had checked at all.
Does not: Touch the network or the disk; the manifest fetch and the download are faked.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services import rag_corpus_rpc  # noqa: E402


class _FakePlugin:
    def __init__(self, local_version: str = "2026.09.26", accepted: bool = True, reason: str = "") -> None:
        self._settings = {
            "rag_corpus_version": local_version,
            "rag_corpus_path": "/home/deck/.bonsai/rag",
            # Checking for a newer library is a download (test_internet_downloads_permission.py).
            "capabilities": {"internet_downloads": True},
        }
        self._accepted = accepted
        self._reason = reason
        self.download_calls: list[dict] = []

    async def load_settings(self) -> dict:
        return dict(self._settings)

    async def start_rag_corpus_download(self, data=None) -> dict:
        self.download_calls.append(dict(data or {}))
        if self._accepted:
            return {"accepted": True, "install_path": "/home/deck/.bonsai/rag"}
        return {"accepted": False, "reason": self._reason}


class UpdateRagCorpusReportsTests(unittest.IsolatedAsyncioTestCase):
    async def _update(self, plugin: _FakePlugin, *, remote: str | None = None, fetch_error: Exception | None = None):
        fetch = mock.Mock(side_effect=fetch_error) if fetch_error else mock.Mock(return_value={"version": remote})
        log = mock.Mock()
        with mock.patch.object(rag_corpus_rpc, "fetch_remote_manifest", fetch), \
                mock.patch.object(rag_corpus_rpc, "resolve_corpus_db_path", return_value="/home/deck/.bonsai/rag/corpus.db"), \
                mock.patch.object(rag_corpus_rpc, "logger", log):
            out = await rag_corpus_rpc.update_rag_corpus(plugin)
        lines = [c for m in ("info", "warning") for c in getattr(log, m).call_args_list]
        self.assertEqual(len(lines), 1, f"expected exactly one log line per Update, got {lines}")
        rendered = lines[0].args[0] % lines[0].args[1:]
        return out, rendered

    async def test_already_up_to_date(self) -> None:
        plugin = _FakePlugin(local_version="2026.09.26")
        out, line = await self._update(plugin, remote="2026.09.26")
        self.assertTrue(out["ok"])
        self.assertFalse(out["updated"])
        self.assertEqual(out["outcome"], "up_to_date")
        self.assertEqual(out["version"], "2026.09.26")
        self.assertEqual(plugin.download_calls, [])
        self.assertIn("installed=2026.09.26", line)
        self.assertIn("newest=2026.09.26", line)
        self.assertIn("outcome=up_to_date", line)

    async def test_newer_version_starts_download(self) -> None:
        plugin = _FakePlugin(local_version="2026.09.18")
        out, line = await self._update(plugin, remote="2026.09.26")
        self.assertTrue(out["ok"])
        self.assertTrue(out["updated"])
        self.assertEqual(out["outcome"], "download_started")
        self.assertEqual(out["version"], "2026.09.26")
        self.assertEqual(len(plugin.download_calls), 1)
        self.assertIn("installed=2026.09.18", line)
        self.assertIn("newest=2026.09.26", line)
        self.assertIn("outcome=download_started", line)

    async def test_newer_version_but_download_refused(self) -> None:
        plugin = _FakePlugin(local_version="2026.09.18", accepted=False, reason="Knowledge base download already running.")
        out, line = await self._update(plugin, remote="2026.09.26")
        self.assertFalse(out["ok"])
        self.assertEqual(out["outcome"], "download_not_started")
        self.assertEqual(out["error"], "Knowledge base download already running.")
        self.assertIn("outcome=download_not_started", line)
        self.assertIn("already running", line)

    async def test_check_failed(self) -> None:
        plugin = _FakePlugin(local_version="2026.09.26")
        out, line = await self._update(plugin, fetch_error=RuntimeError("Could not fetch the knowledge base manifest"))
        self.assertFalse(out["ok"])
        self.assertEqual(out["outcome"], "check_failed")
        self.assertIn("Could not fetch", out["error"])
        self.assertEqual(plugin.download_calls, [])
        self.assertIn("installed=2026.09.26", line)
        self.assertIn("outcome=check_failed", line)


if __name__ == "__main__":
    unittest.main()
