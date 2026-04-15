import os
import tempfile
import unittest
from pathlib import Path

from backend.services.desktop_note_service import (
    append_desktop_chat_event_sync,
    append_markdown_note,
    resolve_bonsai_notes_dir,
    sanitize_note_stem,
)


class DesktopNoteServiceTests(unittest.TestCase):
    """Path safety and append-only behavior for Desktop debug notes."""

    def test_sanitize_note_stem_rejects_separators(self):
        with self.assertRaises(ValueError):
            sanitize_note_stem("a/b")
        with self.assertRaises(ValueError):
            sanitize_note_stem("x\\y")

    def test_sanitize_note_stem_accepts_unicode_and_spaces(self):
        self.assertEqual(sanitize_note_stem("  emu  notes  "), "emu_notes")
        self.assertEqual(sanitize_note_stem("café-test"), "café-test")

    def test_resolve_bonsai_notes_dir(self):
        d = resolve_bonsai_notes_dir("/home/deck")
        self.assertTrue(d.endswith(os.path.join("Desktop", "BonsAI_notes")))

    def test_append_preserves_prior_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            notes_dir = os.path.join(tmp, "notes")
            append_markdown_note(
                notes_dir=notes_dir,
                stem="t1",
                question="Q1?",
                response="A1.",
            )
            append_markdown_note(
                notes_dir=notes_dir,
                stem="t1",
                question="Q2?",
                response="A2.",
            )
            path = os.path.join(notes_dir, "t1.md")
            text = Path(path).read_text(encoding="utf-8")
            self.assertIn("Q1?", text)
            self.assertIn("A1.", text)
            self.assertIn("Q2?", text)
            self.assertIn("A2.", text)

    def test_append_requires_question_and_response(self):
        with tempfile.TemporaryDirectory() as tmp:
            notes_dir = os.path.join(tmp, "notes")
            with self.assertRaises(ValueError):
                append_markdown_note(notes_dir=notes_dir, stem="x", question="", response="a")
            with self.assertRaises(ValueError):
                append_markdown_note(notes_dir=notes_dir, stem="x", question="q", response="")

    def test_append_chat_event_ask_and_response_same_day_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            r1 = append_desktop_chat_event_sync(
                home,
                "ask",
                question="Hello?",
                response_text="",
                screenshot_paths=["/tmp/shot.png"],
            )
            self.assertTrue(r1.get("ok"))
            path = r1.get("path")
            self.assertIsInstance(path, str)
            text = Path(path).read_text(encoding="utf-8")
            self.assertIn("### Ask", text)
            self.assertIn("Hello?", text)
            self.assertIn("shot.png", text)

            r2 = append_desktop_chat_event_sync(
                home,
                "response",
                question="",
                response_text="Hi there.",
            )
            self.assertTrue(r2.get("ok"))
            self.assertEqual(r2.get("path"), path)
            text2 = Path(path).read_text(encoding="utf-8")
            self.assertIn("### AI response", text2)
            self.assertIn("Hi there.", text2)
