"""Unit tests for ``ollama_ask_service`` (mocked; no live Ollama)."""

from __future__ import annotations

import asyncio
import sys
import threading
import types
import unittest
from typing import Any
from unittest.mock import patch

if "decky" not in sys.modules:
    _decky = types.ModuleType("decky")
    _decky.logger = types.SimpleNamespace(
        info=lambda *a, **k: None,
        warning=lambda *a, **k: None,
        error=lambda *a, **k: None,
        exception=lambda *a, **k: None,
    )
    sys.modules["decky"] = _decky

if "pwd" not in sys.modules:
    _pwd = types.ModuleType("pwd")
    _pwd.getpwuid = lambda _uid: types.SimpleNamespace(pw_dir="/tmp")
    sys.modules["pwd"] = _pwd

from backend.services.ai_character_service import build_roleplay_system_suffix_meta
from backend.services.ollama_ask_service import run_ask_ollama


class _FakePlugin:
    DEFAULT_REQUEST_TIMEOUT_SECONDS = 180

    def __init__(self, active_request_id: Any = None) -> None:
        self._background_state: dict[str, Any] = {"request_id": None, "status": "idle"}
        self._fake_active_request_id = active_request_id
        self.published_phases: list[str] = []
        self._active_ollama_chat_pc_ip = None
        self._active_ollama_chat_model = None
        self._active_ollama_chat_http_response = None
        self._chat_resp_ready_evt = None
        self.app_log_calls: list[tuple[tuple[Any, ...], dict[str, Any]]] = []
        self._settings = {
            "model_policy_tier": "open_source_only",
            "model_policy_non_foss_unlocked": False,
            "model_allow_high_vram_fallbacks": False,
            "screenshot_attachment_preset": "low",
            "ai_character_enabled": False,
            "ollama_keep_alive": "",
        }

    def _active_request_id(self) -> Any:
        return self._fake_active_request_id

    def _build_ollama_chat_url(self, pc_ip: str) -> str:
        return f"http://{pc_ip}/api/chat"

    async def load_settings(self) -> dict[str, Any]:
        return dict(self._settings)

    @staticmethod
    def _sanitize_attachments(raw: Any) -> list:
        return list(raw or [])

    def _build_system_prompt(self, *args: Any, **kwargs: Any) -> str:
        return "system prompt"

    async def _maybe_app_log(self, *args: Any, **kwargs: Any) -> None:
        # Records the call so a test can check it happened (and with what fields) without
        # re-testing the real gating logic (`Plugin._desktop_app_log_level_allows` in main.py,
        # not reachable from here) -- that gate is what actually decides verbose-on-or-off.
        self.app_log_calls.append((args, kwargs))
        return None

    def _abort_ollama_chat_check(self) -> bool:
        return False

    def _publish_thinking_phase_key(self, _request_id: Any, phase: Any, **_kwargs: Any) -> None:
        self.published_phases.append(str(phase))

    def _update_partial_response(self, *args: Any, **kwargs: Any) -> None:
        return None


