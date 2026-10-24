"""Title: The "Loading the AI" line while the first word is slow to come

Purpose: Proves, on the line the screen draws, that a question waiting for its first word for
more than 10 seconds reads "Loading the AI. The first time takes a minute or two." and that the
line is gone once the first word arrives. Deck, plan 94 block 4: the first question after a fresh
install waited 95 to 120 s with only rotating "Still going..." lines, and nothing said why.

Used for: The poll the screen reads while a question is pending (the plugin's own status merge),
driven through a real question run with a fake model call that stays silent, then speaks.

Solves: A wait that long, with no reason given, reads as a crashed plugin.

Does not: Draw anything (the transcript just paints the line the poll hands it) or load a model.
"""

from __future__ import annotations

import asyncio
import threading
import time
import unittest
from typing import Any
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from plugin_settings_file_harness import PluginSettingsFileMixin  # noqa: E402

from backend.answer.bonsai_stream_tags import LOADING_MODEL_LINE  # noqa: E402
from backend.ask import ollama_ask_service  # noqa: E402

RID = 7


class LoadingTheAiLine(PluginSettingsFileMixin, unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.start_plugin_with_settings_file()
        self._write_settings({})
        self.plugin._background_state = {
            "status": "pending",
            "request_id": RID,
            "response": "Thinking...",
            "started_at": time.time(),
        }
        self.plugin._reset_partial_stream_snapshot(RID)
        # The real wait is 10 s; the test only needs the same order of events.
        timer = patch.object(ollama_ask_service, "LOADING_LINE_AFTER_SECONDS", 0.05)
        timer.start()
        self.addCleanup(timer.stop)

    def _drawn_line(self, *, quiet_for: float = 0.0) -> str:
        """The waiting line the screen would draw now, `quiet_for` seconds after it last changed."""
        if quiet_for:
            with self.plugin._partial_response_lock:
                snap = self.plugin._partial_stream_snapshot
                snap["thinking_summary_monotonic"] = time.monotonic() - quiet_for
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        return str(merged.get("thinking_summary") or "")

    async def _ask_with_a_model_that_speaks_when_told(self, speak: threading.Event) -> dict[str, Any]:
        def silent_then_speaks(*_args: Any, **kwargs: Any) -> dict[str, Any]:
            speak.wait(timeout=10)
            kwargs["on_delta"]("Hello there", False)
            return {"success": True, "status": 200, "model": "gemma4:e2b-it-qat",
                    "response": "Hello there", "assistant_raw": "Hello there"}

        with (
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=["gemma4:e2b-it-qat"]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.media.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.ask.ollama_ask_service.post_ollama_chat", side_effect=silent_then_speaks),
        ):
            return await ollama_ask_service.run_ask_ollama(
                self.plugin, "how do I start", "127.0.0.1:11434", "", "",
                request_timeout_seconds=30, token_stream_request_id=RID,
            )

    async def test_a_slow_first_word_shows_the_loading_line_and_it_goes_with_the_first_word(self) -> None:
        speak = threading.Event()
        ask = asyncio.ensure_future(self._ask_with_a_model_that_speaks_when_told(speak))
        await asyncio.sleep(0.01)
        # Before the wait is long: the ordinary waiting line, not the loading sentence.
        self.assertNotEqual(self._drawn_line(), LOADING_MODEL_LINE)

        await asyncio.sleep(0.3)
        # After it: the loading sentence ... and it stays, however long the line sits unchanged
        # (the old rotation swapped it for "Still going" within 7 to 13 s).
        self.assertEqual(self._drawn_line(), "Loading the AI. The first time takes a minute or two.")
        self.assertEqual(self._drawn_line(quiet_for=55.0), LOADING_MODEL_LINE)

        speak.set()
        await ask
        # The first word is here: the sentence is gone and the answer text is what is shown.
        merged = self.plugin._merge_partial_into_background_status(self.plugin._background_state)
        self.assertNotEqual(merged.get("thinking_summary"), LOADING_MODEL_LINE)
        self.assertEqual(merged.get("partial_response"), "Hello there")

    async def test_a_quick_first_word_never_shows_the_loading_line(self) -> None:
        speak = threading.Event()
        speak.set()  # the model answers at once
        await self._ask_with_a_model_that_speaks_when_told(speak)
        await asyncio.sleep(0.2)  # well past the patched wait: a late timer must not fire
        self.assertNotEqual(self._drawn_line(), LOADING_MODEL_LINE)


if __name__ == "__main__":
    unittest.main()
