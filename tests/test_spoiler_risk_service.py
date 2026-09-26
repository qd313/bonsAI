import unittest

from backend.services.spoiler_risk_service import (
    build_spoiler_risk_signals,
    compute_heuristic_spoiler_risk_score,
    compute_spoiler_risk_band,
    extract_kb_section_types_from_text,
    parse_bonsai_spoiler_risk_tag,
    spoiler_risk_chip_label,
    spoiler_risk_signals_from_snapshot,
)
from backend.services.transparency_service import build_context_chips_manifest


class SpoilerRiskServiceTests(unittest.TestCase):
    def test_chip_label_length(self):
        for band in ("low", "med", "high"):
            label = spoiler_risk_chip_label(band)  # type: ignore[arg-type]
            self.assertLessEqual(len(label), 18)
            self.assertEqual(label, f"Spoiler risk: {band}")

    def test_parse_closed_model_tag(self):
        self.assertEqual(
            parse_bonsai_spoiler_risk_tag("Intro <bonsai-spoiler-risk>high</bonsai-spoiler-risk> done"),
            "high",
        )
        self.assertEqual(
            parse_bonsai_spoiler_risk_tag("<bonsai-spoiler-risk>medium</bonsai-spoiler-risk>"),
            "med",
        )

    def test_incomplete_model_tag_ignored(self):
        self.assertIsNone(parse_bonsai_spoiler_risk_tag("Still streaming <bonsai-spoiler-risk>med"))

    def test_low_narrative_profile_scores_low(self):
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="2321470",
            question="How do I beat Glyphid Dreadnought?",
            game_genres="Action Roguelike",
            kb_text="",
            asked_entity="Glyphid Dreadnought",
            title_profile="low_narrative",
        )
        band = compute_spoiler_risk_band(signals)
        self.assertEqual(band, "low")

    def test_hades_roguelike_genres_do_not_score_low(self):
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="1145360",
            question="Where should I go next?",
            game_genres="Roguelike, Action RPG",
            kb_text="",
            asked_entity="",
            title_profile="protect_progression",
        )
        band = compute_spoiler_risk_band(signals)
        self.assertIn(band, ("med", "high"))

    def test_story_strategy_without_entity_scores_higher(self):
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="1145360",
            question="Where should I go next?",
            game_genres="Adventure, Story Rich",
            kb_text="\n[Game / quest: Temple of Time]\nWalk north.",
        )
        band = compute_spoiler_risk_band(signals)
        self.assertIn(band, ("med", "high"))
        self.assertGreater(compute_heuristic_spoiler_risk_score(signals), 50.0)

    def test_model_tag_blends_with_heuristic(self):
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="1145360",
            question="Where should I go next?",
            game_genres="Adventure, Story Rich",
        )
        heuristic_band = compute_spoiler_risk_band(signals)
        blended = compute_spoiler_risk_band(
            signals,
            assistant_text="<bonsai-spoiler-risk>low</bonsai-spoiler-risk>",
        )
        self.assertEqual(heuristic_band, "high")
        self.assertEqual(blended, "med")

    def test_starting_out_notes_score_lower_than_a_boss_note(self):
        """D65: a "starting out" card is onboarding, not a spoiler -- it belongs in the same

        low-risk bucket as `mechanic`/`tip`/`compat`, not left out of both sets where it would
        score the same as a card whose kind nobody has classified at all."""
        base = dict(
            ask_mode="strategy",
            app_id="1547000",
            question="How do I get started?",
            game_genres="Action",
            asked_entity="",
        )
        boss_signals = build_spoiler_risk_signals(
            kb_text="\n[Grand Theft Auto V / boss: Big Smoke]\nWeak point.", **base
        )
        starting_out_signals = build_spoiler_risk_signals(
            kb_text="\n[Grand Theft Auto V / starting_out: Starting out in GTA V]\nGet a car.",
            **base,
        )
        self.assertLess(
            compute_heuristic_spoiler_risk_score(starting_out_signals),
            compute_heuristic_spoiler_risk_score(boss_signals),
        )

    def test_troubleshooting_with_no_game_scores_low_not_med(self):
        """SPOILER-RISK-CHIP-01: every reply showed "Spoiler risk: med" tonight, including a
        troubleshooting question asked with no game running. With no game and no notes there
        was no real signal behind that "med" at all -- the Ask mode's flat bump alone put it
        there. A troubleshooting question is not about game content, so it must not inherit
        that bump."""
        signals = build_spoiler_risk_signals(
            ask_mode="speed",
            app_id="",
            question="My game keeps crashing after I resume from sleep, black screen on the Deck",
            game_genres="",
            kb_text="",
        )
        self.assertTrue(signals["is_troubleshooting"])
        band = compute_spoiler_risk_band(signals)
        self.assertEqual(band, "low")

    def test_low_story_game_still_scores_low(self):
        """A game the profile table already knows has little story to spoil stays low, same
        as before this fix -- the troubleshooting change must not touch this path."""
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="2321470",
            question="How do I beat the Glyphid Dreadnought?",
            game_genres="Action Roguelike",
            title_profile="low_narrative",
        )
        self.assertFalse(signals["is_troubleshooting"])
        self.assertEqual(compute_spoiler_risk_band(signals), "low")

    def test_boss_note_on_a_story_game_scores_high(self):
        """A real signal -- a boss card attached for a story-protective title -- must still
        drive the band up to high; the troubleshooting change only touches the no-signal case."""
        signals = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="1145360",
            question="How do I beat the final boss?",
            game_genres="Adventure, Story Rich",
            kb_text="\n[Hades / boss: Hades]\nWeak point is the dash-strike window.",
            title_profile="protect_progression",
        )
        self.assertFalse(signals["is_troubleshooting"])
        self.assertEqual(compute_spoiler_risk_band(signals), "high")

    def test_extract_kb_section_types(self):
        kb = "\n[Zelda / boss: Ganon]\nTips\n\n[Zelda / area: Temple]\nGo east."
        self.assertEqual(extract_kb_section_types_from_text(kb), ["boss", "area"])

    def test_manifest_includes_spoiler_risk_chip(self):
        snapshot = {
            "ask_mode": "speed",
            "app_id": "550",
            "raw_question": "tips for the tank",
            "text_after_sanitizer": "tips for the tank",
            "spoiler_risk_signals": build_spoiler_risk_signals(
                ask_mode="speed",
                app_id="550",
                question="tips for the tank",
                game_genres="Action",
            ),
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
        manifest = build_context_chips_manifest(snapshot=snapshot)
        chip = next(c for c in manifest["context_chips"] if c["id"] == "spoiler_risk")
        self.assertTrue(chip["label"].startswith("Spoiler risk: "))
        self.assertIn("Transparency only", chip["body"]["bullets"][-1])

    def test_snapshot_rebuild_prefers_nested_signals(self):
        nested = build_spoiler_risk_signals(
            ask_mode="strategy",
            app_id="1145360",
            question="Where should I go next?",
            title_profile="protect_progression",
        )
        rebuilt = spoiler_risk_signals_from_snapshot(
            {"spoiler_risk_signals": nested, "app_id": "2321470"}
        )
        self.assertEqual(rebuilt, nested)
        self.assertEqual(rebuilt["title_profile"], "protect_progression")

    def test_snapshot_rebuild_recovers_profile_from_app_id(self):
        signals = spoiler_risk_signals_from_snapshot(
            {
                "ask_mode": "strategy",
                "app_id": "1145360",
                "app_name": "Hades",
                "raw_question": "Where should I go next?",
            }
        )
        self.assertEqual(signals["title_profile"], "protect_progression")

    def test_snapshot_rebuild_recovers_profile_from_app_name(self):
        """Without app_name the title-name fallback is lost and the band reads too high."""
        signals = spoiler_risk_signals_from_snapshot(
            {
                "ask_mode": "strategy",
                "app_id": "",
                "app_name": "State of Emergency",
                "raw_question": "How do I clear the mall?",
            }
        )
        self.assertEqual(signals["title_profile"], "low_narrative")
        self.assertEqual(compute_spoiler_risk_band(signals), "low")


if __name__ == "__main__":
    unittest.main()
