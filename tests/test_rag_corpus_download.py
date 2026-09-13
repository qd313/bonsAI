"""Title: RAG corpus download path

Purpose: Exercise fetch/verify/install end-to-end against a real built manifest, plus the
individual failure modes (mirror fallback, checksum mismatch, chunk layout rejection).
Used for: rag_corpus_download_service, ahead of the first public corpus publish.
Solves: This path had zero test coverage before Phase 6 planning — first public download
would otherwise have been its first real execution.
Does not: Touch the network. Every urllib.request.urlopen call is faked.
"""

from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import sqlite3
import tempfile
import threading
import unittest
import zlib
from pathlib import Path
from unittest import mock

from backend.services.rag_corpus_download_service import (
    fetch_remote_manifest,
    install_corpus_from_manifest,
)
from corpus_build_support import build_corpus_or_skip

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = "backend.services.rag_corpus_download_service"


def _load_build_rag_db():
    path = REPO_ROOT / "scripts" / "build_rag_db.py"
    spec = importlib.util.spec_from_file_location("build_rag_db", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _FakeHTTPResponse:
    """Stands in for an http.client.HTTPResponse: read(amt=None) and a headers dict."""

    def __init__(self, payload: bytes, *, headers: dict | None = None):
        self._buf = io.BytesIO(payload)
        self.headers = dict(headers or {})
        self.headers.setdefault("Content-Length", str(len(payload)))

    def read(self, amt=None):
        return self._buf.read(amt)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _minimal_sqlite_bytes() -> bytes:
    """A tiny but real SQLite file — enough for _verify_sqlite's sqlite_master query."""
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "mini.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE t(x)")
        conn.commit()
        conn.close()
        return db_path.read_bytes()


def _make_zlib_chunk(db_bytes: bytes) -> tuple[bytes, str, str]:
    """Returns (compressed_bytes, compressed_sha256, db_sha256)."""
    compressed = zlib.compress(db_bytes, level=9)
    return compressed, hashlib.sha256(compressed).hexdigest(), hashlib.sha256(db_bytes).hexdigest()


def _base_manifest(chunk_filename: str, compressed_sha: str, db_sha: str, compressed_bytes_len: int) -> dict:
    return {
        "version": "2026.08.14",
        "chunks": [
            {"filename": chunk_filename, "sha256": compressed_sha, "bytes": compressed_bytes_len}
        ],
        "uncompressed_bytes": 0,
        "urls": {
            "huggingface": f"https://huggingface.co/datasets/qd313/bonsai-knowledge-base/resolve/main/{chunk_filename}",
            "github_release": f"https://github.com/qd313/bonsAI/releases/download/knowledge-base-v1/{chunk_filename}",
        },
        "db_sha256": db_sha,
        "attributions_markdown": "# Test corpus\n\nMaintainer-authored only.\n",
    }


