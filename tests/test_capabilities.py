import unittest

from backend.services.capabilities import (
    CAPABILITY_KEYS,
    capability_enabled,
    legacy_grandfather_capabilities,
    sanitize_capabilities,
)


class CapabilitiesTests(unittest.TestCase):
    """Unit tests for capability key normalization."""

    def test_sanitize_capabilities_defaults_false(self):
        """Missing or invalid payload yields all False."""
        out = sanitize_capabilities(None)
        self.assertEqual(len(out), len(CAPABILITY_KEYS))
        self.assertTrue(all(v is False for v in out.values()))

    def test_sanitize_capabilities_preserves_true(self):
        out = sanitize_capabilities(
            {
                "filesystem_write": True,
                "hardware_control": False,
                "media_library_access": 1,
                "external_navigation": "x",
            }
        )
        self.assertTrue(out["filesystem_write"])
        self.assertFalse(out["hardware_control"])
        self.assertTrue(out["media_library_access"])
        self.assertFalse(out["external_navigation"])

    def test_legacy_grandfather_all_true_except_steam_web_api(self):
        # Matches legacy_grandfather_capabilities docstring: outbound Steam Web API stays off for legacy installs.
        g = legacy_grandfather_capabilities()
        self.assertEqual(set(g.keys()), set(CAPABILITY_KEYS))
        self.assertFalse(g["steam_web_api"])
        for key in CAPABILITY_KEYS:
            if key != "steam_web_api":
                self.assertTrue(g[key], msg=key)

    def test_capability_enabled_requires_explicit_true(self):
        self.assertFalse(capability_enabled({}, "filesystem_write"))
        self.assertFalse(
            capability_enabled({"capabilities": {"filesystem_write": False}}, "filesystem_write")
        )
        self.assertTrue(
            capability_enabled({"capabilities": {"filesystem_write": True}}, "filesystem_write")
        )
        self.assertFalse(capability_enabled({"capabilities": {}}, "hardware_control"))


if __name__ == "__main__":
    unittest.main()
