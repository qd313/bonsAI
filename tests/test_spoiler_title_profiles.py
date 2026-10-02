import json
import unittest
from pathlib import Path

from backend.services.spoiler_title_profiles import (
    LOW_NARRATIVE_APP_IDS,
    PROTECT_PROGRESSION_APP_IDS,
    protected_title_named_in_question,
    questions_the_answer_above_answered,
    resolve_title_spoiler_profile,
    story_game_named_over_running_no_story_game,
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
        # (protect progression); helper G added Skyrim (protect progression).
        self.assertEqual(len(LOW_NARRATIVE_APP_IDS), 5)
        self.assertEqual(len(PROTECT_PROGRESSION_APP_IDS), 16)

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


class StoryGameNamedOverRunningNoStoryGameTests(unittest.TestCase):
    """Plan 78 helper A (D121 item 1): who picks the notes for this one turn."""

    def test_the_longest_protected_name_is_the_one_reported(self):
        self.assertEqual(
            protected_title_named_in_question("how do I beat grand theft auto v on foot"),
            "grand theft auto v",
        )
        self.assertEqual(protected_title_named_in_question("which shades of blue suit me"), "")

    def test_a_no_story_game_running_and_a_story_game_named_gives_the_named_game(self):
        self.assertEqual(
            story_game_named_over_running_no_story_game(
                "2321470", "Deep Rock Galactic: Survivor", "boss in the Soul Sanctum in Hollow Knight"
            ),
            "hollow knight",
        )
        # The running game can be known by its name alone (a non-Steam shortcut has no AppID).
        self.assertEqual(
            story_game_named_over_running_no_story_game("", "DOOM Eternal", "how do I beat hades"),
            "hades",
        )

    def test_the_running_games_own_question_keeps_the_running_game(self):
        self.assertEqual(
            story_game_named_over_running_no_story_game(
                "2321470", "Deep Rock Galactic: Survivor", "how do I dodge projectiles"
            ),
            "",
        )

    def test_only_a_no_story_game_running_can_lose_the_notes(self):
        question = "boss in the Soul Sanctum in Hollow Knight"
        # A story game running keeps its own notes.
        self.assertEqual(
            story_game_named_over_running_no_story_game("1145360", "Hades", question), ""
        )
        # An unknown game running is not a no-story game either.
        self.assertEqual(
            story_game_named_over_running_no_story_game("413150", "Stardew Valley", question), ""
        )
        # Nothing running: the usual title lookup already handles it.
        self.assertEqual(story_game_named_over_running_no_story_game("", "", question), "")


class QuestionsTheAnswerAboveAnsweredTests(unittest.TestCase):
    """Plan 79 helper AE (D122 item 9): which earlier question a button or chip belongs to."""

    PICK = "[Strategy follow-up] I'm at: the boss room.\nGive coaching."

    @staticmethod
    def _chat(*pairs):
        return [{"role": role, "text": text} for role, text in pairs]

    def test_a_refine_chip_carries_its_parent_question(self):
        chip = {"chip_id": "too_long", "parent_question": "beat hades", "parent_answer": "x"}
        self.assertEqual(questions_the_answer_above_answered("shorter please", chip, []), ["beat hades"])

    def test_a_choice_button_reads_the_typed_question_from_the_saved_chat(self):
        turns = self._chat(("user", "beat hades"), ("assistant", "ok"), ("user", self.PICK))
        self.assertEqual(questions_the_answer_above_answered(self.PICK, None, turns), ["beat hades"])

    def test_a_choice_button_steps_back_over_an_earlier_button_press(self):
        turns = self._chat(
            ("user", "beat hades"), ("assistant", "ok"), ("user", self.PICK), ("assistant", "ok"),
            ("user", self.PICK + "2"),
        )
        self.assertEqual(
            questions_the_answer_above_answered(self.PICK + "2", None, turns),
            [self.PICK, "beat hades"],
        )

    def test_a_typed_question_has_no_answer_above_it(self):
        turns = self._chat(("user", "beat hades"), ("assistant", "ok"), ("user", "and the second phase"))
        self.assertEqual(questions_the_answer_above_answered("and the second phase", None, turns), [])

    def test_no_saved_chat_and_no_chip_gives_nothing(self):
        self.assertEqual(questions_the_answer_above_answered(self.PICK, None, None), [])
        self.assertEqual(questions_the_answer_above_answered(self.PICK, None, []), [])


if __name__ == "__main__":
    unittest.main()
