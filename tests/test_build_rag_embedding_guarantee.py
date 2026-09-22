"""Title: Corpus build refuses to finish with a missing meaning index

Purpose: Pin the guarantee that a note or tip cannot reach a device with no meaning-search
vector unless the maintainer explicitly says so.
Used for: scripts/build_rag_db.py build_corpus / _populate_vectors_for_table.
Solves: build_rag_db.py:559-633 only printed a warning in three cases that each let an
  unindexed row ship silently — the embedding model missing from the build machine (every row
  unindexed), a run stopping partway through ("partially populated, re-run the build", exit 0
  anyway), and one row's vector coming back the wrong size and being skipped with `continue`.
Does not: Change what "usable" means for a corpus already on a Deck (see
  knowledge_base_schema.py's corpus_has_usable_*_vectors, deliberately left alone — an older
  library already installed there must not lose meaning search just because this file shipped).
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from rag_corpus_seed_fixtures import compat_payload as _compat_payload
from rag_corpus_seed_fixtures import seed_payload as _seed_payload

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_build_rag_db():
    path = REPO_ROOT / "scripts" / "build_rag_db.py"
    spec = importlib.util.spec_from_file_location("build_rag_db_embed_guarantee", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _GuaranteeTestBase(unittest.TestCase):
    """Builds a small, fully controlled corpus (2 sections, 2 compat tips) so every test's
    totals are known — never the live, actively-edited data/kb/strategy_seed.json."""

    def setUp(self):
        self.mod = _load_build_rag_db()
        self._tmp = tempfile.TemporaryDirectory()
        kb_dir = Path(self._tmp.name) / "kb_data"
        kb_dir.mkdir()
        (kb_dir / "strategy_seed.json").write_text(json.dumps(_seed_payload(2)), encoding="utf-8")
        (kb_dir / "compat_patterns.json").write_text(json.dumps(_compat_payload(2)), encoding="utf-8")
        self._out_dir = Path(self._tmp.name) / "out"
        self._orig_kb_data_dir = self.mod.KB_DATA_DIR
        self.mod.KB_DATA_DIR = kb_dir

    def tearDown(self):
        self.mod.KB_DATA_DIR = self._orig_kb_data_dir
        self._tmp.cleanup()


class ModelNotInstalledTests(_GuaranteeTestBase):
    """Path 1: the embedding model is not on the build machine — every card unindexed."""

    def test_build_refuses_then_succeeds_and_records_with_the_flag(self):
        self.mod._list_installed_ollama_tags = lambda *a, **k: []  # model not installed

        with self.assertRaises(SystemExit) as caught:
            self.mod.build_corpus(self._out_dir, seed=True)
        self.assertIn("4 card(s)", str(caught.exception))
        self.assertFalse((self._out_dir / self.mod.CORPUS_MANIFEST_FILENAME).exists())

        manifest = self.mod.build_corpus(self._out_dir, seed=True, allow_missing_embeddings=True)
        self.assertEqual(manifest["embedding_section_count"], 0)
        self.assertEqual(manifest["embedding_section_total_count"], 2)
        self.assertEqual(manifest["embedding_compat_count"], 0)
        self.assertEqual(manifest["embedding_compat_total_count"], 2)
        self.assertEqual(manifest["embedding_missing_count"], 4)
        self.assertFalse(manifest["embeddings_populated"])


class PartialRunTests(_GuaranteeTestBase):
    """Path 2: the run stops partway through — some rows landed, then the host stopped
    answering."""

    def test_build_refuses_then_succeeds_and_records_with_the_flag(self):
        self.mod.EMBED_BATCH_SIZE = 1  # force multiple batches out of 2 rows
        self.mod._list_installed_ollama_tags = lambda *a, **k: [self.mod.DEFAULT_EMBEDDING_MODEL]
        dim = self.mod.DEFAULT_EMBEDDING_DIM
        calls = {"n": 0}

        def fake_embed(base_http, texts, *, model, timeout_s):
            calls["n"] += 1
            if calls["n"] == 2:
                raise self.mod._BuildEmbedError("connection reset")
            return [[0.0] * dim for _ in texts]

        self.mod._embed_texts_build = fake_embed

        with self.assertRaises(SystemExit) as caught:
            self.mod.build_corpus(self._out_dir, seed=True)
        self.assertIn("1 card(s)", str(caught.exception))

        calls["n"] = 0
        manifest = self.mod.build_corpus(self._out_dir, seed=True, allow_missing_embeddings=True)
        self.assertEqual(manifest["embedding_section_count"], 1)
        self.assertEqual(manifest["embedding_section_total_count"], 2)
        self.assertEqual(manifest["embedding_compat_count"], 2)
        self.assertEqual(manifest["embedding_compat_total_count"], 2)
        self.assertEqual(manifest["embedding_missing_count"], 1)
        self.assertTrue(manifest["embeddings_populated"])


class WrongDimensionTests(_GuaranteeTestBase):
    """Path 3: one row's vector comes back the wrong size and is skipped."""

    def test_build_refuses_then_succeeds_and_records_with_the_flag(self):
        self.mod._list_installed_ollama_tags = lambda *a, **k: [self.mod.DEFAULT_EMBEDDING_MODEL]
        dim = self.mod.DEFAULT_EMBEDDING_DIM

        def fake_embed(base_http, texts, *, model, timeout_s):
            # First row's vector is right-sized; every other row comes back one short.
            return [([0.0] * dim) if i == 0 else ([0.0] * (dim - 1)) for i in range(len(texts))]

        self.mod._embed_texts_build = fake_embed

        with self.assertRaises(SystemExit) as caught:
            self.mod.build_corpus(self._out_dir, seed=True)
        self.assertIn("2 card(s)", str(caught.exception))

        manifest = self.mod.build_corpus(self._out_dir, seed=True, allow_missing_embeddings=True)
        self.assertEqual(manifest["embedding_section_count"], 1)
        self.assertEqual(manifest["embedding_section_total_count"], 2)
        self.assertEqual(manifest["embedding_compat_count"], 1)
        self.assertEqual(manifest["embedding_compat_total_count"], 2)
        self.assertEqual(manifest["embedding_missing_count"], 2)


class FullyIndexedBuildTests(_GuaranteeTestBase):
    """Sanity guard: a build with nothing missing must not need the flag."""

    def test_build_succeeds_without_the_flag_when_nothing_is_missing(self):
        self.mod._list_installed_ollama_tags = lambda *a, **k: [self.mod.DEFAULT_EMBEDDING_MODEL]
        dim = self.mod.DEFAULT_EMBEDDING_DIM
        self.mod._embed_texts_build = lambda base_http, texts, *, model, timeout_s: [
            [0.0] * dim for _ in texts
        ]

        manifest = self.mod.build_corpus(self._out_dir, seed=True)
        self.assertEqual(manifest["embedding_missing_count"], 0)
        self.assertTrue(manifest["embeddings_populated"])
        self.assertEqual(manifest["embedding_section_count"], 2)
        self.assertEqual(manifest["embedding_compat_count"], 2)


if __name__ == "__main__":
    unittest.main()
