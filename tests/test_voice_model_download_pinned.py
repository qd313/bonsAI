"""Title: The speech model download is pinned and checked

Purpose: The 0.6.0 security review (finding 8) found the speech model was fetched from the
moving `main` branch with no check. This pins both files to one exact commit, and checks every
download against its known size and SHA-256, deleting the file when either is wrong.
Used for: voice_model_download_service.download_voice_model.
Does not: Touch the network; the download itself is replaced by a fake.
"""

import hashlib
import os
import re
import tempfile
import threading
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.services import voice_model_download_service as svc  # noqa: E402

# The files already on the maintainer's Deck. A pinned file has to match these so a model that
# is installed today still passes.
DECK_FILES = {
    "tiny.en": (
        "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f",
        77_704_715,
    ),
    "base.en": (
        "a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002",
        147_964_211,
    ),
}


class PinnedSpecTests(unittest.TestCase):
    def test_both_urls_are_pinned_to_one_exact_commit(self):
        commits = set()
        for model_id, spec in svc.VOICE_STT_MODEL_SPECS.items():
            with self.subTest(model=model_id):
                m = re.fullmatch(
                    r"https://huggingface\.co/ggerganov/whisper\.cpp/resolve/([0-9a-f]{40})/"
                    + re.escape(spec["filename"]),
                    spec["url"],
                )
                self.assertIsNotNone(m, spec["url"])
                commits.add(m.group(1))
        self.assertEqual(len(commits), 1)

    def test_the_expected_checksums_match_the_files_already_on_the_deck(self):
        for model_id, (sha, size) in DECK_FILES.items():
            with self.subTest(model=model_id):
                spec = svc.VOICE_STT_MODEL_SPECS[model_id]
                self.assertEqual(spec["sha256"], sha)
                self.assertEqual(spec["bytes"], size)


class DownloadCheckTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.good = b"pretend speech model" * 50
        spec = dict(svc.VOICE_STT_MODEL_SPECS["tiny.en"])
        spec["sha256"] = hashlib.sha256(self.good).hexdigest()
        spec["bytes"] = len(self.good)
        patcher = patch.dict(svc.VOICE_STT_MODEL_SPECS, {"tiny.en": spec})
        patcher.start()
        self.addCleanup(patcher.stop)
        self.dest = svc.voice_model_path(self.tmp.name, self.tmp.name, "tiny.en")

    def run_download(self, payload: bytes):
        caps = {}

        def fake_download(url, tmp_path, cancel_event, on_progress=None, max_bytes=None):
            caps["max_bytes"] = max_bytes
            with open(tmp_path, "wb") as fh:
                fh.write(payload)

        state = svc.new_voice_install_state()
        with patch.object(svc, "_download_model_file", side_effect=fake_download):
            try:
                svc.download_voice_model(
                    self.tmp.name, self.tmp.name, "tiny.en", state, threading.Event()
                )
                err = None
            except Exception as exc:  # noqa: BLE001
                err = exc
        return state, err, caps

    def test_a_file_that_matches_is_kept(self):
        state, err, caps = self.run_download(self.good)
        self.assertIsNone(err)
        self.assertEqual(state["phase"], "done")
        self.assertTrue(os.path.isfile(self.dest))
        self.assertEqual(caps["max_bytes"], len(self.good))

    def test_same_size_wrong_content_is_deleted_and_reported(self):
        bad = b"X" * len(self.good)
        state, err, _ = self.run_download(bad)
        self.assertIsNotNone(err)
        self.assertEqual(state["phase"], "failed")
        self.assertIn("checksum", state["error"].lower())
        self.assertFalse(os.path.exists(self.dest))
        self.assertFalse(os.path.exists(self.dest + ".part"))

    def test_a_file_of_the_wrong_size_is_deleted(self):
        for payload in (self.good + b"extra", self.good[:-1]):
            with self.subTest(size=len(payload)):
                state, err, _ = self.run_download(payload)
                self.assertIsNotNone(err)
                self.assertEqual(state["phase"], "failed")
                self.assertFalse(os.path.exists(self.dest))
                self.assertFalse(os.path.exists(self.dest + ".part"))

    def test_an_already_installed_model_is_not_hashed_again(self):
        os.makedirs(os.path.dirname(self.dest), exist_ok=True)
        with open(self.dest, "wb") as fh:
            fh.write(b"Y" * len(self.good))  # the pinned size, but not the pinned bytes
        with patch.object(svc, "_download_model_file") as fake:
            state = svc.new_voice_install_state()
            svc.download_voice_model(self.tmp.name, self.tmp.name, "tiny.en", state, threading.Event())
        fake.assert_not_called()
        self.assertEqual(state["phase"], "done")


class SizeCapTests(unittest.TestCase):
    def test_the_fallback_downloader_stops_at_the_size_cap(self):
        class FakeResp:
            headers = {}

            def __init__(self):
                self.left = 10

            def read(self, n):
                if self.left <= 0:
                    return b""
                self.left -= 1
                return b"z" * 100

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        with tempfile.TemporaryDirectory() as d, patch.object(
            svc.shutil, "which", return_value=None
        ), patch.object(svc, "urlopen_with_ca_fallback", return_value=FakeResp()):
            with self.assertRaises(RuntimeError) as ctx:
                svc._download_model_file(
                    "https://example.invalid/x", os.path.join(d, "x.part"), threading.Event(), None, 250
                )
        self.assertIn("larger", str(ctx.exception).lower())


if __name__ == "__main__":
    unittest.main()
