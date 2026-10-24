"""The finished status of a background Ask names the mode the question was asked in.

Why it matters on the screen: when Quick Access is closed while an answer writes and opened again,
nothing in the panel remembers which mode Ask was pressed in. The finished status is the only thing
left that knows, and the panel needs it to bring back a Strategy checklist and to send a refine
chip's follow-up in the same mode (plan 78, finding 1).
"""

import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from main import Plugin  # noqa: E402


class FinishedStatusNamesTheAskModeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.settings_patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        self.settings_patcher.start()
        self.plugin = Plugin()

    async def asyncTearDown(self) -> None:
        self.settings_patcher.stop()
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    async def _ask_to_completion(self, payload: dict) -> dict:
        async def fast_execute(*_args, **_kwargs):
            return {
                "success": True,
                "response": "Keep your distance.",
                "elapsed_seconds": 0.01,
                "strategy_checklist": {"title": "T", "items": [{"id": "1", "label": "x"}]},
            }

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    await self.plugin.start_background_game_ai(payload)
                    pending = await self.plugin.get_background_game_ai_status()
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task
                    done = await self.plugin.get_background_game_ai_status()
        return {"pending": pending, "done": done}

    async def test_strategy_question_reports_strategy_while_pending_and_when_finished(self) -> None:
        seen = await self._ask_to_completion(
            {"question": "how do i deal with exploders", "PcIp": "127.0.0.1:11434", "ask_mode": "strategy"}
        )
        self.assertEqual(seen["pending"]["ask_mode"], "strategy")
        self.assertEqual(seen["done"]["status"], "completed")
        self.assertEqual(seen["done"]["ask_mode"], "strategy")

    async def test_a_question_with_no_mode_reports_the_default_mode(self) -> None:
        seen = await self._ask_to_completion(
            {"question": "where is the key", "PcIp": "127.0.0.1:11434"}
        )
        self.assertEqual(seen["done"]["ask_mode"], "speed")


if __name__ == "__main__":
    unittest.main()
