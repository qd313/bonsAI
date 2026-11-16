"""The low-memory warning (plan 104 lane G1): free memory is read before the Deck's own AI loads.

Two levels. The check on its own (memory and Ollama stood in), and the real ``run_ask_ollama``, which is
the level the Deck check looks at: a short Deck gets the warning and the model is never called; a model
that is already loaded answers; "Ask anyway" answers once and the next question warns again; the AI on a
PC is never checked; an unreadable ``/proc/meminfo`` never warns.
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
import time
import unittest
from pathlib import Path
from typing import Any, Optional
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

from backend.ask.ollama_ask_service import run_ask_ollama  # noqa: E402
from backend.ollama import ollama_memory_guard as guard  # noqa: E402
from test_chat_sum_up_job import (  # noqa: E402  (the neighbouring tests' set-up, reused)
    _FIXED_MODEL_AND_WINDOW,
    ChatSlotJobTestCase,
    SummaryOutcome,
    _seed_chat,
)
from test_ollama_ask_service import _FakePlugin  # noqa: E402

DECK = "127.0.0.1:11434"
MODEL = "gemma4:e2b-it-qat"
MB = 1024 * 1024
# The Deck's own readings (plan 104 block D0a, 2026-11-15, plan104-P104-M-MEMORY-try2.json), in MB.
DECK_INSTALLED_MB = 4135  # gemma4:e2b-it-qat in /api/tags: 4,336,358,185 bytes
DECK_REPORTED_MB = 2189  # what /api/ps said was loaded: 2,295,311,891 bytes
DECK_GOD_OF_WAR_MB = 4885  # MemAvailable with God of War running, the AI unloaded
DECK_DRG_SURVIVOR_MB = 8682  # the same with Deep Rock Galactic: Survivor running


def _health(installed_mb: int = 4336, loaded: Optional[dict[str, int]] = None) -> dict[str, Any]:
    """What ``probe_ollama_health`` hands back: the installed sizes and the loaded rows."""
    ps = [{"name": n, "size_bytes": mb * MB, "size_vram_bytes": 0} for n, mb in (loaded or {}).items()]
    return {"version": "0", "models": [MODEL], "model_sizes": {MODEL: installed_mb * MB}, "ps_loaded": ps}


class _Standins(unittest.TestCase):
    """Memory and Ollama stood in; the armed mark and the remembered sizes start clean."""

    def setUp(self) -> None:
        guard.reset_for_tests()
        self.addCleanup(guard.reset_for_tests)
        self.available_mb: Optional[int] = 3500
        self.health: Any = _health()
        for target, value in (
            ("read_available_mb", lambda *a, **k: self.available_mb),
            ("probe_ollama_health", self._probe),
        ):
            patcher = patch.object(guard, target, side_effect=value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.addCleanup(lambda: os.environ.pop(guard.MEMORY_LIMIT_ENV, None))
        os.environ.pop(guard.MEMORY_LIMIT_ENV, None)

    def _probe(self, *_a: Any, **_k: Any) -> dict[str, Any]:
        if isinstance(self.health, Exception):
            raise self.health
        return self.health


class CheckTests(_Standins):
    def test_short_when_loading_would_leave_less_than_the_limit(self) -> None:
        verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
        assert verdict is not None
        self.assertTrue(verdict.short)
        self.assertEqual(verdict.available_mb, 3500)
        self.assertEqual(verdict.needed_mb, round(4336 * guard.LOAD_SIZE_FACTOR))
        self.assertLess(verdict.left_mb, guard.MEMORY_LIMIT_MB)

    def test_not_short_on_an_idle_deck(self) -> None:
        self.available_mb = 12000
        verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
        assert verdict is not None
        self.assertFalse(verdict.short)

    def test_a_model_already_loaded_is_never_short(self) -> None:
        self.health = _health(loaded={MODEL: 5800})
        self.available_mb = 900
        verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
        assert verdict is not None
        self.assertTrue(verdict.loaded_already)
        self.assertFalse(verdict.short)

    def test_a_reported_size_bigger_than_the_estimate_wins(self) -> None:
        self.health = _health(loaded={MODEL: 7000})
        guard.check_memory_for_model(f"http://{DECK}", MODEL)  # remembers 7,000 MB
        self.health = _health()  # unloaded since
        self.available_mb = 9000
        verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
        assert verdict is not None
        self.assertEqual(verdict.needed_mb, 7000)
        self.assertEqual(verdict.need_from, "loaded size seen earlier")
        self.assertFalse(verdict.short)  # 9,000 - 7,000 = 2,000: exactly the limit, not under it

    def test_a_reported_size_smaller_than_the_estimate_loses_to_it(self) -> None:
        """The Deck's own reading: Ollama said 2.3 GB loaded, the Deck's memory fell by about 5.9 GB."""
        self.health = _health(installed_mb=DECK_INSTALLED_MB, loaded={MODEL: DECK_REPORTED_MB})
        guard.check_memory_for_model(f"http://{DECK}", MODEL)  # Ollama reports 2,189 MB; remembered
        self.health = _health(installed_mb=DECK_INSTALLED_MB)  # unloaded since
        self.available_mb = DECK_GOD_OF_WAR_MB
        verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
        assert verdict is not None
        self.assertEqual(verdict.needed_mb, round(DECK_INSTALLED_MB * guard.LOAD_SIZE_FACTOR))
        self.assertEqual(verdict.need_from, f"installed size x {guard.LOAD_SIZE_FACTOR}")
        self.assertTrue(verdict.short)

    def test_the_decks_numbers_god_of_war_warns_and_drg_survivor_does_not(self) -> None:
        """Plan 104 block D0a, 2026-11-15 (plan104-P104-M-MEMORY-try2.json): free memory with each game running."""
        self.health = _health(installed_mb=DECK_INSTALLED_MB)
        for game, available, short in (
            ("God of War", DECK_GOD_OF_WAR_MB, True),
            ("Deep Rock Galactic: Survivor", DECK_DRG_SURVIVOR_MB, False),
        ):
            self.available_mb = available
            verdict = guard.check_memory_for_model(f"http://{DECK}", MODEL)
            assert verdict is not None
            self.assertGreaterEqual(verdict.needed_mb, 5800, game)
            self.assertEqual(verdict.short, short, f"{game}: {available} MB free, need {verdict.needed_mb}")

    def test_the_ai_on_a_pc_is_never_checked(self) -> None:
        with patch.object(guard, "read_available_mb", side_effect=AssertionError("must not read memory")):
            self.assertIsNone(guard.check_memory_for_model("http://192.168.1.20:11434", MODEL))

    def test_an_unreadable_meminfo_never_warns(self) -> None:
        self.available_mb = None
        self.assertIsNone(guard.check_memory_for_model(f"http://{DECK}", MODEL))

    def test_a_silent_ollama_never_warns(self) -> None:
        self.health = OSError("connection refused")
        self.assertIsNone(guard.check_memory_for_model(f"http://{DECK}", MODEL))

    def test_a_model_with_no_installed_size_never_warns(self) -> None:
        self.health = {"version": "0", "models": [], "model_sizes": {}, "ps_loaded": []}
        self.assertIsNone(guard.check_memory_for_model(f"http://{DECK}", MODEL))

    def test_the_test_switch_raises_the_limit_and_off_by_default_changes_nothing(self) -> None:
        self.available_mb = 12000
        self.assertEqual(guard.memory_limit_mb(), guard.MEMORY_LIMIT_MB)
        self.assertFalse(guard.check_memory_for_model(f"http://{DECK}", MODEL).short)  # type: ignore[union-attr]
        os.environ[guard.MEMORY_LIMIT_ENV] = "11000"
        self.assertEqual(guard.memory_limit_mb(), 11000)
        self.assertTrue(guard.check_memory_for_model(f"http://{DECK}", MODEL).short)  # type: ignore[union-attr]

    def test_nonsense_in_the_test_switch_is_ignored(self) -> None:
        for bad in ("", "abc", "-5", "0", "99999999"):
            os.environ[guard.MEMORY_LIMIT_ENV] = bad
            self.assertEqual(guard.memory_limit_mb(), guard.MEMORY_LIMIT_MB, bad)

    def test_the_test_switch_can_be_a_file_in_the_settings_folder(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(guard.memory_limit_mb(folder), guard.MEMORY_LIMIT_MB)
            Path(folder, guard.MEMORY_LIMIT_FILE).write_text("11000\n", encoding="utf-8")
            self.assertEqual(guard.memory_limit_mb(folder), 11000)


class MeminfoTests(unittest.TestCase):
    def test_meminfo_is_read_as_available_not_free(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder, "meminfo")
            path.write_text("MemTotal: 16000000 kB\nMemFree: 100000 kB\nMemAvailable: 3584000 kB\n")
            self.assertEqual(guard.read_available_mb(str(path)), 3500)
            path.write_text("MemTotal: 1 kB\n")
            self.assertIsNone(guard.read_available_mb(str(path)))
            self.assertIsNone(guard.read_available_mb(str(Path(folder, "nope"))))


class ArmedMarkTests(unittest.TestCase):
    def setUp(self) -> None:
        guard.reset_for_tests()
        self.addCleanup(guard.reset_for_tests)

    def test_armed_lasts_sixty_seconds_and_is_used_up_by_the_next_ask(self) -> None:
        guard.arm_ask_anyway(now=100.0)
        self.assertTrue(guard.consume_ask_anyway(now=130.0))
        self.assertFalse(guard.consume_ask_anyway(now=131.0))

    def test_an_old_mark_has_lapsed(self) -> None:
        guard.arm_ask_anyway(now=100.0)
        self.assertFalse(guard.consume_ask_anyway(now=100.0 + guard.ASK_ANYWAY_SECONDS + 1))

    def test_nothing_armed_means_not_armed(self) -> None:
        self.assertFalse(guard.consume_ask_anyway(now=1.0))

    def test_a_mark_armed_before_a_sleep_has_expired_when_the_deck_wakes(self) -> None:
        """The clock keeps counting while the Deck sleeps, so an unused mark cannot look fresh after a long sleep."""
        clock = iter([1000.0, 1000.0 + 8 * 3600])  # armed, then the first ask after eight hours of sleep
        with patch.object(guard, "_now", side_effect=lambda: next(clock)):
            guard.arm_ask_anyway()
            self.assertFalse(guard.consume_ask_anyway())

    def test_the_clock_is_the_one_that_counts_sleep_and_falls_back_to_wall_time(self) -> None:
        with patch.object(time, "clock_gettime", create=True, side_effect=lambda which: 42.5 if which == 7 else -1.0),                 patch.object(time, "CLOCK_BOOTTIME", 7, create=True):
            self.assertEqual(guard._now(), 42.5)
        with patch.object(time, "clock_gettime", create=True, side_effect=OSError("no such clock")),                 patch.object(time, "CLOCK_BOOTTIME", 7, create=True), patch.object(time, "time", return_value=9.0):
            self.assertEqual(guard._now(), 9.0)
        with patch.object(time, "clock_gettime", create=True, side_effect=AttributeError("none")),                 patch.object(time, "time", return_value=11.0):
            self.assertEqual(guard._now(), 11.0)


class ArmMethodTests(unittest.IsolatedAsyncioTestCase):
    async def test_the_plugin_method_the_row_calls_arms_the_one_shot(self) -> None:
        guard.reset_for_tests()
        self.addCleanup(guard.reset_for_tests)
        from main import Plugin

        self.assertFalse(guard.consume_ask_anyway())
        await Plugin().arm_ollama_ask_anyway()
        self.assertTrue(guard.consume_ask_anyway())
        self.assertFalse(guard.consume_ask_anyway())


class WarningWordsTests(unittest.TestCase):
    def test_the_screens_opening_words_match_the_back_end(self) -> None:
        """The "Ask anyway" row finds the warning by its opening; the two must not drift."""
        ts = (Path(__file__).resolve().parent.parent / "src" / "features" / "answer" / "transcript"
              / "lowMemoryNotice.ts").read_text(encoding="utf-8")
        found = re.search(r'LOW_MEMORY_MESSAGE_START\s*=\s*"([^"]+)"', ts)
        self.assertIsNotNone(found)
        self.assertEqual(found.group(1), guard.LOW_MEMORY_MESSAGE_START)  # type: ignore[union-attr]

    def test_the_warning_says_what_is_free_what_is_needed_what_helps_and_the_risk(self) -> None:
        verdict = guard.MemoryVerdict(
            short=True, available_mb=3500, needed_mb=5800, left_mb=-2300, limit_mb=2000, model=MODEL,
            loaded_already=False, need_from="installed size x 1.42",
        )
        text = guard.low_memory_message(verdict)
        self.assertTrue(text.startswith(guard.LOW_MEMORY_MESSAGE_START))
        for part in ("3,500 MB", "5,800 MB", "close the game", "smaller model", "Ollama tab", "on a PC", "freeze"):
            self.assertIn(part, text)


class AskLevelTests(_Standins, unittest.IsolatedAsyncioTestCase):
    """Through the real ``run_ask_ollama``: what the Deck check looks at."""

    async def _ask(self, pc_ip: str = DECK) -> tuple[dict[str, Any], list[str]]:
        model_calls: list[str] = []

        def fake_post(url: str, model_name: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
            model_calls.append(model_name)
            return {"success": True, "status": 200, "model": model_name, "response": "ok", "assistant_raw": "ok"}

        with (
            patch("backend.ask.ollama_ask_service.list_installed_ollama_tags", return_value=[MODEL]),
            patch("backend.ask.ollama_ask_service.probe_ollama_http_ok", return_value=True),
            patch("backend.media.screenshot_media.prepare_attachment_images", return_value=([], [], [])),
            patch("backend.ask.ollama_ask_service.post_ollama_chat", side_effect=fake_post),
            patch("backend.chats.chat_memory_step.choose_window_tokens", return_value=4096),
        ):
            out = await run_ask_ollama(_FakePlugin(), "hello", pc_ip, "", "", request_timeout_seconds=30)
        return out, model_calls

    async def test_short_and_not_loaded_warns_and_calls_no_model(self) -> None:
        out, calls = await self._ask()
        self.assertFalse(out["success"])
        self.assertTrue(str(out["response"]).startswith(guard.LOW_MEMORY_MESSAGE_START))
        self.assertEqual(calls, [])
        self.assertIsNone(out["model_policy_disclosure"])
        check = out["ask_diagnostics"]["memory_check"]
        self.assertEqual((check["available_mb"], check["short"]), (3500, True))
        self.assertIn("elapsed_seconds", out["ask_diagnostics"])  # the warning ends the turn like the other early returns

    async def test_already_loaded_answers(self) -> None:
        self.health = _health(loaded={MODEL: 5800})
        self.available_mb = 900
        out, calls = await self._ask()
        self.assertTrue(out["success"])
        self.assertEqual(calls, [MODEL])

    async def test_plenty_of_memory_answers(self) -> None:
        self.available_mb = 12000
        out, calls = await self._ask()
        self.assertTrue(out["success"])
        self.assertEqual(calls, [MODEL])
        self.assertFalse(out["ask_diagnostics"]["memory_check"]["short"])

    async def test_ask_anyway_answers_once_and_the_next_ask_warns_again(self) -> None:
        guard.arm_ask_anyway()
        first, first_calls = await self._ask()
        self.assertTrue(first["success"])
        self.assertEqual(first_calls, [MODEL])
        self.assertTrue(first["ask_diagnostics"]["memory_check"]["asked_anyway"])
        second, second_calls = await self._ask()
        self.assertFalse(second["success"])
        self.assertEqual(second_calls, [])

    async def test_the_ai_on_a_pc_is_never_checked(self) -> None:
        with patch.object(guard, "read_available_mb", side_effect=AssertionError("must not read memory")):
            out, _calls = await self._ask("192.168.1.20:11434")
        self.assertTrue(out["success"])
        self.assertNotIn("memory_check", out["ask_diagnostics"])

    async def test_an_unreadable_meminfo_never_blocks_an_answer(self) -> None:
        self.available_mb = None
        out, calls = await self._ask()
        self.assertTrue(out["success"])
        self.assertEqual(calls, [MODEL])


class SumUpButtonTests(ChatSlotJobTestCase):
    """The Sum up this chat button: with the Deck short on memory its job refuses and starts nothing."""

    def _short(self, short: Optional[bool]) -> Any:
        verdict = None if short is None else guard.MemoryVerdict(
            short=short, available_mb=3500, needed_mb=5800, left_mb=-2300, limit_mb=2000, model="test-model",
            loaded_already=False, need_from="installed size x 1.42",
        )
        guard.reset_for_tests()
        self.addCleanup(guard.reset_for_tests)
        written: list[int] = []

        async def _write(*_a: Any, **_k: Any) -> SummaryOutcome:
            written.append(1)
            return SummaryOutcome(status="failed", summary=None, seconds=0.0, error="stub")

        for target in (
            patch.object(guard, "check_memory_for_model", return_value=verdict),
            patch("backend.chats.chat_sum_up_job.write_chat_summary", _write),
            patch("backend.chats.chat_sum_up_job._pick_model_and_window", return_value=_FIXED_MODEL_AND_WINDOW),
            patch.object(type(self.plugin), "load_settings", return_value={}),
        ):
            target.start()
            self.addCleanup(target.stop)
        return written

    async def test_short_memory_refuses_with_low_memory_and_starts_no_job(self) -> None:
        written = self._short(True)
        result = await self.plugin.sum_up_chat_slot(_seed_chat(self.tmp, turns=60))
        self.assertEqual(result, {"accepted": False, "status": "low_memory"})
        self.assertIsNone(self.plugin._background_task)
        self.assertEqual(written, [])

    async def test_enough_memory_starts_the_job_as_before(self) -> None:
        self._short(False)
        result = await self.plugin.sum_up_chat_slot(_seed_chat(self.tmp, turns=60))
        self.assertTrue(result["accepted"])
        await self.plugin._background_task

    async def test_a_check_that_cannot_tell_never_refuses(self) -> None:
        self._short(None)
        result = await self.plugin.sum_up_chat_slot(_seed_chat(self.tmp, turns=60))
        self.assertTrue(result["accepted"])
        await self.plugin._background_task

    async def test_a_chat_with_nothing_to_sum_up_still_says_so_when_memory_is_short(self) -> None:
        self._short(True)
        result = await self.plugin.sum_up_chat_slot(_seed_chat(self.tmp, turns=1))
        self.assertEqual(result, {"accepted": False, "status": "nothing_to_do"})


if __name__ == "__main__":
    sys.exit(unittest.main())