class OllamaAskServiceTests(unittest.IsolatedAsyncioTestCase):
    """Ask model fallback advances when the first tag is missing locally."""

    async def test_ask_model_fallback_skips_missing_model(self) -> None:
        plugin = _FakePlugin()
        call_models: list[str] = []

        def fake_post_ollama_chat(
            url: str,
            model_name: str,
            messages: list,
            request_timeout_seconds: int,
            *args: Any,
            **kwargs: Any,
        ) -> dict[str, Any]:
            call_models.append(model_name)
            if model_name == "qwen2.5vl:3b":
                return {
                    "success": False,
                    "status": 404,
                    "body": '{"error":"model not found"}',
                    "response": "model missing",
                }
            return {
                "success": True,
                "status": 200,
                "model": model_name,
                "response": "fallback ok",
                "assistant_raw": "fallback ok",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5vl:3b", "qwen2.5:3b"],
            ),
            patch(
                "backend.services.ollama_ask_service.probe_ollama_http_ok",
                return_value=True,
            ),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            out = await run_ask_ollama(
                plugin,
                "hello",
                "127.0.0.1:11434",
                "",
                "",
                request_timeout_seconds=30,
            )

        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("model"), "qwen2.5:3b")
        self.assertEqual(call_models, ["qwen2.5vl:3b", "qwen2.5:3b"])
        diag = out.get("ask_diagnostics") or {}
        self.assertEqual(diag.get("model_succeeded"), "qwen2.5:3b")
        self.assertEqual(diag.get("routing_strategy"), "installed_in_policy_chain")

    async def test_connecting_model_publishes_before_the_first_attempt(self) -> None:
        """The cold-model wait is the longest silent stretch of an Ask; it must say something.

        model_retry stays reserved for attempts after the first, so a single-attempt Ask reports
        connecting once and never claims to be retrying.
        """
        plugin = _FakePlugin(active_request_id=4)

        def fake_post_ollama_chat(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "ok",
                "assistant_raw": "ok",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            await run_ask_ollama(plugin, "hello", "127.0.0.1:11434", "", "", request_timeout_seconds=30)

        self.assertEqual(plugin.published_phases, ["connecting_model"])

    async def test_the_ai_character_is_rolled_once_per_ask(self) -> None:
        """ai_character_random defaults on and calls random.choice.

        This function used to resolve it twice -- once for the screenshot_prep blurb's tone and
        once for the reply's actual voice -- so a random character could put a deadpan status line
        in front of a witty answer. Nothing else catches this: both calls succeed, and the two
        results only differ some of the time.
        """
        plugin = _FakePlugin(active_request_id=8)
        plugin._settings["ai_character_enabled"] = True
        plugin._settings["ai_character_random"] = True

        def fake_post_ollama_chat(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "ok",
                "assistant_raw": "ok",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
            patch(
                "backend.services.ollama_ask_service.build_roleplay_system_suffix_meta",
                wraps=build_roleplay_system_suffix_meta,
            ) as spy,
        ):
            await run_ask_ollama(
                plugin,
                "hello",
                "127.0.0.1:11434",
                "",
                "",
                attachments=[{"path": "/home/deck/shot.png", "name": "shot.png"}],
                request_timeout_seconds=30,
            )

        self.assertEqual(spy.call_count, 1)

    async def test_attachment_counts_never_reach_the_reply_but_reach_the_verbose_log(self) -> None:
        """D104: the reply must never carry the old ``[AttachDebug: ...]`` line.

        The counts still go out through ``_maybe_app_log(level="verbose", ...)`` -- the same
        gate an already-verbose-only line above it uses -- so a person only sees them if they
        turned verbose logging on; nobody sees them in the answer itself, ever.
        """
        plugin = _FakePlugin(active_request_id=9)

        def fake_post_ollama_chat(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "Here is the answer.",
                "assistant_raw": "Here is the answer.",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([{"image_b64": "abc"}], [], ["one image too large"]),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            out = await run_ask_ollama(
                plugin,
                "what is in this screenshot",
                "127.0.0.1:11434",
                "",
                "",
                attachments=[{"path": "/home/deck/shot.png", "name": "shot.png"}],
                request_timeout_seconds=30,
            )

        self.assertNotIn("AttachDebug", str(out.get("response") or ""))
        verbose_calls = [
            (args, kwargs)
            for args, kwargs in plugin.app_log_calls
            if kwargs.get("level") == "verbose" and args[:1] == ("ask.attach",)
        ]
        self.assertEqual(len(verbose_calls), 1)
        fields = verbose_calls[0][1].get("fields") or {}
        self.assertEqual(fields.get("requested"), 1)
        self.assertEqual(fields.get("prepared"), 1)
        self.assertEqual(fields.get("errors"), 1)

    async def test_no_attachment_counts_logged_when_nothing_was_attached(self) -> None:
        plugin = _FakePlugin(active_request_id=10)

        def fake_post_ollama_chat(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "ok",
                "assistant_raw": "ok",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            await run_ask_ollama(plugin, "hello", "127.0.0.1:11434", "", "", request_timeout_seconds=30)

        attach_calls = [
            (args, kwargs) for args, kwargs in plugin.app_log_calls if args[:1] == ("ask.attach",)
        ]
        self.assertEqual(attach_calls, [])

    async def test_first_token_retires_the_connecting_line(self) -> None:
        """Reported on device: "Model's warming up…" stayed up for the whole generation.

        It is not only static by then, it is false — the model is writing. Published once, not
        per delta, and skipped when the model supplied its own status tag.
        """
        plugin = _FakePlugin(active_request_id=6)

        def fake_post_ollama_chat(*_args: Any, **kwargs: Any) -> dict[str, Any]:
            on_delta = kwargs.get("on_delta")
            if callable(on_delta):
                on_delta("", False, None)
                on_delta("Here", False, None)
                on_delta("Here is the", False, None)
                on_delta("Here is the answer.", True, None)
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "Here is the answer.",
                "assistant_raw": "Here is the answer.",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            await run_ask_ollama(
                plugin,
                "hello",
                "127.0.0.1:11434",
                "",
                "",
                request_timeout_seconds=30,
                # The delta callback only exists for a background Ask, which is the only path
                # that passes this. Without it there is no stream to react to.
                token_stream_request_id=6,
            )

        self.assertEqual(plugin.published_phases, ["connecting_model", "generating"])

    async def test_a_model_status_tag_wins_over_the_generating_phase(self) -> None:
        plugin = _FakePlugin(active_request_id=7)

        def fake_post_ollama_chat(*_args: Any, **kwargs: Any) -> dict[str, Any]:
            on_delta = kwargs.get("on_delta")
            if callable(on_delta):
                on_delta("Here", False, "Reading your screenshot")
                on_delta("Here is the answer.", True, "Reading your screenshot")
            return {
                "success": True,
                "status": 200,
                "model": "qwen2.5:3b",
                "response": "Here is the answer.",
                "assistant_raw": "Here is the answer.",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            await run_ask_ollama(
                plugin,
                "hello",
                "127.0.0.1:11434",
                "",
                "",
                request_timeout_seconds=30,
                token_stream_request_id=7,
            )

        self.assertEqual(plugin.published_phases, ["connecting_model"])

    async def test_second_model_attempt_reports_retry_not_connecting(self) -> None:
        plugin = _FakePlugin(active_request_id=5)

        def fake_post_ollama_chat(
            _url: str, model_name: str, *_args: Any, **_kwargs: Any
        ) -> dict[str, Any]:
            if model_name == "qwen2.5vl:3b":
                return {
                    "success": False,
                    "status": 404,
                    "body": '{"error":"model not found"}',
                    "response": "model missing",
                }
            return {
                "success": True,
                "status": 200,
                "model": model_name,
                "response": "ok",
                "assistant_raw": "ok",
            }

        with (
            patch(
                "backend.services.ollama_ask_service.list_installed_ollama_tags",
                return_value=["qwen2.5vl:3b", "qwen2.5:3b"],
            ),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch(
                "backend.services.screenshot_media.prepare_attachment_images",
                return_value=([], [], []),
            ),
            patch(
                "backend.services.ollama_ask_service.post_ollama_chat",
                side_effect=fake_post_ollama_chat,
            ),
        ):
            await run_ask_ollama(plugin, "hello", "127.0.0.1:11434", "", "", request_timeout_seconds=30)

        self.assertEqual(plugin.published_phases, ["connecting_model", "model_retry"])


if __name__ == "__main__":
    unittest.main()


class ChatMemoryReachesTheModelTests(unittest.IsolatedAsyncioTestCase):
    """Plan 63: a chat now carries what it has already covered into the next question.

    Before this, a chat kept 200 questions and answers on disk and almost none of it ever reached
    the model: a new question carried the subject of a very recent Strategy or Expert answer and
    nothing else, so a follow-up meant repeating yourself.
    """

    async def _ask_with_chat(self, chat_turns):
        from backend.services.token_accounting_service import reset_token_accounting

        reset_token_accounting()
        self.addCleanup(reset_token_accounting)
        plugin = _FakePlugin(active_request_id=1)
        sent: dict[str, Any] = {}

        def _fake_post(url, model_name, messages, *a, **k):
            sent["system"] = messages[0]["content"]
            sent["user"] = messages[-1]["content"]
            return {"success": True, "status": 200, "model": model_name, "response": "ok",
                    "assistant_raw": "ok"}

        with (
            patch("backend.services.ollama_ask_service.list_installed_ollama_tags",
                  return_value=["qwen2.5:3b"]),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.services.screenshot_media.prepare_attachment_images",
                  return_value=([], [], [])),
            patch("backend.services.ollama_ask_service.post_ollama_chat", side_effect=_fake_post),
        ):
            await run_ask_ollama(
                plugin, "and what about the boots?", "127.0.0.1:11434", "", "",
                request_timeout_seconds=30, chat_turns=chat_turns,
            )
        return sent

    async def test_what_the_chat_already_covered_is_sent_with_the_next_question(self):
        sent = await self._ask_with_chat([
            {"role": "user", "text": "how do i beat morpha"},
            {"role": "assistant", "text": "Use the Longshot to pull the nucleus out of the water."},
        ])
        self.assertIn("how do i beat morpha", sent["system"])
        self.assertIn("Longshot", sent["system"])

    async def test_a_chat_with_nothing_in_it_adds_nothing_at_all(self):
        """An Ask outside a saved chat, or the very first question in one, must send exactly what
        it sent before this existed."""
        sent = await self._ask_with_chat([])
        self.assertEqual(sent["system"], "system prompt")

    async def test_a_spoiler_from_an_earlier_answer_is_not_handed_back_to_the_model(self):
        """The worst thing this feature could do. An answer that fenced something off did so
        because the person had not asked to know it."""
        sent = await self._ask_with_chat([
            {"role": "user", "text": "how do i beat morpha"},
            {"role": "assistant", "text":
             "Use the Longshot.\n```bonsai-spoiler\nDark Link waits in the Water Temple.\n```"},
        ])
        self.assertIn("Longshot", sent["system"])
        self.assertNotIn("Dark Link", sent["system"])
        self.assertNotIn("bonsai-spoiler", sent["system"])

    async def test_the_memory_sits_behind_everything_that_does_not_change(self):
        """The server skips re-reading the front of a question when it has not changed, and this
        block changes on every turn. Anything that changes every turn has to sit behind what does
        not, or it spoils that saving for all of it."""
        sent = await self._ask_with_chat([
            {"role": "user", "text": "how do i beat morpha"},
            {"role": "assistant", "text": "Use the Longshot."},
        ])
        self.assertTrue(sent["system"].startswith("system prompt"))


class ChatSummaryWiringTests(unittest.IsolatedAsyncioTestCase):
    """Plan 68 step 3: run_ask_ollama sums a chat up first when it has outgrown its room, before
    building the question's own memory. Uses a real chat-slot file on disk (a temp dir) so a
    written summary's save, and a failed one's non-save, are proven against the real store rather
    than a mock of it.
    """

    def setUp(self) -> None:
        import tempfile

        from backend.services.chat_slot_service import append_turn, create_slot, load_slot
        from backend.services.token_accounting_service import reset_token_accounting

        reset_token_accounting()
        self.addCleanup(reset_token_accounting)
        self._append_turn = append_turn
        self._load_slot = load_slot
        self.tmp = tempfile.mkdtemp()
        slot = create_slot(self.tmp, first_question="q0", app_name="Half-Life 2")
        self.slot_id = slot["id"]

    def _grow_chat(self, n: int) -> None:
        """``n`` question/answer pairs, long enough that a tiny fallback room cannot hold them
        all -- reliably "outgrown" however the test environment's own network unreachability
        happens to resolve the fallback window."""
        for i in range(n):
            self._append_turn(self.tmp, self.slot_id, role="user", text=f"question {i}")
            self._append_turn(
                self.tmp, self.slot_id, role="assistant", text=f"answer number {i} " * 30
            )

    def _chat(self) -> dict:
        slot = self._load_slot(self.tmp, self.slot_id)
        return {"id": slot["id"], "turns": slot["turns"], "summary": slot.get("summary")}

    def _plugin(self) -> "_FakePlugin":
        plugin = _FakePlugin(active_request_id=1)
        plugin._chat_slots_settings_dir = lambda: self.tmp
        plugin._chat_slots_store_lock = asyncio.Lock()
        plugin._abort_current_ollama_chat = threading.Event()
        plugin._abort_ollama_chat_check = lambda: plugin._abort_current_ollama_chat.is_set()
        return plugin

    async def _run(self, plugin, chat, *, summary_stream_result):
        answer_calls: list[str] = []

        def _fake_post(url, model_name, messages, *a, **k):
            answer_calls.append(model_name)
            return {
                "success": True, "status": 200, "model": model_name,
                "response": "the answer", "assistant_raw": "the answer",
            }

        with (
            patch("backend.services.ollama_ask_service.list_installed_ollama_tags",
                  return_value=["qwen2.5:3b"]),
            patch("backend.services.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.services.screenshot_media.prepare_attachment_images",
                  return_value=([], [], [])),
            patch("backend.services.ollama_ask_service.post_ollama_chat", side_effect=_fake_post),
            patch("backend.services.chat_summary_service._stream_ollama_chat_once",
                  return_value=summary_stream_result) as summary_mock,
        ):
            out = await run_ask_ollama(
                plugin, "and what about that", "127.0.0.1:11434", "", "Half-Life 2",
                request_timeout_seconds=30, chat=chat,
            )
        return out, answer_calls, summary_mock

    async def test_an_outgrown_chat_sums_up_first_and_saves_the_summary(self):
        self._grow_chat(80)
        out, answer_calls, summary_mock = await self._run(
            self._plugin(), self._chat(),
            summary_stream_result={
                "success": True, "visible_raw": "Notes about Half-Life 2.",
                "assistant_raw": "Notes about Half-Life 2.",
            },
        )
        self.assertEqual(summary_mock.call_count, 1)
        self.assertEqual(len(answer_calls), 1)
        self.assertEqual(out.get("chat_summary"), "written")
        saved = self._load_slot(self.tmp, self.slot_id)
        self.assertIsNotNone(saved.get("summary"))
        self.assertEqual(saved["summary"]["text"], "Notes about Half-Life 2.")

    async def test_a_chat_that_fits_calls_the_model_once_and_saves_nothing(self):
        self._grow_chat(1)  # one short exchange -- nowhere near outgrowing any real room
        plugin = self._plugin()
        out, answer_calls, summary_mock = await self._run(
            plugin, self._chat(), summary_stream_result={"success": True, "visible_raw": "x"},
        )
        self.assertEqual(summary_mock.call_count, 0)
        self.assertEqual(len(answer_calls), 1)
        self.assertEqual(out.get("chat_summary"), "")
        self.assertNotIn("summing_up", plugin.published_phases)
        saved = self._load_slot(self.tmp, self.slot_id)
        self.assertIsNone(saved.get("summary"))

    async def test_a_failed_summary_still_answers_with_todays_memory(self):
        self._grow_chat(80)
        plugin = self._plugin()
        out, answer_calls, summary_mock = await self._run(
            plugin, self._chat(),
            summary_stream_result={"success": False, "response": "model error"},
        )
        self.assertEqual(summary_mock.call_count, 1)
        self.assertEqual(len(answer_calls), 1)
        self.assertEqual(out.get("chat_summary"), "failed")
        self.assertEqual(out.get("response"), "the answer")  # unchanged -- no warning appended
        self.assertIn("summing_up", plugin.published_phases)
        saved = self._load_slot(self.tmp, self.slot_id)
        self.assertIsNone(saved.get("summary"))

    async def test_a_stopped_summary_makes_no_answer_call_and_saves_nothing(self):
        self._grow_chat(80)
        out, answer_calls, summary_mock = await self._run(
            self._plugin(), self._chat(),
            summary_stream_result={
                "success": False, "response": "Request stopped (connection closed).",
                "cancelled": True,
            },
        )
        self.assertEqual(summary_mock.call_count, 1)
        self.assertEqual(len(answer_calls), 0)
        self.assertTrue(out.get("cancelled"))
        self.assertFalse(out.get("success"))
        saved = self._load_slot(self.tmp, self.slot_id)
        self.assertIsNone(saved.get("summary"))
