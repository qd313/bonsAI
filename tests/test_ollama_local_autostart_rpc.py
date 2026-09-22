"""apply_/get_ollama_local_autostart RPCs must delegate to the service module.

The service module (tests/test_ollama_local_autostart_service.py) already covers the
refusal rules, the environment written, and leaving a running Ollama alone. This file
only proves the RPC methods on Plugin call through to it and hand back what it returns.
"""

import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


class OllamaLocalAutostartRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.plugin = Plugin()

    async def test_apply_delegates_to_the_service_with_a_bool(self) -> None:
        with patch("main.apply_ollama_local_autostart_entry") as apply_fn:
            apply_fn.return_value = {"ok": True, "changed": True, "message": "Started now."}
            out = await self.plugin.apply_ollama_local_autostart(True)

        apply_fn.assert_called_once_with(True)
        self.assertEqual(out, {"ok": True, "changed": True, "message": "Started now."})

    async def test_apply_coerces_a_truthy_non_bool_argument(self) -> None:
        with patch("main.apply_ollama_local_autostart_entry") as apply_fn:
            apply_fn.return_value = {"ok": True, "changed": False}
            await self.plugin.apply_ollama_local_autostart(1)

        apply_fn.assert_called_once_with(True)

    async def test_get_status_returns_the_service_report_unchanged(self) -> None:
        report = {
            "installed": True,
            "enabled": True,
            "running": False,
            "reason": "Nothing is answering questions right now.",
        }
        with patch("main.get_ollama_local_autostart_status_report") as status_fn:
            status_fn.return_value = report
            out = await self.plugin.get_ollama_local_autostart_status()

        status_fn.assert_called_once_with()
        self.assertEqual(out, report)


if __name__ == "__main__":
    unittest.main()
