"""Plan 104 lane H1, version two: on a turn the plugin marks "your notes do not cover this", the order
"Ground answers in the attached strategy/compat cards when relevant" can be swapped for one sentence
saying the cards are about other things (switch NOTES_FENCED_ON, off when it lands).

The notes stay in what the AI is sent; only the order about them changes. Every turn that is not marked
reads byte for byte as before, and so does every marked turn while the switch is off.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.prompts import ollama_prompts  # noqa: E402
from backend.prompts.ollama_prompts import build_system_prompt  # noqa: E402
from spoiler_default_tier_matrix import build_prompt, prompt_cases  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    SmallLibraryAskSetup,
    _FakePlugin,
)
from test_ollama_prompts_honest_unknown import _FLAGGED, _PLAIN_CARD, _build, _switch  # noqa: E402

_GROUND_ORDER = "Ground answers in the attached strategy/compat cards when relevant."
_SPOILER_ORDER = "Put spoilery walkthrough detail inside a hidden block"


def _fence(on: bool):
    # create=True: before this change the switch does not exist; the tests must fail on what the prompt
    # says, not on a missing name.
    return patch.object(ollama_prompts, "NOTES_FENCED_ON", on, create=True)


def _fence_sentence() -> str:
    return getattr(ollama_prompts, "NOTES_FENCE_LINE", "<no fence sentence yet>")


class NotesFenceSentenceTests(unittest.TestCase):
    def test_the_sentence_is_one_sentence_that_says_what_the_cards_are_and_when_to_use_one(self):
        body = _fence_sentence()
        self.assertTrue(body.endswith("."))
        self.assertEqual(body.count("."), 1)
        self.assertIn("other things in this game", body)
        self.assertIn("only if it names the thing the player asked about", body)
        self.assertIn("take nothing from them", body)

    def test_the_sentence_is_shorter_than_two_hundred_characters(self):
        self.assertLess(len(_fence_sentence()), 200)

    def test_the_switch_lands_off(self):
        self.assertFalse(ollama_prompts.NOTES_FENCED_ON)


class NotesFencePromptTests(unittest.TestCase):
    def test_a_marked_turn_with_the_switch_on_swaps_the_ground_order_for_the_sentence(self):
        with _switch(True, "g"), _fence(True):
            text = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        self.assertIn(_fence_sentence(), text)
        self.assertNotIn(_GROUND_ORDER, text)
        self.assertIn(_SPOILER_ORDER, text, "the hidden-block order for spoilers is not part of what is swapped")

    def test_the_cards_themselves_are_still_in_the_prompt(self):
        with _switch(True, "g"), _fence(True):
            text = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        self.assertIn("Some tactics text here.", text)
        self.assertIn("--- end of knowledge base ---", text)

    def test_a_marked_turn_still_carries_the_honest_opening_sentence(self):
        with _switch(True, "g"), _fence(True):
            text = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        self.assertIn(ollama_prompts.HONEST_UNKNOWN_WORDINGS["g"], text)

    def test_the_swap_changes_exactly_one_sentence(self):
        with _switch(True, "g"), _fence(True):
            fenced = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        with _switch(True, "g"), _fence(False):
            plain = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        self.assertEqual(fenced.replace(_fence_sentence(), _GROUND_ORDER, 1), plain)

    def test_with_the_switch_off_a_marked_turn_reads_as_before(self):
        with _switch(True, "g"), _fence(False):
            marked = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        self.assertIn(_GROUND_ORDER, marked)
        self.assertNotIn(_fence_sentence(), marked)

    def test_with_the_switch_on_a_turn_that_is_not_marked_reads_as_before(self):
        with _fence(False):
            off = _build(_PLAIN_CARD)
        with _fence(True):
            on = _build(_PLAIN_CARD)
            on_empty = _build(_PLAIN_CARD, turn_flags=frozenset())
        self.assertEqual(on, off)
        self.assertEqual(on_empty, off)
        self.assertIn(_GROUND_ORDER, on)

    def test_a_marked_turn_with_no_notes_block_gets_no_sentence(self):
        with _switch(True, "g"), _fence(True):
            text = _build("", turn_flags=_FLAGGED)
        self.assertNotIn(_fence_sentence(), text)

    def test_with_the_switch_on_every_saved_fingerprint_is_still_the_same(self):
        with _fence(True):
            for name, kw in prompt_cases():
                with self.subTest(case=name):
                    self.assertEqual(build_prompt(**kw), build_prompt(turn_flags=frozenset(), **kw))

    def test_with_the_switch_off_a_marked_turn_changes_no_saved_fingerprint(self):
        with _switch(True, "g"), _fence(False):
            for name, kw in prompt_cases():
                with self.subTest(case=name):
                    plain = build_prompt(**kw)
                    marked = build_prompt(turn_flags=_FLAGGED, **kw)
                    # Only the honest sentence may differ, and only where a notes block or mode order exists.
                    self.assertNotIn(_fence_sentence(), marked)
                    self.assertEqual(marked.replace("\n" + ollama_prompts.HONEST_UNKNOWN_WORDINGS["g"] + "\n", "", 1), plain)


class NotesFenceThroughTheAskPathTests(SmallLibraryAskSetup, unittest.TestCase):
    _MADE_UP = "How do I defeat the boss named Grimthak in this game"

    def _ask(self):
        plugin = _FakePlugin(self.settings)
        plugin.reply = "I have no notes on that."
        result = asyncio.run(
            run_game_ai_request(
                plugin, self._MADE_UP, "127.0.0.1:11434", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME,
                ask_mode="strategy",
            )
        )
        kb_followup_memory.forget()
        return plugin.ask_calls[0], result

    def _prompt_for(self, call):
        return build_system_prompt(
            self._MADE_UP, _DRG_APP_ID, _DRG_APP_NAME, [], [], lambda _a: "", lambda _p: {}, ask_mode="strategy",
            early_context_suffix=call.get("proton_log_attachment") or "", turn_flags=call["turn_flags"],
        )

    def test_a_made_up_boss_turn_keeps_its_notes_but_not_the_order_to_ground_the_answer_in_them(self):
        call, result = self._ask()
        with _switch(True, "g"), _fence(True):
            fenced = self._prompt_for(call)
        with _switch(True, "g"), _fence(False):
            plain = self._prompt_for(call)
        self.assertIn("Glyphid Dreadnought", fenced)
        self.assertIn(_fence_sentence(), fenced)
        self.assertNotIn(_GROUND_ORDER, fenced)
        self.assertIn(_GROUND_ORDER, plain)
        self.assertNotIn(_fence_sentence(), plain)


if __name__ == "__main__":
    unittest.main()
