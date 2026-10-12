import unittest

from backend.services.transparency_service import (
    build_context_chips_manifest,
    build_knowledge_base_transparency,
    build_ollama_route_snapshot,
    kb_coverage_chip_label,
    kb_retrieval_chip_label,
    kb_retrieval_detail_label,
)


class TransparencyKbRetrievalTests(unittest.TestCase):
    def test_kb_retrieval_labels(self):
        self.assertEqual(kb_retrieval_chip_label("hybrid"), "Keyword + meaning")
        self.assertEqual(kb_retrieval_chip_label("keyword"), "Keyword search")
        self.assertEqual(
            kb_retrieval_detail_label("keyword_embed_unavailable"),
            "Keyword search (embed unavailable)",
        )

    def test_hybrid_disabled_reads_differently_from_embed_unavailable(self):
        """Decision 5: a chosen setting must not read as a broken install.

        Someone who flipped the Developer toggle should not go looking for a missing Ollama
        model, so these two strings stay distinct.
        """
        disabled = kb_retrieval_detail_label("keyword_hybrid_disabled")
        unavailable = kb_retrieval_detail_label("keyword_embed_unavailable")
        self.assertEqual(disabled, "Keyword search (hybrid disabled)")
        self.assertNotEqual(disabled, unavailable)
        # The compact chip stays generic for every keyword variant.
        self.assertEqual(kb_retrieval_chip_label("keyword_hybrid_disabled"), "Keyword search")

    def test_compat_transparency_source_bullet(self):
        snapshot = {
            **build_knowledge_base_transparency(
                attached=True,
                trust_tier="fallback_no_source",
                sources=[],
                notes="compat_tips",
                timing_ms={},
                retrieval_method="hybrid",
                kb_domain="compat",
            ),
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
        manifest = build_context_chips_manifest(snapshot=snapshot)
        kb_chip = next(c for c in manifest["context_chips"] if c["id"] == "kb")
        self.assertIn("Source: shared troubleshooting tips", kb_chip["body"]["bullets"])

    def test_kb_chip_uses_retrieval_label(self):
        snapshot = {
            **build_knowledge_base_transparency(
                attached=True,
                trust_tier="wiki_verified",
                sources=[],
                notes="app_id:2321470",
                timing_ms={"embed_ms": 12.5, "rerank_ms": 0.4},
                retrieval_method="hybrid",
            ),
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
        manifest = build_context_chips_manifest(snapshot=snapshot)
        kb_chip = next(c for c in manifest["context_chips"] if c["id"] == "kb")
        self.assertEqual(kb_chip["label"], "Keyword + meaning")
        self.assertIn("Keyword + meaning", kb_chip["body"]["bullets"][0])

    def test_ollama_route_snapshot_propagates_kb_domain_for_compat_bullet(self):
        from backend.services.transparency_service import build_ollama_route_snapshot

        snapshot = build_ollama_route_snapshot(
            raw_question="proton crash",
            sanitizer_action="allow",
            sanitizer_reason_codes=[],
            text_after_sanitizer="proton crash",
            ollama_result={
                "model": "gemma4:e2b",
                "success": True,
                "response": "ok",
                **build_knowledge_base_transparency(
                    attached=True,
                    trust_tier="fallback_no_source",
                    sources=[],
                    notes="compat_tips",
                    timing_ms={"embed_ms": 10.0},
                    retrieval_method="hybrid",
                    kb_domain="compat",
                ),
            },
            base_response_text="ok",
            response_text="ok",
            applied=None,
            app_id="550",
            app_name="Left 4 Dead 2",
            pc_ip="127.0.0.1:11434",
            err_tail="",
            elapsed_seconds=1.0,
        )
        self.assertEqual(snapshot.get("kb_domain"), "compat")
        kb_chip = next(c for c in snapshot["context_chips"] if c["id"] == "kb")
        self.assertIn("Source: shared troubleshooting tips", kb_chip["body"]["bullets"])


class TransparencyKbCoverageTests(unittest.TestCase):
    def test_kb_coverage_chip_labels(self):
        self.assertEqual(kb_coverage_chip_label(status="kb_off"), "KB: off")
        self.assertEqual(kb_coverage_chip_label(status="corpus_missing"), "KB: no corpus")
        self.assertEqual(kb_coverage_chip_label(status="no_app"), "KB: no game running")
        self.assertEqual(
            kb_coverage_chip_label(status="no_sections"),
            "KB: none for this game",
        )
        self.assertEqual(
            kb_coverage_chip_label(status="app_unresolved"),
            "KB: none for this game",
        )
        self.assertEqual(kb_coverage_chip_label(status="sections", section_count=1), "KB: 1 section")
        self.assertEqual(kb_coverage_chip_label(status="sections", section_count=2), "KB: 2 sections")
        self.assertEqual(kb_coverage_chip_label(status="corpus_error"), "KB: unreadable")

    def test_kb_coverage_no_app_distinct_from_app_unresolved(self):
        """Decision: 'nothing running' and 'a game is running but unmatched' must not share a
        bullet -- the app_unresolved sentence says a game could not be matched, which is false
        when no game was running to match in the first place.
        """
        from backend.services.transparency_service import kb_coverage_detail_bullets

        no_app_bullets = kb_coverage_detail_bullets(status="no_app")
        unresolved_bullets = kb_coverage_detail_bullets(status="app_unresolved")
        self.assertNotEqual(no_app_bullets, unresolved_bullets)
        self.assertNotIn("Running game", no_app_bullets[0])
        self.assertIn("Running game", unresolved_bullets[0])

    def test_kb_coverage_chip_in_manifest(self):
        snapshot = {
            "kb_coverage_status": "sections",
            "kb_coverage_section_count": 2,
            "kb_coverage_reason": "",
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
        manifest = build_context_chips_manifest(snapshot=snapshot)
        chip = next(c for c in manifest["context_chips"] if c["id"] == "kb_coverage")
        self.assertEqual(chip["label"], "KB: 2 sections")
        self.assertTrue(chip["attached"])
        self.assertIn("2 strategy sections", chip["body"]["bullets"][0])

    def test_kb_coverage_distinct_from_kb_retrieval_chip(self):
        snapshot = {
            **build_knowledge_base_transparency(
                attached=True,
                trust_tier="wiki_verified",
                sources=["sections/1"],
                notes="app_id:2321470",
                timing_ms={},
                retrieval_method="hybrid",
            ),
            "kb_coverage_status": "sections",
            "kb_coverage_section_count": 2,
            "proton_log_excerpt_attached": False,
            "proton_log_sources": [],
            "proton_log_notes": "",
        }
        manifest = build_context_chips_manifest(snapshot=snapshot)
        ids = [c["id"] for c in manifest["context_chips"]]
        self.assertIn("kb", ids)
        self.assertIn("kb_coverage", ids)
        kb_chip = next(c for c in manifest["context_chips"] if c["id"] == "kb")
        coverage_chip = next(c for c in manifest["context_chips"] if c["id"] == "kb_coverage")
        self.assertEqual(kb_chip["label"], "Keyword + meaning")
        self.assertEqual(coverage_chip["label"], "KB: 2 sections")


class TransparencySnapshotForChatSlotTests(unittest.TestCase):
    """`transparency_snapshot_for_chat_slot` trims a full snapshot to what a persisted chat-slot
    turn needs -- see chat_slot_service.py's MAX_TURNS_PER_SLOT and SessionContextStrip.tsx,
    which only ever reads route/success/context_chips off an archived turn.
    """

    def test_keeps_only_the_session_strip_fields(self):
        from backend.services.transparency_service import transparency_snapshot_for_chat_slot

        full_snapshot = build_ollama_route_snapshot(
            raw_question="how do I beat this boss",
            sanitizer_action="allow",
            sanitizer_reason_codes=[],
            text_after_sanitizer="how do I beat this boss",
            ollama_result={
                "model": "gemma4:e2b",
                "success": True,
                "response": "answer text",
                "system_prompt": "a very long system prompt" * 50,
            },
            base_response_text="answer text",
            response_text="answer text",
            applied=None,
            app_id="550",
            app_name="Left 4 Dead 2",
            pc_ip="127.0.0.1:11434",
            err_tail="",
            elapsed_seconds=1.0,
        )
        trimmed = transparency_snapshot_for_chat_slot(full_snapshot)
        # user_notes_* (plan 92): which of the person's own notes went in, kept on a saved turn.
        self.assertEqual(
            set(trimmed.keys()),
            {"route", "success", "context_chips", "overflow_skips", "user_notes_attached", "user_notes_off_count"},
        )
        self.assertEqual(trimmed["route"], "ollama")
        self.assertTrue(trimmed["success"])
        self.assertTrue(trimmed["context_chips"])
        self.assertNotIn("system_prompt", trimmed)
        self.assertNotIn("raw_question", trimmed)

    def test_builds_chips_lazily_for_snapshots_that_defer_them(self):
        """Sanitizer-block / capability-denied / sanitizer-command snapshots do not populate
        context_chips at build time (they rely on ensure_context_chips_on_snapshot running at
        RPC-read time) -- the chat-slot trim must run that step itself so a persisted turn is not
        silently chip-less.
        """
        from backend.services.transparency_service import (
            build_sanitizer_block_snapshot,
            transparency_snapshot_for_chat_slot,
        )

        raw = build_sanitizer_block_snapshot(
            raw_question="blocked question",
            sanitizer_action="block",
            sanitizer_reason_codes=["r1"],
            text_after_sanitizer="blocked question",
            final_response="That request was blocked.",
            app_id="",
            app_name="",
            pc_ip="127.0.0.1:11434",
        )
        self.assertEqual(raw.get("context_chips"), None)
        trimmed = transparency_snapshot_for_chat_slot(raw)
        self.assertTrue(trimmed["context_chips"])


if __name__ == "__main__":
    unittest.main()
