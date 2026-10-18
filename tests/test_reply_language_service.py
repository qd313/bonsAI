"""Unit tests for Steam client language detection and reply-language resolution."""

import os
import tempfile
import unittest
from unittest import mock

from backend.prompts.reply_language_service import (
    DEFAULT_EFFECTIVE_REPLY_LANGUAGE,
    DEFAULT_REPLY_LANGUAGE_OVERRIDE,
    detect_steam_client_language,
    parse_language_from_config_vdf,
    reply_language_snapshot,
    resolve_effective_reply_language,
    sanitize_reply_language,
)


class ReplyLanguageServiceTests(unittest.TestCase):
    def test_parse_language_from_config_vdf(self) -> None:
        vdf = '"InstallConfigStore"\n{\n\t"Software"\n\t{\n\t\t"Valve"\n\t\t{\n\t\t\t"Steam"\n\t\t\t{\n\t\t\t\t"Language"\t\t"japanese"\n\t\t\t}\n\t\t}\n\t}\n}'
        self.assertEqual(parse_language_from_config_vdf(vdf), "japanese")

    def test_sanitize_reply_language(self) -> None:
        self.assertEqual(sanitize_reply_language(None), DEFAULT_REPLY_LANGUAGE_OVERRIDE)
        self.assertEqual(sanitize_reply_language("follow_system"), "follow_system")
        self.assertEqual(sanitize_reply_language("en"), "en")
        self.assertEqual(sanitize_reply_language("english"), "en")
        self.assertEqual(sanitize_reply_language("japanese"), "japanese")
        self.assertEqual(sanitize_reply_language("bogus"), DEFAULT_REPLY_LANGUAGE_OVERRIDE)

    def test_resolve_follow_system_reads_vdf(self) -> None:
        with tempfile.TemporaryDirectory() as home:
            steam_root = os.path.join(home, ".local", "share", "Steam")
            config_dir = os.path.join(steam_root, "config")
            os.makedirs(config_dir)
            with open(os.path.join(config_dir, "config.vdf"), "w", encoding="utf-8") as f:
                f.write('"Language"\t\t"german"\n')
            effective = resolve_effective_reply_language("follow_system", home=home)
            self.assertEqual(effective, "german")

    def test_resolve_always_english(self) -> None:
        with tempfile.TemporaryDirectory() as home:
            steam_root = os.path.join(home, ".local", "share", "Steam")
            config_dir = os.path.join(steam_root, "config")
            os.makedirs(config_dir)
            with open(os.path.join(config_dir, "config.vdf"), "w", encoding="utf-8") as f:
                f.write('"Language"\t\t"japanese"\n')
            effective = resolve_effective_reply_language("en", home=home)
            self.assertEqual(effective, "english")

    def test_detect_missing_vdf_falls_back_english(self) -> None:
        with tempfile.TemporaryDirectory() as home:
            self.assertEqual(detect_steam_client_language(home), DEFAULT_EFFECTIVE_REPLY_LANGUAGE)

    def test_reply_language_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as home:
            steam_root = os.path.join(home, ".steam", "steam")
            config_dir = os.path.join(steam_root, "config")
            os.makedirs(config_dir)
            with open(os.path.join(config_dir, "config.vdf"), "w", encoding="utf-8") as f:
                f.write('"Language"\t\t"schinese"\n')
            snap = reply_language_snapshot("follow_system", home=home)
            self.assertEqual(snap["override"], "follow_system")
            self.assertEqual(snap["steam_client_language"], "schinese")
            self.assertEqual(snap["effective"], "schinese")
            self.assertEqual(snap["display_name"], "Simplified Chinese")

    def test_unknown_vdf_language_falls_back_english(self) -> None:
        with mock.patch(
            "backend.prompts.reply_language_service.detect_steam_client_language",
            return_value="english",
        ):
            self.assertEqual(resolve_effective_reply_language("follow_system"), "english")


if __name__ == "__main__":
    unittest.main()
