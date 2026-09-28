"""Title: Stage the release zip's extra files

Purpose: Prove scripts/stage_zip_extras.py puts NOTICE and the back end's runtime data where
    Decky's build tool will pack them, and that the staged tree is what the back end needs.
Used for: scripts/stage_zip_extras.py (run by .github/workflows/build-plugin-zip.yml and
    scripts/build.sh right before `decky plugin build`).
Solves: The release zip had no NOTICE and no data/ folder, so a fresh install lost the
    settings-search word lists and refused every jump target. These tests stage into a temp
    folder, point the loaders at it, and check the word list and targets load.
Does not: Run the Decky tool (Linux-only) or check the zip itself (verify-decky-plugin-zip.sh).
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from backend.services import intent_pack_service as svc

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_stage():
    path = REPO_ROOT / "scripts" / "stage_zip_extras.py"
    spec = importlib.util.spec_from_file_location("stage_zip_extras", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


stage_mod = _load_stage()


class StageZipExtrasTests(unittest.TestCase):
    def setUp(self) -> None:
        svc._valid_targets_cache = None

    def tearDown(self) -> None:
        svc._valid_targets_cache = None

    def test_stages_notice_and_runtime_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            staged = stage_mod.stage(dest)
            self.assertIn("NOTICE", staged)
            self.assertIn("data/settings-search-targets.json", staged)
            self.assertIn("data/intent-packs/deck-basics.json", staged)
            self.assertEqual(
                (dest / "NOTICE").read_bytes(), (REPO_ROOT / "NOTICE").read_bytes()
            )

    def test_back_end_loads_word_list_and_targets_from_staged_tree(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            stage_mod.stage(dest)
            with mock.patch.object(svc, "_plugin_root", return_value=dest):
                targets = svc.load_valid_search_targets()
                self.assertGreater(len(targets), 0)
                pack = svc.load_bundled_pack_file("deck-basics")
                self.assertIsNotNone(pack)
                self.assertGreater(len(pack["entries"]), 0)
                store = svc.default_bundled_store()
                self.assertEqual(
                    sorted(p["id"] for p in store["packs"]), sorted(svc.BUNDLED_PACK_IDS)
                )

    def test_empty_plugin_root_is_what_the_bug_looked_like(self) -> None:
        # The control: the same loaders over a folder with no data/ find nothing.
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(svc, "_plugin_root", return_value=Path(tmp)):
                self.assertIsNone(svc.load_bundled_pack_file("deck-basics"))

    def test_every_bundled_pack_is_staged(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            staged = set(stage_mod.stage(Path(tmp)))
            for pack_id in svc.BUNDLED_PACK_IDS:
                self.assertIn(f"data/intent-packs/{pack_id}.json", staged)

    def test_game_notes_are_never_staged(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            staged = stage_mod.stage(dest)
            self.assertFalse([p for p in staged if p.startswith("data/kb")])
            self.assertFalse((dest / "data" / "kb").exists())
            names = {p.name for p in dest.rglob("*")}
            self.assertNotIn("strategy_seed.json", names)
            self.assertNotIn("compat_patterns.json", names)

    def test_game_notes_placed_in_a_staged_folder_are_refused(self) -> None:
        # A future edit that points RUNTIME_DATA at data/kb must fail, not ship the notes.
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "out"
            with mock.patch.object(stage_mod, "RUNTIME_DATA", ("data/kb",)):
                with self.assertRaises(ValueError):
                    stage_mod.stage(dest)

    def test_stale_files_from_an_earlier_run_are_cleared(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            stale = dest / "data" / "intent-packs" / "old-pack.json"
            stale.parent.mkdir(parents=True)
            stale.write_text(json.dumps({"id": "old-pack"}), encoding="utf-8")
            stage_mod.stage(dest)
            self.assertFalse(stale.exists())

    def test_main_stages_and_passes_the_corpus_guard(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(stage_mod.main([tmp]), 0)
            self.assertTrue((Path(tmp) / "data" / "settings-search-targets.json").is_file())


if __name__ == "__main__":
    unittest.main()
