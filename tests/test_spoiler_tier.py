"""Plan 98, lane B: the spoiler tiers setting changes what a Strategy answer hides.

Three tiers, picked in Settings (Hide more, Default, Hide less):

- ``default`` is the long-standing rule. Its wording is checked against a fingerprint of what the
  tip commit wrote before the setting existed (``tests/fixtures/spoiler_default_tier_golden.json``,
  made by running ``tests/spoiler_default_tier_matrix.py`` on that commit).
- ``strict`` also covers bosses, endings and chapters, even in a game whose own profile says its
  bosses are routine. Naming a boss or an enemy still unlocks that one thing.
- ``open`` covers nothing and asks for no cover.

The tier rides on the turn's spoiler profile (``"strict_tier"`` / ``"open_tier"``), the one value
that already reaches the prompt, the safety net that covers a protected boss, and the Show details
chip. These tests look at each of those, then run the real ask path against a small real library and
read what a person would see: the finished reply, with or without a cover.
"""

import asyncio
import json
import re
import unittest
from pathlib import Path

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from backend.knowledge import kb_followup_memory  # noqa: E402
from backend.spoilers.spoiler_risk_service import (  # noqa: E402
    compute_heuristic_spoiler_risk_score,
    compute_spoiler_risk_band,
    spoiler_risk_detail_bullets,
)
from backend.spoilers.spoiler_title_profiles import (  # noqa: E402
    TIER_PROFILE_OPEN,
    TIER_PROFILE_STRICT,
    apply_spoiler_tier,
)
from backend.spoilers.strategy_spoiler_policy import (  # noqa: E402
    _strategy_kb_spoiler_clause_suppressed,
    _strategy_spoiler_constitution_compact_block,
    _strategy_spoiler_policy_block,
    spoiler_cover_required,
)
from spoiler_default_tier_matrix import (  # noqa: E402
    build_prompt,
    compact_cases,
    policy_cases,
    prompt_cases,
    sha,
)
from test_game_ai_request_story_game_named import (  # noqa: E402
    _DRG_APP_ID,
    _DRG_APP_NAME,
    _HK_QUESTION,
    _HK_REPLY,
    SmallLibraryAskSetup,
    _FakePlugin,
)

GOLDEN = json.loads(
    (Path(__file__).parent / "fixtures" / "spoiler_default_tier_golden.json").read_text(encoding="utf-8")
)

# A reply that names the Hades boss the question never named, and a card for it in the library.
_DRG_BOSS_QUESTION = "How do I beat the boss in the caves in Deep Rock Galactic Survivor?"
_DRG_BOSS_REPLY = "The Glyphid Dreadnought has a weak spot on its back, so circle it and shoot there."


def _outside_covers(text: str) -> str:
    return re.sub(r"```bonsai-spoiler\n.*?```\n?", "", text, flags=re.DOTALL)


class DefaultTierIsTodaysTextTests(unittest.TestCase):
    """Default is the wording the tip wrote, byte for byte, for every input the policy branches on."""

    def test_every_policy_block_reads_as_it_did_on_the_tip(self):
        for name, kw in policy_cases():
            with self.subTest(case=name):
                block = _strategy_spoiler_policy_block(**kw)
                self.assertEqual(sha(block), GOLDEN["policy_blocks_sha256"][name], block)

    def test_every_short_form_for_speed_and_expert_reads_as_it_did_on_the_tip(self):
        for name, kw in compact_cases():
            with self.subTest(case=name):
                block = _strategy_spoiler_constitution_compact_block(**kw)
                self.assertEqual(sha(block), GOLDEN["compact_blocks_sha256"][name], block)

    def test_every_whole_system_prompt_reads_as_it_did_on_the_tip(self):
        for name, kw in prompt_cases():
            with self.subTest(case=name):
                self.assertEqual(sha(build_prompt(**kw)), GOLDEN["prompt_sha256"][name])

    def test_the_default_tier_leaves_the_games_own_profile_alone(self):
        for profile in ("low_narrative", "protect_progression", "unknown", ""):
            for tier in ("default", None, "", "paranoid", 3):
                with self.subTest(profile=profile, tier=tier):
                    self.assertEqual(apply_spoiler_tier(profile, tier), profile)


