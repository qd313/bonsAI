"""Tests for the short keep-alive while a game runs and the AI is on this Deck (plan 89, lane S4).

Level: the request body actually posted to Ollama (the dict the code builds), because that is what
Ollama obeys and what `/api/ps` on the Deck shows afterwards. The answer, the chat sum-up job and
the rule itself are each checked there.
"""
from __future__ import annotations

import asyncio
import json
import tempfile
import unittest
from typing import Any
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()  # before anything below imports decky or main

from fake_ollama_stream import ndjson_response  # noqa: E402
from test_ollama_ask_service import _FakePlugin  # noqa: E402
from test_chat_sum_up_job import ChatSlotJobTestCase, _seed_chat  # noqa: E402

from backend.services import ollama_keep_alive_rule as rule  # noqa: E402
from backend.services.ollama_ask_service import run_ask_ollama  # noqa: E402
from main import Plugin  # noqa: E402

_REPLY = '{"message":{"role":"assistant","content":"ok"},"done":true}'
_DECK = "127.0.0.1:11434"
_PC = "192.168.1.20:11434"
_URLOPEN = "backend.services.ollama_chat_stream.urllib.request.urlopen"


class _Captured:
    """Every JSON body posted to Ollama while it is active."""

    def __init__(self) -> None:
        self.bodies: list[dict[str, Any]] = []

    def __call__(self, req: Any, timeout: Any = None) -> Any:
        self.bodies.append(json.loads(req.data.decode("utf-8")))
        return ndjson_response([_REPLY])


class _RuleTestCase(unittest.TestCase):
    def setUp(self) -> None:
        rule.note_game_running(False)
        self.addCleanup(rule.note_game_running, False)


class EffectiveKeepAliveTests(_RuleTestCase):
    def test_game_running_and_ai_on_this_deck_gives_a_minute(self) -> None:
        rule.note_game_running(True)
        self.assertEqual(rule.effective_keep_alive("5m", _DECK), "1m")
        self.assertEqual(rule.effective_keep_alive("240m", "http://127.0.0.1:11434/api/chat"), "1m")
        self.assertEqual(rule.effective_keep_alive("5m", ""), "1m")  # blank address = the Deck

    def test_no_game_keeps_the_setting(self) -> None:
        self.assertEqual(rule.effective_keep_alive("5m", _DECK), "5m")
        self.assertEqual(rule.effective_keep_alive("30m", _DECK), "30m")

    def test_ai_on_a_pc_keeps_the_setting_even_with_a_game(self) -> None:
        rule.note_game_running(True)
        self.assertEqual(rule.effective_keep_alive("5m", _PC), "5m")

    def test_a_setting_of_a_minute_or_less_is_kept(self) -> None:
        rule.note_game_running(True)
        self.assertEqual(rule.effective_keep_alive("30s", _DECK), "30s")
        self.assertEqual(rule.effective_keep_alive("15s", _DECK), "15s")
        self.assertEqual(rule.effective_keep_alive("0s", _DECK), "0s")
        self.assertEqual(rule.effective_keep_alive("1m", _DECK), "1m")
        self.assertEqual(rule.effective_keep_alive("2m", _DECK), "1m")

    def test_an_unreadable_setting_falls_back_to_the_default_then_the_rule(self) -> None:
        rule.note_game_running(True)
        self.assertEqual(rule.effective_keep_alive("nonsense", _DECK), "1m")
        rule.note_game_running(False)
        self.assertEqual(rule.effective_keep_alive("nonsense", _DECK), "5m")

    def test_one_log_line_says_which_value_and_why(self) -> None:
        with patch.object(rule.logger, "info") as info:
            rule.note_game_running(True)
            rule.effective_keep_alive("5m", _DECK, source="ask")
            rule.note_game_running(False)
            rule.effective_keep_alive("5m", _DECK, source="ask")
            rule.effective_keep_alive("5m", _DECK, source="lookup", log=False)
        lines = [c.args[0] % c.args[1:] for c in info.call_args_list]
        self.assertEqual(len(lines), 2)
        self.assertTrue(lines[0].startswith("keep_alive 1m: game running, AI on this Deck"), lines[0])
        self.assertTrue(lines[1].startswith("keep_alive 5m: setting"), lines[1])


