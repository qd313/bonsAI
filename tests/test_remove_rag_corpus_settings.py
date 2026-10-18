"""Title: Removing the knowledge library saves "Use local knowledge base" as off

Purpose: Pin what remove_rag_corpus writes: the library's folder is deleted, and the settings file is left
with the library's path and version empty and ``use_local_knowledge_base`` false. The Remove box promises
the switch goes off; plan 93 block C part 2 (workshop:test-evidence/plan93-P90-SEARCH-KB.json) saw the switch
read "on" on the Deck, and this test shows the back end was never the part that failed (the screen was:
src/features/knowledge-library/KnowledgeBaseSection.removeSwitch.test.tsx).
Used for: backend/services/rag_corpus_rpc.remove_rag_corpus.
Solves: A later change to the remove method quietly dropping the setting.
Does not: Touch the disk; the folder removal and the settings file are faked.
"""

from __future__ import annotations

import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.knowledge import rag_corpus_rpc  # noqa: E402


class _FakePlugin:
    def __init__(self) -> None:
        self.settings = {
            "rag_corpus_path": "/run/media/deck/card/.bonsai/rag",
            "rag_corpus_version": "2026.09.26",
            "use_local_knowledge_base": True,
        }

    async def load_settings(self) -> dict:
        return dict(self.settings)

    async def save_settings(self, incoming: dict) -> dict:
        self.settings = {**self.settings, **incoming}
        return dict(self.settings)


class RemoveRagCorpusSettingsTests(unittest.IsolatedAsyncioTestCase):
    async def test_remove_saves_the_switch_off_and_clears_path_and_version(self) -> None:
        plugin = _FakePlugin()
        with mock.patch.object(rag_corpus_rpc, "remove_corpus_at_path", return_value=True) as removed:
            out = await rag_corpus_rpc.remove_rag_corpus(plugin)
        removed.assert_called_once()
        self.assertEqual(out, {"ok": True, "removed": True})
        self.assertIs(plugin.settings["use_local_knowledge_base"], False)
        self.assertEqual(plugin.settings["rag_corpus_path"], "")
        self.assertEqual(plugin.settings["rag_corpus_version"], "")


if __name__ == "__main__":
    unittest.main()
