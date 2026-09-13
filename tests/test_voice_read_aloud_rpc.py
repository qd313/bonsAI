"""The three read-aloud RPC methods on main.Plugin, with the service faked.

Checks the documented shapes (plan 42 § 8 step 2): start_voice_read_aloud, stop_voice_read_aloud
and get_voice_read_aloud_status exist as public async defs and pass through to
self._read_aloud_service; and that a cleared session (forget_background_game_ai) and plugin
unload (_unload) both stop any reading in progress, so a cleared session goes silent.
"""

import asyncio
import sys
import types
import unittest

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

from main import Plugin  # noqa: E402


class FakeReadAloudService:
    """Stands in for VoiceReadAloudService so these tests never touch a real subprocess."""

    def __init__(self) -> None:
        self.start_calls: list[str] = []
        self.stop_calls = 0
        self._status = {
            "state": "idle",
            "sentence_index": 0,
            "sentence_count": 0,
            "error": None,
            "started_at": None,
        }

    def start(self, text: str) -> dict:
        self.start_calls.append(text)
        return {"ok": True, "sentence_count": 2, "error": None}

    def stop(self) -> dict:
        self.stop_calls += 1
        return {"ok": True, "stopped": True}

    def status(self) -> dict:
        return dict(self._status)


class VoiceReadAloudRpcShapeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()
        self.fake = FakeReadAloudService()
        self.plugin._read_aloud_service = self.fake

    async def test_all_three_methods_exist_as_public_async_defs(self) -> None:
        for name in (
            "start_voice_read_aloud",
            "stop_voice_read_aloud",
            "get_voice_read_aloud_status",
        ):
            with self.subTest(method=name):
                method = getattr(Plugin, name, None)
                self.assertTrue(callable(method), f"Plugin.{name} is missing")
                self.assertTrue(
                    asyncio.iscoroutinefunction(method), f"Plugin.{name} is not an async def"
                )

    async def test_start_voice_read_aloud_passes_the_text_through_and_returns_the_shape(self) -> None:
        result = await self.plugin.start_voice_read_aloud("Read this answer.")
        self.assertEqual(result, {"ok": True, "sentence_count": 2, "error": None})
        self.assertEqual(self.fake.start_calls, ["Read this answer."])

    async def test_stop_voice_read_aloud_returns_the_shape(self) -> None:
        result = await self.plugin.stop_voice_read_aloud()
        self.assertEqual(result, {"ok": True, "stopped": True})
        self.assertEqual(self.fake.stop_calls, 1)

    async def test_get_voice_read_aloud_status_returns_the_shape(self) -> None:
        result = await self.plugin.get_voice_read_aloud_status()
        self.assertEqual(
            set(result.keys()),
            {"state", "sentence_index", "sentence_count", "error", "started_at"},
        )
        self.assertEqual(result["state"], "idle")


class VoiceReadAloudSilencedOnClearAndUnloadTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()
        self.fake = FakeReadAloudService()
        self.plugin._read_aloud_service = self.fake

    async def test_clearing_the_session_stops_any_reading(self) -> None:
        """A cleared session must go silent — a reading of the old answer must not keep playing."""
        await self.plugin.forget_background_game_ai()
        self.assertEqual(self.fake.stop_calls, 1)

    async def test_unloading_the_plugin_stops_any_reading(self) -> None:
        await self.plugin._unload()
        self.assertGreaterEqual(self.fake.stop_calls, 1)


if __name__ == "__main__":
    unittest.main()
