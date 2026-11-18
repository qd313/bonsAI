"""Plan 106, lane R2 (security review item 3): a stopped library download leaves no `.part` file behind.

The download writes each chunk to `<name>.part` and renames it when it is whole. A stop (or a failure) part-way
removed the final name but not the `.part` file, so a cancelled download left megabytes on the Deck.
"""

import os
import tempfile
import threading
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_download_service as svc  # noqa: E402

MANIFEST = {
    "chunks": [{"filename": "corpus-1.zlib", "sha256": "ab" * 32, "bytes": 1_000_000}],
    "db_sha256": "cd" * 32,
    "uncompressed_bytes": 1,
    "urls": {"huggingface": "https://example.invalid/lib/manifest.json"},
}


class _Reply:
    """A download that is stopped after its second read."""

    headers = {"Content-Length": "1000000"}

    def __init__(self, cancel: threading.Event):
        self.cancel, self.reads = cancel, 0

    def read(self, _n):
        self.reads += 1
        if self.reads == 2:
            self.cancel.set()
        return b"z" * 4096

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


class ACancelledLibraryDownloadLeavesNothingBehind(unittest.TestCase):
    def test_a_stop_part_way_removes_the_part_file_too(self):
        cancel = threading.Event()
        with tempfile.TemporaryDirectory() as d, patch.object(
            svc, "urlopen_with_ca_fallback", lambda *_a, **_k: _Reply(cancel)
        ), patch.object(svc, "_free_bytes", return_value=0):
            with self.assertRaises(RuntimeError):
                svc.install_corpus_from_manifest(MANIFEST, d, cancel_event=cancel, log=lambda _m: None)
            left = [f for _root, _dirs, files in os.walk(d) for f in files]
        self.assertEqual(left, [])


if __name__ == "__main__":
    unittest.main()
