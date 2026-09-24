"""Title: A real Plugin reading and writing a throwaway settings.json

Purpose: The set-up that tests driving Plugin RPCs against a settings file on disk share: a temporary
folder, Plugin._settings_path pointed at a settings.json inside it, and decky's settings folder
pointed at the same place, plus the two one-line helpers for writing and reading that file.
Used for: test_merge_pulled_tags_rpc.py and test_delete_model_cleans_routing_orders.py.
Solves: each of those files carried its own copy of these lines, which the copy-paste gate counts.
Does not: stub anything a single test needs on top (the local-Ollama gate, `ollama rm`); each test
file patches those itself.
"""

import json
import os
import tempfile
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from main import Plugin  # noqa: E402


class PluginSettingsFileMixin:
    """Mix into an IsolatedAsyncioTestCase and call start_plugin_with_settings_file() in asyncSetUp."""

    def start_plugin_with_settings_file(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.settings_dir = tmp.name
        self.settings_path = os.path.join(self.settings_dir, "settings.json")
        os.makedirs(self.settings_dir, exist_ok=True)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        patcher.start()
        self.addCleanup(patcher.stop)

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.settings_dir

    def _write_settings(self, data: dict) -> None:
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def _read_settings(self) -> dict:
        with open(self.settings_path, encoding="utf-8") as f:
            return json.load(f)
