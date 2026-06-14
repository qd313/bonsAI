"""Tests for bounded Proton / Steam log discovery and path allowlisting."""

import os
import tempfile
import unittest
from pathlib import Path

from backend.services.proton_troubleshooting_logs import (
    collect_proton_troubleshooting_logs,
    path_allowed_for_proton_log,
    read_file_tail_bytes,
)


class ProtonTroubleshootingLogsTests(unittest.TestCase):
    """Path safety and tail-read helpers for log attachment."""

    def test_path_allowed_home_steam_app_log(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            aid = "12345"
            p = os.path.join(home, f"steam-{aid}.log")
            Path(p).write_text("wine: ok\n", encoding="utf-8")
            self.assertTrue(path_allowed_for_proton_log(p, aid, home))

    def test_path_allowed_rejects_app_id_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            aid = "12345"
            p = os.path.join(tmp, "steam-99999.log")
            Path(p).write_text("x", encoding="utf-8")
            self.assertFalse(path_allowed_for_proton_log(p, aid, home))

    def test_path_allowed_compatdata_direct_child(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            aid = "42"
            steam = os.path.join(home, ".local", "share", "Steam")
            cdir = os.path.join(steam, "steamapps", "compatdata", aid)
            os.makedirs(cdir, exist_ok=True)
            p = os.path.join(cdir, "game.log")
            Path(p).write_text("err: boom\n", encoding="utf-8")
            self.assertTrue(path_allowed_for_proton_log(p, aid, home))

    def test_path_allowed_rejects_nested_under_compatdata(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            aid = "42"
            steam = os.path.join(home, ".local", "share", "Steam")
            cdir = os.path.join(steam, "steamapps", "compatdata", aid)
            nested = os.path.join(cdir, "pfx", "drive_c", "x.log")
            os.makedirs(os.path.dirname(nested), exist_ok=True)
            Path(nested).write_text("nope", encoding="utf-8")
            self.assertFalse(path_allowed_for_proton_log(nested, aid, home))

    def test_read_file_tail_bytes_truncates(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "big.bin")
            body = b"a" * 5000
            Path(p).write_bytes(body)
            tail = read_file_tail_bytes(p, 100)
            self.assertEqual(len(tail), 100)
            self.assertTrue(tail.endswith(b"a" * 100))

    def test_collect_non_linux_warns(self):
        from unittest.mock import patch

        with patch("backend.services.proton_troubleshooting_logs.sys.platform", "win32"):
            out = collect_proton_troubleshooting_logs("730")
            self.assertEqual(out["text"], "")
            self.assertEqual(out["sources"], [])
            self.assertTrue(any("not Linux" in w for w in out["warnings"]))


if __name__ == "__main__":
    unittest.main()
