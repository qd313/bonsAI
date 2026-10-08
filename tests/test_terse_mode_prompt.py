"""Terse mode (Speed answers in three lines): what the AI is told, and where the menu is read.

What a person sees: with Terse mode on, a Speed answer is a few short lines that end with a menu of
choices to dig deeper. These tests pin the instructions that ask for that, that Strategy and Expert
and every Terse-off Ask are word for word what they were, and that the menu in a Speed reply is
actually read out of the answer (it used to be read in Strategy mode only).
"""

import json
import sys
import tempfile
import types
import unittest
from unittest.mock import MagicMock, patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

if "decky" not in sys.modules:  # pragma: no cover - the stub installer above normally owns this
    sys.modules["decky"] = types.ModuleType("decky")

from backend.services.ollama_prompts import build_system_prompt  # noqa: E402
from backend.services.reply_style_blocks import (  # noqa: E402
    DEPTH_PHRASES,
    build_reply_verbosity_block,
    terse_mode_applies,
)
from backend.services.ollama_service import post_ollama_chat  # noqa: E402
from fake_ollama_stream import ndjson_response  # noqa: E402
from main import Plugin  # noqa: E402

BRANCH_FENCE = "```bonsai-strategy-branches"
CAP_SENTENCE = "at most THREE lines"
LOOSE_SENTENCE = "three-line cap is loosened"
FOLLOWUP_PREFIX = "[Strategy follow-up]"


def _prompt(question="how do i beat the dreadnought", *, ask_mode="speed", **kwargs):
    return build_system_prompt(
        question=question,
        app_id="",
        app_name="",
        normalized_attachments=[],
        prepared_images=[],
        lookup_app_name=lambda _a: "",
        lookup_screenshot_vdf_metadata=lambda _p: {},
        ask_mode=ask_mode,
        **kwargs,
    )


class WhenTerseModeApplies(unittest.TestCase):
    def test_only_a_real_true_in_speed_mode_counts(self):
        self.assertTrue(terse_mode_applies(True, "speed"))
        for mode in ("strategy", "expert", "", "bogus"):
            self.assertFalse(terse_mode_applies(True, mode), mode)
        for value in (False, None, "yes", 1, "true"):
            self.assertFalse(terse_mode_applies(value, "speed"), repr(value))