class RagCorpusDownloadRoundTripTests(unittest.TestCase):
    """Highest-value test: a manifest this repo's own builder produces installs cleanly."""

    def test_round_trip_install_matches_built_corpus(self):
        build_rag_db = _load_build_rag_db()
        with tempfile.TemporaryDirectory() as build_tmp, tempfile.TemporaryDirectory() as home_tmp:
            build_dir = Path(build_tmp) / "kb"
            manifest = build_corpus_or_skip(build_rag_db, build_dir, seed=True)
            chunk_filename = manifest["chunks"][0]["filename"]
            chunk_bytes = (build_dir / chunk_filename).read_bytes()

            def _fake_open(req, timeout=None):
                return _FakeHTTPResponse(chunk_bytes)

            fake_home = Path(home_tmp)
            install_dir = fake_home / ".bonsai" / "rag"
            with mock.patch("pathlib.Path.home", return_value=fake_home), mock.patch(
                f"{MODULE_PATH}.urllib.request.urlopen", side_effect=_fake_open
            ) as mock_open:
                root = install_corpus_from_manifest(
                    manifest,
                    str(install_dir),
                    cancel_event=threading.Event(),
                    log=lambda *_a, **_k: None,
                )

            self.assertEqual(mock_open.call_count, 1)
            root_path = Path(root)
            self.assertTrue((root_path / "corpus.db").is_file())
            self.assertTrue((root_path / "corpus-manifest.json").is_file())

            attrib = (root_path / "ATTRIBUTIONS.md").read_text(encoding="utf-8")
            self.assertEqual(attrib, manifest["attributions_markdown"].strip() + "\n")

            built = sqlite3.connect(str(build_dir / "corpus.db"))
            installed = sqlite3.connect(str(root_path / "corpus.db"))
            try:
                built_count = built.execute("SELECT count(*) FROM sections").fetchone()[0]
                installed_count = installed.execute("SELECT count(*) FROM sections").fetchone()[0]
            finally:
                built.close()
                installed.close()
            self.assertGreater(installed_count, 0)
            self.assertEqual(built_count, installed_count)

    def test_existing_chunk_with_matching_hash_is_reused_without_download(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, db_sha = _make_zlib_chunk(db_bytes)
        manifest = _base_manifest("corpus.db.zlib", compressed_sha, db_sha, len(compressed))

        with tempfile.TemporaryDirectory() as home_tmp:
            fake_home = Path(home_tmp)
            install_dir = fake_home / ".bonsai" / "rag"
            install_dir.mkdir(parents=True)
            # Pre-place the chunk with the correct hash — no download should occur.
            (install_dir / "corpus.db.zlib").write_bytes(compressed)

            with mock.patch("pathlib.Path.home", return_value=fake_home), mock.patch(
                f"{MODULE_PATH}.urllib.request.urlopen"
            ) as mock_open:
                root = install_corpus_from_manifest(
                    manifest,
                    str(install_dir),
                    cancel_event=threading.Event(),
                    log=lambda *_a, **_k: None,
                )

            mock_open.assert_not_called()
            self.assertTrue((Path(root) / "corpus.db").is_file())


class RagCorpusDownloadManifestFallbackTests(unittest.TestCase):
    def test_falls_back_to_github_when_hf_fails(self):
        good_manifest = {"version": "2026.08.14", "chunks": []}

        def _fake_open(req, timeout=None):
            if "huggingface.co" in req.full_url:
                raise TimeoutError("hf unreachable")
            return _FakeHTTPResponse(
                __import__("json").dumps(good_manifest).encode("utf-8")
            )

        with mock.patch(f"{MODULE_PATH}.urllib.request.urlopen", side_effect=_fake_open):
            manifest = fetch_remote_manifest(
                hf_url="https://huggingface.co/datasets/qd313/bonsai-knowledge-base/resolve/main/corpus-manifest.json",
                github_url="https://github.com/qd313/bonsAI/releases/download/knowledge-base-v1/corpus-manifest.json",
            )
        self.assertEqual(manifest["version"], "2026.08.14")

    def test_raises_aggregated_error_when_both_mirrors_fail(self):
        def _fake_open(req, timeout=None):
            raise TimeoutError(f"unreachable: {req.full_url}")

        with mock.patch(f"{MODULE_PATH}.urllib.request.urlopen", side_effect=_fake_open):
            with self.assertRaises(RuntimeError) as ctx:
                fetch_remote_manifest(
                    hf_url="https://huggingface.co/x/corpus-manifest.json",
                    github_url="https://github.com/x/y/corpus-manifest.json",
                )
        message = str(ctx.exception)
        self.assertIn("huggingface", message)
        self.assertIn("github", message)


class RagCorpusDownloadVerificationTests(unittest.TestCase):
    @contextlib.contextmanager
    def _install(self, manifest, *, urlopen_side_effect):
        """Context manager, not a plain call: the install directory is a TemporaryDirectory,
        which deletes itself on scope exit — a plain `return root` would hand back a path
        whose files are already gone by the time the caller inspects them. Callers that need
        to look at the installed files do so with `with self._install(...) as (root, mock):`.
        """
        with tempfile.TemporaryDirectory() as home_tmp:
            fake_home = Path(home_tmp)
            install_dir = fake_home / ".bonsai" / "rag"
            with mock.patch("pathlib.Path.home", return_value=fake_home), mock.patch(
                f"{MODULE_PATH}.urllib.request.urlopen", side_effect=urlopen_side_effect
            ) as mock_open:
                root = install_corpus_from_manifest(
                    manifest,
                    str(install_dir),
                    cancel_event=threading.Event(),
                    log=lambda *_a, **_k: None,
                )
                yield root, mock_open

    def test_chunk_checksum_mismatch_retries_next_mirror(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, db_sha = _make_zlib_chunk(db_bytes)
        manifest = _base_manifest("corpus.db.zlib", compressed_sha, db_sha, len(compressed))

        calls = []

        def _fake_open(req, timeout=None):
            calls.append(req.full_url)
            if "huggingface.co" in req.full_url:
                # Serve corrupt bytes from the primary mirror.
                return _FakeHTTPResponse(b"not the right bytes at all")
            return _FakeHTTPResponse(compressed)

        with self._install(manifest, urlopen_side_effect=_fake_open) as (root, _mock_open):
            self.assertTrue((Path(root) / "corpus.db").is_file())
        self.assertEqual(len(calls), 2)
        self.assertIn("huggingface.co", calls[0])
        self.assertIn("github.com", calls[1])

    def test_decompressed_db_checksum_mismatch_is_terminal_no_retry(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, _real_db_sha = _make_zlib_chunk(db_bytes)
        # Per-chunk sha is correct (download itself is fine); db_sha256 is wrong, so the
        # mismatch is only detectable after decompression — and must not trigger a retry.
        manifest = _base_manifest("corpus.db.zlib", compressed_sha, "0" * 64, len(compressed))

        calls = []

        def _fake_open(req, timeout=None):
            calls.append(req.full_url)
            return _FakeHTTPResponse(compressed)

        with self.assertRaises(RuntimeError) as ctx, self._install(
            manifest, urlopen_side_effect=_fake_open
        ):
            pass
        self.assertIn("checksum mismatch", str(ctx.exception).lower())
        self.assertEqual(len(calls), 1, "a post-decompression mismatch must not retry a mirror")

    def test_unsupported_chunk_layout_rejected_for_multiple_chunks(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, db_sha = _make_zlib_chunk(db_bytes)
        manifest = _base_manifest("corpus.db.zlib", compressed_sha, db_sha, len(compressed))
        manifest["chunks"].append({"filename": "corpus.db.zlib.part2", "sha256": "", "bytes": 0})

        def _fake_open(req, timeout=None):
            return _FakeHTTPResponse(compressed if "zlib" in req.full_url else b"x")

        with self.assertRaises(RuntimeError) as ctx, self._install(
            manifest, urlopen_side_effect=_fake_open
        ):
            pass
        self.assertIn("Unsupported chunk layout", str(ctx.exception))

    def test_non_zlib_chunk_filename_rejected(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, db_sha = _make_zlib_chunk(db_bytes)
        manifest = _base_manifest("corpus.db.gz", compressed_sha, db_sha, len(compressed))

        def _fake_open(req, timeout=None):
            return _FakeHTTPResponse(compressed)

        with self.assertRaises(RuntimeError) as ctx, self._install(
            manifest, urlopen_side_effect=_fake_open
        ):
            pass
        self.assertIn("Unsupported chunk layout", str(ctx.exception))

    def test_chunk_filename_with_path_separator_rejected(self):
        manifest = _base_manifest("../evil.zlib", "", "", 0)

        def _fake_open(req, timeout=None):
            raise AssertionError("must not reach the network for an invalid filename")

        with self.assertRaises(RuntimeError) as ctx, self._install(
            manifest, urlopen_side_effect=_fake_open
        ):
            pass
        self.assertIn("Invalid chunk filename", str(ctx.exception))

    def test_attributions_written_from_manifest_never_downloaded(self):
        db_bytes = _minimal_sqlite_bytes()
        compressed, compressed_sha, db_sha = _make_zlib_chunk(db_bytes)
        manifest = _base_manifest("corpus.db.zlib", compressed_sha, db_sha, len(compressed))
        manifest["attributions_markdown"] = "# Only From Manifest\n"

        requested_filenames = []

        def _fake_open(req, timeout=None):
            requested_filenames.append(req.full_url.rsplit("/", 1)[-1])
            return _FakeHTTPResponse(compressed)

        with self._install(manifest, urlopen_side_effect=_fake_open) as (root, _mock_open):
            self.assertNotIn("ATTRIBUTIONS.md", requested_filenames)
            self.assertEqual(
                (Path(root) / "ATTRIBUTIONS.md").read_text(encoding="utf-8"),
                "# Only From Manifest\n",
            )


if __name__ == "__main__":
    unittest.main()
