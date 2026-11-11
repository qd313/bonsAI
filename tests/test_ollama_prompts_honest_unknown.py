"""Plan 103, lane R2: three small changes to what the AI is told about the notes it was given.

1. A note about an enemy can carry a "Looks like:" line. The prompt keeps that line as a short
   bullet in the reply, the way it already does for Summary, Weak points, Uses and Phases.
2. A note of kind versus, coop, callout, survival or realism comes with one rule: do not volunteer
   a campaign finale's tactics or layout. Turns without such a note read exactly as before.
3. When the notes do not cover the question, the prompt can say so, so the AI says it in its own
   words. Lands switched off; the three candidate wordings sit behind constants.

The saved fingerprints (tests/fixtures/spoiler_default_tier_golden.json) are checked by
tests/test_spoiler_tier.py; the tests here check the same thing from the side of each change.
"""

import asyncio
import hashlib
import itertools
import unittest
from pathlib import Path
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.knowledge import kb_followup_memory, kb_notes_footers  # noqa: E402
from backend.knowledge.kb_notes_turn_flags import prompt_turn_flags  # noqa: E402
from backend.prompts import ollama_prompts  # noqa: E402
from backend.prompts.ollama_prompts import (  # noqa: E402
    FINALE_RULE_NOTE_KINDS,
    HONEST_UNKNOWN_WORDINGS,
    TURN_FLAG_NOTES_DO_NOT_COVER,
    _KB_BLOCK_HEADER,
    build_system_prompt,
)
from spoiler_default_tier_matrix import build_prompt, prompt_cases  # noqa: E402
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    SmallLibraryAskSetup,
    _FakePlugin,
)
from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402


def _build(early_context_suffix: str, ask_mode: str = "strategy", **extra) -> str:
    return build_system_prompt(
        "how do I beat the boss",
        "1145360",
        "Hades",
        [],
        [],
        lambda _a: "",
        lambda _p: {},
        ask_mode=ask_mode,
        early_context_suffix=early_context_suffix,
        **extra,
    )


def _block(card_header: str, card_body: str) -> str:
    return (
        f"{_KB_BLOCK_HEADER}\nDomain: strategy\n\n"
        f"[{card_header}] (trust: high)\n{card_body}\n"
        "--- end of knowledge base ---"
    )


_PLAIN_CARD = _block("Hades / boss: Megaera", "Some tactics text here.")
_LOOKS_LIKE_ONLY = _block("Hades / boss: Megaera", "Looks like: a tall winged woman in red armour.")
_LOOKS_LIKE_WITH_SUMMARY = _block(
    "Hades / boss: Megaera", "Summary: a fast duelist.\nLooks like: a tall winged woman in red armour."
)
_STRUCTURED_NO_LOOKS = _block("Hades / boss: Megaera", "Summary: a fast duelist.\nWeak points: her back.")


class LooksLikeLabelTests(unittest.TestCase):
    """Piece 1: "Looks like:" is one of the labels a note keeps as a bullet."""

    def test_a_card_with_only_a_looks_like_line_gets_the_labels_sentence(self):
        self.assertIn("STRUCTURED CARDS", _build(_LOOKS_LIKE_ONLY))

    def test_the_labels_sentence_names_looks_like_when_a_card_has_the_line(self):
        text = _build(_LOOKS_LIKE_WITH_SUMMARY)
        self.assertIn("(Summary / Weak points / Uses / Tips / Phases / Looks like)", text)

    def test_the_labels_sentence_is_unchanged_when_no_card_has_the_line(self):
        text = _build(_STRUCTURED_NO_LOOKS)
        self.assertIn("(Summary / Weak points / Uses / Tips / Phases).", text)
        self.assertNotIn("Looks like", text)

    def test_a_card_with_no_labels_still_gets_no_labels_sentence(self):
        self.assertNotIn("STRUCTURED CARDS", _build(_PLAIN_CARD))


