"""Tests for offline search intent pack storage and merge."""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from backend.services import intent_pack_service as svc


class IntentPackServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        svc._valid_targets_cache = None

    def test_load_valid_search_targets_from_repo_data(self) -> None:
        targets = svc.load_valid_search_targets()
        self.assertIn("Settings > Internet > Enable Wi-Fi", targets)
        self.assertIn("QAM > Performance > TDP Limit", targets)

    def test_sanitize_rejects_unknown_target(self) -> None:
        raw = {
            "id": "bad",
            "label": "Bad",
            "entries": [
                {
                    "target": "Settings > Not > A Real Path",
                    "aliases": ["nope"],
                }
            ],
        }
        self.assertIsNone(svc._sanitize_pack(raw, svc.load_valid_search_targets()))

    def test_merge_import_new_pack(self) -> None:
        store = svc.default_bundled_store()
        incoming = {
            "id": "custom-lan",
            "label": "LAN",
            "entries": [
                {
                    "target": "Settings > Downloads > Game File Transfer over Local Network",
                    "aliases": ["lan transfer"],
                }
            ],
        }
        preview = svc.merge_import_pack(store, incoming, confirm=False)
        self.assertTrue(preview.get("ok"))
        self.assertEqual(preview.get("stats", {}).get("added_entries"), 1)
        applied = svc.merge_import_pack(store, incoming, confirm=True)
        self.assertIn("store", applied)
        ids = [p["id"] for p in applied["store"]["packs"]]
        self.assertIn("custom-lan", ids)

    def test_merge_skips_conflicting_alias(self) -> None:
        store = {
            "schema_version": 1,
            "packs": [
                {
                    "id": "a",
                    "label": "A",
                    "enabled": True,
                    "source": "user",
                    "updated_at": "2026-01-01",
                    "entries": [
                        {
                            "target": "Settings > Display > Brightness",
                            "aliases": ["glow"],
                            "synonyms": [],
                            "expansions": [],
                        }
                    ],
                }
            ],
        }
        incoming = {
            "id": "b",
            "label": "B",
            "entries": [
                {
                    "target": "Settings > Internet > Enable Wi-Fi",
                    "aliases": ["glow"],
                }
            ],
        }
        result = svc.merge_import_pack(store, incoming, confirm=False)
        self.assertTrue(result.get("ok"))
        self.assertGreaterEqual(result.get("stats", {}).get("conflicts", 0), 1)

    def test_save_and_load_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, svc.INTENT_PACKS_FILENAME)
            store = svc.default_bundled_store()
            svc.save_intent_packs(path, store, settings_dir=tmp)
            loaded = svc.load_intent_packs(path)
            self.assertEqual(loaded.get("schema_version"), 1)
            self.assertTrue(any(p.get("id") == "deck-basics" for p in loaded.get("packs") or []))

    def test_reset_reseeds_bundled(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, svc.INTENT_PACKS_FILENAME)
            svc.save_intent_packs(
                path,
                {"schema_version": 1, "packs": []},
                settings_dir=tmp,
            )
            reset = svc.reset_intent_packs_file(path, tmp)
            self.assertTrue(any(p.get("id") == "deck-basics" for p in reset.get("packs") or []))

    def test_export_pack_json(self) -> None:
        store = svc.default_bundled_store()
        out = svc.export_pack(store, "deck-basics")
        self.assertTrue(out.get("ok"))
        parsed = json.loads(out["json"])
        self.assertEqual(parsed.get("id"), "deck-basics")

    def test_remove_blocks_bundled(self) -> None:
        store = svc.default_bundled_store()
        out = svc.remove_pack(store, "deck-basics")
        self.assertFalse(out.get("ok"))


if __name__ == "__main__":
    unittest.main()
