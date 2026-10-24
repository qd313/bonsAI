"""Tests for bounded Proton / Steam log discovery and path allowlisting."""

import os
import tempfile
import unittest
from pathlib import Path

from backend.ask.proton_troubleshooting_logs import (
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

    def test_attached_excerpt_is_capped_to_the_window_budget_keeping_newest_errors(self):
        """D46: 96 KiB of logs was ~25,000 tokens against a 4,096-token window, and Ollama drops
        the start of an overlong prompt silently. The collector still scans up to
        RAW_READ_BUDGET_BYTES but attaches at most TOTAL_LOG_BUDGET_BYTES, error-ish lines first,
        newest last."""
        from unittest.mock import patch

        from backend.ask import proton_troubleshooting_logs as ptl

        with tempfile.TemporaryDirectory() as tmp:
            aid = "777"
            p = os.path.join(tmp, f"steam-{aid}.log")
            lines = []
            for i in range(1, 401):
                lines.append(f"info: frame {i:04d} rendered fine with nothing to report here")
                lines.append(f"err: failure number {i:04d} in the renderer")
            Path(p).write_text("\n".join(lines) + "\n", encoding="utf-8")
            self.assertGreater(os.path.getsize(p), 4 * ptl.TOTAL_LOG_BUDGET_BYTES)

            with patch.object(ptl.sys, "platform", "linux"):
                out = ptl.collect_proton_troubleshooting_logs(aid, home=tmp)

        text = out["text"]
        self.assertTrue(text, "an allowed log under home must be attached")
        body = text.replace(ptl._ATTACHMENT_HEADER, "").replace(ptl._ATTACHMENT_FOOTER, "")
        self.assertLessEqual(len(body.encode("utf-8")), ptl.TOTAL_LOG_BUDGET_BYTES)
        self.assertIn("failure number 0400", text)  # newest error line survives
        self.assertNotIn("failure number 0001", text)  # oldest does not
        self.assertNotIn("rendered fine", text)  # noise lines were filtered before the cut
        self.assertGreater(out["sources"][0]["bytes_read"], ptl.TOTAL_LOG_BUDGET_BYTES)  # scanned more than attached

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

        with patch("backend.ask.proton_troubleshooting_logs.sys.platform", "win32"):
            out = collect_proton_troubleshooting_logs("730")
            self.assertEqual(out["text"], "")
            self.assertEqual(out["sources"], [])
            self.assertTrue(any("not Linux" in w for w in out["warnings"]))


if __name__ == "__main__":
    unittest.main()
