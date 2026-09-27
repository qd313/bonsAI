"""Title: The screen waits longer for Update than the back end's check can take

Purpose: Update's manifest check tries each mirror in turn with its own time limit. If the
screen's deadline for that call is shorter than the worst case, the screen gives up while
the back end is still working -- on the Deck plan it said "Update failed" after 15 s while
the check could run for two minutes. This reads the screen's number out of the source and
compares it with the back end's own constants, so the two cannot drift apart unnoticed.
Used for: RAG_UPDATE_RPC_TIMEOUT_MS in src/components/KnowledgeBaseSection.tsx and
MANIFEST_FETCH_TIMEOUT_S / MANIFEST_MIRROR_COUNT in rag_corpus_download_service.py.
Does not: Run the screen or touch the network.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

from backend.services import rag_corpus_download_service as svc

ROOT = Path(__file__).resolve().parents[1]


class RagUpdateDeadlineTests(unittest.TestCase):
    def test_screen_deadline_exceeds_back_end_worst_case(self) -> None:
        src = (ROOT / "src" / "components" / "KnowledgeBaseSection.tsx").read_text(encoding="utf-8")
        m = re.search(r"RAG_UPDATE_RPC_TIMEOUT_MS\s*=\s*([\d_]+)", src)
        self.assertIsNotNone(m, "RAG_UPDATE_RPC_TIMEOUT_MS not found in KnowledgeBaseSection.tsx")
        screen_ms = int(m.group(1).replace("_", ""))
        worst_ms = svc.MANIFEST_FETCH_TIMEOUT_S * svc.MANIFEST_MIRROR_COUNT * 1000
        self.assertGreater(screen_ms, worst_ms)

    def test_mirror_count_matches_the_mirrors_tried(self) -> None:
        import inspect

        params = inspect.signature(svc.fetch_remote_manifest).parameters
        mirrors = [name for name in params if name.endswith("_url")]
        self.assertEqual(len(mirrors), svc.MANIFEST_MIRROR_COUNT)


if __name__ == "__main__":
    unittest.main()
