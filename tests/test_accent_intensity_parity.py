"""Fail CI if TS accent intensity ids drift from backend VALID_ACCENT_INTENSITY_IDS."""

from __future__ import annotations

import re
from pathlib import Path

import unittest

from backend.services.ai_character_service import VALID_ACCENT_INTENSITY_IDS


class TestAccentIntensityParity(unittest.TestCase):
    def test_frontend_accent_ids_match_backend(self) -> None:
        root = Path(__file__).resolve().parents[1]
        path = root / "src" / "data" / "aiCharacterAccentIntensity.ts"
        text = path.read_text(encoding="utf-8")
        m = re.search(
            r"export const AI_CHARACTER_ACCENT_INTENSITY_IDS:\s*readonly[^=]+=\s*\[([\s\S]*?)\]\s*as const",
            text,
        )
        self.assertIsNotNone(m, "expected AI_CHARACTER_ACCENT_INTENSITY_IDS array in aiCharacterAccentIntensity.ts")
        inner = m.group(1)
        ts_ids = set(re.findall(r'"([a-z_]+)"', inner))
        self.assertEqual(
            ts_ids,
            set(VALID_ACCENT_INTENSITY_IDS),
            "src/data/aiCharacterAccentIntensity.ts ids must match backend VALID_ACCENT_INTENSITY_IDS.",
        )


if __name__ == "__main__":
    unittest.main()
