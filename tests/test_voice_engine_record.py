"""Title: A voice engine build writes down what it used and a checksum of what it made

Purpose: After a build the voice engine's folder holds a small record: the build image, the exact g++ and
make versions the build installed, the package servers it used, and a SHA-256 of the two programs and
their libraries. These tests pin that both builds (the full one and the whisper-server-only one) write it,
that the compiler lines really reach it from the script's own output (the script's record piece is run for
real under bash with stand-in tools), and that the record's own file is not swept away by the clean-up.
Used for: voice_engine_build_service._build_whisper_cli_in_container, _build_whisper_server_in_container,
_BUILD_TOOLS_RECORD_SCRIPT and voice_engine_record.write_voice_engine_record.
Does not: Run podman or check the record before a start (test_voice_engine_checked_before_start.py does).
What a real build prints is only proven by a real build on a Deck.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.voice import voice_engine_build_service as build  # noqa: E402
from backend.voice import voice_engine_record as record  # noqa: E402

TOOL_LINES = "g++: g++ (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0\nmake: GNU Make 4.3\npackage version: g++ 4:11.2.0-1ubuntu1\n"


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class FakeBuild:
    """A stand-in for the container: puts the built files (and the tools lines) in the out folder."""

    def __init__(self, files: dict[str, bytes]):
        self.files = files

    def __call__(self, podman, env, bin_dir, script, cancel_event=None):
        for name, data in self.files.items():
            with open(os.path.join(bin_dir, name), "wb") as f:
                f.write(data)
        with open(os.path.join(bin_dir, record.BUILD_TOOLS_NAME), "w", encoding="utf-8") as f:
            f.write(TOOL_LINES)


class BuildWritesTheRecord(unittest.TestCase):
    def _run(self, fn_name: str, files: dict[str, bytes], already_there: dict[str, bytes] | None = None) -> str:
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        plugin_root, settings_dir = os.path.join(tmp, "plugin"), os.path.join(tmp, "settings")
        os.makedirs(plugin_root)
        bin_dir = build.voice_bin_dir(plugin_root, settings_dir)
        os.makedirs(bin_dir)
        for name, data in (already_there or {}).items():
            with open(os.path.join(bin_dir, name), "wb") as f:
                f.write(data)
        with patch.object(build, "_run_whisper_container_build", side_effect=FakeBuild(files)), patch.object(
            build, "whisper_binary_usable", return_value="x"
        ):
            getattr(build, fn_name)("podman", {}, plugin_root, settings_dir)
        return bin_dir

    def test_full_build_records_image_compiler_versions_and_checksums(self) -> None:
        files = {"whisper-cli": b"cli bytes", "whisper-server": b"server bytes", "libggml.so": b"lib bytes"}
        bin_dir = self._run("_build_whisper_cli_in_container", files)
        with open(record.record_path(bin_dir), encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved["image"], build.WHISPER_CPP_IMAGE)
        self.assertIn("@sha256:", saved["image"])
        self.assertIn("g++: g++ (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0", saved["build_tools"])
        self.assertIn("make: GNU Make 4.3", saved["build_tools"])
        self.assertEqual(saved["files"]["whisper-cli"], {"sha256": _sha(b"cli bytes")})
        self.assertEqual(saved["files"]["whisper-server"], {"sha256": _sha(b"server bytes")})
        self.assertEqual(saved["files"]["libggml.so"], {"sha256": _sha(b"lib bytes")})
        self.assertFalse(os.path.exists(os.path.join(bin_dir, record.BUILD_TOOLS_NAME)))

    def test_server_only_build_rewrites_the_record_with_the_new_server(self) -> None:
        bin_dir = self._run(
            "_build_whisper_server_in_container", {"whisper-server": b"new server"}, {"whisper-cli": b"old cli"}
        )
        with open(record.record_path(bin_dir), encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved["files"]["whisper-server"], {"sha256": _sha(b"new server")})
        self.assertEqual(saved["files"]["whisper-cli"], {"sha256": _sha(b"old cli")})
        self.assertIn("make: GNU Make 4.3", saved["build_tools"])

    def test_the_cleanup_keeps_the_record(self) -> None:
        self.assertIn(record.RECORD_NAME, build._voice_bin_keep_names())
        with tempfile.TemporaryDirectory() as bin_dir:
            for name in (record.RECORD_NAME, "stray.txt"):
                with open(os.path.join(bin_dir, name), "w", encoding="utf-8") as f:
                    f.write("x")
            build._prune_voice_bin_non_libs(bin_dir)
            self.assertEqual(os.listdir(bin_dir), [record.RECORD_NAME])

    def test_a_symlink_is_recorded_by_where_it_points(self) -> None:
        with tempfile.TemporaryDirectory() as bin_dir:
            with open(os.path.join(bin_dir, "libfoo.so.1.2"), "wb") as f:
                f.write(b"lib")
            try:
                os.symlink("libfoo.so.1.2", os.path.join(bin_dir, "libfoo.so.1"))
            except (OSError, NotImplementedError):
                self.skipTest("this machine cannot make symlinks")
            self.assertTrue(record.write_voice_engine_record(bin_dir, "img", []))
            with open(record.record_path(bin_dir), encoding="utf-8") as f:
                files = json.load(f)["files"]
            self.assertEqual(files["libfoo.so.1"], {"link": "libfoo.so.1.2"})


class RecordIsWrittenSafely(unittest.TestCase):
    """The record's temporary file is its own for every write, and a hostile record never crashes the check."""

    def setUp(self) -> None:
        self.bin_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.bin_dir, True)
        with open(os.path.join(self.bin_dir, "whisper-cli"), "wb") as f:
            f.write(b"cli")

    def test_a_write_does_not_use_or_disturb_the_name_another_writer_may_hold(self) -> None:
        shared_name = os.path.join(self.bin_dir, record.RECORD_NAME + ".tmp")  # the name every writer used to share
        with open(shared_name, "w", encoding="utf-8") as f:
            f.write("another writer's half-written record")
        self.assertTrue(record.write_voice_engine_record(self.bin_dir, "img", []))
        with open(shared_name, encoding="utf-8") as f:
            self.assertEqual(f.read(), "another writer's half-written record")
        self.assertEqual(record.check_voice_engine(self.bin_dir), "ok")

    def test_no_temporary_file_is_left_after_a_good_or_a_failed_write(self) -> None:
        self.assertTrue(record.write_voice_engine_record(self.bin_dir, "img", []))
        with patch.object(record.os, "replace", side_effect=OSError("disk full")):
            self.assertFalse(record.write_voice_engine_record(self.bin_dir, "img", []))
        self.assertEqual(sorted(os.listdir(self.bin_dir)), sorted(["whisper-cli", record.RECORD_NAME]))

    def test_the_temporary_name_can_never_look_like_a_library(self) -> None:
        # Any name with ".so" in it counts as an engine file; the random part must not be able to make one.
        seen = []
        real_mkstemp = tempfile.mkstemp

        def spy(*a, **k):
            fd, path = real_mkstemp(*a, **k)
            seen.append(os.path.basename(path))
            return fd, path

        with patch.object(record.tempfile, "mkstemp", side_effect=spy):
            record.write_voice_engine_record(self.bin_dir, "img", [])
        self.assertEqual(len(seen), 1)
        self.assertNotIn(".so", seen[0])

    def test_a_deeply_nested_record_counts_as_changed_instead_of_raising(self) -> None:
        with open(record.record_path(self.bin_dir), "w", encoding="utf-8") as f:
            f.write('{"files": ' + "[" * 200000)
        self.assertEqual(record.check_voice_engine(self.bin_dir), "changed")
        self.assertTrue(record.voice_engine_changed(self.bin_dir))


