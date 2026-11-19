"""Title: A cancelled model download gives its disk space back

Purpose: A cancelled `ollama pull` used to leave its `-partial` files and any layer it had finished in the
models folder for good. These tests pin the level a person sees: after Cancel part way, the blobs folder holds
exactly the files it held before the download; a download that finishes, or fails without a Cancel, keeps its
files; a file that was there before is never removed; a model finished earlier in the same run stays; and the
card's status already says "cancelled" before the clean-up starts.
Used for: ollama_cancelled_pull_cleanup.py through run_local_setup in local_ollama_setup_service.py.
Does not: Run Ollama (a stand-in download writes the files and ends the way each test asks).
"""

from __future__ import annotations

import asyncio
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from ollama_fake_ai import FakeAI, run_custom_setup  # noqa: E402

from backend.ollama import ollama_cancelled_pull_cleanup as cleanup  # noqa: E402
from backend.ollama import ollama_pull_resume_service as resume  # noqa: E402


class _Models:
    """A throwaway models folder with a blobs folder in it, set as OLLAMA_MODELS."""

    def __init__(self, case: unittest.TestCase) -> None:
        tmp = tempfile.TemporaryDirectory()
        case.addCleanup(tmp.cleanup)
        self.blobs = Path(tmp.name) / "blobs"
        self.blobs.mkdir()
        for target, kw in (
            ("os.environ", {"values": {"OLLAMA_MODELS": tmp.name}}),
            (f"{cleanup.__name__}.SETTLE_SECONDS", {"new": 0.05}),
            (f"{cleanup.__name__}.POLL_SECONDS", {"new": 0.02}),
        ):
            p = patch.dict(target, **kw) if target == "os.environ" else patch(target, **kw)
            p.start()
            case.addCleanup(p.stop)

    def put(self, *names: str) -> None:
        for name in names:
            (self.blobs / name).write_bytes(b"x" * 10)

    def names(self) -> set[str]:
        return {p.name for p in self.blobs.iterdir()}


def _download(models: _Models, behaviours: dict, cancel: asyncio.Event):
    """A stand-in `run_ollama_pull`: each tag writes its files and ends as its behaviour says."""

    def pull(_bin, tag, _log, _cancelled):
        how, files = behaviours[tag]
        models.put(*files)
        if how == "cancel":
            cancel.set()
            return False, "Cancelled."
        return (True, "") if how == "finish" else (False, "pull failed")

    return pull


class ACancelledDownloadLeavesNoPart(unittest.TestCase):
    def setUp(self) -> None:
        resume.mark_unloading(False)
        self.models = _Models(self)
        self.models.put("sha256-old1", "sha256-old2-partial")  # an older model, and an older half-finished one
        self.before = self.models.names()

    def _run(self, behaviours: dict, **kw) -> dict:
        cancel = asyncio.Event()
        return run_custom_setup(FakeAI(up=True), _download(self.models, behaviours, cancel), cancel,
                                tags=tuple(behaviours), **kw)

    def test_after_a_cancel_part_way_the_blobs_folder_is_as_it_was(self):
        state = self._run({"a:1": ("cancel", ["sha256-aaa-partial", "sha256-aaa-partial-0", "sha256-bbb"])})
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(self.models.names(), self.before)

    def test_a_download_that_finishes_keeps_its_files(self):
        state = self._run({"a:1": ("finish", ["sha256-aaa", "sha256-bbb"])})
        self.assertEqual(state["phase"], "done")
        self.assertEqual(self.models.names(), self.before | {"sha256-aaa", "sha256-bbb"})

    def test_a_download_that_fails_without_a_cancel_keeps_its_files(self):
        state = self._run({"a:1": ("fail", ["sha256-aaa-partial"])})
        self.assertEqual(state["phase"], "failed")
        self.assertEqual(self.models.names(), self.before | {"sha256-aaa-partial"})

    def test_a_model_finished_earlier_in_the_run_stays_and_only_the_cancelled_one_goes(self):
        state = self._run({"a:1": ("finish", ["sha256-first"]), "b:1": ("cancel", ["sha256-second-partial"])})
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(self.models.names(), self.before | {"sha256-first"})

    def test_a_file_that_was_there_before_is_never_removed_even_if_the_download_touches_it(self):
        def pull(_bin, _tag, _log, _cancelled):
            (self.models.blobs / "sha256-old2-partial").write_bytes(b"more")  # the download carried on an older part
            self.models.put("sha256-new-partial")
            cancel.set()
            return False, "Cancelled."

        cancel = asyncio.Event()
        run_custom_setup(FakeAI(up=True), pull, cancel)
        self.assertEqual(self.models.names(), self.before)

    def test_a_file_the_server_writes_after_the_program_ended_is_removed_too(self):
        def pull(_bin, _tag, _log, _cancelled):
            self.models.put("sha256-aaa-partial")
            threading.Timer(0.15, self.models.put, args=("sha256-late-partial",)).start()
            cancel.set()
            return False, "Cancelled."

        cancel = asyncio.Event()
        with patch(f"{cleanup.__name__}.SETTLE_SECONDS", 0.5):
            run_custom_setup(FakeAI(up=True), pull, cancel)
        self.assertEqual(self.models.names(), self.before)

    def test_the_status_already_says_cancelled_when_the_clean_up_starts(self):
        state: dict = {}
        seen: list[str] = []
        real = cleanup.remove_new_blobs

        def spy(*args):
            seen.append(f"{state.get('phase')}/{state.get('done')}")
            real(*args)

        with patch(f"{cleanup.__name__}.remove_new_blobs", side_effect=spy):
            self._run({"a:1": ("cancel", ["sha256-aaa-partial"])}, state=state)
        self.assertEqual(seen, ["cancelled/True"])

    def test_a_models_folder_that_cannot_be_read_is_left_alone(self):
        def pull(_bin, _tag, _log, _cancelled):
            cancel.set()
            return False, "Cancelled."

        cancel = asyncio.Event()
        with patch.dict("os.environ", {"OLLAMA_MODELS": str(self.models.blobs / "missing")}):
            state = run_custom_setup(FakeAI(up=True), pull, cancel)
        self.assertEqual(state["phase"], "cancelled")
        self.assertEqual(self.models.names(), self.before)

    def test_a_plugin_unload_keeps_the_part_so_the_download_can_carry_on_after_the_reload(self):
        cancel = asyncio.Event()
        ai = FakeAI(up=True)
        reached = threading.Event()

        async def unload(task):
            await asyncio.get_running_loop().run_in_executor(None, reached.wait, 5)  # the download is under way
            cancel.set()
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        def pull(_bin, _tag, _log, cancelled):
            self.models.put("sha256-aaa-partial")
            reached.set()
            while not cancelled():
                threading.Event().wait(0.02)
            return False, "Cancelled."

        run_custom_setup(ai, pull, cancel, drive=unload)
        self.assertIn("sha256-aaa-partial", self.models.names())


if __name__ == "__main__":
    unittest.main()
