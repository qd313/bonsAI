"""Unit tests for plan 68 step 4's `can_sum_up` flag: chat_sum_up_job.chat_can_sum_up, and that
every RPC call handing a full chat back to the screen carries it.
"""

import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.services.chat_summary_service import reset_last_memory_allowance  # noqa: E402
from backend.services.chat_sum_up_job import chat_can_sum_up  # noqa: E402
from test_chat_sum_up_job import ChatSlotJobTestCase, _seed_chat  # noqa: E402


class ChatCanSumUpPureTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_last_memory_allowance()

    def test_a_short_chat_cannot_be_summed_up(self):
        chat = {"turns": [{"id": "q0", "role": "user", "text": "hi"}]}
        self.assertFalse(chat_can_sum_up(chat))

    def test_a_long_chat_can_be_summed_up(self):
        turns = []
        for i in range(60):
            turns.append({"id": f"q{i}", "role": "user", "text": f"question number {i}"})
            turns.append(
                {"id": f"a{i}", "role": "assistant", "text": f"answer number {i} " * 20}
            )
        chat = {"turns": turns}
        self.assertTrue(chat_can_sum_up(chat))

    def test_a_chat_with_no_turns_cannot_be_summed_up(self):
        self.assertFalse(chat_can_sum_up({"turns": []}))


class ChatSlotRpcCanSumUpTests(ChatSlotJobTestCase):
    async def test_get_chat_slot_carries_can_sum_up_true_for_a_long_chat(self) -> None:
        sid = _seed_chat(self.tmp, turns=60)
        result = await self.plugin.get_chat_slot(sid)
        self.assertTrue(result["ok"])
        self.assertTrue(result["slot"]["can_sum_up"])

    async def test_get_chat_slot_carries_can_sum_up_false_for_a_short_chat(self) -> None:
        sid = _seed_chat(self.tmp, turns=1)
        result = await self.plugin.get_chat_slot(sid)
        self.assertTrue(result["ok"])
        self.assertFalse(result["slot"]["can_sum_up"])

    async def test_create_chat_slot_carries_can_sum_up(self) -> None:
        result = await self.plugin.create_chat_slot({"label": "new chat"})
        self.assertTrue(result["ok"])
        self.assertIn("can_sum_up", result["slot"])
        self.assertFalse(result["slot"]["can_sum_up"], "a brand new chat has nothing to sum up")

    async def test_rename_chat_slot_carries_can_sum_up(self) -> None:
        sid = _seed_chat(self.tmp, turns=60)
        result = await self.plugin.rename_chat_slot({"slot_id": sid, "label": "renamed"})
        self.assertTrue(result["ok"])
        self.assertTrue(result["slot"]["can_sum_up"])


if __name__ == "__main__":
    unittest.main()
