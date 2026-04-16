import json
import tempfile
import unittest
from pathlib import Path

from backend.services.settings_service import (
    load_settings,
    sanitize_settings,
    save_settings,
)


class _Logger:
    """Minimal logger stub for service tests that do not assert log payloads."""

    def warning(self, *_args, **_kwargs):
        return None

    def exception(self, *_args, **_kwargs):
        return None


class SettingsServiceTests(unittest.TestCase):
    """Service-level tests for settings normalization and persistence round-trip behavior."""

    def test_sanitize_settings_clamps_and_defaults(self):
        """Verify sanitization clamps numbers and falls back for invalid enum-like values."""
        sanitized = sanitize_settings(
            data={
                "latency_warning_seconds": 500,
                "request_timeout_seconds": "5",
                "unified_input_persistence_mode": "invalid",
                "screenshot_max_dimension": "1920",
                "desktop_debug_note_auto_save": "yes",
            },
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertEqual(sanitized["latency_warning_seconds"], 295)
        self.assertEqual(sanitized["request_timeout_seconds"], 300)
        self.assertLess(sanitized["latency_warning_seconds"], sanitized["request_timeout_seconds"])
        self.assertEqual(sanitized["unified_input_persistence_mode"], "persist_all")
        self.assertEqual(sanitized["screenshot_max_dimension"], 1920)
        self.assertFalse(sanitized["desktop_debug_note_auto_save"])
        self.assertFalse(sanitized["capabilities"]["filesystem_write"])
        self.assertFalse(sanitized["capabilities"]["hardware_control"])
        self.assertFalse(sanitized["ai_character_enabled"])
        self.assertTrue(sanitized["ai_character_random"])
        self.assertEqual(sanitized["ai_character_preset_id"], "")
        self.assertEqual(sanitized["ai_character_custom_text"], "")
        self.assertTrue(sanitized["preset_chip_fade_animation_enabled"])
        self.assertFalse(sanitized["input_sanitizer_user_disabled"])

    def test_sanitize_preset_chip_fade_animation_enabled_false_only_for_literal_false(self):
        """Preset chip fades stay enabled unless JSON false is stored."""
        off = sanitize_settings(
            data={"preset_chip_fade_animation_enabled": False},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertFalse(off["preset_chip_fade_animation_enabled"])
        garbled = sanitize_settings(
            data={"preset_chip_fade_animation_enabled": "no"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertTrue(garbled["preset_chip_fade_animation_enabled"])

    def test_sanitize_settings_orders_latency_before_timeout_when_inverted(self):
        """Conflicting warning/timeout values are adjusted so warning stays strictly below timeout."""
        sanitized = sanitize_settings(
            data={
                "latency_warning_seconds": 200,
                "request_timeout_seconds": 60,
            },
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertEqual(sanitized["latency_warning_seconds"], 200)
        self.assertGreater(sanitized["request_timeout_seconds"], 200)
        self.assertLess(sanitized["latency_warning_seconds"], sanitized["request_timeout_seconds"])

    def test_sanitize_desktop_debug_note_auto_save_true_only_for_literal_true(self):
        """Only JSON true enables auto-save."""
        on = sanitize_settings(
            data={"desktop_debug_note_auto_save": True},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertTrue(on["desktop_debug_note_auto_save"])

    def test_sanitize_input_sanitizer_user_disabled_true_only_for_literal_true(self):
        """Only JSON true disables the sanitizer lane; other values keep sanitization on."""
        off = sanitize_settings(
            data={"input_sanitizer_user_disabled": True},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertTrue(off["input_sanitizer_user_disabled"])
        garbled = sanitize_settings(
            data={"input_sanitizer_user_disabled": "yes"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_screenshot_dimensions={1280, 1920, 3160},
            default_screenshot_dimension=1280,
        )
        self.assertFalse(garbled["input_sanitizer_user_disabled"])

    def test_load_settings_grandfathers_capabilities_when_block_missing(self):
        """Legacy settings files without a capabilities object get all scopes enabled."""
        logger = _Logger()

        def sanitize_fn(data):
            return sanitize_settings(
                data=data,
                default_latency_warning_seconds=15,
                default_request_timeout_seconds=120,
                min_latency_warning_seconds=5,
                max_latency_warning_seconds=300,
                min_request_timeout_seconds=10,
                max_request_timeout_seconds=300,
                valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
                default_persistence_mode="persist_all",
                valid_screenshot_dimensions={1280, 1920, 3160},
                default_screenshot_dimension=1280,
            )

        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            settings_path = settings_dir / "settings.json"
            settings_path.write_text('{"latency_warning_seconds": 30}', encoding="utf-8")
            loaded = load_settings(str(settings_path), sanitize_fn, logger)
            self.assertEqual(loaded["latency_warning_seconds"], 30)
            caps = loaded["capabilities"]
            self.assertTrue(caps["filesystem_write"])
            self.assertTrue(caps["hardware_control"])
            self.assertTrue(caps["media_library_access"])
            self.assertTrue(caps["external_navigation"])

    def test_load_save_settings_round_trip(self):
        """Ensure load/save helpers persist sanitized values and reload them consistently."""
        logger = _Logger()

        def sanitize_fn(data):
            return sanitize_settings(
                data=data,
                default_latency_warning_seconds=15,
                default_request_timeout_seconds=120,
                min_latency_warning_seconds=5,
                max_latency_warning_seconds=300,
                min_request_timeout_seconds=10,
                max_request_timeout_seconds=300,
                valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
                default_persistence_mode="persist_all",
                valid_screenshot_dimensions={1280, 1920, 3160},
                default_screenshot_dimension=1280,
            )

        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            settings_path = settings_dir / "settings.json"

            baseline = load_settings(str(settings_path), sanitize_fn, logger)
            self.assertEqual(baseline["latency_warning_seconds"], 15)

            persisted = save_settings(
                path=str(settings_path),
                settings_dir=str(settings_dir),
                incoming={"latency_warning_seconds": 60, "unified_input_persistence_mode": "no_persist"},
                current=baseline,
                sanitize_func=sanitize_fn,
                logger=logger,
            )
            self.assertEqual(persisted["latency_warning_seconds"], 60)
            self.assertEqual(persisted["unified_input_persistence_mode"], "no_persist")

            with settings_path.open("r", encoding="utf-8") as f:
                on_disk = json.load(f)
            self.assertEqual(on_disk["latency_warning_seconds"], 60)

            loaded = load_settings(str(settings_path), sanitize_fn, logger)
            self.assertEqual(loaded["latency_warning_seconds"], 60)
            self.assertEqual(loaded["unified_input_persistence_mode"], "no_persist")
            self.assertIn("capabilities", loaded)


if __name__ == "__main__":
    unittest.main()