class TierProfileTests(unittest.TestCase):
    def test_strict_and_open_replace_whatever_profile_the_game_has(self):
        for profile in ("low_narrative", "protect_progression", "unknown"):
            self.assertEqual(apply_spoiler_tier(profile, "strict"), TIER_PROFILE_STRICT)
            self.assertEqual(apply_spoiler_tier(profile, "open"), TIER_PROFILE_OPEN)


class StrictPolicyTests(unittest.TestCase):
    def test_strict_names_bosses_endings_and_chapters_as_things_to_hide(self):
        block = _strategy_spoiler_policy_block(False, False, title_profile=TIER_PROFILE_STRICT)
        self.assertIn("STRATEGY SPOILER POLICY (default)", block)
        for word in ("boss", "ending", "chapter"):
            self.assertIn(word, block.lower())
        self.assertIn("```bonsai-spoiler", block)

    def test_strict_is_wordier_than_default_on_the_same_question(self):
        default = _strategy_spoiler_policy_block(False, False, title_profile="protect_progression")
        strict = _strategy_spoiler_policy_block(False, False, title_profile=TIER_PROFILE_STRICT)
        self.assertNotEqual(default, strict)
        self.assertIn("chapter", strict.lower())
        self.assertNotIn("chapter", default.lower())

    def test_strict_in_a_no_story_game_still_fences_bosses_where_default_does_not(self):
        default = _strategy_spoiler_policy_block(False, False, title_profile="low_narrative")
        strict = _strategy_spoiler_policy_block(False, False, title_profile=TIER_PROFILE_STRICT)
        self.assertIn("Do not use ```bonsai-spoiler fences", default)
        self.assertNotIn("Do not use ```bonsai-spoiler fences", strict)
        self.assertNotIn("LOW-SPOILER-RISK", strict)

    def test_naming_a_boss_still_unlocks_that_one_boss_under_strict(self):
        for followup in (False, True):
            with self.subTest(followup=followup):
                block = _strategy_spoiler_policy_block(
                    False, followup, asked_entity="Megaera", title_profile=TIER_PROFILE_STRICT
                )
                self.assertIn("NAMED-ENTITY CONSENT", block)
                self.assertIn("“Megaera”", block)
                self.assertIn("This applies to that entity ONLY", block)
        first_turn = _strategy_spoiler_policy_block(
            False, False, asked_entity="Megaera", title_profile=TIER_PROFILE_STRICT
        )
        self.assertIn("Do not put anything about “Megaera” inside a ```bonsai-spoiler fence", first_turn)

    def test_asking_for_spoilers_in_words_still_opens_everything_under_strict(self):
        block = _strategy_spoiler_policy_block(True, False, title_profile=TIER_PROFILE_STRICT)
        self.assertIn("user opted in", block)

    def test_strict_applies_to_the_short_form_for_speed_and_expert_too(self):
        short = _strategy_spoiler_constitution_compact_block(False, title_profile=TIER_PROFILE_STRICT)
        self.assertIn("chapter", short.lower())

    def test_strict_keeps_the_knowledge_base_cover_line_in_a_no_story_game(self):
        self.assertTrue(_strategy_kb_spoiler_clause_suppressed(title_profile="low_narrative"))
        self.assertFalse(_strategy_kb_spoiler_clause_suppressed(title_profile=TIER_PROFILE_STRICT))
        prompt = build_prompt(
            ask_mode="strategy", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, strategy_title_profile=TIER_PROFILE_STRICT
        )
        self.assertIn("Put spoilery walkthrough detail inside a hidden block", prompt)


