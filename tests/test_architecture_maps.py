"""
Title: Architecture maps are built on demand

Purpose: The six JSON maps that describe the code (back-end methods, import graphs, biggest
files and so on) are no longer saved in the repo. A check that needs one must get a fresh
copy even when none is on disk. These tests delete the maps, ask for them the way the
ratchet does, and confirm they come back with content. They also confirm a generator that
cannot run is reported in words instead of raised.

Used for: `npm run test:py`, and `python scripts/verify.py` whenever a Python file changes.

Solves: Before this, the ratchet read committed files. Dropping them from the repo would
have made it report "does not exist yet" on a fresh clone, which looks like a pass for the
import-cycle counts and silently skips the method-name checks.

Does not: Test the tool server's own start-up build (that is a smoke script in the
package) or the contents of the maps beyond "has methods" and "has a cycles list".
"""

import json
import sys
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent / "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import architecture_maps as am  # noqa: E402 -- needs the path line above
import ratchet  # noqa: E402 -- needs the path line above


def delete_all_maps():
    for name in am.MAP_FILES:
        try:
            (am.ARCH_DIR / name).unlink()
        except FileNotFoundError:
            pass


class BuildMapsTests(unittest.TestCase):
    def test_every_map_comes_back_after_all_are_deleted(self):
        delete_all_maps()
        problems = am.build_maps(force=True)
        self.assertEqual(problems, [])
        for name in am.MAP_FILES:
            self.assertTrue((am.ARCH_DIR / name).is_file(), name)

    def test_the_rpc_map_has_methods_and_the_graphs_have_a_cycles_list(self):
        delete_all_maps()
        am.build_maps(force=True)
        rpc = json.loads((am.ARCH_DIR / "rpc-map.json").read_text(encoding="utf-8"))
        self.assertGreater(len(rpc["methods"]), 10)
        for name in ("import-graph.json", "py-import-graph.json"):
            graph = json.loads((am.ARCH_DIR / name).read_text(encoding="utf-8"))
            self.assertIsInstance(graph["cycles"], list)

    def test_a_generator_that_cannot_run_is_reported_not_raised(self):
        with mock.patch.object(am, "GENERATOR_JS", am.ROOT / "no-such-generator.mjs"):
            problems = am.build_maps(force=True)
        self.assertEqual(len(problems), 1)
        self.assertIn("front-end maps", problems[0])
        am.build_maps(force=True)  # leave good maps behind for whoever runs next


class RatchetReadsFreshMapsTests(unittest.TestCase):
    def setUp(self):
        delete_all_maps()
        am._problems_from_last_build = None

    def tearDown(self):
        am.build_maps(force=True)  # leave good maps behind for whoever runs next

    def test_cycle_counts_are_numbers_with_no_maps_on_disk(self):
        for metric in (ratchet.metric_import_cycles_be, ratchet.metric_import_cycles_fe):
            value, note = metric()
            self.assertIsInstance(value, int)
            self.assertIsNone(note)

    def test_the_method_name_checks_have_a_number_with_no_maps_on_disk(self):
        ratchet._rpc_analysis_cache = None
        for metric in (ratchet.metric_fe_calls_with_no_be_method, ratchet.metric_be_methods_with_no_caller):
            value, note = metric()
            self.assertIsInstance(value, int)
            self.assertIsNone(note)

    def test_a_missing_generator_makes_the_note_say_the_map_could_not_be_built(self):
        with mock.patch.object(am, "GENERATOR_JS", am.ROOT / "no-such-generator.mjs"):
            am._problems_from_last_build = None
            delete_all_maps()
            value, note = ratchet.metric_import_cycles_fe()
        self.assertIsNone(value)
        self.assertIn("could not be built", note)
        am._problems_from_last_build = None


if __name__ == "__main__":
    unittest.main()
