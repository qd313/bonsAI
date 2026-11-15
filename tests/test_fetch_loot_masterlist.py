"""Title: The LOOT rule-list fetcher keeps the rules and nothing else

Purpose: Pin what scripts/kb/fetch_loot_masterlist.py keeps from LOOT's masterlist: only plugins
that carry a rule, English messages only, every web link dropped (Nexus Mods most of all), the
three rule lists in one shape, patterns told apart by LOOT's own rule, and a header that names the
repository, the commit, its date, the licence and the day read.
Used for: fetch_loot_masterlist.py's distil_masterlist, make_file_text and read_game.
Solves: A web link to a site bonsAI never reads, a message in another language, or a plugin with no
rule reaching the shipped data file would each go unnoticed until a person saw it in an answer.
Does not: Hit the network (the one fetch test feeds the reader a stand-in), and does not check the
shipped data files (tests/test_load_order_data_files.py).
"""

from __future__ import annotations

import json
import unittest
from unittest import mock

import yaml

from script_loader import load_script

fetcher = load_script("fetch_loot_masterlist")

# A masterlist in LOOT's own style: an anchor defined once under `prelude`, reused by plugins.
MASTERLIST = """
prelude:
  common:
    - &alreadyInX
      type: error
      content: 'Delete. Already included in {0}.'
groups:
  - name: default
  - name: Late
    after: [default]
plugins:
  - name: 'Plain Mod.esp'
    url:
      - link: 'https://www.nexusmods.com/skyrimspecialedition/mods/1/'
        name: Plain Mod
    group: Late
    after:
      - 'Other.esp'
      - name: 'Third.esp'
        condition: 'active("Fourth.esp")'
    req:
      - name: 'F4SE/Plugins/Thing.dll'
        display: '[Thing](https://www.nexusmods.com/fallout4/mods/2/)'
    inc:
      - 'Clash.esp'
      - name: 'Clash2.esp'
        detail: 'See the [notes](https://example.org/notes).'
    msg:
      - <<: *alreadyInX
        subs: ['**Big Mod**']
        condition: 'active("Big Mod.esp")'
      - type: say
        content:
          - lang: de
            text: 'Nur Deutsch'
          - lang: en
            text: 'Read the [Compatibility Notes]({0}).'
        subs: ['https://www.nexusmods.com/skyrimspecialedition/articles/3/']
  - name: 'Pattern \\d+\\.esp'
    after: ['Other.esp']
  - name: 'Only A Url.esp'
    url: ['https://www.nexusmods.com/skyrimspecialedition/mods/4/']
    clean:
      - crc: 0x1234
        util: 'SSEEdit'
  - name: 'Shows Address.esp'
    msg:
      - type: say
        content: 'Go to {0}.'
        subs: ['https://example.org/']
"""


def _kept() -> dict:
    return fetcher.distil_masterlist(yaml.safe_load(MASTERLIST))


