"""Preview sandbox sysfs mock writes (DECKY_SANDBOX_ROOT)."""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock

from py_modules.backend.services import tdp_service


class TestTdpSandboxSysfs(unittest.TestCase):
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

    def test_write_sysfs_records_jsonl_in_sandbox(self):
        logger = MagicMock()
        tdp_service.write_sysfs("/sys/fake/power1_cap", "8000000", "/no/such/helper", logger)
        rows = tdp_service.read_sandbox_sysfs_writes()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["path"], "/sys/fake/power1_cap")
        self.assertEqual(rows[0]["value"], "8000000")

    def test_apply_tdp_uses_sandbox_when_hwmon_missing(self):
        logger = MagicMock()
        orig_find = tdp_service.find_amdgpu_hwmon
        tdp_service.find_amdgpu_hwmon = lambda: "/sys/class/hwmon/hwmon0"
        try:
            out = tdp_service.apply_tdp({"tdp_watts": 8}, "/no/helper", logger)
            self.assertEqual(out["tdp_watts"], 8)
            rows = tdp_service.read_sandbox_sysfs_writes()
            self.assertTrue(any("power1_cap" in r["path"] for r in rows))
        finally:
            tdp_service.find_amdgpu_hwmon = orig_find


if __name__ == "__main__":
    unittest.main()
