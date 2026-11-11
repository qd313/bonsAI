"""Title: Picture labels (v1) load and point at real notes

Purpose: Pin that tests/fixtures/screenshot_eval_v1.json, the labelled picture set of plan 103, is read by the
         screenshot reading script's own loader, that every note it expects (expect_section and
         expect_section_also) is a real note of the same game in the library's source files, and that a
         label never claims more certainty than it has (an empty boss, place or note carries no confidence).
Used for: scripts/kb/eval_screenshot_reading.py (the loader), scripts/kb/build_rag_db.py (the merged note
          list) and tests/fixtures/screenshot_eval_v1.json.
Solves: A typo in a note name would make a picture search look worse than it is, and a label the script
        cannot read stops a whole measurement run after the model is already loaded.
Does not: Open a picture, start Ollama or check that the shrunk copies are on this PC (they live in the
          workshop, never in the repo).
"""

import json
import sys
import unittest
from pathlib import Path

from build_rag_db_loader import load_build_rag_db
from script_loader import load_script

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "py_modules"))

LABELS = REPO_ROOT / "tests" / "fixtures" / "screenshot_eval_v1.json"
LEVELS = {"high", "medium", "low", "none"}
CONFIDENCE_KEYS = {"game", "scene", "place", "boss", "expect_section"}


class PictureLabelsV1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = json.loads(LABELS.read_text(encoding="utf-8"))
        cls.rows = cls.raw["pictures"]
        seed = load_build_rag_db().load_strategy_seed()
        cls.title_by_game = {g["game_id"]: g["canonical_title"] for g in seed["games"]}
        cls.games_by_note = {}
        for sec in seed["sections"]:
            cls.games_by_note.setdefault(sec["name"], set()).add(cls.title_by_game[sec["game_id"]])

    def test_version_one_and_ids_are_unique(self):
        self.assertEqual(self.raw["version"], 1)
        ids = [r["id"] for r in self.rows]
        files = [r["file"] for r in self.rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(files), len(set(files)))
        self.assertTrue(all(f.endswith(".jpg") for f in files))

    def test_the_reading_scripts_own_loader_accepts_the_file(self):
        mod = load_script("eval_screenshot_reading", register=True)
        try:
            pictures = mod.load_pictures(LABELS, None)
        finally:
            sys.modules.pop("eval_screenshot_reading", None)
        self.assertEqual([p.id for p in pictures], [r["id"] for r in self.rows])

    def test_every_expected_note_exists_and_belongs_to_the_pictures_game(self):
        for row in self.rows:
            names = [n for n in [row["expect_section"], *row["expect_section_also"]] if n]
            if names:
                self.assertTrue(row["in_library"], f"{row['id']} expects a note but its game is not in the library")
            for name in names:
                self.assertTrue(name in self.games_by_note, f"{row['id']}: no note named {name!r}")
                self.assertTrue(
                    row["game"] in self.games_by_note[name],
                    f"{row['id']}: note {name!r} belongs to {sorted(self.games_by_note[name])}, not {row['game']!r}",
                )
            if row["expect_section_also"]:
                self.assertTrue(row["expect_section"], f"{row['id']} lists other notes but no main one")

    def test_a_label_that_is_empty_claims_no_confidence(self):
        for row in self.rows:
            conf = row["confidence"]
            self.assertEqual(set(conf), CONFIDENCE_KEYS, row["id"])
            self.assertTrue(set(conf.values()) <= LEVELS, row["id"])
            for label, key in (("boss", "boss"), ("place", "place"), ("expect_section", "expect_section")):
                if row[label]:
                    self.assertNotEqual(conf[key], "none", f"{row['id']} has a {label} but no confidence in it")
                else:
                    self.assertEqual(conf[key], "none", f"{row['id']} has no {label} yet claims confidence in it")
            self.assertNotIn(conf["game"], ("none",), row["id"])

    def test_a_game_outside_the_library_has_no_note_and_the_set_is_not_all_one_game(self):
        for row in self.rows:
            if not row["in_library"]:
                self.assertEqual(row["expect_section"], "", row["id"])
        self.assertGreaterEqual(len({r["game"] for r in self.rows}), 10)

    def test_the_maintainers_boss_pictures_are_in_the_set_and_say_where_they_came_from(self):
        added = [r for r in self.rows if r["id"].startswith("p5-")]
        self.assertEqual(len(added), 23)
        self.assertEqual(len(self.rows), 52)
        self.assertEqual(sum(1 for r in self.rows if r["expect_section"]), 27)
        self.assertEqual(sum(1 for r in added if r["boss"] and r["id"] != "p5-fallout-4-radscorpion-1"), 22)
        self.assertGreaterEqual(len({r["game"] for r in added}), 9)
        for row in added:
            origin = row["origin"]
            self.assertIn("https://", origin, row["id"])
            self.assertIn("approved by the maintainer on 2026-11-11", origin, row["id"])
            self.assertIn("private test only", origin, row["id"])
            self.assertTrue(row["source"].startswith("plan103-boss-candidates/originals/"), row["id"])
            self.assertTrue(row["expect_section"] and row["boss"], f"{row['id']} must carry a boss and a note")
        # The older pictures were taken on the Deck, so they have nothing to say about a web page.
        self.assertFalse(any("origin" in r for r in self.rows if not r["id"].startswith("p5-")))

    def test_the_first_deathclaw_is_not_called_an_alpha_and_its_boss_label_is_a_step_lower(self):
        by_id = {r["id"]: r for r in self.rows}
        first, brawl = by_id["p5-fallout-4-deathclaw-1"], by_id["p5-fallout-4-deathclaw-3"]
        self.assertEqual(first["boss"], "Deathclaw")
        self.assertEqual(first["confidence"]["boss"], "medium")
        self.assertEqual(brawl["confidence"]["boss"], "high")
        self.assertFalse(any("alpha" in a.lower() for a in first["boss_aliases"]))
        self.assertIn("alpha", first["note"].lower())
        self.assertIn("no variant is claimed", first["note"])


if __name__ == "__main__":
    unittest.main()
