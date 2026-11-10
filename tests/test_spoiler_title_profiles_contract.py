"""Title: Spoiler title profiles cross-language contract (Python half)

Purpose: Assert the built-in profile tables and resolution rules match the shared fixture.
Used for: Catching a title added to one language and forgotten in the other.
Solves: spoiler_title_profiles.py and src/features/spoilers/spoilerTitleProfiles.ts hold the same ten
        AppIDs with nothing but a "keep in sync" comment enforcing agreement.
Does not: Cover prompt policy or display unwrap — only the profile a title resolves to.

The TypeScript half is src/features/spoilers/spoilerTitleProfilesContract.test.ts. Neither test shells out
to the other toolchain; both read the same JSON. See tests/contracts/README.md.
"""

import json
import unittest
from pathlib import Path

from backend.spoilers.spoiler_title_profiles import (
    LOW_NARRATIVE_APP_IDS,
    PROTECT_PROGRESSION_APP_IDS,
    question_names_protected_title,
    resolve_title_spoiler_profile,
    resolve_turn_title_spoiler_profile,
)

CONTRACT_PATH = Path(__file__).resolve().parent / "contracts" / "spoiler-title-profiles.json"
CONTRACT = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


class SpoilerTitleProfilesContractTests(unittest.TestCase):
    def test_low_narrative_table_matches_fixture(self):
        self.assertEqual(
            sorted(LOW_NARRATIVE_APP_IDS),
            sorted(CONTRACT["low_narrative_app_ids"]),
            "LOW_NARRATIVE_APP_IDS drifted from tests/contracts/spoiler-title-profiles.json",
        )

    def test_protect_progression_table_matches_fixture(self):
        self.assertEqual(
            sorted(PROTECT_PROGRESSION_APP_IDS),
            sorted(CONTRACT["protect_progression_app_ids"]),
            "PROTECT_PROGRESSION_APP_IDS drifted from tests/contracts/spoiler-title-profiles.json",
        )

    def test_every_game_on_an_app_id_list_also_has_its_name_in_the_contract(self):
        ids = list(CONTRACT["low_narrative_app_ids"]) + list(CONTRACT["protect_progression_app_ids"])
        self.assertEqual(sorted(CONTRACT["app_id_names"]), sorted(ids))

    def test_the_name_of_every_listed_game_resolves_to_its_ids_profile(self):
        """With nothing running a turn has no AppID: a game on the id list that is missing from the
        name lists (Brotato was) kept its covers shut and never got the relaxed wording."""
        for app_id, name in CONTRACT["app_id_names"].items():
            with self.subTest(app_id=app_id, name=name):
                self.assertEqual(
                    resolve_title_spoiler_profile("", name),
                    resolve_title_spoiler_profile(app_id, ""),
                )

    def test_no_app_id_carries_two_profiles(self):
        overlap = set(LOW_NARRATIVE_APP_IDS) & set(PROTECT_PROGRESSION_APP_IDS)
        self.assertEqual(overlap, set())

    def test_resolution_cases(self):
        for case in CONTRACT["cases"]:
            with self.subTest(case=case["name"]):
                self.assertEqual(
                    resolve_title_spoiler_profile(case["app_id"], case["app_name"]),
                    case["expected"],
                )

    def test_question_cases(self):
        """Whether a question itself names a story game -- the same cases the TS half reads."""
        for case in CONTRACT["question_cases"]:
            with self.subTest(case=case["name"]):
                self.assertEqual(
                    question_names_protected_title(case["question"]), case["expected"]
                )

    def test_a_named_story_game_overrides_a_running_no_story_profile(self):
        for case in CONTRACT["turn_cases"]:
            with self.subTest(case=case["name"]):
                self.assertEqual(
                    resolve_turn_title_spoiler_profile(
                        case["app_id"], case["app_name"], case["question"]
                    ),
                    case["expected"],
                )


if __name__ == "__main__":
    unittest.main()