class WhatIsKeptTests(unittest.TestCase):
    def test_only_plugins_with_a_rule_are_kept(self):
        names = [e["name"] for e in _kept()["entries"]]
        self.assertEqual(names, ["Plain Mod.esp", "Pattern \\d+\\.esp"])

    def test_the_groups_are_kept_with_what_they_load_after(self):
        self.assertEqual(_kept()["groups"], [{"name": "default", "after": []}, {"name": "Late", "after": ["default"]}])

    def test_a_pattern_is_told_by_loots_own_characters(self):
        self.assertTrue(fetcher.is_pattern_name("A.*\\.esp"))
        self.assertTrue(fetcher.is_pattern_name("A|B.esp"))
        self.assertTrue(fetcher.is_pattern_name("A?.esp"))
        self.assertFalse(fetcher.is_pattern_name("ccBGSFO4001-PipBoy(Black).esl"))
        by_name = {e["name"]: e for e in _kept()["entries"]}
        self.assertFalse(by_name["Plain Mod.esp"]["isPattern"])
        self.assertTrue(by_name["Pattern \\d+\\.esp"]["isPattern"])

    def test_the_three_rule_lists_share_one_shape(self):
        entry = _kept()["entries"][0]
        self.assertEqual(entry["group"], "Late")
        self.assertEqual(
            entry["after"], [{"name": "Other.esp"}, {"name": "Third.esp", "condition": 'active("Fourth.esp")'}]
        )
        self.assertEqual(entry["requires"], [{"name": "F4SE/Plugins/Thing.dll", "display": "Thing"}])
        self.assertEqual(
            entry["incompatible"], [{"name": "Clash.esp"}, {"name": "Clash2.esp", "detail": "See the notes."}]
        )

    def test_messages_are_english_only_with_the_wording_from_the_shared_anchor(self):
        messages = _kept()["entries"][0]["messages"]
        self.assertEqual(
            messages[0],
            {"type": "error", "text": "Delete. Already included in {0}.", "subs": ["**Big Mod**"],
             "condition": 'active("Big Mod.esp")'},
        )
        self.assertEqual(messages[1]["text"], "Read the Compatibility Notes.")
        self.assertIsNone(messages[1]["condition"])

    def test_a_message_whose_visible_words_are_an_address_is_dropped(self):
        parsed = yaml.safe_load(MASTERLIST)
        parsed["plugins"][3]["after"] = ["Kept.esp"]
        entries = {e["name"]: e for e in fetcher.distil_masterlist(parsed)["entries"]}
        self.assertEqual(entries["Shows Address.esp"]["messages"], [])

    def test_no_web_address_survives_anywhere(self):
        text = fetcher.make_file_text("skyrimse", {"repository": "x"}, _kept())
        for needle in ("http", "nexusmods", "](", "Nur Deutsch", "SSEEdit", "crc"):
            self.assertNotIn(needle, text)

    def test_a_link_that_slips_through_stops_the_run(self):
        parsed = yaml.safe_load(MASTERLIST)
        parsed["plugins"][0]["after"] = ["https://www.nexusmods.com/x"]
        with self.assertRaises(ValueError):
            fetcher.distil_masterlist(parsed)


class FileShapeTests(unittest.TestCase):
    def test_the_file_is_json_with_a_header_groups_and_entries(self):
        header = {"repository": "https://github.com/loot/skyrimse", "commit": "f" * 40, "commit_date": "2026-10-31",
                  "licence": "CC0-1.0", "date_read": "2026-11-15"}
        data = json.loads(fetcher.make_file_text("skyrimse", header, _kept()))
        self.assertEqual(data["header"], {"game": "skyrimse", **header})
        self.assertEqual(len(data["entries"]), 2)
        self.assertEqual(data["groups"][1]["name"], "Late")

    def test_reading_a_game_writes_the_commit_its_date_and_the_licence(self):
        def fake_get(url):
            if url.endswith("/LICENSE"):
                return b"Creative Commons Legal Code\n\nCC0 1.0 Universal\n"
            if url.endswith("masterlist.yaml"):
                self.assertIn("/" + "a" * 40 + "/", url)
                return MASTERLIST.encode("utf-8")
            return json.dumps({"sha": "a" * 40, "commit": {"committer": {"date": "2026-11-01T11:31:15Z"}}}).encode()

        with mock.patch.object(fetcher, "_get", fake_get):
            header, kept = fetcher.read_game("fallout4", "aaaa", "2026-11-15")
        self.assertEqual(
            header,
            {"repository": "https://github.com/loot/fallout4", "commit": "a" * 40, "commit_date": "2026-11-01",
             "licence": "CC0-1.0", "date_read": "2026-11-15"},
        )
        self.assertEqual(len(kept["entries"]), 2)

    def test_a_licence_file_that_is_not_cc0_writes_nothing(self):
        def fake_get(url):
            if url.endswith("/LICENSE"):
                return b"All rights reserved"
            return json.dumps({"sha": "a" * 40, "commit": {"committer": {"date": "2026-11-01T00:00:00Z"}}}).encode()

        with mock.patch.object(fetcher, "_get", fake_get):
            with self.assertRaises(SystemExit):
                fetcher.read_game("fallout4", "aaaa", "2026-11-15")


if __name__ == "__main__":
    unittest.main()
