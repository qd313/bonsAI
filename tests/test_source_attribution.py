"""Title: Source attribution

Purpose: Pin the corpus licensing rule and the path that carries a credit to the user.
Used for: data/kb seed files, transparency_service attribution entries.
Solves: Attribution was computed per surviving card and then dropped by a type filter, so no
        card was ever credited in the UI -- including the two that carry a CC BY-SA URL.
Does not: Cover chip styling (see frontend tests). ATTRIBUTIONS.md generation drift is in
        test_build_rag_attributions.py (ATTR-5.1 / 5.2); seed licence *version* is pinned here too.

The rule, in one line: **a card that claims a third-party licence must name its source.**
Maintainer-authored cards have no third party to name and carry neither field. Both seed files
already satisfied this when the rule was written; the test is here so 181 new cards cannot
quietly break it.
"""

import json
import re
import unittest
from pathlib import Path

from backend.services.transparency_service import (
    build_attribution_entries,
    build_context_chips_manifest,
    build_knowledge_base_transparency,
    source_display_name,
)

DATA = Path(__file__).resolve().parent.parent / "data" / "kb"
MAINTAINER_LICENSE = "bonsAI-maintainer"


def _rows(path: Path, key: str) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload[key] if isinstance(payload, dict) else payload


class CorpusLicensingRuleTests(unittest.TestCase):
    def _assert_third_party_cards_cite_a_source(self, rows, label):
        offenders = [
            row.get("name") or row.get("topic") or repr(row)[:60]
            for row in rows
            if str(row.get("source_license") or "").strip()
            and str(row.get("source_license")).strip() != MAINTAINER_LICENSE
            and not str(row.get("source_url") or "").strip()
        ]
        self.assertEqual(
            offenders,
            [],
            f"{label}: cards claim a third-party licence with no source_url -- the licence "
            f"requires naming the source: {offenders}",
        )

    def _assert_cited_cards_declare_a_licence(self, rows, label):
        offenders = [
            row.get("name") or row.get("topic") or repr(row)[:60]
            for row in rows
            if str(row.get("source_url") or "").strip()
            and not str(row.get("source_license") or "").strip()
        ]
        self.assertEqual(
            offenders,
            [],
            f"{label}: cards cite a source with no licence recorded -- we cannot honour terms "
            f"we did not write down: {offenders}",
        )

    def test_strategy_seed_obeys_the_rule(self):
        rows = _rows(DATA / "strategy_seed.json", "sections")
        self._assert_third_party_cards_cite_a_source(rows, "strategy_seed.json")
        self._assert_cited_cards_declare_a_licence(rows, "strategy_seed.json")

    def test_compat_patterns_obey_the_rule(self):
        rows = _rows(DATA / "compat_patterns.json", "patterns")
        self._assert_third_party_cards_cite_a_source(rows, "compat_patterns.json")
        self._assert_cited_cards_declare_a_licence(rows, "compat_patterns.json")

    def test_maintainer_cards_are_not_required_to_cite_anything(self):
        """The rule must not push a fake URL onto cards we wrote ourselves."""
        rows = [{"name": "x", "source_license": MAINTAINER_LICENSE, "source_url": ""}]
        self._assert_third_party_cards_cite_a_source(rows, "synthetic")

    def test_every_cited_card_says_when_its_text_was_captured(self):
        """Several corpus sources are archive.org snapshots years old.

        Without a per-row date the build stamps its own timestamp, so 2020 wiki text would
        be relabelled with today's date on every rebuild -- exactly the staleness a reader
        needs to see. A card that names a wiki must also say when that wiki was read.
        """
        rows = _rows(DATA / "strategy_seed.json", "sections")
        undated = [
            row.get("name")
            for row in rows
            if str(row.get("source_url") or "").strip()
            and not re.match(r"^\d{4}-\d{2}-\d{2}", str(row.get("crawled_at") or ""))
        ]
        self.assertEqual(undated, [], f"wiki-sourced cards with no capture date: {undated}")

    def test_third_party_licences_in_seed_include_a_version(self):
        """ATTR-5.2 at the seed: bare 'CC BY-SA' must not land in strategy_seed.json."""
        import importlib.util

        path = Path(__file__).resolve().parent.parent / "scripts" / "build_rag_db.py"
        spec = importlib.util.spec_from_file_location("build_rag_db", path)
        assert spec and spec.loader
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        rows = _rows(DATA / "strategy_seed.json", "sections")
        bare = [
            (row.get("name"), row.get("source_license"))
            for row in rows
            if str(row.get("source_url") or "").strip()
            and not mod.licence_string_includes_version(str(row.get("source_license") or ""))
        ]
        self.assertEqual(bare, [], f"unversioned third-party licences in strategy_seed: {bare}")


