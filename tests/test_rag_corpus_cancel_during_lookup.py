"""A Cancel while the newest library is being looked up ends the run at once.

The lookup of the newest library asks two sites in turn, up to 60 seconds each, and the run used to wait
for the answer before it looked at the Cancel flag. On a slow connection the card said "Stopping the
download" for up to two minutes. The lookup writes nothing to disk, so the run now stops waiting for it.
"""

import asyncio
import threading
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_download_service as svc  # noqa: E402


class _Logger:
    def __init__(self):
        self.exceptions = 0

    def info(self, *_a, **_k):
        pass

    def exception(self, *_a, **_k):
        self.exceptions += 1


class CancelDuringTheLookupTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancel_ends_the_run_while_the_lookup_is_still_blocked(self) -> None:
        release = threading.Event()
        self.addCleanup(release.set)
        started = []

        def slow_lookup(**_kw):
            started.append(1)
            release.wait(30)
            raise RuntimeError("late failure from an abandoned lookup")

        def must_not_run(*_a, **_k):
            raise AssertionError("a download was started after Cancel")

        state = svc.new_rag_corpus_download_state()
        cancel = asyncio.Event()
        logger = _Logger()
        with patch.object(svc, "fetch_remote_manifest", slow_lookup), patch.object(
            svc, "install_corpus_from_manifest", must_not_run
        ):
            task = asyncio.create_task(
                svc.run_rag_corpus_download(install_dir="x", state=state, logger=logger, cancel_event=cancel)
            )
            await asyncio.sleep(0.1)
            self.assertFalse(state["done"])
            t0 = time.monotonic()
            cancel.set()
            await asyncio.wait_for(task, timeout=3)
            took = time.monotonic() - t0
            self.assertEqual(started, [1])
            self.assertLess(took, 1.0, "the card kept saying 'Stopping the download' while the lookup was waited on")
            self.assertEqual(state["phase"], "cancelled")
            self.assertTrue(state["done"])
            self.assertEqual(logger.exceptions, 0)
            # Let the abandoned lookup fail now; nothing may come back from it.
            release.set()
            await asyncio.sleep(0.2)
            self.assertEqual(state["phase"], "cancelled")
            self.assertEqual(logger.exceptions, 0)


if __name__ == "__main__":
    unittest.main()
