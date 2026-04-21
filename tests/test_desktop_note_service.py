import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.services.desktop_note_service import (
    DESKTOP_NOTE_WRITE_OS_ERROR_MESSAGE,
    append_desktop_ask_transparency_sync,
    append_desktop_chat_event_sync,
    append_desktop_debug_note_sync,
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

    def test_append_desktop_debug_note_valueerror_returns_validation_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            r = append_desktop_debug_note_sync(home, "stem", "", "only response")
            self.assertFalse(r.get("ok"))
            self.assertEqual(r.get("error"), "Question text is required.")

    def test_append_desktop_debug_note_oserror_returns_generic_message(self):
        real_open = open

        def open_append_raises(path, mode="r", *args, **kwargs):
            if mode == "a":
                raise OSError(13, "Permission denied", "/secret/path/note.md")
            return real_open(path, mode, *args, **kwargs)

        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            notes_dir = os.path.join(home, "Desktop", "BonsAI_notes")
            os.makedirs(notes_dir, exist_ok=True)
            with patch("backend.services.desktop_note_service.open", side_effect=open_append_raises):
                r = append_desktop_debug_note_sync(home, "my_note", "Q?", "R.")
            self.assertFalse(r.get("ok"))
            self.assertEqual(r.get("error"), DESKTOP_NOTE_WRITE_OS_ERROR_MESSAGE)
            self.assertNotIn("Permission denied", r.get("error", ""))
            self.assertNotIn("/secret", r.get("error", ""))

    def test_append_chat_event_oserror_returns_generic_message(self):
        real_open = open

        def open_append_raises(path, mode="r", *args, **kwargs):
            if mode == "a":
                raise OSError(5, "I/O error", "/other/secret.md")
            return real_open(path, mode, *args, **kwargs)

        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            os.makedirs(os.path.join(home, "Desktop", "BonsAI_notes"), exist_ok=True)
            with patch("backend.services.desktop_note_service.open", side_effect=open_append_raises):
                r = append_desktop_chat_event_sync(home, "ask", question="Hi?", response_text="")
            self.assertFalse(r.get("ok"))
            self.assertEqual(r.get("error"), DESKTOP_NOTE_WRITE_OS_ERROR_MESSAGE)

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

    def test_append_ask_transparency_trace(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = tmp
            snap = {
                "route": "ollama",
                "raw_question": "Hello?",
                "sanitizer_action": "pass",
                "sanitizer_reason_codes": [],
                "text_after_sanitizer": "Hello?",
                "ollama_model": "llama3:latest",
                "system_prompt": "SYS",
                "user_text_for_model": "Hello?",
                "user_image_count": 0,
                "attachment_paths": [],
                "assistant_raw": "Hi",
                "assistant_after_attachment_format": "Hi",
                "final_response": "Hi",
                "applied": None,
                "success": True,
                "app_id": "123",
                "app_name": "Test",
                "pc_ip": "192.168.1.1",
                "error_message": "",
                "elapsed_seconds": 1.2,
            }
            r = append_desktop_ask_transparency_sync(home, snap)
            self.assertTrue(r.get("ok"))
            path = r.get("path")
            self.assertIsInstance(path, str)
            text = Path(path).read_text(encoding="utf-8")
            self.assertIn("Ask trace", text)
            self.assertIn("User input (exact)", text)
            self.assertIn("Hello?", text)
            self.assertIn("llama3:latest", text)
            self.assertIn("SYS", text)

            r2 = append_desktop_ask_transparency_sync(home, snap)
            self.assertTrue(r2.get("ok"))
            self.assertEqual(r2.get("path"), path)
            text2 = Path(path).read_text(encoding="utf-8")
            self.assertGreaterEqual(text2.count("Ask trace"), 2)