class OpenPolicyTests(unittest.TestCase):
    def test_open_asks_for_no_cover_and_says_so_plainly(self):
        for followup in (False, True):
            for ui in (True, False):
                with self.subTest(followup=followup, ui=ui):
                    block = _strategy_spoiler_policy_block(
                        False, followup, title_profile=TIER_PROFILE_OPEN, include_strategy_ui_fences=ui
                    )
                    self.assertIn("Do not use ```bonsai-spoiler fences", block)
                    self.assertNotIn("Put unavoidably spoilery", block)
                    self.assertNotIn("Avoid story endings", block)
                    self.assertNotIn("keeping spoilers out", block)

    def test_open_gives_the_model_no_reason_to_announce_a_mode(self):
        block = _strategy_spoiler_policy_block(False, False, title_profile=TIER_PROFILE_OPEN)
        self.assertIn("never announce a mode or setting", block)

    def test_open_drops_the_knowledge_base_cover_line(self):
        self.assertTrue(_strategy_kb_spoiler_clause_suppressed(title_profile=TIER_PROFILE_OPEN))
        prompt = build_prompt(
            ask_mode="strategy", app_id="1145360", app_name="Hades", strategy_title_profile=TIER_PROFILE_OPEN
        )
        self.assertNotIn("Put spoilery walkthrough detail inside a hidden block", prompt)
        self.assertNotIn("Avoid story endings", prompt)

    def test_open_applies_to_the_short_form_for_speed_and_expert_too(self):
        short = _strategy_spoiler_constitution_compact_block(False, title_profile=TIER_PROFILE_OPEN)
        self.assertIn("Do not use ```bonsai-spoiler fences", short)
        self.assertNotIn("Avoid story endings", short)


class SafetyNetTests(unittest.TestCase):
    """The check that covers a protected boss the model names anyway follows the tier."""

    def test_open_never_requires_a_cover_even_in_a_story_game(self):
        self.assertTrue(spoiler_cover_required(False, strategy_domain=True, title_profile="protect_progression"))
        self.assertFalse(spoiler_cover_required(False, strategy_domain=True, title_profile=TIER_PROFILE_OPEN))

    def test_strict_requires_a_cover_in_a_no_story_game_where_default_does_not(self):
        self.assertFalse(spoiler_cover_required(False, strategy_domain=True, title_profile="low_narrative"))
        self.assertTrue(spoiler_cover_required(False, strategy_domain=True, title_profile=TIER_PROFILE_STRICT))


class RiskChipTests(unittest.TestCase):
    def _signals(self, profile, **extra):
        base = {"ask_mode": "strategy", "app_id": "", "app_name": "", "title_profile": profile, "kb_section_types": ["boss"]}
        base.update(extra)
        return base

    def test_open_always_reads_low(self):
        for mode in ("speed", "strategy", "expert"):
            for sections in ([], ["boss"], ["boss", "ending", "quest"]):
                with self.subTest(mode=mode, sections=sections):
                    signals = self._signals(TIER_PROFILE_OPEN, ask_mode=mode, kb_section_types=sections)
                    self.assertEqual(compute_spoiler_risk_band(signals), "low")
                    self.assertEqual(
                        compute_spoiler_risk_band(signals, assistant_text="<bonsai-spoiler-risk>high</bonsai-spoiler-risk>"),
                        "low",
                    )

    def test_strict_is_never_relaxed_by_a_no_story_profile(self):
        relaxed = compute_heuristic_spoiler_risk_score(self._signals("low_narrative", kb_section_types=["tip"]))
        strict = compute_heuristic_spoiler_risk_score(self._signals(TIER_PROFILE_STRICT, kb_section_types=["tip"]))
        self.assertGreater(strict, relaxed)
        self.assertGreaterEqual(
            strict, compute_heuristic_spoiler_risk_score(self._signals("protect_progression", kb_section_types=["tip"]))
        )

    def test_the_details_chip_names_the_setting_not_a_game_profile(self):
        strict = spoiler_risk_detail_bullets("med", self._signals(TIER_PROFILE_STRICT))
        self.assertIn("Spoiler setting: Hide more", strict)
        self.assertFalse([b for b in strict if b.startswith("Title profile")])
        opened = spoiler_risk_detail_bullets("low", self._signals(TIER_PROFILE_OPEN))
        self.assertIn("Spoiler setting: Hide less", opened)
        plain = spoiler_risk_detail_bullets("med", self._signals("protect_progression"))
        self.assertIn("Title profile: protect_progression", plain)


