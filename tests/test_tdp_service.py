"""TDP reads and the preview sandbox hwmon path (the sysfs write path and its write log were removed 2026-08-02)."""

import os
import tempfile
import unittest
from unittest.mock import MagicMock

from py_modules.backend.power import tdp_service


class TdpSandboxTests(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._prev = os.environ.get("DECKY_SANDBOX_ROOT")
        os.environ["DECKY_SANDBOX_ROOT"] = self._tmpdir.name

    def tearDown(self):
        if self._prev is None:
            os.environ.pop("DECKY_SANDBOX_ROOT", None)
        else:
            os.environ["DECKY_SANDBOX_ROOT"] = self._prev
        self._tmpdir.cleanup()

    def test_find_amdgpu_hwmon_in_sandbox_preview(self):
        self.assertEqual(
            tdp_service.find_amdgpu_hwmon(),
            "/sys/class/hwmon/hwmon-amdgpu-preview",
        )

    def test_sandbox_root_reads_from_env(self):
        self.assertEqual(tdp_service.sandbox_sysfs_root(), self._tmpdir.name)


class TdpReadTests(unittest.TestCase):
    def test_read_current_tdp_watts_converts_microwatts(self):
        logger = MagicMock()
        with tempfile.TemporaryDirectory() as tmp:
            hwmon = os.path.join(tmp, "hwmon0")
            os.makedirs(hwmon)
            with open(os.path.join(hwmon, "power1_cap"), "w", encoding="utf-8") as f:
                f.write("8000000")

            original = tdp_service.find_amdgpu_hwmon
            tdp_service.find_amdgpu_hwmon = lambda: hwmon
            try:
                self.assertEqual(tdp_service.read_current_tdp_watts(logger), 8)
            finally:
                tdp_service.find_amdgpu_hwmon = original

    def test_read_current_tdp_watts_returns_none_without_hwmon(self):
        logger = MagicMock()
        original = tdp_service.find_amdgpu_hwmon
        tdp_service.find_amdgpu_hwmon = lambda: None
        try:
            self.assertIsNone(tdp_service.read_current_tdp_watts(logger))
        finally:
            tdp_service.find_amdgpu_hwmon = original


if __name__ == "__main__":
    unittest.main()