class TerseSpeedPrompt(unittest.TestCase):
    def test_a_first_question_carries_the_three_line_rule_and_the_menu_requirement(self):
        p = _prompt(terse_mode=True)
        self.assertIn("TERSE REPLY MODE", p)
        self.assertIn(CAP_SENTENCE, p)
        self.assertIn(BRANCH_FENCE, p)
        self.assertIn("End EVERY reply", p)
        self.assertNotIn(LOOSE_SENTENCE, p)

    def test_a_follow_up_still_ends_with_the_menu_and_says_so_plainly(self):
        q = f"{FOLLOWUP_PREFIX} I'm at: Weak points.\nEarlier I asked: how do i beat the dreadnought"
        p = _prompt(q, terse_mode=True)
        self.assertIn(CAP_SENTENCE, p)
        self.assertIn(BRANCH_FENCE, p)
        self.assertIn("End EVERY reply", p)
        self.assertIn("picked a topic from the menu", p)
        # The screen's follow-up text also asks for a cheat section; terse mode must overrule it
        # and must not ask for a checklist block, which Speed replies never read.
        self.assertIn("cheat", p)
        self.assertIn("Do NOT write a ```bonsai-strategy-checklist", p)
        # And the Strategy-only ban on a menu in a follow-up is not in this prompt at all.
        self.assertNotIn("Do NOT repeat this branching fence", p)
        self.assertNotIn("Do NOT output a ```bonsai-strategy-branches block", p)

    def test_the_menu_example_is_placeholders_the_copy_guard_would_drop(self):
        p = _prompt(terse_mode=True)
        fence_at = p.index(BRANCH_FENCE)
        example = p[fence_at : fence_at + 400]
        self.assertIn("<", example)
        self.assertNotIn("Ravenholm", example)

    def test_the_reply_style_slider_is_ignored(self):
        for style in ("caveman", "detailed", "balanced"):
            p = _prompt(terse_mode=True, reply_verbosity=style)
            self.assertNotIn("CAVEMAN REPLY STYLE", p, style)
            self.assertNotIn("DETAILED REPLY STYLE", p, style)
            self.assertNotIn("REPLY VERBOSITY:", p, style)
            self.assertIn(CAP_SENTENCE, p, style)

    def test_a_character_still_picks_the_words_but_in_three_lines(self):
        p = _prompt(terse_mode=True, character_roleplay_on=True, reply_verbosity="caveman")
        self.assertIn(CAP_SENTENCE, p)
        self.assertIn("character", p.split("TERSE REPLY MODE", 1)[1].lower())
        # Without terse mode a character makes Caveman step aside entirely; that is unchanged.
        plain = _prompt(terse_mode=False, character_roleplay_on=True, reply_verbosity="caveman")
        self.assertNotIn("CAVEMAN REPLY STYLE", plain)
        self.assertNotIn("TERSE REPLY MODE", plain)

    def test_the_thinking_is_not_capped_only_what_is_written(self):
        p = _prompt(terse_mode=True)
        self.assertIn("not how hard you think", p)

    def test_destructive_warnings_are_written_in_normal_prose_outside_the_cap(self):
        p = _prompt(terse_mode=True)
        self.assertIn("destructive", p)
        self.assertIn("clear normal prose", p)
        self.assertIn("outside the cap", p)

    def test_fenced_panels_and_code_do_not_count_toward_the_three_lines(self):
        p = _prompt(terse_mode=True)
        for free in ("bonsai-strategy-branches", "bonsai-cite", "code blocks", "file paths"):
            self.assertIn(free, p.split("TERSE REPLY MODE", 1)[1], free)

    def test_every_depth_phrase_loosens_the_cap(self):
        self.assertEqual(len(DEPTH_PHRASES), 10)
        for phrase in DEPTH_PHRASES:
            p = _prompt(f"can you give me a {phrase} of how the boss works", terse_mode=True)
            self.assertIn(LOOSE_SENTENCE, p, phrase)
            self.assertNotIn(CAP_SENTENCE, p, phrase)
            self.assertIn(BRANCH_FENCE, p, phrase)

    def test_none_of_the_ten_test_questions_loosens_the_cap(self):
        # roadmap-details.md: the ten TERSE-01 questions deliberately hold no depth phrase.
        for q in (
            "how do i beat the dreadnought",
            "what is the max tdp on a steam deck",
            "my game stutters when i turn",
            "should i cap fps at 30 or 40",
            "what does proton do",
            "how do i deal with exploders",
            "is 8 watts enough for this game",
            "what should i upgrade first",
            "why did my save not carry over",
            "how do i get more battery life",
        ):
            self.assertIn(CAP_SENTENCE, _prompt(q, terse_mode=True), q)

    def test_a_power_question_keeps_the_tdp_block_above_the_menu(self):
        p = _prompt("what tdp should i use for battery life", terse_mode=True)
        self.assertIn("TERSE REPLY MODE", p)
        self.assertIn("immediately above", p.split("TERSE REPLY MODE", 1)[1])

    def test_a_knowledge_base_strategy_question_is_not_told_to_drop_the_menu(self):
        # A Speed question with a strategy card attached ("the dreadnought", "exploders") also
        # gets the spoiler rules, whose closing line used to ban the menu outright: two clashing
        # orders on exactly the questions the ten-question test asks (plan 83, the judge's finding).
        p = _prompt(terse_mode=True, strategy_domain_guidance=True)
        self.assertIn("STRATEGY SPOILER CONSTITUTION", p)
        self.assertNotIn("do not emit ```bonsai-strategy-branches```", p)
        self.assertIn("do not emit a ```bonsai-strategy-checklist``` fence", p)
        self.assertIn("End EVERY reply", p)

    def test_without_terse_a_knowledge_base_speed_question_still_bans_both_fences(self):
        p = _prompt(strategy_domain_guidance=True)
        self.assertIn(
            "do not emit ```bonsai-strategy-branches``` or ```bonsai-strategy-checklist``` fences", p
        )


