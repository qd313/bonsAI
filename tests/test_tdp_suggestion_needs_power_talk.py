"""A boss answer must not produce a power suggestion (plan 78, helper I, sighting 3).

Seen on the Deck 2026-09-27 (docs/test-evidence/plan72-Z-FREEPLAY.json, finding 12): the log read
``ask_game_ai: parsed TDP recommendation (suggestion-only): {'tdp_watts': 10, 'gpu_clock_mhz': 1200}``
for a Hollow Knight boss answer. The prompt for Speed and Expert teaches the model the block's
shape on EVERY question, and the small model sometimes copies it onto an answer that has nothing
to do with power. The reader trusted any such block. It now also needs the words around it to be
about power, once those words are long enough to be real advice rather than a one-line lead-in.
"""

import unittest

from backend.tdp_intent import parse_tdp_recommendation
from test_game_ai_request import _FakePlugin, _run  # also installs the decky stand-in

# The shape the Deck's answer had: four paragraphs of boss advice in a chatty voice, then the
# example block from the prompt copied onto the end.
BOSS_ANSWER = (
    "Right, listen up, mate! Those big mantis guys in the tall arena are all about timing.\n\n"
    "Watch their arms. See how they swing those big arms? Stay low, wait for the swing to finish, "
    "then slash down twice and get out before the next one comes round.\n\n"
    "Use the platforms. Hop up when they charge and drop onto them from above, because "
    "the arena is built for it and they cannot reach you there.\n\n"
    "Heal only when the floor is clear. One mask at a time, never in the middle of a swing.\n\n"
    '```json\n{"tdp_watts": 10, "gpu_clock_mhz": 1200}\n```'
)

POWER_ANSWER = (
    "For a light 2D game you can drop the power limit quite a lot. Setting the TDP to 6 watts "
    "keeps the fan quiet and stretches the battery by well over an hour, and the game will still "
    "hold its frame rate.\n\n"
    '```json\n{"tdp_watts": 6, "gpu_clock_mhz": 800}\n```'
)


def _ask(response: str, question: str):
    plugin = _FakePlugin({"latency_timeouts_custom_enabled": False, "input_sanitizer_user_disabled": False, "capabilities": {}})
    plugin._ollama_result = {"success": True, "response": response, "model": "test-model"}
    return _run(plugin, question)


class BossAnswerGivesNoPowerSuggestion(unittest.TestCase):
    def test_the_whole_ask_gives_no_suggestion_for_a_boss_answer(self):
        """The level the Deck check looks at: the result the screen receives."""
        result = _ask(
            BOSS_ANSWER,
            "In Hollow Knight the big mantis guys in the tall arena keep beating me, any tips",
        )
        self.assertTrue(result.get("success"))
        applied = result.get("applied") or {}
        self.assertFalse(applied.get("suggestion"), applied)

    def test_the_reader_alone_ignores_a_block_on_an_answer_that_is_not_about_power(self):
        self.assertIsNone(parse_tdp_recommendation(BOSS_ANSWER, 3, 15, 200, 1600))

    def test_a_power_answer_still_gives_its_suggestion(self):
        rec = parse_tdp_recommendation(POWER_ANSWER, 3, 15, 200, 1600)
        self.assertEqual(rec, {"tdp_watts": 6, "gpu_clock_mhz": 800})
        result = _ask(POWER_ANSWER, "How can I stretch my battery in a 2D game?")
        suggestion = (result.get("applied") or {}).get("suggestion") or {}
        self.assertEqual(suggestion.get("tdp_watts"), 6)

    def test_a_short_lead_in_before_the_block_still_counts(self):
        text = 'Sure thing.\n```json\n{"tdp_watts": 8, "gpu_clock_mhz": null}\n```'
        self.assertEqual(
            parse_tdp_recommendation(text, 3, 15, 200, 1600), {"tdp_watts": 8, "gpu_clock_mhz": None}
        )

    def test_a_long_answer_about_power_in_plain_words_keeps_its_suggestion(self):
        """Power wording that has nothing to do with the word 'tdp' still counts."""
        text = (
            "Your battery will last longer if you cap the frame rate at 40 and lower the screen "
            "brightness, and it will run cooler too, which keeps the fan from spinning up.\n"
            '{"tdp_watts": 7, "gpu_clock_mhz": null}'
        )
        self.assertEqual(
            parse_tdp_recommendation(text, 3, 15, 200, 1600), {"tdp_watts": 7, "gpu_clock_mhz": None}
        )

    def test_natural_language_path_is_unchanged(self):
        self.assertEqual(
            parse_tdp_recommendation("Set TDP to 8 watts for battery life.", 3, 15, 200, 1600),
            {"tdp_watts": 8, "gpu_clock_mhz": None},
        )


if __name__ == "__main__":
    unittest.main()
