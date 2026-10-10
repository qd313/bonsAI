"""Plan 87 F2: ten chats, and nothing is ever deleted to make room.

The plugin keeps ten chats. Starting an eleventh used to delete the oldest without a word; now the
back end refuses and leaves every chat file exactly as it was. The screen's picker (which chat to drop,
then the Delete chat? box) is the only way a chat goes to make room.
"""

import asyncio
import hashlib
import os
import sys
import tempfile
import types
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

if "pwd" not in sys.modules:
    _pwd = types.ModuleType("pwd")
    _pwd.getpwuid = lambda _uid: types.SimpleNamespace(pw_dir="/tmp")
    sys.modules["pwd"] = _pwd

from backend.services import chat_slot_rpc  # noqa: E402
from backend.services.chat_slot_service import (  # noqa: E402
    MAX_CHAT_SLOTS,
    ChatLimitReached,
    create_slot,
    delete_slot,
    ensure_slot,
    index_path,
    list_slot_summaries,
    load_slot,
    slot_path,
)


def _fingerprint(directory: str) -> dict:
    """Every file in the settings folder with a hash of its bytes."""
    out = {}
    for root, _dirs, files in os.walk(directory):
        for name in files:
            path = os.path.join(root, name)
            with open(path, "rb") as fh:
                out[os.path.relpath(path, directory)] = hashlib.sha256(fh.read()).hexdigest()
    return out


class ChatSlotLimitTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.tmp = tmp.name
        self.ids = [create_slot(self.tmp, label=f"chat-{i}")["id"] for i in range(MAX_CHAT_SLOTS)]

    def test_the_limit_is_ten(self):
        self.assertEqual(MAX_CHAT_SLOTS, 10)
        self.assertEqual(len(list_slot_summaries(self.tmp)), 10)

    def test_a_create_at_ten_is_refused_and_no_file_changes(self):
        before = _fingerprint(self.tmp)
        with self.assertRaises(ChatLimitReached):
            create_slot(self.tmp, label="the eleventh")
        self.assertEqual(_fingerprint(self.tmp), before)
        self.assertEqual({r["id"] for r in list_slot_summaries(self.tmp)}, set(self.ids))

    def test_a_question_for_an_unknown_chat_at_ten_files_nowhere_and_deletes_nothing(self):
        before = _fingerprint(self.tmp)
        self.assertIsNone(ensure_slot(self.tmp, "not-a-chat-we-have", first_question="hi"))
        self.assertEqual(_fingerprint(self.tmp), before)

    def test_a_question_for_a_chat_we_have_still_works_at_ten(self):
        again = ensure_slot(self.tmp, self.ids[3], first_question="hi")
        assert again is not None
        self.assertEqual(again["id"], self.ids[3])

    def test_a_create_after_one_delete_works_and_only_the_named_chat_goes(self):
        gone = self.ids[0]
        before = _fingerprint(self.tmp)
        self.assertTrue(delete_slot(self.tmp, gone))
        fresh = create_slot(self.tmp, label="made after the pick")
        after = _fingerprint(self.tmp)
        self.assertIsNone(load_slot(self.tmp, gone))
        self.assertEqual(len(list_slot_summaries(self.tmp)), 10)
        changed = {name for name in set(before) | set(after) if before.get(name) != after.get(name)}
        index_name = os.path.relpath(index_path(self.tmp), self.tmp)
        def name(sid):
            return os.path.relpath(slot_path(self.tmp, sid), self.tmp)

        self.assertEqual(changed, {name(gone), name(fresh["id"]), index_name})

    def test_the_create_chat_slot_call_at_ten_says_so_in_words_the_screen_can_read(self):
        class FakePlugin:
            _chat_slots_store_lock = asyncio.Lock()

            def _chat_slots_settings_dir(inner):
                return self.tmp

        before = _fingerprint(self.tmp)
        result = asyncio.run(chat_slot_rpc.create_chat_slot(FakePlugin(), {"label": "x"}))
        self.assertEqual(result["ok"], False)
        self.assertEqual(result["error"], "chat_limit")
        self.assertEqual(result["limit"], 10)
        self.assertNotIn("slot", result)
        self.assertEqual(_fingerprint(self.tmp), before)

    def test_the_create_chat_slot_call_below_ten_still_makes_a_chat(self):
        delete_slot(self.tmp, self.ids[0])

        class FakePlugin:
            _chat_slots_store_lock = asyncio.Lock()

            def _chat_slots_settings_dir(inner):
                return self.tmp

        result = asyncio.run(chat_slot_rpc.create_chat_slot(FakePlugin(), {"label": "x"}))
        self.assertTrue(result["ok"])
        self.assertEqual(result["slot"]["label"], "x")


if __name__ == "__main__":
    unittest.main()
