"""Plan 92 lane N2: the offer to keep a note rides on the Ask reply the screen polls.

Two levels, both the one the Deck check looks at: a whole question run through
``run_game_ai_request`` with a fake AI, and the finished status the screen polls
(``get_background_game_ai_status``) after a background Ask.
"""

import asyncio
import tempfile
import unittest
from unittest.mock import patch

from user_notes_plugin_harness import PluginOnATempFolder

from backend.ask.game_ai_request import run_game_ai_request  # noqa: E402
from main import Plugin  # noqa: E402
from test_user_notes_in_ask import _FakePlugin  # noqa: E402

STEEL_SOUL = "I'm doing a Steel Soul run, how do I beat the mantis lords"


def _ask(plugin, question, app_id="", app_name=""):
    return asyncio.run(
        run_game_ai_request(plugin, question, "127.0.0.1:11434", app_id=app_id, app_name=app_name, ask_mode="speed")
    )


class OfferOnTheReplyTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.plugin = _FakePlugin(tmp.name)

    def test_a_keepable_question_with_a_game_running_carries_the_offer(self):
        result = _ask(self.plugin, STEEL_SOUL, app_id="367520", app_name="Hollow Knight")
        self.assertEqual(
            result["note_offer"],
            {"text": "I'm doing a Steel Soul run.", "app_id": "367520", "game_title": "Hollow Knight"},
        )

    def test_with_nothing_running_the_game_is_the_title_the_ask_worked_out(self):
        with patch("backend.ask.game_ai_request.resolve_title_from_question", return_value="Hollow Knight"):
            result = _ask(self.plugin, STEEL_SOUL)
        self.assertEqual(
            result["note_offer"],
            {"text": "I'm doing a Steel Soul run.", "app_id": "", "game_title": "Hollow Knight"},
        )

    def test_a_plain_question_carries_null(self):
        result = _ask(self.plugin, "how do I beat the mantis lords", app_id="367520", app_name="Hollow Knight")
        self.assertIn("note_offer", result)
        self.assertIsNone(result["note_offer"])

    def test_a_failed_ai_answer_still_carries_the_offer(self):
        async def failing(question, pc_ip, app_id, app_name, **kwargs):
            return {"success": False, "response": "The AI did not answer.", "model": "test-model"}

        self.plugin.ask_ollama = failing
        result = _ask(self.plugin, STEEL_SOUL, app_id="367520", app_name="Hollow Knight")
        self.assertFalse(result["success"])
        self.assertEqual(result["note_offer"]["text"], "I'm doing a Steel Soul run.")

    def test_an_ai_call_that_blows_up_still_carries_the_offer(self):
        async def exploding(question, pc_ip, app_id, app_name, **kwargs):
            raise RuntimeError("the connection fell over")

        self.plugin.ask_ollama = exploding
        result = _ask(self.plugin, STEEL_SOUL, app_id="367520", app_name="Hollow Knight")
        self.assertFalse(result["success"])
        self.assertEqual(result["note_offer"]["text"], "I'm doing a Steel Soul run.")

    def test_the_offer_is_not_part_of_what_is_saved_for_show_details(self):
        result = _ask(self.plugin, STEEL_SOUL, app_id="367520", app_name="Hollow Knight")
        self.assertNotIn("note_offer", result["transparency"])
        self.assertNotIn("note_offer", self.plugin.persisted)


class OfferInThePolledStatusTests(PluginOnATempFolder):
    async def _finished_status(self, question, result):
        async def fast_execute(*_a, **_k):
            return result

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute), \
                patch.object(Plugin, "load_settings", return_value={}), \
                patch.object(Plugin, "_compose_opening_thinking_blurb", return_value=("Thinking…", None)):
            await self.plugin.start_background_game_ai({"question": question, "PcIp": "127.0.0.1:11434"})
            if self.plugin._background_task is not None:
                await self.plugin._background_task
            return await self.plugin.get_background_game_ai_status()

    async def test_the_finished_status_carries_the_offer(self):
        offer = {"text": "I'm doing a Steel Soul run.", "app_id": "", "game_title": "Hollow Knight"}
        status = await self._finished_status(
            STEEL_SOUL, {"success": True, "response": "Dodge.", "elapsed_seconds": 0.1, "note_offer": offer}
        )
        self.assertEqual(status["status"], "completed")
        self.assertEqual(status["note_offer"], offer)

    async def test_a_failed_answer_status_still_carries_the_offer(self):
        offer = {"text": "I'm doing a Steel Soul run.", "app_id": "", "game_title": ""}
        status = await self._finished_status(
            STEEL_SOUL, {"success": False, "response": "The AI did not answer.", "elapsed_seconds": 0.1, "note_offer": offer}
        )
        self.assertEqual(status["status"], "failed")
        self.assertEqual(status["note_offer"], offer)

    async def test_a_plain_questions_status_has_the_key_with_null(self):
        status = await self._finished_status("where is the key", {"success": True, "response": "Here.", "elapsed_seconds": 0.1})
        self.assertIn("note_offer", status)
        self.assertIsNone(status["note_offer"])

    async def test_a_pending_status_has_the_key_with_null(self):
        status = await self.plugin.get_background_game_ai_status()
        self.assertIn("note_offer", status)
        self.assertIsNone(status["note_offer"])


if __name__ == "__main__":
    unittest.main()