class EverythingElseIsExactlyAsBefore(unittest.TestCase):
    def test_terse_off_is_identical_to_not_passing_it_in_every_mode(self):
        for mode in ("speed", "strategy", "expert"):
            for style in ("balanced", "caveman", "detailed"):
                kwargs = dict(ask_mode=mode, reply_verbosity=style)
                self.assertEqual(_prompt(terse_mode=False, **kwargs), _prompt(**kwargs), (mode, style))
                self.assertNotIn("TERSE REPLY MODE", _prompt(terse_mode=False, **kwargs))

    def test_terse_on_changes_nothing_in_strategy_or_expert(self):
        for mode in ("strategy", "expert"):
            for style in ("balanced", "caveman", "detailed"):
                for q in ("how do i beat the dreadnought", f"{FOLLOWUP_PREFIX} I'm at: the boss room."):
                    kwargs = dict(ask_mode=mode, reply_verbosity=style)
                    self.assertEqual(_prompt(q, terse_mode=True, **kwargs), _prompt(q, **kwargs), (mode, style, q))

    def test_strategy_keeps_its_own_menu_rules(self):
        first = _prompt(ask_mode="strategy", terse_mode=True)
        self.assertIn("the branch picker is mandatory on this turn", first)
        follow = _prompt(f"{FOLLOWUP_PREFIX} I'm at: x.", ask_mode="strategy", terse_mode=True)
        self.assertIn("Do NOT output a ```bonsai-strategy-branches block on this turn", follow)

    def test_the_verbosity_block_alone_is_untouched(self):
        # Caveman's own step-aside for a character is exactly what it was.
        self.assertEqual(
            build_reply_verbosity_block("caveman", question="q", ask_mode="speed", character_roleplay_on=True), ""
        )
        self.assertIn(
            "CAVEMAN REPLY STYLE", build_reply_verbosity_block("caveman", question="q", ask_mode="speed")
        )