class AskPathTests(SmallLibraryAskSetup, unittest.TestCase):
    """The real ask path against a small real library: what the finished reply looks like."""

    def _ask(self, question, *, tier, app_id="", app_name="", reply):
        settings = dict(self.settings)
        if tier is not None:
            settings["spoiler_tier"] = tier
        plugin = _FakePlugin(settings)
        plugin.reply = reply
        result = asyncio.run(
            run_game_ai_request(
                plugin, question, "127.0.0.1:11434", app_id=app_id, app_name=app_name, ask_mode="strategy"
            )
        )
        kb_followup_memory.forget()
        return plugin, result

    # -- what reaches the model --------------------------------------------------------------

    def test_the_tier_reaches_the_prompt_as_the_turns_spoiler_profile(self):
        expect = {None: "protect_progression", "default": "protect_progression", "strict": TIER_PROFILE_STRICT, "open": TIER_PROFILE_OPEN}
        for tier, profile in expect.items():
            with self.subTest(tier=tier):
                plugin, _ = self._ask(_HK_QUESTION, tier=tier, reply=_HK_REPLY)
                self.assertEqual(plugin.ask_calls[-1]["strategy_title_profile"], profile)

    # -- what a person sees ------------------------------------------------------------------

    def test_hide_less_leaves_a_boss_the_question_never_named_uncovered(self):
        _, covered = self._ask(_HK_QUESTION, tier="default", reply=_HK_REPLY)
        self.assertIn("```bonsai-spoiler", covered["response"])
        self.assertNotIn("Soul Master", _outside_covers(covered["response"]))

        _, opened = self._ask(_HK_QUESTION, tier="open", reply=_HK_REPLY)
        self.assertNotIn("```bonsai-spoiler", opened["response"])
        self.assertIn("Soul Master", _outside_covers(opened["response"]))

    def test_hide_less_leaves_the_notes_and_the_menu_uncovered_too(self):
        _, opened = self._ask(_HK_QUESTION, tier="open", reply=_HK_REPLY)
        notes = opened["kb_attached_notes"]
        self.assertTrue(notes)
        self.assertFalse([n for n in notes if n.get("spoiler_protected")])
        menu = opened["strategy_guide_branches"]
        self.assertIn("Soul Master", " ".join([menu["question"]] + [o["label"] for o in menu["options"]]))

    def test_hide_more_covers_a_boss_in_a_no_story_game_that_default_leaves_plain(self):
        _, default = self._ask(
            _DRG_BOSS_QUESTION, tier="default", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_BOSS_REPLY
        )
        self.assertNotIn("```bonsai-spoiler", default["response"])
        self.assertIn("Glyphid Dreadnought", default["response"])

        _, strict = self._ask(
            _DRG_BOSS_QUESTION, tier="strict", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_BOSS_REPLY
        )
        self.assertIn("```bonsai-spoiler", strict["response"])
        self.assertNotIn("Glyphid Dreadnought", _outside_covers(strict["response"]))
        self.assertIn("Glyphid Dreadnought", strict["response"])

    def test_hide_more_in_a_story_game_reads_like_default(self):
        _, default = self._ask(_HK_QUESTION, tier="default", reply=_HK_REPLY)
        _, strict = self._ask(_HK_QUESTION, tier="strict", reply=_HK_REPLY)
        self.assertEqual(default["response"], strict["response"])

    def test_naming_the_boss_still_leaves_that_boss_plain_under_hide_more(self):
        question = "How do I beat the Glyphid Dreadnought in Deep Rock Galactic Survivor?"
        _, strict = self._ask(
            question, tier="strict", app_id=_DRG_APP_ID, app_name=_DRG_APP_NAME, reply=_DRG_BOSS_REPLY
        )
        self.assertIn("Glyphid Dreadnought", _outside_covers(strict["response"]))

    def test_a_missing_or_unknown_tier_leaves_the_answer_exactly_as_default(self):
        _, default = self._ask(_HK_QUESTION, tier="default", reply=_HK_REPLY)
        for tier in (None, "", "paranoid"):
            with self.subTest(tier=tier):
                _, other = self._ask(_HK_QUESTION, tier=tier, reply=_HK_REPLY)
                self.assertEqual(other["response"], default["response"])


if __name__ == "__main__":
    unittest.main()