class AskRequestBodyTests(unittest.IsolatedAsyncioTestCase):
    """The answer's own request to Ollama, as the Deck would see it."""

    def setUp(self) -> None:
        rule.note_game_running(False)
        self.addCleanup(rule.note_game_running, False)

    async def _posted_keep_alives(self, *, game: bool, address: str, setting: str) -> list[Any]:
        rule.note_game_running(game)
        plugin = _FakePlugin()
        plugin._settings["ollama_keep_alive"] = setting
        seen = _Captured()
        with (
            patch("backend.services.ollama_ask_service.list_installed_ollama_tags", return_value=["qwen3:4b"]),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.services.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.services.ollama_service.choose_window_tokens", return_value=0),
            patch("backend.services.chat_memory_step.choose_window_tokens", return_value=0),
            patch(_URLOPEN, side_effect=seen),
        ):
            out = await run_ask_ollama(plugin, "hello", address, "730" if game else "", "", request_timeout_seconds=30)
        self.assertTrue(out.get("success"), out)
        self.assertTrue(seen.bodies)
        return [b.get("keep_alive") for b in seen.bodies]

    async def test_game_running_and_ai_on_the_deck_asks_ollama_for_a_minute(self) -> None:
        self.assertEqual(await self._posted_keep_alives(game=True, address=_DECK, setting="5m"), ["1m"])

    async def test_no_game_asks_ollama_for_the_setting(self) -> None:
        self.assertEqual(await self._posted_keep_alives(game=False, address=_DECK, setting="5m"), ["5m"])
        self.assertEqual(await self._posted_keep_alives(game=False, address=_DECK, setting="30m"), ["30m"])

    async def test_game_running_but_the_ai_on_a_pc_asks_for_the_setting(self) -> None:
        self.assertEqual(await self._posted_keep_alives(game=True, address=_PC, setting="5m"), ["5m"])

    async def test_a_setting_shorter_than_a_minute_is_kept_with_a_game(self) -> None:
        self.assertEqual(await self._posted_keep_alives(game=True, address=_DECK, setting="30s"), ["30s"])
        self.assertEqual(await self._posted_keep_alives(game=True, address=_DECK, setting="0s"), ["0s"])


class SumUpJobRequestBodyTests(ChatSlotJobTestCase):
    """The chat sum-up runs after the answer and would re-arm the long hold if it used the setting."""

    async def _sum_up_keep_alive(self, *, game: bool, address: str) -> Any:
        rule.note_game_running(game)
        self.addCleanup(rule.note_game_running, False)
        sid = _seed_chat(self.tmp, turns=60)
        seen = _Captured()
        with (
            patch.object(Plugin, "load_settings", return_value={"ollama_keep_alive": "5m"}),
            patch(
                "backend.services.chat_sum_up_job._pick_model_and_window",
                return_value=("test-model", 16384, f"http://{address}/api/chat"),
            ),
            patch(_URLOPEN, side_effect=seen),
        ):
            ack = await self.plugin.sum_up_chat_slot(sid, address)
            self.assertTrue(ack.get("accepted"), ack)
            await asyncio.wait_for(self.plugin._background_task, 10)
        self.assertTrue(seen.bodies)
        return seen.bodies[0].get("keep_alive")

    async def test_sum_up_after_an_answer_with_a_game_asks_for_a_minute(self) -> None:
        self.assertEqual(await self._sum_up_keep_alive(game=True, address=_DECK), "1m")

    async def test_sum_up_with_no_game_asks_for_the_setting(self) -> None:
        self.assertEqual(await self._sum_up_keep_alive(game=False, address=_DECK), "5m")

    async def test_sum_up_to_a_pc_asks_for_the_setting_even_with_a_game(self) -> None:
        self.assertEqual(await self._sum_up_keep_alive(game=True, address=_PC), "5m")


class AskTellsTheRuleWhetherAGameRunsTests(unittest.TestCase):
    """run_game_ai_request is where the screen's running-game id arrives."""

    def _run(self, app_id: str, app_name: str) -> None:
        from test_destructive_advice_wiring import _FakePlugin as WiringPlugin
        from backend.services.game_ai_request import run_game_ai_request

        plugin = WiringPlugin({"latency_timeouts_custom_enabled": False, "input_sanitizer_user_disabled": False,
                               "capabilities": {}})
        plugin._ollama_result = {"success": True, "response": "Try lowering the TDP.", "model": "m"}
        asyncio.run(run_game_ai_request(plugin, "How do I fix this crash?", _DECK, app_id, app_name))

    def setUp(self) -> None:
        self.addCleanup(rule.note_game_running, False)

    def test_an_ask_with_a_running_game_marks_a_game_running(self) -> None:
        rule.note_game_running(False)
        self._run("730", "Counter-Strike 2")
        self.assertTrue(rule.game_running())

    def test_an_ask_with_no_game_marks_no_game(self) -> None:
        rule.note_game_running(True)
        self._run("", "")
        self.assertFalse(rule.game_running())


if __name__ == "__main__":
    unittest.main()