class TheRealAskPath(unittest.IsolatedAsyncioTestCase):
    """Built through Plugin.ask_ollama, the function a real Ask goes through, with only the network faked."""

    async def asyncSetUp(self):
        self.tmp = tempfile.mkdtemp()
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.plugin = Plugin()
        self.sent_system_prompts: list[str] = []

    def _fake_post(self, reply):
        def post(url, model_name, messages, *args, **kwargs):
            self.sent_system_prompts.append(str(messages[0]["content"]))
            self.post_kwargs = kwargs
            self.post_args = args
            return {"success": True, "status": 200, "model": model_name, "response": reply, "assistant_raw": reply}

        return post

    async def _ask(self, question, *, settings, ask_mode="speed", reply="ok"):
        with (
            patch.object(Plugin, "load_settings", return_value=settings),
            patch("backend.services.ollama_ask_service.list_installed_ollama_tags", return_value=["qwen2.5:3b"]),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.services.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.services.ollama_ask_service.post_ollama_chat", side_effect=self._fake_post(reply)),
        ):
            return await self.plugin.ask_ollama(question, "127.0.0.1:11434", "", "", ask_mode=ask_mode)

    async def test_a_speed_question_with_terse_on_sends_the_three_line_rule_and_the_menu(self):
        out = await self._ask("how do i beat the dreadnought", settings={"terse_mode": True})
        self.assertTrue(out.get("success"))
        sent = self.sent_system_prompts[0]
        self.assertIn(CAP_SENTENCE, sent)
        self.assertIn(BRANCH_FENCE, sent)
        # The same text is what the Details screen later shows.
        self.assertEqual(out["system_prompt"], sent)

    async def test_the_slider_is_ignored_on_the_real_path_too(self):
        await self._ask("what does proton do", settings={"terse_mode": True, "reply_verbosity": "caveman"})
        self.assertNotIn("CAVEMAN REPLY STYLE", self.sent_system_prompts[0])
        self.assertIn(CAP_SENTENCE, self.sent_system_prompts[0])

    async def test_a_character_on_the_real_path_still_gets_the_three_line_rule(self):
        settings = {
            "terse_mode": True,
            "ai_character_enabled": True,
            "ai_character_random": False,
            "ai_character_preset_id": "",
            "ai_character_custom_text": "A grumpy lighthouse keeper.",
        }
        await self._ask("what does proton do", settings=settings)
        sent = self.sent_system_prompts[0]
        self.assertIn(CAP_SENTENCE, sent)
        self.assertIn("lighthouse keeper", sent)
        self.assertIn("three lines", sent.split("lighthouse keeper", 1)[1])

    async def test_terse_off_and_terse_on_in_other_modes_send_no_terse_rule(self):
        await self._ask("what does proton do", settings={"terse_mode": False})
        await self._ask("what does proton do", settings={"terse_mode": True}, ask_mode="strategy")
        await self._ask("what does proton do", settings={"terse_mode": True}, ask_mode="expert")
        await self._ask("what does proton do", settings={})
        for sent in self.sent_system_prompts:
            self.assertNotIn("TERSE REPLY MODE", sent)

    async def test_the_ask_tells_the_model_call_to_read_the_menu_only_when_terse_applies(self):
        await self._ask("what does proton do", settings={"terse_mode": True})
        self.assertIs(self.post_kwargs.get("terse_branch_menu"), True)
        await self._ask("what does proton do", settings={"terse_mode": False})
        self.assertIs(self.post_kwargs.get("terse_branch_menu"), False)
        await self._ask("what does proton do", settings={"terse_mode": True}, ask_mode="expert")
        self.assertIs(self.post_kwargs.get("terse_branch_menu"), False)


