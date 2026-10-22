"""Unit tests for Steam screenshot path helpers, VDF window parsing, and attaching a picture
to a question (including the no-Pillow ffmpeg shrink path -- see FFMPEG_ATTACHMENT_PRESETS)."""

import base64
import os
import shutil
import struct
import subprocess
import tempfile
import unittest
import zlib
from unittest import mock

from backend.media.screenshot_media import (
    FFMPEG_ATTACHMENT_PRESETS,
    encode_image_with_ffmpeg,
    extract_app_id_from_screenshot_path,
    gamescope_atom_screenshot_value,
    lookup_screenshot_vdf_metadata,
    lookup_steam_app_name,
    prepare_image_attachment,
    resolve_steam_screenshot_output_dir,
    _finalize_steam_capture_file,
    try_gamescope_atom_screenshot,
)


class ScreenshotMediaTests(unittest.TestCase):
    def test_extract_app_id_from_screenshot_path_steam_tree(self) -> None:
        path = os.path.join(
            "home",
            "deck",
            ".local",
            "share",
            "Steam",
            "userdata",
            "123",
            "760",
            "remote",
            "1234560",
            "screenshots",
            "shot.png",
        )
        self.assertEqual(extract_app_id_from_screenshot_path(path), "1234560")

    def test_extract_app_id_from_screenshot_path_no_marker(self) -> None:
        self.assertEqual(extract_app_id_from_screenshot_path("/tmp/foo.png"), "")

    def test_lookup_steam_app_name_non_numeric(self) -> None:
        self.assertEqual(lookup_steam_app_name("abc"), "")

    def test_lookup_screenshot_vdf_metadata_parses_window(self) -> None:
        vdf = (
            "stuff\n"
            '"mycap.png"\n'
            "{\n"
            '  "caption"  "A nice shot"\n'
            '  "shortcutname"  "Test Game"\n'
            "}\n"
        )
        fake_path = f"/a{os.sep}760{os.sep}remote{os.sep}1{os.sep}screenshots{os.sep}mycap.png"
        vdf_path = f"/a{os.sep}760{os.sep}screenshots.vdf"

        with mock.patch("os.path.isfile", side_effect=lambda p: p == vdf_path):
            with mock.patch("builtins.open", mock.mock_open(read_data=vdf)):
                out = lookup_screenshot_vdf_metadata(fake_path)
        self.assertEqual(out["caption"], "A nice shot")
        self.assertEqual(out["shortcut_name"], "Test Game")

    def test_lookup_screenshot_vdf_metadata_missing_file(self) -> None:
        with mock.patch("os.path.isfile", return_value=False):
            out = lookup_screenshot_vdf_metadata(
                f"/a{os.sep}760{os.sep}remote{os.sep}1{os.sep}screenshots{os.sep}x.png"
            )
        self.assertEqual(out, {"caption": "", "shortcut_name": ""})

    def test_gamescope_atom_screenshot_value_excludes_qam(self) -> None:
        self.assertEqual(gamescope_atom_screenshot_value(False), "1")
        self.assertEqual(gamescope_atom_screenshot_value(True), "3")

    def test_resolve_steam_screenshot_output_dir_uses_app_id(self) -> None:
        fake_root = os.path.join("home", "deck", ".local", "share", "Steam", "userdata", "99")
        remote_root = os.path.join(fake_root, "760", "remote")
        expected = os.path.join(remote_root, "1234560", "screenshots")

        def isdir(path: str) -> bool:
            return path in {fake_root, remote_root}

        makedirs_calls: list[str] = []

        with mock.patch(
            "backend.media.screenshot_media._list_steam_userdata_dirs",
            return_value=[fake_root],
        ):
            with mock.patch("os.path.isdir", side_effect=isdir):
                with mock.patch("os.makedirs", side_effect=lambda p, **_: makedirs_calls.append(p)):
                    out = resolve_steam_screenshot_output_dir("1234560")
        self.assertEqual(out, expected)
        self.assertEqual(makedirs_calls, [expected])

    def test_merge_recent_screenshot_paths_sorts_by_mtime(self) -> None:
        from backend.media.screenshot_media import merge_recent_screenshot_paths

        with mock.patch(
            "backend.media.screenshot_media.os.path.getmtime",
            side_effect=lambda p: {"a.png": 3.0, "b.png": 9.0, "c.png": 6.0}[os.path.basename(p)],
        ):
            with mock.patch(
                "backend.media.screenshot_media.os.path.realpath",
                side_effect=lambda p: p,
            ):
                merged = merge_recent_screenshot_paths(["a.png"], ["b.png", "c.png"], limit=3)
        self.assertEqual(merged, ["b.png", "c.png", "a.png"])

    def test_merge_recent_screenshot_paths_skips_plugin_mirror_of_steam_shot(self) -> None:
        from backend.media.screenshot_media import merge_recent_screenshot_paths

        steam = ["/u/760/remote/1/screenshots/20260627-172051.png"]
        plugin = ["/data/bonsAI/captures/bonsai-game-20260627-172051.png"]
        with mock.patch(
            "backend.media.screenshot_media.os.path.getmtime",
            side_effect=lambda p: 100.0 if "172051" in p else 50.0,
        ):
            with mock.patch(
                "backend.media.screenshot_media.os.path.realpath",
                side_effect=lambda p: p,
            ):
                merged = merge_recent_screenshot_paths(steam, plugin, limit=5)
        self.assertEqual(merged, steam)

    def test_finalize_steam_capture_file_passes_through_missing_file(self) -> None:
        # Folded in from the deleted _reencode_oversized_capture test: a path the finalizer
        # cannot work on comes back untouched rather than being handed to the JPEG encoder.
        with mock.patch("os.path.isfile", return_value=False):
            with mock.patch(
                "backend.media.screenshot_media._compress_capture_to_jpeg",
            ) as compress_mock:
                out = _finalize_steam_capture_file("/tmp/gone.png")
        compress_mock.assert_not_called()
        self.assertEqual(out, "/tmp/gone.png")

    def test_finalize_steam_capture_file_compresses_large_rgba(self) -> None:
        from backend.media.screenshot_media import _finalize_steam_capture_file

        with mock.patch("os.path.getsize", return_value=2_300_000):
            with mock.patch("os.path.isfile", return_value=True):
                with mock.patch(
                    "backend.media.screenshot_media._compress_capture_to_jpeg",
                    return_value="/tmp/cap.jpg",
                ) as compress_mock:
                    out = _finalize_steam_capture_file("/tmp/cap.png")
        compress_mock.assert_called_once()
        self.assertEqual(out, "/tmp/cap.jpg")

    def test_try_gamescope_atom_screenshot_copies_gamescope_png(self) -> None:
        with mock.patch(
            "backend.media.screenshot_media.shutil.which",
            return_value="/usr/bin/xprop",
        ):
            with mock.patch(
                "backend.media.screenshot_media._discover_x11_sessions",
                return_value=[(":1", "")],
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run",
                    return_value=mock.Mock(returncode=0, stderr=b""),
                ):
                    with mock.patch(
                        "backend.media.screenshot_media.os.path.isfile",
                        side_effect=lambda path: path in {"/tmp/gamescope.png", "/tmp/out.png"},
                    ):
                        with mock.patch(
                            "backend.media.screenshot_media.os.path.getsize",
                            return_value=60_000,
                        ):
                            with mock.patch(
                                "backend.media.screenshot_media.shutil.copy2"
                            ) as copy_mock:
                                with mock.patch(
                                    "backend.media.screenshot_media.time.time",
                                    return_value=100.0,
                                ):
                                    with mock.patch(
                                        "backend.media.screenshot_media.os.path.getmtime",
                                        return_value=100.0,
                                    ):
                                        out = try_gamescope_atom_screenshot(
                                            "/tmp/out.png", False, {}
                                        )
        self.assertTrue(out.get("success"))
        copy_mock.assert_called_once_with("/tmp/gamescope.png", "/tmp/out.png")