_FINALE_SENTENCE = (
    "Do not volunteer a campaign finale's tactics or layout, and if the player asks about one before they are "
    "there, help with the problem at hand first and say the finale can wait."
)


def _versus_card(kind: str) -> str:
    return _block(f"Left 4 Dead 2 / {kind}: Made-up note", "A made-up note about this kind of play.")


class FinaleRuleTests(unittest.TestCase):
    """Piece 2: a versus-style note brings one rule about campaign finales; no other turn does."""

    def test_the_five_kinds_are_the_ones_the_brief_names(self):
        self.assertEqual(set(FINALE_RULE_NOTE_KINDS), {"versus", "coop", "callout", "survival", "realism"})

    def test_each_of_the_five_kinds_brings_the_rule(self):
        for kind in FINALE_RULE_NOTE_KINDS:
            for mode in ("strategy", "expert", "speed"):
                with self.subTest(kind=kind, mode=mode):
                    self.assertIn(_FINALE_SENTENCE, _build(_versus_card(kind), ask_mode=mode))

    def test_the_rule_appears_once_even_with_two_such_notes(self):
        two = _versus_card("versus") + _versus_card("coop")
        self.assertEqual(_build(two).count(_FINALE_SENTENCE), 1)

    def test_other_kinds_do_not_bring_the_rule(self):
        for kind in ("boss", "tip", "mechanic", "starting_out"):
            with self.subTest(kind=kind):
                self.assertNotIn(_FINALE_SENTENCE, _build(_versus_card(kind)))

    def test_no_notes_and_no_block_bring_no_rule(self):
        self.assertNotIn(_FINALE_SENTENCE, _build(""))
        self.assertNotIn(_FINALE_SENTENCE, _build(_PLAIN_CARD))

    def test_a_card_that_only_mentions_the_word_versus_does_not_bring_the_rule(self):
        card = _block("Hades / boss: Megaera", "Best in a / versus: style duel, they say.")
        self.assertNotIn(_FINALE_SENTENCE, _build(card))

    def test_the_prompt_differs_from_a_boss_note_turn_by_exactly_that_one_line(self):
        with_rule = _build(_versus_card("versus"))
        plain = _build(_versus_card("boss"))
        same_card = with_rule.replace("versus: Made-up", "boss: Made-up")
        self.assertEqual(same_card.replace("\nFINALE RULE: " + _FINALE_SENTENCE + "\n", ""), plain)

    def test_the_constitution_states_the_same_rule_in_plain_words(self):
        doc = (Path(__file__).parent.parent / "docs" / "planning" / "spoiler-constitution.md").read_text(
            encoding="utf-8"
        )
        flat = " ".join(doc.split())
        for words in ("campaign finale", "tactics or layout", "before they are there", "the finale can wait"):
            with self.subTest(words=words):
                self.assertIn(words, flat)


_FLAGGED = frozenset({TURN_FLAG_NOTES_DO_NOT_COVER})


def _switch(on: bool, wording: str = "a"):
    """Hold the honest-"I don't know" switch and wording for one block of a test."""
    return patch.multiple(ollama_prompts, HONEST_UNKNOWN_ON=on, HONEST_UNKNOWN_WORDING=wording)


