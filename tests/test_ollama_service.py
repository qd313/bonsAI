import json
import unittest
from unittest.mock import MagicMock, patch

from backend.services.ollama_service import (
    append_deck_tdp_sysfs_grounding,
    build_system_prompt,
    format_ai_response,
    post_ollama_chat,
    request_ollama_stop_model_via_api,
    user_asks_ollama_bonsai_host_or_latency,
    user_wants_power_or_performance_topic,
)


class OllamaServiceTests(unittest.TestCase):
    """Service tests for prompt construction and response formatting contracts."""

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_request_ollama_stop_model_via_api_posts_keep_alive_zero(
        self, mock_urlopen: MagicMock
    ) -> None:
        """Emergency stop uses /api/generate keep_alive 0 — same unload contract as CLI ollama stop."""

        class _Rsp:
            def read(self, n: int = -1):
                return b"{}"

            def __enter__(self):
                return self

            def __exit__(self, *a):
                pass

        mock_urlopen.return_value = _Rsp()
        lg = MagicMock()
        ok = request_ollama_stop_model_via_api("http://127.0.0.1:11434", "llama3:test", lg, timeout_seconds=10.0)
        self.assertTrue(ok)
        self.assertGreaterEqual(mock_urlopen.call_count, 1)
        req_first = mock_urlopen.call_args[0][0]
        self.assertIn("/api/generate", req_first.full_url)

    @patch("backend.services.ollama_service.urllib.request.urlopen")
    def test_post_ollama_chat_streams_ndjson_deltas(
        self, mock_urlopen: MagicMock
    ) -> None:
        """stream:true emits NDJSON lines; deltas aggregate to the same assistant text as buffered JSON."""
        body = (
            "\n".join(
                [
                    '{"message":{"role":"assistant","content":"Hell"}}',
                    '{"message":{"role":"assistant","content":"o"},"done":true}',
                ]
            )
            + "\n"
        ).encode("utf-8")

        idx = {"i": 0}

        class _Rsp:
            def read(self, n: int):
                chunk = body[idx["i"] : idx["i"] + n]
                idx["i"] += len(chunk)
                return chunk

            def close(self) -> None:
                pass

            def __enter__(self):
                return self

            def __exit__(self, *_):
                pass

        mock_urlopen.return_value = _Rsp()
        lg = MagicMock()
        out = post_ollama_chat(
            "http://127.0.0.1:11434/api/chat",
            "vision:test",
            [{"role": "system", "content": "x"}],
            60,
            [],
            [],
            [],
            [],
            lg,
            "speed",
            "5m",
            cancel_requested=lambda: False,
        )
        req = mock_urlopen.call_args[0][0]
        self.assertTrue(json.loads(req.data.decode("utf-8")).get("stream"))
        self.assertTrue(out.get("success"))
        self.assertEqual(out.get("assistant_raw"), "Hello")

    def test_format_ai_response_appends_attachment_metadata(self):
        """Confirm attachment debug and error blocks are appended for UI diagnostics."""
        output = format_ai_response(
            "Base response",
            normalized_attachments=[{"path": "/tmp/a.png"}],
            prepared_images=[{"image_b64": "abc"}],
            attachment_errors=["too large"],
        )
        self.assertIn("[AttachDebug: requested=1, prepared=1, errors=1]", output)
        self.assertIn("[Attachment errors: too large]", output)

    def test_build_system_prompt_includes_game_and_attachment_context(self):
        """Ensure generated system prompts include game, attachment, and policy context lines."""
        def lookup_app_name(app_id: str) -> str:
            return "Test Game" if app_id == "123" else ""

        def lookup_vdf(_path: str) -> dict:
            return {"caption": "boss room", "shortcut_name": "Shortcut Name"}

        prompt = build_system_prompt(
            question="How do I beat this boss?",
            app_id="123",
            app_name="Game Name",
            normalized_attachments=[{"path": "/tmp/a.png", "app_id": "123"}],
            prepared_images=[{"image_b64": "abc"}],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("The currently running game is: Game Name (AppID: 123).", prompt)
        self.assertIn("Resolved game-title hints from attachment AppIDs: 123=Test Game.", prompt)
        self.assertIn("Visual context attachments provided: 1.", prompt)
        self.assertIn("Your primary expertise is Steam Deck", prompt)
        self.assertIn("Hardware appendix (apply only when relevant)", prompt)
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        self.assertNotIn("STRATEGY GUIDE MODE", prompt)
        self.assertIn("RULE: Ship of Harkinian (SoH)", prompt)
        i_dyn = prompt.index("The currently running game is:")
        i_gp = prompt.index("Your primary expertise is Steam Deck")
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_dyn, i_gp)
        self.assertLess(i_gp, i_hw)

    def test_build_system_prompt_speed_includes_qam_sweet_spot_line(self):
        """Efficiency / sweet spot questions get QAM Performance lever instructions."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What's the efficiency sweet spot for this game?",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DECK TUNING (efficiency / sweet spot)", prompt)
        self.assertIn("Quick Access", prompt)
        self.assertIn("Framerate limit", prompt)

    def test_build_system_prompt_strategy_first_turn(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Stuck in the Water Temple",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("STRATEGY GUIDE MODE (active — first turn)", prompt)
        self.assertIn("bonsai-strategy-branches", prompt)
        self.assertIn("DECK POWER / TDP (strategy first turn)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_mode = prompt.index("STRATEGY GUIDE MODE (active — first turn)")
        i_deck = prompt.index("DECK POWER / TDP (strategy first turn)")
        self.assertLess(i_mode, i_deck)

    def test_build_system_prompt_strategy_followup_turn(self):
        from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question=f"{STRATEGY_FOLLOWUP_PREFIX} I'm at: mid.",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("STRATEGY GUIDE MODE (active — follow-up turn)", prompt)
        self.assertIn("If you want to cheat", prompt)
        self.assertIn("CONCRETE solo-player examples", prompt)
        self.assertIn("Do NOT output a", prompt)
        self.assertIn("DECK POWER / TDP (strategy follow-up)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)

    def test_build_system_prompt_strategy_first_turn_includes_tdp_when_power_asked(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Stuck in the Water Temple — what TDP should I use?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("TDP JSON ON THIS FIRST STRATEGY TURN", prompt)
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_strat = prompt.index("STRATEGY GUIDE MODE (active — first turn)")
        i_first_json = prompt.index("TDP JSON ON THIS FIRST STRATEGY TURN")
        i_hw = prompt.index("IMPORTANT: When you recommend or apply a TDP or GPU clock change")
        self.assertLess(i_strat, i_first_json)
        self.assertLess(i_first_json, i_hw)

    def test_build_system_prompt_strategy_followup_includes_tdp_when_power_asked(self):
        from backend.services.strategy_guide_parse import STRATEGY_FOLLOWUP_PREFIX

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question=f"{STRATEGY_FOLLOWUP_PREFIX} Also cap my TDP at 9W.",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_cheat = prompt.index("If you want to cheat")
        i_hw = prompt.index("IMPORTANT: When you recommend or apply a TDP or GPU clock change")
        self.assertLess(i_cheat, i_hw)

    def test_build_system_prompt_speed_includes_triple_resolution_for_fps_preset(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What are the best settings for 60fps?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DISPLAY TARGETS (Speed mode)", prompt)
        self.assertIn("1280×800", prompt)
        self.assertIn("1080p", prompt)
        self.assertIn("4K", prompt)

    def test_build_system_prompt_strategy_fps_asks_resolution_first(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What are the best settings for 60fps?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("DISPLAY TARGETS (Strategy mode)", prompt)
        self.assertIn("exactly four", prompt)
        self.assertIn('"d"', prompt)
        self.assertIn("1280×800", prompt)
        self.assertIn("1080p", prompt)
        self.assertIn("4K", prompt)

    def test_build_system_prompt_deep_includes_triple_resolution_then_followup(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="What GPU clock should I use?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="deep",
        )
        self.assertIn("DISPLAY TARGETS (Expert / Deep mode)", prompt)
        self.assertIn("(1) 1280×800 (2) 1080p (3) 4K (4) Enter your own", prompt)

    def test_build_system_prompt_includes_deck_troubleshoot_game_gotchas_with_title(self):
        """Compatibility / crash / Proton style presets get game-specific Deck community-guidance when a title is known."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Why is my game crashing?",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("DECK TROUBLESHOOTING (game in focus)", prompt)
        self.assertIn("cannot run a web browser", prompt)
        self.assertIn("ProtonDB", prompt)
        i_game = prompt.index("The currently running game is:")
        i_trouble = prompt.index("DECK TROUBLESHOOTING (game in focus)")
        i_appendix = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_game, i_trouble)
        self.assertLess(i_trouble, i_appendix)

    def test_build_system_prompt_omits_deck_troubleshoot_gotchas_without_game_name(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Why is my game crashing?",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertNotIn("DECK TROUBLESHOOTING (game in focus)", prompt)

    def test_build_system_prompt_slow_ollama_uses_host_setup_not_deck_performance(self):
        """Preset / paraphrases about Ollama latency get bonsAI Connection guidance, not QAM/TDP focus."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Diagnose a slow Ollama response",
            app_id="123",
            app_name="Deep Rock Galactic: Survivor",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("OLLAMA / bonsAI (host & inference)", prompt)
        self.assertIn("Settings → Connection", prompt)
        self.assertIn("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**", prompt)
        self.assertNotIn("DECK TROUBLESHOOTING (game in focus)", prompt)
        self.assertNotIn("IMPORTANT: When you recommend or apply a TDP or GPU clock change", prompt)
        i_ollama = prompt.index("OLLAMA / bonsAI (host & inference)")
        i_skip = prompt.index("Hardware appendix (Deck TDP/GPU JSON): **Skipped for this topic**")
        self.assertLess(i_ollama, i_skip)

    def test_build_system_prompt_early_context_suffix_before_hardware_appendix(self):
        """Proton-style excerpts splice after identity and before the TDP/JSON tail."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        marker = "SYNTHETIC_PROTON_EXCERPT_FOR_ORDER_TEST"
        prompt = build_system_prompt(
            question="Hello",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
            early_context_suffix=marker,
        )
        i_id = prompt.index("You are bonsAI")
        i_mark = prompt.index(marker)
        i_hw = prompt.index("Hardware appendix (apply only when relevant)")
        self.assertLess(i_id, i_mark)
        self.assertLess(i_mark, i_hw)

    def test_build_system_prompt_includes_model_policy_tiers_explainer(self):
        """Chip / paraphrases about Model policy get tier + FOSS vs open-weight vs proprietary guidance."""

        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Explain the model policy tiers",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="speed",
        )
        self.assertIn("MODEL POLICY TIERS (bonsAI)", prompt)
        self.assertIn("Tier 1", prompt)
        self.assertIn("open-weight", prompt)
        self.assertIn("Strategy Guide mode", prompt)

    def test_build_system_prompt_model_policy_explainer_in_strategy_allows_normal_reply(self):
        def lookup_app_name(_app_id: str) -> str:
            return ""

        def lookup_vdf(_path: str) -> dict:
            return {}

        prompt = build_system_prompt(
            question="Explain the model policy tiers",
            app_id="",
            app_name="",
            normalized_attachments=[],
            prepared_images=[],
            lookup_app_name=lookup_app_name,
            lookup_screenshot_vdf_metadata=lookup_vdf,
            ask_mode="strategy",
        )
        self.assertIn("MODEL POLICY TIERS (bonsAI)", prompt)
        self.assertIn("```bonsai-strategy-branches```", prompt)
        self.assertIn("normal explanation", prompt)

    def test_append_deck_tdp_sysfs_grounding_noop(self):
        self.assertEqual(
            append_deck_tdp_sysfs_grounding("base", grounding_requested=False),
            "base",
        )

    def test_append_deck_tdp_sysfs_grounding_read_tdp(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=True, cap_w=7, grounding_requested=True)
        self.assertTrue(out.startswith("sys"))
        self.assertIn("7W", out)
        self.assertIn("ON-DEVICE TDP", out)
        self.assertIn("usual voice", out)

    def test_append_deck_tdp_sysfs_grounding_tuning(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=False, cap_w=12, grounding_requested=True)
        self.assertIn("12W", out)
        self.assertIn("baseline", out)

    def test_append_deck_tdp_sysfs_grounding_unavailable(self):
        out = append_deck_tdp_sysfs_grounding("sys", read_tdp=False, cap_w=None, grounding_requested=True)
        self.assertIn("could not be read", out)

    def test_user_asks_ollama_host_detects_latency_diagnose(self):
        self.assertTrue(user_asks_ollama_bonsai_host_or_latency("Diagnose a slow Ollama response"))

    def test_fps_wants_power_not_ollama_host(self):
        self.assertTrue(user_wants_power_or_performance_topic("What is my fps?"))
        self.assertFalse(user_asks_ollama_bonsai_host_or_latency("What is my fps?"))


if __name__ == "__main__":
    unittest.main()