class SourceDisplayNameTests(unittest.TestCase):
    def test_host_is_the_credit(self):
        self.assertEqual(
            source_display_name("https://zelda.fandom.com/wiki/King_Dodongo"), "zelda.fandom.com"
        )

    def test_www_is_dropped(self):
        self.assertEqual(source_display_name("https://www.example.org/a/b"), "example.org")

    def test_port_and_userinfo_are_dropped(self):
        self.assertEqual(source_display_name("https://u@host.example:8443/x"), "host.example")

    def test_missing_scheme_still_yields_a_host(self):
        self.assertEqual(source_display_name("theportalwiki.com/wiki/Portal_2"), "theportalwiki.com")

    def test_empty_input(self):
        self.assertEqual(source_display_name(""), "")
        self.assertEqual(source_display_name(None), "")


class AttributionEntryTests(unittest.TestCase):
    def test_cards_from_one_source_collapse_into_one_credit(self):
        """Three cards from one wiki is one credit line, not three. Repetition gets skipped."""
        entries = build_attribution_entries(
            [
                {"title": "OoT — King Dodongo", "url": "https://zelda.fandom.com/wiki/A", "license": "GFDL"},
                {"title": "OoT — Water Temple", "url": "https://zelda.fandom.com/wiki/B", "license": "GFDL"},
            ]
        )
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["source"], "zelda.fandom.com")
        self.assertEqual(entries[0]["license"], "GFDL")
        self.assertEqual(entries[0]["cards"], ["OoT — King Dodongo", "OoT — Water Temple"])

    def test_different_licences_stay_separate(self):
        """CC BY 4.0 and GFDL carry different obligations and cannot share a line."""
        entries = build_attribution_entries(
            [
                {"title": "Portal 2 — Chamber 21", "url": "https://theportalwiki.com/wiki/A", "license": "CC-BY-4.0"},
                {"title": "OoT — Dodongo", "url": "https://zelda.fandom.com/wiki/B", "license": "GFDL"},
            ]
        )
        self.assertEqual(
            sorted((e["source"], e["license"]) for e in entries),
            [("theportalwiki.com", "CC-BY-4.0"), ("zelda.fandom.com", "GFDL")],
        )

    def test_cards_without_a_url_are_named_with_no_source_page(self):
        """Roadmap: "The credit line under a reply never names a note with no source page, or
        a shared tip." Used to be `[]` -- the card was dropped rather than named. Now it is
        named, just grouped under a label that credits no third party (there isn't one)."""
        entries = build_attribution_entries(
            [{"title": "seed card", "url": "", "license": MAINTAINER_LICENSE}]
        )
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["source"], "No source page")
        self.assertEqual(entries[0]["license"], "")
        self.assertEqual(entries[0]["cards"], ["seed card"])

    def test_sourced_and_unsourced_cards_stay_in_separate_groups(self):
        """A real wiki credit must never be diluted by a card with nothing to cite."""
        entries = build_attribution_entries(
            [
                {"title": "OoT — King Dodongo", "url": "https://zelda.fandom.com/wiki/A", "license": "GFDL"},
                {"title": "seed card", "url": "", "license": MAINTAINER_LICENSE},
            ]
        )
        self.assertEqual(
            sorted((e["source"], e["cards"]) for e in entries),
            [("No source page", ["seed card"]), ("zelda.fandom.com", ["OoT — King Dodongo"])],
        )

    def test_junk_input_is_ignored(self):
        self.assertEqual(build_attribution_entries(None), [])
        self.assertEqual(build_attribution_entries(["a string", 7, {}]), [])

    def test_capture_date_is_reported_and_trimmed_to_the_day(self):
        entries = build_attribution_entries(
            [{"title": "A", "url": "https://x.example/wiki/A", "license": "CC-BY-SA-3.0",
              "captured": "2025-04-05T11:22:33Z"}]
        )
        self.assertEqual(entries[0]["captured"], "2025-04-05")

    def test_grouped_cards_report_the_oldest_capture(self):
        """One credit line covers several cards; claiming the newest date oversells the rest."""
        entries = build_attribution_entries(
            [
                {"title": "A", "url": "https://x.example/wiki/A", "license": "L", "captured": "2026-06-18"},
                {"title": "B", "url": "https://x.example/wiki/B", "license": "L", "captured": "2020-02-23"},
            ]
        )
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["captured"], "2020-02-23")

    def test_a_source_that_never_said_reports_nothing_rather_than_guessing(self):
        entries = build_attribution_entries(
            [{"title": "A", "url": "https://x.example/wiki/A", "license": "L"}]
        )
        self.assertEqual(entries[0]["captured"], "")