class HonestUnknownSentenceTests(unittest.TestCase):
    """Piece 3, the prompt side: one sentence, only when the turn's flag says the notes do not cover it."""

    def test_there_are_five_wordings_and_each_is_one_sentence(self):
        self.assertEqual(sorted(HONEST_UNKNOWN_WORDINGS), ["a", "b", "c", "d", "e"])
        for key, wording in HONEST_UNKNOWN_WORDINGS.items():
            with self.subTest(wording=key):
                body = wording.split(": ", 1)[1]
                self.assertTrue(body.endswith("."))
                self.assertEqual(body.count("."), 1)
                self.assertNotIn(". ", body)

    def test_the_first_three_wordings_are_exactly_as_measured_on_2026_11_09(self):
        # Plan 103 follow-up H1 added d and e beside these; a, b and c must stay as they were measured.
        pinned = {
            "a": (207, "178d6176bac4ae3c6a7b16f8fd3d40ec4925d82bf0de22b3e74c38196bfe66f8"),
            "b": (256, "963c1ecd72257ef53b9945460dc001d7b22ca53c083d6e7c5f9bf3b01f55b63d"),
            "c": (194, "263b0943d72feb5b36950f32cca43d4ec88e5ffd4371dbd2e2b552c654704797"),
        }
        for key, (length, digest) in pinned.items():
            with self.subTest(wording=key):
                text = HONEST_UNKNOWN_WORDINGS[key]
                self.assertEqual(len(text), length)
                self.assertEqual(hashlib.sha256(text.encode("utf-8")).hexdigest(), digest)

    def test_d_and_e_name_both_cases_the_player_may_be_in(self):
        # The maintainer's ask of 2026-11-10: help from what the model itself knows first, with a short
        # honest remark; say plainly it does not know a thing it does not recognise, and make nothing up.
        for key in ("d", "e"):
            with self.subTest(wording=key):
                body = HONEST_UNKNOWN_WORDINGS[key].split(": ", 1)[1].lower()
                self.assertIn("your own knowledge", body)
                self.assertIn("say that plainly", body)
                self.assertIn("general help marked as general", body)

    def test_d_and_e_do_not_ask_for_an_opening_admission_or_an_apology(self):
        for key in ("d", "e"):
            with self.subTest(wording=key):
                body = HONEST_UNKNOWN_WORDINGS[key].lower()
                for word in ("begin your reply", "open with", "sorry", "apolog", "i do not have"):
                    self.assertNotIn(word, body)

    def test_with_the_flag_set_and_the_switch_on_the_instructions_carry_the_sentence(self):
        for key, wording in HONEST_UNKNOWN_WORDINGS.items():
            for card in (_PLAIN_CARD, ""):
                with self.subTest(wording=key, block=bool(card)), _switch(True, key):
                    self.assertIn(wording, _build(card, turn_flags=_FLAGGED))

    def test_with_the_flag_clear_no_wording_appears_even_with_the_switch_on(self):
        for key in HONEST_UNKNOWN_WORDINGS:
            with self.subTest(wording=key), _switch(True, key):
                text = _build(_PLAIN_CARD, turn_flags=frozenset())
                for wording in HONEST_UNKNOWN_WORDINGS.values():
                    self.assertNotIn(wording, text)

    def test_with_the_switch_off_the_flag_changes_nothing(self):
        with _switch(False):
            self.assertEqual(_build(_PLAIN_CARD, turn_flags=_FLAGGED), _build(_PLAIN_CARD))

    def test_an_unrelated_flag_name_changes_nothing(self):
        with _switch(True):
            self.assertEqual(_build(_PLAIN_CARD, turn_flags=frozenset({"something_else"})), _build(_PLAIN_CARD))

    def test_with_the_flag_clear_every_saved_fingerprint_is_still_the_same(self):
        # The default-tier golden file is checked by test_spoiler_tier.py with the argument left out;
        # here the argument is passed empty and the switch is on, which must read the same.
        with _switch(True):
            for name, kw in prompt_cases():
                with self.subTest(case=name):
                    self.assertEqual(build_prompt(**kw), build_prompt(turn_flags=frozenset(), **kw))

    def test_the_sentence_is_one_added_line_after_the_notes_and_before_the_mode_orders(self):
        with _switch(True, "a"):
            flagged = _build(_PLAIN_CARD, turn_flags=_FLAGGED)
        plain = _build(_PLAIN_CARD)
        wording = HONEST_UNKNOWN_WORDINGS["a"]
        self.assertEqual(flagged.replace("\n" + wording + "\n", "", 1), plain)
        self.assertLess(flagged.index("--- end of knowledge base ---"), flagged.index(wording))
        self.assertLess(flagged.index(wording), flagged.index("STRATEGY GUIDE MODE"))

    def test_a_thank_you_turn_never_gets_the_sentence(self):
        with _switch(True):
            text = _build(_PLAIN_CARD, turn_flags=_FLAGGED, courtesy_turn=True)
        for wording in HONEST_UNKNOWN_WORDINGS.values():
            self.assertNotIn(wording, text)

    def test_an_unknown_wording_key_falls_back_to_the_first(self):
        with _switch(True, "zzz"):
            self.assertIn(HONEST_UNKNOWN_WORDINGS["a"], _build(_PLAIN_CARD, turn_flags=_FLAGGED))


