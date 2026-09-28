"""Title: Plugin zip corpus guard

Purpose: Pin ATTR-4.2 — release/plugin trees must not bundle knowledge-base corpus files.
Used for: scripts/plugin_zip_corpus_guard.py
Solves: A planted corpus.db in staging must fail the guard (Apache/CC separation).
Does not: Run Decky CLI release builds or verify full zip layout (verify-decky-plugin-zip.sh).
"""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_guard():
    path = REPO_ROOT / "scripts" / "plugin_zip_corpus_guard.py"
    spec = importlib.util.spec_from_file_location("plugin_zip_corpus_guard", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


guard = _load_guard()


class PluginZipCorpusGuardTests(unittest.TestCase):
    def test_clean_staging_dir_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "main.py").write_text("# plugin\n", encoding="utf-8")
            (root / "NOTICE").write_text("notice\n", encoding="utf-8")
            self.assertEqual(guard.find_forbidden_corpus_paths(root), [])
            self.assertEqual(guard.main(["--dir", str(root)]), 0)

    def test_planted_corpus_db_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "main.py").write_text("# plugin\n", encoding="utf-8")
            (root / "data" / "kb").mkdir(parents=True)
            (root / "data" / "kb" / "corpus.db").write_bytes(b"sqlite")
            hits = guard.find_forbidden_corpus_paths(root)
            self.assertEqual(hits, ["data/kb/corpus.db"])
            self.assertEqual(guard.main(["--dir", str(root)]), 1)

    def test_planted_attributions_and_manifest_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "ATTRIBUTIONS.md").write_text("# oops\n", encoding="utf-8")
            (root / "corpus-manifest.json").write_text("{}\n", encoding="utf-8")
            (root / "corpus.db.zlib").write_bytes(b"z")
            hits = set(guard.find_forbidden_corpus_paths(root))
            self.assertEqual(
                hits,
                {"ATTRIBUTIONS.md", "corpus-manifest.json", "corpus.db.zlib"},
            )

    def test_zip_with_corpus_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            zpath = Path(tmp) / "plugin.zip"
            with zipfile.ZipFile(zpath, "w") as zf:
                zf.writestr("bonsAI/main.py", "# ok\n")
                zf.writestr("bonsAI/corpus.db", b"nope")
            self.assertEqual(
                guard.find_forbidden_corpus_paths_in_zip(zpath),
                ["bonsAI/corpus.db"],
            )
            self.assertEqual(guard.main(["--zip", str(zpath)]), 1)

    def test_clean_zip_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            zpath = Path(tmp) / "plugin.zip"
            with zipfile.ZipFile(zpath, "w") as zf:
                zf.writestr("bonsAI/main.py", "# ok\n")
                zf.writestr("bonsAI/NOTICE", "notice\n")
            self.assertEqual(guard.find_forbidden_corpus_paths_in_zip(zpath), [])
            self.assertEqual(guard.main(["--zip", str(zpath)]), 0)

    def test_game_note_sources_fail(self):
        # data/kb/ holds the CC BY-SA / CC BY game notes the library is built from; the
        # Apache-2.0 plugin package must never carry them, wherever they land.
        for name in ("strategy_seed.json", "compat_patterns.json", "Strategy_Seed.JSON"):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "main.py").write_text("# plugin\n", encoding="utf-8")
                (root / "data" / "kb").mkdir(parents=True)
                (root / "data" / "kb" / name).write_text("{}\n", encoding="utf-8")
                self.assertEqual(guard.find_forbidden_corpus_paths(root), [f"data/kb/{name}"])
                self.assertEqual(guard.main(["--dir", str(root)]), 1)

    def test_zip_with_game_notes_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            zpath = Path(tmp) / "plugin.zip"
            with zipfile.ZipFile(zpath, "w") as zf:
                zf.writestr("bonsAI/main.py", "# ok\n")
                zf.writestr("bonsAI/data/compat_patterns.json", "[]\n")
            self.assertEqual(
                guard.find_forbidden_corpus_paths_in_zip(zpath),
                ["bonsAI/data/compat_patterns.json"],
            )
            self.assertEqual(guard.main(["--zip", str(zpath)]), 1)

    def test_runtime_data_the_back_end_reads_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data" / "intent-packs").mkdir(parents=True)
            (root / "data" / "settings-search-targets.json").write_text("[]\n", encoding="utf-8")
            (root / "data" / "intent-packs" / "deck-basics.json").write_text("{}\n", encoding="utf-8")
            self.assertEqual(guard.find_forbidden_corpus_paths(root), [])


if __name__ == "__main__":
    unittest.main()
