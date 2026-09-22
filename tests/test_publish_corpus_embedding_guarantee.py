"""Title: Publish check refuses a corpus with a short meaning index

Purpose: Pin that `python scripts/publish_corpus.py --check` refuses to pass a build whose
baked vector count is short of its note (or tip) count, not just a build with zero vectors.
Used for: scripts/publish_corpus.py validate_build.
Solves: Before this, the publish gate only checked embedding_section_count /
  embedding_compat_count against zero, so a build that indexed some but not all cards (the
  --allow-missing-embeddings escape hatch, or a hand-edited manifest) sailed through the one
  check standing between a build and the public download.
Does not: Judge a manifest built before build_rag_db.py recorded the total-count fields — those
  predate this check and are left to the existing zero-count checks.
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


def _load_module(filename: str, name: str):
    path = REPO_ROOT / "scripts" / filename
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class PublishCorpusShortIndexTests(unittest.TestCase):
    """A full build (2 sections, 2 compat tips, all indexed), then the manifest is hand-edited
    to look like a short index — the way --allow-missing-embeddings or a stray edit would."""

    def setUp(self):
        self.build_rag_db = _load_module("build_rag_db.py", "build_rag_db_publish_test")
        self.publish_corpus = _load_module("publish_corpus.py", "publish_corpus_test")

        self._tmp = tempfile.TemporaryDirectory()
        kb_dir = Path(self._tmp.name) / "kb_data"
        kb_dir.mkdir()
        (kb_dir / "strategy_seed.json").write_text(json.dumps(_seed_payload(2)), encoding="utf-8")
        (kb_dir / "compat_patterns.json").write_text(json.dumps(_compat_payload(2)), encoding="utf-8")
        self.out_dir = Path(self._tmp.name) / "out"

        self._orig_kb_data_dir = self.build_rag_db.KB_DATA_DIR
        self.build_rag_db.KB_DATA_DIR = kb_dir
        self.build_rag_db._list_installed_ollama_tags = lambda *a, **k: [
            self.build_rag_db.DEFAULT_EMBEDDING_MODEL
        ]
        dim = self.build_rag_db.DEFAULT_EMBEDDING_DIM
        self.build_rag_db._embed_texts_build = lambda base_http, texts, *, model, timeout_s: [
            [0.0] * dim for _ in texts
        ]
        self.build_rag_db.build_corpus(self.out_dir, seed=True)

    def tearDown(self):
        self.build_rag_db.KB_DATA_DIR = self._orig_kb_data_dir
        self._tmp.cleanup()

    def _manifest_path(self) -> Path:
        return self.out_dir / self.build_rag_db.CORPUS_MANIFEST_FILENAME

    def _rewrite_manifest(self, **overrides) -> None:
        manifest_path = self._manifest_path()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest.update(overrides)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    def test_fully_indexed_build_passes(self):
        errors = self.publish_corpus.validate_build(self.out_dir)
        self.assertEqual(errors, [])

    def test_short_section_index_is_refused(self):
        self._rewrite_manifest(embedding_section_count=1)  # total stayed 2
        errors = self.publish_corpus.validate_build(self.out_dir)
        self.assertTrue(
            any("embedding_section_count" in e and "short of" in e for e in errors),
            errors,
        )

    def test_short_compat_index_is_refused(self):
        self._rewrite_manifest(embedding_compat_count=1)  # total stayed 2
        errors = self.publish_corpus.validate_build(self.out_dir)
        self.assertTrue(
            any("embedding_compat_count" in e and "short of" in e for e in errors),
            errors,
        )


if __name__ == "__main__":
    unittest.main()
