"""save_ask_feedback must accept the chip_id the frontend has always sent.

Regression test. `useBonsaiAskOrchestration.ts` calls this RPC with five positional args
(`rating, request_id, question_len, success, chip_id`) for every refine-chip press, but the
Python method only declared four parameters. Decky's `call()` forwards args positionally
(`callDeckyWithTimeout` docs this in `deckyCall.ts`), so every refine chip -- "Bad information",
"Too long", "Too short", "Misidentified game/problem", and now "Unfenced spoiler" -- raised
`TypeError: save_ask_feedback() takes from 2 to 5 positional arguments but 6 were given` on a
real device. Nothing caught it: `fakeDeckyRpc.ts` stubs `save_ask_feedback` as `() => ({ ok: true
})`, ignoring its arguments entirely, so the TypeScript suite exercised the fake rather than the
real backend -- the same blind spot documented in `test_reply_language_snapshot_rpc.py`.

The user-visible effect was silent: `onReplyMicroAction` catches the RPC failure and only shows
`chipError` in the UI, while the chip still autofills the follow-up prompt (see
`buildReplyActionsElement.tsx`). So refining a reply worked, but the `chip_id` line this test
checks for was never written to `bonsai_feedback.jsonl`.
"""

import json
import tempfile
import unittest

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

import main  # noqa: E402  (import side effects set up sys.path like the loader does)
from main import Plugin  # noqa: E402

from backend.services.feedback_service import feedback_log_path  # noqa: E402


class SaveAskFeedbackRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.plugin = Plugin()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.tmp.name

    def _last_line(self) -> dict:
        path = feedback_log_path(self.tmp.name)
        with open(path, encoding="utf-8") as f:
            lines = f.read().strip().splitlines()
        return json.loads(lines[-1])

    async def test_accepts_five_positional_args_like_the_frontend_sends(self) -> None:
        """Mirrors the exact call shape in useBonsaiAskOrchestration.ts's onReplyMicroAction."""
        result = await self.plugin.save_ask_feedback("down", 42, 17, True, "too_long")
        self.assertTrue(result.get("ok"))
        self.assertEqual(self._last_line()["chip_id"], "too_long")

    async def test_accepts_unfenced_spoiler_chip_id(self) -> None:
        result = await self.plugin.save_ask_feedback("down", 1, 5, True, "unfenced_spoiler")
        self.assertTrue(result.get("ok"))
        self.assertEqual(self._last_line()["chip_id"], "unfenced_spoiler")

    async def test_plain_thumbs_down_without_a_chip_still_works(self) -> None:
        result = await self.plugin.save_ask_feedback("down", 1, 5, True, "")
        self.assertTrue(result.get("ok"))
        self.assertNotIn("chip_id", self._last_line())

    async def test_chip_id_defaults_when_omitted(self) -> None:
        """onReplyFeedback (thumbs up/down, no chip) has always called with 4 args."""
        result = await self.plugin.save_ask_feedback("up", 1, 5, True)
        self.assertTrue(result.get("ok"))
        self.assertNotIn("chip_id", self._last_line())


if __name__ == "__main__":
    unittest.main()
