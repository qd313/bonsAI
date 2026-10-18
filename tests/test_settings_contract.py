"""Python half of the cross-language settings-defaults contract.

`tests/contracts/settings-defaults.json` is the payload a fresh install gets before the user
saves anything. This asserts the Python sanitizer produces it exactly; the TypeScript half
(`src/data/bonsaiSettingsContract.test.ts`) asserts the same of `normalizeSettings({})`.

Between them, a setting added to one language and forgotten in the other fails a test
instead of shipping a frontend and backend that disagree about a default.
See tests/contracts/README.md.
"""

import json
import unittest
from pathlib import Path

from backend.settings.settings_service import sanitize_settings

CONTRACT_PATH = Path(__file__).parent / "contracts" / "settings-defaults.json"

# Mirrors the class constants on `Plugin` (main.py) that the RPC passes into the sanitizer.
PLUGIN_SANITIZE_ARGS = {
    "default_latency_warning_seconds": 60,
    "default_request_timeout_seconds": 180,
    "min_latency_warning_seconds": 5,
    "max_latency_warning_seconds": 300,
    "min_request_timeout_seconds": 10,
    "max_request_timeout_seconds": 600,
    "valid_persistence_modes": {"persist_all", "persist_search_only", "no_persist"},
    "default_persistence_mode": "no_persist",
    "valid_ask_modes": {"speed", "strategy", "expert"},
    "default_ask_mode": "speed",
}


class SettingsDefaultsContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))

    def test_sanitize_settings_of_empty_input_matches_contract(self) -> None:
        """A fresh install's settings payload must equal the shared fixture exactly."""
        produced = sanitize_settings({}, **PLUGIN_SANITIZE_ARGS)
        self.assertEqual(produced, self.contract)

    def test_contract_covers_every_key_the_sanitizer_emits(self) -> None:
        """Key-set equality, asserted separately so a missing key reports as a key, not a diff."""
        produced = sanitize_settings({}, **PLUGIN_SANITIZE_ARGS)
        self.assertEqual(
            sorted(produced.keys()),
            sorted(self.contract.keys()),
            "settings key set drifted from tests/contracts/settings-defaults.json",
        )

    def test_sanitizing_the_contract_is_idempotent(self) -> None:
        """Feeding the defaults back in must not change them.

        Guards the migration sanitizers specifically: `preset_chip_animation` reads the legacy
        `preset_chip_fade_animation_enabled`, and `screenshot_attachment_preset` reads the
        legacy `screenshot_max_dimension`. A migration that re-fires on already-migrated data
        would round-trip a user's saved value into a different one on every load.
        """
        once = sanitize_settings(dict(self.contract), **PLUGIN_SANITIZE_ARGS)
        twice = sanitize_settings(dict(once), **PLUGIN_SANITIZE_ARGS)
        self.assertEqual(once, self.contract)
        self.assertEqual(twice, once)


if __name__ == "__main__":
    unittest.main()
