"""Title: The knowledge base download saves its path before it says done

Purpose: Pin the order inside run_rag_corpus_download: the caller's on_installed save runs
before the shared state reads phase "done".
Used for: rag_corpus_download_service.run_rag_corpus_download and main.py's
start_rag_corpus_download, which passes the settings save in as on_installed.
Solves: On the Deck (docs/test-evidence/plan64-TWO-TAPS-DOWNLOAD.json) the Knowledge base
section read "Not installed" for a minute after an SD-card download finished. The screen stops
polling as soon as it reads "done" and checks "installed" once, from settings; the path was
saved only after "done" was already visible, so that one check found nothing.
Does not: Touch the network or the disk. The manifest fetch and the install are faked.
"""

from __future__ import annotations

import asyncio
import unittest
from unittest import mock

from backend.services import rag_corpus_download_service as svc


class _Logger:
    def info(self, *_a, **_k) -> None:
        pass

    def warning(self, *_a, **_k) -> None:
        pass

    def exception(self, *_a, **_k) -> None:
        pass


class SavesBeforeDoneTests(unittest.IsolatedAsyncioTestCase):
    async def _run(self, on_installed, state: dict | None = None) -> dict:
        state = {} if state is None else state
        with mock.patch.object(svc, "fetch_remote_manifest", return_value={"version": "2026.09.18"}), \
                mock.patch.object(svc, "install_corpus_from_manifest", return_value="/sd/.bonsai/rag"):
            await svc.run_rag_corpus_download(
                install_dir="/sd/.bonsai/rag",
                state=state,
                logger=_Logger(),
                cancel_event=asyncio.Event(),
                on_installed=on_installed,
            )
        return state

    async def test_the_save_runs_while_the_state_does_not_yet_read_done(self) -> None:
        seen: list = []
        state: dict = {}

        async def on_installed(root: str, version: str) -> None:
            seen.append((root, version, state.get("phase"), state.get("done")))

        await self._run(on_installed, state)

        self.assertEqual(len(seen), 1, "on_installed should run exactly once")
        root, version, phase_at_save, done_at_save = seen[0]
        self.assertEqual((root, version), ("/sd/.bonsai/rag", "2026.09.18"))
        self.assertNotEqual(phase_at_save, "done", "the path was saved after the screen could already read done")
        self.assertFalse(done_at_save)
        self.assertEqual(state.get("phase"), "done")
        self.assertTrue(state.get("done"))

    async def test_a_failed_save_counts_as_a_failed_download(self) -> None:
        async def on_installed(_root: str, _version: str) -> None:
            raise OSError("settings file is read-only")

        state = await self._run(on_installed)
        self.assertEqual(state.get("phase"), "failed")
        self.assertIn("read-only", state.get("error", ""))

    async def test_no_callback_still_finishes(self) -> None:
        state = await self._run(None)
        self.assertEqual(state.get("phase"), "done")


if __name__ == "__main__":
    unittest.main()
