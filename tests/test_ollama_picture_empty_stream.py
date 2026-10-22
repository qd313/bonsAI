"""What the answer box says when Ollama closes the stream with nothing (plan 97, lane L1).

With a picture attached, the Deck's AI can run the graphics chip out of memory while it reads the
picture and then closes the stream with no answer. The person used to read "incomplete stream",
which says nothing they can act on. With a picture in the request the box now says the picture was
too big and what to try; a question with no picture keeps the old wording.
"""

import unittest
from unittest.mock import MagicMock, patch

from backend.ask.ollama_service import post_ollama_chat
from fake_ollama_stream import ndjson_response

PICTURE_WORDS = "The picture was too big for the AI to read."
OLD_WORDS = "incomplete stream"


def _ask_and_get_empty_stream(messages: list) -> dict:
    """Ask once; the fake Ollama answers with an empty stream (no text, no done line)."""
    with patch(
        "backend.ask.ollama_chat_stream.urllib.request.urlopen",
        return_value=ndjson_response([]),
    ):
        return post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            messages,
            60,
            [],
            [],
            [],
            [],
            MagicMock(),
            "speed",
            "5m",
            cancel_requested=lambda: False,
        )


class EmptyStreamWithAPictureTests(unittest.TestCase):
    def test_a_picture_question_with_an_empty_stream_says_the_picture_was_too_big(self) -> None:
        out = _ask_and_get_empty_stream(
            [{"role": "user", "content": "what is this?", "images": ["aGVsbG8="]}]
        )
        self.assertFalse(out.get("success"))
        text = out.get("response", "")
        self.assertIn(PICTURE_WORDS, text)
        self.assertIn("Low screenshot quality in Settings", text)
        self.assertIn("a smaller screenshot", text)
        self.assertNotIn(OLD_WORDS, text)

    def test_a_text_only_question_keeps_the_old_wording(self) -> None:
        out = _ask_and_get_empty_stream([{"role": "user", "content": "what is this?"}])
        self.assertFalse(out.get("success"))
        text = out.get("response", "")
        self.assertIn(OLD_WORDS, text)
        self.assertNotIn(PICTURE_WORDS, text)

    def test_an_empty_images_list_counts_as_no_picture(self) -> None:
        out = _ask_and_get_empty_stream([{"role": "user", "content": "hi", "images": []}])
        self.assertIn(OLD_WORDS, out.get("response", ""))


if __name__ == "__main__":
    unittest.main()
