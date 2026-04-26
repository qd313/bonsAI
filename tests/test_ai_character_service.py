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
        self.assertIn("Delivery must reflect:", out)
        self.assertNotIn("STRATEGY GUIDE / AUDIOBOOK", out)

    def test_strategy_mode_adds_audiobook_framing(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
            },
            ask_mode="strategy",
        )
        self.assertIn("STRATEGY GUIDE / AUDIOBOOK FRAMING", out)

    def test_preset_accent_intensity_subtle(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "subtle",
            }
        )
        self.assertIn("Keep the reply easy to follow", out)

    def test_preset_accent_intensity_heavy(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "heavy",
            }
        )
        self.assertIn("Strongly lean into", out)

    def test_preset_accent_intensity_unleashed(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "unleashed",
            }
        )
        self.assertIn("Push voice to the limit", out)

    def test_invalid_accent_intensity_defaults_to_balanced(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "not_a_level",
            }
        )
        self.assertIn("Delivery must reflect:", out)

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

    def test_custom_accent_intensity_subtle(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "A test custom character description",
                "ai_character_accent_intensity": "subtle",
            }
        )
        self.assertIn("keep explanations clear", out)

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
