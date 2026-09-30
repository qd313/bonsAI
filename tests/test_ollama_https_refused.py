"""Title: An https Ollama address is refused, never quietly sent as http

Purpose: Pin the rule from the 0.6.0 security review (finding 7): an address that starts with
https:// must not be turned into a plain http address. The person is told, in plain words, on
every path that would have used it (Test connection, Ask, the background Ask, the chat summary,
meaning-search checks), while host:port and http:// addresses behave exactly as before.
Used for: the plan 77 release fixes.
Does not: draw the screen message -- that is src/utils/ollamaAddress.test.ts.
"""

import asyncio
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ollama_urls import (  # noqa: E402
    HTTPS_NOT_SUPPORTED_MESSAGE,
    OllamaAddressRefused,
    build_ollama_chat_url,
    is_https_ollama_address,
    normalize_ollama_base,
)
from backend.services.ollama_connection_test import (  # noqa: E402
    ConnectionTestTools,
    run_ollama_connection_test,
)
from main import Plugin  # noqa: E402

HTTPS_ADDRESSES = [
    "https://192.168.1.50:11434",
    "HTTPS://example.com",
    "  https://ollama.lan  ",
]


class NormalizeRefusesHttpsTests(unittest.TestCase):
    def test_message_is_plain_and_names_the_fix(self):
        self.assertIn("http", HTTPS_NOT_SUPPORTED_MESSAGE)
        self.assertIn("http://", HTTPS_NOT_SUPPORTED_MESSAGE)

    def test_https_addresses_are_refused_not_downgraded(self):
        for raw in HTTPS_ADDRESSES:
            with self.subTest(raw=raw):
                self.assertTrue(is_https_ollama_address(raw))
                with self.assertRaises(OllamaAddressRefused) as ctx:
                    normalize_ollama_base(raw)
                self.assertEqual(str(ctx.exception), HTTPS_NOT_SUPPORTED_MESSAGE)
                with self.assertRaises(OllamaAddressRefused):
                    build_ollama_chat_url(raw)

    def test_plain_addresses_still_work_exactly_as_before(self):
        self.assertEqual(
            normalize_ollama_base("192.168.1.50:11500"), ("192.168.1.50", 11500, "http://192.168.1.50:11500")
        )
        self.assertEqual(
            normalize_ollama_base("http://example.com:9999"), ("example.com", 9999, "http://example.com:9999")
        )
        self.assertEqual(normalize_ollama_base("example.com"), ("example.com", 11434, "http://example.com:11434"))
        self.assertEqual(normalize_ollama_base("")[2], "http://127.0.0.1:11434")
        self.assertFalse(is_https_ollama_address("http://host"))
        self.assertFalse(is_https_ollama_address("httpshost:11434"))


class ConnectionTestRefusesHttpsTests(unittest.TestCase):
    def test_test_connection_says_so_and_never_probes(self):
        probed = []

        def probe(base, _deadline):
            probed.append(base)
            return {"version": "x", "models": []}

        for raw in HTTPS_ADDRESSES:
            with self.subTest(raw=raw):
                outcome = asyncio.run(
                    run_ollama_connection_test(raw, 10, ConnectionTestTools(probe=probe))
                )
                self.assertFalse(outcome.result["reachable"])
                self.assertEqual(outcome.result["error"], HTTPS_NOT_SUPPORTED_MESSAGE)
        self.assertEqual(probed, [])


class AskRefusesHttpsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()

    async def test_foreground_ask_gives_the_message_and_runs_nothing(self):
        with patch.object(Plugin, "_execute_game_ai_request") as run:
            result = await self.plugin.ask_game_ai(
                {"question": "how do I beat the boss", "PcIp": "https://192.168.1.50:11434"}
            )
        run.assert_not_called()
        self.assertFalse(result["success"])
        self.assertEqual(result["response"], HTTPS_NOT_SUPPORTED_MESSAGE)

    async def test_background_ask_gives_the_message_and_starts_nothing(self):
        with patch.object(Plugin, "_run_background_request") as run:
            result = await self.plugin.start_background_game_ai(
                {"question": "how do I beat the boss", "PcIp": "https://192.168.1.50:11434"}
            )
        run.assert_not_called()
        self.assertFalse(result["accepted"])
        self.assertEqual(result["status"], "invalid")
        self.assertEqual(result["response"], HTTPS_NOT_SUPPORTED_MESSAGE)
        self.assertIsNone(self.plugin._background_task)

    async def test_a_plain_address_still_reaches_the_ask(self):
        async def fake_execute(*_a, **_k):
            return {"success": True, "response": "ok"}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fake_execute) as run:
            result = await self.plugin.ask_game_ai(
                {"question": "how do I beat the boss", "PcIp": "192.168.1.50:11434"}
            )
        run.assert_called_once()
        self.assertTrue(result["success"])


class ChatSummaryRefusesHttpsTests(unittest.IsolatedAsyncioTestCase):
    async def test_the_chat_summary_gives_the_message_and_touches_nothing(self):
        from backend.services import chat_sum_up_job

        result = await chat_sum_up_job.sum_up_chat_slot(object(), "slot-1", "https://192.168.1.50:11434")
        self.assertFalse(result["accepted"])
        self.assertEqual(result["status"], "invalid")
        self.assertEqual(result["error"], HTTPS_NOT_SUPPORTED_MESSAGE)


class LeafHelpersDoNotCrashOnHttpsTests(unittest.TestCase):
    def test_meaning_search_check_says_no_for_an_https_address(self):
        from backend.services.ollama_embed_service import nomic_embed_available

        self.assertFalse(nomic_embed_available("https://192.168.1.50:11434"))


if __name__ == "__main__":
    unittest.main()
