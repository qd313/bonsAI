import asyncio
import unittest

from backend.ask.game_ai_request import run_game_ai_request
from backend.power.tdp_intent import parse_tdp_recommendation


_TDP_JSON_RESPONSE = (
    "Sure buddy.\n```json\n{\"tdp_watts\": 12, \"gpu_clock_mhz\": 1400}\n```"
)


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 45

    def __init__(self, settings: dict):
        self._settings = settings
        self._ollama_result = {}

    async def load_settings(self):
        return self._settings

    async def _try_handle_sanitizer_keyword_command(self, question, app_id):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return self._ollama_result

    async def _persist_input_transparency(self, _payload):
        return None


class PyroAssholeSafetyTests(unittest.TestCase):
    def test_parse_tdp_finds_json_in_asshole_style_response(self):
        rec = parse_tdp_recommendation(_TDP_JSON_RESPONSE, 3, 15, 200, 1600)
        self.assertIsNotNone(rec)
        self.assertEqual(rec.get("tdp_watts"), 12)

    def test_run_game_ai_request_skips_tdp_apply_when_pyro_asshole_mode(self):
        """Pyro asshole mode must not surface applied TDP metadata (apply path is obsolete)."""
        settings = {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": False,
            "capabilities": {},
        }
        plugin = _FakePlugin(settings)
        plugin._ollama_result = {
            "success": True,
            "response": _TDP_JSON_RESPONSE,
            "pyro_asshole_mode": True,
            "model": "test-model",
        }

        result = asyncio.run(
            run_game_ai_request(
                plugin,
                "What TDP should I use?",
                "127.0.0.1:11434",
            )
        )

        self.assertTrue(result.get("success"))
        self.assertIsNone(result.get("applied"))


if __name__ == "__main__":
    unittest.main()
