import json
import tempfile
import unittest
from pathlib import Path

from backend.services.settings_service import (
    load_settings,
    sanitize_preset_chip_animation,
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
                "ask_mode": "bogus",
            },
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="no_persist",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(sanitized["latency_warning_seconds"], 295)
        self.assertEqual(sanitized["request_timeout_seconds"], 300)
        self.assertLess(sanitized["latency_warning_seconds"], sanitized["request_timeout_seconds"])
        self.assertEqual(sanitized["unified_input_persistence_mode"], "no_persist")
        self.assertEqual(sanitized["screenshot_attachment_preset"], "mid")
        self.assertFalse(sanitized["latency_timeouts_custom_enabled"])
        self.assertFalse(sanitized["desktop_debug_note_auto_save"])
        self.assertFalse(sanitized["desktop_ask_verbose_logging"])
        self.assertFalse(sanitized["capabilities"]["filesystem_write"])
        self.assertFalse(sanitized["capabilities"]["steam_web_api"])
        self.assertEqual(sanitized["steam_web_api_key"], "")
        self.assertFalse(sanitized["ai_character_enabled"])
        self.assertTrue(sanitized["ai_character_random"])
        self.assertEqual(sanitized["ai_character_preset_id"], "")
        self.assertEqual(sanitized["ai_character_custom_text"], "")
        self.assertEqual(sanitized["ai_character_accent_intensity"], "balanced")
        self.assertTrue(sanitized["preset_chip_fade_animation_enabled"])
        self.assertFalse(sanitized["input_sanitizer_user_disabled"])
        self.assertEqual(sanitized["ask_mode"], "speed")
        self.assertEqual(sanitized["ollama_keep_alive"], "5m")
        self.assertEqual(sanitized["reply_verbosity"], "balanced")
        self.assertEqual(sanitized["reply_language"], "follow_system")
        self.assertFalse(sanitized["show_developer_tab"])
        self.assertEqual(sanitized["model_policy_tier"], "open_source_only")
        self.assertFalse(sanitized["model_policy_non_foss_unlocked"])
        self.assertFalse(sanitized["model_allow_high_vram_fallbacks"])
        self.assertFalse(sanitized["ollama_local_on_deck"])
        self.assertFalse(sanitized["ollama_local_autostart"])
        self.assertTrue(sanitized["strategy_spoiler_masking_enabled"])
        self.assertFalse(sanitized["strategy_spoiler_auto_reveal_after_consent"])

    def test_show_developer_tab_migrates_legacy_show_debug_tab(self):
        """Legacy show_debug_tab enables Developer tab on read."""
        kwargs = dict(
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="no_persist",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertTrue(sanitize_settings(data={"show_debug_tab": True}, **kwargs)["show_developer_tab"])
        self.assertFalse(sanitize_settings(data={"show_debug_tab": False}, **kwargs)["show_developer_tab"])

    def test_sanitize_model_policy_non_foss_requires_ack(self):
        """non_foss tier without unlock is downgraded to open_weight."""
        sanitized = sanitize_settings(
            data={
                "model_policy_tier": "non_foss",
                "model_policy_non_foss_unlocked": False,
            },
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(sanitized["model_policy_tier"], "open_weight")
        self.assertFalse(sanitized["model_policy_non_foss_unlocked"])

    def test_sanitize_ollama_keep_alive_accepts_known_tokens(self):
        """Ollama keep_alive string must be one of the plugin presets or fall back to default."""
        good = sanitize_settings(
            data={"ollama_keep_alive": "15s"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(good["ollama_keep_alive"], "15s")
        bad = sanitize_settings(
            data={"ollama_keep_alive": "forever"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(bad["ollama_keep_alive"], "5m")

    def test_sanitize_reply_verbosity_accepts_known_levels(self):
        good = sanitize_settings(
            data={"reply_verbosity": "detailed"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(good["reply_verbosity"], "detailed")
        caveman = sanitize_settings(
            data={"reply_verbosity": "caveman"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(caveman["reply_verbosity"], "caveman")
        legacy_short = sanitize_settings(
            data={"reply_verbosity": "short"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(legacy_short["reply_verbosity"], "caveman")
        bad = sanitize_settings(
            data={"reply_verbosity": "verbose"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(bad["reply_verbosity"], "balanced")

    def test_sanitize_reply_language_accepts_override_values(self):
        good = sanitize_settings(
            data={"reply_language": "japanese"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(good["reply_language"], "japanese")
        bad = sanitize_settings(
            data={"reply_language": "klingon"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(bad["reply_language"], "follow_system")

    def test_sanitize_ask_mode_accepts_speed_strategy_expert(self):
        """Ask mode persists only the three known inference modes."""
        for mode in ("speed", "strategy", "expert"):
            sanitized = sanitize_settings(
                data={"ask_mode": mode},
                default_latency_warning_seconds=15,
                default_request_timeout_seconds=120,
                min_latency_warning_seconds=5,
                max_latency_warning_seconds=300,
                min_request_timeout_seconds=10,
                max_request_timeout_seconds=300,
                valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
                default_persistence_mode="persist_all",
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )
            self.assertEqual(sanitized["ask_mode"], mode)

    def test_sanitize_ask_mode_migrates_legacy_deep_to_expert(self):
        """Legacy persisted ask_mode deep coerces to expert on load."""
        sanitized = sanitize_settings(
            data={"ask_mode": "deep"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(sanitized["ask_mode"], "expert")

    def test_sanitize_ask_think_effort_defaults_off_and_rejects_unknown(self):
        """Thinking is opt-in: an unrecognised or absent effort must never resolve to on."""

        def _sanitized(data):
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
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )

        self.assertEqual(_sanitized({})["ask_think_effort"], "off")
        for level in ("low", "medium", "high", "off"):
            self.assertEqual(_sanitized({"ask_think_effort": level})["ask_think_effort"], level)
        self.assertEqual(_sanitized({"ask_think_effort": " high "})["ask_think_effort"], "high")
        for bad in ("HIGH", "maximum", "", None, True, 3):
            self.assertEqual(_sanitized({"ask_think_effort": bad})["ask_think_effort"], "off")

    def test_sanitize_preset_chip_animation_accepts_decode(self):
        self.assertEqual(sanitize_preset_chip_animation("decode", True), "decode")

    def test_sanitize_preset_chip_animation_migrates_legacy_stream_to_decode(self):
        """`stream` was retired by the chip-decode rewrite; it must not fall through to `fade`."""
        self.assertEqual(sanitize_preset_chip_animation("stream", True), "decode")
        self.assertEqual(sanitize_preset_chip_animation("stream", False), "decode")

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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertTrue(on["desktop_debug_note_auto_save"])

    def test_sanitize_desktop_ask_verbose_logging_true_only_for_literal_true(self):
        """Only JSON true enables verbose Ask trace logging."""
        on = sanitize_settings(
            data={"desktop_ask_verbose_logging": True},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertTrue(on["desktop_ask_verbose_logging"])
        garbled = sanitize_settings(
            data={"desktop_ask_verbose_logging": "yes"},
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertFalse(garbled["desktop_ask_verbose_logging"])

    def test_sanitize_desktop_app_log_level(self):
        kwargs = dict(
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertEqual(sanitize_settings(data={"desktop_app_log_level": "default"}, **kwargs)["desktop_app_log_level"], "default")
        self.assertEqual(sanitize_settings(data={"desktop_app_log_level": "verbose"}, **kwargs)["desktop_app_log_level"], "verbose")
        self.assertEqual(sanitize_settings(data={"desktop_app_log_level": "off"}, **kwargs)["desktop_app_log_level"], "off")
        self.assertEqual(sanitize_settings(data={}, **kwargs)["desktop_app_log_level"], "off")
        self.assertEqual(sanitize_settings(data={"desktop_app_log_level": "bogus"}, **kwargs)["desktop_app_log_level"], "off")

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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
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
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        self.assertFalse(garbled["input_sanitizer_user_disabled"])

    def test_sanitize_ollama_local_on_deck_default_off_explicit_true_enables(self):
        """Omitted key defaults off (LAN routing); literal JSON ``true`` enables local Ollama."""
        base_kwargs = dict(
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        missing = sanitize_settings(data={}, **base_kwargs)
        self.assertFalse(missing["ollama_local_on_deck"])

        explicit_false = sanitize_settings(data={"ollama_local_on_deck": False}, **base_kwargs)
        self.assertFalse(explicit_false["ollama_local_on_deck"])

        on = sanitize_settings(data={"ollama_local_on_deck": True}, **base_kwargs)
        self.assertTrue(on["ollama_local_on_deck"])
        garbled = sanitize_settings(data={"ollama_local_on_deck": "yes"}, **base_kwargs)
        self.assertFalse(garbled["ollama_local_on_deck"])

    def test_sanitize_ollama_local_autostart_default_off_explicit_true_enables(self):
        """Omitted key defaults off (no startup entry); literal JSON ``true`` enables it."""
        base_kwargs = dict(
            default_latency_warning_seconds=15,
            default_request_timeout_seconds=120,
            min_latency_warning_seconds=5,
            max_latency_warning_seconds=300,
            min_request_timeout_seconds=10,
            max_request_timeout_seconds=300,
            valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
            default_persistence_mode="persist_all",
            valid_ask_modes={"speed", "strategy", "expert"},
            default_ask_mode="speed",
        )
        missing = sanitize_settings(data={}, **base_kwargs)
        self.assertFalse(missing["ollama_local_autostart"])

        explicit_false = sanitize_settings(data={"ollama_local_autostart": False}, **base_kwargs)
        self.assertFalse(explicit_false["ollama_local_autostart"])

        on = sanitize_settings(data={"ollama_local_autostart": True}, **base_kwargs)
        self.assertTrue(on["ollama_local_autostart"])
        garbled = sanitize_settings(data={"ollama_local_autostart": "yes"}, **base_kwargs)
        self.assertFalse(garbled["ollama_local_autostart"])

    def test_load_settings_grandfathers_capabilities_when_block_missing(self):
        """Legacy settings files without a capabilities object get known scopes enabled except Steam Web API."""
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
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )

        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            settings_path = settings_dir / "settings.json"
            settings_path.write_text('{"latency_warning_seconds": 30}', encoding="utf-8")
            loaded = load_settings(str(settings_path), sanitize_fn, logger)
            self.assertEqual(loaded["latency_warning_seconds"], 30)
            caps = loaded["capabilities"]
            self.assertTrue(caps["filesystem_write"])
            self.assertTrue(caps["media_library_access"])
            self.assertFalse(caps["steam_web_api"])
            self.assertFalse(caps["microphone_access"])

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
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
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
            self.assertFalse(settings_path.with_suffix(".json.tmp").exists())

    def test_ui_scale_settings_defaults_and_sanitize(self):
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
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )

        baseline = sanitize_fn({})
        self.assertTrue(baseline["ui_scale_auto_enabled"])
        self.assertEqual(baseline["ui_scale_manual_profile"], "handheld")

        manual = sanitize_fn(
            {"ui_scale_auto_enabled": False, "ui_scale_manual_profile": "couch", "bogus": 1}
        )
        self.assertFalse(manual["ui_scale_auto_enabled"])
        self.assertEqual(manual["ui_scale_manual_profile"], "couch")
        self.assertEqual(sanitize_fn({"ui_scale_manual_profile": "invalid"})["ui_scale_manual_profile"], "handheld")

    def test_knowledge_base_settings_defaults(self):
        def sanitize_fn(data):
            return sanitize_settings(
                data=data,
                default_latency_warning_seconds=60,
                default_request_timeout_seconds=180,
                min_latency_warning_seconds=5,
                max_latency_warning_seconds=300,
                min_request_timeout_seconds=10,
                max_request_timeout_seconds=600,
                valid_persistence_modes={"persist_all", "persist_search_only", "no_persist"},
                default_persistence_mode="no_persist",
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )

        baseline = sanitize_fn({})
        self.assertFalse(baseline["use_local_knowledge_base"])
        self.assertEqual(baseline["rag_corpus_path"], "")
        self.assertEqual(baseline["rag_corpus_version"], "")
        enabled = sanitize_fn(
            {
                "use_local_knowledge_base": True,
                "rag_corpus_path": "/home/deck/.bonsai/rag",
                "rag_corpus_version": "2026.07.12",
            }
        )
        self.assertTrue(enabled["use_local_knowledge_base"])
        self.assertEqual(enabled["rag_corpus_path"], "/home/deck/.bonsai/rag")
        self.assertEqual(enabled["rag_corpus_version"], "2026.07.12")

    def test_save_settings_uses_atomic_replace(self):
        """Writes go through a temp file so a crash mid-write cannot truncate settings.json."""
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
                valid_ask_modes={"speed", "strategy", "expert"},
                default_ask_mode="speed",
            )

        with tempfile.TemporaryDirectory() as tmp:
            settings_dir = Path(tmp)
            settings_path = settings_dir / "settings.json"
            baseline = load_settings(str(settings_path), sanitize_fn, logger)
            save_settings(
                path=str(settings_path),
                settings_dir=str(settings_dir),
                incoming={"latency_warning_seconds": 42},
                current=baseline,
                sanitize_func=sanitize_fn,
                logger=logger,
            )
            self.assertTrue(settings_path.is_file())
            self.assertFalse(settings_path.with_suffix(".json.tmp").exists())
            loaded = load_settings(str(settings_path), sanitize_fn, logger)
            self.assertEqual(loaded["latency_warning_seconds"], 42)


if __name__ == "__main__":
    unittest.main()
