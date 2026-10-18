"""Plan 92 lane N2: typing "remember …" or "note: …" answers with a note offer and never asks the AI.

Three levels: the prefix rule, the command answering through both Ask paths (the foreground one and
the background one the screen uses) with an AI that fails the test if it is called, and what Show
details says for that turn.
"""

import unittest
from unittest.mock import patch

from user_notes_plugin_harness import PluginOnATempFolder

from backend.services import chat_slot_service  # noqa: E402
from backend.commands.ask_local_commands import detect_local_ask_commands  # noqa: E402
from backend.answer.transparency_service import build_immediate_command_snapshot  # noqa: E402
from backend.services.user_note_commands import parse_note_command  # noqa: E402
from main import Plugin  # noqa: E402

REMEMBER = "remember no spoilers past the City of Tears"
OFFER_TEXT = "No spoilers past the City of Tears."


class PrefixRuleTests(unittest.TestCase):
    def test_remember_gives_the_words_after_it(self):
        self.assertEqual(parse_note_command(REMEMBER), "no spoilers past the City of Tears")

    def test_note_with_a_colon_gives_the_words_after_it(self):
        self.assertEqual(parse_note_command("note: I use dash on R1"), "I use dash on R1")
        self.assertEqual(parse_note_command("Note : I use dash on R1"), "I use dash on R1")

    def test_remember_that_and_remember_colon_and_capitals(self):
        self.assertEqual(parse_note_command("Remember that I prefer dodging"), "I prefer dodging")
        self.assertEqual(parse_note_command("REMEMBER: I prefer dodging"), "I prefer dodging")
        self.assertEqual(parse_note_command("  remember   I prefer dodging  "), "I prefer dodging")

    def test_a_word_that_only_starts_with_remember_is_not_the_command(self):
        self.assertIsNone(parse_note_command("rememberable moments in Hollow Knight"))

    def test_a_question_that_only_mentions_remembering_is_not_the_command(self):
        self.assertIsNone(parse_note_command("do you remember where the bench is"))
        self.assertIsNone(parse_note_command("how do I beat the mantis lords"))

    def test_note_without_a_colon_is_an_ordinary_question(self):
        self.assertIsNone(parse_note_command("note that the lords drop at once"))
        self.assertIsNone(parse_note_command("notebook"))

    def test_the_bare_prefix_is_the_command_with_no_words(self):
        self.assertEqual(parse_note_command("remember"), "")
        self.assertEqual(parse_note_command("note:"), "")
        self.assertEqual(parse_note_command("remember   "), "")

    def test_the_local_command_kinds_know_about_it(self):
        self.assertTrue(detect_local_ask_commands(REMEMBER).note)
        self.assertTrue(detect_local_ask_commands(REMEMBER).any)
        self.assertFalse(detect_local_ask_commands("how do I beat the mantis lords").note)
        self.assertFalse(detect_local_ask_commands("bonsai:shortcut-setup-deck").note)
        self.assertTrue(detect_local_ask_commands("bonsai:shortcut-setup-deck").any)