class TheMenuInASpeedReplyReachesTheScreen(unittest.TestCase):
    """The branch menu used to be read out of a Strategy reply only; a Speed reply showed it as raw text."""

    REPLY = (
        "Dodge left, then hit the glowing back.\n"
        "```bonsai-strategy-branches\n"
        '{"question":"What next?","options":[{"id":"a","label":"Weak points"},{"id":"b","label":"Best gear"}]}\n'
        "```"
    )

    def _post(self, mode, *, reply=None, piece=None, **kwargs):
        """Run one streamed reply through the real call; every text the screen was handed lands in self.seen."""
        reply = self.REPLY if reply is None else reply
        pieces = [reply[i : i + piece] for i in range(0, len(reply), piece)] if piece else [reply]
        lines = [json.dumps({"message": {"role": "assistant", "content": p}}) for p in pieces]
        lines.append(json.dumps({"message": {"role": "assistant", "content": ""}, "done": True, "done_reason": "stop"}))
        self.seen = []
        with patch("backend.services.ollama_service.urllib.request.urlopen", return_value=ndjson_response(lines)):
            return post_ollama_chat(
                "http://127.0.0.1:11434/api/chat",
                "gemma4:e2b-it-qat",
                [{"role": "user", "content": "q"}],
                60,
                [],
                [],
                [],
                [],
                MagicMock(),
                mode,
                "5m",
                cancel_requested=lambda: False,
                on_delta=lambda text, done, thinking=None: self.seen.append(text),
                think_effort="off",
                **kwargs,
            )

    def test_a_terse_speed_reply_gives_the_screen_its_menu_and_hides_the_raw_block(self):
        out = self._post("speed", terse_branch_menu=True)
        branches = out["strategy_guide_branches"]
        self.assertEqual([o["label"] for o in branches["options"]], ["Weak points", "Best gear"])
        self.assertNotIn("bonsai-strategy-branches", out["response"])
        self.assertNotIn('"options"', out["response"])
        self.assertIn("Dodge left", out["response"])
        self.assertIsNone(out["strategy_checklist"])

    def test_a_plain_speed_reply_is_left_exactly_as_before(self):
        out = self._post("speed")
        self.assertIsNone(out["strategy_guide_branches"])

    def test_the_flag_does_nothing_to_a_strategy_reply(self):
        plain = self._post("strategy")
        flagged = self._post("strategy", terse_branch_menu=True)
        self.assertEqual(plain["strategy_guide_branches"], flagged["strategy_guide_branches"])
        self.assertEqual(plain["response"], flagged["response"])
        self.assertIsNotNone(plain["strategy_guide_branches"])

    # Question 8 of the Deck run on 2026-10-08 (Terse on, Speed), word for word: the answer, then
    # the menu as bare JSON with no fence.
    ANSWER_8 = (
        "Pick one weapon to carry the run, see? Then spend the rest of your cash on making sure you "
        "don't get instantly wiped out. That's the main way to keep your run going, mate."
    )
    MENU_8 = (
        '{"question":"Which weapon should I focus on first?","options":[{"id":"a","label":"Details on '
        'primary weapon choices"},{"id":"b","label":"Tips for survivability upgrades"}]}'
    )
    REPLY_8 = ANSWER_8 + "\n\n" + MENU_8

    def _bare(self, reply, mode="speed", **kwargs):
        """Stream `reply` in 17-letter pieces, as Ollama does."""
        return self._post(mode, reply=reply, piece=17, **kwargs)

    def test_a_bare_json_menu_gives_the_screen_two_choices_and_no_json_text(self):
        out = self._bare(self.REPLY_8, terse_branch_menu=True)
        branches = out["strategy_guide_branches"]
        self.assertEqual(branches["question"], "Which weapon should I focus on first?")
        self.assertEqual(
            [(o["id"], o["label"]) for o in branches["options"]],
            [("a", "Details on primary weapon choices"), ("b", "Tips for survivability upgrades")],
        )
        self.assertNotIn('{"question"', out["response"])
        self.assertNotIn('"options"', out["response"])
        self.assertEqual(out["response"].strip(), self.ANSWER_8)

    def test_the_live_text_never_shows_any_of_the_bare_menu(self):
        self._bare(self.REPLY_8, terse_branch_menu=True)
        self.assertTrue(self.seen)
        for text in self.seen:
            self.assertNotIn("{", text)

    def test_a_bare_menu_that_cannot_be_read_or_has_one_option_is_still_kept_off_the_screen(self):
        for tail in (
            '{"question":"Which weapon?","options":[{"id":"a","label":"One"},{"id":"b"',
            '{"question":"Which?","options":[{"id":"a","label":"Only one"}]}',
        ):
            with self.subTest(tail=tail):
                out = self._bare(self.ANSWER_8 + "\n\n" + tail, terse_branch_menu=True)
                self.assertIsNone(out["strategy_guide_branches"])
                self.assertNotIn("{", out["response"])
                self.assertIn("Pick one weapon", out["response"])

    def test_a_malformed_fence_is_kept_off_the_screen_too(self):
        # Question 6 of the Deck run: a fence was written, with two ids in one option.
        reply = (
            self.ANSWER_8
            + '\n```bonsai-strategy-branches\n{"question":"Which?","options":[{"id":"a","id":"b","label":"X"}'
            + "\n```"
        )
        out = self._bare(reply, terse_branch_menu=True)
        self.assertNotIn("bonsai-strategy-branches", out["response"])
        self.assertNotIn('"options"', out["response"])

    def test_with_terse_off_the_same_reply_is_left_exactly_as_it_is(self):
        out = self._bare(self.REPLY_8)
        self.assertIsNone(out["strategy_guide_branches"])
        self.assertIn(self.MENU_8, out["response"])
        self.assertIn(self.MENU_8, self.seen[-1])

    def test_json_in_a_code_block_in_the_middle_of_an_answer_is_not_touched(self):
        reply = 'Sample config:\n```json\n{"fps_limit": 40}\n```\nPaste that in and restart.'
        out = self._bare(reply, terse_branch_menu=True)
        self.assertIsNone(out["strategy_guide_branches"])
        self.assertIn('{"fps_limit": 40}', out["response"])
        self.assertIn("Paste that in", out["response"])

    def test_strategy_mode_is_unchanged_by_a_bare_menu_with_the_flag_on(self):
        plain = self._bare(self.REPLY_8, mode="strategy")
        flagged = self._bare(self.REPLY_8, mode="strategy", terse_branch_menu=True)
        self.assertEqual(plain["response"], flagged["response"])
        self.assertEqual(plain["strategy_guide_branches"], flagged["strategy_guide_branches"])

    # Question 1 of the Deck run on 2026-10-08 (Terse on, Speed), word for word: the answer, then the
    # menu in a fence whose name has an underscore where the plugin expects a hyphen. The small model
    # wrote it that way in nine answers of ten, and the person saw the JSON in a code box.
    ANSWER_1 = (
        "Listen up, you gotta kite 'em between the waves and keep your eye on those weak armor plates "
        "when they open up. Save that overclock or nuke for when you gotta break through the armor."
    )
    MENU_1 = (
        '{"question":"Which weapon should I focus on first?","options":[{"id":"a","label":"Details on '
        'primary weapon choices"},{"id":"b","label":"Tips for survivability upgrades"}]}'
    )
    REPLY_1 = ANSWER_1 + "\n\n```bonsai-strategy_branches\n" + MENU_1 + "\n```"
    MENU_1_LABELS = [("a", "Details on primary weapon choices"), ("b", "Tips for survivability upgrades")]

    def _assert_no_raw_menu_on_screen(self, out, seen):
        self.assertNotIn('{"question"', out["response"])
        self.assertNotIn("bonsai-strategy", out["response"])
        for text in seen:
            self.assertNotIn('{"question"', text)
            self.assertNotIn("bonsai-strategy", text)

    def _assert_the_two_buttons_and_no_raw_menu(self, out):
        branches = out["strategy_guide_branches"]
        self.assertIsNotNone(branches)
        self.assertEqual([(o["id"], o["label"]) for o in branches["options"]], self.MENU_1_LABELS)
        self._assert_no_raw_menu_on_screen(out, self.seen)

    def test_an_underscore_fence_in_a_speed_reply_gives_two_buttons_and_no_json(self):
        for piece in (3, 17):
            with self.subTest(piece=piece):
                out = self._post("speed", reply=self.REPLY_1, piece=piece, terse_branch_menu=True)
                branches = out["strategy_guide_branches"]
                self.assertIsNotNone(branches)
                self.assertEqual(branches["question"], "Which weapon should I focus on first?")
                self.assertEqual([(o["id"], o["label"]) for o in branches["options"]], self.MENU_1_LABELS)
                self.assertEqual(out["response"].strip(), self.ANSWER_1)
                self._assert_no_raw_menu_on_screen(out, self.seen)

    def test_an_underscore_fence_in_a_strategy_reply_still_gives_its_menu(self):
        out = self._post("strategy", reply=self.REPLY_1, piece=17)
        self._assert_the_two_buttons_and_no_raw_menu(out)

    def test_every_spelling_of_the_menu_fence_gives_the_same_two_buttons(self):
        # Hyphen is the one the plugin asks for; the other three are the drift the small model writes.
        for name in (
            "bonsai-strategy-branches",
            "bonsai_strategy_branches",
            "bonsai-strategy_branches",
            "bonsai_strategy-branches",
            "BONSAI-STRATEGY_BRANCHES",
        ):
            with self.subTest(name=name):
                reply = self.ANSWER_1 + "\n\n```" + name + "\n" + self.MENU_1 + "\n```"
                out = self._post("speed", reply=reply, piece=17, terse_branch_menu=True)
                self._assert_the_two_buttons_and_no_raw_menu(out)


if __name__ == "__main__":
    unittest.main()
