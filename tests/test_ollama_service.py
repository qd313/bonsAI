import unittest

from backend.services.ollama_service import build_system_prompt, format_ai_response


class OllamaServiceTests(unittest.TestCase):
    """Service tests for prompt construction and response formatting contracts."""

    def test_format_ai_response_appends_attachment_metadata(self):
        """Confirm attachment debug and error blocks are appended for UI diagnostics."""
        output = format_ai_response(
            "Base response",
            normalized_attachments=[{"path": "/tmp/a.png"}],
            prepared_images=[{"image_b64": "abc"}],
            attachment_errors=["too large"],
        )
        self.assertIn("[AttachDebug: requested=1, prepared=1, errors=1]", output)
        self.assertIn("[Attachment errors: too large]", output)

    def test_build_system_prompt_includes_game_and_attachment_context(self):
        """Ensure generated system prompts include game, attachment, and policy context lines."""
        def lookup_app_name(app_id: str) -> str:
            return "Test Game" if app_id == "123" else ""

        def lookup_vdf(_path: str) -> dict:
            return {"caption": "boss room", "shortcut_name": "Shortcut Name"}

        prompt = build_system_prompt(
            question="How do I beat this boss?",
            app_id="123",
            app_name="Game Name",
            normalized_attachments=[{"path": "/tmp/a.png", "app_id": "123"}],
            prepared_images=[{"image_b64": "abc"}],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
        )
        self.assertIn("The currently running game is: Game Name (AppID: 123).", prompt)
        self.assertIn("Resolved game-title hints from attachment AppIDs: 123=Test Game.", prompt)
        self.assertIn("Visual context attachments provided: 1.", prompt)
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)


if __name__ == "__main__":
    unittest.main()
