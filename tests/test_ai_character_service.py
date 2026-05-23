import unittest
from unittest.mock import patch

from backend.services.ai_character_service import (
    PYRO_PRESET_ID,
    RoleplayBuildResult,
    apply_roleplay_to_system_content,
    build_roleplay_system_suffix,
    build_roleplay_system_suffix_meta,
    is_pyro_asshole_mode,
    pyro_asshole_mode_active,
    pyro_manager_carousel_tip_addon,
)


class AiCharacterServiceTests(unittest.TestCase):
    """Roleplay suffix construction for Ollama system prompts."""

    def test_disabled_or_missing(self):
        self.assertEqual(build_roleplay_system_suffix({}), "")
        self.assertEqual(build_roleplay_system_suffix({"ai_character_enabled": False}), "")
        m = build_roleplay_system_suffix_meta({})
        self.assertEqual(m, RoleplayBuildResult(suffix="", resolved_preset_id=None))

    def test_apply_roleplay_appends_after_preamble(self):
        base = "You are bonsAI. Always answer directly, concisely, and in English."
        rp = "CHARACTER VOICE (required): Write as Jackie Welles."
        out = apply_roleplay_to_system_content(base, rp)
        self.assertTrue(out.startswith(base))
        self.assertIn(rp, out)
        self.assertIn("REMINDER (character voice", out)
        self.assertGreater(out.index(rp), out.index("English"))

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
        meta = build_roleplay_system_suffix_meta(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "",
            }
        )
        self.assertEqual(meta.resolved_preset_id, "cp2077_jackie")

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
        meta = build_roleplay_system_suffix_meta(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": "cp2077_jackie",
                "ai_character_custom_text": "A test custom character description",
            }
        )
        self.assertIsNone(meta.resolved_preset_id)

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

    def test_pyro_preset_uses_talent_manager_not_pyro_voice(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": PYRO_PRESET_ID,
                "ai_character_custom_text": "",
            }
        )
        self.assertIn("talent manager", out)
        self.assertNotIn("wordless playful menace", out)
        self.assertIn("bonsai", out.lower())
        self.assertIn("Stay factually correct", out)

    def test_pyro_heavy_uses_asshole_mode_not_helpful_footer(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": PYRO_PRESET_ID,
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "heavy",
            }
        )
        self.assertIn("deliberately **useless**", out)
        self.assertIn("Never include ```json``` blocks", out)
        self.assertNotIn("Stay factually correct", out)

    def test_pyro_unleashed_uses_asshole_mode(self):
        out = build_roleplay_system_suffix(
            {
                "ai_character_enabled": True,
                "ai_character_random": False,
                "ai_character_preset_id": PYRO_PRESET_ID,
                "ai_character_custom_text": "",
                "ai_character_accent_intensity": "unleashed",
            }
        )
        self.assertIn("Maximize obnoxious agent theater", out)
        self.assertIn("HARD LIMITS", out)

    def test_is_pyro_asshole_mode_and_active_helper(self):
        self.assertFalse(is_pyro_asshole_mode("balanced"))
        self.assertTrue(is_pyro_asshole_mode("heavy"))
        self.assertTrue(is_pyro_asshole_mode("unleashed"))
        settings = {
            "ai_character_accent_intensity": "unleashed",
        }
        self.assertTrue(pyro_asshole_mode_active(settings, PYRO_PRESET_ID))
        self.assertFalse(pyro_asshole_mode_active(settings, "cp2077_jackie"))
        self.assertFalse(
            pyro_asshole_mode_active(
                {"ai_character_accent_intensity": "balanced"},
                PYRO_PRESET_ID,
            )
        )

    @patch("backend.services.ai_character_service.random.choice")
    def test_pyro_random_resolves_tf2_pyro_id(self, mock_choice):
        mock_choice.return_value = (
            PYRO_PRESET_ID,
            "Team Fortress 2",
            "Pyro",
            "wordless playful menace (describe mood without real speech)",
        )
        meta = build_roleplay_system_suffix_meta(
            {
                "ai_character_enabled": True,
                "ai_character_random": True,
                "ai_character_preset_id": "",
                "ai_character_custom_text": "",
            }
        )
        self.assertEqual(meta.resolved_preset_id, PYRO_PRESET_ID)
        self.assertIn("talent manager", meta.suffix)

    def test_pyro_manager_carousel_tip_addon_contains_verbatim_tip(self):
        addon = pyro_manager_carousel_tip_addon("File an issue with repro steps")
        self.assertIn("CAROUSEL TIP", addon)
        self.assertIn("File an issue with repro steps", addon)
        self.assertIn("TDP/GPU JSON block", addon)

    def test_pyro_asshole_carousel_tip_addon_omits_json_instruction(self):
        addon = pyro_manager_carousel_tip_addon("Set my TDP to 50 watts", asshole=True)
        self.assertIn("Set my TDP to 50 watts", addon)
        self.assertNotIn("TDP/GPU JSON block", addon)


if __name__ == "__main__":
    unittest.main()