@unittest.skipUnless(shutil.which("bash"), "needs bash")
class ScriptRecordPieceRunsForReal(unittest.TestCase):
    def test_the_scripts_own_record_piece_writes_the_compiler_lines(self) -> None:
        self.assertIn("g++ --version", build._BUILD_TOOLS_RECORD_SCRIPT)
        self.assertIn("make --version", build._BUILD_TOOLS_RECORD_SCRIPT)
        with tempfile.TemporaryDirectory() as tmp:
            fake_bin, out_dir, apt_dir = (os.path.join(tmp, n) for n in ("fakebin", "out", "apt"))
            os.makedirs(fake_bin)
            os.makedirs(out_dir)
            os.makedirs(os.path.join(apt_dir, "sources.list.d"))
            with open(os.path.join(apt_dir, "sources.list"), "w", encoding="utf-8", newline="\n") as f:
                f.write("deb http://archive.ubuntu.com/ubuntu jammy main\ndeb http://security.ubuntu.com/ubuntu jammy-security main\n")
            os_release = os.path.join(tmp, "os-release")
            with open(os_release, "w", encoding="utf-8", newline="\n") as f:
                f.write('PRETTY_NAME="Ubuntu 22.04.4 LTS"\n')
            stand_ins = {
                "g++": "echo 'g++ (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0'; echo second line",
                "make": "echo 'GNU Make 4.3'; echo second line",
                "dpkg-query": "echo 'package version: g++ 4:11.2.0-1ubuntu1'",
            }
            for name, body in stand_ins.items():
                path = os.path.join(fake_bin, name)
                with open(path, "w", encoding="utf-8", newline="\n") as f:
                    f.write("#!/bin/sh\n" + body + "\n")
                os.chmod(path, 0o755)
            env = dict(os.environ)
            env.update(
                {
                    "BONSAI_OUT_DIR": out_dir,
                    "BONSAI_APT_DIR": apt_dir,
                    "BONSAI_OS_RELEASE": os_release,
                    "PATH": fake_bin + os.pathsep + env.get("PATH", ""),
                }
            )
            proc = subprocess.run(
                ["bash", "-c", "set -e\n" + build._BUILD_TOOLS_RECORD_SCRIPT], env=env, capture_output=True, text=True, timeout=30
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            lines = record.take_build_tools(out_dir)
        self.assertIn("os: Ubuntu 22.04.4 LTS", lines)
        self.assertIn("g++: g++ (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0", lines)
        self.assertIn("make: GNU Make 4.3", lines)
        self.assertIn("package source: deb http://archive.ubuntu.com/ubuntu jammy main", lines)
        self.assertIn("package source: deb http://security.ubuntu.com/ubuntu jammy-security main", lines)
        self.assertIn("package version: g++ 4:11.2.0-1ubuntu1", lines)


if __name__ == "__main__":
    unittest.main()