# The shapes run_game_ai_request builds (see tests/test_kb_attach_log_line.py for the same ones).
_THIN_MATCH = {
    "kb_attached": True,
    "kb_domain": "strategy",
    "kb_best_meaning": 0.58,
    "kb_best_meaning_without_game_name": None,
    "kb_top_card_keyword_score": 0.0,
    "kb_notes": "",
    "kb_unavailable_reason": "",
    "kb_sources": [{"title": "Deep Rock Galactic: Survivor — Upgrades and overclocks"}],
}
_NOTHING_ATTACHED = {**_THIN_MATCH, "kb_attached": False, "kb_sources": []}
_CUT_FOR_ROOM = {**_NOTHING_ATTACHED, "kb_notes": "dropped_by_context_budget"}
_TIP_SHEET_EMPTY = {**_NOTHING_ATTACHED, "kb_domain": "compat"}
_GOOD_MATCH = {
    **_THIN_MATCH,
    "kb_best_meaning": 0.95,
    "kb_top_card_keyword_score": 5.0,
    "kb_sources": [{"title": "Deep Rock Galactic: Survivor — Exploder"}],
}
_STRAY_NOTES = [{"name": "Upgrades and overclocks", "kind": "mechanic", "domain": "strategy", "card": "x" * 700}]
_EXPLODER = [{"name": "Exploder", "kind": "enemy", "domain": "strategy", "card": "The Exploder blows up near you."}]
_COVERED = {"kb_coverage_status": "sections"}
_UNCOVERED = {"kb_coverage_status": "none"}


def _flags(transparency, notes, *, mode="strategy", coverage=_COVERED, question="how do I tame a horse",
           courtesy=False):
    return prompt_turn_flags(
        ask_mode=mode,
        kb_transparency=transparency,
        kb_coverage_transparency=coverage,
        text_resolved_title="",
        question_for_kb_search=question,
        kb_attached_notes=notes,
        courtesy_turn=courtesy,
    )


def _footer_added(transparency, notes, *, mode="strategy", coverage=_COVERED, question="how do I tame a horse",
                  courtesy=False) -> bool:
    with patch.object(kb_notes_footers, "logger"):
        reply = kb_notes_footers.append_kb_notes_footers(
            "reply", ask_mode=mode, kb_transparency=transparency, kb_coverage_transparency=coverage,
            text_resolved_title="", question_for_kb_search=question, kb_attached_notes=notes,
            courtesy_turn=courtesy,
        )
    return reply != "reply"


