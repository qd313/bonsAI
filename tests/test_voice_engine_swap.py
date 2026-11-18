"""Title: Install voice engine builds in a spare folder and only then replaces the old engine

Purpose: These tests pin, at the level the Deck check looks at (the engine folder after a build, a Cancel or a
failure), that: a library left by an earlier build is gone after a new full build and is not in the new record,
so the engine's library path holds only what the build made; a Cancel or a failed build during the copy-out
leaves the old engine exactly as it was (same files, same record, still "ok"), and a half-copied file never
reaches the engine folder where an engine with no record yet would trust it once; a whisper-server-only build
replaces the server and keeps the libraries; a move that fails midway leaves no program that could be started.
Used for: voice_engine_build_service._build_whisper_cli_in_container, _build_whisper_server_in_container and
voice_engine_swap.
Does not: Run podman or compile anything. What a real build leaves on a Deck is only proven by a real build.
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_engine_build_service as build  # noqa: E402
from backend.voice import voice_engine_record as record  # noqa: E402
from backend.voice import voice_engine_swap as swap  # noqa: E402
from backend.voice.voice_stoppable_run import CANCELLED_MESSAGE  # noqa: E402

OLD = {
    "whisper-cli": b"old cli",
    "whisper-server": b"old server",
    "libggml.so.0": b"old ggml",
    "libstray.so.9": b"left by an earlier build",
}
NEW = {"whisper-cli": b"new cli", "whisper-server": b"new server", "libggml.so.0": b"new ggml"}


def _write(folder: str, files: dict[str, bytes]) -> None:
    for name, data in files.items():
        with open(os.path.join(folder, name), "wb") as f:
            f.write(data)


def _contents(folder: str) -> dict[str, bytes]:
    out = {}
    for name in sorted(os.listdir(folder)):
        with open(os.path.join(folder, name), "rb") as f:
            out[name] = f.read()
    return out


class FakeContainer:
    """Writes the built files into the folder the build mounted as /out, like the container does."""

    def __init__(self, files: dict[str, bytes], then_raise: Exception | None = None):
        self.files, self.then_raise, self.out_dirs = files, then_raise, []

    def __call__(self, podman, env, out_dir, script, cancel_event=None):
        self.out_dirs.append(out_dir)
        _write(out_dir, self.files)
        _write(out_dir, {record.BUILD_TOOLS_NAME: b"g++: g++ 11.4.0\n"})
        if self.then_raise:
            raise self.then_raise


class SwapTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.root, self.settings = os.path.join(self.tmp, "plugin"), os.path.join(self.tmp, "settings")
        os.makedirs(self.root)
        self.bin_dir = build.voice_bin_dir(self.root, self.settings)
        os.makedirs(self.bin_dir)

    def old_engine(self, with_record: bool = True) -> dict[str, bytes]:
        _write(self.bin_dir, OLD)
        if with_record:
            self.assertTrue(record.write_voice_engine_record(self.bin_dir, "old-image", ["g++: old"]))
        return _contents(self.bin_dir)

    def run_build(self, fn_name: str, container: FakeContainer) -> None:
        with patch.object(build, "_run_whisper_container_build", side_effect=container), patch.object(
            build, "whisper_binary_usable", return_value="x"
        ):
            getattr(build, fn_name)("podman", {}, self.root, self.settings)

    def no_spare_folder_left(self) -> None:
        self.assertEqual([n for n in os.listdir(os.path.dirname(self.bin_dir)) if n.startswith(swap.STAGING_PREFIX)], [])


class FullBuildEmptiesTheOldEngine(SwapTestCase):
    def test_a_library_from_an_earlier_build_is_gone_and_not_recorded(self) -> None:
        self.old_engine()
        _write(self.bin_dir, {"whisper-server.pid": b"123", ".bonsai_cpu_safe": b"1\n"})
        container = FakeContainer(NEW)
        self.run_build("_build_whisper_cli_in_container", container)
        names = os.listdir(self.bin_dir)
        self.assertNotIn("libstray.so.9", names)
        self.assertEqual(
            sorted(names),
            sorted([*NEW, record.RECORD_NAME, "whisper-server.pid", ".bonsai_cpu_safe"]),
        )
        self.assertEqual(_contents(self.bin_dir)["libggml.so.0"], b"new ggml")
        with open(record.record_path(self.bin_dir), encoding="utf-8") as f:
            self.assertEqual(sorted(json.load(f)["files"]), sorted(NEW))
        self.assertEqual(record.check_voice_engine(self.bin_dir), "ok")
        self.assertNotIn(record.BUILD_TOOLS_NAME, names)
        self.no_spare_folder_left()

    def test_the_container_never_wrote_into_the_engine_folder(self) -> None:
        self.old_engine()
        container = FakeContainer(NEW)
        self.run_build("_build_whisper_cli_in_container", container)
        self.assertEqual(len(container.out_dirs), 1)
        self.assertNotEqual(os.path.abspath(container.out_dirs[0]), os.path.abspath(self.bin_dir))
        self.assertEqual(os.path.dirname(container.out_dirs[0]), os.path.dirname(self.bin_dir))


class StopOrFailureLeavesTheOldEngine(SwapTestCase):
    def test_a_cancel_during_the_copy_leaves_the_engine_as_it_was(self) -> None:
        for with_record in (True, False):
            with self.subTest(with_record=with_record):
                shutil.rmtree(self.bin_dir, True)
                os.makedirs(self.bin_dir)
                before = self.old_engine(with_record)
                cut_off = FakeContainer({"whisper-cli": b"cut", "libggml.so.0": b"cut"}, RuntimeError(CANCELLED_MESSAGE))
                with self.assertRaises(RuntimeError):
                    self.run_build("_build_whisper_cli_in_container", cut_off)
                self.assertEqual(_contents(self.bin_dir), before)
                self.assertEqual(record.check_voice_engine(self.bin_dir), "ok" if with_record else "unrecorded")
                self.no_spare_folder_left()

    def test_a_compile_that_finished_without_its_programs_leaves_the_engine_as_it_was(self) -> None:
        before = self.old_engine()
        with self.assertRaisesRegex(RuntimeError, "missing"):
            self.run_build("_build_whisper_cli_in_container", FakeContainer({"libggml.so.0": b"only a lib"}))
        self.assertEqual(_contents(self.bin_dir), before)
        self.no_spare_folder_left()

    def test_a_server_build_that_is_cut_off_leaves_the_engine_as_it_was(self) -> None:
        before = self.old_engine()
        with self.assertRaises(RuntimeError):
            self.run_build(
                "_build_whisper_server_in_container",
                FakeContainer({"whisper-server": b"cut"}, RuntimeError(CANCELLED_MESSAGE)),
            )
        self.assertEqual(_contents(self.bin_dir), before)
        self.no_spare_folder_left()

    def test_a_spare_folder_left_by_a_crash_is_removed_by_the_next_build(self) -> None:
        old_spare = os.path.join(os.path.dirname(self.bin_dir), swap.STAGING_PREFIX + "deadbeef")
        os.makedirs(old_spare)
        _write(old_spare, {"whisper-cli": b"half"})
        three_hours_ago = time.time() - 3 * 60 * 60
        os.utime(old_spare, (three_hours_ago, three_hours_ago))
        self.run_build("_build_whisper_cli_in_container", FakeContainer(NEW))
        self.assertFalse(os.path.exists(old_spare))

    def test_a_fresh_spare_folder_of_another_running_build_is_left_alone(self) -> None:
        busy_spare = os.path.join(os.path.dirname(self.bin_dir), swap.STAGING_PREFIX + "cafef00d")
        os.makedirs(busy_spare)
        _write(busy_spare, {"whisper-cli": b"still being built"})
        self.run_build("_build_whisper_cli_in_container", FakeContainer(NEW))
        self.assertTrue(os.path.isdir(busy_spare))


class ServerOnlyBuildKeepsTheLibraries(SwapTestCase):
    def test_it_replaces_the_server_and_the_record_only(self) -> None:
        self.old_engine()
        self.run_build("_build_whisper_server_in_container", FakeContainer({"whisper-server": b"new server"}))
        now = _contents(self.bin_dir)
        self.assertEqual(now["whisper-server"], b"new server")
        for name in ("whisper-cli", "libggml.so.0", "libstray.so.9"):
            self.assertEqual(now[name], OLD[name])
        self.assertEqual(record.check_voice_engine(self.bin_dir), "ok")
        self.assertNotIn(record.BUILD_TOOLS_NAME, now)
        self.no_spare_folder_left()


class AMoveThatFailsMidway(SwapTestCase):
    def test_no_program_is_left_to_be_started(self) -> None:
        self.old_engine()
        real_replace = os.replace
        calls = {"n": 0}

        def flaky(src, dst):
            if swap.STAGING_PREFIX in src:
                calls["n"] += 1
                if calls["n"] == 2:
                    raise OSError("disk full")
            return real_replace(src, dst)

        with patch.object(swap.os, "replace", side_effect=flaky), self.assertRaises(OSError):
            self.run_build("_build_whisper_cli_in_container", FakeContainer(NEW))
        names = os.listdir(self.bin_dir)
        self.assertNotIn("whisper-cli", names)
        self.assertNotIn("whisper-server", names)
        self.assertNotIn(record.RECORD_NAME, names)
        self.no_spare_folder_left()



if __name__ == "__main__":
    unittest.main()
