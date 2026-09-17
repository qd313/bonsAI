"""Chat slot ownership: record-before-launch and request_id map routing."""

import asyncio
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

if "fcntl" not in sys.modules:
    _fcntl = types.ModuleType("fcntl")
    _fcntl.LOCK_EX = 2
    _fcntl.LOCK_NB = 4
    _fcntl.LOCK_UN = 8
    _fcntl.flock = lambda *_a, **_k: False
    sys.modules["fcntl"] = _fcntl

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.DECKY_PLUGIN_SETTINGS_DIR = "/tmp/bonsai-chat-slot-tests"
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

from backend.services.chat_slot_service import create_slot, load_slot, wipe_all_slots  # noqa: E402
from main import Plugin  # noqa: E402


class ChatSlotOwnershipTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.mkdtemp()
        self.settings_patcher = patch.object(Plugin, "_chat_slots_settings_dir", return_value=self.tmp)
        self.settings_patcher.start()
        self.plugin = Plugin()
        wipe_all_slots(self.tmp)

    async def asyncTearDown(self) -> None:
        self.settings_patcher.stop()
        import shutil

        shutil.rmtree(self.tmp, ignore_errors=True)

    async def test_user_turn_recorded_before_task_launch(self) -> None:
        slot = create_slot(self.tmp, label="test-slot")
        sid = slot["id"]
        execute_started = asyncio.Event()
        execute_gate = asyncio.Event()

        async def slow_execute(*_args, **_kwargs):
            execute_started.set()
            await execute_gate.wait()
            return {"success": True, "response": "assistant reply", "elapsed_seconds": 0.1}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=slow_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    ack = await self.plugin.start_background_game_ai(
                        {
                            "question": "hello?",
                            "PcIp": "127.0.0.1:11434",
                            "appId": "",
                            "appName": "",
                            "chat_slot_id": sid,
                        }
                    )
                    self.assertTrue(ack.get("accepted"))
                    request_id = ack.get("request_id")
                    self.assertIsInstance(request_id, int)

                    loaded = load_slot(self.tmp, sid)
                    self.assertIsNotNone(loaded)
                    assert loaded is not None
                    user_turns = [t for t in loaded["turns"] if t.get("role") == "user"]
                    self.assertEqual(len(user_turns), 1)
                    self.assertEqual(user_turns[0]["text"], "hello?")
                    self.assertEqual(self.plugin._chat_slot_by_request.get(request_id), sid)

                    execute_gate.set()
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task

    async def test_assistant_turn_routes_by_request_map(self) -> None:
        slot = create_slot(self.tmp, label="route-me")
        sid = slot["id"]

        async def fast_execute(*_args, **_kwargs):
            return {"success": True, "response": "routed answer", "elapsed_seconds": 0.01}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    ack = await self.plugin.start_background_game_ai(
                        {
                            "question": "xyzzy slot routing test?",
                            "PcIp": "127.0.0.1:11434",
                            "chat_slot_id": sid,
                        }
                    )
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task

        loaded = load_slot(self.tmp, sid)
        self.assertIsNotNone(loaded)
        assert loaded is not None
        assistant_turns = [t for t in loaded["turns"] if t.get("role") == "assistant"]
        self.assertEqual(len(assistant_turns), 1)
        self.assertEqual(assistant_turns[0]["text"], "routed answer")
        self.assertNotIn(ack.get("request_id"), self.plugin._chat_slot_by_request)

    async def test_assistant_turn_persists_transparency_from_result(self) -> None:
        """Regression: the assistant turn used to be saved with no transparency at all — the
        RPC result carried a per-Ask snapshot that never reached chat_slot_service. Verifies the
        result's ``transparency`` key (built by ``transparency_snapshot_for_chat_slot``) lands on
        the persisted assistant turn.
        """
        slot = create_slot(self.tmp, label="transparency-route")
        sid = slot["id"]
        snapshot = {
            "route": "ollama",
            "success": True,
            "context_chips": [{"id": "kb", "rank": 1, "label": "KB", "attached": True}],
            "overflow_skips": [],
        }

        async def fast_execute(*_args, **_kwargs):
            return {
                "success": True,
                "response": "routed answer",
                "elapsed_seconds": 0.01,
                "transparency": snapshot,
            }

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    await self.plugin.start_background_game_ai(
                        {
                            "question": "does this persist transparency?",
                            "PcIp": "127.0.0.1:11434",
                            "chat_slot_id": sid,
                        }
                    )
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task

        loaded = load_slot(self.tmp, sid)
        assert loaded is not None
        assistant_turns = [t for t in loaded["turns"] if t.get("role") == "assistant"]
        self.assertEqual(len(assistant_turns), 1)
        # kb_attached_notes (plan 58 phase 1) is always present on a normalized transparency
        # object, even when this snapshot said nothing about it.
        self.assertEqual(assistant_turns[0]["transparency"], {**snapshot, "kb_attached_notes": []})

    async def test_both_turns_persist_the_ask_app_id(self) -> None:
        """Regression (DRG-GLOSSARY-01): the AppID the Ask ran under reached the log line and the
        slot header but never the turns themselves, so a reply re-read from the saved chat came
        back claiming no game was running. Covers both writers in one pass — the user turn on
        submit and the assistant turn on completion.
        """
        slot = create_slot(self.tmp, label="app-id-route")
        sid = slot["id"]

        async def fast_execute(*_args, **_kwargs):
            return {"success": True, "response": "routed answer", "elapsed_seconds": 0.01}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    await self.plugin.start_background_game_ai(
                        {
                            "question": "what is kiting?",
                            "PcIp": "127.0.0.1:11434",
                            "appId": "548430",
                            "appName": "Deep Rock Galactic: Survivor",
                            "chat_slot_id": sid,
                        }
                    )
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task

        loaded = load_slot(self.tmp, sid)
        assert loaded is not None
        self.assertEqual([t["app_id"] for t in loaded["turns"]], ["548430", "548430"])

    async def test_display_question_reaches_the_saved_user_turn(self) -> None:
        """End to end through the RPC: the payload's ``display_question`` (the caption the user
        saw) lands on the persisted user turn as ``display_text``, while ``text`` keeps the
        composed prompt the model was actually sent.
        """
        slot = create_slot(self.tmp, label="caption-route")
        sid = slot["id"]

        async def fast_execute(*_args, **_kwargs):
            return {"success": True, "response": "routed answer", "elapsed_seconds": 0.01}

        with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
            with patch.object(Plugin, "load_settings", return_value={}):
                with patch.object(
                    Plugin,
                    "_compose_opening_thinking_blurb",
                    return_value=("Thinking…", None),
                ):
                    await self.plugin.start_background_game_ai(
                        {
                            "question": "[Strategy follow-up] I'm at: the twins",
                            "display_question": "I'm at: the twins",
                            "PcIp": "127.0.0.1:11434",
                            "chat_slot_id": sid,
                        }
                    )
                    if self.plugin._background_task is not None:
                        await self.plugin._background_task

        loaded = load_slot(self.tmp, sid)
        assert loaded is not None
        user_turns = [t for t in loaded["turns"] if t.get("role") == "user"]
        self.assertEqual(user_turns[0]["display_text"], "I'm at: the twins")
        self.assertEqual(user_turns[0]["text"], "[Strategy follow-up] I'm at: the twins")

    async def test_vac_check_deny_reply_persists_turn_and_renames_slot(self) -> None:
        """Regression: a deterministic local command (bonsai:vac-check, ban lookup off) used to
        return from _finalize_immediate_background_local_command without ever touching the chat
        slot. The slot never gained a first turn, so its title stayed the "New chat" default and
        a later transcript reload found nothing -- which is what blanked the turn header back to
        "..." on the frontend (traced in docs/roadmap-details.md).
        """
        slot = create_slot(self.tmp)
        sid = slot["id"]
        self.assertEqual(slot["label"], "New chat")

        with patch.object(Plugin, "load_settings", return_value={}):
            ack = await self.plugin.start_background_game_ai(
                {
                    "question": "bonsai:vac-check",
                    "PcIp": "",
                    "chat_slot_id": sid,
                }
            )

        self.assertTrue(ack.get("accepted"))
        self.assertEqual(ack.get("status"), "completed")

        loaded = load_slot(self.tmp, sid)
        self.assertIsNotNone(loaded)
        assert loaded is not None
        self.assertEqual(len(loaded["turns"]), 2)
        user_turn, assistant_turn = loaded["turns"]
        self.assertEqual(user_turn["role"], "user")
        self.assertEqual(user_turn["text"], "bonsai:vac-check")
        self.assertEqual(assistant_turn["role"], "assistant")
        self.assertIn("Steam Web API is off", assistant_turn["text"])
        self.assertEqual(loaded["label"], "bonsai:vac-check")
        self.assertNotEqual(loaded["label"], "New chat")

    async def test_shortcut_setup_reply_also_persists_to_chat_slot(self) -> None:
        """Same fix, second call site: sanitizer / shortcut-setup / VAC check all finalize through
        the same shared helper, so a passed chat_slot_id has to reach every one of them, not just
        the VAC branch the bug report happened to name.
        """
        slot = create_slot(self.tmp)
        sid = slot["id"]

        with patch.object(Plugin, "load_settings", return_value={}):
            ack = await self.plugin.start_background_game_ai(
                {
                    "question": "bonsai:shortcut-setup-deck",
                    "PcIp": "",
                    "chat_slot_id": sid,
                }
            )

        self.assertTrue(ack.get("accepted"))
        self.assertEqual(ack.get("shortcut_setup"), "deck")

        loaded = load_slot(self.tmp, sid)
        assert loaded is not None
        self.assertEqual(len(loaded["turns"]), 2)
        self.assertEqual(loaded["turns"][0]["role"], "user")
        self.assertEqual(loaded["turns"][0]["text"], "bonsai:shortcut-setup-deck")
        self.assertEqual(loaded["turns"][1]["role"], "assistant")
        self.assertEqual(loaded["label"], "bonsai:shortcut-setup-deck")

    async def test_unknown_request_id_logs_fault(self) -> None:
        self.plugin._background_request_seq = 9999
        self.plugin._background_state = {
            "status": "pending",
            "request_id": 9999,
            "question": "orphan",
            "app_id": "",
            "app_context": "none",
        }

        errors: list[str] = []

        def capture_error(msg, *args):
            errors.append(str(msg) % args if args else str(msg))

        async def fast_execute(*_args, **_kwargs):
            return {"success": True, "response": "orphan answer", "elapsed_seconds": 0.01}

        with patch.object(sys.modules["decky"].logger, "error", side_effect=capture_error):
            with patch.object(Plugin, "_execute_game_ai_request", side_effect=fast_execute):
                await self.plugin._run_background_request(
                    9999,
                    "orphan",
                    "127.0.0.1:11434",
                    "",
                    "",
                )

        joined = " ".join(errors)
        self.assertIn("chat_slots: no slot for request_id=9999", joined)


if __name__ == "__main__":
    unittest.main()
