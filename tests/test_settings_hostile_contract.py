"""Python half of the hostile-input settings contract.

`tests/contracts/settings-defaults.json` pins the fresh-install payload. That found nothing,
because both languages agreed on it -- and it could not have, because it only exercises one
input. Reading the two rule sets side by side for D13 turned up five settings that disagreed
once the value was *not* the default.

This fixture is the fix for that blind spot: the inputs that found the divergences, plus the
migrations and clamps most likely to drift next, asserted by both languages.
See tests/contracts/README.md.
"""

import json
import unittest
from pathlib import Path

from backend.settings.settings_service import sanitize_settings

CONTRACT_PATH = Path(__file__).parent / "contracts" / "settings-hostile-inputs.json"

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


class SettingsHostileInputContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cases = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))

    def test_every_case_matches(self) -> None:
        self.assertTrue(self.cases, "hostile-input contract is empty")
        for case in self.cases:
            with self.subTest(case=case["name"]):
                produced = sanitize_settings(dict(case["input"]), **PLUGIN_SANITIZE_ARGS)
                actual = {key: produced[key] for key in case["expected"]}
                self.assertEqual(actual, case["expected"])

    def test_expected_keys_exist_in_the_payload(self) -> None:
        """A fixture naming a key the sanitizer no longer emits should fail loudly, not pass."""
        produced = sanitize_settings({}, **PLUGIN_SANITIZE_ARGS)
        for case in self.cases:
            with self.subTest(case=case["name"]):
                unknown = sorted(set(case["expected"]) - set(produced))
                self.assertEqual(unknown, [], "fixture references keys that no longer exist")


if __name__ == "__main__":
    unittest.main()