class AttributionReachesTheChipTests(unittest.TestCase):
    """The regression that made this work necessary."""

    def _kb_chip(self, sources):
        snapshot = build_knowledge_base_transparency(
            attached=True,
            trust_tier="wiki_verified",
            sources=sources,
            notes="",
            timing_ms={},
            unavailable_reason="",
            retrieval_method="hybrid",
            kb_domain="strategy",
        )
        chips = build_context_chips_manifest(snapshot=snapshot)["context_chips"]
        return next(c for c in chips if c["id"] == "kb")

    def test_dict_sources_survive_to_the_chip(self):
        """`paths` filtered on isinstance(str) while retrieval emitted dicts, so every source
        was dropped between the corpus and the screen."""
        chip = self._kb_chip(
            [{"title": "OoT — King Dodongo", "url": "https://zelda.fandom.com/wiki/K", "license": "GFDL"}]
        )
        self.assertEqual(len(chip["body"]["attribution"]), 1)
        self.assertEqual(chip["body"]["attribution"][0]["source"], "zelda.fandom.com")

    def test_an_all_maintainer_turn_still_names_its_card_with_no_source_page(self):
        """Roadmap fix: a maintainer-authored card with no third party to name used to leave
        `attribution` off the chip entirely, so it read exactly like nothing had attached. It
        is now present, naming the card under "No source page" rather than a wiki."""
        chip = self._kb_chip([{"title": "seed", "url": "", "license": MAINTAINER_LICENSE}])
        self.assertIn("attribution", chip["body"])
        self.assertEqual(chip["body"]["attribution"][0]["source"], "No source page")
        self.assertEqual(chip["body"]["attribution"][0]["cards"], ["seed"])

    def test_no_sources_at_all_means_no_attribution_key(self):
        """Nothing to name -- the field stays absent rather than an empty ornament."""
        chip = self._kb_chip([])
        self.assertNotIn("attribution", chip["body"])

    def test_string_sources_still_render_as_paths(self):
        chip = self._kb_chip(["/some/legacy/path"])
        self.assertEqual(chip["body"]["paths"], ["/some/legacy/path"])
        self.assertNotIn("attribution", chip["body"])


if __name__ == "__main__":
    unittest.main()
