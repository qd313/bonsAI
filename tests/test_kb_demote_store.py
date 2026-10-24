"""Tests for the small file that remembers which notes and tips a person ranked lower (plan 98 lane C).

Three layers: the store itself (record, undo, damaged file), the ranking rule applied to a list of
cards, and the rule inside the real fusion and the real retrieval. The last layer is the one the
Deck's check looks at: "Not really -> Wrong tip -> a note, and that note comes last next time".
"""

import json
import os
import tempfile
import unittest
from unittest import mock

from backend_module_stubs import install_fcntl_and_decky_stubs, install_pwd_stub

install_fcntl_and_decky_stubs()
install_pwd_stub()

from backend.knowledge import kb_demote_store as store  # noqa: E402


class _StoreCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name
        self.addCleanup(self._tmp.cleanup)
        patcher = mock.patch.object(store, "_settings_dir", return_value=self.dir)
        patcher.start()
        self.addCleanup(patcher.stop)
        store.forget_cache()

    def path(self):
        return os.path.join(self.dir, "rag_demote.json")

    def read_file(self):
        with open(self.path(), encoding="utf-8") as fh:
            return json.load(fh)


class RecordAndUndoTests(_StoreCase):
    def test_no_file_reads_as_nothing_ranked_lower(self):
        self.assertEqual(store.downs_for([("note", 5), ("tip", 5)]), {})
        self.assertFalse(os.path.exists(self.path()))

    def test_one_down_writes_the_documented_shape(self):
        result = store.record_demote(123, "note", "wrong_tip")
        self.assertEqual(result, {"ok": True, "downs": 1, "excluded": False})
        data = self.read_file()
        self.assertEqual(data["version"], 1)
        entry = data["notes"]["note:123"]
        self.assertEqual(entry["downs"], 1)
        self.assertEqual(entry["reasons"], ["wrong_tip"])
        self.assertTrue(entry["updated"])

    def test_a_note_and_a_tip_sharing_a_number_stay_apart(self):
        """Real library: 162 numbers are both a note's id and a tip's id."""
        store.record_demote(7, "tip", "outdated")
        self.assertEqual(store.downs_for([("note", 7)]), {})
        self.assertEqual(store.downs_for([("tip", 7)]), {("tip", 7): 1})
        store.record_demote(7, "note", "wrong_edition")
        store.record_demote(7, "note", "wrong_edition")
        self.assertEqual(
            store.downs_for([("note", 7), ("tip", 7)]), {("note", 7): 2, ("tip", 7): 1}
        )

    def test_three_downs_marks_it_excluded(self):
        results = [store.record_demote(9, "note", r) for r in ("wrong_tip", "outdated", "wrong_edition")]
        self.assertEqual([r["downs"] for r in results], [1, 2, 3])
        self.assertEqual([r["excluded"] for r in results], [False, False, True])
        self.assertEqual(self.read_file()["notes"]["note:9"]["reasons"],
                         ["wrong_tip", "outdated", "wrong_edition"])

    def test_undo_removes_the_newest_down_and_its_reason(self):
        store.record_demote(9, "note", "wrong_tip")
        store.record_demote(9, "note", "outdated")
        result = store.record_demote(9, "note", "outdated", undo=True)
        self.assertEqual(result, {"ok": True, "downs": 1, "excluded": False})
        self.assertEqual(self.read_file()["notes"]["note:9"]["reasons"], ["wrong_tip"])

    def test_undo_of_the_last_down_removes_the_entry(self):
        store.record_demote(9, "tip", "wrong_tip")
        result = store.record_demote(9, "tip", "wrong_tip", undo=True)
        self.assertEqual(result, {"ok": True, "downs": 0, "excluded": False})
        self.assertEqual(self.read_file()["notes"], {})
        self.assertEqual(store.downs_for([("tip", 9)]), {})

    def test_undo_with_nothing_recorded_is_a_quiet_zero(self):
        result = store.record_demote(9, "tip", "wrong_tip", undo=True)
        self.assertEqual(result, {"ok": True, "downs": 0, "excluded": False})

    def test_undo_from_three_downs_brings_it_back_into_play(self):
        for r in ("wrong_tip", "outdated", "wrong_tip"):
            store.record_demote(9, "note", r)
        result = store.record_demote(9, "note", "wrong_tip", undo=True)
        self.assertEqual(result, {"ok": True, "downs": 2, "excluded": False})

    def test_bad_input_is_refused_and_writes_nothing(self):
        for args in (
            (0, "note", "wrong_tip"),
            (-3, "note", "wrong_tip"),
            ("12", "note", "wrong_tip"),
            (True, "note", "wrong_tip"),
            (5, "boss", "wrong_tip"),
            (5, "note", "bad_information"),
            (5, "note", ""),
        ):
            result = store.record_demote(*args)
            self.assertFalse(result["ok"], args)
        self.assertFalse(os.path.exists(self.path()))

    def test_a_change_made_by_hand_is_picked_up_without_a_restart(self):
        store.record_demote(1, "note", "wrong_tip")
        self.assertEqual(store.downs_for([("note", 1)]), {("note", 1): 1})
        data = self.read_file()
        data["notes"]["note:1"]["downs"] = 2
        data["notes"]["note:1"]["reasons"] = ["wrong_tip", "outdated"]
        with open(self.path(), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
        os.utime(self.path(), ns=(1, 2_000_000_000_000_000_000))
        self.assertEqual(store.downs_for([("note", 1)]), {("note", 1): 2})

    def test_an_unwritable_folder_answers_not_ok_instead_of_raising(self):
        blocker = os.path.join(self.dir, "afile")
        with open(blocker, "w") as fh:
            fh.write("x")
        with mock.patch.object(store, "_settings_dir", return_value=os.path.join(blocker, "inside")):
            store.forget_cache()
            result = store.record_demote(1, "note", "wrong_tip")
        self.assertFalse(result["ok"])


class DamagedFileTests(_StoreCase):
    def test_a_damaged_file_reads_as_empty_and_is_logged_once(self):
        with open(self.path(), "w", encoding="utf-8") as fh:
            fh.write("{not json")
        with mock.patch.object(store, "_log") as log:
            self.assertEqual(store.downs_for([("note", 1)]), {})
            self.assertEqual(store.downs_for([("note", 1)]), {})
            self.assertEqual(store.downs_for([("tip", 1)]), {})
        self.assertEqual(log.return_value.warning.call_count, 1)

    def test_a_damaged_file_is_replaced_cleanly_by_the_next_down(self):
        with open(self.path(), "w", encoding="utf-8") as fh:
            fh.write("[1, 2")
        result = store.record_demote(4, "note", "outdated")
        self.assertEqual(result, {"ok": True, "downs": 1, "excluded": False})
        self.assertEqual(list(self.read_file()["notes"]), ["note:4"])

    def test_hostile_shapes_read_as_nothing_ranked_lower(self):
        hostile = {
            "version": 1,
            "notes": {
                "note:1": {"downs": "two"},
                "note:2": {"downs": -5},
                "note:3": "nope",
                "note:4": {"downs": True},
                "note:x": {"downs": 2},
                "boss:5": {"downs": 2},
                "tip:6": {"downs": 2},
            },
        }
        with open(self.path(), "w", encoding="utf-8") as fh:
            json.dump(hostile, fh)
        got = store.downs_for([("note", n) for n in (1, 2, 3, 4)] + [("tip", 6)])
        self.assertEqual(got, {("tip", 6): 2})

    def test_a_future_version_is_read_as_empty_and_never_overwritten_by_a_read(self):
        with open(self.path(), "w", encoding="utf-8") as fh:
            json.dump({"version": 9, "notes": {"note:1": {"downs": 3}}}, fh)
        self.assertEqual(store.downs_for([("note", 1)]), {})
        self.assertEqual(self.read_file()["version"], 9)


if __name__ == "__main__":
    unittest.main()
