"""The lighter Clear (D105): forgetting only what the plugin carries into the next question.

`forget_game_ai_carried_context` is the one new back-end method Lane A adds beside
`forget_background_game_ai`. It must drop the two small things `game_ai_request.py` actually
carries from one Strategy/Expert question to the next -- the remembered follow-up subject
(`kb_followup_memory`) and the strategy checklist's ticked-box position for the game that was
last asked about -- without touching the chat, the background answer state, or any other
game's saved checklist. `forget_background_game_ai` (Clear cache in Settings) must call it too.
"""

import sys
import types
import unittest
from unittest.mock import patch

# main.py needs both of these importable; nothing here reads a lock or writes a log, so a plain
# stand-in for each is enough (the fuller, per-file copy of this stub is what the ratchet flagged).
_noop = lambda *_a, **_k: None  # noqa: E731
sys.modules.setdefault(
    "fcntl", types.SimpleNamespace(LOCK_EX=2, LOCK_NB=4, LOCK_UN=8, flock=_noop)
)
sys.modules.setdefault(
    "decky",
    types.SimpleNamespace(
        DECKY_PLUGIN_SETTINGS_DIR="/tmp",
        logger=types.SimpleNamespace(info=_noop, warning=_noop, error=_noop, exception=_noop),
    ),
)

from backend.services import kb_followup_memory  # noqa: E402
from backend.services.chat_slot_service import (  # noqa: E402
    create_slot,
    load_slot,
    save_slot_subject,
)
from main import Plugin  # noqa: E402
from test_strategy_checklist_store_lock import _checklist_payload  # noqa: E402


class ForgetGameAiCarriedContextTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.addCleanup(kb_followup_memory.forget)
        kb_followup_memory.forget()
        self.plugin = Plugin()

        self.tmp = __import__("tempfile").TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings_dir = self.tmp.name

        patcher = patch.object(
            Plugin,
            "_strategy_checklist_session_path",
            return_value=__import__("os").path.join(
                self.settings_dir, "strategy_checklist_session.json"
            ),
        )
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    async def test_forgets_the_remembered_followup_subject(self) -> None:
        kb_followup_memory.remember(
            app_id="570", app_name="", text_resolved_title="", subject="Roshan"
        )
        self.assertEqual(
            kb_followup_memory.recall(app_id="570", app_name="", text_resolved_title=""),
            "Roshan",
        )

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertIn("followup_subject", result.get("forgot", []))
        self.assertEqual(
            kb_followup_memory.recall(app_id="570", app_name="", text_resolved_title=""), ""
        )

    async def test_clears_only_the_running_games_checklist_position(self) -> None:
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        await self.plugin.save_strategy_checklist_session(_checklist_payload("730", "CS plan"))
        # The background state is what tells this method which game is "running" -- the app_id
        # of whichever question was last asked in this process (start_background_game_ai sets
        # it; there is no other server-side notion of "the running game"). Only app_id is read,
        # so that is all this stands in for.
        self.plugin._background_state = {"app_id": "570"}

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertIn("strategy_checklist_position", result.get("forgot", []))
        cleared = await self.plugin.get_strategy_checklist_session("570")
        self.assertIsNone(cleared)
        # A different game's saved checklist is untouched.
        other = await self.plugin.get_strategy_checklist_session("730")
        self.assertIsNotNone(other)
        self.assertEqual(other.get("title"), "CS plan")

    async def test_clears_the_whole_store_when_the_running_game_is_unknown(self) -> None:
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        await self.plugin.save_strategy_checklist_session(_checklist_payload("730", "CS plan"))
        # No question has been asked yet this process: app_id is blank.
        self.plugin._background_state = {"app_id": ""}

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertIn("strategy_checklist_whole_store", result.get("forgot", []))
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("570"))
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("730"))

    async def test_forgets_only_the_active_chats_remembered_subject(self) -> None:
        """Plan 68 step 2: the remembered subject is per chat now. Clear must reach only the
        chat the last question was actually asked in -- read off ``chat_slot_id`` on the
        background state -- and must update that chat's own saved file so a restart does not
        bring the forgotten subject back."""
        chat_a = create_slot(self.settings_dir, first_question="how do I beat Roshan")["id"]
        chat_b = create_slot(self.settings_dir, first_question="how do I plant the spike")["id"]
        kb_followup_memory.remember(
            app_id="570", app_name="", text_resolved_title="", subject="Roshan", chat_id=chat_a
        )
        kb_followup_memory.remember(
            app_id="730", app_name="", text_resolved_title="", subject="Site B", chat_id=chat_b
        )
        # What each chat's own file already holds on disk, the same as a real question would
        # have left behind (the in-memory remember() calls above are only this process's copy).
        save_slot_subject(self.settings_dir, chat_a, {"game_key": "appid:570", "subject": "Roshan"})
        save_slot_subject(self.settings_dir, chat_b, {"game_key": "appid:730", "subject": "Site B"})
        self.plugin._background_state = {"app_id": "570", "chat_slot_id": chat_a}

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertIsNone(kb_followup_memory.snapshot(chat_a))
        self.assertIsNone(load_slot(self.settings_dir, chat_a)["subject"])
        # Chat B was never the active chat -- its remembered subject, in memory and on disk,
        # is untouched.
        self.assertEqual(
            kb_followup_memory.snapshot(chat_b), {"game_key": "appid:730", "subject": "Site B"}
        )
        self.assertEqual(
            load_slot(self.settings_dir, chat_b)["subject"],
            {"game_key": "appid:730", "subject": "Site B"},
        )

    async def test_with_no_active_chat_only_the_no_chat_entry_is_forgotten(self) -> None:
        kb_followup_memory.remember(app_id="570", app_name="", text_resolved_title="", subject="Roshan")
        chat = create_slot(self.settings_dir, first_question="how do I plant the spike")["id"]
        kb_followup_memory.remember(
            app_id="730", app_name="", text_resolved_title="", subject="Site B", chat_id=chat
        )
        # No question has been asked in a saved chat yet this process.
        self.plugin._background_state = {"app_id": "570"}

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertEqual(
            kb_followup_memory.recall(app_id="570", app_name="", text_resolved_title=""), ""
        )
        self.assertEqual(
            kb_followup_memory.snapshot(chat), {"game_key": "appid:730", "subject": "Site B"}
        )

    async def test_clear_cache_in_settings_forgets_the_same_carried_context(self) -> None:
        """`forget_background_game_ai` is what Settings -> Clear cache actually calls."""
        kb_followup_memory.remember(
            app_id="570", app_name="", text_resolved_title="", subject="Roshan"
        )
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        # forget_background_game_ai resets `_background_state` itself; the running game's app_id
        # has to be read before that reset happens, or it is lost.
        self.plugin._background_state = {"app_id": "570"}

        result = await self.plugin.forget_background_game_ai()

        self.assertTrue(result.get("ok"))
        self.assertEqual(
            kb_followup_memory.recall(app_id="570", app_name="", text_resolved_title=""), ""
        )
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("570"))


if __name__ == "__main__":
    unittest.main()
