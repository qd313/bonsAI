import json
import unittest
from pathlib import Path

from backend.services.spoiler_title_profiles import (
    LOW_NARRATIVE_APP_IDS,
    PROTECT_PROGRESSION_APP_IDS,
    resolve_title_spoiler_profile,
    title_profile_is_low_narrative,
)

SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "kb" / "strategy_seed.json"


class SpoilerTitleProfilesTests(unittest.TestCase):
    def test_low_narrative_app_ids(self):
        for app_id in ("2321470", "550", "1222670"):
            self.assertEqual(resolve_title_spoiler_profile(app_id), "low_narrative")
            self.assertTrue(title_profile_is_low_narrative(app_id))

    def test_protect_progression_app_ids(self):
        for app_id in ("1086940", "1145360", "1174180"):
            self.assertEqual(resolve_title_spoiler_profile(app_id), "protect_progression")
            self.assertFalse(title_profile_is_low_narrative(app_id))

    def test_ocarina_of_time_is_protected_by_name_and_not_by_app_id(self):
        """It has no Steam AppID. It carried 413150, which is Stardew Valley's, so a Stardew
        session inherited both Ocarina of Time's cards and its progression fencing."""
        self.assertEqual(
            resolve_title_spoiler_profile("", "The Legend of Zelda: Ocarina of Time"),
            "protect_progression",
        )
        self.assertEqual(
            resolve_title_spoiler_profile("", "Ship of Harkinian"), "protect_progression"
        )
        self.assertNotIn("413150", PROTECT_PROGRESSION_APP_IDS)
        # And the AppID's real owner is now nobody's business but its own.
        self.assertEqual(resolve_title_spoiler_profile("413150", "Stardew Valley"), "unknown")

    def test_soe_title_fallback_without_app_id(self):
        self.assertEqual(
            resolve_title_spoiler_profile("", "State of Emergency"),
            "low_narrative",
        )

    def test_unknown_title_stays_conservative(self):
        self.assertEqual(resolve_title_spoiler_profile("999999"), "unknown")
        self.assertEqual(resolve_title_spoiler_profile("", ""), "unknown")

    def test_matrix_counts(self):
        # 3 + 8 until 2026-09-05; the new-titles tranche (D69) added DOOM Eternal to the
        # low-narrative set and six story titles (GTA V twice, one per Steam build). Plan 70
        # helper F (2026-09-26) added one to each set: Brotato (low narrative) and Palworld
        # (protect progression).
        self.assertEqual(len(LOW_NARRATIVE_APP_IDS), 5)
        self.assertEqual(len(PROTECT_PROGRESSION_APP_IDS), 15)

    def test_every_corpus_title_has_a_spoiler_profile(self):
        """A game in the corpus with no profile silently resolves to ``unknown``.

        ``unknown`` is not a neutral default here: it skips both the -28 low-narrative
        discount and the +10 protect bump, so a story game added to the seed and forgotten
        here scores like a party game. Nothing else fails when that happens — the same
        shape of gap that left eight anti-cheat tips unroutable before D16, so it gets the
        same kind of drift guard.
        """
        seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        missing = []
        for game in seed["games"]:
            app_id = str(game.get("app_id") or "").strip()
            title = str(game.get("canonical_title") or "")
            if resolve_title_spoiler_profile(app_id, title) == "unknown":
                missing.append(f"{title} (app_id={app_id or 'none'})")
        self.assertEqual(
            missing,
            [],
            "corpus titles with no spoiler profile — add them to spoiler_title_profiles.py, "
            "its src/data/spoilerTitleProfiles.ts mirror, and "
            "tests/contracts/spoiler-title-profiles.json: " + ", ".join(missing),
        )


if __name__ == "__main__":
    unittest.main()
