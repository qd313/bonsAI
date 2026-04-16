import unittest
from unittest.mock import patch

from backend.services.ai_character_service import build_roleplay_system_suffix


class AiCharacterServiceTests(unittest.TestCase):
    """Roleplay suffix construction for Ollama system prompts."""

    def test_disabled_or_missing(self):
        self.assertEqual(build_roleplay_system_suffix({}), "")
        self.assertEqual(build_roleplay_system_suffix({"ai_character_enabled": False}), "")

    def test_preset_character(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
            }
        )
        self.assertIn("Jackie Welles", out)
        self.assertIn("Cyberpunk 2077", out)
        self.assertIn("CHARACTER VOICE", out)

    def test_custom_overrides_preset(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "A test custom character description",
            }
        )
        self.assertIn("test custom character", out)
        self.assertNotIn("Jackie Welles", out)

    @patch("backend.services.ai_character_service.random.choice")
    def test_random_mode_uses_catalog_choice(self, mock_choice):
        mock_choice.return_value = ("id", "My Game", "My Char", "hint style")
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": True,
                "ai_character_preset_id": "",
                "ai_character_custom_text": "",
            }
        )
        self.assertIn("My Char", out)
        self.assertIn("My Game", out)


if __name__ == "__main__":
    unittest.main()
