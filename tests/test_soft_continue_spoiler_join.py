"""A long answer cut off by its length limit inside a hidden (spoiler) block, then continued.

Found 2026-10-03 (plan 81 helper I) in the Deck's own saved chats: both answers there with a
hidden block's opening marker written twice were long guides cut off by the length limit in the
middle of a hidden block. The plugin hands the model the answer so far and asks it to carry on;
the model re-opens the block it is already inside, and the plugin glued the two pieces together
as they came, so the saved answer carried the opening marker twice.

These tests run the real answer call (post_ollama_chat, fed a fake two-piece stream), the real
finished-answer spoiler cover, and the real chat save, then read the saved answer back.
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from fake_ollama_stream import ndjson_response

from backend.services import chat_slot_service
from backend.services.ollama_ask_budgets import reset_thinking_support_cache
from backend.services.ollama_service import post_ollama_chat
from backend.services.response_verify import cover_named_spoilers

F = "`" * 3
OPEN = f"{F}bonsai-spoiler"
NAMES = ["Strider"]

INTRO = "Right, here is the road through the second chapter.\n\n"
HIDDEN_START = "This chapter is all about saving ammo. When the poison ones show up, don't"
# What the model writes when told to carry on, in the shapes seen on the Deck: it re-opens the
# block it was cut off inside, sometimes on a fresh line, sometimes glued to the cut-off word.
HIDDEN_REST = "...don't get poisoned. Use the traps against them."
AFTER = "Good luck out there."


def _stream(text: str, done_reason: str):
    lines = [
        json.dumps({"message": {"role": "assistant", "content": text[i : i + 7]}})
        for i in range(0, len(text), 7)
    ]
    lines.append(json.dumps({"message": {"role": "assistant", "content": ""}, "done": True, "done_reason": done_reason}))
    return ndjson_response(lines)


class SavedAnswerAfterACutInsideAHiddenBlockTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_thinking_support_cache()
        self.settings_dir = tempfile.mkdtemp(prefix="p81i-")
        self.addCleanup(shutil.rmtree, self.settings_dir, True)

    def _saved_answer(self, first: str, second: str) -> tuple[str, list[str]]:
        """Ask through the real answer call, cover it, save it, read the saved text back."""
        flushes: list[str] = []
        with patch("backend.services.ollama_service.urllib.request.urlopen") as urlopen:
            urlopen.side_effect = [_stream(first, "length"), _stream(second, "stop")]
            out = post_ollama_chat(
                "http://127.0.0.1:11434/api/chat", "gemma4:e2b-it-qat",
                [{"role": "user", "content": "a long chapter guide please"}],
                60, [], [], [], [], MagicMock(), "strategy", "5m",
                cancel_requested=lambda: False,
                on_delta=lambda text, done, *_a, **_k: flushes.append(text),
            )
        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("soft_continue_count"), 1)
        response = cover_named_spoilers(out["response"], NAMES)
        slot_id = chat_slot_service.create_slot(self.settings_dir, first_question="guide")["id"]
        chat_slot_service.append_turn(self.settings_dir, slot_id, role="assistant", text=response)
        saved = chat_slot_service.load_slot(self.settings_dir, slot_id)["turns"][-1]["text"]
        return saved, flushes

    def _assert_one_block(self, saved: str) -> None:
        self.assertEqual(saved.count(OPEN), 1, saved)
        self.assertEqual(saved.count(F), 2, saved)
        self.assertIn("don't get poisoned", saved)
        self.assertTrue(saved.rstrip().endswith(AFTER), saved)

    def test_the_continuation_reopening_the_block_on_its_own_line_is_saved_once(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{OPEN}\n{HIDDEN_START}",
            f"\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self._assert_one_block(saved)

    def test_the_continuation_reopening_the_block_glued_to_the_cut_word_is_saved_once(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{OPEN}\n{HIDDEN_START}",
            f"{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self._assert_one_block(saved)
        # The two pieces still start on separate lines, as the screen showed them.
        self.assertIn("don't\n", saved)

    def test_a_reopening_after_blank_lines_is_saved_once(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{OPEN}\n{HIDDEN_START}\n",
            f"\n\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self._assert_one_block(saved)

    def test_a_reopening_after_the_models_own_status_line_is_saved_once(self) -> None:
        # The shape this PC's Ollama gave with the Deck's model (gemma4:e2b-it-qat), 2026-10-03:
        # each continued piece starts with a status line, then the opening marker again.
        saved, flushes = self._saved_answer(
            f"<bonsai-status>Writing the guide</bonsai-status>\n{INTRO}{OPEN}\n{HIDDEN_START}",
            f"<bonsai-status>Continuing the guide request</bonsai-status>\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self._assert_one_block(saved)
        self.assertNotIn("bonsai-status", saved)
        for text in flushes:
            self.assertLessEqual(text.count(OPEN), 1, text)

    def test_a_reopening_with_the_text_on_the_same_line_is_saved_once(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{OPEN}\n{HIDDEN_START}",
            f"\n{OPEN} {HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self._assert_one_block(saved)

    def test_no_screen_update_shows_the_marker_twice(self) -> None:
        _, flushes = self._saved_answer(
            f"{INTRO}{OPEN}\n{HIDDEN_START}",
            f"\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self.assertTrue(flushes)
        for text in flushes:
            self.assertLessEqual(text.count(OPEN), 1, text)

    def test_a_new_block_after_a_closed_one_is_left_alone(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{OPEN}\nFirst hidden tip.\n{F}\n\nMore plain words, cut",
            f" here.\n\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self.assertEqual(saved.count(OPEN), 2, saved)
        self.assertEqual(saved.count(F), 4, saved)

    def test_a_cut_inside_an_ordinary_code_block_is_left_alone(self) -> None:
        saved, _ = self._saved_answer(
            f"{INTRO}{F}text\nplain sample, cut",
            f"\n{OPEN}\n{HIDDEN_REST}\n{F}\n\n{AFTER}",
        )
        self.assertEqual(saved.count(OPEN), 1, saved)
        self.assertIn(f"{F}text", saved)


if __name__ == "__main__":
    unittest.main()