class EncodeImageWithFfmpegTests(unittest.TestCase):
    """The ffmpeg shrink path used when Pillow is not installed (the Deck's own case).

    Plan 70 helper J: a big, barely-compressed screenshot with Pillow missing used to go to the
    AI untouched and crashed the Deck's graphics chip. ffmpeg is already on the Deck, so it is
    used to shrink the picture instead; a fake ffmpeg (a mocked subprocess.run that reads the
    real command line and writes to the real output path) stands in for the real one so these
    tests run anywhere, without needing ffmpeg installed.
    """

    def _write_big_file(self, tmp_dir: str, name: str = "shot.png") -> str:
        path = os.path.join(tmp_dir, name)
        with open(path, "wb") as f:
            f.write(b"\xff" * (501_000))
        return path

    def test_success_shrinks_and_returns_the_smaller_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_big_file(tmp)
            seen_cmd: list = []

            def fake_ffmpeg_run(cmd, **kwargs):
                seen_cmd.extend(cmd)
                # A real ffmpeg writes its result to the output path named last on its command
                # line -- this fake does the same, so the code's own read-back is exercised.
                out_path = cmd[-1]
                with open(out_path, "wb") as out:
                    out.write(b"small-jpeg-bytes")
                return mock.Mock(returncode=0, stderr=b"")

            with mock.patch(
                "backend.media.screenshot_media.shutil.which",
                return_value="/usr/bin/ffmpeg",
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run",
                    side_effect=fake_ffmpeg_run,
                ):
                    encoded, mime_type, warnings = encode_image_with_ffmpeg(src, "low")

            self.assertIsNotNone(encoded)
            decoded = base64.b64decode(encoded)
            self.assertEqual(decoded, b"small-jpeg-bytes")
            self.assertLess(len(decoded), os.path.getsize(src))
            self.assertEqual(mime_type, "image/jpeg")
            self.assertEqual(warnings, [])

            # Test the real call shape, not just the outcome.
            self.assertEqual(seen_cmd[0], "/usr/bin/ffmpeg")
            self.assertEqual(seen_cmd[seen_cmd.index("-i") + 1], src)
            vf_value = seen_cmd[seen_cmd.index("-vf") + 1]
            low_max_dim = FFMPEG_ATTACHMENT_PRESETS["low"][0]
            self.assertIn(str(low_max_dim), vf_value)
            self.assertIn("force_original_aspect_ratio=decrease", vf_value)

    def test_ffmpeg_failure_is_refused_not_sent_full_size(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_big_file(tmp)

            def fake_ffmpeg_run(cmd, **kwargs):
                return mock.Mock(
                    returncode=1, stderr=b"Invalid data found when processing input"
                )

            with mock.patch(
                "backend.media.screenshot_media.shutil.which",
                return_value="/usr/bin/ffmpeg",
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run",
                    side_effect=fake_ffmpeg_run,
                ):
                    encoded, mime_type, warnings = encode_image_with_ffmpeg(src, "low")

            self.assertIsNone(encoded)
            self.assertIsNone(mime_type)
            self.assertTrue(warnings)
            self.assertIn("ffmpeg could not shrink the image", warnings[0])

    def test_ffmpeg_timeout_is_refused_not_sent_full_size(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_big_file(tmp)

            def fake_ffmpeg_run(cmd, **kwargs):
                raise subprocess.TimeoutExpired(cmd=cmd, timeout=20)

            with mock.patch(
                "backend.media.screenshot_media.shutil.which",
                return_value="/usr/bin/ffmpeg",
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run",
                    side_effect=fake_ffmpeg_run,
                ):
                    encoded, mime_type, warnings = encode_image_with_ffmpeg(src, "low")

            self.assertIsNone(encoded)
            self.assertTrue(warnings)
            self.assertIn("timed out", warnings[0])

    def test_missing_ffmpeg_is_refused_not_sent_full_size(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_big_file(tmp)

            with mock.patch(
                "backend.media.screenshot_media.shutil.which", return_value=None
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run"
                ) as run_mock:
                    encoded, mime_type, warnings = encode_image_with_ffmpeg(src, "low")

            run_mock.assert_not_called()
            self.assertIsNone(encoded)
            self.assertTrue(warnings)
            self.assertIn("ffmpeg is not installed", warnings[0])

    def test_a_1920x1080_picture_under_500kb_is_shrunk_not_sent_as_it_is(self) -> None:
        # The Deck's own screenshot: 1920x1080 but only a few hundred KB, so it used to slip
        # under a file-size line and reach the AI at full pixel size (the graphics chip crash).
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "shot.png")
            _write_solid_png(src, 1920, 1080)
            self.assertLess(os.path.getsize(src), 500_000)

            def fake_ffmpeg_run(cmd, **kwargs):
                with open(cmd[-1], "wb") as out:
                    out.write(b"shrunk-jpeg-bytes")
                return mock.Mock(returncode=0, stderr=b"")

            with mock.patch(
                "backend.media.screenshot_media.shutil.which",
                return_value="/usr/bin/ffmpeg",
            ):
                with mock.patch(
                    "backend.media.screenshot_media.subprocess.run",
                    side_effect=fake_ffmpeg_run,
                ) as run_mock:
                    encoded, mime_type, _warnings = encode_image_with_ffmpeg(src, "low")

            run_mock.assert_called_once()
            self.assertEqual(base64.b64decode(encoded), b"shrunk-jpeg-bytes")
            self.assertEqual(mime_type, "image/jpeg")

    def test_ffmpeg_runs_without_the_plugin_loaders_library_path(self) -> None:
        # Deck 2026-10-22 (plan97-P97-L1-PICTURE-ANSWER.json): inside the plugin, ffmpeg picked up
        # the plugin loader's own older libstdc++ through LD_LIBRARY_PATH and failed to start, so
        # every picture, even a 39 KB one, came back "too big to send".
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "shot.png")
            _write_solid_png(src, 64, 64)

            def fake_ffmpeg_run(cmd, **kwargs):
                with open(cmd[-1], "wb") as out:
                    out.write(b"shrunk-jpeg-bytes")
                return mock.Mock(returncode=0, stderr=b"")

            loader_env = {"LD_LIBRARY_PATH": "/tmp/_MEI0000ab", "LD_PRELOAD": "x.so", "ORIG_LD_LIBRARY_PATH": "/a"}
            with mock.patch.dict(os.environ, loader_env), mock.patch(
                "backend.media.screenshot_media.shutil.which", return_value="/usr/bin/ffmpeg"
            ), mock.patch(
                "backend.media.screenshot_media.subprocess.run", side_effect=fake_ffmpeg_run
            ) as run_mock:
                encode_image_with_ffmpeg(src, "low")

            env = run_mock.call_args.kwargs.get("env")
            self.assertIsNotNone(env, "ffmpeg must get an environment of its own")
            for key in loader_env:
                self.assertNotIn(key, env)
            self.assertIn("PATH", env)

    @unittest.skipUnless(shutil.which("ffmpeg"), "needs a real ffmpeg")
    def test_real_ffmpeg_shrinks_1920x1080_and_never_enlarges_a_small_picture(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            big = os.path.join(tmp, "big.png")
            small = os.path.join(tmp, "small.png")
            _write_solid_png(big, 1920, 1080)
            _write_solid_png(small, 640, 400)
            self.assertLess(os.path.getsize(big), 500_000)

            big_b64, _, _ = encode_image_with_ffmpeg(big, "low")
            small_b64, _, _ = encode_image_with_ffmpeg(small, "low")

        low_side = FFMPEG_ATTACHMENT_PRESETS["low"][0]
        big_w, big_h = _jpeg_size(base64.b64decode(big_b64))
        self.assertLessEqual(max(big_w, big_h), low_side)
        self.assertEqual((big_w, big_h), (800, 450))
        # Already inside the preset's longest side: the picture keeps its own size.
        self.assertEqual(_jpeg_size(base64.b64decode(small_b64)), (640, 400))


def _write_solid_png(path: str, width: int, height: int) -> None:
    """A real, valid PNG of one flat colour: small on disk, big in pixels (stdlib only)."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    row = bytes([0]) + bytes([0x20, 0x60, 0xA0]) * width
    raw = zlib.compress(row * height, 9)
    with open(path, "wb") as f:
        f.write(
            bytes([0x89]) + b"PNG" + bytes([0x0D, 0x0A, 0x1A, 0x0A])
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", raw)
            + chunk(b"IEND", b"")
        )


def _jpeg_size(data: bytes) -> tuple[int, int]:
    """Read width and height from a JPEG's start-of-frame marker."""
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            height, width = struct.unpack(">HH", data[i + 5 : i + 9])
            return width, height
        i += 2 + struct.unpack(">H", data[i + 2 : i + 4])[0]
    raise AssertionError("no JPEG frame header found")


class PrepareImageAttachmentShrinkChoiceTests(unittest.TestCase):
    """Which shrink method prepare_image_attachment() reaches for, and what a caller sees
    when none of them can make the picture smaller."""

    def _write_small_file(self, tmp_dir: str) -> str:
        path = os.path.join(tmp_dir, "shot.png")
        with open(path, "wb") as f:
            f.write(b"\x00" * 10)
        return path

    def test_prefers_pillow_when_it_is_installed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_small_file(tmp)
            with mock.patch(
                "backend.media.screenshot_media._pillow_installed", return_value=True
            ):
                with mock.patch(
                    "backend.media.screenshot_media.encode_image_with_pillow",
                    return_value=("pillow-bytes", "image/jpeg", []),
                ) as pillow_mock:
                    with mock.patch(
                        "backend.media.screenshot_media.encode_image_with_ffmpeg"
                    ) as ffmpeg_mock:
                        result = prepare_image_attachment({"path": src}, "low")

            pillow_mock.assert_called_once()
            ffmpeg_mock.assert_not_called()
            self.assertTrue(result["ok"])
            self.assertEqual(result["image_b64"], "pillow-bytes")

    def test_falls_back_to_ffmpeg_when_pillow_is_not_installed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_small_file(tmp)
            with mock.patch(
                "backend.media.screenshot_media._pillow_installed", return_value=False
            ):
                with mock.patch(
                    "backend.media.screenshot_media.encode_image_with_ffmpeg",
                    return_value=("ffmpeg-bytes", "image/jpeg", []),
                ) as ffmpeg_mock:
                    result = prepare_image_attachment({"path": src}, "low")

            ffmpeg_mock.assert_called_once()
            self.assertTrue(result["ok"])
            self.assertEqual(result["image_b64"], "ffmpeg-bytes")

    def test_refuses_with_a_plain_message_when_neither_can_shrink_it(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = self._write_small_file(tmp)
            with mock.patch(
                "backend.media.screenshot_media._pillow_installed", return_value=False
            ):
                with mock.patch(
                    "backend.media.screenshot_media.encode_image_with_ffmpeg",
                    return_value=(
                        None,
                        None,
                        ["ffmpeg is not installed; could not shrink the image."],
                    ),
                ):
                    result = prepare_image_attachment({"path": src}, "low")

            self.assertFalse(result["ok"])
            self.assertEqual(
                result["error"],
                "This picture is too big to send and could not be made smaller.",
            )


if __name__ == "__main__":
    unittest.main()
