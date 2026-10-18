"""Tests for backend.media.clipboard_service.write_host_clipboard_text.

No real wl-copy/xclip on this desk (Windows dev host, no Wayland session) — subprocess is mocked
throughout. See docs/audit/clipboard-spike-2026-08-28.md for what selection-ownership behavior is
still owed a real Deck.
"""

from __future__ import annotations

import subprocess
import unittest
from unittest.mock import MagicMock, patch

from backend.media.clipboard_service import write_host_clipboard_text


def _fake_logger() -> MagicMock:
    return MagicMock()


class WriteHostClipboardTextTests(unittest.TestCase):
    def test_rejects_empty_text_without_touching_subprocess(self):
        with patch("backend.media.clipboard_service.subprocess.Popen") as popen:
            result = write_host_clipboard_text("   ", _fake_logger())
        self.assertFalse(result.get("success"))
        self.assertEqual(result.get("error"), "Nothing to copy.")
        popen.assert_not_called()

    def test_rejects_non_string_text(self):
        result = write_host_clipboard_text(None, _fake_logger())  # type: ignore[arg-type]
        self.assertFalse(result.get("success"))

    def test_missing_helper_script_reports_error(self):
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=False):
            result = write_host_clipboard_text("hello", _fake_logger())
        self.assertFalse(result.get("success"))
        self.assertIn("missing", result.get("error", ""))

    def test_success_starts_detached_and_pipes_text_on_stdin(self):
        fake_proc = MagicMock()
        fake_proc.communicate.return_value = ("", "")
        fake_proc.returncode = 0
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=True), patch(
            "backend.media.clipboard_service.subprocess.Popen", return_value=fake_proc
        ) as popen:
            result = write_host_clipboard_text("copy me", _fake_logger())

        self.assertTrue(result.get("success"))
        _, kwargs = popen.call_args
        # The mitigation the spike doc calls for: a signal to this plugin's process group must not
        # reach the detached wl-copy holder.
        self.assertTrue(kwargs.get("start_new_session"))
        fake_proc.communicate.assert_called_once()
        self.assertEqual(fake_proc.communicate.call_args.kwargs.get("input"), "copy me")

    def test_nonzero_exit_reports_stderr(self):
        fake_proc = MagicMock()
        fake_proc.communicate.return_value = ("", "wl-copy and xclip unavailable")
        fake_proc.returncode = 1
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=True), patch(
            "backend.media.clipboard_service.subprocess.Popen", return_value=fake_proc
        ):
            result = write_host_clipboard_text("copy me", _fake_logger())

        self.assertFalse(result.get("success"))
        self.assertIn("unavailable", result.get("error", ""))

    def test_timeout_kills_the_process_and_reports_error(self):
        fake_proc = MagicMock()
        # First call (with the input/timeout kwargs) times out; the reap call after `.kill()` must
        # succeed or the mock itself would raise past the code under test.
        fake_proc.communicate.side_effect = [
            subprocess.TimeoutExpired(cmd="write_host_clipboard.sh", timeout=6),
            ("", ""),
        ]
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=True), patch(
            "backend.media.clipboard_service.subprocess.Popen", return_value=fake_proc
        ):
            result = write_host_clipboard_text("copy me", _fake_logger())

        self.assertFalse(result.get("success"))
        self.assertIn("timed out", result.get("error", "").lower())
        fake_proc.kill.assert_called_once()

    def test_popen_start_failure_reports_error_without_raising(self):
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=True), patch(
            "backend.media.clipboard_service.subprocess.Popen", side_effect=OSError("no bash")
        ):
            result = write_host_clipboard_text("copy me", _fake_logger())

        self.assertFalse(result.get("success"))
        self.assertIn("failed to start", result.get("error", ""))

    def test_text_is_truncated_to_max_clipboard_chars(self):
        fake_proc = MagicMock()
        fake_proc.communicate.return_value = ("", "")
        fake_proc.returncode = 0
        long_text = "x" * 100000
        with patch("backend.media.clipboard_service.os.path.isfile", return_value=True), patch(
            "backend.media.clipboard_service.subprocess.Popen", return_value=fake_proc
        ):
            write_host_clipboard_text(long_text, _fake_logger())

        sent = fake_proc.communicate.call_args.kwargs.get("input")
        self.assertEqual(len(sent), 65536)


if __name__ == "__main__":
    unittest.main()
