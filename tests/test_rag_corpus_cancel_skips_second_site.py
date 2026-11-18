"""Title: A stopped library download does not open a connection to its second site

Purpose: The library download tries the Hugging Face copy first and the GitHub copy second. These tests pin, at the
level the Deck check looks at (the connections that are really opened after a stop), that a stop pressed during the
first site ends the download as cancelled without opening any connection to the second site, whether the first site
was stopped mid-download or failed at the moment the stop arrived, and that nothing is left on disk. A download
that is not stopped still falls back to the second site when the first one fails.
Used for: rag_corpus_download_service.install_corpus_from_manifest.
Does not: Touch the network; the connection opener is replaced by a stand-in that writes down each address.
"""

import os
import tempfile
import threading
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_download_service as svc  # noqa: E402

HF = "https://hf.example.invalid/lib/manifest.json"
GH = "https://gh.example.invalid/lib/manifest.json"
MANIFEST = {
    "chunks": [{"filename": "corpus-1.zlib", "sha256": "ab" * 32, "bytes": 1_000_000}],
    "db_sha256": "cd" * 32,
    "uncompressed_bytes": 1,
    "urls": {"huggingface": HF, "github_release": GH},
}


class _Reply:
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


def _run(opener, cancel):
    opened: list[str] = []

    def spy(url, *a, **k):
        opened.append(url if isinstance(url, str) else getattr(url, "full_url", str(url)))
        return opener(url)

    with tempfile.TemporaryDirectory() as d, patch.object(svc, "urlopen_with_ca_fallback", spy), patch.object(
        svc, "_free_bytes", return_value=0
    ):
        error = ""
        try:
            svc.install_corpus_from_manifest(MANIFEST, d, cancel_event=cancel, log=lambda _m: None)
        except RuntimeError as exc:
            error = str(exc)
        left = [f for _root, _dirs, files in os.walk(d) for f in files]
    return opened, error, left


class AStopDuringTheFirstSite(unittest.TestCase):
    def test_a_stop_mid_download_never_opens_the_second_site(self):
        cancel = threading.Event()
        opened, error, left = _run(lambda _u: _Reply(cancel), cancel)
        self.assertEqual(len(opened), 1, opened)
        self.assertIn("hf.example.invalid", opened[0])
        self.assertEqual(error, "Cancelled.")
        self.assertEqual(left, [])

    def test_a_first_site_that_fails_as_the_stop_arrives_does_not_fall_through_to_the_second(self):
        cancel = threading.Event()

        def failing(_url):
            cancel.set()
            raise OSError("connection reset")

        opened, error, left = _run(failing, cancel)
        self.assertEqual(len(opened), 1, opened)
        self.assertEqual(error, "Cancelled.")
        self.assertEqual(left, [])

    def test_without_a_stop_a_failed_first_site_still_falls_back_to_the_second(self):
        cancel = threading.Event()

        def first_fails(url):
            raise OSError("first site is down")

        opened, error, _left = _run(first_fails, cancel)
        self.assertEqual(len(opened), 2, opened)
        self.assertIn("hf.example.invalid", opened[0])
        self.assertIn("gh.example.invalid", opened[1])
        self.assertNotEqual(error, "Cancelled.")


if __name__ == "__main__":
    unittest.main()
