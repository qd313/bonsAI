"""Expert answers go deeper than Speed, and a two-part question gets both parts answered.

What a person sees: on the Deck's own small model, Expert gave a median answer of 511 characters
against Speed's 551, and both modes dropped half of a two-part question (plan 96 row P96-F8-EXPERT).
The model reads one system prompt per question, so these tests pin that prompt: Expert's carries a
"name the specifics, never less than a quick answer" block that Speed's does not, and any question
that asks two things carries a short "answer each part in order, say so when you do not know"
rule in every mode. The last class builds the prompt through the real Ask path.
"""

import sys
import tempfile
import types
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

if "decky" not in sys.modules:  # pragma: no cover - the stub installer above normally owns this
    sys.modules["decky"] = types.ModuleType("decky")

from backend.prompts.answer_depth_blocks import (  # noqa: E402
    EXPERT_DEPTH_BLOCK,
    MULTI_PART_BLOCK,
    is_multi_part_question,
)
from main import Plugin  # noqa: E402
from test_terse_mode_prompt import _prompt  # noqa: E402  (the shared prompt builder)

DEPTH_MARK = "EXPERT ANSWER DEPTH"
PARTS_MARK = "MORE THAN ONE QUESTION"

# The ten questions the Deck run of 2026-10-18 sent, five per mode (evidence plan96-P96-F8-EXPERT.json).
DECK_TWO_PART = (
    "In Hades, which weapon is best for a first clear and what should I spend my first keys on?",
    "In Hades, how do boons from Athena help and which Mirror upgrades matter early?",
    "In Hades, what does Darkness do and how should I use the Pact of Punishment?",
    "In Hades, how do I beat Megaera and what should I buy from the Broker first?",
    "In Hades, which duo boons are worth chasing and how do I get a Daedalus Hammer?",
    "In Hades, which weapon suits a new player and what are the first keys for?",
    "In Hades, what do boons from Athena give you and which Mirror of Night talents come first?",
    "In Hades, what is Darkness used for and how does the Pact of Punishment work?",
    "In Hades, how is Megaera beaten and what is worth buying from the Broker early?",
    "In Hades, which duo boons should I aim for and where do Daedalus Hammers come from?",
)

ONE_PART = (
    "how do i beat the dreadnought",
    "What does Proton do?",
    "Which weapon should a beginner pick in Hades?",
    "how do I install proton and run steam",
    "what is rock and roll",
    "How do I beat Megaera and then move on to the next boss",
)


class WhatCountsAsTwoParts(unittest.TestCase):
    def test_every_two_part_question_from_the_deck_run_is_seen(self):
        for q in DECK_TWO_PART:
            self.assertTrue(is_multi_part_question(q), q)

    def test_other_shapes_of_two_asks_are_seen(self):
        for q in (
            "Which charm is best? And where do I buy it?",
            "what is the best weapon and why",
            "What does Darkness do, and also how do I get more?",
            "Tell me about:\n1. the best weapon\n2. the first keys to buy",
            "Tell me about:\n- the best weapon\n- the first keys to buy",
        ):
            self.assertTrue(is_multi_part_question(q), q)

    def test_a_one_part_question_is_not(self):
        for q in ONE_PART:
            self.assertFalse(is_multi_part_question(q), q)
        self.assertFalse(is_multi_part_question(""))
        self.assertFalse(is_multi_part_question(None))


class TheExpertDepthBlock(unittest.TestCase):
    def test_expert_carries_it_on_a_first_question_and_a_plain_one_alike(self):
        for q in ("what does proton do", DECK_TWO_PART[5]):
            self.assertIn(DEPTH_MARK, _prompt(q, ask_mode="expert"), q)

    def test_speed_and_strategy_do_not(self):
        for mode in ("speed", "strategy"):
            self.assertNotIn(DEPTH_MARK, _prompt("what does proton do", ask_mode=mode), mode)

    def test_it_asks_for_specifics_and_never_less_than_speed(self):
        self.assertIn("name the specific", EXPERT_DEPTH_BLOCK)
        self.assertIn("never shorter", EXPERT_DEPTH_BLOCK)
        self.assertIn("concisely", EXPERT_DEPTH_BLOCK)  # it says what it replaces in the opening line

    def test_it_steps_aside_when_the_player_chose_a_shorter_reply_style(self):
        for style in ("terse", "caveman"):
            self.assertNotIn(DEPTH_MARK, _prompt("what does proton do", ask_mode="expert", reply_verbosity=style), style)
        for style in ("balanced", "detailed"):
            self.assertIn(DEPTH_MARK, _prompt("what does proton do", ask_mode="expert", reply_verbosity=style), style)

    def test_a_follow_up_in_expert_carries_it_too(self):
        followup = "[Strategy follow-up] Tell me more about the first keys"
        self.assertIn(DEPTH_MARK, _prompt(followup, ask_mode="expert"))


