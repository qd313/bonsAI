"""Unit tests for Steam screenshot path helpers and VDF window parsing."""

import os
import unittest
from unittest import mock

from backend.services.screenshot_media import (
    extract_app_id_from_screenshot_path,
    gamescope_atom_screenshot_value,
    lookup_screenshot_vdf_metadata,
    lookup_steam_app_name,
    resolve_steam_screenshot_output_dir,
    _reencode_oversized_capture,
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
            "backend.services.screenshot_media._list_steam_userdata_dirs",
            return_value=[fake_root],
        ):
            with mock.patch("os.path.isdir", side_effect=isdir):
                with mock.patch("os.makedirs", side_effect=lambda p, **_: makedirs_calls.append(p)):
                    out = resolve_steam_screenshot_output_dir("1234560")
        self.assertEqual(out, expected)
        self.assertEqual(makedirs_calls, [expected])

    def test_merge_recent_screenshot_paths_sorts_by_mtime(self) -> None:
        from backend.services.screenshot_media import merge_recent_screenshot_paths

        with mock.patch(
            "backend.services.screenshot_media.os.path.getmtime",
            side_effect=lambda p: {"a.png": 3.0, "b.png": 9.0, "c.png": 6.0}[os.path.basename(p)],
        ):
            with mock.patch(
                "backend.services.screenshot_media.os.path.realpath",
                side_effect=lambda p: p,
            ):
                merged = merge_recent_screenshot_paths(["a.png"], ["b.png", "c.png"], limit=3)
        self.assertEqual(merged, ["b.png", "c.png", "a.png"])

    def test_merge_recent_screenshot_paths_skips_plugin_mirror_of_steam_shot(self) -> None:
        from backend.services.screenshot_media import merge_recent_screenshot_paths

        steam = ["/u/760/remote/1/screenshots/20260627-172051.png"]
        plugin = ["/data/bonsAI/captures/bonsai-game-20260627-172051.png"]
        with mock.patch(
            "backend.services.screenshot_media.os.path.getmtime",
            side_effect=lambda p: 100.0 if "172051" in p else 50.0,
        ):
            with mock.patch(
                "backend.services.screenshot_media.os.path.realpath",
                side_effect=lambda p: p,
            ):
                merged = merge_recent_screenshot_paths(steam, plugin, limit=5)
        self.assertEqual(merged, steam)

    def test_reencode_oversized_capture_keeps_small_png(self) -> None:
        with mock.patch("os.path.getsize", return_value=500_000):
            with mock.patch("os.path.isfile", return_value=True):
                out = _reencode_oversized_capture("/tmp/small.png")
        self.assertEqual(out, "/tmp/small.png")

    def test_finalize_steam_capture_file_compresses_large_rgba(self) -> None:
        from backend.services.screenshot_media import _finalize_steam_capture_file

        with mock.patch("os.path.getsize", return_value=2_300_000):
            with mock.patch("os.path.isfile", return_value=True):
                with mock.patch(
                    "backend.services.screenshot_media._compress_capture_to_jpeg",
                    return_value="/tmp/cap.jpg",
                ) as compress_mock:
                    out = _finalize_steam_capture_file("/tmp/cap.png")
        compress_mock.assert_called_once()
        self.assertEqual(out, "/tmp/cap.jpg")

    def test_try_gamescope_atom_screenshot_copies_gamescope_png(self) -> None:
        with mock.patch(
            "backend.services.screenshot_media._discover_x11_sessions",
            return_value=[(":1", "")],
        ):
            with mock.patch(
                "backend.services.screenshot_media.subprocess.run",
                return_value=mock.Mock(returncode=0, stderr=b""),
            ):
                with mock.patch(
                    "backend.services.screenshot_media.os.path.isfile",
                    side_effect=lambda path: path in {"/tmp/gamescope.png", "/tmp/out.png"},
                ):
                    with mock.patch("backend.services.screenshot_media.os.path.getsize", return_value=128):
                        with mock.patch("backend.services.screenshot_media.shutil.copy2") as copy_mock:
                            with mock.patch(
                                "backend.services.screenshot_media.os.path.getmtime",
                                return_value=1.0,
                            ):
                                out = try_gamescope_atom_screenshot("/tmp/out.png", False, {})
        self.assertTrue(out.get("success"))
        copy_mock.assert_called_once_with("/tmp/gamescope.png", "/tmp/out.png")


if __name__ == "__main__":
    unittest.main()
