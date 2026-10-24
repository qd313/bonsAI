"""Tests for the build fingerprint the About tab shows (backend/core/build_info.py)."""

import hashlib
import os
import tempfile
import unittest

from backend.core import build_info


class BuildInfoTests(unittest.TestCase):
    def test_build_is_first_twelve_of_the_bundle_sha256(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "dist"))
            data = b"console.log('bonsai');"
            with open(os.path.join(root, "dist", "index.js"), "wb") as f:
                f.write(data)
            info = build_info.read_build_info(root)
        self.assertEqual(info["build"], hashlib.sha256(data).hexdigest()[:12])
        self.assertIsInstance(info["modified"], float)

    def test_missing_bundle_reads_unknown(self):
        with tempfile.TemporaryDirectory() as root:
            info = build_info.read_build_info(root)
        self.assertEqual(info, {"build": "unknown", "modified": None})

    def test_cached_read_happens_once(self):
        build_info._cache = None
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, "dist"))
            path = os.path.join(root, "dist", "index.js")
            with open(path, "wb") as f:
                f.write(b"a")
            first = build_info.get_build_info_cached(root)
            with open(path, "wb") as f:
                f.write(b"b")
            second = build_info.get_build_info_cached(root)
        build_info._cache = None
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