class TurnFlagTests(unittest.TestCase):
    """Piece 3, the back-end side: the flag is worked out before the AI is asked, with the footer's own rules."""

    def test_a_turn_where_nothing_matched_and_a_stray_genre_card_came_along_is_flagged(self):
        # The "No close match" case: a card is attached anyway, and it is a stretch.
        self.assertEqual(_flags(_THIN_MATCH, _STRAY_NOTES), _FLAGGED)

    def test_a_turn_where_nothing_attached_for_a_covered_game_is_flagged(self):
        # The "Not in my notes" case.
        self.assertEqual(_flags(_NOTHING_ATTACHED, []), _FLAGGED)

    def test_a_turn_with_a_good_match_is_not_flagged(self):
        self.assertEqual(_flags(_GOOD_MATCH, _EXPLODER, question="how do I beat the exploder"), frozenset())

    def test_cases_the_footer_stays_quiet_on_are_not_flagged(self):
        self.assertEqual(_flags(_NOTHING_ATTACHED, [], courtesy=True), frozenset())
        self.assertEqual(_flags(_NOTHING_ATTACHED, [], mode="speed"), frozenset())
        self.assertEqual(_flags(_CUT_FOR_ROOM, []), frozenset())
        self.assertEqual(_flags(_TIP_SHEET_EMPTY, []), frozenset())
        self.assertEqual(_flags(_NOTHING_ATTACHED, [], coverage=_UNCOVERED), frozenset())

    def test_the_flag_is_set_exactly_when_the_footer_would_be_added(self):
        cases = itertools.product(
            (_THIN_MATCH, _NOTHING_ATTACHED, _CUT_FOR_ROOM, _TIP_SHEET_EMPTY, _GOOD_MATCH),
            ([], _STRAY_NOTES, _EXPLODER),
            ("strategy", "expert", "speed"),
            (_COVERED, _UNCOVERED),
            ("how do I tame a horse", "how do I beat the exploder"),
            (False, True),
        )
        for transparency, notes, mode, coverage, question, courtesy in cases:
            with self.subTest(attached=transparency["kb_attached"], notes=len(notes), mode=mode,
                              coverage=coverage["kb_coverage_status"], question=question, courtesy=courtesy):
                args = dict(mode=mode, coverage=coverage, question=question, courtesy=courtesy)
                self.assertEqual(
                    bool(_flags(transparency, notes, **args)), _footer_added(transparency, notes, **args)
                )


class TurnFlagReachesThePromptEndToEndTests(SmallLibraryAskSetup, unittest.TestCase):
    """The real ask path against a small real library: what is handed to the AI, and what the reply ends with."""

    def _ask(self, question):
        plugin = _FakePlugin(self.settings)
        plugin.reply = "I am not sure about that."
        result = asyncio.run(
            run_game_ai_request(
                plugin, question, "127.0.0.1:11434", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME,
                ask_mode="strategy",
            )
        )
        return plugin.ask_calls[0], result

    def _system_prompt_for(self, call, question):
        return build_system_prompt(
            question, _DRG_APP_ID, _DRG_APP_NAME, [], [], lambda _a: "", lambda _p: {}, ask_mode="strategy",
            early_context_suffix=call.get("proton_log_attachment") or "", turn_flags=call["turn_flags"],
        )

    def test_a_question_the_notes_do_not_cover_is_flagged_and_the_reply_gets_a_footer(self):
        question = "How do I tame a horse in Deep Rock Galactic Survivor?"
        call, result = self._ask(question)
        self.assertEqual(call["turn_flags"], _FLAGGED)
        self.assertIn("my notes", str(result.get("response")))

    def test_a_question_a_note_answers_is_not_flagged_and_the_reply_gets_no_footer(self):
        question = "How do I beat the Glyphid Dreadnought boss in Deep Rock Galactic Survivor?"
        call, result = self._ask(question)
        self.assertEqual(call["turn_flags"], frozenset())
        self.assertNotIn("my notes", str(result.get("response")))

    def test_with_the_switch_on_the_flagged_turns_instructions_carry_the_sentence_and_the_other_does_not(self):
        horse = "How do I tame a horse in Deep Rock Galactic Survivor?"
        boss = "How do I beat the Glyphid Dreadnought boss in Deep Rock Galactic Survivor?"
        horse_call, _ = self._ask(horse)
        kb_followup_memory.forget()
        boss_call, _ = self._ask(boss)
        wording = HONEST_UNKNOWN_WORDINGS["a"]
        with _switch(True, "a"):
            self.assertIn(wording, self._system_prompt_for(horse_call, horse))
            self.assertNotIn(wording, self._system_prompt_for(boss_call, boss))
        with _switch(False):
            self.assertNotIn(wording, self._system_prompt_for(horse_call, horse))


if __name__ == "__main__":
    unittest.main()
