"""Fail CI if TS catalog ids drift from Python VALID_PRESET_IDS."""

from __future__ import annotations

import re
import unittest

from backend.services.ai_character_service import VALID_PRESET_IDS
from src_paths import find_src_file


class TestCharacterCatalogParity(unittest.TestCase):
    def test_frontend_catalog_ids_match_backend(self) -> None:
        catalog_ts = find_src_file("characterCatalog.ts").read_text(encoding="utf-8")
        # Entry ids only: `{ id: "snake_case", label: ...`
        ts_ids = set(re.findall(r'{\s*id:\s*"([a-z0-9_]+)"\s*,\s*label:', catalog_ts))
        self.assertTrue(ts_ids, "expected at least one catalog id in characterCatalog.ts")
        self.assertEqual(
            ts_ids,
            set(VALID_PRESET_IDS),
            "src/data/characterCatalog.ts ids must match backend/services/ai_character_service.py "
            "VALID_PRESET_IDS (add rows to _CHARACTER_ROWS in the same change set).",
        )


if __name__ == "__main__":
    unittest.main()