class AnswersWithoutTheAiTests(PluginOnATempFolder):
    async def asyncSetUp(self):
        await super().asyncSetUp()

        async def the_ai_must_not_be_called(*_a, **_k):
            raise AssertionError("the AI was asked about a note command")

        for target in ("_execute_game_ai_request", "ask_ollama"):
            p = patch.object(Plugin, target, side_effect=the_ai_must_not_be_called)
            p.start()
            self.addCleanup(p.stop)
        for target, value in (("load_settings", {}), ):
            p = patch.object(Plugin, target, return_value=value)
            p.start()
            self.addCleanup(p.stop)

    async def _background(self, question, *, app_id="", app_name="", slot_id=""):
        payload = {"question": question, "PcIp": "", "appId": app_id, "appName": app_name}
        if slot_id:
            payload["chat_slot_id"] = slot_id
        started = await self.plugin.start_background_game_ai(payload)
        status = await self.plugin.get_background_game_ai_status()
        return started, status

    async def test_background_reply_is_keep_this_as_a_note_with_the_offer_and_no_ai(self):
        started, status = await self._background(REMEMBER, app_id="367520", app_name="Hollow Knight")
        offer = {"text": OFFER_TEXT, "app_id": "367520", "game_title": "Hollow Knight"}
        self.assertEqual(started["status"], "completed")
        self.assertEqual(started["response"], "Keep this as a note?")
        self.assertEqual(started["note_offer"], offer)
        self.assertEqual(status["status"], "completed")
        self.assertEqual(status["response"], "Keep this as a note?")
        self.assertEqual(status["note_offer"], offer)

    async def test_background_with_nothing_running_the_game_is_the_chats_own(self):
        slot = chat_slot_service.create_slot(self.tmp, first_question="Mantis Lords?", app_name="Hollow Knight")
        with patch(
            "backend.commands.ask_local_command_handlers.resolve_title_from_question",
            side_effect=lambda _settings, text: "Hollow Knight" if "Hollow Knight" in text else "",
        ):
            started, status = await self._background(REMEMBER, slot_id=slot["id"])
        self.assertEqual(status["note_offer"], {"text": OFFER_TEXT, "app_id": "", "game_title": "Hollow Knight"})
        self.assertEqual(started["note_offer"], status["note_offer"])

    async def test_note_colon_prefix_works_the_same(self):
        _started, status = await self._background("note: I use dash on R1")
        self.assertEqual(status["note_offer"]["text"], "I use dash on R1.")
        self.assertEqual(status["response"], "Keep this as a note?")

    async def test_the_offers_text_is_what_follows_the_prefix(self):
        _started, status = await self._background("Remember that I prefer dodging over blocking")
        self.assertEqual(status["note_offer"]["text"], "I prefer dodging over blocking.")

    async def test_an_empty_remember_gets_a_plain_reply_and_no_card(self):
        started, status = await self._background("remember")
        self.assertEqual(started["status"], "completed")
        self.assertIsNone(status["note_offer"])
        self.assertNotEqual(status["response"], "Keep this as a note?")
        self.assertIn("remember", status["response"].lower())

    async def test_the_turn_is_saved_in_the_chat_like_the_other_local_commands(self):
        slot = chat_slot_service.create_slot(self.tmp, first_question="Mantis Lords?", app_name="Hollow Knight")
        await self._background(REMEMBER, app_id="367520", app_name="Hollow Knight", slot_id=slot["id"])
        turns = chat_slot_service.load_slot(self.tmp, slot["id"])["turns"]
        self.assertEqual([t["role"] for t in turns][-2:], ["user", "assistant"])
        self.assertEqual(turns[-1]["text"], "Keep this as a note?")
        self.assertEqual(turns[-1]["transparency"]["route"], "note_command")
        self.assertNotIn("note_offer", turns[-1]["transparency"])

    async def test_the_foreground_path_answers_the_same_without_the_ai(self):
        out = await self.plugin.ask_game_ai(
            {"question": REMEMBER, "appId": "367520", "appName": "Hollow Knight"}, ""
        )
        self.assertTrue(out["success"])
        self.assertEqual(out["response"], "Keep this as a note?")
        self.assertEqual(out["note_offer"]["text"], OFFER_TEXT)

    async def test_it_needs_no_pc_address(self):
        started, _status = await self._background(REMEMBER)
        self.assertTrue(started["accepted"])
        self.assertEqual(started["status"], "completed")


class ShowDetailsSaysLocalNoteCommand(unittest.TestCase):
    def test_the_turn_snapshot_names_the_local_note_command(self):
        snapshot = build_immediate_command_snapshot(
            route="note_command",
            parsed_question=REMEMBER,
            resp="Keep this as a note?",
            sanitizer_action="pass",
            sanitizer_reason_codes=[],
            app_id="",
            app_name="",
            pc_ip="",
        )
        chips = {c["id"]: c for c in snapshot["context_chips"]}
        self.assertEqual(chips["local_command"]["label"], "Local note command")
        self.assertTrue(chips["local_command"]["attached"])
        self.assertNotIn("spoiler_risk", chips, "a note command is not an answer to rate for spoilers")
        self.assertEqual(snapshot["route"], "note_command")

    def test_other_routes_are_unchanged(self):
        snapshot = build_immediate_command_snapshot(
            route="shortcut_setup",
            parsed_question="bonsai:shortcut-setup-deck",
            resp="x",
            sanitizer_action="pass",
            sanitizer_reason_codes=[],
            app_id="",
            app_name="",
            pc_ip="",
        )
        ids = {c["id"] for c in snapshot["context_chips"]}
        self.assertNotIn("local_command", ids)
        self.assertIn("spoiler_risk", ids)


if __name__ == "__main__":
    unittest.main()
