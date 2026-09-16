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

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8
    _fcntl.flock = lambda *_a, **_k: False
    sys.modules["fcntl"] = _fcntl

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.services import kb_followup_memory  # noqa: E402
from main import Plugin  # noqa: E402


def _pending_state(request_id: int, app_id: str = "") -> dict:
    return {
        "status": "pending",
        "request_id": request_id,
        "question": "q",
        "app_id": app_id,
        "app_context": "active" if app_id else "none",
        "success": None,
        "response": "Thinking...",
        "applied": None,
        "elapsed_seconds": 0,
        "error": None,
        "started_at": 0.0,
        "completed_at": None,
        "strategy_guide_branches": None,
        "model_policy_disclosure": None,
        "preset_carousel_inject": None,
        "partial_response": None,
        "streaming": False,
        "thinking_summary": None,
    }


def _checklist_payload(app_id: str, title: str) -> dict:
    return {
        "app_id": app_id,
        "title": title,
        "items": [
            {"id": "1", "label": "Step one"},
            {"id": "2", "label": "Step two"},
        ],
        "checked_ids": ["1"],
    }


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
        # it; there is no other server-side notion of "the running game").
        self.plugin._background_state = _pending_state(1, app_id="570")

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
        self.plugin._background_state = _pending_state(1, app_id="")

        result = await self.plugin.forget_game_ai_carried_context()

        self.assertTrue(result.get("ok"))
        self.assertIn("strategy_checklist_whole_store", result.get("forgot", []))
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("570"))
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("730"))

    async def test_clear_cache_in_settings_forgets_the_same_carried_context(self) -> None:
        """`forget_background_game_ai` is what Settings -> Clear cache actually calls."""
        kb_followup_memory.remember(
            app_id="570", app_name="", text_resolved_title="", subject="Roshan"
        )
        await self.plugin.save_strategy_checklist_session(_checklist_payload("570", "Dota plan"))
        # forget_background_game_ai resets `_background_state` itself; the running game's app_id
        # has to be read before that reset happens, or it is lost. Set it the way a real pending
        # answer would carry it.
        self.plugin._background_state = _pending_state(1, app_id="570")

        result = await self.plugin.forget_background_game_ai()

        self.assertTrue(result.get("ok"))
        self.assertEqual(
            kb_followup_memory.recall(app_id="570", app_name="", text_resolved_title=""), ""
        )
        self.assertIsNone(await self.plugin.get_strategy_checklist_session("570"))


if __name__ == "__main__":
    unittest.main()
