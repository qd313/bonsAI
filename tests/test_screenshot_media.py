"""Unit tests for Steam screenshot path helpers and VDF window parsing."""

import os
import unittest
from unittest import mock

from backend.services.screenshot_media import (
    extract_app_id_from_screenshot_path,
    lookup_screenshot_vdf_metadata,
    lookup_steam_app_name,
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


if __name__ == "__main__":
    unittest.main()
