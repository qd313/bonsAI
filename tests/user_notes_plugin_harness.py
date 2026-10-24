"""Plan 92 lane N2: the plugin on a temporary settings folder, shared by the note-offer tests.

A test case that inherits ``PluginOnATempFolder`` gets ``self.plugin`` (a real ``Plugin``) and
``self.tmp`` (the folder its chats and notes are kept in); both go away with the test.
"""

import shutil
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from main import Plugin  # noqa: E402


class PluginOnATempFolder(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.mkdtemp()
        patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.plugin = Plugin()
