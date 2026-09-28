"""Title: Game-notes licence notice stays in step with the notes

Purpose: Every licence and every wiki named by data/kb/strategy_seed.json must appear in
    data/kb/NOTICE.md, each wiki on the same line as its licence, so the credit cannot go stale
    when notes from a new wiki are added.
Used for: data/kb/NOTICE.md (plan 74, lane 1, fix 3).
Solves: The notes are adapted from CC BY-SA / CC BY wikis; those licences need the source and
    licence named. The repo said nothing about them outside the published library.
Does not: Check the published library's ATTRIBUTIONS.md (scripts/publish_corpus.py builds it).
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
KB = REPO_ROOT / "data" / "kb"
NOTICE = KB / "NOTICE.md"


def _seed_sections() -> list[dict]:
    raw = json.loads((KB / "strategy_seed.json").read_text(encoding="utf-8"))
    return list(raw.get("sections") or []) + list(raw.get("genre_patterns") or [])


class KbNoticeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.text = NOTICE.read_text(encoding="utf-8")
        self.lines = self.text.splitlines()

    def test_every_source_licence_is_named(self) -> None:
        licences = {s.get("source_license") for s in _seed_sections()}
        compat = json.loads((KB / "compat_patterns.json").read_text(encoding="utf-8"))
        licences |= {p.get("source_license") for p in compat}
        licences.discard(None)
        self.assertTrue(licences)
        for lic in sorted(licences):
            self.assertIn(lic, self.text, f"{lic} is used by a note but not named in {NOTICE.name}")

    def test_every_wiki_is_named_with_its_licence(self) -> None:
        pairs = {
            (urlparse(s["source_url"]).netloc, s.get("source_license"))
            for s in _seed_sections()
            if s.get("source_url")
        }
        self.assertTrue(pairs)
        for site, lic in sorted(pairs):
            self.assertTrue(
                any(site in line and lic in line for line in self.lines),
                f"{site} ({lic}) has notes in strategy_seed.json but no line in {NOTICE.name} names both",
            )

    def test_names_the_test_fixture_copies(self) -> None:
        self.assertIn("src/utils/kbNoteUsedByAnswer.fixtures.json", self.text)

    def test_every_licence_named_links_its_deed(self) -> None:
        deeds = {
            "CC-BY-SA-4.0": "creativecommons.org/licenses/by-sa/4.0/",
            "CC-BY-SA-3.0": "creativecommons.org/licenses/by-sa/3.0/",
            "CC-BY-SA-2.5": "creativecommons.org/licenses/by-sa/2.5/",
            "CC-BY-4.0": "creativecommons.org/licenses/by/4.0/",
        }
        for lic, deed in deeds.items():
            if lic in self.text:
                self.assertIn(deed, self.text, f"{lic} is named without a link to its deed")


if __name__ == "__main__":
    unittest.main()
