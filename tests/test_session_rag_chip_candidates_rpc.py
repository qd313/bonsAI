"""get_session_rag_chip_candidates must serialize the KB result and never reject the caller."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from backend_module_stubs import install_fcntl_and_decky_stubs

install_fcntl_and_decky_stubs()

import main  # noqa: E402
from backend.services.knowledge_base_service import (  # noqa: E402
    SessionRagChipCandidate,
    SessionRagChipCandidatesResult,
)
from main import Plugin  # noqa: E402


class SessionRagChipCandidatesRpcTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.settings_path = os.path.join(self.tmp.name, "settings.json")
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump({"use_local_knowledge_base": True}, f)

        self.plugin = Plugin()
        patcher = patch.object(Plugin, "_settings_path", return_value=self.settings_path)
        self.addCleanup(patcher.stop)
        patcher.start()

        import decky

        decky.DECKY_PLUGIN_SETTINGS_DIR = self.tmp.name

    async def asyncTearDown(self) -> None:
        self.tmp.cleanup()

    async def test_kb_disabled_in_saved_settings_reports_kb_off(self) -> None:
        """Runs the real service, so it also proves saved settings reach it."""
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump({"use_local_knowledge_base": False}, f)

        out = await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock Galactic: Survivor")

        self.assertFalse(out["ok"])
        self.assertEqual(out["reason"], "kb_off")
        self.assertEqual(out["candidates"], [])

    async def test_game_identity_is_passed_through_stripped(self) -> None:
        captured: dict = {}

        def fake(settings, **kwargs):
            captured.update(kwargs)
            return SessionRagChipCandidatesResult(ok=True)

        with patch.object(main, "suggest_chip_candidates", side_effect=fake):
            await self.plugin.get_session_rag_chip_candidates("  2321470 ", " Deep Rock ", " DRG.sh ")

        self.assertEqual(captured["app_id"], "2321470")
        self.assertEqual(captured["app_name"], "Deep Rock")
        self.assertEqual(captured["shortcut_name"], "DRG.sh")

    async def test_missing_game_identity_defaults_to_empty_strings(self) -> None:
        captured: dict = {}

        def fake(settings, **kwargs):
            captured.update(kwargs)
            return SessionRagChipCandidatesResult(ok=True)

        with patch.object(main, "suggest_chip_candidates", side_effect=fake):
            await self.plugin.get_session_rag_chip_candidates()

        self.assertEqual(captured, {"app_id": "", "app_name": "", "shortcut_name": ""})

    async def test_candidates_are_serialized_for_rpc(self) -> None:
        result = SessionRagChipCandidatesResult(
            ok=True,
            candidates=[
                SessionRagChipCandidate(
                    text="Beat the Dreadnought",
                    category="strategy",
                    prefer_ask_mode="strategy",
                    domain="strategy",
                ),
                SessionRagChipCandidate(text="Proton stutter", category="troubleshooting", domain="compat"),
            ],
        )

        with patch.object(main, "suggest_chip_candidates", return_value=result):
            out = await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")

        self.assertTrue(out["ok"])
        self.assertEqual(
            out["candidates"][0],
            {
                "text": "Beat the Dreadnought",
                "category": "strategy",
                "prefer_ask_mode": "strategy",
                "domain": "strategy",
            },
        )
        # The frontend normalizer treats a null prefer_ask_mode as "no preference".
        self.assertIsNone(out["candidates"][1]["prefer_ask_mode"])

    async def test_unreadable_corpus_is_logged_once_per_fault(self) -> None:
        """The carousel retries after every Ask, so a repeated fault must not repeat the log."""
        broken = SessionRagChipCandidatesResult(ok=False, reason="corpus_error:database disk image is malformed")
        healthy = SessionRagChipCandidatesResult(ok=True, candidates=[])

        with patch.object(main, "logger") as log:
            with patch.object(main, "suggest_chip_candidates", return_value=broken):
                await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")
                await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")
            self.assertEqual(log.warning.call_count, 1)

            # Recovering and breaking again is a new fault and must be logged again.
            with patch.object(main, "suggest_chip_candidates", return_value=healthy):
                await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")
            with patch.object(main, "suggest_chip_candidates", return_value=broken):
                await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")
            self.assertEqual(log.warning.call_count, 2)

    async def test_empty_result_is_not_logged_as_a_fault(self) -> None:
        """A game with no KB content is normal, not a fault."""
        with patch.object(main, "logger") as log:
            with patch.object(
                main,
                "suggest_chip_candidates",
                return_value=SessionRagChipCandidatesResult(ok=False, reason="no_sections"),
            ):
                await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")

        log.warning.assert_not_called()

    async def test_corpus_error_returns_failure_instead_of_raising(self) -> None:
        """A raised exception would reject the RPC — the exact failure this feature shipped with."""
        with patch.object(main, "suggest_chip_candidates", side_effect=sqlite3.Error("corpus gone")):
            out = await self.plugin.get_session_rag_chip_candidates("2321470", "Deep Rock")

        self.assertFalse(out["ok"])
        self.assertEqual(out["reason"], "chip_candidates_failed")
        self.assertEqual(out["candidates"], [])


if __name__ == "__main__":
    unittest.main()
