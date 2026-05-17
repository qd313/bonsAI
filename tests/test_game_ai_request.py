"""Regression tests for ``run_game_ai_request`` orchestration edge cases."""

from __future__ import annotations

import logging
import sys
import unittest
from types import ModuleType

# ``game_ai_request`` imports ``decky`` at module load; unit tests run without Decky Loader.
if "decky" not in sys.modules:
    _decky_stub = ModuleType("decky")
    _decky_stub.logger = logging.getLogger("decky_stub")
    sys.modules["decky"] = _decky_stub


class _FakePlugin:
    """Minimal plugin stub for exercising ``run_game_ai_request`` without Decky."""

    DEFAULT_REQUEST_TIMEOUT_SECONDS = 360

    async def load_settings(self):
        return {
            "latency_timeouts_custom_enabled": False,
            "input_sanitizer_user_disabled": True,
            "attach_proton_logs_when_troubleshooting": False,
        }

    async def _try_handle_sanitizer_keyword_command(self, question: str, app_id: str):
        return None

    async def ask_ollama(self, *args, **kwargs):
        return {
            "success": True,
            "cancelled": False,
            "response": "Hello back",
            "model": "m",
            "system_prompt": "sys",
            "user_text_for_model": "hello",
            "user_image_count": 0,
            "attachment_paths": [],
            "assistant_raw": None,
            "strategy_guide_branches": None,
            "model_policy_disclosure": None,
            "strategy_spoiler_consent_effective": False,
            "preset_carousel_inject": None,
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }

    async def _persist_input_transparency(self, snapshot: dict):
        raise OSError("simulated transparency persist failure")


class RunGameAiRequestTests(unittest.IsolatedAsyncioTestCase):
    async def test_success_preserved_when_transparency_persist_fails(self):
        from backend.services.game_ai_request import run_game_ai_request

        out = await run_game_ai_request(
            _FakePlugin(),
            "hello",
            "127.0.0.1",
        )
        self.assertTrue(out.get("success"))
        self.assertIn("Hello back", out.get("response", ""))