class ThePartsRule(unittest.TestCase):
    def test_a_two_part_question_carries_it_in_every_mode(self):
        for mode in ("speed", "expert", "strategy"):
            for q in DECK_TWO_PART[:2]:
                p = _prompt(q, ask_mode=mode)
                self.assertIn(PARTS_MARK, p, (mode, q))
                self.assertIn("in the order asked", p)
                self.assertIn("say so plainly", p)

    def test_a_one_part_question_does_not_carry_it_in_any_mode(self):
        for mode in ("speed", "expert", "strategy"):
            for q in ONE_PART:
                self.assertNotIn(PARTS_MARK, _prompt(q, ask_mode=mode), (mode, q))

    def test_it_is_short_so_speed_does_not_bloat(self):
        self.assertLess(len(MULTI_PART_BLOCK), 420)
        plain = _prompt("which weapon is best", ask_mode="speed")
        two = _prompt("which weapon is best and what should I buy first", ask_mode="speed")
        self.assertLess(len(two) - len(plain), 480)

    def test_it_comes_before_the_terse_menu_orders_so_the_menu_stays_last(self):
        p = _prompt(DECK_TWO_PART[0], ask_mode="speed", reply_verbosity="terse")
        self.assertIn(PARTS_MARK, p)
        self.assertLess(p.index(PARTS_MARK), p.index("TERSE REPLY MODE"))


class TheOldSpeedOnlyAccuracyBlock(unittest.TestCase):
    def test_it_is_gone_because_no_path_could_ever_send_it(self):
        for mode in ("speed", "expert", "strategy"):
            self.assertNotIn("ACCURACY (Speed mode)", _prompt("what does proton do", ask_mode=mode))


class TheRealAskPath(unittest.IsolatedAsyncioTestCase):
    """Built through Plugin.ask_ollama, the function a real Ask goes through, with only the network faked."""

    async def asyncSetUp(self):
        self.plugin = Plugin()
        self.sent: list[str] = []

    def _fake_post(self, url, model_name, messages, *args, **kwargs):
        self.sent.append(str(messages[0]["content"]))
        return {"success": True, "status": 200, "model": model_name, "response": "ok", "assistant_raw": "ok"}

    async def _ask(self, question, ask_mode):
        with (
            tempfile.TemporaryDirectory() as tmp,
            patch.object(Plugin, "_chat_slots_settings_dir", return_value=tmp),
            patch.object(Plugin, "load_settings", return_value={}),
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=["qwen3:4b"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.media.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.ask.ollama_ask_service.post_ollama_chat", side_effect=self._fake_post),
        ):
            out = await self.plugin.ask_ollama(question, "127.0.0.1:11434", "", "", ask_mode=ask_mode)
        self.assertTrue(out.get("success"))
        return out

    async def test_the_prompt_the_model_receives_for_expert_has_the_depth_block_and_the_parts_rule(self):
        out = await self._ask(DECK_TWO_PART[0], "expert")
        sent = self.sent[0]
        self.assertIn(DEPTH_MARK, sent)
        self.assertIn(PARTS_MARK, sent)
        self.assertEqual(out["system_prompt"], sent)

    async def test_the_prompt_the_model_receives_for_speed_has_only_the_parts_rule(self):
        await self._ask(DECK_TWO_PART[0], "speed")
        sent = self.sent[0]
        self.assertNotIn(DEPTH_MARK, sent)
        self.assertIn(PARTS_MARK, sent)
        self.sent.clear()
        await self._ask("what does proton do", "expert")
        self.assertIn(DEPTH_MARK, self.sent[0])
        self.assertNotIn(PARTS_MARK, self.sent[0])


if __name__ == "__main__":
    unittest.main()
