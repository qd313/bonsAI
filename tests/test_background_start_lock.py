"""Regression: immediate Ask branches must not hold ``_background_lock`` across transparency I/O.

Refactor (v0.3.0) wrapped ``start_background_game_ai`` in ``async with _background_lock`` and then
awaited ``_finalize_immediate_background_local_command``, which awaits ``_persist_input_transparency``.
That blocked ``get_background_game_ai_status`` (same lock) and stalled the UI poll loop until disk
work finished — a classic async deadlock from holding a mutex across an await.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


def _ensure_decky_stub() -> None:
    if "decky" in sys.modules:
        return
    root = tempfile.mkdtemp()
    decky = types.ModuleType("decky")
    decky.logger = logging.getLogger("decky_stub")
    decky.DECKY_PLUGIN_SETTINGS_DIR = root
    decky.DECKY_PLUGIN_RUNTIME_DIR = os.path.join(root, "runtime")
    decky.DECKY_PLUGIN_LOG_DIR = os.path.join(root, "logs")
    decky.HOME = root
    decky.DECKY_USER_HOME = root
    sys.modules["decky"] = decky


class BackgroundStartLockRegressionTests(unittest.TestCase):
    def test_status_poll_not_blocked_during_immediate_command_finalize(self) -> None:
        """While finalize awaits transparency persistence, status RPC must still run."""

        _ensure_decky_stub()
        # Import after stub so main binds to stub decky
        from main import Plugin

        shortcut_question = "bonsai:shortcut-setup-deck"

        async def exercise() -> None:
            plugin = Plugin()
            original_persist = Plugin._persist_input_transparency

            async def slow_persist(self: Plugin, snapshot: dict) -> None:
                await asyncio.sleep(0.35)
                await original_persist(self, snapshot)

            with patch.object(Plugin, "_persist_input_transparency", slow_persist):

                async def start_cmd() -> dict:
                    return await plugin.start_background_game_ai(
                        {"question": shortcut_question, "PcIp": ""},
                        "",
                    )

                async def poll_while_running() -> None:
                    for _ in range(40):
                        await plugin.get_background_game_ai_status()
                        await asyncio.sleep(0.02)

                results = await asyncio.wait_for(asyncio.gather(start_cmd(), poll_while_running()), timeout=2.5)

            body = results[0]
            self.assertEqual(body.get("accepted"), True)
            self.assertEqual(body.get("status"), "completed")

        asyncio.run(exercise())


if __name__ == "__main__":
    unittest.main()
