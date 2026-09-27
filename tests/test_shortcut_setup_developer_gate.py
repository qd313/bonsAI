"""0.6.0 (plan 72): the quick-launch shortcut-setup commands answer only with the Developer tab on.

The quick-launch chord is shelved and never ran on real hardware, so a player without the
Developer tab gets one plain line and no "Open Controller settings" button (no shortcut_setup).
Turning the Developer tab on brings the full steps back.
"""

import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402

UNAVAILABLE = "That command isn't available in this version."


class ShortcutSetupDeveloperGateTests(unittest.IsolatedAsyncioTestCase):
    async def test_developer_tab_off_gives_one_plain_line_and_no_button(self) -> None:
        plugin = Plugin()
        for command in ("bonsai:shortcut-setup-deck", "/bonsai:shortcut-setup-stadia"):
            with patch.object(Plugin, "load_settings", return_value={"show_developer_tab": False}):
                out = await plugin._try_handle_shortcut_setup_command(command, "")
            assert out is not None
            self.assertTrue(out["success"])
            self.assertEqual(out["response"], UNAVAILABLE)
            self.assertNotIn("shortcut_setup", out)

    async def test_developer_tab_on_gives_the_steps_and_the_button(self) -> None:
        plugin = Plugin()
        with patch.object(Plugin, "load_settings", return_value={"show_developer_tab": True}):
            out = await plugin._try_handle_shortcut_setup_command("bonsai:shortcut-setup-deck", "")
        assert out is not None
        self.assertEqual(out["shortcut_setup"], "deck")
        self.assertIn("Guide Button Chord Layout", out["response"])

    async def test_other_text_is_still_not_a_command(self) -> None:
        plugin = Plugin()
        with patch.object(Plugin, "load_settings", return_value={"show_developer_tab": False}):
            out = await plugin._try_handle_shortcut_setup_command("how do I set up a shortcut?", "")
        self.assertIsNone(out)

    async def test_background_path_off_gives_the_line_without_a_button(self) -> None:
        plugin = Plugin()
        with patch.object(Plugin, "load_settings", return_value={}):
            ack = await plugin.start_background_game_ai({"question": "bonsai:shortcut-setup-deck", "PcIp": ""})
        self.assertTrue(ack.get("accepted"))
        self.assertFalse(ack.get("shortcut_setup"))
        self.assertEqual(ack.get("response"), UNAVAILABLE)


if __name__ == "__main__":
    unittest.main()
